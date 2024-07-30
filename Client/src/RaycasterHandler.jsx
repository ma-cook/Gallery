import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

function RaycasterHandler({ images, handleImageClick }) {
  const { camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  const handleMouseMove = (event) => {
    mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
  };

  const handleMouseClick = (event) => {
    raycaster.current.setFromCamera(mouse.current, camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      // Sort intersects by distance
      intersects.sort((a, b) => a.distance - b.distance);

      // Find the closest intersected object that has userData.url
      const intersectedObject = intersects.find(
        (intersect) => intersect.object.userData.url
      );

      if (intersectedObject) {
        const index = images.findIndex(
          (url) => intersectedObject.object.userData.url === url
        );
        if (index !== -1) {
          handleImageClick(index);
          event.stopPropagation(); // Stop the event propagation
        }
      }
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
