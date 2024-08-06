import React, { useMemo } from 'react';
import * as THREE from 'three';
import FakeGlowMaterial from './FakeGlowMaterial';

const OrbLight = () => {
  // Memoize geometry and material to reuse them
  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(2, 16, 32), []);
  const meshMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 'white',

        opacity: 0.6,
        transparent: true,
      }),
    []
  );

  const lightProps = {
    distance: 200,
    decay: 1,
    position: [0, 0, 0],
    color: '#fff4d2',
    intensity: 25,
  };

  const positions = [
    [-40, 0, 0],
    [0, 0, 40],
    [40, 0, 0],
    [0, 0, -40],
  ];

  return (
    <>
      {positions.map((position, index) => (
        <group key={index}>
          <mesh
            position={position}
            geometry={sphereGeometry}
            material={meshMaterial}
          >
            <pointLight {...lightProps} />
            <FakeGlowMaterial glowColor="#fff4d2" />
          </mesh>
        </group>
      ))}
    </>
  );
};

export default React.memo(OrbLight);
