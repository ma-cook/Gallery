import { useProgress, Html } from '@react-three/drei';

function Loader() {
  // Removed 'progress' prop
  const { progress } = useProgress(); // Get progress from the hook
  return <Html center>{Math.round(progress)} % loaded</Html>;
}

export default Loader;
