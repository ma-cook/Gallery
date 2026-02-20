import React, { useCallback, useState, useEffect } from 'react';
import useStore from '../store';
import AlertDialog from './AlertDialog';
import {
  saveOrbColor,
  saveTextColor,
  saveTitleColor,
  saveButtonPrimaryColor,
  saveButtonSecondaryColor,
  saveBackgroundBlurriness,
  saveBackgroundIntensity,
  handleHdrFileUpload,
  saveSocialLinks,
} from '../utils/firebaseFunctions';

function SettingsModal({
  isOpen,
  onClose,
  onGlowColorChange,
  onTextColorChange,
  onTitleColorChange,
  onButtonPrimaryColorChange,
  onButtonSecondaryColorChange,
  onBackgroundBlurrinessChange,
  onBackgroundIntensityChange,
  onHdrFileUrlChange,
  user,
  isAdmin,
}) {
  const glowColor = useStore((state) => state.glowColor);
  const textColor = useStore((state) => state.textColor);
  const titleColor = useStore((state) => state.titleColor);
  const buttonPrimaryColor = useStore((state) => state.buttonPrimaryColor);
  const buttonSecondaryColor = useStore((state) => state.buttonSecondaryColor);
  const backgroundBlurriness = useStore((state) => state.backgroundBlurriness);
  const backgroundIntensity = useStore((state) => state.backgroundIntensity);
  const socialLinks = useStore((state) => state.socialLinks);
  const setSocialLinks = useStore((state) => state.setSocialLinks);
  const [isUploadingHdr, setIsUploadingHdr] = useState(false);
  const [alertDialog, setAlertDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [newLink, setNewLink] = useState({ platform: 'x', url: '' });
  const [editingLinks, setEditingLinks] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // Initialize editingLinks from socialLinks only when modal opens
  useEffect(() => {
    if (isOpen) {
      setEditingLinks([...socialLinks]);
    }
  }, [isOpen]);

  const handleGlowColorChange = useCallback(
    async (event) => {
      const newGlowColor = event.target.value;
      await saveOrbColor(newGlowColor);
      onGlowColorChange(newGlowColor);
    },
    [onGlowColorChange]
  );

  const handleTextColorChange = useCallback(
    async (event) => {
      const newTextColor = event.target.value;
      await saveTextColor(newTextColor);
      onTextColorChange(newTextColor);
    },
    [onTextColorChange]
  );

  const handleTitleColorChange = useCallback(
    async (event) => {
      const newTitleColor = event.target.value;
      await saveTitleColor(newTitleColor);
      onTitleColorChange(newTitleColor);
    },
    [onTitleColorChange]
  );

  const handleButtonPrimaryColorChange = useCallback(
    async (event) => {
      const newButtonPrimaryColor = event.target.value;
      await saveButtonPrimaryColor(newButtonPrimaryColor);
      onButtonPrimaryColorChange(newButtonPrimaryColor);
    },
    [onButtonPrimaryColorChange]
  );

  const handleButtonSecondaryColorChange = useCallback(
    async (event) => {
      const newButtonSecondaryColor = event.target.value;
      await saveButtonSecondaryColor(newButtonSecondaryColor);
      onButtonSecondaryColorChange(newButtonSecondaryColor);
    },
    [onButtonSecondaryColorChange]
  );

  const handleBackgroundBlurrinessChange = useCallback(
    async (event) => {
      const newBlurriness = parseFloat(event.target.value);
      await saveBackgroundBlurriness(newBlurriness);
      onBackgroundBlurrinessChange(newBlurriness);
    },
    [onBackgroundBlurrinessChange]
  );

  const handleBackgroundIntensityChange = useCallback(
    async (event) => {
      const newIntensity = parseFloat(event.target.value);
      await saveBackgroundIntensity(newIntensity);
      onBackgroundIntensityChange(newIntensity);
    },
    [onBackgroundIntensityChange]
  );

  const handleHdrUpload = useCallback(
    async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      // Validate file type
      if (!file.name.toLowerCase().endsWith('.hdr')) {
        setAlertDialog({
          isOpen: true,
          title: 'Invalid File',
          message: 'Please select a valid .hdr file',
          type: 'error'
        });
        return;
      }

      try {
        setIsUploadingHdr(true);
        const url = await handleHdrFileUpload(file);
        onHdrFileUrlChange(url);
      } catch (error) {
        console.error('Error uploading HDR file:', error);
        setAlertDialog({
          isOpen: true,
          title: 'Upload Failed',
          message: 'Failed to upload HDR file. Please try again.',
          type: 'error'
        });
      } finally {
        setIsUploadingHdr(false);
      }
    },
    [onHdrFileUrlChange]
  );

  const handleAddLink = async () => {
    if (!newLink.url.trim()) {
      setAlertDialog({
        isOpen: true,
        title: 'Invalid URL',
        message: 'Please enter a valid URL',
        type: 'error'
      });
      return;
    }
    const updatedLinks = [...editingLinks, { ...newLink, id: Date.now() }];
    try {
      await saveSocialLinks(updatedLinks);
      setSocialLinks(updatedLinks);
      setEditingLinks(updatedLinks);
      setNewLink({ platform: 'x', url: '' });
      setShowAddForm(false);
      setAlertDialog({
        isOpen: true,
        title: 'Success',
        message: 'Social link added successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving social link:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to save social link',
        type: 'error'
      });
    }
  };

  const handleRemoveLink = async (id) => {
    const updatedLinks = editingLinks.filter(link => link.id !== id);
    try {
      await saveSocialLinks(updatedLinks);
      setSocialLinks(updatedLinks);
      setEditingLinks(updatedLinks);
      setAlertDialog({
        isOpen: true,
        title: 'Success',
        message: 'Social link removed successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error removing social link:', error);
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: 'Failed to remove social link',
        type: 'error'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '640px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        background: '#fff',
        borderRadius: '12px',
        padding: 0,
        zIndex: 1001,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 20px',
        borderBottom: '1px solid #eee',
        flexShrink: 0,
      }}>
        <h2
          style={{
            margin: 0,
            color: '#111',
            fontSize: '15px',
            fontWeight: 700,
          }}
        >
          Appearance Settings
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
            padding: '4px',
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '20px', overflowY: 'auto', flex: 1 }}>
        {/* Left Column - Appearance Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 600,
              color: '#999',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Orb Light Color
          </label>
          <input
            type="color"
            value={glowColor}
            onChange={handleGlowColorChange}
            style={{
              width: '100%',
              height: '40px',
              border: '1px solid #eee',
              borderRadius: '8px',
              cursor: 'pointer',
              padding: '2px',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 600,
              color: '#999',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            UI Text Color
          </label>
          <input
            type="color"
            value={textColor}
            onChange={handleTextColorChange}
            style={{
              width: '100%',
              height: '40px',
              border: '1px solid #eee',
              borderRadius: '8px',
              cursor: 'pointer',
              padding: '2px',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 600,
              color: '#999',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Title Color
          </label>
          <input
            type="color"
            value={titleColor}
            onChange={handleTitleColorChange}
            style={{
              width: '100%',
              height: '40px',
              border: '1px solid #eee',
              borderRadius: '8px',
              cursor: 'pointer',
              padding: '2px',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 600,
              color: '#999',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Button Primary (Icon & Border)
          </label>
          <input
            type="color"
            value={buttonPrimaryColor}
            onChange={handleButtonPrimaryColorChange}
            style={{
              width: '100%',
              height: '40px',
              border: '1px solid #eee',
              borderRadius: '8px',
              cursor: 'pointer',
              padding: '2px',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 600,
              color: '#999',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Button Secondary (Background)
          </label>
          <input
            type="color"
            value={buttonSecondaryColor}
            onChange={handleButtonSecondaryColorChange}
            style={{
              width: '100%',
              height: '40px',
              border: '1px solid #eee',
              borderRadius: '8px',
              cursor: 'pointer',
              padding: '2px',
            }}
          />
        </div>

        <div style={{ borderTop: '1px solid #eee', paddingTop: '14px', marginTop: '4px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 600,
              color: '#999',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Background Blurriness: {backgroundBlurriness.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={backgroundBlurriness}
            onChange={handleBackgroundBlurrinessChange}
            style={{
              width: '100%',
              cursor: 'pointer',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 600,
              color: '#999',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Background Intensity: {backgroundIntensity.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.01"
            value={backgroundIntensity}
            onChange={handleBackgroundIntensityChange}
            style={{
              width: '100%',
              cursor: 'pointer',
            }}
          />
        </div>

        {isAdmin && (
          <div style={{ borderTop: '1px solid #eee', paddingTop: '14px', marginTop: '4px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '10px',
                fontWeight: 600,
                color: '#999',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Environment HDR File
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="file"
                accept=".hdr"
                onChange={handleHdrUpload}
                disabled={isUploadingHdr}
                style={{
                  display: 'none',
                }}
                id="hdr-upload-input"
              />
              <label
                htmlFor="hdr-upload-input"
                style={{
                  display: 'inline-block',
                  padding: '9px 16px',
                  backgroundColor: isUploadingHdr ? '#ccc' : '#111',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: isUploadingHdr ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  transition: 'background-color 0.15s',
                  textAlign: 'center',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  if (!isUploadingHdr) e.currentTarget.style.backgroundColor = '#333';
                }}
                onMouseLeave={(e) => {
                  if (!isUploadingHdr) e.currentTarget.style.backgroundColor = '#111';
                }}
              >
                {isUploadingHdr ? 'Uploading...' : 'Upload New HDR File'}
              </label>
            </div>
            <p style={{
              fontSize: '10px',
              color: '#999',
              marginTop: '6px',
              marginBottom: 0,
            }}>
              Only .hdr files are supported.
            </p>
          </div>
        )}
        </div>

        {/* Right Column - Social Links */}
        {isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '12px', 
              fontWeight: 600, 
              color: '#111',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              Social Media Links
            </h3>

            {/* Existing Links List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
              {editingLinks.map((link) => (
                <div 
                  key={link.id}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    padding: '8px 10px',
                    background: '#fafafa',
                    borderRadius: '8px',
                    border: '1px solid #eee',
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#555', minWidth: '70px', textTransform: 'capitalize', fontWeight: 500 }}>
                    {link.platform}
                  </span>
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => {
                      setEditingLinks(editingLinks.map(l => 
                        l.id === link.id ? { ...l, url: e.target.value } : l
                      ));
                    }}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      fontSize: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      background: '#fff',
                    }}
                  />
                  <button
                    onClick={() => handleRemoveLink(link.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#bbb',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '0 4px',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#c00'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#bbb'; }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Link */}
            <div style={{ borderTop: '1px solid #eee', paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#999',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  Add New Link
                </label>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#fff',
                    background: '#111',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    lineHeight: 1,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#333';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#111';
                  }}
                >
                  {showAddForm ? '−' : '+'}
                </button>
              </div>
              {showAddForm && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <select
                  value={newLink.platform}
                  onChange={(e) => setNewLink({ ...newLink, platform: e.target.value })}
                  style={{
                    padding: '8px 10px',
                    fontSize: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    minWidth: '100px',
                    background: '#fafafa',
                  }}
                >
                  <option value="x">X (Twitter)</option>
                  <option value="instagram">Instagram</option>
                  <option value="reddit">Reddit</option>
                  <option value="youtube">YouTube</option>
                  <option value="discord">Discord</option>
                  <option value="email">Email</option>
                </select>
                <input
                  type="text"
                  placeholder="Enter URL or email"
                  value={newLink.url}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleAddLink();
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    background: '#fafafa',
                  }}
                />
                <button
                  onClick={handleAddLink}
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#fff',
                    background: '#2e7d32',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1b5e20';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#2e7d32';
                  }}
                >
                  Save
                </button>
              </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
    </div>
  );
}

export default SettingsModal;
