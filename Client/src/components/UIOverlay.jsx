import React, { useState, useEffect } from 'react';
import AuthModal from './AuthModal';
import RequestsModal from './RequestsModal';
import CommissionModal from './CommissionModal';
import CollectionModal from './CollectionModal';
import ProductsManagementModal from './ProductsManagementModal';
import LegalModal from './LegalModal';
import { handleSignIn } from '../utils/authFunctions';
import useStore from '../store';

const UIOverlay = ({
  handleFileChangeWithProgress,
  isLegalModalOpen,
  setIsLegalModalOpen,
  authMode,
  setAuthMode,
  isCollectionOpen,
  setIsCollectionOpen,
}) => {
  // Read global state from Zustand store (eliminates prop drilling)
  const user = useStore((state) => state.user);
  const isAdmin = useStore((state) => state.isAdmin);
  const uploadProgress = useStore((state) => state.uploadProgress);
  const textColor = useStore((state) => state.textColor);
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

      {/* Mobile Hamburger Menu (Admin only) */}
      {isMobile && isAdmin && (
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(0, 0, 0, 0.6)',
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            cursor: 'pointer',
            zIndex: 1002,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)'; }}
        >
          <div style={{ width: '24px', height: '2px', background: textColor, borderRadius: '2px' }} />
          <div style={{ width: '24px', height: '2px', background: textColor, borderRadius: '2px' }} />
          <div style={{ width: '24px', height: '2px', background: textColor, borderRadius: '2px' }} />
        </button>
      )}

      {/* Mobile Menu Dropdown */}
      {isMobile && isAdmin && isMobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '70px',
            left: '20px',
            background: 'rgba(0, 0, 0, 0.9)',
            borderRadius: '12px',
            padding: '12px',
            zIndex: 1002,
            minWidth: '160px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span
              style={{
                color: textColor,
                fontSize: '14px',
                cursor: 'pointer',
                padding: '10px 12px',
                borderRadius: '6px',
                transition: 'background 0.2s',
              }}
              onClick={() => {
                document.getElementById('fileInput').click();
                setIsMobileMenuOpen(false);
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Upload
            </span>
            <span
              style={{
                color: textColor,
                fontSize: '14px',
                cursor: 'pointer',
                padding: '10px 12px',
                borderRadius: '6px',
                transition: 'background 0.2s',
              }}
              onClick={() => {
                setIsSettingsModalOpen(true);
                setIsRequestsVisible(false);
                setIsProductsVisible(false);
                setIsCommissionVisible(false);
                setIsAuthModalOpen(false);
                setIsMobileMenuOpen(false);
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Settings
            </span>
            <span
              style={{
                color: textColor,
                fontSize: '14px',
                cursor: 'pointer',
                padding: '10px 12px',
                borderRadius: '6px',
                transition: 'background 0.2s',
              }}
              onClick={() => {
                setIsRequestsVisible(true);
                setIsProductsVisible(false);
                setIsCommissionVisible(false);
                setIsAuthModalOpen(false);
                setIsMobileMenuOpen(false);
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Requests
            </span>
            <span
              style={{
                color: textColor,
                fontSize: '14px',
                cursor: 'pointer',
                padding: '10px 12px',
                borderRadius: '6px',
                transition: 'background 0.2s',
              }}
              onClick={() => {
                setIsProductsVisible(true);
                setIsRequestsVisible(false);
                setIsCommissionVisible(false);
                setIsAuthModalOpen(false);
                setIsMobileMenuOpen(false);
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Products
            </span>
          </div>
        </div>
      )}

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

      {/* Collection Modal - shows user's completed commissioned artworks */}
      <CollectionModal
        isOpen={isCollectionOpen}
        onClose={() => setIsCollectionOpen(false)}
        user={user}
        onOpenCommission={() => {
          setIsCollectionOpen(false);
          setIsCommissionVisible(true);
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignIn={(email, password) => handleSignIn(email, password, setIsAuthModalOpen)}
        mode={authMode}
      />

      {/* Legal Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
      />
   
    </>
  );
};

export default UIOverlay;
