import React, { useCallback, useState } from 'react';
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
} from '../firebaseFunctions';

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
  const [isUploadingHdr, setIsUploadingHdr] = useState(false);
  const [alertDialog, setAlertDialog] = useState({ isOpen: false, title: '', message: '', type: 'info' });

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

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '26rem',
        maxWidth: '90vw',
        background: 'rgba(255, 255, 255, 0.97)',
        border: '1px solid rgba(0, 0, 0, 0.15)',
        borderRadius: '4px',
        padding: '1.5rem',
        zIndex: 1001,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h2
          style={{
            margin: 0,
            color: '#1a1a1a',
            fontSize: '18px',
            fontWeight: 600,
            letterSpacing: '-0.3px',
          }}
        >
          Appearance Settings
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#4a4a4a',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
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
              height: '48px',
              border: '1px solid rgba(0, 0, 0, 0.15)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#555',
              marginBottom: '0.4rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
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
              border: '1px solid rgba(0, 0, 0, 0.2)',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#555',
              marginBottom: '0.4rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
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
              border: '1px solid rgba(0, 0, 0, 0.2)',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#555',
              marginBottom: '0.4rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
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
              border: '1px solid rgba(0, 0, 0, 0.2)',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#555',
              marginBottom: '0.4rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
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
              border: '1px solid rgba(0, 0, 0, 0.2)',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          />
        </div>

        <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: '#555',
              marginBottom: '0.4rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
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
              fontSize: '11px',
              fontWeight: 600,
              color: '#555',
              marginBottom: '0.4rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
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
          <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                color: '#555',
                marginBottom: '0.6rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
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
                  padding: '10px 16px',
                  backgroundColor: isUploadingHdr ? '#ccc' : '#007BFF',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: isUploadingHdr ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'background-color 0.2s ease',
                  textAlign: 'center',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  if (!isUploadingHdr) e.currentTarget.style.backgroundColor = '#0056b3';
                }}
                onMouseLeave={(e) => {
                  if (!isUploadingHdr) e.currentTarget.style.backgroundColor = '#007BFF';
                }}
              >
                {isUploadingHdr ? 'Uploading...' : 'Upload New HDR File'}
              </label>
            </div>
            <p style={{
              fontSize: '10px',
              color: '#777',
              marginTop: '0.5rem',
              marginBottom: 0,
            }}>
              The HDR file will be used as the environment background. Only .hdr files are supported.
            </p>
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
