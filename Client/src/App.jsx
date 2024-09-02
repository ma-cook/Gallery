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

const ImagePlane = lazy(() => import('./ImagePlane'));
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const [imagesData, backgroundColor, glowColor, titleOrbColor, textColor] =
        await Promise.all([
          fetchImages(),
          fetchColor(),
          fetchOrbColor(),
          fetchTitleOrbColor(),
          fetchTextColor(),
        ]);
      setImages(imagesData);
      setBackgroundColor(backgroundColor);
      setGlowColor(glowColor);
      setTitleOrbColor(titleOrbColor);
      setTextColor(textColor);
    };

    fetchData();
  }, []);

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
          console.log('Setting target position:', newTargetPosition);
          setTargetPosition(newTargetPosition);
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
      const file = event.target.files[0];
      if (file) {
        const uploadTask = handleFileChange(event, user, setImages);
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error('Upload failed:', error);
          },
          () => {
            setUploadProgress(0); // Reset progress after upload completes
          }
        );
      }
    },
    []
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
      />
      <div style={{ position: 'absolute', zIndex: 1 }}>
        {user && (
          <>
            <button
              onClick={() => document.getElementById('fileInput').click()}
              disabled={uploadProgress > 0} // Disable button while uploading
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
      {uploadProgress > 0 && <Loader progress={uploadProgress} />}
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
        />
        <Suspense fallback={<Loader />}>
          {images.map((image, index) => (
            <ImagePlane
              key={index}
              index={index}
              position={imagesPositions[index]}
              onClick={() => handleImageClick(index)}
              images={images.map((img) => img.url)}
              user={user}
              onDelete={handleDeleteImage}
            />
          ))}
          <RaycasterHandler
            images={imagesPositions}
            handleImageClick={handleImageClick}
          />
        </Suspense>
        <WhitePlane />
      </Canvas>
    </div>
  );
}

export default React.memo(App);
