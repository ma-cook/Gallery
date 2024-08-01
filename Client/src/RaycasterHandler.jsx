import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

function RaycasterHandler({ imagesPositions, handleImageClick }) {
  const { camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const [isMoving, setIsMoving] = useState(false);

  const handleMouseMove = (event) => {
    mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
  };

  const handleMouseClick = (event) => {
    if (isMoving) return; // Ignore clicks while the camera is moving

    raycaster.current.setFromCamera(mouse.current, camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      // Sort intersects by distance
      intersects.sort((a, b) => a.distance - b.distance);

      // Find the closest intersected object that has userData.index
      const intersectedObject = intersects.find(
        (intersect) =>
          intersect.object.userData &&
          intersect.object.userData.index !== undefined
      );

      if (intersectedObject) {
        const index = intersectedObject.object.userData.index;
        if (index !== undefined) {
          setIsMoving(true); // Set the flag to true when starting the camera movement
          handleImageClick(index);
          event.stopPropagation(); // Stop the event propagation

          // Simulate camera movement completion (replace with actual camera movement logic)
          setTimeout(() => {
            setIsMoving(false); // Reset the flag once the movement is complete
          }, 1000); // Adjust the timeout duration as needed
        } else {
        }
      } else {
      }
    } else {
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleMouseClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleMouseClick);
    };
  }, []);

  return null;
}

export default RaycasterHandler;
