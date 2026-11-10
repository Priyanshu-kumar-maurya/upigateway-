/**
 * UPIGateway - React Demo Integration
 */

import React, { useState } from 'react';
import UPICheckout from '../../src/client/UPICheckout';

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const startCheckout = async () => {
    // 1. Call your backend API to create an order
    const res = await fetch('/api/upi/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 499,
        customerName: 'Priyanshu Maurya',
        note: 'Companion Booking Escrow'
      })
    });
    const data = await res.json();
    setCurrentOrder(data.order);
    setIsModalOpen(true);
  };

  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', padding: '40px', textAlign: 'center' }}>
      <h1>⚡ UPIGateway React Demo</h1>
      <p style={{ color: '#888', marginBottom: '20px' }}>Zero-fee peer-to-merchant UPI checkout</p>

      <button
        onClick={startCheckout}
        style={{
          background: 'linear-gradient(135deg, #f9ce3f, #e1306c, #833ab4)',
          color: '#fff',
          border: 'none',
          padding: '14px 28px',
          borderRadius: '12px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Book Companion (Pay ₹499 via UPI)
      </button>

      {paymentStatus && (
        <div style={{ marginTop: '20px', color: '#00e676', fontWeight: 'bold' }}>
          Payment Status: {paymentStatus}
        </div>
      )}

      {/* Drop-in UPICheckout Modal */}
      <UPICheckout
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={currentOrder}
        onSuccess={(data) => {
          setPaymentStatus(`PAID (UTR: ${data.utr})`);
          setIsModalOpen(false);
        }}
        onFailure={(err) => {
          alert('Payment Failed: ' + err.error);
        }}
      />
    </div>
  );
}
