import React from 'react';

const AlertDialog = ({ isOpen, onClose, title, message, type = 'info' }) => {
  if (!isOpen) return null;

  // Different colors based on type
  const getButtonColor = () => {
    switch (type) {
      case 'error':
        return { bg: '#c62828', hover: '#b71c1c' };
      case 'success':
        return { bg: '#388e3c', hover: '#2e7d32' };
      default:
        return { bg: '#000', hover: '#333' };
    }
  };

  const buttonColor = getButtonColor();

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          zIndex: 1002,
          backdropFilter: 'blur(2px)',
        }}
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '20rem',
          maxWidth: '90vw',
          background: 'rgba(255, 255, 255, 0.97)',
          border: '1px solid rgba(0, 0, 0, 0.15)',
          borderRadius: '4px',
          padding: '1.5rem',
          zIndex: 1003,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <h2
          style={{
            margin: '0 0 0.75rem 0',
            color: '#1a1a1a',
            fontSize: '16px',
            fontWeight: 600,
            letterSpacing: '-0.3px',
          }}
        >
          {title}
        </h2>
        
        <p
          style={{
            margin: '0 0 1.25rem 0',
            color: '#666',
            fontSize: '13px',
            lineHeight: '1.5',
          }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '13px',
              fontWeight: 600,
              color: '#fff',
              background: buttonColor.bg,
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = buttonColor.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = buttonColor.bg;
            }}
          >
            OK
          </button>
        </div>
      </div>
    </>
  );
};

export default AlertDialog;
