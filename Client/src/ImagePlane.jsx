import React, { forwardRef, useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber'; // Added useThree
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import DeleteButton from './DeleteButton';

const ImagePlane = forwardRef(
  (
    { originalIndex, position, onClick, imageUrl, user, onDelete },
    forwardedRef
  ) => {
    const { invalidate } = useThree(); // Get invalidate function

    const texture = useLoader(TextureLoader, imageUrl, (loadedTexture) => {
      // This callback runs when the texture is loaded
      if (loadedTexture) {
        invalidate(); // Invalidate to ensure the frame re-renders with the new texture
      }
    });

    // Effect to invalidate when imageUrl changes, ensuring the component re-renders
    // promptly in frameloop="demand" mode, even before the texture is fully loaded.
    useEffect(() => {
      if (imageUrl) {
        invalidate();
      }
    }, [imageUrl, invalidate]);

    const internalMeshRef = useRef();
    const meshRef = forwardedRef || internalMeshRef; // Use forwardedRef if provided, else internal

    const [boxDimensions, setBoxDimensions] = useState([1, 1]);
    const [isHovered, setIsHovered] = useState(false); // For hover state

    // Effect for setting texture properties
    useEffect(() => {
      if (texture) {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.flipY = false;
      }
    }, [texture]);

    // Effect for texture disposal
    useEffect(() => {
      const currentTexture = texture;
      return () => {
        if (currentTexture) {
          currentTexture.dispose();
        }
      };
    }, [texture]);

    // Effect for calculating box dimensions based on texture aspect ratio
    useEffect(() => {
      if (
        texture && // Ensure texture is loaded
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
    }, [texture]); // Depend on texture

    const boxDepth = 0.05;

    const materials = useMemo(
      () => [
        new THREE.MeshBasicMaterial({ color: 'black' }),
        new THREE.MeshBasicMaterial({ color: 'black' }),
        new THREE.MeshBasicMaterial({ color: 'black' }),
        new THREE.MeshBasicMaterial({ color: 'black' }),
        new THREE.MeshPhongMaterial({ map: texture }),
        new THREE.MeshPhongMaterial({ color: 'black' }),
      ],
      [texture]
    );

    useFrame(({ camera }) => {
      if (meshRef.current) {
        // Simplified: lookAt directly, no need for separate direction vector calculation
        meshRef.current.lookAt(camera.position);
        meshRef.current.rotation.z += Math.PI; // Adjust rotation to make +Z face camera
      }
    });

    const handleDelete = (e) => {
      e.stopPropagation(); // Prevent click from bubbling to the mesh's onClick
      onDelete(originalIndex);
    };

    const handlePointerOver = (e) => {
      e.stopPropagation();
      setIsHovered(true);
    };

    const handlePointerOut = (e) => {
      e.stopPropagation();
      setIsHovered(false);
    };

    return (
      <mesh
        position={position}
        ref={meshRef}
        castShadow
        material={materials}
        userData={{ originalIndex }}
        onClick={onClick} // Main click action for the image
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry attach="geometry" args={[...boxDimensions, boxDepth]} />
        {user &&
          isHovered && ( // Show delete button only if user exists and image is hovered
            <Html
              position={[
                boxDimensions[0] / 2 - 0.5,
                boxDimensions[1] / 2 - 0.5,
                boxDepth / 2 + 0.01, // Position slightly in front of the face
              ]}
              zIndexRange={[100, 0]} // Ensure it's rendered on top
            >
              <DeleteButton onClick={handleDelete} />
            </Html>
          )}
      </mesh>
    );
  }
);

export default React.memo(ImagePlane);
