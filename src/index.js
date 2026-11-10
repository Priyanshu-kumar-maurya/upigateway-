/**
 * UPIGateway - Zero-Fee Open-Source UPI Payment Gateway for Node.js, Express & React
 * Main Package Export
 */

const UPIGateway = require('./core/UPIGateway');
const QRGenerator = require('./core/QRGenerator');
const UTRValidator = require('./core/UTRValidator');
const WebhookManager = require('./core/WebhookManager');
const NotificationObserver = require('./adapters/NotificationObserver');
const DirectUPIAdapter = require('./adapters/DirectUPIAdapter');
const SandboxAdapter = require('./adapters/SandboxAdapter');

module.exports = UPIGateway;
module.exports.UPIGateway = UPIGateway;
module.exports.QRGenerator = QRGenerator;
module.exports.UTRValidator = UTRValidator;
module.exports.WebhookManager = WebhookManager;
module.exports.NotificationObserver = NotificationObserver;
module.exports.DirectUPIAdapter = DirectUPIAdapter;
module.exports.SandboxAdapter = SandboxAdapter;
