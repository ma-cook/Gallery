// AuthModal.jsx
import React, { useState } from 'react';

function AuthModal({ isOpen, onClose, onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSignIn(email, password);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'black',
        padding: '20px',
        zIndex: 100,
        borderRadius: '5px',
      }}
    >
      <form onSubmit={handleSubmit}>
        <div>
          <label style={{ color: 'white' }}>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label style={{ color: 'white' }}>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Sign In</button>
        <button onClick={onClose} type="button">
          Cancel
        </button>
      </form>
    </div>
  );
}

export default AuthModal;
