import React, { useEffect, useRef, memo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const CustomCamera = ({ targetPosition }) => {
  const { camera } = useThree();
  const cameraRef = useRef();
  const targetRef = useRef(new THREE.Vector3());
  const isMovingRef = useRef(false);

  useEffect(() => {
    if (targetPosition) {
      targetRef.current.copy(targetPosition);
      isMovingRef.current = true;
    }
  }, [targetPosition]);

  useFrame(() => {
    if (isMovingRef.current) {
      const offset = 3; // Distance to offset the camera
      const direction = new THREE.Vector3()
        .subVectors(camera.position, targetRef.current)
        .normalize();
      const adjustedPosition = new THREE.Vector3().addVectors(
        targetRef.current,
        direction.multiplyScalar(offset)
      );

      cameraRef.current.position.lerp(adjustedPosition, 0.8);

      // Stop moving if the camera is close enough to the target position
      if (cameraRef.current.position.distanceTo(adjustedPosition) < 0.1) {
        isMovingRef.current = false;
      }
    }

    // Ensure the camera always looks at the target position
    cameraRef.current.lookAt(targetRef.current);
  });

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        fov={70}
        near={0.1}
        far={5000}
        position={[0, 0, 0]}
        aspect={window.innerWidth / window.innerHeight}
      />
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        enableDamping={true}
        dampingFactor={1}
        staticMoving={true}
      />
    </>
  );
};

export default memo(CustomCamera);
