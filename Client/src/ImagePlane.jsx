import React, { forwardRef, useRef, useEffect, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import DeleteButton from './DeleteButton';
import useStore from './store';
import { createLowResTexture } from './utils';
import { textureLoadQueue } from './TextureLoadQueue';
import { RoundedSpriteMaterial } from './RoundedSpriteMaterial';

// Distance threshold for switching to low-resolution textures
const DISTANCE_THRESHOLD = 60;
const MAX_RENDER_DISTANCE = 200; // Don't render sprites beyond this distance

const TARGET_SPRITE_SCREEN_WIDTH = 10;

// Global texture cache to prevent reloading
const textureCache = new Map();

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
    
    // Track distance for render culling - use ref to avoid re-renders
    const isWithinRenderDistanceRef = useRef(true);
    const [, forceUpdate] = useState({});

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

    // Manual texture loading to avoid Suspense unmounting
    const [texture, setTexture] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      let isMounted = true;
      const loader = new THREE.TextureLoader();
      
      if (window.THREE_LOADING_MANAGER) {
        loader.manager = window.THREE_LOADING_MANAGER;
      }

      loader.load(
        imageUrl,
        (loadedTexture) => {
          if (isMounted) {
            loadedTexture.minFilter = THREE.LinearFilter;
            loadedTexture.magFilter = THREE.LinearFilter;
            loadedTexture.generateMipmaps = false;
            loadedTexture.needsUpdate = true;
            setTexture(loadedTexture);
            setIsLoading(false);
          }
        },
        undefined,
        (err) => {
          console.error(`TextureLoader failed for ${imageUrl}:`, err);
          if (isMounted && onError) {
            onError(err);
          }
          setIsLoading(false);
        }
      );

      return () => {
        isMounted = false;
        if (texture) {
          texture.dispose();
        }
      };
    }, [imageUrl]);

    // Create low-res version of the texture for distant viewing
    const [lowResTexture, setLowResTexture] = useState(null);

    useEffect(() => {
      let isMounted = true;

      if (texture && texture.image) {
        // Defer low-res texture generation to avoid blocking camera movement
        textureLoadQueue.load(() => createLowResTexture(texture, 0.2, true), -1)
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
    const distanceCheckCounter = useRef(0);
    const DISTANCE_CHECK_INTERVAL = 20; // Check every 20 frames for better performance

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
      // Debounce distance checks to improve performance
      distanceCheckCounter.current++;
      if (distanceCheckCounter.current < DISTANCE_CHECK_INTERVAL) {
        return;
      }
      distanceCheckCounter.current = 0;

      // Continuously update highResolution state in useFrame for responsiveness
      if (spriteRef.current && texture) {
        const distance = frameCamera.position.distanceTo(
          spriteRef.current.position
        );
        
        // Check if sprite is within render distance - use ref to avoid state updates
        const withinDistance = distance < MAX_RENDER_DISTANCE;
        if (withinDistance !== isWithinRenderDistanceRef.current) {
          isWithinRenderDistanceRef.current = withinDistance;
          forceUpdate({}); // Only force update when visibility actually changes
        }
        
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

    // Create lightweight rounded material only when texture changes
    const spriteMaterial = useMemo(() => {
      if (!materialTexture) return null;
      return new RoundedSpriteMaterial(materialTexture, 0.08);
    }, [materialTexture]);

    // Cleanup
    useEffect(() => {
      return () => {
        if (spriteMaterial) {
          spriteMaterial.dispose();
        }
      };
    }, [spriteMaterial]);



    // Conditional Rendering:
    // 1. Main texture must be loaded.
    // 2. The texture to be mapped to the material (materialTexture) must be available.
    //    - If close (highResolution=true), materialTexture is `texture`.
    //    - If distant (highResolution=false), materialTexture is `lowResTexture`.
    //      If `lowResTexture` is null, then `materialTexture` is null, and we don't render.
    // 3. If beyond max render distance, render invisible to keep useFrame running
    if (!texture) {
      return null;
    }

    // Render sprite invisible if out of range or no texture, but keep component mounted
    const shouldRenderVisible = materialTexture && isWithinRenderDistanceRef.current;

    return (
      <sprite
        position={position}
        ref={spriteRef} // Ensure internal spriteRef is used for consistent distance calculation
        scale={shouldRenderVisible ? spriteScale : [0.001, 0.001, 0.001]} // Tiny scale when invisible
        userData={{ originalIndex }}
        onClick={onClick}
        visible={shouldRenderVisible}
      >
        {shouldRenderVisible && spriteMaterial && (
          <primitive object={spriteMaterial} attach="material" />
        )}
        {user &&
          materialTexture &&
          highResolution &&
          shouldRenderVisible && ( // Only render delete button when close (high res)
            <Html
              // Position in sprite's local space (e.g., near top-right).
              // Assumes sprite's local unscaled size is roughly 1x1 centered at origin.
              // Adjust these values based on DeleteButton's anchor and desired placement.
              position={[0.4, 0.4, 0.1]}
              distanceFactor={10} // Makes Html content scale with distance like the sprite.
              // Adjust this value as needed. (e.g. 10-15 often works well)
              style={{ pointerEvents: 'auto' }}
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
