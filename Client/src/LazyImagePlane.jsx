import React, { useState, useEffect, Suspense, useRef } from 'react';
import ImagePlane from './ImagePlane';
import Loader from './Loader';

const LazyImagePlane = ({
  originalIndex,
  position,
  onClick,
  imageUrl,
  user,
  onDelete,
  isVisible,
}) => {
  // Keep track of whether this specific image has been loaded before
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const loadedRef = useRef(false);

  // Mark this component as loaded when it first renders successfully
  useEffect(() => {
    if (isVisible && !loadedRef.current) {
      setHasLoaded(true);
      loadedRef.current = true;
    }
  }, [isVisible]);

  // For error handling
  const handleError = () => {
    setHasError(true);
  };

  // If this image isn't visible and hasn't been loaded before, don't render it
  if (!isVisible && !hasLoaded) {
    return null;
  }

  // The fallback will only show when the image is initially loading
  return (
    <Suspense
      fallback={
        <mesh position={position}>
          <boxGeometry args={[1, 1, 0.05]} />
          <meshBasicMaterial color="#333333" />
        </mesh>
      }
    >
      {hasError ? (
        <mesh position={position}>
          <boxGeometry args={[1, 1, 0.05]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
      ) : (
        <ImagePlane
          originalIndex={originalIndex}
          position={position}
          onClick={(index) => {
            console.log(`LazyImagePlane forwarding click for index ${index}`);
            onClick(index);
          }}
          imageUrl={imageUrl}
          user={user}
          onDelete={onDelete}
          onError={handleError}
        />
      )}
    </Suspense>
  );
};

export default React.memo(LazyImagePlane);
