import * as THREE from 'three';
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text3D } from '@react-three/drei';
import { handleSignIn, handleSignOut } from './authFunctions';
import FakeGlowMaterial from './FakeGlowMaterial';

function Text3DComponent({
  triggerTransition,
  sphereRadius,
  setIsAuthModalOpen,
  images, // Add images as a prop
}) {
  const groupRef1 = useRef();
  const groupRef2 = useRef();
  const groupRef3 = useRef();
  const textRef1 = useRef();
  const textRef2 = useRef();
  const textRef3 = useRef();
  const sphereRef = useRef();
  const cubeRef = useRef();
  const [positionsInitialized, setPositionsInitialized] = useState(false);

  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(2, 16, 32), []);
  const boxGeometry1 = useMemo(() => new THREE.BoxGeometry(28, 0.5, 2), []);
  const boxGeometry2 = useMemo(() => new THREE.BoxGeometry(20, 4, 2), []);
  const boxGeometry3 = useMemo(() => new THREE.BoxGeometry(18, 4, 2), []);
  const meshMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 'white',

        opacity: 0.6,
        transparent: true,
      }),
    []
  );

  const transparentMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        opacity: 0,
        transparent: true,
      }),
    []
  );

  useFrame(({ camera }) => {
    if (groupRef1.current) groupRef1.current.lookAt(camera.position);
    if (groupRef2.current) groupRef2.current.lookAt(camera.position);
    if (groupRef3.current) groupRef3.current.lookAt(camera.position);
  });

  useEffect(() => {
    if (!positionsInitialized) {
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

      if (groupRef1.current) {
        groupRef1.current.position.set(0, sphereRadius + 20, 0);
      }
      if (groupRef2.current) {
        groupRef2.current.position.set(30, sphereRadius + 12, 0);
      }
      if (groupRef3.current) {
        groupRef3.current.position.set(-30, sphereRadius + 12, 0);
      }

      setPositionsInitialized(true);
    }
  }, [sphereRadius, images, positionsInitialized]);

  return (
    <>
      <group ref={groupRef1}>
        <Text3D
          ref={textRef1}
          font="/Sankofa Display_Regular.json"
          size={5}
          height={1}
          curveSegments={50}
          bevelEnabled
          bevelThickness={0.1}
          bevelSize={0.1}
          bevelOffset={0}
          bevelSegments={8}
        >
          Gallery
          <meshBasicMaterial
            attach="material"
            color={'white'}
            roughness={1}
            metalness={0}
            intensity={1.2}
          />
        </Text3D>
        <mesh
          position={[0, -4, 0]}
          geometry={boxGeometry1}
          material={meshMaterial}
        >
          <FakeGlowMaterial glowColor="#fff4d2" />
        </mesh>
        <mesh
          ref={sphereRef}
          position={[-15, 0, 0]}
          geometry={sphereGeometry}
          material={meshMaterial}
          onClick={() => setIsAuthModalOpen(true)}
        >
          <pointLight
            distance={200}
            decay={1}
            position={[0, 0, 0]}
            color="#fff4d2"
            intensity={10}
          />
          <FakeGlowMaterial glowColor="#fff4d2" />
        </mesh>
        <mesh
          ref={cubeRef}
          position={[15, 0, 0]}
          geometry={sphereGeometry}
          material={meshMaterial}
          onClick={handleSignOut}
        >
          <pointLight
            distance={200}
            decay={1}
            position={[0, 0, 0]}
            color="#fff4d2"
            intensity={10}
          />
          <FakeGlowMaterial glowColor="#fff4d2" />
        </mesh>
      </group>
      <group ref={groupRef2}>
        <Text3D
          ref={textRef2}
          font="/Sankofa Display_Regular.json"
          size={2}
          height={0.5}
          curveSegments={32}
          bevelEnabled
          bevelThickness={0.05}
          bevelSize={0.05}
          bevelOffset={0}
          bevelSegments={8}
        >
          Sphere Layout
          <meshStandardMaterial
            attach="material"
            color="white"
            emissive="white"
          />
        </Text3D>
        <mesh
          position={[0, 0, 0]}
          geometry={boxGeometry2}
          material={transparentMaterial}
          onClick={() => triggerTransition('sphere')}
        ></mesh>
      </group>
      <group ref={groupRef3}>
        <Text3D
          ref={textRef3}
          font="/Sankofa Display_Regular.json"
          size={2}
          height={0.5}
          curveSegments={32}
          bevelEnabled
          bevelThickness={0.05}
          bevelSize={0.05}
          bevelOffset={0}
          bevelSegments={8}
        >
          Plane Layout
          <meshStandardMaterial
            attach="material"
            color="white"
            emissive="white"
          />
        </Text3D>
        <mesh
          position={[0, 0, 0]}
          geometry={boxGeometry3}
          material={transparentMaterial}
          onClick={() => triggerTransition('plane')}
        ></mesh>
      </group>
    </>
  );
}

export default React.memo(Text3DComponent);
