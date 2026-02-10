import React from 'react';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

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

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '13px',
              fontWeight: 600,
              color: '#666',
              background: '#fff',
              border: '1px solid rgba(0, 0, 0, 0.2)',
              borderRadius: '3px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8f8f8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '13px',
              fontWeight: 600,
              color: '#fff',
              background: '#c62828',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#b71c1c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#c62828';
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </>
  );
};

export default ConfirmDialog;
