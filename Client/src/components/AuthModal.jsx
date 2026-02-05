// AuthModal.jsx
import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getAuth } from 'firebase/auth';

function AuthModal({ isOpen, onClose, onSignIn, mode = 'signin' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = getAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    onSignIn(email, password);
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onClose();
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  };

  if (!isOpen) return null;

  const isSignIn = mode === 'signin';
  const title = isSignIn ? 'Sign In' : 'Create Account';

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '24rem',
        maxWidth: '90vw',
        background: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
        padding: '1.75rem',
        zIndex: 1000,
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2
          style={{
            margin: 0,
            color: '#000',
            fontSize: '20px',
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
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
            padding: 0,
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ color: '#333', fontSize: '13px', fontWeight: 500 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            style={{
              padding: '0.6rem 0.75rem',
              background: '#fff',
              border: '1px solid rgba(0, 0, 0, 0.2)',
              borderRadius: '6px',
              color: '#000',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.4)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.2)';
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ color: '#333', fontSize: '13px', fontWeight: 500 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            style={{
              padding: '0.6rem 0.75rem',
              background: '#fff',
              border: '1px solid rgba(0, 0, 0, 0.2)',
              borderRadius: '6px',
              color: '#000',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.4)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.2)';
            }}
          />
        </div>
        
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '0.65rem',
            background: '#000',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.2s ease',
            marginTop: '0.5rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#333';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#000';
          }}
        >
          {isSignIn ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem', 
        margin: '1.25rem 0 1rem',
      }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(0, 0, 0, 0.15)' }} />
        <span style={{ color: '#666', fontSize: '12px', fontWeight: 500 }}>OR</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(0, 0, 0, 0.15)' }} />
      </div>

      <button
        onClick={handleGoogleSignIn}
        type="button"
        style={{
          width: '100%',
          padding: '0.65rem',
          background: '#fff',
          border: '1px solid rgba(0, 0, 0, 0.2)',
          borderRadius: '6px',
          color: '#000',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f8f8f8';
          e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#fff';
          e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.2)';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
          <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.438 15.983 5.482 18 9.003 18z" fill="#34A853"/>
          <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.482 0 2.438 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>
    </div>
  );
}

export default AuthModal;
