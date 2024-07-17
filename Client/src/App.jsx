import React, {
  useCallback,
  useEffect,
  useRef,
  useMemo,
  Suspense,
} from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';

import * as THREE from 'three';

import { Stats, useProgress, Html } from '@react-three/drei';

import CustomCamera from './CustomCamera';

function Loader() {
  const { progress } = useProgress();
  return <Html center>{progress} % loaded</Html>;
}

function Plane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry attach="geometry" args={[100, 100]} />
      <meshStandardMaterial attach="material" color="lightblue" />
    </mesh>
  );
}

function App() {
  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <div style={{ position: 'absolute', zIndex: 1 }}>
        {/* <button onClick={handleMoveUp}>Move Up</button>
        <button onClick={handleMoveDown}>Move Down</button> */}
      </div>
      <Canvas frameloop="onDemand">
        <Suspense fallback={<Loader />}>
          <Stats />
          <ambientLight />
          <CustomCamera />
          <Plane />
        </Suspense>
      </Canvas>
    </div>
  );
}
export default App;
