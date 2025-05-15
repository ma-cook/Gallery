import React, {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
  lazy,
  useState,
} from 'react';
import { useFrame, Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import CustomCamera from './CustomCamera';
import AuthModal from './AuthModal';
import Loader from './Loader';
import WhitePlane from './WhitePlane';
import {
  fetchImages,
  handleFileChange,
  deleteImage,
  saveColor,
  fetchColor,
  fetchOrbColor,
  fetchTitleOrbColor,
  fetchTextColor,
} from './firebaseFunctions';
import {
  calculateSpherePositions,
  calculatePlanePositions,
} from './layoutFunctions';
import { handleSignIn } from './authFunctions';
import Text3DComponent from './TextComponent';
import OrbLight from './OrbLight';
import SettingsModal from './SettingsModal';
import useStore from './store';

const LazyImagePlane = lazy(() => import('./LazyImagePlane'));
const RaycasterHandler = lazy(() => import('./RaycasterHandler'));

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

// Helper function for comparing sorted arrays
function areSortedArraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

const VisibilityUpdater = ({
  allImagePositions,
  onVisibleIndicesChange,
  threshold,
}) => {
  const tempImageVec = useMemo(() => new THREE.Vector3(), []);
  const lastVisibleIndices = useRef([]);
  const lastUpdateTime = useRef(0);
  const frameSkip = useRef(0);

  const FRAME_SKIP = 60;

  const frustum = useMemo(() => new THREE.Frustum(), []);
  const projScreenMatrix = useMemo(() => new THREE.Matrix4(), []);

  const outOfViewCounters = useRef({});
  const OUT_OF_VIEW_THRESHOLD = 30;

  useFrame(({ camera, clock }) => {
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

    allImagePositions.forEach((posArray, index) => {
      if (!posArray) return;

      tempImageVec.fromArray(posArray);

      if (!frustum.containsPoint(tempImageVec)) {
        if (outOfViewCounters.current[index] !== undefined) {
          outOfViewCounters.current[index]++;
        }
        return;
      }

      const distance = cameraPosition.distanceTo(tempImageVec);

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
  const uploadProgress = useStore((state) => state.uploadProgress);
  const setUploadProgress = useStore((state) => state.setUploadProgress);
  const visibleImageIndices = useStore((state) => state.visibleImageIndices);
  const setVisibleImageIndices = useStore(
    (state) => state.setVisibleImageIndices
  );

  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const VISIBLE_DISTANCE_THRESHOLD = 130;

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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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
      ] = await Promise.all([
        fetchImages(),
        fetchColor(),
        fetchOrbColor(),
        fetchTitleOrbColor(),
        fetchTextColor(),
      ]);
      setImages(imagesData);
      setBackgroundColor(backgroundColorData);
      setGlowColor(glowColorData);
      setTitleOrbColor(titleOrbColorData);
      setTextColor(textColorData);
    };

    fetchData();
  }, []);

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

          setTargetPosition(newTargetPosition);
        }
      }
    },
    [imagesPositions, setTargetPosition]
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
        setVisibleImageIndices(newIndices);
      } else {
        console.error(
          'handleVisibleIndicesChange received non-array input:',
          newIndices
        );
        setVisibleImageIndices([]);
      }
    },
    [setVisibleImageIndices]
  );

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <input
        type="file"
        id="fileInput"
        style={{ display: 'none' }}
        onChange={(event) =>
          handleFileChangeWithProgress(event, user, setImages)
        }
        accept="image/*"
        multiple
      />
      <div style={{ position: 'absolute', zIndex: 1 }}>
        {user && (
          <>
            <button
              onClick={() => document.getElementById('fileInput').click()}
              disabled={uploadProgress > 0}
            >
              Upload Image
            </button>
            <button onClick={() => setIsSettingsModalOpen(true)}>
              Settings
            </button>
          </>
        )}
      </div>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignIn={(email, password) =>
          handleSignIn(email, password, setIsAuthModalOpen)
        }
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onColorChange={handleColorChange}
        onGlowColorChange={setGlowColor}
        onLightColorChange={setLightColor}
        onTitleOrbChange={setTitleOrbColor}
        onTextColorChange={setTextColor}
      />
      {uploadProgress > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: textColor,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            padding: '15px 25px',
            borderRadius: '8px',
            fontSize: '1.2em',
            zIndex: 1000,
            textAlign: 'center',
          }}
        >
          Uploading: {Math.round(uploadProgress)} %
        </div>
      )}
      <Canvas
        style={{ background: backgroundColor }}
        antialias="true"
        pixelratio={Math.min(1.5, window.devicePixelRatio)}
        frameloop="always"
        gl={{
          powerPreference: 'high-performance',
          alpha: false,
          stencil: false,
          depth: true,
        }}
        performance={{ min: 0.5 }}
      >
        <ambientLight />
        <CustomCamera targetPosition={targetPosition} />

        <Text3DComponent
          triggerTransition={triggerTransition}
          sphereRadius={sphereRadius}
          setIsAuthModalOpen={setIsAuthModalOpen}
          titleOrbColor={titleOrbColor}
          textColor={textColor}
        />
        <Suspense fallback={<Loader />}>
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
                  user={user}
                  onDelete={handleDeleteImage}
                  isVisible={isVisible}
                />
              );
            })}
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
    </div>
  );
}

export default React.memo(App);
