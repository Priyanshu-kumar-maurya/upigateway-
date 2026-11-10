/**
 * UPIGateway - DirectUPIAdapter
 * Direct Peer-to-Merchant bank settlement handler with 0% MDR
 */

const QRGenerator = require('../core/QRGenerator');

class DirectUPIAdapter {
  constructor(config = {}) {
    this.vpa = config.vpa;
    this.merchantName = config.merchantName || 'UPI Merchant';
    this.mc = config.mc || '5499'; // Default Miscellaneous & Specialty Retail Stores
  }

  /**
   * Create an intent bundle for a direct UPI order
   * @param {Object} order
   * @returns {Promise<Object>}
   */
  async createIntentBundle(order) {
    const intentUrl = QRGenerator.buildIntentUrl({
      vpa: this.vpa,
      name: this.merchantName,
      amount: order.amount,
      transactionId: order.orderId,
      note: order.note || `Order #${order.orderId}`,
      mc: this.mc
    });

    // Generate base64 data url
    const qrDataUrl = await QRGenerator.toDataURL(intentUrl);

    // Deep link schemes for popular Indian UPI apps
    const appIntents = {
      gpay: intentUrl.replace('upi://pay', 'gpay://upi/pay'),
      phonepe: intentUrl.replace('upi://pay', 'phonepe://pay'),
      paytm: intentUrl.replace('upi://pay', 'paytmmp://pay'),
      bhim: intentUrl
    };

    return {
      intentUrl,
      qrDataUrl,
      appIntents,
      vpa: this.vpa,
      merchantName: this.merchantName
    };
  }
}

module.exports = DirectUPIAdapter;
