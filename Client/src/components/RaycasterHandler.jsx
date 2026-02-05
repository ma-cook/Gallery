import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

const RaycasterHandler = ({ imagesPositions, handleImageClick }) => {
  const { camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const [isMoving, setIsMoving] = useState(false);
  const rafId = useRef(null);
  const needsUpdate = useRef(false);
  const tempMouse = useRef({ x: 0, y: 0 });
  
  // Cache objects with userData.originalIndex for faster raycasting
  const clickableObjects = useRef([]);
  
  // Use requestAnimationFrame for smoother, more efficient mouse tracking
  const handleMouseMove = useCallback((event) => {
    tempMouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    tempMouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    if (!needsUpdate.current) {
      needsUpdate.current = true;
      rafId.current = requestAnimationFrame(() => {
        mouse.current.x = tempMouse.current.x;
        mouse.current.y = tempMouse.current.y;
        needsUpdate.current = false;
      });
    }
  }, []);

  const lastClickTime = useRef(0);
  const CLICK_THRESHOLD = 250; // ms between clicks to prevent double clicks
  
  // Update clickable objects cache when scene changes
  useEffect(() => {
    const updateClickableObjects = () => {
      clickableObjects.current = [];
      scene.traverse((object) => {
        if (object.userData && object.userData.originalIndex !== undefined) {
          clickableObjects.current.push(object);
        }
      });
    };
    
    updateClickableObjects();
    // Re-cache when images change
    const timer = setTimeout(updateClickableObjects, 100);
    return () => clearTimeout(timer);
  }, [scene, imagesPositions]);
  
  const handleMouseClick = useCallback(
    (event) => {
      // Prevent rapid consecutive clicks
      const now = performance.now();
      if (now - lastClickTime.current < CLICK_THRESHOLD) {
        return;
      }
      lastClickTime.current = now;

      if (isMoving) return; // Ignore clicks while the camera is moving

      // Optimize raycaster settings
      raycaster.current.setFromCamera(mouse.current, camera);
      raycaster.current.far = 300; // Limit raycasting distance
      raycaster.current.firstHitOnly = true; // Stop at first hit for better performance
      
      // Use cached clickable objects instead of recursive scene traversal
      const intersects = raycaster.current.intersectObjects(
        clickableObjects.current,
        false // No recursion needed since we already have the objects
      );

      if (intersects.length > 0) {
        // First intersect is closest due to raycaster sorting
        const intersectedObject = intersects[0];
        const index = intersectedObject.object.userData.originalIndex;
        
        if (index !== undefined) {
          setIsMoving(true);
          handleImageClick(index);
          event.stopPropagation();
          
          // Reset moving state after animation completes (600ms from CustomCamera)
          setTimeout(() => {
            setIsMoving(false);
          }, 650);
        }
      }
    },
    [camera, handleImageClick, isMoving]
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('click', handleMouseClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleMouseClick);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [handleMouseMove, handleMouseClick]);

  return null;
};

export default React.memo(RaycasterHandler);
