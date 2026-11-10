/**
 * UPIGateway - NotificationObserver
 * Ingests and parses incoming bank notifications, SMS alerts, or third-party webhooks to auto-reconcile transactions
 */

class NotificationObserver {
  constructor(webhookManager) {
    this.webhookManager = webhookManager;
    this.listeners = new Map();
  }

  /**
   * Parse Indian Bank UPI Credit SMS text
   * Typical formats:
   * - "Dear Customer, INR 500.00 credited to A/c ... via UPI:431526789012 from John Doe (HDFC Bank)"
   * - "Acct ... credited by Rs 499.00 on 10-Nov-26 by UPI Ref 431526789012"
   * - "Received Rs.500.00 from customer@upi. UPI Ref: 431526789012 (PhonePe Business)"
   * @param {string} rawMessage
   * @returns {{ amount: number|null, utr: string|null, sender: string|null }}
   */
  static parseBankAlert(rawMessage) {
    if (!rawMessage || typeof rawMessage !== 'string') {
      return { amount: null, utr: null, sender: null };
    }

    // Extract amount
    let amount = null;
    const amountMatch = rawMessage.match(/(?:INR|Rs\.?|Rs)\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1]);
    }

    // Extract 12-digit UTR/RRN
    let utr = null;
    const utrMatch = rawMessage.match(/(?:UPI(?:\s*Ref)?(?:\s*no\.?|\s*:)?|\s*Ref\s*no\.?|RRN\s*:?)\s*([0-9]{12})/i);
    if (utrMatch) {
      utr = utrMatch[1];
    } else {
      // Fallback: search for standalone 12-digit number
      const standaloneMatch = rawMessage.match(/\b([0-9]{12})\b/);
      if (standaloneMatch) utr = standaloneMatch[1];
    }

    // Extract sender VPA if present
    let sender = null;
    const senderMatch = rawMessage.match(/([a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64})/);
    if (senderMatch) {
      sender = senderMatch[1];
    }

    return { amount, utr, sender };
  }

  /**
   * Register a callback listener for reconciled payments
   * @param {string} orderId
   * @param {Function} callback
   */
  onPaymentReceived(orderId, callback) {
    this.listeners.set(orderId, callback);
  }

  /**
   * Emit payment match
   * @param {string} orderId
   * @param {Object} paymentData
   */
  notify(orderId, paymentData) {
    if (this.listeners.has(orderId)) {
      const cb = this.listeners.get(orderId);
      cb(paymentData);
      this.listeners.delete(orderId);
    }
  }
}

module.exports = NotificationObserver;
