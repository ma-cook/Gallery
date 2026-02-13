import React, { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { createCheckoutSession } from '../firebaseFunctions';

// TODO: Replace with your actual Stripe publishable key
const stripePromise = loadStripe('pk_test_51SwX2LPw6BfSGHAIQe4EH2cyMuWfdJj1StmTtEICe9fXa59ID0rEJBE4H2pIUilCHALcXzzrEJjxT7UTurp5LVZ300DB86wmLs');

const PaymentModal = ({ isOpen, onClose, onPaymentComplete, request, userId }) => {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile/tablet screen sizes
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen && request) {
      setPaymentSuccess(false);
      initializeCheckout();
    }
    if (!isOpen) {
      setClientSecret('');
      setPaymentSuccess(false);
    }
  }, [isOpen, request]);

  const initializeCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const sessionData = {
        requestId: request.id,
        userId: userId,
        requestName: request.name,
        requestDescription: request.description,
        returnUrl: window.location.href,
      };

      // Use priceId from Stripe Product Catalog if available, otherwise use custom price
      if (request.priceId) {
        sessionData.priceId = request.priceId;
      } else {
        sessionData.price = request.price || 50; // Default price if not set
      }

      const { clientSecret: secret } = await createCheckoutSession(sessionData);
      setClientSecret(secret);
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError('Failed to initialize payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = useCallback(() => {
    setPaymentSuccess(true);
    if (onPaymentComplete && request) {
      onPaymentComplete(request.id);
    }
  }, [onPaymentComplete, request]);

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
        padding: isMobile ? '0.5rem' : '1rem',
      }}
      onClick={paymentSuccess ? undefined : onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: isMobile ? '95vw' : '500px',
          maxHeight: isMobile ? '92vh' : '90vh',
          background: '#fff',
          borderRadius: isMobile ? '10px' : '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: isMobile ? '1.2rem' : '1.5rem',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: isMobile ? '16px' : '18px',
              fontWeight: 600,
              color: paymentSuccess ? '#388e3c' : '#1a1a1a',
            }}
          >
            {paymentSuccess ? 'Payment Successful' : 'Complete Payment'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: isMobile ? '28px' : '24px',
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

        <div style={{ padding: isMobile ? '1.2rem' : '1.5rem', maxHeight: isMobile ? 'calc(92vh - 100px)' : 'calc(90vh - 100px)', overflowY: 'auto' }}>
          {paymentSuccess ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>&#10003;</div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#388e3c', marginBottom: '0.5rem' }}>
                Payment successfully completed!
              </p>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '1.5rem' }}>
                Your full resolution artwork is now available for download.
              </p>
              <button
                onClick={onClose}
                style={{
                  padding: '0.6rem 1.5rem',
                  background: '#000',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#333';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#000';
                }}
              >
                Close
              </button>
            </div>
          ) : loading ? (
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
                options={{ clientSecret, onComplete: handleComplete }}
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
