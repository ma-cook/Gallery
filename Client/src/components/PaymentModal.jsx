import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { createCheckoutSession } from '../firebaseFunctions';

// TODO: Replace with your actual Stripe publishable key
const stripePromise = loadStripe('pk_test_51SwX2LPw6BfSGHAIQe4EH2cyMuWfdJj1StmTtEICe9fXa59ID0rEJBE4H2pIUilCHALcXzzrEJjxT7UTurp5LVZ300DB86wmLs');

const PaymentModal = ({ isOpen, onClose, request, userId }) => {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && request) {
      initializeCheckout();
    }
  }, [isOpen, request]);

  const initializeCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const { clientSecret: secret } = await createCheckoutSession({
        requestId: request.id,
        userId: userId,
        price: request.price || 50, // Default price if not set
        requestName: request.name,
        requestDescription: request.description,
        returnUrl: window.location.href,
      });
      setClientSecret(secret);
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError('Failed to initialize payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1002,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          background: '#fff',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#1a1a1a',
            }}
          >
            Complete Payment
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
              lineHeight: 1,
              padding: '0 4px',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#000';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#666';
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '1.5rem', maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              <p>Initializing secure payment...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: '#d32f2f', marginBottom: '1rem' }}>{error}</p>
              <button
                onClick={initializeCheckout}
                style={{
                  padding: '0.6rem 1.5rem',
                  background: '#000',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Try Again
              </button>
            </div>
          ) : clientSecret ? (
            <div id="checkout">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ clientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
