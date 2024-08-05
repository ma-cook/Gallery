import * as THREE from 'three';
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text3D } from '@react-three/drei';
import { handleSignIn, handleSignOut } from './authFunctions';

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
            color={'orange'}
            roughness={1}
            metalness={0}
            intensity={1.2}
          />
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
          <meshStandardMaterial
            attach="material"
            color="white"
            emissive="white"
          />
        </Text3D>
        <pointLight color="white" intensity={1} distance={10} />
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
          <meshStandardMaterial
            attach="material"
            color="white"
            emissive="white"
          />
        </Text3D>
        <pointLight color="white" intensity={1} distance={10} />
      </group>
    </>
  );
}

export default Text3DComponent;
