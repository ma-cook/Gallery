import React from 'react';
import { useProgress, Html } from '@react-three/drei';

function Loader({ progress }) {
  return <Html center>{progress} % loaded</Html>;
}

export default Loader;
