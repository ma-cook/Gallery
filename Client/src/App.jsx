import React, {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
  lazy,
  useState,
  startTransition,
} from 'react';
import { useFrame, Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Stats, Environment, Bvh } from '@react-three/drei';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import CustomCamera from './components/CustomCamera';
import AuthModal from './components/AuthModal';
import Loader from './components/Loader';

import {
  fetchImages,
  subscribeToImages,
  handleFileChange,
  deleteImage,
  saveColor,
  fetchColor,
  fetchOrbColor,
  fetchTitleOrbColor,
  fetchTextColor,
  fetchTitleColor,
  fetchButtonPrimaryColor,
  fetchButtonSecondaryColor,
  fetchBackgroundBlurriness,
  fetchBackgroundIntensity,
  fetchHdrFileUrl,
  fetchSocialLinks,
  cleanupOrphanedImages,
} from './utils/firebaseFunctions';
import {
  calculateVerticalPositions,
  calculateSpherePositions,
} from './utils/layoutFunctions';
import { checkIsAdmin } from './utils/authFunctions';

import OrbLight from './components/OrbLight';
import SettingsModal from './components/SettingsModal';
import UIOverlay from './components/UIOverlay';
import IntroOverlay from './components/IntroOverlay';
import { signOutUser } from './utils/Auth';
import useStore from './store';
import { textureLoadQueue } from './utils/TextureLoadQueue';
import { performanceMonitor } from './utils/PerformanceMonitor';

const LazyImagePlane = lazy(() => import('./components/LazyImagePlane'));
const RaycasterHandler = lazy(() => import('./components/RaycasterHandler'));

const auth = getAuth();

class Vector3Pool {
  constructor() {
    this.pool = [];
  }

  acquire() {
    return this.pool.length > 0 ? this.pool.pop() : new THREE.Vector3();
  }

  release(vector) {
    vector.set(0, 0, 0);
    this.pool.push(vector);
  }
}

const vector3Pool = new Vector3Pool();

  const CustomEnvironment = React.memo(({ backgroundBlurriness, backgroundIntensity, hdrFileUrl }) => {
    return (
      <Environment
        background
        backgroundBlurriness={backgroundBlurriness}
        backgroundIntensity={backgroundIntensity}
        files={hdrFileUrl}
        preset={null}
      />
    );
  });

// Helper function for comparing sorted arrays
function areSortedArraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Helper component to manage background color via WebGL clear color
// This allows the environment map to be visible while providing a fallback color
const BackgroundColor = ({ color }) => {
  const { gl } = useThree();
  useEffect(() => {
    gl.setClearColor(color);
  }, [gl, color]);
  return null;
};

