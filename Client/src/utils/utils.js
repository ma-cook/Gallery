import * as THREE from 'three';

export function calculateImageDimensions(image, maxWidth = 100) {
  const imgNaturalWidth = image ? image.naturalWidth : 0;
  const imgNaturalHeight = image ? image.naturalHeight : 0;
  const imgWidth = image ? image.width : 0;
  const imgHeight = image ? image.height : 0;

  // Prioritize natural dimensions, fallback to width/height
  const effectiveWidth = imgNaturalWidth || imgWidth;
  const effectiveHeight = imgNaturalHeight || imgHeight;

  if (!image || !effectiveWidth || !effectiveHeight) {
    return [1, 1];
  }

  const aspectRatio = effectiveWidth / effectiveHeight;

  let newWidth, newHeight;
  if (effectiveWidth > effectiveHeight) {
    newWidth = maxWidth;
    newHeight = maxWidth / aspectRatio;
  } else {
    newHeight = maxWidth;
    newWidth = maxWidth * aspectRatio;
  }

  return [newWidth, newHeight];
}

// Create a downscaled version of the texture for LOD (Level of Detail)
// Worker pool is removed as per request to avoid web worker issues.

// Cache for low-res textures
const lowResTextureCache = new WeakMap();

// Polyfill for requestIdleCallback
const requestIdleCallback = window.requestIdleCallback || ((cb) => {
  const start = Date.now();
  return setTimeout(() => {
    cb({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    });
  }, 1);
});

export function createLowResTexture(texture, scale = 0.2, defer = false) {
  if (!texture || !texture.image) {
    return Promise.resolve(null); // Return a resolved promise with null
  }

  // Check cache first
  if (lowResTextureCache.has(texture)) {
    return Promise.resolve(lowResTextureCache.get(texture));
  }

  const imageSource = texture.image; // HTMLImageElement, ImageBitmap, HTMLCanvasElement, etc.
  // Ensure width and height are valid numbers greater than 0
  const originalWidth = Number(imageSource.naturalWidth || imageSource.width);
  const originalHeight = Number(
    imageSource.naturalHeight || imageSource.height
  );

  if (
    isNaN(originalWidth) ||
    isNaN(originalHeight) ||
    originalWidth <= 0 ||
    originalHeight <= 0
  ) {
    console.warn(
      'Image source for low-res texture has invalid or zero dimensions.'
    );
    return Promise.resolve(null);
  }

  const generateTexture = () => {
    return new Promise((resolve, reject) => {
      try {
        const scaledWidth = Math.max(1, Math.round(originalWidth * scale));
        const scaledHeight = Math.max(1, Math.round(originalHeight * scale));

      // Use OffscreenCanvas if available for better performance
      const canvas = typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(scaledWidth, scaledHeight)
        : document.createElement('canvas');
      
      if (canvas instanceof HTMLCanvasElement) {
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
      }

      const ctx = canvas.getContext('2d', { 
        alpha: false, // Disable alpha for better performance if not needed
        willReadFrequently: false 
      });
      
      // Disable image smoothing for faster rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'low'; // Use low quality for speed
      
      // imageSource can be HTMLImageElement, SVGImageElement, HTMLVideoElement, HTMLCanvasElement, ImageBitmap, OffscreenCanvas.
      // All are valid for drawImage.
      ctx.drawImage(imageSource, 0, 0, scaledWidth, scaledHeight);

      // createImageBitmap can take an ImageBitmapSource (which canvas is)
      createImageBitmap(canvas, { 
        imageOrientation: 'flipY',
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none' // Skip color space conversion for speed
      })
        .then((imageBitmap) => {
          const lowResThreeTexture = texture.clone(); // Clone the original texture
          lowResThreeTexture.image = imageBitmap; // Replace its image
          lowResThreeTexture.source.data = imageBitmap; // Ensure source data is updated
          lowResThreeTexture.generateMipmaps = false; // Disable mipmaps for low-res
          lowResThreeTexture.needsUpdate = true; // Signal Three.js to update the GPU texture

          // Cache the result
          lowResTextureCache.set(texture, lowResThreeTexture);

          resolve(lowResThreeTexture);
        })
        .catch((err) => {
          console.error('Error creating ImageBitmap for low-res texture:', err);
          reject(err); // Reject the main promise
        });
    } catch (error) {
      console.error('Error in createLowResTexture synchronous part:', error);
      reject(error); // Reject the main promise
    }
    });
  };

  // If defer is true, wait for idle time to generate texture
  if (defer) {
    return new Promise((resolve, reject) => {
      requestIdleCallback(() => {
        generateTexture().then(resolve).catch(reject);
      }, { timeout: 2000 }); // Fallback after 2 seconds
    });
  }

  return generateTexture();
}
