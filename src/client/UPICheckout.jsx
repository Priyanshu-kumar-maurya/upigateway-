/**
 * UPICheckout - Drop-in React Component for UPIGateway
 * Modern OLED Dark Theme UPI Payment Modal
 */

import React, { useState, useEffect } from 'react';
import './UPICheckout.css';

export default function UPICheckout({
  isOpen,
  onClose,
  order,
  onSuccess,
  onFailure,
  apiUrl = '/api/upi'
}) {
  const [utr, setUtr] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes countdown
  const [showQR, setShowQR] = useState(true);

  // 5-minute countdown timer
  useEffect(() => {
    if (!isOpen || !order) return;
    setTimeLeft(300);
    setError(null);
    setUtr('');

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onFailure) onFailure({ error: 'Payment session expired' });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Handle UTR submission
  const handleVerify = async (submittedUtr) => {
    const finalUtr = (submittedUtr || utr).trim();
    if (!finalUtr) {
      setError('Please enter the 12-digit UPI Reference / UTR Number');
      return;
    }
    if (finalUtr.length !== 12) {
      setError('UPI Reference / UTR must be exactly 12 digits');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          utr: finalUtr
        })
      });
      const data = await res.json();

      if (data.success) {
        if (onSuccess) onSuccess(data);
      } else {
        setError(data.error || 'Verification failed. Please check UTR.');
      }
    } catch (err) {
      setError('Network error during verification. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Launch UPI App Deep-link on mobile
  const openApp = (appKey) => {
    const intent = order.appIntents?.[appKey] || order.intentUrl;
    if (intent) {
      window.location.href = intent;
    }
  };

  return (
    <div className="upi-overlay">
      <div className="upi-modal">
        {/* Header */}
        <div className="upi-header">
          <div className="upi-brand">
            <span className="upi-logo-badge">⚡ UPI</span>
            <div>
              <h3 className="upi-title">Pay via UPI</h3>
              <p className="upi-merchant">{order.merchantName || 'Merchant Checkout'}</p>
            </div>
          </div>
          <button className="upi-close-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {/* Amount & Timer Bar */}
        <div className="upi-summary-card">
          <div>
            <span className="upi-amount-label">Payable Amount</span>
            <div className="upi-amount">₹{Number(order.amount).toFixed(2)}</div>
          </div>
          <div className={`upi-timer ${timeLeft < 60 ? 'upi-timer-urgent' : ''}`}>
            ⏱️ {formattedTime}
          </div>
        </div>

        {/* Tab Toggle: Intent Apps vs QR Code */}
        <div className="upi-tabs">
          <button
            className={`upi-tab ${showQR ? 'active' : ''}`}
            onClick={() => setShowQR(true)}
          >
            📷 Scan QR Code
          </button>
          <button
            className={`upi-tab ${!showQR ? 'active' : ''}`}
            onClick={() => setShowQR(false)}
          >
            📱 Pay with App
          </button>
        </div>

        {/* Body Content */}
        {showQR ? (
          <div className="upi-qr-section">
            <div className="upi-qr-wrapper">
              {order.qrDataUrl ? (
                <img src={order.qrDataUrl} alt="UPI QR Code" className="upi-qr-image" />
              ) : (
                <div className="upi-qr-placeholder">Generating QR...</div>
              )}
            </div>
            <p className="upi-qr-hint">Scan with any UPI App: GPay, PhonePe, Paytm, or BHIM</p>
          </div>
        ) : (
          <div className="upi-apps-grid">
            <button className="upi-app-btn phonepe" onClick={() => openApp('phonepe')}>
              <span className="upi-app-icon">🟣</span>
              <span className="upi-app-name">PhonePe</span>
            </button>
            <button className="upi-app-btn gpay" onClick={() => openApp('gpay')}>
              <span className="upi-app-icon">🔵</span>
              <span className="upi-app-name">Google Pay</span>
            </button>
            <button className="upi-app-btn paytm" onClick={() => openApp('paytm')}>
              <span className="upi-app-icon">🟦</span>
              <span className="upi-app-name">Paytm</span>
            </button>
            <button className="upi-app-btn bhim" onClick={() => openApp('bhim')}>
              <span className="upi-app-icon">🟧</span>
              <span className="upi-app-name">BHIM UPI</span>
            </button>
          </div>
        )}

        {/* 12-Digit UTR Form */}
        <div className="upi-utr-section">
          <label className="upi-input-label">
            Enter 12-Digit UPI Ref / UTR No. (after payment)
          </label>
          <div className="upi-utr-row">
            <input
              type="text"
              maxLength="12"
              placeholder="e.g. 431526789012"
              value={utr}
              onChange={(e) => setUtr(e.target.value.replace(/[^0-9]/g, ''))}
              className="upi-utr-input"
            />
            <button
              className="upi-verify-btn"
              onClick={() => handleVerify()}
              disabled={isVerifying || utr.length !== 12}
            >
              {isVerifying ? 'Checking...' : 'Verify'}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && <div className="upi-error-badge">⚠️ {error}</div>}

        {/* Sandbox Helper Button */}
        {order.isSandbox && (
          <div className="upi-sandbox-badge">
            <span>🧪 Sandbox Test Mode Active</span>
            <button
              className="upi-sandbox-auto-btn"
              onClick={() => {
                const dummyUtr = `4315${Math.floor(10000000 + Math.random() * 90000000)}`;
                setUtr(dummyUtr);
                handleVerify(dummyUtr);
              }}
            >
              ⚡ Simulate Instant Success
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="upi-footer">
          <span>🔒 256-Bit Encrypted Peer-to-Merchant Settlement</span>
        </div>
      </div>
    </div>
  );
}
