import React, {
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
  Suspense,
} from 'react';
import { Canvas, useThree, useFrame, useLoader } from '@react-three/fiber';
import { initializeApp } from 'firebase/app';
import { TextureLoader } from 'three';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import * as THREE from 'three';

import {
  Stats,
  useProgress,
  Html,
  Outlines,
  SoftShadows,
} from '@react-three/drei';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import { db, storage } from './firebase';
import CustomCamera from './CustomCamera';

const auth = getAuth();

const signInUser = async (email, password) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    console.log('User signed in');
  } catch (error) {
    console.error('Error signing in: ', error.message);
  }
};

const signOutUser = async () => {
  try {
    await signOut(auth);
    console.log('User signed out');
  } catch (error) {
    console.error('Error signing out: ', error.message);
  }
};

function AuthModal({ isOpen, onClose, onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSignIn(email, password);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        padding: '20px',
        zIndex: 100,
      }}
    >
      <form onSubmit={handleSubmit}>
        <div>
          <label style={{ color: 'black' }}>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label style={{ color: 'black' }}>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Sign In</button>
        <button onClick={onClose} type="button">
          Cancel
        </button>
      </form>
    </div>
  );
}

function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress} % loaded</Html>;
}

function WhitePlane() {
  // Plane size can be adjusted by changing these values
  const planeWidth = 200;
  const planeHeight = 200;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -20, 0]} receiveShadow>
      <planeGeometry attach="geometry" args={[planeWidth, planeHeight]} />
      <meshStandardMaterial attach="material" color="white" />
    </mesh>
  );
}

function ImagePlane({ url, position }) {
  const texture = useLoader(TextureLoader, url);
  texture.minFilter = THREE.LinearFilter; // Ensures the texture is not downsampled
  texture.magFilter = THREE.LinearFilter; // Ensures the texture is displayed at high quality when magnified
  const meshRef = useRef();
  const [boxDimensions, setBoxDimensions] = useState([1, 1]); // Default dimensions

  useEffect(() => {
    if (
      texture.image &&
      texture.image.naturalWidth &&
      texture.image.naturalHeight
    ) {
      const maxWidth = 5; // Maximum size for the longest dimension
      const aspectRatio =
        texture.image.naturalWidth / texture.image.naturalHeight;

      let newWidth, newHeight;
      if (texture.image.naturalWidth > texture.image.naturalHeight) {
        // If width is the larger dimension, scale down based on width
        newWidth = maxWidth;
        newHeight = maxWidth / aspectRatio;
      } else {
        // If height is the larger dimension or if they are equal, scale down based on height
        newHeight = maxWidth;
        newWidth = maxWidth * aspectRatio;
      }

      // Ensure dimensions are integers to avoid sub-pixel rendering issues
      newWidth = Math.round(newWidth);
      newHeight = Math.round(newHeight);

      setBoxDimensions([newWidth, newHeight]);
    }
  }, [texture]);

  const boxDepth = 0.05; // A small depth since the image is only on the front

  // Create materials for each side of the box
  const materials = [
    new THREE.MeshBasicMaterial({ color: 'black' }), // Right side
    new THREE.MeshBasicMaterial({ color: 'black' }), // Left side
    new THREE.MeshBasicMaterial({ color: 'black' }), // Top side
    new THREE.MeshBasicMaterial({ color: 'black' }), // Bottom side
    new THREE.MeshPhongMaterial({ map: texture }), // Front side
    new THREE.MeshPhongMaterial({ map: texture }), // Back side
  ];

  useFrame(() => {
    if (meshRef.current) {
      // Calculate the normal vector from the sphere's center to the plane's position
      const normalVector = new THREE.Vector3().fromArray(position).normalize();
      // Orient the plane to face away from the sphere's center
      meshRef.current.lookAt(normalVector);
    }
  });

  return (
    <mesh position={position} ref={meshRef} castShadow material={materials}>
      <boxGeometry attach="geometry" args={[...boxDimensions, boxDepth]} />
    </mesh>
  );
}

function App() {
  const [images, setImages] = useState([]);
  const [user, setUser] = useState(null); // State to hold the current user
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Set the user or null
    });

    return () => unsubscribe(); // Clean up the listener on unmount
  }, []);

  const handleSignIn = async (email, password) => {
    await signInUser(email, password);
    setIsAuthModalOpen(false); // Close the modal on successful sign-in
  };

  useEffect(() => {
    const fetchImages = async () => {
      // Removed the incorrect redeclaration of `db`
      const querySnapshot = await getDocs(collection(db, 'images'));
      const urls = [];
      querySnapshot.forEach((doc) => {
        urls.push(doc.data().url);
      });
      setImages(urls);
    };

    fetchImages();
  }, []);

  const handleFileChange = async (event) => {
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
  };

  const sphereRadius = 15; // Adjust the radius of the sphere as needed
  const imagesPositions = useMemo(() => {
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
        {/* Trigger file input only if user is logged in */}
        <button
          onClick={() => user && document.getElementById('fileInput').click()}
        >
          Upload Image
        </button>
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
        <fog attach="fog" args={['black', 0, 100]} />
        <Suspense fallback={<Loader />}>
          <CustomCamera />

          <ambientLight intensity={1.5} />
          {images.map((url, index) => (
            <ImagePlane
              key={index}
              url={url}
              position={imagesPositions[index]}
            />
          ))}
          <WhitePlane />
        </Suspense>
      </Canvas>
    </div>
  );
}
export default App;
