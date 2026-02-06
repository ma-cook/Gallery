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
  cleanupOrphanedImages,
} from './firebaseFunctions';
import {
  calculateSpherePositions,
  calculatePlanePositions,
} from './utils/layoutFunctions';
import { handleSignIn, checkIsAdmin } from './utils/authFunctions';

import OrbLight from './components/OrbLight';
import SettingsModal from './components/SettingsModal';
import UIOverlay from './components/UIOverlay';
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

  const CustomEnvironment = React.memo(() => {
    return (
      <Environment
        background
        backgroundBlurriness={0.02}
        backgroundIntensity={0.08}
        files="/syferfontein_1d_clear_puresky_4k.hdr"
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
      <CustomCamera targetPosition={targetPosition} cameraOffset={cameraOffset} />
      <CustomEnvironment />
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
  const layout = useStore((state) => state.layout);
  const setLayout = useStore((state) => state.setLayout);
  const interpolationFactor = useStore((state) => state.interpolationFactor);
  const setInterpolationFactor = useStore(
    (state) => state.setInterpolationFactor
  );
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
  const uploadProgress = useStore((state) => state.uploadProgress);
  const setUploadProgress = useStore((state) => state.setUploadProgress);
  const visibleImageIndices = useStore((state) => state.visibleImageIndices);
  const setVisibleImageIndices = useStore(
    (state) => state.setVisibleImageIndices
  );

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSquareVisible, setIsSquareVisible] = useState(false);
  const [adaptiveDPR, setAdaptiveDPR] = useState([1, 1.5]); // Experimental: Adaptive pixel ratio

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

  const imagesPositions = useMemo(() => {
    const spherePositions = calculateSpherePositions(images, sphereRadius);
    const planePositions = calculatePlanePositions(images);
    return images.map((_, index) => {
      const spherePos = vector3Pool.acquire().fromArray(spherePositions[index]);
      const planePos = vector3Pool.acquire().fromArray(planePositions[index]);
      const result = spherePos.lerp(planePos, interpolationFactor).toArray();
      vector3Pool.release(spherePos);
      vector3Pool.release(planePos);
      return result;
    });
  }, [interpolationFactor, images, sphereRadius]);

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

  useEffect(() => {
    const fetchData = async () => {
      const [
        imagesData,
        backgroundColorData,
        glowColorData,
        titleOrbColorData,
        textColorData,
        titleColorData,
        buttonPrimaryColorData,
        buttonSecondaryColorData,
      ] = await Promise.all([
        fetchImages(),
        fetchColor(),
        fetchOrbColor(),
        fetchTitleOrbColor(),
        fetchTextColor(),
        fetchTitleColor(),
        fetchButtonPrimaryColor(),
        fetchButtonSecondaryColor(),
      ]);
      setImages(imagesData);
      setBackgroundColor(backgroundColorData);
      setGlowColor(glowColorData);
      setTitleOrbColor(titleOrbColorData);
      setTextColor(textColorData);
      setTitleColor(titleColorData);
      setButtonPrimaryColor(buttonPrimaryColorData);
      setButtonSecondaryColor(buttonSecondaryColorData);
    };

    fetchData();
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

  const triggerTransition = useCallback(
    (targetLayout) => {
      setLayout(targetLayout);
      let start = null;
      const duration = 1000;

      const animate = (timestamp) => {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const factor = Math.min(elapsed / duration, 1);
        setInterpolationFactor(targetLayout === 'sphere' ? 1 - factor : factor);
        if (elapsed < duration) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    },
    [setLayout, setInterpolationFactor]
  );

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
      await deleteImage(image.id, image.url);
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
    <div style={{ height: '100vh', position: 'relative' }}>
      <UIOverlay
        user={user}
        isAdmin={isAdmin}
        uploadProgress={uploadProgress}
        textColor={textColor}
        titleColor={titleColor}
        buttonPrimaryColor={buttonPrimaryColor}
        buttonSecondaryColor={buttonSecondaryColor}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        isSquareVisible={isSquareVisible}
        setIsSquareVisible={setIsSquareVisible}
        triggerTransition={triggerTransition}
        handleFileChangeWithProgress={handleFileChangeWithProgress}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        setImages={setImages}
        isAuthModalOpen={isAuthModalOpen}
        setIsAuthModalOpen={setIsAuthModalOpen}
        onSignIn={(email, password) =>
          handleSignIn(email, password, setIsAuthModalOpen)
        }
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onGlowColorChange={setGlowColor}
        onTextColorChange={setTextColor}
        onTitleColorChange={setTitleColor}
        onButtonPrimaryColorChange={setButtonPrimaryColor}
        onButtonSecondaryColorChange={setButtonSecondaryColor}
      />
      <Loader />
      <SceneCanvas
        backgroundColor={backgroundColor}
        targetPosition={targetPosition}
        cameraOffset={cameraOffset}
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
        VISIBLE_DISTANCE_THRESHOLD={VISIBLE_DISTANCE_THRESHOLD}
      />
    </div>
  );
}

export default React.memo(App);
