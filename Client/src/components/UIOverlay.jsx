import React, { useState } from 'react';
import AuthModal from './AuthModal';

const UIOverlay = ({
  user,
  uploadProgress,
  textColor,
  isMenuOpen,
  setIsMenuOpen,
  isSquareVisible,
  setIsSquareVisible,
  triggerTransition,
  handleFileChangeWithProgress,
  setIsSettingsModalOpen,
  setImages,
  isAuthModalOpen,
  setIsAuthModalOpen,
  onSignIn,
}) => {
  const [isCommissionVisible, setIsCommissionVisible] = useState(false);
  const [authMode, setAuthMode] = useState('signin');

  return (
    <>
      {/* Hidden file input */}
      <input
        type="file"
        id="fileInput"
        style={{ display: 'none' }}
        onChange={(event) =>
          handleFileChangeWithProgress(event, user, setImages)
        }
        accept="image/*"
        multiple
      />

      {/* Top left - Upload and Settings buttons */}
      <div style={{ position: 'absolute', zIndex: 1 }}>
        {user && (
          <>
            <button
              onClick={() => document.getElementById('fileInput').click()}
              disabled={uploadProgress > 0}
            >
              Upload Image
            </button>
            <button onClick={() => setIsSettingsModalOpen(true)}>
              Settings
            </button>
          </>
        )}
      </div>

      {/* Upload progress indicator */}
      {uploadProgress > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: textColor,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            padding: '15px 25px',
            borderRadius: '8px',
            fontSize: '1.2em',
            zIndex: 1000,
            textAlign: 'center',
          }}
        >
          Uploading: {Math.round(uploadProgress)} %
        </div>
      )}

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          pointerEvents: 'none',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '64px',
            fontFamily: "'Great Vibes', 'Tangerine', cursive",
            color: textColor,
            textShadow: '2px 2px 8px rgba(0, 0, 0, 0.7)',
            letterSpacing: '3px',
            fontWeight: 400,
          }}
        >
          placeholder
        </h1>
      </div>

      {/* Sign in / Create account text */}
      <div
        style={{
          position: 'absolute',
          top: '37px',
          right: '190px',
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
          zIndex: 1000,
          alignItems: 'center',
        }}
          >
      
        <span
          style={{
            color: textColor,
            fontSize: '12px',
            cursor: 'pointer',
            textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          about
        </span>
        <span
          style={{
            color: textColor,
            fontSize: '12px',
            cursor: 'pointer',
            textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)',
            marginLeft: '40px',
          }}
          onClick={() => setIsCommissionVisible(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
              >
                commission
              </span>
                  <span
          style={{
            color: textColor,
            fontSize: '12px',
            cursor: 'pointer',
            textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)',
            marginLeft: '40px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
              >
                Collection
        </span>
        <span
          style={{
            color: textColor,
            fontSize: '12px',
            cursor: 'pointer',
            textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)',
            marginLeft: '40px',
          }}
          onClick={() => {
            setAuthMode('signin');
            setIsAuthModalOpen(true);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          sign in
        </span>
        <span
          style={{
            color: textColor,
            fontSize: '12px',
            textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)',
          }}
        >
          |
        </span>
        <span
          style={{
            color: textColor,
            fontSize: '12px',
            cursor: 'pointer',
            textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)',
          }}
          onClick={() => {
            setAuthMode('createaccount');
            setIsAuthModalOpen(true);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          create account
        </span>
      </div>

      {/* Layout toggle buttons (top right) */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          gap: '10px',
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => triggerTransition('plane')}
          style={{
            width: '50px',
            height: '50px',
            background: 'rgba(0, 0, 0, 0.6)',
            border: `2px solid ${textColor}`,
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" />
          </svg>
        </button>
        <button
          onClick={() => triggerTransition('sphere')}
          style={{
            width: '50px',
            height: '50px',
            background: 'rgba(0, 0, 0, 0.6)',
            border: `2px solid ${textColor}`,
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
          </svg>
        </button>
      </div>

      {/* Commission Modal */}
      {isCommissionVisible && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '40rem',
            height: 'calc(100vh - 20rem)',
            background: 'rgba(255, 255, 255, 0.7)',
            border: '2px solid #000',
            borderRadius: '12px',
            zIndex: 998,
            padding: '2rem',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button
              onClick={() => setIsCommissionVisible(false)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#000',
              }}
            >
              ×
            </button>
          </div>
          {/* Commission content goes here */}
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignIn={onSignIn}
        mode={authMode}
      />

   
    </>
  );
};

export default UIOverlay;