// Memoized Canvas component to prevent re-renders when images change
const SceneCanvas = React.memo(({ 
  backgroundColor, 
  targetPosition, 
  cameraOffset,
  scrollProgress,
  scrollYRange,
  sphereTransition,
  images, 
  imagesPositions, 
  visibleImageIndicesSet,
  handleImageClick,
  handleOrbClick,
  handleDeleteImage,
  handleVisibleIndicesChange,
  user,
  isAdmin,
  glowColor,
  backgroundBlurriness,
  backgroundIntensity,
  hdrFileUrl,
  VISIBLE_DISTANCE_THRESHOLD
}) => {
  const glConfig = useMemo(() => ({
    powerPreference: 'high-performance',
    alpha: false,
    stencil: false,
    depth: true,
    antialias: false,
    preserveDrawingBuffer: false,
    logarithmicDepthBuffer: false,
    // Allow fallback to WebGL 1 for older GPUs
    failIfMajorPerformanceCaveat: false,
  }), []);

  return (
    <Canvas
      frameloop="always"
      gl={glConfig}
      performance={{ min: 0.5 }}
      onCreated={({ gl }) => {
        // Suppress WebGL 1 deprecation warning in console (cosmetic only)
        console.log('WebGL renderer initialized:', gl.capabilities.isWebGL2 ? 'WebGL 2' : 'WebGL 1');
      }}
    >
      <BackgroundColor color={backgroundColor} />
      <CustomCamera targetPosition={targetPosition} cameraOffset={cameraOffset} scrollProgress={scrollProgress} scrollYRange={scrollYRange} sphereTransition={sphereTransition} />
      <CustomEnvironment backgroundBlurriness={backgroundBlurriness} backgroundIntensity={backgroundIntensity} hdrFileUrl={hdrFileUrl} />
      <OrbLight glowColor={glowColor} onOrbClick={handleOrbClick} />
      
      <Suspense fallback={<Loader />}>
        <Bvh firstHitOnly>
          {images.length > 0 &&
            imagesPositions.length > 0 &&
            images.map((image, index) => {
              const position = imagesPositions[index];

              if (!image || !position) {
                return null;
              }

              const key = image.id ? `image-${image.id}` : `image-${index}`;
              const imageUrl = image.url;

              if (!imageUrl) {
                return null;
              }

              const isVisible = visibleImageIndicesSet.has(index);

              return (
                <LazyImagePlane
                  key={key}
                  originalIndex={index}
                  position={position}
                  onClick={() => handleImageClick(index)}
                  imageUrl={imageUrl}
                  thumbnailUrl={image.thumbnailUrl}
                  mediumUrl={image.mediumUrl}
                  isGif={image.isGif}
                  user={user}
                  isAdmin={isAdmin}
                  onDelete={handleDeleteImage}
                  isVisible={isVisible}
                />
              );
            })}
        </Bvh>
        <RaycasterHandler
          images={imagesPositions}
          handleImageClick={handleImageClick}
        />
        {images.length > 0 && imagesPositions.length > 0 && (
          <VisibilityUpdater
            allImagePositions={imagesPositions}
            onVisibleIndicesChange={handleVisibleIndicesChange}
            threshold={VISIBLE_DISTANCE_THRESHOLD}
          />
        )}
      </Suspense>
    </Canvas>
  );
});

