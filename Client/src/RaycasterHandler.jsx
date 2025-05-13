import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { debounce } from 'lodash';

const RaycasterHandler = ({ imagesPositions, handleImageClick }) => {
  const { camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const [isMoving, setIsMoving] = useState(false);
  // Use a lighter throttle instead of a full debounce for more responsive movement
  const handleMouseMove = useCallback(
    debounce((event) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }, 33), // 30fps update rate for mouse position
    []
  );

  // Use a cache for raycast results
  const lastClickTime = useRef(0);
  const CLICK_THRESHOLD = 300; // ms between clicks to prevent double clicks
  const handleMouseClick = useCallback(
    (event) => {
      // Prevent rapid consecutive clicks
      const now = performance.now();
      if (now - lastClickTime.current < CLICK_THRESHOLD) {
        return;
      }
      lastClickTime.current = now;

      if (isMoving) return; // Ignore clicks while the camera is moving

      // Use coarse raycast first with large distance
      raycaster.current.setFromCamera(mouse.current, camera);
      raycaster.current.far = 300; // Limit raycasting distance      // Use recursive raycasting to check all children
      const intersects = raycaster.current.intersectObjects(
        scene.children,
        true // Use true to check descendants (needed to find nested mesh objects)
      );

      if (intersects.length > 0) {
        // Sort intersects by distance
        intersects.sort((a, b) => a.distance - b.distance); // Find the closest intersected object that has userData.originalIndex
        const intersectedObject = intersects.find(
          (intersect) =>
            intersect.object.userData &&
            intersect.object.userData.originalIndex !== undefined
        );

        if (intersectedObject) {
          const index = intersectedObject.object.userData.originalIndex;
          if (index !== undefined) {
            setIsMoving(true); // Set the flag to true when starting the camera movement
            handleImageClick(index);
            event.stopPropagation(); // Stop the event propagation

            // Simulate camera movement completion (replace with actual camera movement logic)
          }
        }
      }
    },
    [camera, handleImageClick, isMoving, scene.children]
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleMouseClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleMouseClick);
    };
  }, [handleMouseMove, handleMouseClick]);

  return null;
};

export default React.memo(RaycasterHandler);
