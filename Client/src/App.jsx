import React, {
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
  Suspense,
} from 'react';
import { Canvas } from '@react-three/fiber';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { db } from './firebase';
import CustomCamera from './CustomCamera';
import { useProgress, Html, Text3D } from '@react-three/drei';
import AuthModal from './AuthModal';
import { signInUser, signOutUser } from './Auth';
import ImagePlane from './ImagePlane';
import RaycasterHandler from './RaycasterHandler';
import * as THREE from 'three';

const auth = getAuth();

function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress} % loaded</Html>;
}

function WhitePlane() {
  const planeWidth = 600;
  const planeHeight = 600;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -50, 0]} receiveShadow>
      <planeGeometry attach="geometry" args={[planeWidth, planeHeight]} />
      <meshStandardMaterial attach="material" color="white" />
    </mesh>
  );
}

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

  const handleSignIn = useCallback(async (email, password) => {
    await signInUser(email, password);
    setIsAuthModalOpen(false);
  }, []);

  useEffect(() => {
    const fetchImages = async () => {
      const querySnapshot = await getDocs(collection(db, 'images'));
      const urls = querySnapshot.docs.map((doc) => doc.data().url);
      setImages(urls);
    };

    fetchImages();
  }, []);

  const handleFileChange = useCallback(
    async (event) => {
      if (!user) {
        alert('You must be signed in to upload images.');
        return;
      }
      const file = event.target.files[0];
      if (!file) return;

      const storage = getStorage();
      const storageRef = ref(storage, `images/${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      const db = getFirestore();
      await addDoc(collection(db, 'images'), { url });

      setImages((prevImages) => [...prevImages, url]);
    },
    [user]
  );

  const sphereRadius = 25;

  const calculateSpherePositions = useCallback(() => {
    return images.map((_, index) => {
      const total = images.length;
      const phi = Math.acos(-1 + (2 * index) / total);
      const theta = Math.sqrt(total * Math.PI) * phi;
      return [
        sphereRadius * Math.cos(theta) * Math.sin(phi),
        sphereRadius * Math.sin(theta) * Math.sin(phi),
        sphereRadius * Math.cos(phi),
      ];
    });
  }, [images]);

  const calculatePlanePositions = useCallback(() => {
    const gridSize = Math.ceil(Math.sqrt(images.length));
    return images.map((_, index) => {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      return [
        col * 10 - (gridSize * 10) / 2,
        row * 10 - (gridSize * 10) / 2,
        0,
      ];
    });
  }, [images]);

  const imagesPositions = useMemo(() => {
    const spherePositions = calculateSpherePositions();
    const planePositions = calculatePlanePositions();
    return images.map((_, index) => {
      const spherePos = new THREE.Vector3(...spherePositions[index]);
      const planePos = new THREE.Vector3(...planePositions[index]);
      return spherePos.lerp(planePos, interpolationFactor).toArray();
    });
  }, [interpolationFactor, calculateSpherePositions, calculatePlanePositions]);

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
        return; // Ignore clicks that happen within 100ms of the last click
      }
      lastClickTime.current = now;

      if (index >= 0 && index < imagesPositions.length) {
        const imagePosition = imagesPositions[index];
        if (Array.isArray(imagePosition)) {
          setTargetPosition(new THREE.Vector3(...imagePosition));
        }
      }
    },
    [imagesPositions]
  );

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <input
        type="file"
        id="fileInput"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept="image/*"
      />
      <div style={{ position: 'absolute', zIndex: 1 }}>
        {!user && (
          <button onClick={() => setIsAuthModalOpen(true)}>Login</button>
        )}
        {user && <button onClick={signOutUser}>Logout</button>}
        {user && (
          <button onClick={() => document.getElementById('fileInput').click()}>
            Upload Image
          </button>
        )}
        <button onClick={() => triggerTransition('sphere')}>
          Sphere Layout
        </button>
        <button onClick={() => triggerTransition('plane')}>Plane Layout</button>
      </div>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignIn={handleSignIn}
      />
      <Canvas
        shadows
        softshadows="true"
        style={{ background: 'black' }}
        antialias="true"
        pixelratio={window.devicePixelRatio}
      >
        <fog attach="fog" args={['black', 30, 200]} />
        <Suspense fallback={<Loader />}>
          <CustomCamera targetPosition={targetPosition} />
          <ambientLight intensity={1.5} />
          <Text3D
            font="/helvetiker_bold.typeface.json" // Replace with the path to your font file
            size={5}
            height={1}
            curveSegments={32}
            bevelEnabled
            bevelThickness={0.1}
            bevelSize={0.1}
            bevelOffset={0}
            bevelSegments={8}
            position={[-12, sphereRadius + 10, 0]} // Position above the sphere
          >
            Gallery
            <meshStandardMaterial attach="material" color="white" />
          </Text3D>
          {images.map((url, index) => (
            <ImagePlane
              key={index}
              index={index}
              position={imagesPositions[index]}
              onClick={() => handleImageClick(index)}
              images={images} // Pass images as a prop
            />
          ))}
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
