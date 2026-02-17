import React, { useEffect, Suspense, useRef } from 'react';
import { shallow } from 'zustand/shallow';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import ImagePlane from './ImagePlane';
import useStore from '../store'; // Added

const LazyImagePlane = ({
  originalIndex,
  position,
  onClick,
  imageUrl,
  thumbnailUrl,
  mediumUrl,
  isGif,
  user,
  isAdmin,
  onDelete,
  isVisible,
}) => {
  const {
    ensureImageComponentState,
    updateImageComponentState, // Changed
    imageComponentStates,
  } = useStoreWithEqualityFn(useStore, (state) => ({
    ensureImageComponentState: state.ensureImageComponentState,
    updateImageComponentState: state.updateImageComponentState, // Changed
    imageComponentStates: state.imageComponentStates,
  }), shallow);
  useEffect(() => {
    ensureImageComponentState(originalIndex);
  }, [originalIndex, ensureImageComponentState]);

  // Safely access state, providing defaults if not yet initialized
  const componentState = imageComponentStates[originalIndex] || {
    hasLoaded: false,
    hasError: false,
  };
  const { hasLoaded, hasError } = componentState;

  const shouldLoadRef = useRef(false); // Track if this image should ever load

  useEffect(() => {
    // Once visible, mark as should load (never reset this)
    if (isVisible && !shouldLoadRef.current) {
      shouldLoadRef.current = true;
      updateImageComponentState(originalIndex, { hasLoaded: true });
    }
  }, [isVisible, originalIndex, updateImageComponentState]);

  const handleError = () => {
    updateImageComponentState(originalIndex, { hasError: true });
  };

  // Don't render if never been visible
  // Once loaded, keep rendering even if temporarily not visible
  if (!shouldLoadRef.current && !hasLoaded) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ImagePlane
        originalIndex={originalIndex}
        position={position}
        onClick={onClick}
        imageUrl={imageUrl}
        thumbnailUrl={thumbnailUrl}
        mediumUrl={mediumUrl}
        isGif={isGif}
        user={user}
        isAdmin={isAdmin}
        onDelete={onDelete}
        onError={handleError} // This now calls the store action
      />
    </Suspense>
  );
};

export default React.memo(LazyImagePlane);
