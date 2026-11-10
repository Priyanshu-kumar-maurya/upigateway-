/**
 * UPIGateway - Express REST API Routes
 */

const express = require('express');

module.exports = function createUpiRouter(gateway) {
  const router = express.Router();

  /**
   * POST /api/upi/create-order
   * Body: { amount, customerName, customerPhone, note, orderId }
   */
  router.post('/create-order', async (req, res) => {
    try {
      const { amount, customerName, customerPhone, note, orderId } = req.body;
      if (!amount) {
        return res.status(400).json({ success: false, error: 'Amount is required' });
      }

      const order = await gateway.createOrder({
        amount: Number(amount),
        customerName,
        customerPhone,
        note,
        orderId
      });

      return res.status(201).json({
        success: true,
        order
      });
    } catch (err) {
      console.error('[UPIGateway API] Create order error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/upi/verify-payment
   * Body: { orderId, utr, payerVpa }
   */
  router.post('/verify-payment', async (req, res) => {
    try {
      const { orderId, utr, payerVpa } = req.body;
      if (!orderId || !utr) {
        return res.status(400).json({
          success: false,
          error: 'Both orderId and 12-digit UTR are required'
        });
      }

      const result = await gateway.verifyPayment({ orderId, utr, payerVpa });
      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (err) {
      console.error('[UPIGateway API] Verify error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/upi/order-status/:orderId
   */
  router.get('/order-status/:orderId', (req, res) => {
    const { orderId } = req.params;
    const order = gateway.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    return res.status(200).json({ success: true, order });
  });

  /**
   * POST /api/upi/webhook
   * Header: x-upi-signature
   */
  router.post('/webhook', (req, res) => {
    try {
      const signature = req.headers['x-upi-signature'];
      const result = gateway.handleWebhook(req.body, signature);
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/upi/config
   * Public info: VPA, merchant name, sandbox mode
   */
  router.get('/config', (req, res) => {
    return res.status(200).json({
      success: true,
      vpa: gateway.vpa,
      merchantName: gateway.merchantName,
      sandbox: gateway.sandbox,
      currency: 'INR'
    });
  });

  return router;
};
