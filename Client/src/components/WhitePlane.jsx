import React, { useMemo } from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';

const WhitePlane = React.memo(() => {
  const planeWidth = 3000;
  const planeHeight = 3000;

  const planeGeometry = useMemo(
    () => <planeGeometry args={[planeWidth, planeHeight]} />,
    [planeWidth, planeHeight]
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -40, 0]}>
      {planeGeometry}
      <MeshReflectorMaterial
        resolution={512}
        mirror={0.1}
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
});

export default WhitePlane;
