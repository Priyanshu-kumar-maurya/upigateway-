/**
 * UPIGateway - Automated Test Suite
 */

const assert = require('assert');
const UPIGateway = require('../src/index');
const QRGenerator = require('../src/core/QRGenerator');
const UTRValidator = require('../src/core/UTRValidator');
const WebhookManager = require('../src/core/WebhookManager');
const NotificationObserver = require('../src/adapters/NotificationObserver');

async function runTests() {
  console.log('⚡ Starting UPIGateway Test Suite...\n');

  // Test 1: QR Generator & Intent URL
  console.log('Test 1: QR Generator NPCI Intent Format');
  const intent = QRGenerator.buildIntentUrl({
    vpa: 'test@icici',
    name: 'Test Merchant',
    amount: 150,
    transactionId: 'TX123456',
    note: 'Test Order'
  });
  assert(intent.startsWith('upi://pay?pa=test@icici'), 'Should start with correct UPI scheme');
  assert(intent.includes('am=150.00'), 'Amount should be formatted to 2 decimals');
  assert(intent.includes('tr=TX123456'), 'Transaction ID must match');
  console.log('  ✅ Pass: Intent URL correctly formatted');

  // Test 2: UTR Validator
  console.log('Test 2: 12-Digit UTR Validator');
  const validator = new UTRValidator();
  assert(validator.validate('431526789012').valid === true, 'Valid 12-digit UTR should pass');
  assert(validator.validate('12345').valid === false, 'Short UTR should fail');
  assert(validator.validate('000000000000').valid === false, 'Dummy repetitive UTR should fail');
  
  // Replay protection
  validator.consume('431526789012');
  assert(validator.validate('431526789012').valid === false, 'Used UTR should be blocked on replay');
  console.log('  ✅ Pass: UTR validation & anti-replay working');

  // Test 3: Webhook HMAC-SHA256 Signing & Verification
  console.log('Test 3: Webhook HMAC Cryptographic Security');
  const wm = new WebhookManager('my_test_secret_key');
  const payload = { orderId: 'ORD_999', amount: 500, status: 'PAID' };
  const sig = wm.sign(payload);
  assert(typeof sig === 'string' && sig.length === 64, 'HMAC signature must be 64-char hex string');
  assert(wm.verify(payload, sig) === true, 'Valid signature should verify');
  assert(wm.verify(payload, 'wrong_signature') === false, 'Invalid signature should fail');
  console.log('  ✅ Pass: HMAC-SHA256 sign & verify operational');

  // Test 4: NotificationObserver Parser
  console.log('Test 4: Bank SMS & Notification Alert Parser');
  const sampleSMS = 'Dear Customer, INR 499.00 credited to A/c XX1234 on 10-Nov-26 via UPI:431526789012 from John (HDFC)';
  const parsed = NotificationObserver.parseBankAlert(sampleSMS);
  assert.strictEqual(parsed.amount, 499, 'Parsed amount should be 499');
  assert.strictEqual(parsed.utr, '431526789012', 'Parsed UTR should match');
  console.log('  ✅ Pass: Bank notification regex parser extracted amount and UTR');

  // Test 5: Full Gateway Lifecycle (Order creation -> Sandbox verification)
  console.log('Test 5: Full Gateway Order Creation & Sandbox Lifecycle');
  const gateway = new UPIGateway({
    vpa: 'merchant@upi',
    merchantName: 'Coffeely Test',
    sandbox: true
  });

  const order = await gateway.createOrder({
    amount: 750,
    customerName: 'Priyanshu',
    note: 'Premium Subscription'
  });

  assert(order.orderId.startsWith('ORD_'), 'Generated orderId should have ORD prefix');
  assert.strictEqual(order.amount, 750, 'Order amount must match');
  assert.strictEqual(order.status, 'PENDING', 'Initial status must be PENDING');
  assert(order.appIntents.gpay, 'Should contain GPay intent');
  assert(order.appIntents.phonepe, 'Should contain PhonePe intent');

  // Verify payment
  const verifyRes = await gateway.verifyPayment({
    orderId: order.orderId,
    utr: '431599887766'
  });
  assert(verifyRes.success === true, 'Verification must succeed in sandbox');
  assert.strictEqual(verifyRes.status, 'PAID', 'Order status must be updated to PAID');

  const fetchedOrder = gateway.getOrder(order.orderId);
  assert.strictEqual(fetchedOrder.status, 'PAID', 'Stored order status must be PAID');
  console.log('  ✅ Pass: Order creation and payment verification complete');

  console.log('\n🎉 ALL 5 TEST SUITES PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
