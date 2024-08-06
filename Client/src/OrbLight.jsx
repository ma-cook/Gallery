// OrbLight.jsx
import React from 'react';
import * as THREE from 'three';
import FakeGlowMaterial from './FakeGlowMaterial';

const OrbLight = () => {
  return (
    <>
      <group>
        <mesh position={[-40, 0, 0]}>
          <sphereGeometry attach="geometry" args={[2, 16, 32]} />
          <meshBasicMaterial
            attach="material"
            color={'white'}
            roughness={1}
            metalness={0}
            intensity={1.2}
            opacity={0.6}
            transparent={true}
          />
          <pointLight
            distance={200}
            decay={1}
            position={[0, 0, 0]}
            color="#fff4d2"
            skyColor="#fff4d2"
            groundColor="#fff4d2"
            intensity={25}
          />
          <FakeGlowMaterial glowColor="#fff4d2" />
        </mesh>
      </group>
      <group>
        <mesh position={[0, 0, 40]}>
          <sphereGeometry attach="geometry" args={[2, 16, 32]} />
          <meshBasicMaterial
            attach="material"
            color={'white'}
            roughness={1}
            metalness={0}
            intensity={1.2}
            opacity={0.6}
            transparent={true}
          />
          <pointLight
            distance={200}
            decay={1}
            position={[0, 0, 0]}
            color="#fff4d2"
            skyColor="#fff4d2"
            groundColor="#fff4d2"
            intensity={25}
          />
          <FakeGlowMaterial glowColor="#fff4d2" />
        </mesh>
      </group>

      <group>
        <mesh position={[40, 0, 0]}>
          <sphereGeometry attach="geometry" args={[2, 16, 32]} />
          <meshBasicMaterial
            attach="material"
            color={'white'}
            roughness={1}
            metalness={0}
            intensity={1.2}
            opacity={0.6}
            transparent={true}
          />
          <pointLight
            distance={200}
            decay={1}
            position={[0, 0, 0]}
            color="#fff4d2"
            skyColor="#fff4d2"
            groundColor="#fff4d2"
            intensity={25}
          />
          <FakeGlowMaterial glowColor="#fff4d2" />
        </mesh>
      </group>
      <group>
        <mesh position={[0, 0, -40]}>
          <sphereGeometry attach="geometry" args={[2, 16, 32]} />
          <meshBasicMaterial
            attach="material"
            color={'white'}
            roughness={1}
            metalness={0}
            intensity={1.2}
            opacity={0.6}
            transparent={true}
          />
          <pointLight
            distance={200}
            decay={1}
            position={[0, 0, 0]}
            color="#fff4d2"
            skyColor="#fff4d2"
            groundColor="#fff4d2"
            intensity={25}
          />
          <FakeGlowMaterial glowColor="#fff4d2" />
        </mesh>
      </group>
    </>
  );
};

export default OrbLight;
