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
  imageComponentStates: {},

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

  // Consolidated action to update parts of an image's component state
  updateImageComponentState: (index, partialState) =>
    set((state) => {
      const existingStateAtIndex = state.imageComponentStates[index] || {
        // Provide a minimal default structure if ensureImageComponentState wasn't called,
        // though ideally ensureImageComponentState handles full initialization.
        boxDimensions: [1, 1],
        hasLoaded: false,
        hasError: false,
        highResolution: false,
      };
      return {
        imageComponentStates: {
          ...state.imageComponentStates,
          [index]: {
            ...existingStateAtIndex,
            ...partialState, // Spread the new properties
          },
        },
      };
    }),
}));

export default useStore;
