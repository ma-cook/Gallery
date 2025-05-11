import React, { useCallback } from 'react';
import useStore from './store';
import {
  saveOrbColor,
  saveTitleOrbColor,
  saveTextColor,
} from './firebaseFunctions';

function SettingsModal({
  isOpen,
  onClose,
  onColorChange,
  onGlowColorChange,
  onTitleOrbChange,
  onTextColorChange,
}) {
  const backgroundColor = useStore((state) => state.backgroundColor);
  const glowColor = useStore((state) => state.glowColor);
  const titleOrbColor = useStore((state) => state.titleOrbColor);
  const textColor = useStore((state) => state.textColor);

  const handleColorChange = useCallback(
    (event) => {
      const newColor = event.target.value;
      onColorChange(newColor);
    },
    [onColorChange]
  );

  const handleGlowColorChange = useCallback(
    async (event) => {
      const newGlowColor = event.target.value;
      await saveOrbColor(newGlowColor);
      onGlowColorChange(newGlowColor);
    },
    [onGlowColorChange]
  );

  const handleTitleOrbChange = useCallback(
    async (event) => {
      const newTitleOrbColor = event.target.value;
      await saveTitleOrbColor(newTitleOrbColor);
      onTitleOrbChange(newTitleOrbColor);
    },
    [onTitleOrbChange]
  );

  const handleTextColorChange = useCallback(
    async (event) => {
      const newTextColor = event.target.value;
      await saveTextColor(newTextColor);
      onTextColorChange(newTextColor);
    },
    [onTextColorChange]
  );

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '20%',
        left: '20%',
        background: 'black',
        padding: '20px',
        zIndex: 2,
        borderRadius: '5px',
      }}
    >
      <h2>Settings</h2>
      <label>
        Background and Fog Color:
        <input
          type="color"
          value={backgroundColor}
          onChange={handleColorChange}
        />
      </label>
      <label>
        Orb Lights:
        <input
          type="color"
          value={glowColor}
          onChange={handleGlowColorChange}
        />
      </label>
      <label>
        Title Orb Lights:
        <input
          type="color"
          value={titleOrbColor}
          onChange={handleTitleOrbChange}
        />
      </label>
      <label>
        Text Color:
        <input
          type="color"
          value={textColor}
          onChange={handleTextColorChange}
        />
      </label>
      <button onClick={onClose}>Close</button>
    </div>
  );
}

export default SettingsModal;
