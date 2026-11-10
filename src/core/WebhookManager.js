/**
 * UPIGateway - WebhookManager
 * Handles cryptographic HMAC-SHA256 signature signing and verification for webhook callbacks
 */

const crypto = require('crypto');

class WebhookManager {
  /**
   * @param {string} secretKey - Secret key shared between gateway and consumers
   */
  constructor(secretKey = 'upigateway_default_secret_key') {
    this.secretKey = secretKey;
  }

  /**
   * Generate HMAC-SHA256 signature for payload
   * @param {Object|string} payload
   * @returns {string} hex signature
   */
  sign(payload) {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', this.secretKey).update(data).digest('hex');
  }

  /**
   * Verify signature of incoming webhook
   * @param {Object|string} payload
   * @param {string} signature - Header signature to compare
   * @returns {boolean}
   */
  verify(payload, signature) {
    if (!signature) return false;
    try {
      const expected = this.sign(payload);
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(signature, 'hex')
      );
    } catch (err) {
      return false;
    }
  }

  /**
   * Format standard webhook payload
   * @param {Object} event
   * @returns {Object}
   */
  buildEventPayload(event) {
    return {
      event: event.type || 'payment.success',
      timestamp: Date.now(),
      data: {
        orderId: event.orderId,
        amount: event.amount,
        currency: 'INR',
        status: event.status || 'PAID',
        utr: event.utr,
        vpa: event.vpa,
        payerVpa: event.payerVpa || 'customer@upi'
      }
    };
  }
}

module.exports = WebhookManager;
