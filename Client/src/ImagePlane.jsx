import React, { forwardRef, useRef, useEffect, useMemo, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import DeleteButton from './DeleteButton';
import useStore from './store';
import { createLowResTexture } from './utils';

// Distance threshold for switching to low-resolution textures
const DISTANCE_THRESHOLD = 60;

const TARGET_SPRITE_SCREEN_WIDTH = 10;

const ImagePlane = forwardRef(
  (
    { originalIndex, position, onClick, imageUrl, user, onDelete, onError },
    ref
  ) => {
    const updateImageComponentState = useStore(
      (state) => state.updateImageComponentState
    );
    // Select only the state for the current image index for better reactivity
    const imageStateForThisIndex = useStore(
      (state) => state.imageComponentStates[originalIndex]
    );

    // Determine highResolution status from the specific image's state in the store
    const highResolution = imageStateForThisIndex?.highResolution === true;

    // Initialize with dimensions reflecting the target screen width AND initial highResolution status
    const [currentRenderDimensions, setCurrentRenderDimensions] = useState(
      () => {
        const initialHighRes = imageStateForThisIndex?.highResolution === true;
        const initialTargetScreenWidth = initialHighRes
          ? TARGET_SPRITE_SCREEN_WIDTH
          : TARGET_SPRITE_SCREEN_WIDTH / 2;
        return [initialTargetScreenWidth, initialTargetScreenWidth]; // Assuming 1:1 aspect ratio initially, will be corrected by useEffect
      }
    );

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
        if (isMounted) {
          setLowResTexture(null); // Reset if no source texture/image
        }
      }

      return () => {
        isMounted = false;
      };
    }, [texture]);

    const spriteRef = useRef();

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
      // This effect calculates sprite dimensions based on a fixed screen width
      // and the texture's aspect ratio, adjusted by distance.

      // Determine the actual target screen width based on resolution (distance)
      const actualTargetScreenWidth = highResolution
        ? TARGET_SPRITE_SCREEN_WIDTH
        : TARGET_SPRITE_SCREEN_WIDTH / 2; // Half size when far away

      if (texture && texture.image) {
        const img = texture.image;
        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;

        if (imgWidth > 0 && imgHeight > 0) {
          const aspectRatio = imgWidth / imgHeight;
          // Calculate height based on the actual target screen width and aspect ratio
          const screenHeight = actualTargetScreenWidth / aspectRatio;
          setCurrentRenderDimensions([actualTargetScreenWidth, screenHeight]);
        } else {
          // Fallback for invalid image dimensions, use square based on actual target screen width
          setCurrentRenderDimensions([
            actualTargetScreenWidth,
            actualTargetScreenWidth,
          ]);
        }
      } else {
        // Before texture.image is loaded, maintain dimensions based on actual target screen width.
        // This ensures a consistent size even before the image aspect ratio is known.
        setCurrentRenderDimensions([
          actualTargetScreenWidth,
          actualTargetScreenWidth, // Assuming 1:1 aspect ratio until image loads
        ]);
      }
    }, [texture, highResolution]); // Added highResolution to dependencies

    useFrame(({ camera: frameCamera }) => {
      // Continuously update highResolution state in useFrame for responsiveness
      if (spriteRef.current && texture) {
        const distance = frameCamera.position.distanceTo(
          spriteRef.current.position
        );
        // Always get the absolute latest state from the store for comparison
        const currentStoreHighRes =
          useStore.getState().imageComponentStates[originalIndex]
            ?.highResolution;
        const shouldBeHighRes = distance < DISTANCE_THRESHOLD;

        if (currentStoreHighRes !== shouldBeHighRes) {
          updateImageComponentState(originalIndex, {
            highResolution: shouldBeHighRes,
          });
        }
      }
    });

    // Determine the texture to be used by the material
    const materialTexture = useMemo(() => {
      if (highResolution) {
        return texture; // Close up, use high-res
      }
      // Distant: use low-res. If low-res is not ready, this will be null.
      return lowResTexture;
    }, [texture, lowResTexture, highResolution]);

    const handleDelete = () => onDelete(originalIndex);

    const spriteScale = useMemo(() => {
      return [currentRenderDimensions[0], currentRenderDimensions[1], 1];
    }, [currentRenderDimensions]);

    // Conditional Rendering:
    // 1. Main texture must be loaded.
    // 2. The texture to be mapped to the material (materialTexture) must be available.
    //    - If close (highResolution=true), materialTexture is `texture`.
    //    - If distant (highResolution=false), materialTexture is `lowResTexture`.
    //      If `lowResTexture` is null, then `materialTexture` is null, and we don't render.
    if (!texture || !materialTexture) {
      return null;
    }

    return (
      <sprite
        position={position}
        ref={spriteRef} // Ensure internal spriteRef is used for consistent distance calculation
        scale={spriteScale}
        userData={{ originalIndex }}
        onClick={onClick}
      >
        <spriteMaterial
          attach="material"
          map={materialTexture} // Use the determined materialTexture
          toneMapped={false}
          sizeAttenuation={true} // Ensures sprite maintains screen size
        />
        {user &&
          materialTexture && ( // Check materialTexture here too for consistency
            <Html
              // Position in sprite's local space (e.g., near top-right).
              // Assumes sprite's local unscaled size is roughly 1x1 centered at origin.
              // Adjust these values based on DeleteButton's anchor and desired placement.
              position={[0.4, 0.4, 0.1]}
              distanceFactor={10} // Makes Html content scale with distance like the sprite.
              // Adjust this value as needed. (e.g. 10-15 often works well)
            >
              {/* Ensure DeleteButton component has a fixed CSS size (e.g., 20px x 20px) */}
              <DeleteButton onClick={handleDelete} />
            </Html>
          )}
      </sprite>
    );
  }
);

export default React.memo(ImagePlane);
