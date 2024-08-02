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
import { handleSignIn, handleSignOut } from './authFunctions';
import { Text3D, Clouds, Cloud } from '@react-three/drei';

const auth = getAuth();

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
        <Suspense fallback={<Loader />}>
          <CustomCamera targetPosition={targetPosition} />
          <ambientLight intensity={1.5} />
          <Text3DComponent
            triggerTransition={triggerTransition}
            sphereRadius={sphereRadius}
            setIsAuthModalOpen={setIsAuthModalOpen}
          />
          <Clouds material={THREE.MeshBasicMaterial}>
            <Cloud
              seed={1}
              scale={2}
              volume={5}
              color="orange"
              fade={100}
              position={[-30, sphereRadius + 22, 0]}
            />
            <Cloud
              seed={1}
              scale={2}
              volume={5}
              color="hotpink"
              fade={100}
              position={[30, sphereRadius + 22, 0]}
            />
          </Clouds>
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

function Text3DComponent({
  triggerTransition,
  sphereRadius,
  setIsAuthModalOpen,
}) {
  const groupRef1 = useRef();
  const groupRef2 = useRef();
  const groupRef3 = useRef();
  const textRef1 = useRef();
  const textRef2 = useRef();
  const textRef3 = useRef();
  const sphereRef = useRef();
  const cubeRef = useRef();

  useEffect(() => {
    const adjustPivot = (textRef) => {
      if (textRef.current) {
        const box = new THREE.Box3().setFromObject(textRef.current);
        const center = box.getCenter(new THREE.Vector3());
        textRef.current.position.sub(center);
      }
    };

    adjustPivot(textRef1);
    adjustPivot(textRef2);
    adjustPivot(textRef3);
  }, []);

  useFrame(({ camera }) => {
    if (groupRef1.current) groupRef1.current.lookAt(camera.position);
    if (groupRef2.current) groupRef2.current.lookAt(camera.position);
    if (groupRef3.current) groupRef3.current.lookAt(camera.position);
  });

  return (
    <>
      <group ref={groupRef1} position={[0, sphereRadius + 20, 0]}>
        <Text3D
          ref={textRef1}
          font="/helvetiker_bold.typeface.json"
          size={5}
          height={1}
          curveSegments={32}
          bevelEnabled
          bevelThickness={0.1}
          bevelSize={0.1}
          bevelOffset={0}
          bevelSegments={8}
        >
          Gallery
          <meshStandardMaterial attach="material" color="white" />
        </Text3D>
        <mesh
          ref={sphereRef}
          geometry={new THREE.SphereGeometry(0.5, 32, 32)}
          material={new THREE.MeshStandardMaterial({ color: 'white' })}
          position={[-15, 0, 0]} // Adjust the position to be slightly to the left of the text
          onClick={() => setIsAuthModalOpen(true)}
        />
        <mesh
          ref={cubeRef}
          geometry={new THREE.SphereGeometry(0.5, 32, 32)}
          material={new THREE.MeshStandardMaterial({ color: 'white' })}
          position={[15, 0, 0]} // Adjust the position to be slightly to the left of the text
          onClick={handleSignOut}
        />
      </group>
      <group ref={groupRef2} position={[30, sphereRadius + 12, 0]}>
        <Text3D
          ref={textRef2}
          font="/helvetiker_bold.typeface.json"
          size={2}
          height={0.5}
          curveSegments={32}
          bevelEnabled
          bevelThickness={0.05}
          bevelSize={0.05}
          bevelOffset={0}
          bevelSegments={8}
          onClick={() => triggerTransition('sphere')}
        >
          Sphere Layout
          <meshStandardMaterial attach="material" color="white" />
        </Text3D>
      </group>
      <group ref={groupRef3} position={[-30, sphereRadius + 12, 0]}>
        <Text3D
          ref={textRef3}
          font="/helvetiker_bold.typeface.json"
          size={2}
          height={0.5}
          curveSegments={32}
          bevelEnabled
          bevelThickness={0.05}
          bevelSize={0.05}
          bevelOffset={0}
          bevelSegments={8}
          onClick={() => triggerTransition('plane')}
        >
          Plane Layout
          <meshStandardMaterial attach="material" color="white" />
        </Text3D>
      </group>
    </>
  );
}

export default App;
