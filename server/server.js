/**
 * UPIGateway - Standalone Microservice Server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const UPIGateway = require('../src/index');
const createUpiRouter = require('./routes/upiRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Gateway Instance
const gateway = new UPIGateway({
  vpa: process.env.UPI_VPA || 'merchant@upi',
  merchantName: process.env.MERCHANT_NAME || 'Coffeely Escrow',
  sandbox: process.env.UPI_SANDBOX === 'true' || true,
  secretKey: process.env.UPI_SECRET_KEY || 'upigateway_super_secret_key_2026'
});

// Mount Routes
app.use('/api/upi', createUpiRouter(gateway));

// Root Healthcheck
app.get('/', (req, res) => {
  res.json({
    name: 'UPIGateway',
    status: 'ONLINE',
    version: '1.0.0',
    endpoints: {
      createOrder: 'POST /api/upi/create-order',
      verifyPayment: 'POST /api/upi/verify-payment',
      orderStatus: 'GET /api/upi/order-status/:orderId',
      config: 'GET /api/upi/config',
      webhook: 'POST /api/upi/webhook'
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n⚡ UPIGateway Microservice running on http://localhost:${PORT}`);
    console.log(`📡 VPA: ${gateway.vpa} | Mode: ${gateway.sandbox ? '🧪 SANDBOX' : '🚀 PRODUCTION'}\n`);
  });
}

module.exports = { app, gateway };
