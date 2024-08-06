import React from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';

function WhitePlane() {
  const planeWidth = 1200;
  const planeHeight = 1200;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -40, 0]}>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <MeshReflectorMaterial
        resolution={1024}
        mirror={0.95}
        mixBlur={0.1}
        mixStrength={4}
        depthScale={10} // Decreased depthScale
        minDepthThreshold={0.2} // Adjusted minDepthThreshold
        maxDepthThreshold={1.2} // Adjusted maxDepthThreshold
        depthToBlurRatioBias={0}
        reflectorOffset={0.1} // Decreased reflectorOffset
        color="white"
        metalness={0.9}
        roughness={0}
      />
    </mesh>
  );
}

export default WhitePlane;
