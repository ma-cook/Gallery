import React, { useState } from 'react';
import AuthModal from './AuthModal';
import RequestsModal from './RequestsModal';
import UserRequestsModal from './UserRequestsModal';
import { signOutUser } from '../Auth';
import { createRequest, checkUserHasRequests } from '../firebaseFunctions';

const UIOverlay = ({
  user,
  isAdmin,
  uploadProgress,
  textColor,
  titleColor,
  buttonPrimaryColor,
  buttonSecondaryColor,
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
  const [isRequestsVisible, setIsRequestsVisible] = useState(false);
  const [isUserRequestsVisible, setIsUserRequestsVisible] = useState(false);
  const [userHasRequests, setUserHasRequests] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [formData, setFormData] = useState({
    name: '',
    email: user?.email || '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update email when user changes
  React.useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  // Check if user has any requests
  React.useEffect(() => {
    const checkRequests = async () => {
      if (user?.uid) {
        const hasRequests = await checkUserHasRequests(user.uid);
        setUserHasRequests(hasRequests);
      } else {
        setUserHasRequests(false);
      }
    };
    checkRequests();
  }, [user]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createRequest({
        name: formData.name,
        email: formData.email,
        description: formData.description,
        userId: user?.uid || null,
      });
      // Reset form
      setFormData({
        name: '',
        email: user?.email || '',
        description: '',
      });
      alert('Request submitted successfully!');
      setIsCommissionVisible(false);
      // Recheck if user has requests
      if (user?.uid) {
        const hasRequests = await checkUserHasRequests(user.uid);
        setUserHasRequests(hasRequests);
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
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
              onClick={() => setIsSettingsModalOpen(true)}
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
              onClick={() => setIsRequestsVisible(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              requests
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
        {userHasRequests && (
          <span
            style={{
              color: textColor,
              fontSize: '12px',
              cursor: 'pointer',
              textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)',
              marginLeft: '40px',
            }}
            onClick={() => setIsUserRequestsVisible(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            status
          </span>
        )}
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
            sign out
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

      {/* Commission Modal */}
      {isCommissionVisible && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '42rem',
            maxWidth: '90vw',
            maxHeight: '85vh',
            background: 'rgba(255, 255, 255, 0.97)',
            border: '1px solid rgba(0, 0, 0, 0.15)',
            borderRadius: '4px',
            zIndex: 998,
            padding: '1.5rem',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.3px' }}>
              Request Artwork
            </h2>
            <button
              onClick={() => setIsCommissionVisible(false)}
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

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
            <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '12px', fontWeight: 600, color: '#555' }}>
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                required
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  fontSize: '13px',
                  border: '1px solid rgba(0, 0, 0, 0.2)',
                  borderRadius: '3px',
                  background: '#fff',
                  boxSizing: 'border-box',
                }}
                placeholder="Your name"
              />
            </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '12px', fontWeight: 600, color: '#555' }}>
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    fontSize: '13px',
                    border: '1px solid rgba(0, 0, 0, 0.2)',
                    borderRadius: '3px',
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '12px', fontWeight: 600, color: '#555' }}>
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  required
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    fontSize: '13px',
                    border: '1px solid rgba(0, 0, 0, 0.2)',
                    borderRadius: '3px',
                    background: '#fff',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                  placeholder="Describe your artwork request in detail..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '0.6rem 1.25rem',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#fff',
                  background: isSubmitting ? '#999' : '#000',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) e.currentTarget.style.background = '#333';
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) e.currentTarget.style.background = '#000';
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Requests Modal (Admin only) */}
      <RequestsModal
        isOpen={isRequestsVisible}
        onClose={() => setIsRequestsVisible(false)}
      />

      {/* User Requests Modal */}
      <UserRequestsModal
        isOpen={isUserRequestsVisible}
        onClose={() => setIsUserRequestsVisible(false)}
        userId={user?.uid}
      />

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