const VisibilityUpdater = ({
  allImagePositions,
  onVisibleIndicesChange,
  threshold,
}) => {
  const tempImageVec = useMemo(() => new THREE.Vector3(), []);
  const lastVisibleIndices = useRef([]);
  const lastUpdateTime = useRef(0);
  const frameSkip = useRef(0);
  const lastCameraPosition = useRef(new THREE.Vector3());
  const cameraVelocity = useRef(0);

  // Experimental: Adaptive frame skip based on camera velocity and texture loading
  const getFrameSkipInterval = (camera) => {
    // Calculate camera movement
    const currentPos = camera.position;
    const distance = currentPos.distanceTo(lastCameraPosition.current);
    cameraVelocity.current = distance;
    lastCameraPosition.current.copy(currentPos);
    
    const isMovingFast = cameraVelocity.current > 0.3;
    const isLoading = textureLoadQueue.isLoading();
    
    // Experimental: Drastically reduce visibility checks during fast movement
    if (isMovingFast && isLoading) return 120; // Skip 120 frames (~2 seconds at 60fps)
    if (isMovingFast) return 90; // Skip 90 frames when moving fast
    if (isLoading) return 60; // Skip 60 frames when loading
    return 30; // Normal skip interval (was 45)
  };

  const frustum = useMemo(() => new THREE.Frustum(), []);
  const projScreenMatrix = useMemo(() => new THREE.Matrix4(), []);

  const outOfViewCounters = useRef({});
  const OUT_OF_VIEW_THRESHOLD = 20;

  useFrame(({ camera, clock }, delta) => {
    // Experimental: Record frame performance
    performanceMonitor.recordFrame(delta);
    
    const FRAME_SKIP = getFrameSkipInterval(camera);
    frameSkip.current = (frameSkip.current + 1) % FRAME_SKIP;
    if (frameSkip.current !== 0) return;

    if (!allImagePositions || allImagePositions.length === 0) {
      if (lastVisibleIndices.current.length > 0) {
        onVisibleIndicesChange([]);
        lastVisibleIndices.current = [];
      }
      return;
    }

    const newVisibleIndicesSet = new Set();
    const cameraPosition = camera.position;

    projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(projScreenMatrix);

    lastVisibleIndices.current.forEach((index) => {
      outOfViewCounters.current[index] = outOfViewCounters.current[index] || 0;
    });

    // Optimize loop with early distance check
    allImagePositions.forEach((posArray, index) => {
      if (!posArray) return;

      tempImageVec.fromArray(posArray);

      // Quick distance check before frustum check for better performance
      const distanceSq = cameraPosition.distanceToSquared(tempImageVec);
      const thresholdSq = threshold * threshold;

      if (distanceSq > thresholdSq * 4) { // Early exit for very distant objects
        if (outOfViewCounters.current[index] !== undefined) {
          outOfViewCounters.current[index]++;
        }
        return;
      }

      if (!frustum.containsPoint(tempImageVec)) {
        if (outOfViewCounters.current[index] !== undefined) {
          outOfViewCounters.current[index]++;
        }
        return;
      }

      const distance = Math.sqrt(distanceSq); // Only calculate sqrt when needed

      if (distance < threshold) {
        newVisibleIndicesSet.add(index);
        outOfViewCounters.current[index] = 0;
      } else if (outOfViewCounters.current[index] !== undefined) {
        outOfViewCounters.current[index]++;
      }
    });

    const finalVisibleIndicesWorkingSet = new Set(newVisibleIndicesSet);
    Object.entries(outOfViewCounters.current).forEach(([indexStr, count]) => {
      const idx = parseInt(indexStr);
      if (!newVisibleIndicesSet.has(idx) && count < OUT_OF_VIEW_THRESHOLD) {
        finalVisibleIndicesWorkingSet.add(idx);
      }
    });

    const finalVisibleIndicesArray = Array.from(
      finalVisibleIndicesWorkingSet
    ).sort((a, b) => a - b);

    Object.keys(outOfViewCounters.current).forEach((index) => {
      if (outOfViewCounters.current[index] >= OUT_OF_VIEW_THRESHOLD) {
        delete outOfViewCounters.current[index];
      }
    });

    if (
      !areSortedArraysEqual(
        lastVisibleIndices.current,
        finalVisibleIndicesArray
      )
    ) {
      lastVisibleIndices.current = finalVisibleIndicesArray;
      onVisibleIndicesChange(finalVisibleIndicesArray);
    }
  });

  return null;
};

