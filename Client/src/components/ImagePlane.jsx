import React, { forwardRef, useRef, useEffect, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import DeleteButton from './DeleteButton';
import useStore from '../store';
import { createLowResTexture } from '../utils/utils';
import { textureLoadQueue, thumbnailLoadQueue } from '../utils/TextureLoadQueue';
import { RoundedSpriteMaterial } from '../utils/RoundedSpriteMaterial';
import { imageCache } from '../utils/imageCache';

// Track failed images to prevent retry loops
const failedImages = new Set();
const lastErrorLog = new Map();
const ERROR_LOG_THROTTLE = 5000; // Only log same error once per 5 seconds

// Helper to safely log errors without spamming console
const logErrorThrottled = (key, message, url) => {
  const now = Date.now();
  const lastLog = lastErrorLog.get(key);
  
  if (!lastLog || now - lastLog > ERROR_LOG_THROTTLE) {
    const safeUrl = url?.startsWith('blob:') ? 'blob URL' : (url?.substring(0, 80) || 'unknown');
    console.error(message, safeUrl);
    lastErrorLog.set(key, now);
  }
};

// Distance thresholds for different image qualities
const THUMBNAIL_DISTANCE = 60; // Beyond this, use thumbnail
const MEDIUM_DISTANCE = 5;     // Between this and thumbnail, use medium
// Below MEDIUM_DISTANCE, use original/high-res (only when clicked)
const HIGH_QUALITY_DISTANCE = 30; // Once clicked, keep high quality until this distance
const MAX_RENDER_DISTANCE = 5000 // Don't render sprites beyond this distance

// Distance-based scaling to reduce clutter
const SCALE_DISTANCE_START = 60; // Distance where sprites start to shrink
const MIN_SCALE = 0.5; // Minimum scale (half size)

// Hysteresis buffers to prevent quality flickering - INCREASED for smoother transitions
const QUALITY_HYSTERESIS = 10; // Increased buffer zone to prevent constant switching
const THUMBNAIL_UPGRADE_DISTANCE = THUMBNAIL_DISTANCE - QUALITY_HYSTERESIS;
const MEDIUM_UPGRADE_DISTANCE = MEDIUM_DISTANCE - QUALITY_HYSTERESIS;
const MEDIUM_DOWNGRADE_DISTANCE = THUMBNAIL_DISTANCE + QUALITY_HYSTERESIS;
const HIGH_DOWNGRADE_DISTANCE = HIGH_QUALITY_DISTANCE + QUALITY_HYSTERESIS; // Keep high quality longer after click

const TARGET_SPRITE_SCREEN_WIDTH = 10;

// Global texture cache to prevent reloading
const textureCache = new Map();

const ImagePlane = forwardRef(
  (
    { originalIndex, position, onClick, imageUrl, thumbnailUrl, mediumUrl, isGif, user, isAdmin, onDelete, onError },
    ref
  ) => {
    // If no variants exist, disable multi-quality system for this image
    // GIFs also don't have variants (to preserve animation)
    const hasVariants = Boolean(thumbnailUrl && mediumUrl) && !isGif;
    
    // Special handling for GIFs - use HTML rendering to preserve animation
    const spriteRef = useRef();
    const [gifLoaded, setGifLoaded] = useState(false);
    const [gifDimensions, setGifDimensions] = useState([TARGET_SPRITE_SCREEN_WIDTH, TARGET_SPRITE_SCREEN_WIDTH]);
    
    // For GIFs, render as HTML img element to preserve animation
    if (isGif) {
      const handleDelete = () => onDelete(originalIndex);
      
      const handleGifClick = (event) => {
        event.stopPropagation();
        if (onClick) {
          onClick(event);
        }
      };
      
      // Load GIF to get dimensions
      useEffect(() => {
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          const height = TARGET_SPRITE_SCREEN_WIDTH / aspectRatio;
          setGifDimensions([TARGET_SPRITE_SCREEN_WIDTH, height]);
          setGifLoaded(true);
        };
        img.onerror = () => {
          setGifLoaded(true); // Still render even if sizing fails
        };
        img.src = imageUrl;
      }, [imageUrl]);
      
      if (!gifLoaded) {
        return null;
      }
      
      return (
        <group position={position} ref={spriteRef}>
          <Html
            transform
            distanceFactor={1}
            position={[0, 0, 0]}
            style={{
              pointerEvents: 'auto',
              width: `${gifDimensions[0] * 100}px`,
              height: `${gifDimensions[1] * 100}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                borderRadius: '8px',
                overflow: 'hidden',
                background: 'rgba(0, 0, 0, 0.1)',
              }}
            >
              <img
                src={imageUrl}
                alt="GIF"
                onClick={handleGifClick}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  cursor: 'pointer',
                  borderRadius: '8px',
                }}
              />
              {isAdmin && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 1000,
                  }}
                >
                  <DeleteButton onClick={handleDelete} />
                </div>
              )}
            </div>
          </Html>
        </group>
      );
    }
    
    // Standard image rendering continues below...
    
    // Use refs for quality tracking to avoid re-renders during camera movement
    const qualityLevelRef = useRef('thumbnail');
    const [currentQuality, setCurrentQuality] = useState('thumbnail');
    
    // Track if high quality has been requested (via click)
    const [highQualityRequested, setHighQualityRequested] = useState(false);
    
    // Track distance for render culling - use ref to avoid re-renders
    const isWithinRenderDistanceRef = useRef(true);
    
    // Track distance-based scale multiplier (1.0 = full size, 0.5 = half size)
    const distanceScaleRef = useRef(1.0);

    // Initialize with consistent dimensions - don't change size based on quality
    const [currentRenderDimensions, setCurrentRenderDimensions] = useState(
      [TARGET_SPRITE_SCREEN_WIDTH, TARGET_SPRITE_SCREEN_WIDTH]
    );
    
    // Track if we've calculated dimensions yet
    const dimensionsCalculatedRef = useRef(false);

    // Textures for different quality levels
    const [lowResTexture, setLowResTexture] = useState(null); // Canvas-based placeholder
    const [thumbnailTexture, setThumbnailTexture] = useState(null);
    const [mediumTexture, setMediumTexture] = useState(null);
    const [highTexture, setHighTexture] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Track blob URLs for cleanup
    const thumbnailBlobRef = useRef(null);
    const mediumBlobRef = useRef(null);
    const highBlobRef = useRef(null);

    // Load thumbnail first (always loads for initial display)
    useEffect(() => {
      let isMounted = true;
      let blobUrl = null;
      // Use global loading manager to show loading progress
      const loader = new THREE.TextureLoader(window.THREE_LOADING_MANAGER || undefined);

      // Use thumbnail if available, otherwise use original image
      // If no thumbnailUrl, this means image variants haven't been generated yet
      const urlToLoad = thumbnailUrl || imageUrl;
      
      // Log once if variants are missing (helpful for debugging)
      if (!thumbnailUrl && imageUrl && originalIndex === 0) {
        console.log('📌 Image variants not generated yet. Using original images. Deploy Cloud Functions to enable optimization.');
      }

      // Skip if no URL or this image has failed before
      if (!urlToLoad || failedImages.has(urlToLoad)) {
        setIsLoading(false);
        return;
      }

      // Use cached loading - defer if camera is moving to prevent jerkiness
      const loadTexture = async () => {
        const cachedUrl = await imageCache.loadImage(urlToLoad);
        
        if (!isMounted) {
          URL.revokeObjectURL(cachedUrl);
          return;
        }
        
        blobUrl = cachedUrl;
        thumbnailBlobRef.current = cachedUrl;
        
        return new Promise((resolve, reject) => {
          loader.load(
            cachedUrl,
            (loadedTexture) => {
              if (isMounted) {
                loadedTexture.minFilter = THREE.LinearFilter;
                loadedTexture.magFilter = THREE.LinearFilter;
                loadedTexture.generateMipmaps = false;
                loadedTexture.needsUpdate = true;
                setThumbnailTexture(loadedTexture);
                
                // Create low-res placeholder immediately for faster initial render
                // This helps prevent crashes when uploading multiple high-res images
                createLowResTexture(loadedTexture, 0.1, false).then((lowRes) => {
                  if (isMounted && lowRes) {
                    setLowResTexture(lowRes);
                  }
                }).catch(err => {
                  console.warn('Failed to create low-res texture:', err);
                });
                
                setIsLoading(false);
                resolve(loadedTexture);
              }
            },
            undefined,
            (err) => {
              failedImages.add(urlToLoad);
              // Only log non-404 errors
              if (!err.status || err.status !== 404) {
                logErrorThrottled(`thumb-${urlToLoad}`, 'Failed to load thumbnail:', urlToLoad);
              }
              if (isMounted && onError) {
                onError(err);
              }
              setIsLoading(false);
              // Cleanup blob URL on error
              if (blobUrl) URL.revokeObjectURL(blobUrl);
              thumbnailBlobRef.current = null;
              reject(err);
            }
          );
        });
      };

      // Use separate thumbnail queue with higher concurrency to prevent jerky camera
      // Thumbnails are small (256px) so we can load more concurrently than high-res images
      thumbnailLoadQueue.load(loadTexture, 10) // High priority for thumbnails
        .catch((err) => {
          failedImages.add(urlToLoad);
          // Only log non-404 errors
          if (!err.status || err.status !== 404) {
            logErrorThrottled(`cache-thumb-${urlToLoad}`, 'Cache load failed:', urlToLoad);
          }
          if (isMounted && onError) {
            onError(err);
          }
          setIsLoading(false);
        });

      return () => {
        isMounted = false;
        // Cleanup blob URL on unmount
        if (thumbnailBlobRef.current) {
          URL.revokeObjectURL(thumbnailBlobRef.current);
          thumbnailBlobRef.current = null;
        }
      };
    }, [thumbnailUrl, imageUrl, onError]);

    // Load medium quality when needed
    useEffect(() => {
      // Skip if no variants exist - use original image only
      if (!hasVariants) {
        return;
      }
      
      // Don't load if no medium URL available or already loaded
      if (!mediumUrl || mediumTexture) {
        return;
      }

      // Skip if this image has failed before
      if (failedImages.has(mediumUrl)) {
        return;
      }

      let isMounted = true;
      let blobUrl = null;
      const loader = new THREE.TextureLoader(window.THREE_LOADING_MANAGER || undefined);

      // Delay medium quality loading slightly to prioritize thumbnails
      const timeoutId = setTimeout(() => {
        const loadTexture = async () => {
          const cachedUrl = await imageCache.loadImage(mediumUrl);
          
          if (!isMounted) {
            URL.revokeObjectURL(cachedUrl);
            return;
          }
          
          blobUrl = cachedUrl;
          mediumBlobRef.current = cachedUrl;
          
          return new Promise((resolve, reject) => {
            loader.load(
              cachedUrl,
              (loadedTexture) => {
                if (isMounted) {
                  loadedTexture.minFilter = THREE.LinearFilter;
                  loadedTexture.magFilter = THREE.LinearFilter;
                  loadedTexture.generateMipmaps = false;
                  loadedTexture.needsUpdate = true;
                  setMediumTexture(loadedTexture);
                  resolve(loadedTexture);
                }
              },
              undefined,
              (err) => {
                failedImages.add(mediumUrl);
                if (!err.status || err.status !== 404) {
                  logErrorThrottled(`med-${mediumUrl}`, 'Failed to load medium quality:', mediumUrl);
                }
                if (blobUrl) URL.revokeObjectURL(blobUrl);
                mediumBlobRef.current = null;
                reject(err);
              }
            );
          });
        };

        // Queue texture loading to avoid blocking camera movement
        textureLoadQueue.load(loadTexture, 5) // Medium priority
          .catch((err) => {
            failedImages.add(mediumUrl);
            if (!err.status || err.status !== 404) {
              logErrorThrottled(`cache-med-${mediumUrl}`, 'Cache load failed for medium:', mediumUrl);
            }
          });
      }, 100); // Small delay to prioritize thumbnails

      return () => {
        clearTimeout(timeoutId);
        isMounted = false;
        if (mediumBlobRef.current) {
          URL.revokeObjectURL(mediumBlobRef.current);
          mediumBlobRef.current = null;
        }
      };
    }, [mediumUrl, hasVariants]);

    // Load high quality only when clicked (requested)
    useEffect(() => {
      // Only load if high quality has been requested via click
      if (!highQualityRequested) {
        return;
      }
      
      // Skip loading high quality separately if no variants exist (already loaded as thumbnail)
      if (!hasVariants) {
        return;
      }
      
      // Don't load if already loaded
      if (highTexture) {
        return;
      }

      // Skip if this image has failed before
      if (failedImages.has(imageUrl)) {
        return;
      }

      let isMounted = true;
      let blobUrl = null;
      const loader = new THREE.TextureLoader(window.THREE_LOADING_MANAGER || undefined);

      // Delay high quality loading to prioritize thumbnails and medium
      const timeoutId = setTimeout(() => {
        const loadTexture = async () => {
          const cachedUrl = await imageCache.loadImage(imageUrl);
          
          if (!isMounted) {
            URL.revokeObjectURL(cachedUrl);
            return;
          }
          
          blobUrl = cachedUrl;
          highBlobRef.current = cachedUrl;
          
          return new Promise((resolve, reject) => {
            loader.load(
              cachedUrl,
              (loadedTexture) => {
                if (isMounted) {
                  loadedTexture.minFilter = THREE.LinearFilter;
                  loadedTexture.magFilter = THREE.LinearFilter;
                  loadedTexture.generateMipmaps = false;
                  loadedTexture.needsUpdate = true;
                  setHighTexture(loadedTexture);
                  resolve(loadedTexture);
                }
              },
              undefined,
              (err) => {
                failedImages.add(imageUrl);
                if (!err.status || err.status !== 404) {
                  logErrorThrottled(`high-${imageUrl}`, 'Failed to load high quality:', imageUrl);
                }
                if (isMounted && onError) {
                  onError(err);
                }
                if (blobUrl) URL.revokeObjectURL(blobUrl);
                highBlobRef.current = null;
                reject(err);
              }
            );
          });
        };

        // Queue texture loading to avoid blocking camera movement
        textureLoadQueue.load(loadTexture, 1) // Low priority for high quality
          .catch((err) => {
            failedImages.add(imageUrl);
            if (!err.status || err.status !== 404) {
              logErrorThrottled(`cache-high-${imageUrl}`, 'Cache load failed for high quality:', imageUrl);
            }
            if (isMounted && onError) {
              onError(err);
            }
          });
      }, 200); // Larger delay for high quality

      return () => {
        clearTimeout(timeoutId);
        isMounted = false;
        if (highBlobRef.current) {
          URL.revokeObjectURL(highBlobRef.current);
          highBlobRef.current = null;
        }
      };
    }, [imageUrl, onError, hasVariants, highQualityRequested]);

    const distanceCheckCounter = useRef(0); // Start at 0
    const DISTANCE_CHECK_INTERVAL = 90; // Reduced frequency - check every 90 frames (~1.5 seconds at 60fps)

    useEffect(() => {
      return () => {
        // Cleanup all textures
        if (lowResTexture) lowResTexture.dispose();
        if (thumbnailTexture) thumbnailTexture.dispose();
        if (mediumTexture) mediumTexture.dispose();
        if (highTexture) highTexture.dispose();
      };
    }, [lowResTexture, thumbnailTexture, mediumTexture, highTexture]);

    // Calculate dimensions once when first texture loads - keep size constant regardless of quality
    useEffect(() => {
      // Only calculate once
      if (dimensionsCalculatedRef.current) {
        return;
      }

      // Use whatever texture is currently loaded to get aspect ratio
      const currentTexture = thumbnailTexture || lowResTexture || mediumTexture || highTexture;
      
      if (currentTexture && currentTexture.image) {
        const img = currentTexture.image;
        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;

        if (imgWidth > 0 && imgHeight > 0) {
          const aspectRatio = imgWidth / imgHeight;
          const screenHeight = TARGET_SPRITE_SCREEN_WIDTH / aspectRatio;
          setCurrentRenderDimensions([TARGET_SPRITE_SCREEN_WIDTH, screenHeight]);
          dimensionsCalculatedRef.current = true;
        }
      }
    }, [lowResTexture, thumbnailTexture, mediumTexture, highTexture]);

    // Set initial scale when sprite ref and dimensions are ready
    useEffect(() => {
      if (spriteRef.current && currentRenderDimensions) {
        spriteRef.current.scale.set(
          currentRenderDimensions[0],
          currentRenderDimensions[1],
          1
        );
      }
    }, [currentRenderDimensions]);

    useFrame(({ camera: frameCamera }) => {
      if (!spriteRef.current) return;
      
      // Calculate distance every frame for smooth scaling
      const distance = frameCamera.position.distanceTo(
        spriteRef.current.position
      );
      
      // Check if sprite is within render distance every frame (critical for visibility)
      isWithinRenderDistanceRef.current = distance < MAX_RENDER_DISTANCE;
      
      // Calculate distance-based scale - immediate change at threshold
      if (distance >= SCALE_DISTANCE_START) {
        distanceScaleRef.current = MIN_SCALE; // Jump to half size immediately
      } else {
        distanceScaleRef.current = 1.0; // Full size when close
      }
      
      // Apply scale to sprite every frame
      const baseScale = currentRenderDimensions;
      const scale = distanceScaleRef.current;
      
      if (isWithinRenderDistanceRef.current) {
        // Normal scale based on distance
        spriteRef.current.scale.set(
          baseScale[0] * scale,
          baseScale[1] * scale,
          1
        );
      } else {
        // Make invisible when out of render distance
        spriteRef.current.scale.set(0.001, 0.001, 0.001);
      }
      
      // Debounce quality checks to improve performance
      distanceCheckCounter.current++;
      if (distanceCheckCounter.current < DISTANCE_CHECK_INTERVAL) {
        return;
      }
      distanceCheckCounter.current = 0;
      
      // Skip quality switching if no variants exist - just use single texture
      if (!hasVariants) {
        return;
      }
      
      // Determine quality level based on distance with hysteresis
      // High quality is ONLY loaded on click, never automatically
      const currentQualityRef = qualityLevelRef.current;
      
      let desiredQuality;
      
      // If high quality was requested (clicked), maintain it when close enough
      if (highQualityRequested && distance < HIGH_DOWNGRADE_DISTANCE) {
        desiredQuality = 'high';
      } else if (distance < THUMBNAIL_UPGRADE_DISTANCE) {
        // Close enough for medium quality
        desiredQuality = 'medium';
      } else if (distance < MEDIUM_DOWNGRADE_DISTANCE) {
        // In medium range - stay at medium if already there, otherwise use thumbnail
        desiredQuality = currentQualityRef === 'medium' ? 'medium' : 'thumbnail';
      } else {
        // Far away - always use thumbnail
        desiredQuality = 'thumbnail';
      }

      // Only update state if quality actually changed
      if (currentQualityRef !== desiredQuality) {
        qualityLevelRef.current = desiredQuality;
        setCurrentQuality(desiredQuality);
      }
    });

    // Determine the texture to use based on quality level and what's loaded
    const materialTexture = useMemo(() => {
      // If no variants, use low-res first, then upgrade to thumbnail/original
      if (!hasVariants) {
        // Prefer thumbnail if loaded, otherwise use low-res placeholder
        return thumbnailTexture || lowResTexture;
      }
      
      // With variants: select based on quality level and what's loaded
      if (currentQuality === 'high' && highTexture) {
        return highTexture;
      }
      // If high quality requested but not loaded yet, keep medium to avoid flicker
      if (currentQuality === 'high' && !highTexture && mediumTexture) {
        return mediumTexture;
      }
      if (currentQuality === 'medium' && mediumTexture) {
        return mediumTexture;
      }
      if (currentQuality === 'medium' && !mediumTexture && highTexture) {
        // If medium requested but not loaded, use high if available
        return highTexture;
      }
      // Default to thumbnail, or low-res if thumbnail not ready yet
      return thumbnailTexture || lowResTexture;
    }, [lowResTexture, thumbnailTexture, mediumTexture, highTexture, currentQuality, hasVariants]);

    const handleDelete = () => onDelete(originalIndex);
    
    // Handle click - request high quality and call original onClick
    const handleClick = (event) => {
      // Request high quality texture on click
      if (!highQualityRequested) {
        setHighQualityRequested(true);
        qualityLevelRef.current = 'high';
        setCurrentQuality('high');
      }
      // Call original onClick handler
      if (onClick) {
        onClick(event);
      }
    };

    // Create lightweight rounded material only when texture changes
    const spriteMaterial = useMemo(() => {
      if (!materialTexture) return null;
      
      // Verify texture has valid image data before creating material
      if (!materialTexture.image || materialTexture.image.width === 0 || materialTexture.image.height === 0) {
        return null;
      }
      
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
    // 1. At least a texture must be loaded (low-res or thumbnail)
    // 2. The texture to be mapped must be available and valid
    // 3. Material must be successfully created
    if (!materialTexture || !spriteMaterial) {
      return null;
    }

    // Additional validation - ensure texture has valid image data
    if (!materialTexture.image || materialTexture.image.width === 0 || materialTexture.image.height === 0) {
      return null;
    }

    // Render sprite invisible if out of range or no texture, but keep component mounted
    const shouldRenderVisible = materialTexture && spriteMaterial && isWithinRenderDistanceRef.current;

    return (
      <sprite
        position={position}
        ref={spriteRef} // Ensure internal spriteRef is used for consistent distance calculation
        // Don't set scale prop here - it's controlled by useFrame for distance-based scaling
        userData={{ originalIndex }}
        onClick={handleClick}
        visible={shouldRenderVisible}
      >
        {shouldRenderVisible && spriteMaterial && (
          <primitive object={spriteMaterial} attach="material" />
        )}
        {isAdmin &&
          materialTexture &&
          currentQuality === 'high' &&
          shouldRenderVisible && ( // Only render delete button when close (high quality)
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
