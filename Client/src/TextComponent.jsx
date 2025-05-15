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
  textColor,
}) {
  const groupRefs = useRef([
    React.createRef(),
    React.createRef(),
    React.createRef(),
  ]);
  const textRefs = useRef([
    React.createRef(),
    React.createRef(),
    React.createRef(),
  ]);
  const sphereRef = useRef();
  const cubeRef = useRef();
  const [positionsInitialized, setPositionsInitialized] = useState(false);

  const geometries = useMemo(
    () => ({
      sphere: new THREE.SphereGeometry(2, 16, 32),
      boxes: [
        new THREE.BoxGeometry(28, 0.5, 2),
        new THREE.BoxGeometry(20, 4, 2),
        new THREE.BoxGeometry(18, 4, 2),
      ],
    }),
    []
  );

  const materials = useMemo(
    () => ({
      transparent: new THREE.MeshBasicMaterial({
        opacity: 0,
        transparent: true,
      }),
    }),
    []
  );

  useFrame(({ camera }) => {
    groupRefs.current.forEach((ref) => {
      if (ref.current) ref.current.lookAt(camera.position);
    });
  });

  const adjustPivot = useCallback((textRef) => {
    if (textRef.current) {
      textRef.current.geometry.center();
    }
  }, []);

  useEffect(() => {
    if (!positionsInitialized) {
      textRefs.current.forEach(adjustPivot);

      const positions = [
        { x: 0, y: sphereRadius + 20, z: 0 },
        { x: 30, y: sphereRadius + 12, z: 0 },
        { x: -30, y: sphereRadius + 12, z: 0 },
      ];

      groupRefs.current.forEach((ref, index) => {
        if (ref.current) {
          ref.current.position.set(
            positions[index].x,
            positions[index].y,
            positions[index].z
          );
        }
      });

      setPositionsInitialized(true);
    }
  }, [sphereRadius, positionsInitialized, adjustPivot]);

  const textConfigs = [
    {
      text: 'Gallery',
      size: 5,
      height: 1,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      meshIndex: 0,
      onClick: () => setIsAuthModalOpen(true),
    },
    {
      text: 'Sphere Layout',
      size: 2,
      height: 0.5,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      meshIndex: 1,
      onClick: () => triggerTransition('sphere'),
    },
    {
      text: 'Plane Layout',
      size: 2,
      height: 0.5,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      meshIndex: 2,
      onClick: () => triggerTransition('plane'),
    },
  ];

  return (
    <>
      {textConfigs.map((config, index) => (
        <group ref={groupRefs.current[index]} key={index}>
          <Text3D
            ref={textRefs.current[index]}
            font="/optimer_bold.typeface.json"
            size={config.size}
            height={config.height}
            curveSegments={10}
            bevelEnabled
            bevelThickness={config.bevelThickness}
            bevelSize={config.bevelSize}
            bevelOffset={0}
            bevelSegments={8}
          >
            {config.text}
            <meshBasicMaterial
              attach="material"
              color={textColor}
              roughness={1}
              metalness={0}
              intensity={1.2}
            />
          </Text3D>
          <mesh
            position={[0, 0, 0]}
            geometry={geometries.boxes[config.meshIndex]}
            material={materials.transparent}
            onClick={config.onClick}
          ></mesh>
          {index === 0 && (
            <>
              <mesh
                ref={sphereRef}
                position={[-15, 0, 0]}
                geometry={geometries.sphere}
                material={materials.mesh}
                onClick={config.onClick}
              >
                <FakeGlowMaterial glowColor={titleOrbColor} />
              </mesh>
              <mesh
                ref={cubeRef}
                position={[15, 0, 0]}
                geometry={geometries.sphere}
                material={materials.mesh}
                onClick={handleSignOut}
              >
                <FakeGlowMaterial glowColor={titleOrbColor} />
              </mesh>
            </>
          )}
        </group>
      ))}
    </>
  );
}

export default React.memo(Text3DComponent);
