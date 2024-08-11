import React, { useState, useCallback } from 'react';
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
  const [colors, setColors] = useState({
    color: '#ffffff',
    glowColor: '#fff4d2',
    titleOrbColor: '#fff4d2',
    textColor: '#fff4d2',
  });

  const handleColorChange = useCallback(
    (event) => {
      const newColor = event.target.value;
      setColors((prevColors) => ({ ...prevColors, color: newColor }));
      onColorChange(newColor);
    },
    [onColorChange]
  );

  const handleGlowColorChange = useCallback(
    async (event) => {
      const newGlowColor = event.target.value;
      setColors((prevColors) => ({ ...prevColors, glowColor: newGlowColor }));
      await saveOrbColor(newGlowColor);
      onGlowColorChange(newGlowColor);
    },
    [onGlowColorChange]
  );

  const handleTitleOrbChange = useCallback(
    async (event) => {
      const newTitleOrbColor = event.target.value;
      setColors((prevColors) => ({
        ...prevColors,
        titleOrbColor: newTitleOrbColor,
      }));
      await saveTitleOrbColor(newTitleOrbColor);
      onTitleOrbChange(newTitleOrbColor);
    },
    [onTitleOrbChange]
  );

  const handleTextColorChange = useCallback(
    async (event) => {
      const newTextColor = event.target.value;
      setColors((prevColors) => ({ ...prevColors, textColor: newTextColor }));
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
        <input type="color" value={colors.color} onChange={handleColorChange} />
      </label>
      <label>
        Orb Lights:
        <input
          type="color"
          value={colors.glowColor}
          onChange={handleGlowColorChange}
        />
      </label>
      <label>
        Title Orb Lights:
        <input
          type="color"
          value={colors.titleOrbColor}
          onChange={handleTitleOrbChange}
        />
      </label>
      <label>
        Text Color:
        <input
          type="color"
          value={colors.textColor}
          onChange={handleTextColorChange}
        />
      </label>
      <button onClick={onClose}>Close</button>
    </div>
  );
}

export default SettingsModal;
