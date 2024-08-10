import React, { useState } from 'react';
import { saveOrbColor, saveTitleOrbColor } from './firebaseFunctions';

function SettingsModal({
  isOpen,
  onClose,
  onColorChange,
  onGlowColorChange,
  onTitleOrbChange,
}) {
  const [color, setColor] = useState('#ffffff');
  const [glowColor, setGlowColor] = useState('#fff4d2');
  const [titleOrbColor, setTitleOrbColor] = useState('#fff4d2');

  const handleColorChange = (event) => {
    setColor(event.target.value);
    onColorChange(event.target.value);
  };

  const handleGlowColorChange = async (event) => {
    const newGlowColor = event.target.value;
    setGlowColor(newGlowColor);
    await saveOrbColor(newGlowColor); // Save the new glow color to Firebase
    onGlowColorChange(newGlowColor);
  };

  const handleTitleOrb = async (event) => {
    const newTitleOrb = event.target.value;
    setTitleOrbColor(newTitleOrb);
    await saveTitleOrbColor(newTitleOrb); // Save the new glow color to Firebase
    onTitleOrbChange(newTitleOrb);
  };

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
        <input type="color" value={color} onChange={handleColorChange} />
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
        <input type="color" value={titleOrbColor} onChange={handleTitleOrb} />
      </label>

      <button onClick={onClose}>Close</button>
    </div>
  );
}

export default SettingsModal;
