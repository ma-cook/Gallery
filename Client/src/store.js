import { create } from 'zustand';
import * as THREE from 'three';

const useStore = create((set) => ({
  images: [],
  isSettingsModalOpen: false,
  layout: 'sphere',
  interpolationFactor: 0,
  targetPosition: null,
  backgroundColor: 'white',
  glowColor: '#fff4d2',
  lightColor: '#fff4d2',
  titleOrbColor: '#fff4d2',
  textColor: '#fff4d2',
  uploadProgress: 0,
  visibleImageIndices: [],
  imageComponentStates: {}, // New state for image component-specific data

  // Actions
  setImages: (updater) =>
    set((state) => ({
      images: typeof updater === 'function' ? updater(state.images) : updater,
    })),
  setIsSettingsModalOpen: (isOpen) => set({ isSettingsModalOpen: isOpen }),
  setLayout: (layout) => set({ layout }),
  setInterpolationFactor: (factor) => set({ interpolationFactor: factor }),
  setTargetPosition: (position) => set({ targetPosition: position }),
  setBackgroundColor: (color) => set({ backgroundColor: color }),
  setGlowColor: (color) => set({ glowColor: color }),
  setLightColor: (color) => set({ lightColor: color }),
  setTitleOrbColor: (color) => set({ titleOrbColor: color }),
  setTextColor: (color) => set({ textColor: color }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setVisibleImageIndices: (indices) => set({ visibleImageIndices: indices }),

  // Actions for image component states
  ensureImageComponentState: (index) =>
    set((state) => {
      if (!state.imageComponentStates[index]) {
        return {
          imageComponentStates: {
            ...state.imageComponentStates,
            [index]: {
              boxDimensions: [1, 1],
              hasLoaded: false,
              hasError: false,
              highResolution: false, // Start with low resolution until distance is checked
            },
          },
        };
      }
      return {}; // No change if already initialized
    }),

  setBoxDimensionsForImage: (index, boxDimensions) =>
    set((state) => ({
      imageComponentStates: {
        ...state.imageComponentStates,
        [index]: {
          ...(state.imageComponentStates[index] || {}),
          boxDimensions,
        },
      },
    })),

  setHasLoadedForImage: (index, hasLoaded) =>
    set((state) => ({
      imageComponentStates: {
        ...state.imageComponentStates,
        [index]: {
          ...(state.imageComponentStates[index] || {}),
          hasLoaded,
        },
      },
    })),
  setHasErrorForImage: (index, hasError) =>
    set((state) => ({
      imageComponentStates: {
        ...state.imageComponentStates,
        [index]: {
          ...(state.imageComponentStates[index] || {}),
          hasError,
        },
      },
    })),

  setHighResolutionForImage: (index, highResolution) =>
    set((state) => ({
      imageComponentStates: {
        ...state.imageComponentStates,
        [index]: {
          ...(state.imageComponentStates[index] || {}),
          highResolution,
        },
      },
    })),
}));

export default useStore;
