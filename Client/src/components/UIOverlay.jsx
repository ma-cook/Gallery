import React, { useState, useEffect } from 'react';
import AuthModal from './AuthModal';
import RequestsModal from './RequestsModal';
import CommissionModal from './CommissionModal';
import ProductsManagementModal from './ProductsManagementModal';
import LegalModal from './LegalModal';
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
  const socialLinks = useStore((state) => state.socialLinks);

  // Keep ephemeral form state local (resets on unmount, no need for global)
  const [authMode, setAuthMode] = useState('signin');
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
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

  const getSocialIcon = (platform) => {
    const iconProps = { width: "20", height: "20", fill: textColor, style: { filter: 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.5))' } };
    
    switch(platform) {
      case 'x':
        return (
          <svg {...iconProps} viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        );
      case 'instagram':
        return (
          <svg {...iconProps} viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
          </svg>
        );
      case 'reddit':
        return (
          <svg {...iconProps} viewBox="0 0 24 24">
            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
          </svg>
        );
      case 'youtube':
        return (
          <svg {...iconProps} viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        );
      case 'discord':
        return (
          <svg {...iconProps} viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        );
      case 'email':
        return (
          <svg {...iconProps} viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
        );
      default:
        return null;
    }
  };

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

      {/* Desktop Top left - Upload and Settings buttons (Admin only) */}
      {!isMobile && (
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

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: isMobile ? '15px' : '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          pointerEvents: 'none',
          textAlign: 'center',
          width: isMobile ? '80%' : 'auto',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: isMobile ? '36px' : '64px',
            fontFamily: "'Great Vibes', 'Tangerine', cursive",
            color: titleColor,
            textShadow: '2px 2px 8px rgba(0, 0, 0, 0.7)',
            letterSpacing: isMobile ? '1px' : '3px',
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
          top: isMobile ? '70px' : '37px',
          right: isMobile ? '20px' : '190px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '8px',
          zIndex: 1000,
          alignItems: isMobile ? 'flex-end' : 'center',
          background: isMobile ? 'rgba(0, 0, 0, 0.6)' : 'transparent',
          padding: isMobile ? '12px' : '0',
          borderRadius: isMobile ? '8px' : '0',
        }}
          >
        <span
          style={{
            color: textColor,
            fontSize: isMobile ? '14px' : '12px',
            cursor: 'pointer',
            textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)',
            marginLeft: isMobile ? '0' : '40px',
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
              fontSize: isMobile ? '14px' : '12px',
              cursor: 'pointer',
              textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)',
              marginLeft: isMobile ? '0' : '40px',
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
                fontSize: isMobile ? '14px' : '12px',
                cursor: 'pointer',
                textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)',
                marginLeft: isMobile ? '0' : '40px',
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
            {!isMobile && (
              <span
                style={{
                  color: textColor,
                  fontSize: '12px',
                  textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)',
                }}
              >
                |
              </span>
            )}
            <span
              style={{
                color: textColor,
                fontSize: isMobile ? '14px' : '12px',
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
          top: isMobile ? (user || !isAdmin ? '170px' : '20px') : '20px',
          right: '20px',
          display: 'flex',
          gap: isMobile ? '8px' : '10px',
          zIndex: 1000,
        }}
      >
        <button
          onClick={() => triggerTransition('plane')}
          style={{
            width: isMobile ? '44px' : '50px',
            height: isMobile ? '44px' : '50px',
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
          <svg width={isMobile ? '20' : '24'} height={isMobile ? '20' : '24'} viewBox="0 0 24 24" fill="none" stroke={buttonPrimaryColor} strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" />
          </svg>
        </button>
        <button
          onClick={() => triggerTransition('sphere')}
          style={{
            width: isMobile ? '44px' : '50px',
            height: isMobile ? '44px' : '50px',
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
          <svg width={isMobile ? '20' : '24'} height={isMobile ? '20' : '24'} viewBox="0 0 24 24" fill="none" stroke={buttonPrimaryColor} strokeWidth="2">
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

      {/* Social Media Links & Legal */}
      <div
        style={{
          position: 'absolute',
          bottom: isMobile ? '20px' : '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: isMobile ? '12px' : '16px',
          zIndex: 1000,
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: isMobile ? '90%' : 'none',
        }}
      >
        {/* Social Links */}
        {socialLinks && socialLinks.length > 0 && socialLinks.map((link) => (
          <a
            key={link.id}
            href={link.platform === 'email' ? `mailto:${link.url}` : link.url}
            target={link.platform === 'email' ? '_self' : '_blank'}
            rel={link.platform === 'email' ? '' : 'noopener noreferrer'}
            style={{
              cursor: 'pointer',
              opacity: 0.9,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'scale(1.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {getSocialIcon(link.platform)}
          </a>
        ))}

        {/* Divider */}
        {socialLinks && socialLinks.length > 0 && (
          <div style={{ width: '1px', height: '16px', background: textColor, opacity: 0.3 }} />
        )}

        {/* Legal/Policies Button */}
        <button
          onClick={() => setIsLegalModalOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            opacity: 0.7,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.7';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Legal & Policies"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.5))' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </button>
      </div>

      {/* Legal Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
      />
   
    </>
  );
};

export default UIOverlay;
