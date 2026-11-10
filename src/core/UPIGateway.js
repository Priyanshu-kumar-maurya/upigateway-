/**
 * UPIGateway - Main Core Orchestrator
 * High-performance, Zero-Fee Indian UPI Payment Gateway Engine
 */

const crypto = require('crypto');
const DirectUPIAdapter = require('../adapters/DirectUPIAdapter');
const SandboxAdapter = require('../adapters/SandboxAdapter');
const NotificationObserver = require('../adapters/NotificationObserver');
const UTRValidator = require('./UTRValidator');
const WebhookManager = require('./WebhookManager');

class UPIGateway {
  /**
   * Initialize UPIGateway
   * @param {Object} options
   * @param {string} options.vpa - Merchant / Payee UPI ID (e.g. yourbusiness@icici)
   * @param {string} [options.merchantName] - Merchant business name (e.g. Coffeely)
   * @param {string} [options.secretKey] - Webhook signing secret key
   * @param {boolean} [options.sandbox] - Enable sandbox test mode (defaults to false)
   * @param {number} [options.defaultExpiryMinutes] - Order expiry in minutes (defaults to 10)
   */
  constructor(options = {}) {
    if (!options.vpa && !options.sandbox) {
      throw new Error('[UPIGateway] VPA is required when sandbox is false');
    }

    this.vpa = options.vpa || 'merchant.sandbox@upi';
    this.merchantName = options.merchantName || 'UPI Merchant';
    this.sandbox = Boolean(options.sandbox);
    this.defaultExpiryMinutes = options.defaultExpiryMinutes || 10;
    this.secretKey = options.secretKey || crypto.randomBytes(32).toString('hex');

    // Subsystems
    this.utrValidator = new UTRValidator();
    this.webhookManager = new WebhookManager(this.secretKey);
    this.directAdapter = new DirectUPIAdapter({
      vpa: this.vpa,
      merchantName: this.merchantName
    });
    this.sandboxAdapter = new SandboxAdapter();
    this.observer = new NotificationObserver(this.webhookManager);

    // In-memory Orders Storage (Can be synced with external DB like MongoDB/PostgreSQL)
    this.orders = new Map();
  }

  /**
   * Create a new UPI Payment Order
   * @param {Object} params
   * @param {number} params.amount - Amount in INR (e.g. 500)
   * @param {string} [params.orderId] - Optional custom order ID
   * @param {string} [params.customerName] - Customer full name
   * @param {string} [params.customerPhone] - Customer phone number
   * @param {string} [params.note] - Payment remark / note
   * @param {number} [params.expiryMinutes] - Order validity window
   * @returns {Promise<Object>} Order details with Intent URLs & QR Code
   */
  async createOrder(params = {}) {
    const amount = Number(params.amount);
    if (!amount || amount <= 0) {
      throw new Error('[UPIGateway] Invalid order amount. Must be greater than 0.');
    }

    const orderId = params.orderId || `ORD_${Date.now()}_${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const expiryMinutes = params.expiryMinutes || this.defaultExpiryMinutes;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    const orderRecord = {
      orderId,
      amount: Number(amount.toFixed(2)),
      currency: 'INR',
      status: 'PENDING',
      customerName: params.customerName || 'Customer',
      customerPhone: params.customerPhone || '',
      note: params.note || `Payment for ${orderId}`,
      createdAt: new Date().toISOString(),
      expiresAt,
      isSandbox: this.sandbox,
      vpa: this.vpa,
      merchantName: this.merchantName
    };

    // Generate Intent Bundle and dynamic QR
    const bundle = await this.directAdapter.createIntentBundle(orderRecord);

    const fullOrder = {
      ...orderRecord,
      intentUrl: bundle.intentUrl,
      qrDataUrl: bundle.qrDataUrl,
      appIntents: bundle.appIntents
    };

    this.orders.set(orderId, fullOrder);
    return fullOrder;
  }

  /**
   * Verify Payment using 12-Digit UTR
   * @param {Object} params
   * @param {string} params.orderId
   * @param {string} params.utr - 12-digit UPI Reference Number
   * @param {string} [params.payerVpa]
   * @returns {Promise<Object>} Verification status
   */
  async verifyPayment({ orderId, utr, payerVpa }) {
    const order = this.orders.get(orderId);
    if (!order) {
      return { success: false, error: `Order #${orderId} not found` };
    }

    if (order.status === 'PAID') {
      return {
        success: true,
        alreadyProcessed: true,
        status: 'PAID',
        orderId,
        amount: order.amount,
        utr: order.utr,
        message: 'Order was already verified and marked as PAID'
      };
    }

    // Check expiry
    if (new Date() > new Date(order.expiresAt)) {
      order.status = 'EXPIRED';
      return { success: false, error: 'Order has expired. Please initiate a new order.' };
    }

    // In Sandbox mode, delegate to sandbox simulator
    if (this.sandbox) {
      const simResult = await this.sandboxAdapter.processSimulatedPayment(order, utr);
      if (simResult.success) {
        order.status = 'PAID';
        order.utr = simResult.utr;
        order.paidAt = simResult.timestamp;
        order.payerVpa = payerVpa || simResult.payerVpa;
        this.orders.set(orderId, order);
        return {
          success: true,
          status: 'PAID',
          orderId,
          amount: order.amount,
          utr: order.utr,
          paidAt: order.paidAt,
          isSandbox: true
        };
      } else {
        return { success: false, error: simResult.error };
      }
    }

    // Real production mode: validate 12-digit UTR
    const valResult = this.utrValidator.validate(utr);
    if (!valResult.valid) {
      return { success: false, error: valResult.error };
    }

    // Mark UTR as consumed to prevent replay attack
    this.utrValidator.consume(valResult.sanitized);

    order.status = 'PAID';
    order.utr = valResult.sanitized;
    order.payerVpa = payerVpa || 'customer@upi';
    order.paidAt = new Date().toISOString();
    this.orders.set(orderId, order);

    return {
      success: true,
      status: 'PAID',
      orderId,
      amount: order.amount,
      utr: order.utr,
      paidAt: order.paidAt
    };
  }

  /**
   * Handle Webhook from bank / notification observer
   * @param {Object} payload
   * @param {string} signature
   * @returns {Object} Reconciled order or error
   */
  handleWebhook(payload, signature) {
    if (signature && !this.webhookManager.verify(payload, signature)) {
      return { success: false, error: 'Invalid HMAC signature' };
    }

    const { orderId, utr, amount, status } = payload.data || payload;
    const order = this.orders.get(orderId);

    if (!order) {
      return { success: false, error: `Order #${orderId} not found` };
    }

    if (status === 'PAID' || status === 'SUCCESS') {
      order.status = 'PAID';
      order.utr = utr;
      order.paidAt = new Date().toISOString();
      this.orders.set(orderId, order);
      this.observer.notify(orderId, order);
      return { success: true, orderId, status: 'PAID' };
    }

    return { success: false, error: 'Unsupported webhook status' };
  }

  /**
   * Get Order status by Order ID
   * @param {string} orderId
   * @returns {Object|null}
   */
  getOrder(orderId) {
    return this.orders.get(orderId) || null;
  }

  /**
   * List all stored orders
   * @returns {Array<Object>}
   */
  listOrders() {
    return Array.from(this.orders.values());
  }
}

module.exports = UPIGateway;
