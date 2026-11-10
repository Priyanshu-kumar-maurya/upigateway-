/**
 * UPIGateway - QRGenerator
 * Generates NPCI-compliant UPI Intent URLs and dynamic QR codes (DataURL / SVG)
 */

const QRCode = require('qrcode');

class QRGenerator {
  /**
   * Build NPCI-compliant UPI deep-link URI
   * @param {Object} params
   * @param {string} params.vpa - Merchant / Payee UPI ID (e.g. merchant@icici)
   * @param {string} params.name - Merchant / Payee Name (e.g. Coffeely)
   * @param {number|string} params.amount - Payable amount in INR (e.g. 499.00)
   * @param {string} params.transactionId - Unique Order / Ref ID
   * @param {string} [params.note] - Payment description or order note
   * @param {string} [params.mc] - Merchant Category Code (optional)
   * @returns {string} upi://pay URI
   */
  static buildIntentUrl({ vpa, name, amount, transactionId, note = 'Payment', mc }) {
    if (!vpa) throw new Error('VPA (UPI ID) is required to build Intent URL');
    if (!name) throw new Error('Merchant/Payee name is required');
    if (!amount || Number(amount) <= 0) throw new Error('Valid amount > 0 is required');
    if (!transactionId) throw new Error('transactionId / orderId is required');

    const formattedAmount = Number(amount).toFixed(2);
    const cleanName = encodeURIComponent(name.trim());
    const cleanNote = encodeURIComponent(note.trim().slice(0, 50));
    const cleanTr = encodeURIComponent(transactionId.trim());

    let uri = `upi://pay?pa=${vpa}&pn=${cleanName}&am=${formattedAmount}&cu=INR&tn=${cleanNote}&tr=${cleanTr}`;
    if (mc) {
      uri += `&mc=${encodeURIComponent(mc)}`;
    }
    return uri;
  }

  /**
   * Generate Base64 Data URL (PNG) of the QR Code
   * @param {string} intentUrl
   * @param {Object} [options]
   * @returns {Promise<string>} data:image/png;base64,...
   */
  static async toDataURL(intentUrl, options = {}) {
    const defaultOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 2,
      width: 320,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      ...options
    };
    return QRCode.toDataURL(intentUrl, defaultOptions);
  }

  /**
   * Generate SVG String of the QR Code
   * @param {string} intentUrl
   * @param {Object} [options]
   * @returns {Promise<string>} <svg ...>
   */
  static async toSVG(intentUrl, options = {}) {
    const defaultOptions = {
      errorCorrectionLevel: 'H',
      type: 'svg',
      margin: 2,
      width: 320,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      ...options
    };
    return QRCode.toString(intentUrl, defaultOptions);
  }
}

module.exports = QRGenerator;
