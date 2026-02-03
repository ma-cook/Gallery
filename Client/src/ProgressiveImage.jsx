import React, { useState, useEffect, useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

// Progressive image loader that loads a low-quality version first
export function useProgressiveTexture(imageUrl) {
  const [lowQualityUrl, setLowQualityUrl] = useState(null);
  const [isHighQualityReady, setIsHighQualityReady] = useState(false);
  const highQualityTextureRef = useRef(null);

  // Generate a low-quality data URL for initial display
  useEffect(() => {
    let isMounted = true;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      if (!isMounted) return;
      
      // Create a tiny canvas for blur effect
      const canvas = document.createElement('canvas');
      const maxSize = 40; // Very small for fast loading
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      
      canvas.width = Math.max(1, Math.floor(img.width * scale));
      canvas.height = Math.max(1, Math.floor(img.height * scale));
      
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'low';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
      if (isMounted) {
        setLowQualityUrl(dataUrl);
      }
    };
    
    img.src = imageUrl;
    
    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  // Load low quality texture immediately if available
  const lowTexture = useLoader(
    TextureLoader,
    lowQualityUrl || imageUrl,
    (loader) => {
      if (window.THREE_LOADING_MANAGER) {
        loader.manager = window.THREE_LOADING_MANAGER;
      }
    }
  );

  // Asynchronously load high quality in the background
  useEffect(() => {
    if (!lowQualityUrl) return; // Wait for low quality to be ready
    
    let isMounted = true;
    const loader = new TextureLoader();
    
    if (window.THREE_LOADING_MANAGER) {
      loader.manager = window.THREE_LOADING_MANAGER;
    }
    
    loader.load(
      imageUrl,
      (highTexture) => {
        if (isMounted) {
          highTexture.minFilter = THREE.LinearFilter;
          highTexture.magFilter = THREE.LinearFilter;
          highTexture.generateMipmaps = false;
          highTexture.needsUpdate = true;
          highQualityTextureRef.current = highTexture;
          setIsHighQualityReady(true);
        }
      },
      undefined,
      (err) => {
        console.error('Failed to load high quality texture:', err);
      }
    );
    
    return () => {
      isMounted = false;
      if (highQualityTextureRef.current) {
        highQualityTextureRef.current.dispose();
      }
    };
  }, [imageUrl, lowQualityUrl]);

  // Configure low texture
  if (lowTexture) {
    lowTexture.minFilter = THREE.LinearFilter;
    lowTexture.magFilter = THREE.LinearFilter;
    lowTexture.generateMipmaps = false;
    lowTexture.needsUpdate = true;
  }

  // Return high quality if ready, otherwise low quality
  return {
    texture: isHighQualityReady ? highQualityTextureRef.current : lowTexture,
    isHighQuality: isHighQualityReady,
    isLoading: !lowTexture,
  };
}
