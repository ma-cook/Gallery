import React, { forwardRef, useRef, useEffect, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

const ImagePlane = forwardRef(({ index, position, onClick, images }, ref) => {
  const texture = useLoader(TextureLoader, images[index]);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.flipY = false;
  const meshRef = useRef();
  const [boxDimensions, setBoxDimensions] = useState([1, 1]);

  useEffect(() => {
    if (
      texture.image &&
      texture.image.naturalWidth &&
      texture.image.naturalHeight
    ) {
      const maxWidth = 10;
      const aspectRatio =
        texture.image.naturalWidth / texture.image.naturalHeight;

      let newWidth, newHeight;
      if (texture.image.naturalWidth > texture.image.naturalHeight) {
        newWidth = maxWidth;
        newHeight = maxWidth / aspectRatio;
      } else {
        newHeight = maxWidth;
        newWidth = maxWidth * aspectRatio;
      }

      newWidth = Math.round(newWidth);
      newHeight = Math.round(newHeight);

      setBoxDimensions([newWidth, newHeight]);
    }
  }, [texture]);

  const boxDepth = 0.05;

  const materials = [
    new THREE.MeshBasicMaterial({ color: 'black' }),
    new THREE.MeshBasicMaterial({ color: 'black' }),
    new THREE.MeshBasicMaterial({ color: 'black' }),
    new THREE.MeshBasicMaterial({ color: 'black' }),
    new THREE.MeshPhongMaterial({ map: texture }),
    new THREE.MeshPhongMaterial({ map: texture }),
  ];

  useFrame(({ camera }) => {
    if (meshRef.current) {
      const direction = new THREE.Vector3()
        .subVectors(meshRef.current.position, camera.position)
        .normalize();
      meshRef.current.lookAt(camera.position);
      meshRef.current.rotation.z += Math.PI;
    }
  });

  return (
    <mesh
      position={position}
      ref={ref || meshRef}
      castShadow
      material={materials}
      userData={{ index }} // Use index instead of url
      onClick={onClick}
    >
      <boxGeometry attach="geometry" args={[...boxDimensions, boxDepth]} />
    </mesh>
  );
});

export default ImagePlane;
