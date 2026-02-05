import React, { useMemo } from 'react';
import * as THREE from 'three';
import FakeGlowMaterial from './FakeGlowMaterial';

const OrbLight = ({ glowColor }) => {
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

  const lightProps = useMemo(
    () => ({
      distance: 200,
      decay: 0.8,
      position: [0, 0, 0],
      color: glowColor,
      intensity: 25,
    }),
    [glowColor]
  );

  const positions = useMemo(
    () => [
      [-40, 0, 0],
      [0, 0, 40],
      [40, 0, 0],
      [0, 0, -40],
    ],
    []
  );

  return (
    <React.Fragment>
      {positions.map((position, index) => (
        <group key={index}>
          <mesh
            position={position}
            geometry={sphereGeometry}
            material={meshMaterial}
          >
            <pointLight {...lightProps} />
            <FakeGlowMaterial glowColor={glowColor} />
          </mesh>
        </group>
      ))}
    </React.Fragment>
  );
};

export default React.memo(OrbLight);
