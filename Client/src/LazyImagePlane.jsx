import React, { useEffect, Suspense, useRef } from 'react'; // Removed useState
import ImagePlane from './ImagePlane';
import Loader from './Loader';
import useStore from './store'; // Added

const LazyImagePlane = ({
  originalIndex,
  position,
  onClick,
  imageUrl,
  user,
  onDelete,
  isVisible,
}) => {
  const {
    ensureImageComponentState,
    setHasLoadedForImage,
    setHasErrorForImage,
    imageComponentStates,
  } = useStore((state) => ({
    ensureImageComponentState: state.ensureImageComponentState,
    setHasLoadedForImage: state.setHasLoadedForImage,
    setHasErrorForImage: state.setHasErrorForImage,
    imageComponentStates: state.imageComponentStates,
  }));
  useEffect(() => {
    ensureImageComponentState(originalIndex);
  }, [originalIndex, ensureImageComponentState]);

  // Safely access state, providing defaults if not yet initialized
  const componentState = imageComponentStates[originalIndex] || {
    hasLoaded: false,
    hasError: false,
  };
  const { hasLoaded, hasError } = componentState;

  const loadedRef = useRef(false); // Remains for tracking initial mount visibility trigger

  useEffect(() => {
    if (isVisible && !loadedRef.current) {
      setHasLoadedForImage(originalIndex, true);
      loadedRef.current = true;
    }
  }, [isVisible, originalIndex, setHasLoadedForImage]);

  const handleError = () => {
    setHasErrorForImage(originalIndex, true);
  };

  if (!isVisible && !hasLoaded) {
    return null;
  }

  return (
    <Suspense fallback={<Loader />}>
      <ImagePlane
        originalIndex={originalIndex}
        position={position}
        onClick={onClick}
        imageUrl={imageUrl}
        user={user}
        onDelete={onDelete}
        onError={handleError} // This now calls the store action
      />
    </Suspense>
  );
};

export default React.memo(LazyImagePlane);
