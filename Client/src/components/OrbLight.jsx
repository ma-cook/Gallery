import React, { useMemo } from 'react';
import * as THREE from 'three';
import FakeGlowMaterial from './FakeGlowMaterial';

const OrbLight = ({ glowColor, onOrbClick }) => {
  // Memoize geometry and material to reuse them
  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(4, 16, 32), []);
  const meshMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 'white',
        opacity: 0.6,
        transparent: true,
      }),
    []
  );

  const positions = useMemo(
    () => [
      [0, 0, 0],
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
            onClick={(e) => {
              e.stopPropagation();
              if (onOrbClick) {
                onOrbClick(position);
              }
            }}
          >
            <FakeGlowMaterial glowColor={glowColor} />
          </mesh>
        </group>
      ))}
    </React.Fragment>
  );
};

export default React.memo(OrbLight);
