import React, { useState } from 'react';
import AuthModal from './AuthModal';
import RequestsModal from './RequestsModal';
import CommissionModal from './CommissionModal';
import ProductsManagementModal from './ProductsManagementModal';
import { signOutUser } from '../Auth';
import { handleSignIn } from '../utils/authFunctions';
import useStore from '../store';

const UIOverlay = ({
  triggerTransition,
  handleFileChangeWithProgress,
}) => {
  // Read global state from Zustand store (eliminates prop drilling)
  const user = useStore((state) => state.user);
  const isAdmin = useStore((state) => state.isAdmin);
  const uploadProgress = useStore((state) => state.uploadProgress);
  const textColor = useStore((state) => state.textColor);
  const titleColor = useStore((state) => state.titleColor);
  const buttonPrimaryColor = useStore((state) => state.buttonPrimaryColor);
  const buttonSecondaryColor = useStore((state) => state.buttonSecondaryColor);
  const setIsSettingsModalOpen = useStore((state) => state.setIsSettingsModalOpen);
  const setImages = useStore((state) => state.setImages);
  const isAuthModalOpen = useStore((state) => state.isAuthModalOpen);
  const setIsAuthModalOpen = useStore((state) => state.setIsAuthModalOpen);
  const isCommissionVisible = useStore((state) => state.isCommissionVisible);
  const setIsCommissionVisible = useStore((state) => state.setIsCommissionVisible);
  const isRequestsVisible = useStore((state) => state.isRequestsVisible);
  const setIsRequestsVisible = useStore((state) => state.setIsRequestsVisible);
  const isProductsVisible = useStore((state) => state.isProductsVisible);
  const setIsProductsVisible = useStore((state) => state.setIsProductsVisible);

  // Keep ephemeral form state local (resets on unmount, no need for global)
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

      {/* Top left - Upload and Settings buttons (Admin only) */}
      <div
        style={{
          position: 'absolute',
          top: '37px',
          left: '40px',
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
          zIndex: 1000,
          alignItems: 'center',
        }}
      >
        {isAdmin && (
          <>
            <span
              style={{
                color: textColor,
                fontSize: '12px',
                cursor: 'pointer',
                textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)',
              }}
              onClick={() => document.getElementById('fileInput').click()}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              upload
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
                setIsSettingsModalOpen(true);
                setIsRequestsVisible(false);
                setIsProductsVisible(false);
                setIsCommissionVisible(false);
                setIsAuthModalOpen(false);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              settings
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
                setIsRequestsVisible(true);
                setIsProductsVisible(false);
                setIsCommissionVisible(false);
                setIsAuthModalOpen(false);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              requests
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
                setIsProductsVisible(true);
                setIsRequestsVisible(false);
                setIsCommissionVisible(false);
                setIsAuthModalOpen(false);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              products
            </span>
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
            color: titleColor,
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
            marginLeft: '40px',
          }}
          onClick={() => {
            setIsCommissionVisible(true);
            setIsRequestsVisible(false);
            setIsProductsVisible(false);
            setIsAuthModalOpen(false);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = 'none';
          }}
              >
                Commission
              </span>
        
        {user ? (
          <span
            style={{
              color: textColor,
              fontSize: '12px',
              cursor: 'pointer',
              textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)',
              marginLeft: '40px',
            }}
            onClick={signOutUser}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            Sign out
          </span>
        ) : (
          <>
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
                setIsRequestsVisible(false);
                setIsProductsVisible(false);
                setIsCommissionVisible(false);
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
                setIsRequestsVisible(false);
                setIsProductsVisible(false);
                setIsCommissionVisible(false);
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
          </>
        )}
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
            background: buttonSecondaryColor,
            border: `2px solid ${buttonPrimaryColor}`,
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
            e.currentTarget.style.background = buttonSecondaryColor;
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={buttonPrimaryColor} strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" />
          </svg>
        </button>
        <button
          onClick={() => triggerTransition('sphere')}
          style={{
            width: '50px',
            height: '50px',
            background: buttonSecondaryColor,
            border: `2px solid ${buttonPrimaryColor}`,
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
            e.currentTarget.style.background = buttonSecondaryColor;
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={buttonPrimaryColor} strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
          </svg>
        </button>
      </div>

      {/* Requests Modal (Admin only) */}
      <RequestsModal
        isOpen={isRequestsVisible}
        onClose={() => setIsRequestsVisible(false)}
      />

      {/* Products Management Modal (Admin only) */}
      <ProductsManagementModal
        isOpen={isProductsVisible}
        onClose={() => setIsProductsVisible(false)}
      />

      {/* Commission Modal (combines request list and form) */}
      <CommissionModal
        isOpen={isCommissionVisible}
        onClose={() => setIsCommissionVisible(false)}
        user={user}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignIn={(email, password) => handleSignIn(email, password, setIsAuthModalOpen)}
        mode={authMode}
      />

   
    </>
  );
};

export default UIOverlay;
