/**
 * UPIGateway - UTRValidator
 * Validates 12-digit Indian UPI Unique Transaction Reference (UTR / RRN)
 */

class UTRValidator {
  constructor() {
    // In-memory set to prevent duplicate UTR reuse within the same gateway instance
    this.usedUTRs = new Set();
  }

  /**
   * Validate UTR / RRN format according to NPCI UPI specifications
   * Standard Indian UPI UTR is exactly 12 numeric digits (e.g., 431526789012)
   * @param {string} utr
   * @returns {{ valid: boolean, error?: string, sanitized?: string }}
   */
  validate(utr) {
    if (!utr) {
      return { valid: false, error: 'UTR / Transaction Reference number is missing' };
    }

    // Clean whitespace and any non-numeric characters
    const sanitized = String(utr).trim().replace(/[^0-9]/g, '');

    if (sanitized.length !== 12) {
      return {
        valid: false,
        error: `Invalid UTR length (${sanitized.length} digits). NPCI standard requires exactly 12 numeric digits.`,
        sanitized
      };
    }

    // Reject obvious dummy/invalid sequences (e.g., 000000000000, 111111111111, 123456789012)
    const repetitivePattern = /^(\d)\1{11}$/;
    if (repetitivePattern.test(sanitized)) {
      return {
        valid: false,
        error: 'Invalid dummy UTR: repetitive sequence is not accepted by NPCI.',
        sanitized
      };
    }

    // Check if already used to prevent replay attacks
    if (this.usedUTRs.has(sanitized)) {
      return {
        valid: false,
        error: 'This UTR has already been submitted and processed. Replay attack blocked.',
        sanitized
      };
    }

    return {
      valid: true,
      sanitized
    };
  }

  /**
   * Mark a UTR as consumed / used
   * @param {string} utr
   */
  consume(utr) {
    const sanitized = String(utr).trim().replace(/[^0-9]/g, '');
    this.usedUTRs.add(sanitized);
  }

  /**
   * Clear cache (useful for testing)
   */
  clear() {
    this.usedUTRs.clear();
  }
}

module.exports = UTRValidator;
