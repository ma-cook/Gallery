import React, { forwardRef, useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { Html } from '@react-three/drei'; // Import the Html component
import DeleteButton from './DeleteButton'; // Import the DeleteButton component

const ImagePlane = forwardRef(
  ({ index, position, onClick, images, user, onDelete }, ref) => {
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

        setBoxDimensions((prevDimensions) => {
          if (
            prevDimensions[0] !== newWidth ||
            prevDimensions[1] !== newHeight
          ) {
            return [newWidth, newHeight];
          }
          return prevDimensions;
        });
      }
    }, [texture]);

    const boxDepth = 0.05;

    const materials = useMemo(
      () => [
        new THREE.MeshBasicMaterial({ color: 'black' }),
        new THREE.MeshBasicMaterial({ color: 'black' }),
        new THREE.MeshBasicMaterial({ color: 'black' }),
        new THREE.MeshBasicMaterial({ color: 'black' }),
        new THREE.MeshPhongMaterial({ map: texture }),
        new THREE.MeshPhongMaterial({ map: texture }),
      ],
      [texture]
    );

    const direction = useMemo(() => new THREE.Vector3(), []);

    useFrame(({ camera }) => {
      if (meshRef.current) {
        direction
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
        {user && (
          <Html
            position={[
              boxDimensions[0] / 2 - 0.5,
              boxDimensions[1] / 2 - 0.5,
              0.1,
            ]}
          >
            <DeleteButton onClick={() => onDelete(index)} />
          </Html>
        )}
      </mesh>
    );
  }
);

export default ImagePlane;
