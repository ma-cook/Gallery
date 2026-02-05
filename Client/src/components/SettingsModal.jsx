import React, { useCallback } from 'react';
import useStore from '../store';
import {
  saveOrbColor,
  saveTextColor,
  saveTitleColor,
  saveButtonPrimaryColor,
  saveButtonSecondaryColor,
} from '../firebaseFunctions';

function SettingsModal({
  isOpen,
  onClose,
  onGlowColorChange,
  onTextColorChange,
  onTitleColorChange,
  onButtonPrimaryColorChange,
  onButtonSecondaryColorChange,
}) {
  const glowColor = useStore((state) => state.glowColor);
  const textColor = useStore((state) => state.textColor);
  const titleColor = useStore((state) => state.titleColor);
  const buttonPrimaryColor = useStore((state) => state.buttonPrimaryColor);
  const buttonSecondaryColor = useStore((state) => state.buttonSecondaryColor);

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
      </div>
    </div>
  );
}

export default SettingsModal;
