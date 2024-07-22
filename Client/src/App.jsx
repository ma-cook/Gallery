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

import * as THREE from 'three';

import { Stats, useProgress, Html } from '@react-three/drei';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import { db, storage } from './firebase';
import CustomCamera from './CustomCamera';

function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress} % loaded</Html>;
}

function WhitePlane() {
  // Plane size can be adjusted by changing these values
  const planeWidth = 200;
  const planeHeight = 200;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]} receiveShadow>
      <planeGeometry attach="geometry" args={[planeWidth, planeHeight]} />
      <meshStandardMaterial attach="material" color="white" />
    </mesh>
  );
}

function ImagePlane({ url, position }) {
  const texture = useLoader(TextureLoader, url);
  const meshRef = useRef();

  // Get the size of the viewport
  const { size } = useThree();
  const viewportHeight = size.height;
  const viewportWidth = size.width;

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.lookAt(new THREE.Vector3(0, 0, 0));
    }
  }, [position]);

  // Calculate the plane size to maintain the image's original size
  // Assuming the camera's distance and field of view would make a 1x1 plane appear as the original size of the image
  // This might need adjustment based on your camera setup
  const imgWidth = texture.image.width;
  const imgHeight = texture.image.height;
  const aspectRatio = imgWidth / imgHeight;

  // Calculate size based on the aspect ratio
  // This is a basic calculation and might need adjustment based on your specific camera setup
  let planeWidth = aspectRatio; // This will make the width of the plane match the aspect ratio of the image
  let planeHeight = 1; // Keep the height to 1 and adjust the width according to the image's aspect ratio

  // If you have a specific logic to determine the plane size based on the viewport size or other factors, you can adjust it here

  return (
    <mesh position={position} ref={meshRef} castShadow>
      <planeGeometry attach="geometry" args={[planeWidth, planeHeight]} />
      <meshBasicMaterial
        attach="material"
        map={texture}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function App() {
  const [images, setImages] = useState([]);

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

  const sphereRadius = 3; // Adjust the radius of the sphere as needed
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
        <button onClick={() => document.getElementById('fileInput').click()}>
          Upload Image
        </button>
      </div>
      <Canvas
        shadows
        shadowMap={{ type: THREE.PCFSoftShadowMap }}
        style={{ background: 'white' }}
      >
        <fog attach="fog" args={['#8888', 0, 25]} />
        <Suspense fallback={<Loader />}>
          <CustomCamera />
          <pointLight position={[0, 6, 0]} intensity={10} castShadow />
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
