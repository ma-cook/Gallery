import React, { useEffect, useRef, memo } from 'react';
import { useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { OrbitControls } from '@react-three/drei';

const CustomCamera = () => {
  // Update the camera's position and lookAt when vec or lookAt changes

  return (
    <PerspectiveCamera
      defaultCamera={true}
      fov={70}
      near={0.1}
      far={5000}
      position={[100, 100, 100]}
    >
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        enableDamping={true} // Add this line
        dampingFactor={1} // Add this line
        staticMoving={true} // Add this line
      />
    </PerspectiveCamera>
  );
};

export default memo(CustomCamera);
