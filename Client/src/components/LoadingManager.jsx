import React, { useState, useEffect, createContext, useContext } from 'react';
import { LoadingManager as ThreeLoadingManager } from 'three';

// Create a context for global loading manager state
export const LoadingContext = createContext({
  progress: 0,
  active: false,
});

// Custom hook to access loading context
export const useLoading = () => useContext(LoadingContext);

// Component that provides the loading manager context
export function LoadingProvider({ children }) {
  const [loadingState, setLoadingState] = useState({
    progress: 0,
    active: false,
    itemsTotal: 0,
    itemsLoaded: 0,
  });

  useEffect(() => {
    // Create a global Three.js LoadingManager
    const manager = new ThreeLoadingManager();

    // Set up event handlers
    manager.onStart = (url, itemsLoaded, itemsTotal) => {
      setLoadingState({
        progress: 0,
        active: true,
        itemsTotal,
        itemsLoaded: 0,
      });
    };

    manager.onLoad = () => {
      setLoadingState({
        progress: 100,
        active: false,
        itemsTotal: 0,
        itemsLoaded: 0,
      });
    };

    manager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const progress = Math.round((itemsLoaded / itemsTotal) * 100);
      setLoadingState({
        progress,
        active: true,
        itemsTotal,
        itemsLoaded,
      });
    };

    manager.onError = (url) => {
      console.error(`Error loading ${url}`);
    };

    // Make the manager globally available
    window.THREE_LOADING_MANAGER = manager;

    return () => {
      // Clean up
      window.THREE_LOADING_MANAGER = null;
    };
  }, []);

  return (
    <LoadingContext.Provider value={loadingState}>
      {children}
    </LoadingContext.Provider>
  );
}
