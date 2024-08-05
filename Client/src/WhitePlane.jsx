import React from 'react';

function WhitePlane() {
  const planeWidth = 1200;
  const planeHeight = 1200;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -50, 0]} receiveShadow>
      <planeGeometry attach="geometry" args={[planeWidth, planeHeight]} />
      <meshStandardMaterial attach="material" color="white" />
    </mesh>
  );
}

export default WhitePlane;