function App() {
  const lastClickTime = useRef(0);

  const images = useStore((state) => state.images);
  const setImages = useStore((state) => state.setImages);
  const isSettingsModalOpen = useStore((state) => state.isSettingsModalOpen);
  const setIsSettingsModalOpen = useStore(
    (state) => state.setIsSettingsModalOpen
  );
  const scrollProgress = useStore((state) => state.scrollProgress);
  const setScrollProgress = useStore((state) => state.setScrollProgress);
  const targetPosition = useStore((state) => state.targetPosition);
  const setTargetPosition = useStore((state) => state.setTargetPosition);
  const cameraOffset = useStore((state) => state.cameraOffset);
  const setCameraOffset = useStore((state) => state.setCameraOffset);
  const backgroundColor = useStore((state) => state.backgroundColor);
  const setBackgroundColor = useStore((state) => state.setBackgroundColor);
  const glowColor = useStore((state) => state.glowColor);
  const setGlowColor = useStore((state) => state.setGlowColor);
  const lightColor = useStore((state) => state.lightColor);
  const setLightColor = useStore((state) => state.setLightColor);
  const titleOrbColor = useStore((state) => state.titleOrbColor);
  const setTitleOrbColor = useStore((state) => state.setTitleOrbColor);
  const textColor = useStore((state) => state.textColor);
  const setTextColor = useStore((state) => state.setTextColor);
  const titleColor = useStore((state) => state.titleColor);
  const setTitleColor = useStore((state) => state.setTitleColor);
  const buttonPrimaryColor = useStore((state) => state.buttonPrimaryColor);
  const setButtonPrimaryColor = useStore((state) => state.setButtonPrimaryColor);
  const buttonSecondaryColor = useStore((state) => state.buttonSecondaryColor);
  const setButtonSecondaryColor = useStore((state) => state.setButtonSecondaryColor);
  const backgroundBlurriness = useStore((state) => state.backgroundBlurriness);
  const setBackgroundBlurriness = useStore((state) => state.setBackgroundBlurriness);
  const backgroundIntensity = useStore((state) => state.backgroundIntensity);
  const setBackgroundIntensity = useStore((state) => state.setBackgroundIntensity);
  const hdrFileUrl = useStore((state) => state.hdrFileUrl);
  const setHdrFileUrl = useStore((state) => state.setHdrFileUrl);
  const setSocialLinks = useStore((state) => state.setSocialLinks);
  const uploadProgress = useStore((state) => state.uploadProgress);
  const setUploadProgress = useStore((state) => state.setUploadProgress);
  const visibleImageIndices = useStore((state) => state.visibleImageIndices);
  const setVisibleImageIndices = useStore(
    (state) => state.setVisibleImageIndices
  );

  // Auth & UI state from Zustand store (eliminates prop drilling)
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const isAdmin = useStore((state) => state.isAdmin);
  const setIsAdmin = useStore((state) => state.setIsAdmin);
  const setIsAuthModalOpen = useStore((state) => state.setIsAuthModalOpen);
  const setIsCommissionVisible = useStore((state) => state.setIsCommissionVisible);
  const setPendingPayRequestId = useStore((state) => state.setPendingPayRequestId);
  const socialLinks = useStore((state) => state.socialLinks);

  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [isCollectionOpen, setIsCollectionOpen] = useState(false);
  const [adaptiveDPR, setAdaptiveDPR] = useState([1, 1.5]); // Experimental: Adaptive pixel ratio

  // Scroll & transition state
  const overlayRef = useRef(null);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const animFrameRef = useRef(null);
  const transitionCurrentRef = useRef(0);
  const transitionTargetRef = useRef(0);

  // Window scroll listener for page-based scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!overlayRef.current) return;
      const rect = overlayRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.max(0, Math.min(1, 1 - (rect.bottom / vh)));
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [setScrollProgress]);

  // Gradual smooth lerp: transitionProgress smoothly chases scrollProgress
  const smoothAnimRef = useRef(null);
  useEffect(() => {
    transitionTargetRef.current = scrollProgress;

    if (!smoothAnimRef.current) {
      const animate = () => {
        const diff = transitionTargetRef.current - transitionCurrentRef.current;
        if (Math.abs(diff) > 0.002) {
          transitionCurrentRef.current += diff * 0.06;
          setTransitionProgress(transitionCurrentRef.current);
          smoothAnimRef.current = requestAnimationFrame(animate);
        } else {
          transitionCurrentRef.current = transitionTargetRef.current;
          setTransitionProgress(transitionTargetRef.current);
          smoothAnimRef.current = null;
        }
      };
      smoothAnimRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (smoothAnimRef.current) {
        cancelAnimationFrame(smoothAnimRef.current);
        smoothAnimRef.current = null;
      }
    };
  }, [scrollProgress]);

  // Experimental: Monitor performance and adjust quality
  useEffect(() => {
    const unsubscribe = performanceMonitor.onQualityChange((quality) => {
      // Reduce pixel ratio if performance is poor
      if (quality < 0.8) {
        setAdaptiveDPR([0.75, 1]);
      } else if (quality < 0.9) {
        setAdaptiveDPR([1, 1.25]);
      } else {
        setAdaptiveDPR([1, 1.5]);
      }
    });
    return unsubscribe;
  }, []);

  const VISIBLE_DISTANCE_THRESHOLD = 1000; // Increased to load thumbnails before sprites are visible (render distance is 300)

  const sphereRadius = useMemo(() => 10 + images.length * 0.3, [images.length]);

  const columnPositions = useMemo(() => calculateVerticalPositions(images), [images]);

  const spherePositions = useMemo(() => calculateSpherePositions(images, sphereRadius), [images, sphereRadius]);

  // Sphere transition: stays at 0 during column scroll, ramps up near the end
  const sphereTransition = useMemo(() => {
    return Math.max(0, Math.min(1, (transitionProgress - 0.7) / 0.3));
  }, [transitionProgress]);

  const imagesPositions = useMemo(() => {
    return images.map((_, index) => {
      const colPos = vector3Pool.acquire().fromArray(columnPositions[index]);
      const sphPos = vector3Pool.acquire().fromArray(spherePositions[index]);
      const result = colPos.lerp(sphPos, sphereTransition).toArray();
      vector3Pool.release(colPos);
      vector3Pool.release(sphPos);
      return result;
    });
  }, [sphereTransition, images, columnPositions, spherePositions]);

  const scrollYRange = useMemo(() => {
    if (columnPositions.length === 0) return { min: 0, max: 20 };
    const ys = columnPositions.map(p => p[1]);
    return { min: Math.min(...ys), max: Math.max(...ys) };
  }, [columnPositions]);

  const visibleImageIndicesSet = useMemo(
    () => new Set(visibleImageIndices),
    [visibleImageIndices]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Check if user is admin
      if (currentUser) {
        const adminStatus = await checkIsAdmin(currentUser);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle deep-link: ?pay=requestId opens CommissionModal with PaymentModal for that request
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payId = params.get('pay');
    if (payId) {
      setPendingPayRequestId(payId);
      setIsCommissionVisible(true);
      // Remove the query param from the URL without triggering a navigation
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    // Subscribe to real-time image updates so variant URLs written by the
    // Cloud Function (thumbnailUrl, mediumUrl) are picked up automatically
    // without requiring a page refresh.
    const unsubscribeImages = subscribeToImages((imagesData) => {
      setImages(imagesData);
    });

    const fetchData = async () => {
      const [
        backgroundColorData,
        glowColorData,
        titleOrbColorData,
        textColorData,
        titleColorData,
        buttonPrimaryColorData,
        buttonSecondaryColorData,
        backgroundBlurrinessData,
        backgroundIntensityData,
        hdrFileUrlData,
        socialLinksData,
      ] = await Promise.all([
        fetchColor(),
        fetchOrbColor(),
        fetchTitleOrbColor(),
        fetchTextColor(),
        fetchTitleColor(),
        fetchButtonPrimaryColor(),
        fetchButtonSecondaryColor(),
        fetchBackgroundBlurriness(),
        fetchBackgroundIntensity(),
        fetchHdrFileUrl(),
        fetchSocialLinks(),
      ]);
      setBackgroundColor(backgroundColorData);
      setGlowColor(glowColorData);
      setTitleOrbColor(titleOrbColorData);
      setTextColor(textColorData);
      setTitleColor(titleColorData);
      setButtonPrimaryColor(buttonPrimaryColorData);
      setButtonSecondaryColor(buttonSecondaryColorData);
      setBackgroundBlurriness(backgroundBlurrinessData);
      setBackgroundIntensity(backgroundIntensityData);
      setHdrFileUrl(hdrFileUrlData);
      setSocialLinks(socialLinksData);
    };

    fetchData();
    return () => unsubscribeImages();
  }, []);

  // Expose cleanup function to window for manual debugging only
  useEffect(() => {
    window.cleanupOrphanedImages = async () => {
      console.log('Running manual cleanup...');
      const count = await cleanupOrphanedImages();
      if (count > 0) {
        console.log(`Cleanup complete. Deleted ${count} documents. Reloading images...`);
        const imagesData = await fetchImages();
        setImages(imagesData);
      } else {
        console.log('No orphaned images found.');
      }
      return count;
    };
    
    // Expose function to check optimization status
    window.checkOptimization = () => {
      const total = images.length;
      const optimized = images.filter(img => img.thumbnailUrl && img.mediumUrl).length;
      const notOptimized = total - optimized;
      
      console.log('📊 Image Optimization Status:');
      console.log(`  Total images: ${total}`);
      console.log(`  ✅ Optimized (has variants): ${optimized}`);
      console.log(`  ⚠️  Not optimized: ${notOptimized}`);
      
      if (notOptimized > 0) {
        console.log('\n📝 To enable optimization:');
        console.log('  1. cd Client/functions && npm install');
        console.log('  2. firebase deploy --only functions');
        console.log('  3. Re-upload images or run batch process');
        console.log('\nSee BANDWIDTH_OPTIMIZATION.md for details');
      } else {
        console.log('\n🎉 All images optimized!');
      }
      
      return { total, optimized, notOptimized };
    };
  }, [images]);

  const handleImageClick = useCallback(
    (index) => {
      const now = Date.now();
      if (now - lastClickTime.current < 100) {
        return;
      }
      lastClickTime.current = now;

      if (index >= 0 && index < imagesPositions.length) {
        const imagePosition = imagesPositions[index];
        if (Array.isArray(imagePosition)) {
          const newTargetPosition = new THREE.Vector3().fromArray(
            imagePosition
          );

          setCameraOffset(8); // Normal offset for images
          setTargetPosition(newTargetPosition);
        }
      }
    },
    [imagesPositions, setTargetPosition, setCameraOffset]
  );

  const handleOrbClick = useCallback(
    (position) => {
      const now = Date.now();
      if (now - lastClickTime.current < 100) {
        return;
      }
      lastClickTime.current = now;

      const newTargetPosition = new THREE.Vector3().fromArray(position);
      setCameraOffset(16); // Twice as far back for orbs
      setTargetPosition(newTargetPosition);
    },
    [setTargetPosition, setCameraOffset]
  );

  const handleDeleteImage = useCallback(
    async (index) => {
      const image = images[index];
      await deleteImage(image.id, image.url, image.thumbnailUrl, image.mediumUrl);
      setImages((prevImages) => prevImages.filter((_, i) => i !== index));
    },
    [images, setImages]
  );

  const handleColorChange = useCallback(
    async (color) => {
      setBackgroundColor(color);
      await saveColor(color);
    },
    [setBackgroundColor]
  );

  const handleFileChangeWithProgress = useCallback(
    async (event, user, setImagesFn) => {
      const files = event.target.files;
      if (!files || files.length === 0) {
        setUploadProgress(0);
        return;
      }

      setUploadProgress(1);

      const uploadPromises = Array.from(files).map((file) => {
        return new Promise((resolve) => {
          const uploadTask = handleFileChange(file, user, setImagesFn);

          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress =
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              resolve({ success: false, file: file.name, error });
            },
            () => {
              resolve({ success: true, file: file.name });
            }
          );
        });
      });

      try {
        const results = await Promise.all(uploadPromises);
        const allSucceeded = results.every((r) => r.success);
        if (allSucceeded) {
        } else {
        }
      } catch (error) {
      } finally {
        setUploadProgress(0);
      }
    },
    [setUploadProgress]
  );

  const FooterContent = ({ socialLinks, textColor, onOpenLegal }) => {
    const getSocialIcon = (platform) => {
      const iconProps = { width: "20", height: "20", fill: textColor, style: { filter: 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.5))' } };
      switch(platform) {
        case 'x': return <svg {...iconProps} viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
        case 'instagram': return <svg {...iconProps} viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>;
        case 'reddit': return <svg {...iconProps} viewBox="0 0 24 24"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>;
        case 'youtube': return <svg {...iconProps} viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>;
        case 'discord': return <svg {...iconProps} viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>;
        case 'email': return <svg {...iconProps} viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>;
        default: return null;
      }
    };

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {socialLinks && socialLinks.length > 0 && socialLinks.map((link) => (
          <a
            key={link.id}
            href={link.platform === 'email' ? `mailto:${link.url}` : link.url}
            target={link.platform === 'email' ? '_self' : '_blank'}
            rel={link.platform === 'email' ? '' : 'noopener noreferrer'}
            style={{ cursor: 'pointer', opacity: 0.9, transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {getSocialIcon(link.platform)}
          </a>
        ))}
        {socialLinks && socialLinks.length > 0 && (
          <div style={{ width: '1px', height: '16px', background: textColor, opacity: 0.3 }} />
        )}
        <button
          onClick={onOpenLegal}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.7,
            transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.transform = 'scale(1)'; }}
          title="Legal & Policies"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.5))' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </button>
      </div>
    );
  };

  const TopBar = () => {
    const user = useStore((state) => state.user);
    const isAdmin = useStore((state) => state.isAdmin);
    const textColor = useStore((state) => state.textColor);
    const titleColor = useStore((state) => state.titleColor);
    const setIsSettingsModalOpen = useStore((state) => state.setIsSettingsModalOpen);
    const setIsAuthModalOpen = useStore((state) => state.setIsAuthModalOpen);
    const setIsCommissionVisible = useStore((state) => state.setIsCommissionVisible);
    const setIsRequestsVisible = useStore((state) => state.setIsRequestsVisible);
    const setIsProductsVisible = useStore((state) => state.setIsProductsVisible);

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth <= 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (isMobile) {
      return (
        <div style={{ pointerEvents: 'auto' }}>
          <h1 style={{
            margin: 0, fontSize: '36px', fontFamily: "'Great Vibes', 'Tangerine', cursive",
            color: titleColor, textShadow: '2px 2px 8px rgba(0, 0, 0, 0.7)',
            letterSpacing: '1px', fontWeight: 400, textAlign: 'center',
          }}>
            Puppy Seal
          </h1>
        </div>
      );
    }

    return (
      <div style={{
        pointerEvents: 'auto', width: '100%', display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: 'min(1200px, 92vw)',
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(12px)',
          borderRadius: '20px',
          padding: '14px 28px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}>
          {/* Left: Admin buttons */}
          <div style={{ display: 'flex', gap: '28px', alignItems: 'center', flex: '0 0 auto' }}>
            {isAdmin && (
              <>
                <span style={{ color: textColor, fontSize: '12px', cursor: 'pointer', textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)' }}
                  onClick={() => document.getElementById('fileInput').click()}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>upload</span>
                <span style={{ color: textColor, fontSize: '12px', cursor: 'pointer', textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)' }}
                  onClick={() => { setIsSettingsModalOpen(true); setIsRequestsVisible(false); setIsProductsVisible(false); setIsCommissionVisible(false); setIsAuthModalOpen(false); }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>settings</span>
                <span style={{ color: textColor, fontSize: '12px', cursor: 'pointer', textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)' }}
                  onClick={() => { setIsRequestsVisible(true); setIsProductsVisible(false); setIsCommissionVisible(false); setIsAuthModalOpen(false); }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>requests</span>
                <span style={{ color: textColor, fontSize: '12px', cursor: 'pointer', textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)' }}
                  onClick={() => { setIsProductsVisible(true); setIsRequestsVisible(false); setIsCommissionVisible(false); setIsAuthModalOpen(false); }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>products</span>
              </>
            )}
          </div>

          {/* Center: Title */}
          <h1 style={{
            margin: 0, fontSize: '48px', fontFamily: "'Great Vibes', 'Tangerine', cursive",
            color: titleColor, textShadow: '2px 2px 8px rgba(0, 0, 0, 0.7)',
            letterSpacing: '2px', fontWeight: 400, position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          }}>
            Puppy Seal
          </h1>

          {/* Right: Commission + Auth buttons */}
          <div style={{ display: 'flex', gap: '28px', alignItems: 'center', flex: '0 0 auto' }}>
            <span style={{ color: textColor, fontSize: '12px', cursor: 'pointer', textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)' }}
              onClick={() => { setIsCommissionVisible(true); setIsRequestsVisible(false); setIsProductsVisible(false); setIsAuthModalOpen(false); }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>Commission</span>

            {user ? (
              <>
                <span style={{ color: textColor, fontSize: '12px', cursor: 'pointer', textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)' }}
                  onClick={() => { setIsCollectionOpen(true); setIsCommissionVisible(false); setIsRequestsVisible(false); setIsProductsVisible(false); setIsAuthModalOpen(false); }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>Collection</span>
                <span style={{ color: textColor, fontSize: '12px', textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)' }}>|</span>
                <span style={{ color: textColor, fontSize: '12px', cursor: 'pointer', textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)' }}
                  onClick={signOutUser}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>sign out</span>
              </>
            ) : (
              <>
                <span style={{ color: textColor, fontSize: '12px', cursor: 'pointer', textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)' }}
                  onClick={() => { setAuthMode('signin'); setIsAuthModalOpen(true); setIsRequestsVisible(false); setIsProductsVisible(false); setIsCommissionVisible(false); }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>sign in</span>
                <span style={{ color: textColor, fontSize: '12px', textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)' }}>|</span>
                <span style={{ color: textColor, fontSize: '12px', cursor: 'pointer', textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)' }}
                  onClick={() => { setAuthMode('createaccount'); setIsAuthModalOpen(true); setIsRequestsVisible(false); setIsProductsVisible(false); setIsCommissionVisible(false); }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>create account</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleVisibleIndicesChange = useCallback(
    (newIndices) => {
      if (Array.isArray(newIndices)) {
        // Use startTransition to mark this as a non-urgent update
        // This allows React to prioritize camera movement and user interactions
        startTransition(() => {
          setVisibleImageIndices(newIndices);
        });
      } else {
        console.error(
          'handleVisibleIndicesChange received non-array input:',
          newIndices
        );
        startTransition(() => {
          setVisibleImageIndices([]);
        });
      }
    },
    [setVisibleImageIndices]
  );

  return (
    <>
      {/* Fixed 3D canvas - always visible behind everything */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0 }}>
        <SceneCanvas
          backgroundColor={backgroundColor}
          targetPosition={targetPosition}
          cameraOffset={cameraOffset}
          scrollProgress={transitionProgress}
          scrollYRange={scrollYRange}
          sphereTransition={sphereTransition}
          images={images}
          imagesPositions={imagesPositions}
          visibleImageIndicesSet={visibleImageIndicesSet}
          handleImageClick={handleImageClick}
          handleOrbClick={handleOrbClick}
          handleDeleteImage={handleDeleteImage}
          handleVisibleIndicesChange={handleVisibleIndicesChange}
          user={user}
          isAdmin={isAdmin}
          glowColor={glowColor}
          backgroundBlurriness={backgroundBlurriness}
          backgroundIntensity={backgroundIntensity}
          hdrFileUrl={hdrFileUrl}
          VISIBLE_DISTANCE_THRESHOLD={VISIBLE_DISTANCE_THRESHOLD}
        />
      </div>

      {/* Fixed UI layer */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 2, pointerEvents: 'none' }}>
        {/* Top bar */}
        <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '100%', display: 'flex', justifyContent: 'center' }}>
          <TopBar />
        </div>

        <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'auto' }}>
          <UIOverlay
            handleFileChangeWithProgress={handleFileChangeWithProgress}
            isLegalModalOpen={isLegalModalOpen}
            setIsLegalModalOpen={setIsLegalModalOpen}
            authMode={authMode}
            setAuthMode={setAuthMode}
            isCollectionOpen={isCollectionOpen}
            setIsCollectionOpen={setIsCollectionOpen}
          />
        </div>
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          onGlowColorChange={setGlowColor}
          onTextColorChange={setTextColor}
          onTitleColorChange={setTitleColor}
          onButtonPrimaryColorChange={setButtonPrimaryColor}
          onButtonSecondaryColorChange={setButtonSecondaryColor}
          onBackgroundBlurrinessChange={setBackgroundBlurriness}
          onBackgroundIntensityChange={setBackgroundIntensity}
          onHdrFileUrlChange={setHdrFileUrl}
          user={user}
          isAdmin={isAdmin}
        />
        <Loader />

        {/* Footer - always visible */}
        <div style={{
          position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)',
          width: '100%', display: 'flex', justifyContent: 'center', pointerEvents: 'auto',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 'min(1200px, 92vw)',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(12px)',
            borderRadius: '20px',
            padding: '14px 28px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          }}>
            <FooterContent socialLinks={socialLinks} textColor={textColor} onOpenLegal={() => setIsLegalModalOpen(true)} />
          </div>
        </div>
      </div>

      {/* Scrollable page content - creates normal page scroll */}
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto' }}>
          <IntroOverlay ref={overlayRef} />
        </div>
        <div style={{ height: '180vh' }} />
      </div>
    </>
  );
}

export default React.memo(App);
