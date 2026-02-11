import { create } from 'zustand';
import * as THREE from 'three';

const useStore = create((set) => ({
  images: [],
  isSettingsModalOpen: false,
  layout: 'sphere',
  interpolationFactor: 0,
  targetPosition: null,
  cameraOffset: 8,
  backgroundColor: 'white',
  glowColor: '#fff4d2',
  lightColor: '#fff4d2',
  titleOrbColor: '#fff4d2',
  textColor: '#fff4d2',
  titleColor: '#fff4d2',
  buttonPrimaryColor: '#fff4d2',
  buttonSecondaryColor: 'rgba(0, 0, 0, 0.6)',
  backgroundBlurriness: 0.02,
  backgroundIntensity: 0.08,
  hdrFileUrl: '/syferfontein_1d_clear_puresky_4k.hdr',
  uploadProgress: 0,
  visibleImageIndices: [],
  imageComponentStates: {},

  // Auth state (moved from App.jsx useState)
  user: null,
  isAdmin: false,

  // UI modal states (moved from App.jsx / UIOverlay.jsx useState)
  isAuthModalOpen: false,
  isCommissionVisible: false,
  isRequestsVisible: false,
  isProductsVisible: false,

  // Actions
  setImages: (updater) =>
    set((state) => ({
      images: typeof updater === 'function' ? updater(state.images) : updater,
    })),
  setIsSettingsModalOpen: (isOpen) => set({ isSettingsModalOpen: isOpen }),
  setLayout: (layout) => set({ layout }),
  setInterpolationFactor: (factor) => set({ interpolationFactor: factor }),
  setTargetPosition: (position) => set({ targetPosition: position }),
  setCameraOffset: (offset) => set({ cameraOffset: offset }),
  setBackgroundColor: (color) => set({ backgroundColor: color }),
  setGlowColor: (color) => set({ glowColor: color }),
  setLightColor: (color) => set({ lightColor: color }),
  setTitleOrbColor: (color) => set({ titleOrbColor: color }),
  setTextColor: (color) => set({ textColor: color }),
  setTitleColor: (color) => set({ titleColor: color }),
  setButtonPrimaryColor: (color) => set({ buttonPrimaryColor: color }),
  setButtonSecondaryColor: (color) => set({ buttonSecondaryColor: color }),
  setBackgroundBlurriness: (value) => set({ backgroundBlurriness: value }),
  setBackgroundIntensity: (value) => set({ backgroundIntensity: value }),
  setHdrFileUrl: (url) => set({ hdrFileUrl: url }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setVisibleImageIndices: (indices) => set({ visibleImageIndices: indices }),

  // Auth actions
  setUser: (user) => set({ user }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),

  // UI modal actions
  setIsAuthModalOpen: (isOpen) => set({ isAuthModalOpen: isOpen }),
  setIsCommissionVisible: (isVisible) => set({ isCommissionVisible: isVisible }),
  setIsRequestsVisible: (isVisible) => set({ isRequestsVisible: isVisible }),
  setIsProductsVisible: (isVisible) => set({ isProductsVisible: isVisible }),

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
              qualityLevel: 'thumbnail', // Start with thumbnail quality until distance is checked
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
        qualityLevel: 'thumbnail',
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
