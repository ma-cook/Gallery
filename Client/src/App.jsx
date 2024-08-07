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
} from './firebaseFunctions';
import {
  calculateSpherePositions,
  calculatePlanePositions,
} from './layoutFunctions';
import { handleSignIn } from './authFunctions';
import Text3DComponent from './TextComponent';
import OrbLight from './OrbLight';

const ImagePlane = lazy(() => import('./ImagePlane'));
const RaycasterHandler = lazy(() => import('./RaycasterHandler'));

const auth = getAuth();

// Object Pool for THREE.Vector3
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

function SettingsModal({ isOpen, onClose, onColorChange }) {
  const [color, setColor] = useState('#ffffff');

  const handleColorChange = (event) => {
    setColor(event.target.value);
    onColorChange(event.target.value);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '20%',
        left: '20%',
        background: 'white',
        padding: '20px',
        zIndex: 2,
      }}
    >
      <h2>Settings</h2>
      <label>
        Background and Fog Color:
        <input type="color" value={color} onChange={handleColorChange} />
      </label>
      <button onClick={onClose}>Close</button>
    </div>
  );
}

function App() {
  const [images, setImages] = useState([]);
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [layout, setLayout] = useState('sphere');
  const [interpolationFactor, setInterpolationFactor] = useState(0);
  const [targetPosition, setTargetPosition] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('white');
  const lastClickTime = useRef(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchAndSetImages = async () => {
      const imagesData = await fetchImages();
      setImages(imagesData);
    };

    fetchAndSetImages();
  }, []);

  useEffect(() => {
    const fetchAndSetColor = async () => {
      const backgroundColor = await fetchColor();
      setBackgroundColor(backgroundColor);
    };

    fetchAndSetColor();
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

  const handleColorChange = async (color) => {
    setBackgroundColor(color);
    await saveColor(color);
  };

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <input
        type="file"
        id="fileInput"
        style={{ display: 'none' }}
        onChange={(event) => handleFileChange(event, user, setImages)}
        accept="image/*"
      />
      <div style={{ position: 'absolute', zIndex: 1 }}>
        {user && (
          <>
            <button
              onClick={() => document.getElementById('fileInput').click()}
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
      />
      <Canvas
        style={{ background: backgroundColor }}
        antialias="true"
        pixelratio={window.devicePixelRatio}
      >
        <fog attach="fog" args={[backgroundColor, 200, 400]} />

        <CustomCamera targetPosition={targetPosition} />
        <OrbLight />

        <Text3DComponent
          triggerTransition={triggerTransition}
          sphereRadius={sphereRadius}
          setIsAuthModalOpen={setIsAuthModalOpen}
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
