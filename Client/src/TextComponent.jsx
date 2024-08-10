import * as THREE from 'three';
import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { useFrame } from '@react-three/fiber';
import { Text3D } from '@react-three/drei';
import { handleSignIn, handleSignOut } from './authFunctions';
import FakeGlowMaterial from './FakeGlowMaterial';

function Text3DComponent({
  triggerTransition,
  sphereRadius,
  setIsAuthModalOpen,
  titleOrbColor,
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

  const geometries = useMemo(
    () => ({
      sphere: new THREE.SphereGeometry(2, 16, 32),
      box1: new THREE.BoxGeometry(28, 0.5, 2),
      box2: new THREE.BoxGeometry(20, 4, 2),
      box3: new THREE.BoxGeometry(18, 4, 2),
    }),
    []
  );

  const materials = useMemo(
    () => ({
      mesh: new THREE.MeshBasicMaterial({
        color: 'white',
        opacity: 0.6,
        transparent: true,
      }),
      transparent: new THREE.MeshBasicMaterial({
        opacity: 0,
        transparent: true,
      }),
    }),
    []
  );

  useFrame(({ camera }) => {
    if (groupRef1.current) groupRef1.current.lookAt(camera.position);
    if (groupRef2.current) groupRef2.current.lookAt(camera.position);
    if (groupRef3.current) groupRef3.current.lookAt(camera.position);
  });

  const adjustPivot = useCallback((textRef) => {
    if (textRef.current) {
      textRef.current.geometry.center();
    }
  }, []);

  useEffect(() => {
    if (!positionsInitialized) {
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
  }, [sphereRadius, positionsInitialized, adjustPivot]);

  return (
    <>
      <group ref={groupRef1}>
        <Text3D
          ref={textRef1}
          font="/optimer_bold.typeface.json"
          size={5}
          height={1}
          curveSegments={10}
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
          geometry={geometries.box1}
          material={materials.mesh}
        ></mesh>
        <mesh
          ref={sphereRef}
          position={[-15, 0, 0]}
          geometry={geometries.sphere}
          material={materials.mesh}
          onClick={() => setIsAuthModalOpen(true)}
        >
          <pointLight
            distance={200}
            decay={1}
            position={[0, 0, 0]}
            color={titleOrbColor}
            intensity={10}
          />
          <FakeGlowMaterial glowColor={titleOrbColor} />
        </mesh>
        <mesh
          ref={cubeRef}
          position={[15, 0, 0]}
          geometry={geometries.sphere}
          material={materials.mesh}
          onClick={handleSignOut}
        >
          <pointLight
            distance={200}
            decay={1}
            position={[0, 0, 0]}
            color={titleOrbColor}
            intensity={10}
          />
          <FakeGlowMaterial glowColor={titleOrbColor} />
        </mesh>
      </group>
      <group ref={groupRef2}>
        <Text3D
          ref={textRef2}
          font="/optimer_bold.typeface.json"
          size={2}
          height={0.5}
          curveSegments={10}
          bevelEnabled
          bevelThickness={0.05}
          bevelSize={0.05}
          bevelOffset={0}
          bevelSegments={10}
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
          geometry={geometries.box2}
          material={materials.transparent}
          onClick={() => triggerTransition('sphere')}
        ></mesh>
      </group>
      <group ref={groupRef3}>
        <Text3D
          ref={textRef3}
          font="/optimer_bold.typeface.json"
          size={2}
          height={0.5}
          curveSegments={10}
          bevelEnabled
          bevelThickness={0.05}
          bevelSize={0.05}
          bevelOffset={0}
          bevelSegments={10}
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
          geometry={geometries.box3}
          material={materials.transparent}
          onClick={() => triggerTransition('plane')}
        ></mesh>
      </group>
    </>
  );
}

export default React.memo(Text3DComponent);
