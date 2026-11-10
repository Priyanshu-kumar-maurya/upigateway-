/**
 * UPIGateway - Express Demo Server
 */

const path = require('path');
const express = require('express');
const cors = require('cors');
const UPIGateway = require('../../src/index');
const createUpiRouter = require('../../server/routes/upiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Gateway in Sandbox mode for testing
const gateway = new UPIGateway({
  vpa: 'priyanshu.companion@icici',
  merchantName: 'Coffeely Verified',
  sandbox: true,
  secretKey: 'demo_secret_key_12345'
});

app.use('/api/upi', createUpiRouter(gateway));

app.listen(PORT, () => {
  console.log(`\n🚀 UPIGateway Demo running at http://localhost:${PORT}`);
  console.log(`💳 Open http://localhost:${PORT} in your browser to test live checkout!\n`);
});
