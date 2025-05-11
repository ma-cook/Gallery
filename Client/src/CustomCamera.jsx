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
      console.log('CustomCamera: New target position received', targetPosition);
      // Copy the target position to our ref
      targetRef.current.copy(targetPosition);
      // Set moving flag to true to start camera animation
      isMovingRef.current = true;
      // Reset animation timing
      startTimeRef.current = 0;
    }
  }, [targetPosition]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  }, []);
  // Cache vectors to avoid creating new ones each frame
  const directionVector = useRef(new THREE.Vector3());
  const adjustedPositionVector = useRef(new THREE.Vector3());

  // Use a timestamp to control animation timing
  const startTimeRef = useRef(0);
  const animationDurationRef = useRef(800); // milliseconds

  useFrame((state) => {
    if (isMovingRef.current) {
      // Initialize animation start time if needed
      if (startTimeRef.current === 0) {
        startTimeRef.current = state.clock.elapsedTime * 1000;
      }

      // Calculate elapsed time for animation
      const elapsedTime = state.clock.elapsedTime * 1000 - startTimeRef.current;
      const progress = Math.min(elapsedTime / animationDurationRef.current, 1);
      const easeProgress = easeOutCubic(progress); // Smooth easing function

      const offset = 8; // Distance to offset the camera
      directionVector.current
        .subVectors(camera.position, targetRef.current)
        .normalize();
      adjustedPositionVector.current.addVectors(
        targetRef.current,
        directionVector.current.multiplyScalar(offset)
      );

      // Use easing function for smoother movement
      cameraRef.current.position.lerp(
        adjustedPositionVector.current,
        0.05 + easeProgress * 0.2
      );

      // Stop moving if the animation is complete
      if (progress >= 1) {
        isMovingRef.current = false;
        startTimeRef.current = 0; // Reset for next animation
      }
    } else {
      // Only update controls target when not in animated movement
      controlsRef.current.target.lerp(targetRef.current, 0.1);
      controlsRef.current.update();
    }

    // Always look at the target position
    cameraRef.current.lookAt(targetRef.current);

    // Apply constraints with smoothing
    const { x, y, z } = cameraRef.current.position;
    const constrainedX = Math.max(-planeWidth / 2, Math.min(planeWidth / 2, x));
    const constrainedY = Math.max(minYPosition, y);
    const constrainedZ = Math.max(
      -planeHeight / 2,
      Math.min(planeHeight / 2, z)
    );

    // Apply constraints with smoothing
    cameraRef.current.position.x +=
      (constrainedX - cameraRef.current.position.x) * 0.1;
    cameraRef.current.position.y +=
      (constrainedY - cameraRef.current.position.y) * 0.1;
    cameraRef.current.position.z +=
      (constrainedZ - cameraRef.current.position.z) * 0.1;
  });

  // Easing function for smoother animations
  const easeOutCubic = (x) => {
    return 1 - Math.pow(1 - x, 3);
  };

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
        dampingFactor={0.1} // Increased from 0.05 for smoother motion
        rotateSpeed={0.5} // Reduced from default 1.0 for smoother rotation
        zoomSpeed={0.8} // Slightly reduced for better control
        maxDistance={150}
        // Add performance optimizations
        maxPolarAngle={Math.PI / 1.75} // Limit rotation to avoid rendering unnecessary areas
        minPolarAngle={Math.PI / 8} // Prevent going too high up
      />
    </>
  );
};

export default memo(CustomCamera);
