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
    updateImageComponentState, // Changed
    imageComponentStates,
  } = useStore((state) => ({
    ensureImageComponentState: state.ensureImageComponentState,
    updateImageComponentState: state.updateImageComponentState, // Changed
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
      updateImageComponentState(originalIndex, { hasLoaded: true }); // Changed
      loadedRef.current = true;
    }
  }, [isVisible, originalIndex, updateImageComponentState]); // Changed

  const handleError = () => {
    updateImageComponentState(originalIndex, { hasError: true }); // Changed
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
