import React from 'react';
import { Html } from '@react-three/drei';
import { useLoading } from './LoadingManager';

function Loader() {
  const { progress, active } = useLoading();

  return (
    <Html center>
      <div
        style={{
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '20px 30px',
          borderRadius: '10px',
          textAlign: 'center',
          fontSize: '1.2em',
          fontWeight: 'bold',
        }}
      >
        {Math.round(progress)}% loaded
      </div>
    </Html>
  );
}

export default Loader;
