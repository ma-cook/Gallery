import * as THREE from 'three';
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text3D, Sparkles } from '@react-three/drei';
import { handleSignIn, handleSignOut } from './authFunctions';
import FakeGlowMaterial from './FakeGlowMaterial';
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
  const glowRed = new THREE.MeshPhongMaterial({
    color: new THREE.Color(9, 9, 9),
    toneMapped: false,
  });
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
        <mesh position={[0, -4, 0]}>
          <boxGeometry attach="geometry" args={[28, 0.5, 2]} />
          <meshBasicMaterial
            attach="material"
            color={'white'}
            opacity={0.6}
            transparent={true}
          />
        </mesh>
        <mesh position={[-15, 0, 0]} onClick={() => setIsAuthModalOpen(true)}>
          <sphereGeometry attach="geometry" args={[2, 16, 32]} />
          <meshBasicMaterial
            attach="material"
            color={'orange'}
            roughness={1}
            metalness={0}
            intensity={1.2}
            opacity={0.6}
            transparent={true}
          />
          <pointLight
            distance={200}
            decay={1}
            position={[0, 0, 0]}
            color="#fff4d2"
            skyColor="#fff4d2"
            groundColor="#fff4d2"
            intensity={10}
          />

          <FakeGlowMaterial glowColor="#fff4d2" />
        </mesh>

        <mesh position={[15, 0, 0]} onClick={handleSignOut}>
          <sphereGeometry attach="geometry" args={[2, 16, 32]} />
          <meshBasicMaterial
            attach="material"
            color={'orange'}
            roughness={1}
            metalness={0}
            intensity={1.2}
            opacity={0.6}
            transparent={true}
          />
          <pointLight
            distance={200}
            decay={1}
            position={[0, 0, 0]}
            color="#fff4d2"
            skyColor="#fff4d2"
            groundColor="#fff4d2"
            intensity={10}
          />

          <FakeGlowMaterial glowColor="#fff4d2" />
        </mesh>
      </group>
      <group ref={groupRef2} position={[30, sphereRadius + 12, 0]}>
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
        <mesh position={[0, 0, 0]} onClick={() => triggerTransition('sphere')}>
          <boxGeometry attach="geometry" args={[20, 4, 2]} />
          <meshBasicMaterial
            attach="material"
            color={'white'}
            opacity={0.0}
            transparent={true}
          />
        </mesh>
      </group>
      <group ref={groupRef3} position={[-30, sphereRadius + 12, 0]}>
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
        <mesh position={[0, 0, 0]} onClick={() => triggerTransition('plane')}>
          <boxGeometry attach="geometry" args={[18, 4, 2]} />
          <meshBasicMaterial
            attach="material"
            color={'white'}
            opacity={0.0}
            transparent={true}
          />
        </mesh>
      </group>
    </>
  );
}

export default Text3DComponent;
