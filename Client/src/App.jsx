import React, {
  forwardRef,
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  Suspense,
} from 'react';
import { useFrame, useLoader, Canvas } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { db } from './firebase';
import CustomCamera from './CustomCamera';
import AuthModal from './AuthModal';
import ImagePlane from './ImagePlane';
import RaycasterHandler from './RaycasterHandler';
import Loader from './Loader';
import WhitePlane from './WhitePlane';
import {
  fetchImages,
  handleFileChange,
  deleteImage,
} from './firebaseFunctions';
import {
  calculateSpherePositions,
  calculatePlanePositions,
} from './layoutFunctions';
import { handleSignIn } from './authFunctions';
import { Text3D, Clouds, Cloud } from '@react-three/drei';
import Text3DComponent from './TextComponent';
const auth = getAuth();
import FakeGlowMaterial from './FakeGlowMaterial';
import OrbLight from './OrbLight';

function App() {
  const [images, setImages] = useState([]);
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [layout, setLayout] = useState('sphere');
  const [interpolationFactor, setInterpolationFactor] = useState(0);
  const [targetPosition, setTargetPosition] = useState(null);
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

  const sphereRadius = useMemo(() => {
    return 10 + images.length * 0.5;
  }, [images.length]);

  const imagesPositions = useMemo(() => {
    const spherePositions = calculateSpherePositions(images, sphereRadius);
    const planePositions = calculatePlanePositions(images);
    return images.map((_, index) => {
      const spherePos = new THREE.Vector3(...spherePositions[index]);
      const planePos = new THREE.Vector3(...planePositions[index]);
      return spherePos.lerp(planePos, interpolationFactor).toArray();
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
          const newTargetPosition = new THREE.Vector3(...imagePosition);
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
          <button onClick={() => document.getElementById('fileInput').click()}>
            Upload Image
          </button>
        )}
      </div>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignIn={(email, password) =>
          handleSignIn(email, password, setIsAuthModalOpen)
        }
      />
      <Canvas
        shadows
        softshadows="true"
        style={{ background: 'black' }}
        antialias="true"
        pixelratio={window.devicePixelRatio}
      >
        <fog attach="fog" args={['black', 200, 400]} />
        <Suspense>
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
          </Suspense>
          <WhitePlane />
          <RaycasterHandler
            images={imagesPositions}
            handleImageClick={handleImageClick}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
