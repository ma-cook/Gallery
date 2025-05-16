import React, { forwardRef, useRef, useEffect, useMemo, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import DeleteButton from './DeleteButton';
import useStore from './store';
import { calculateImageDimensions, createLowResTexture } from './utils';

const sideMaterial = new THREE.MeshBasicMaterial({
  color: 'black',
  roughness: 0.8,
  flatShading: true,
});

// Distance threshold for switching to low-resolution textures
const DISTANCE_THRESHOLD = 100;
const MAX_WIDTH_LOD_CLOSE = 10; // Max width when image is close
const MAX_WIDTH_LOD_FAR = 1;

const ImagePlane = forwardRef(
  (
    { originalIndex, position, onClick, imageUrl, user, onDelete, onError },
    ref
  ) => {
    const {
      ensureImageComponentState,
      setBoxDimensionsForImage,
      setHighResolutionForImage,
      imageComponentStates,
    } = useStore((state) => ({
      ensureImageComponentState: state.ensureImageComponentState,
      setBoxDimensionsForImage: state.setBoxDimensionsForImage,
      setHighResolutionForImage: state.setHighResolutionForImage,
      imageComponentStates: state.imageComponentStates,
    }));

    const highResolution =
      imageComponentStates[originalIndex]?.highResolution === true;

    const [currentRenderDimensions, setCurrentRenderDimensions] = useState([
      1, 1,
    ]);

    const texture = useLoader(
      TextureLoader,
      imageUrl,
      (loader) => {
        // Use the global loading manager if available
        if (window.THREE_LOADING_MANAGER) {
          loader.manager = window.THREE_LOADING_MANAGER;
        }
      },
      (err) => {
        console.error(`TextureLoader failed for ${imageUrl}:`, err);
        if (onError) {
          onError(err);
        }
      }
    );

    if (texture) {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.flipY = false;
    }

    // Create low-res version of the texture for distant viewing
    const [lowResTexture, setLowResTexture] = useState(null);

    useEffect(() => {
      let isMounted = true;

      if (texture && texture.image) {
        createLowResTexture(texture, 0.25)
          .then((generatedLowResTexture) => {
            if (isMounted) {
              if (generatedLowResTexture) {
                setLowResTexture(generatedLowResTexture);
              } else {
                setLowResTexture(null); // Explicitly set to null if creation failed or returned null
              }
            }
          })
          .catch((err) => {
            if (isMounted) {
              console.error(
                'Failed to create low-res texture for ImagePlane:',
                err
              );
              setLowResTexture(null); // Set to null on error
            }
          });
      } else {
        // This case handles when texture or texture.image is null or undefined initially
        // or if they become null/undefined after being set.
        if (isMounted) {
          setLowResTexture(null); // Reset if no source texture/image
        }
      }

      return () => {
        isMounted = false;
        // Cleanup for lowResTexture is handled by the next useEffect
        // when texture or lowResTexture itself changes, or when the component unmounts.
      };
    }, [texture]); // Dependency on texture ensures this runs if the source texture changes

    const meshRef = useRef();

    useEffect(() => {
      const currentTexture = texture;
      const currentLowResTexture = lowResTexture;

      return () => {
        if (currentTexture) {
          currentTexture.dispose();
        }
        if (currentLowResTexture) {
          currentLowResTexture.dispose();
        }
      };
    }, [texture, lowResTexture]);

    useEffect(() => {
      const targetMaxWidth = highResolution
        ? MAX_WIDTH_LOD_CLOSE
        : MAX_WIDTH_LOD_FAR;

      if (texture && texture.image) {
        const [newWidth, newHeight] = calculateImageDimensions(
          texture.image,
          targetMaxWidth
        );
        setCurrentRenderDimensions([newWidth, newHeight]);
      } else {
        // Fallback if texture isn't loaded, using [1,1] as calculateImageDimensions would for a null image
        setCurrentRenderDimensions([1, 1]);
      }
    }, [texture, highResolution, originalIndex]); // Recalculate when texture or highResolution status changes

    const camera = useThree((state) => state.camera); // Get the camera from Three.js

    useEffect(() => {
      if (meshRef.current && texture && lowResTexture) {
        const distance = camera.position.distanceTo(meshRef.current.position);
        const shouldBeHighRes = distance < DISTANCE_THRESHOLD;

        // Always set the initial state
        setHighResolutionForImage(originalIndex, shouldBeHighRes);
      }
    }, [
      meshRef,
      texture,
      lowResTexture,
      camera,
      originalIndex,
      setHighResolutionForImage,
    ]);

    // Continuously check distance from camera and update resolution as needed
    useFrame(({ camera }) => {
      if (meshRef.current && texture && lowResTexture) {
        const distance = camera.position.distanceTo(meshRef.current.position);
        const shouldBeHighRes = distance < DISTANCE_THRESHOLD;

        // Only update if the state needs to change to avoid unnecessary renders
        if (highResolution !== shouldBeHighRes) {
          setHighResolutionForImage(originalIndex, shouldBeHighRes);
        }
      }
    });

    const boxDepth = 0.05;
    const materials = useMemo(() => {
      // Use appropriate texture based on distance
      let activeTexture;

      if (highResolution) {
        activeTexture = texture;
      } else {
        activeTexture = lowResTexture || texture; // Fallback to texture if lowResTexture isn't ready
      }

      return [
        sideMaterial,
        sideMaterial,
        sideMaterial,
        sideMaterial,
        new THREE.MeshBasicMaterial({
          map: activeTexture,
          toneMapped: false,
          side: THREE.FrontSide,
        }),
        sideMaterial,
      ];
    }, [texture, lowResTexture, highResolution]);

    const direction = useMemo(() => new THREE.Vector3(), []);

    const UPDATE_INTERVAL = 50;

    useFrame(
      ({ camera, clock }) => {
        if (!meshRef.current) return;

        direction
          .subVectors(meshRef.current.position, camera.position)
          .normalize();
        meshRef.current.lookAt(camera.position);
        meshRef.current.rotation.z += Math.PI;
      },
      { frameloop: 'demand', throttle: UPDATE_INTERVAL }
    );

    const handleDelete = () => onDelete(originalIndex);

    return (
      <mesh
        position={position}
        ref={ref || meshRef}
        castShadow
        material={materials}
        userData={{ originalIndex }}
        onClick={onClick}
      >
        <boxGeometry
          attach="geometry"
          args={[...currentRenderDimensions, boxDepth]}
        />
        {user && (
          <Html
            position={[
              currentRenderDimensions[0] / 2 - 0.5,
              currentRenderDimensions[1] / 2 - 0.5,
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
