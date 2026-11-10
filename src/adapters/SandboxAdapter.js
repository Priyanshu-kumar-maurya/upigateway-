/**
 * UPIGateway - SandboxAdapter
 * Simulated testing environment for local development without real bank transactions
 */

class SandboxAdapter {
  constructor(options = {}) {
    this.autoApprove = options.autoApprove !== false;
    this.latencyMs = options.latencyMs || 500;
  }

  /**
   * Process simulated payment
   * @param {Object} order
   * @param {string} utr
   * @returns {Promise<Object>}
   */
  async processSimulatedPayment(order, utr) {
    await new Promise((resolve) => setTimeout(resolve, this.latencyMs));

    if (utr.endsWith('00')) {
      return {
        success: false,
        status: 'FAILED',
        error: 'Simulated failure: Bank server declined transaction (code: SB-00)'
      };
    }

    return {
      success: true,
      status: 'PAID',
      orderId: order.orderId,
      amount: order.amount,
      utr: utr || `SBX${Date.now()}`,
      timestamp: new Date().toISOString(),
      payerVpa: 'sandbox.user@okhdfcbank',
      bankRef: `BNK_SIM_${Math.floor(100000 + Math.random() * 900000)}`
    };
  }
}

module.exports = SandboxAdapter;
