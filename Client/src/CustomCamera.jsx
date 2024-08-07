import React, { useEffect, useRef, memo, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const CustomCamera = ({ targetPosition }) => {
  const { camera, gl } = useThree();
  const cameraRef = useRef();
  const controlsRef = useRef();
  const targetRef = useRef(new THREE.Vector3());
  const isMovingRef = useRef(false);

  const planeWidth = 1200;
  const planeHeight = 1200;
  const planeYPosition = -50;
  const minYPosition = planeYPosition + 2; // 2 units above the whitePlane

  useEffect(() => {
    if (targetPosition) {
      targetRef.current.copy(targetPosition);
      isMovingRef.current = true;
    }
  }, [targetPosition]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  }, []);

  useFrame(() => {
    if (isMovingRef.current) {
      const offset = 8; // Distance to offset the camera
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
    controlsRef.current.target.copy(targetRef.current);
    controlsRef.current.update();

    // Constrain the camera position within the bounds of the WhitePlane
    const { x, y, z } = cameraRef.current.position;
    cameraRef.current.position.set(
      Math.max(-planeWidth / 2, Math.min(planeWidth / 2, x)),
      Math.max(minYPosition, y),
      Math.max(-planeHeight / 2, Math.min(planeHeight / 2, z))
    );
  });

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        fov={70}
        near={0.1}
        far={5000}
        position={[20, 20, 130]}
        aspect={window.innerWidth / window.innerHeight}
      />
      <OrbitControls
        ref={controlsRef}
        args={[cameraRef.current, gl.domElement]}
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        enableDamping={true}
        dampingFactor={0.05}
        maxDistance={150}
      />
    </>
  );
};

export default memo(CustomCamera);
