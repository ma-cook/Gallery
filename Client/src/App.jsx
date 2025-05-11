import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  Suspense,
  lazy,
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

// Helper component for visibility updates
const VisibilityUpdater = ({
  allImagePositions,
  onVisibleIndicesChange,
  threshold,
}) => {
  const tempImageVec = useMemo(() => new THREE.Vector3(), []);
  const lastVisibleIndices = useRef([]);

  // When an image is loaded, we don't want to remove it from the visible indices
  // until it's definitely out of view for a while
  const outOfViewCounters = useRef({});
  const OUT_OF_VIEW_THRESHOLD = 30; // frames

  useFrame(({ camera }) => {
    if (!allImagePositions || allImagePositions.length === 0) {
      onVisibleIndicesChange([]);
      return;
    }

    const newVisibleIndices = [];
    const cameraPosition = camera.position;

    // Update counters for all indices
    lastVisibleIndices.current.forEach((index) => {
      if (!outOfViewCounters.current[index]) {
        outOfViewCounters.current[index] = 0;
      }
    });

    // Check which images are in view
    allImagePositions.forEach((posArray, index) => {
      if (!posArray) return;
      tempImageVec.fromArray(posArray);
      const distance = cameraPosition.distanceTo(tempImageVec);

      if (distance < threshold) {
        newVisibleIndices.push(index);
        // Reset the counter when the image is in view
        outOfViewCounters.current[index] = 0;
      } else if (outOfViewCounters.current[index] !== undefined) {
        // Increment counter for images that were visible but now out of view
        outOfViewCounters.current[index]++;
      }
    });

    // Add images that were recently visible
    const finalVisibleIndices = [...newVisibleIndices];
    Object.entries(outOfViewCounters.current).forEach(([index, count]) => {
      const idx = parseInt(index);
      if (!newVisibleIndices.includes(idx) && count < OUT_OF_VIEW_THRESHOLD) {
        finalVisibleIndices.push(idx);
      }
    });

    // Cleanup counters that exceed threshold
    Object.keys(outOfViewCounters.current).forEach((index) => {
      if (outOfViewCounters.current[index] >= OUT_OF_VIEW_THRESHOLD) {
        delete outOfViewCounters.current[index];
      }
    });

    // Only update if the visible indices have actually changed
    if (!arraysEqual(lastVisibleIndices.current, finalVisibleIndices)) {
      lastVisibleIndices.current = finalVisibleIndices;
      onVisibleIndicesChange(finalVisibleIndices);
    }
  });

  // Helper function to compare arrays
  function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    a.sort();
    b.sort();
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  return null;
};

function App() {
  const [images, setImages] = useState([]);
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [layout, setLayout] = useState('sphere');
  const [interpolationFactor, setInterpolationFactor] = useState(0);
  const [targetPosition, setTargetPosition] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('white');
  const [glowColor, setGlowColor] = useState('#fff4d2');
  const [lightColor, setLightColor] = useState('#fff4d2');
  const [titleOrbColor, setTitleOrbColor] = useState('#fff4d2');
  const [textColor, setTextColor] = useState('#fff4d2');
  const [uploadProgress, setUploadProgress] = useState(0);
  const lastClickTime = useRef(0);
  const [visibleImageIndices, setVisibleImageIndices] = useState([]);
  const VISIBLE_DISTANCE_THRESHOLD = 130; // Increased from 75

  const sphereRadius = useMemo(() => 10 + images.length * 0.5, [images.length]);

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

  const triggerTransition = useCallback((targetLayout) => {
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
  }, []);

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
          const newTargetPosition = vector3Pool
            .acquire()
            .fromArray(imagePosition);
          vector3Pool.release(newTargetPosition);
        }
      }
    },
    [imagesPositions]
  );

  const handleDeleteImage = useCallback(
    async (index) => {
      const image = images[index];
      await deleteImage(image.id, image.url);
      setImages((prevImages) => prevImages.filter((_, i) => i !== index));
    },
    [images]
  );

  const handleColorChange = useCallback(async (color) => {
    setBackgroundColor(color);
    await saveColor(color);
  }, []);

  const handleFileChangeWithProgress = useCallback(
    async (event, user, setImages) => {
      const files = event.target.files;
      if (!files || files.length === 0) {
        setUploadProgress(0); // Reset if no files selected
        return;
      }

      setUploadProgress(1); // Indicate that uploading has started

      const uploadPromises = Array.from(files).map((file) => {
        return new Promise((resolve) => {
          const uploadTask = handleFileChange(file, user, setImages);

          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress =
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress); // Shows progress of the currently reporting file
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
        setUploadProgress(0); // Hide the progress indicator.
      }
    },
    [] // Dependencies are correct as user and setImages are passed as arguments.
    // setUploadProgress is a stable state setter.
  );
  const handleVisibleIndicesChange = useCallback((newIndices) => {
    // Make sure we only update state when necessary
    // This prevents unnecessary re-renders
    if (Array.isArray(newIndices)) {
      setVisibleImageIndices((prev) => {
        if (prev.length !== newIndices.length) {
          return newIndices;
        }

        // Compare arrays (they should already be sorted by the VisibilityUpdater)
        for (let i = 0; i < prev.length; i++) {
          if (prev[i] !== newIndices[i]) {
            return newIndices;
          }
        }

        return prev;
      });
    } else if (typeof newIndices === 'function') {
      setVisibleImageIndices(newIndices);
    }
  }, []);

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
      {/* Replace R3F Loader with a simple HTML div for upload progress */}
      {uploadProgress > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: textColor, // Using existing textColor state for consistency
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            padding: '15px 25px',
            borderRadius: '8px',
            fontSize: '1.2em',
            zIndex: 1000, // Ensure it's on top of other UI elements but below modals if necessary
            textAlign: 'center',
          }}
        >
          Uploading: {Math.round(uploadProgress)} %
        </div>
      )}
      <Canvas
        style={{ background: backgroundColor }}
        antialias="true"
        pixelratio={window.devicePixelRatio}
        frameloop="demand"
      >
        <fog attach="fog" args={[backgroundColor, 200, 400]} />
        <CustomCamera targetPosition={targetPosition} />
        <OrbLight glowColor={glowColor} lightColor={lightColor} />
        <Text3DComponent
          triggerTransition={triggerTransition}
          sphereRadius={sphereRadius}
          setIsAuthModalOpen={setIsAuthModalOpen}
          titleOrbColor={titleOrbColor}
          textColor={textColor}
        />{' '}
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

              const isVisible = visibleImageIndices.includes(index);

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
        <WhitePlane />
      </Canvas>
    </div>
  );
}

export default React.memo(App);
