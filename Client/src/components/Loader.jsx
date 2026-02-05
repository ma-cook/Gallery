import React from 'react';
import { useLoading } from './LoadingManager';

function Loader() {
  const { progress, active } = useLoading();

  if (!active || progress >= 100) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '15px 25px',
        borderRadius: '10px',
        textAlign: 'center',
        fontSize: '1em',
        fontWeight: 'bold',
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      {Math.round(progress)}% loaded
    </div>
  );
}

export default Loader;
