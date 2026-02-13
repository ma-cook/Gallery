// AuthModal.jsx
import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getAuth } from 'firebase/auth';

function AuthModal({ isOpen, onClose, onSignIn, mode = 'signin', embedded = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const auth = getAuth();

  // Detect mobile/tablet screen sizes
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSignIn(email, password);
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      if (onClose) onClose();
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  };

  if (!isOpen) return null;

  const isSignIn = mode === 'signin';
  const title = isSignIn ? 'Sign In' : 'Create Account';

  const content = (
    <>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ color: '#444', fontSize: isMobile ? '11px' : '12px', fontWeight: 600, letterSpacing: '0.01em' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            style={{
              padding: isMobile ? '11px 14px' : '9px 12px',
              background: '#fafafa',
              border: '1px solid #ddd',
              borderRadius: '8px',
              color: '#000',
              fontSize: isMobile ? '16px' : '13px',
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#111';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.06)';
              e.currentTarget.style.background = '#fff';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#ddd';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.background = '#fafafa';
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ color: '#444', fontSize: isMobile ? '11px' : '12px', fontWeight: 600, letterSpacing: '0.01em' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            style={{
              padding: isMobile ? '11px 14px' : '9px 12px',
              background: '#fafafa',
              border: '1px solid #ddd',
              borderRadius: '8px',
              color: '#000',
              fontSize: isMobile ? '16px' : '13px',
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#111';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.06)';
              e.currentTarget.style.background = '#fff';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#ddd';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.background = '#fafafa';
            }}
          />
        </div>
        
        <button
          type="submit"
          style={{
            width: '100%',
            padding: isMobile ? '12px' : '10px',
            background: '#111',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: isMobile ? '14px' : '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s',
            marginTop: '4px',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#333';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#111';
          }}
        >
          {isSignIn ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px', 
        margin: '14px 0',
      }}>
        <div style={{ flex: 1, height: '1px', background: '#eee' }} />
        <span style={{ color: '#999', fontSize: '11px', fontWeight: 600 }}>OR</span>
        <div style={{ flex: 1, height: '1px', background: '#eee' }} />
      </div>

      <button
        onClick={handleGoogleSignIn}
        type="button"
        style={{
          width: '100%',
          padding: isMobile ? '12px' : '10px',
          background: '#fafafa',
          border: '1px solid #ddd',
          borderRadius: '8px',
          color: '#111',
          fontSize: isMobile ? '14px' : '13px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f0f0f0';
          e.currentTarget.style.borderColor = '#ccc';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#fafafa';
          e.currentTarget.style.borderColor = '#ddd';
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
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: isMobile ? '92vw' : '340px',
        maxWidth: '90vw',
        background: '#fff',
        borderRadius: '12px',
        padding: 0,
        zIndex: 1000,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: isMobile ? '14px 18px' : '16px 20px',
        borderBottom: '1px solid #eee',
      }}>
        <h2
          style={{
            margin: 0,
            color: '#111',
            fontSize: '15px',
            fontWeight: 700,
          }}
        >
          {title}
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#999',
            lineHeight: 1,
            padding: 0,
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#111';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#999';
          }}
        >
          ×
        </button>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {content}
      </div>
    </div>
  );
}

export default AuthModal;
