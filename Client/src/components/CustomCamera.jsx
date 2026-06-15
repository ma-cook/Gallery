import React, { useEffect, useRef, memo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { textureLoadQueue, thumbnailLoadQueue } from '../utils/TextureLoadQueue';

const CustomCamera = forwardRef(({ targetPosition, cameraOffset = 8, scrollProgress = 0, scrollYRange = { min: 0, max: 20 }, sphereTransition = 0 }, ref) => {
  const { camera, gl } = useThree();
  const cameraRef = useRef();
  const controlsRef = useRef();
  const planeWidth = 1200;
  const planeHeight = 1200;
  const planeYPosition = -50;
  const minYPosition = planeYPosition + 2; // 2 units above the whitePlane
  const CAMERA_DISTANCE = 100;
  const FAR_DISTANCE = 120;
  const SCREEN_Y_OFFSET = 50; // Camera looks this far below images, pushing them toward top of screen
  const initialTargetY = Math.max(minYPosition, scrollYRange.max + (scrollYRange.min - scrollYRange.max) * scrollProgress - SCREEN_Y_OFFSET);
  const targetRef = useRef(new THREE.Vector3(0, initialTargetY, 0));
  const isMovingRef = useRef(false);
  
  // Track camera velocity for adaptive performance
  const lastPosition = useRef(new THREE.Vector3());
  const velocity = useRef(0);
  const VELOCITY_THRESHOLD = 0.5; // Threshold for "rapid" movement
  const movingFrameCount = useRef(0);
  const MOVING_FRAME_THRESHOLD = 3; // Require 3 consecutive frames above threshold
  const stoppedFrameCount = useRef(0);
  const STOPPED_FRAME_THRESHOLD = 10; // Require 10 consecutive frames below threshold
  
  // Expose isMoving state to parent components
  useImperativeHandle(ref, () => ({
    get isMoving() {
      return isMovingRef.current;
    },
    get velocity() {
      return velocity.current;
    },
  }));

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
      controlsRef.current.target.set(0, initialTargetY, 0);
      controlsRef.current.update();
    }
  }, []);
  // Cache vectors to avoid creating new ones each frame
  const directionVector = useRef(new THREE.Vector3());
  const adjustedPositionVector = useRef(new THREE.Vector3());

  // Use a timestamp to control animation timing
  const startTimeRef = useRef(0);
  const animationDurationRef = useRef(600); // milliseconds (was 800)
  const constraintFrameCounter = useRef(0);

  // Scroll-based vertical camera movement
  const scrollYTarget = useRef(initialTargetY + SCREEN_Y_OFFSET);
  const scrollCamPos = useRef(new THREE.Vector3().set(0, initialTargetY, CAMERA_DISTANCE));

  useFrame((state) => {
    // Calculate camera velocity
    const currentPosition = cameraRef.current.position;
    velocity.current = currentPosition.distanceTo(lastPosition.current);
    lastPosition.current.copy(currentPosition);
    
    // Debounced camera movement detection to avoid false positives
    // Require sustained movement or click animation
    if (isMovingRef.current) {
      // During click animation, always consider as moving
      textureLoadQueue.setCameraMoving(true);
      thumbnailLoadQueue.setCameraMoving(true);
      movingFrameCount.current = MOVING_FRAME_THRESHOLD;
      stoppedFrameCount.current = 0;
    } else if (velocity.current > VELOCITY_THRESHOLD) {
      // Camera is moving fast
      movingFrameCount.current++;
      stoppedFrameCount.current = 0;
      
      if (movingFrameCount.current >= MOVING_FRAME_THRESHOLD) {
        textureLoadQueue.setCameraMoving(true);
        thumbnailLoadQueue.setCameraMoving(true);
      }
    } else {
      // Camera is slow or stopped
      movingFrameCount.current = 0;
      stoppedFrameCount.current++;
      
      if (stoppedFrameCount.current >= STOPPED_FRAME_THRESHOLD) {
        textureLoadQueue.setCameraMoving(false);
        thumbnailLoadQueue.setCameraMoving(false);
      }
    }
    
    if (isMovingRef.current) {
      // Initialize animation start time if needed
      if (startTimeRef.current === 0) {
        startTimeRef.current = state.clock.elapsedTime * 1000;
      }

      // Calculate elapsed time for animation
      const elapsedTime = state.clock.elapsedTime * 1000 - startTimeRef.current;
      const progress = Math.min(elapsedTime / animationDurationRef.current, 1);
      const easeProgress = easeOutCubic(progress); // Smooth easing function

      directionVector.current
        .subVectors(camera.position, targetRef.current)
        .normalize();
      adjustedPositionVector.current.addVectors(
        targetRef.current,
        directionVector.current.multiplyScalar(cameraOffset)
      );

      // Use easing function for smoother movement
      cameraRef.current.position.lerp(
        adjustedPositionVector.current,
        0.08 + easeProgress * 0.25 // Increased responsiveness (was 0.05 + easeProgress * 0.2)
      );

      // Face the clicked image during click animation
      cameraRef.current.lookAt(targetRef.current);

      // Stop moving if the animation is complete
      if (progress >= 1) {
        isMovingRef.current = false;
        startTimeRef.current = 0; // Reset for next animation
      }
    } else {
      // Scroll-based vertical movement with sphere transition
      const { min: scrollMin, max: scrollMax } = scrollYRange;

      // Y position: column scroll, blended toward center (0) as sphere transition progresses
      const columnY = scrollMax + (scrollMin - scrollMax) * scrollProgress;
      const targetY = columnY * (1 - sphereTransition);

      // Distance: CAMERA_DISTANCE in column view, FAR_DISTANCE in sphere view
      const targetDistance = CAMERA_DISTANCE + (FAR_DISTANCE - CAMERA_DISTANCE) * sphereTransition;

      scrollYTarget.current += (targetY - scrollYTarget.current) * 0.06;

      // Blend offset: full in column view, none in sphere view
      const offset = SCREEN_Y_OFFSET * (1 - sphereTransition);

      // Clamp target to stay above the ground plane constraint
      const clampedY = Math.max(minYPosition, scrollYTarget.current - offset);

      // Move the camera target (lookAt point) vertically
      targetRef.current.set(0, clampedY, 0);

      // Move camera position directly (scrollYTarget provides smoothing)
      scrollCamPos.current.set(0, clampedY, targetDistance);
      cameraRef.current.position.copy(scrollCamPos.current);

      // Keep camera level during scroll to prevent tilt from position lag
      cameraRef.current.lookAt(0, cameraRef.current.position.y, 0);

      // Sync OrbitControls target without calling update() to avoid damping jitter
      controlsRef.current.target.copy(targetRef.current);
    }

    // Apply constraints with smoothing, but only every 3 frames for better performance
    constraintFrameCounter.current++;
    if (constraintFrameCounter.current % 3 === 0) { // Apply constraints every 3rd frame
      const { x, y, z } = cameraRef.current.position;
      const constrainedX = Math.max(-planeWidth / 2, Math.min(planeWidth / 2, x));
      const constrainedY = Math.max(minYPosition, y);
      const constrainedZ = Math.max(
        -planeHeight / 2,
        Math.min(planeHeight / 2, z)
      );

      // Apply constraints with smoothing
      cameraRef.current.position.x +=
        (constrainedX - cameraRef.current.position.x) * 0.15;
      cameraRef.current.position.y +=
        (constrainedY - cameraRef.current.position.y) * 0.15;
      cameraRef.current.position.z +=
        (constrainedZ - cameraRef.current.position.z) * 0.15;
    }
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
        position={[0, initialTargetY, CAMERA_DISTANCE]}
        aspect={window.innerWidth / window.innerHeight}
      />
      <OrbitControls
        ref={controlsRef}
        args={[cameraRef.current, gl.domElement]}
        enableZoom={false}
        enablePan={true}
        enableRotate={true}
        enableDamping={true}
        dampingFactor={0.05} // Reduced for more responsive control (was 0.1)
        rotateSpeed={0.5}
        // Add performance optimizations
        maxPolarAngle={Math.PI / 1.75} // Limit rotation to avoid rendering unnecessary areas
        minPolarAngle={Math.PI / 8} // Prevent going too high up
      />
    </>
  );
});

export default memo(CustomCamera);
