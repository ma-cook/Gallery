import React, { forwardRef, useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import DeleteButton from './DeleteButton';

const ImagePlane = forwardRef(
  (
    { originalIndex, position, onClick, imageUrl, user, onDelete, onError },
    ref
  ) => {
    const texture = useLoader(TextureLoader, imageUrl, undefined, (error) => {
      console.error('Error loading texture:', error);
      if (onError) onError(error);
    });

    if (texture) {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.flipY = false;
    }

    const meshRef = useRef();
    const [boxDimensions, setBoxDimensions] = useState([1, 1]);

    useEffect(() => {
      // It's important to capture the texture in the effect setup phase
      // because the 'texture' variable from useLoader can change.
      const currentTexture = texture;
      return () => {
        if (currentTexture) {
          currentTexture.dispose();
        }
      };
    }, [texture]); // This effect runs when 'texture' changes, and cleans up the previous texture.

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

    const boxDepth = 0.05; // Optimize materials for better performance
    const materials = useMemo(() => {
      // Create shared materials for sides that don't change
      const sideMaterial = new THREE.MeshBasicMaterial({
        color: 'black',
        roughness: 0.8,
        flatShading: true,
      });

      // Create array with shared materials to reduce GPU workload
      return [
        sideMaterial,
        sideMaterial,
        sideMaterial,
        sideMaterial,
        // Use MeshBasicMaterial instead of MeshPhongMaterial for front face (better performance)
        new THREE.MeshBasicMaterial({
          map: texture,
          toneMapped: false, // Disable tone mapping for better performance
          side: THREE.FrontSide, // Only render front side
        }),
        sideMaterial,
      ];
    }, [texture]);
    const direction = useMemo(() => new THREE.Vector3(), []);
    // Use throttling to reduce update frequency
    const lastUpdateRef = useRef(0);
    const UPDATE_INTERVAL = 50; // ms between updates

    useFrame(({ camera, clock }) => {
      if (meshRef.current) {
        // Throttle updates to improve performance
        const now = clock.elapsedTime * 1000;
        if (now - lastUpdateRef.current < UPDATE_INTERVAL) {
          return;
        }
        lastUpdateRef.current = now;

        // Calculate camera-facing orientation
        direction
          .subVectors(meshRef.current.position, camera.position)
          .normalize();
        meshRef.current.lookAt(camera.position);
        meshRef.current.rotation.z += Math.PI;
      }
    });

    const handleDelete = () => onDelete(originalIndex); // Handle click on this plane
    const handleClick = (event) => {
      // Stop propagation to prevent multiple handlers from firing
      event.stopPropagation();
      // Call the onClick handler passed as prop
      if (onClick) {
        console.log(`Image clicked: ${originalIndex}`);
        onClick(originalIndex);
      }
    };

    return (
      <mesh
        position={position}
        ref={ref || meshRef}
        castShadow
        material={materials}
        userData={{ originalIndex }}
        onClick={handleClick}
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
            <DeleteButton onClick={handleDelete} />
          </Html>
        )}
      </mesh>
    );
  }
);

export default React.memo(ImagePlane);
