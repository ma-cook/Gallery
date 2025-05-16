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

  return [Math.round(newWidth), Math.round(newHeight)];
}

// Create a downscaled version of the texture for LOD (Level of Detail)
// Worker pool is removed as per request to avoid web worker issues.

export function createLowResTexture(texture, scale = 0.25) {
  if (!texture || !texture.image) {
    return Promise.resolve(null); // Return a resolved promise with null
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

  return new Promise((resolve, reject) => {
    try {
      const scaledWidth = Math.max(1, Math.round(originalWidth * scale));
      const scaledHeight = Math.max(1, Math.round(originalHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      const ctx = canvas.getContext('2d');
      // imageSource can be HTMLImageElement, SVGImageElement, HTMLVideoElement, HTMLCanvasElement, ImageBitmap, OffscreenCanvas.
      // All are valid for drawImage.
      ctx.drawImage(imageSource, 0, 0, scaledWidth, scaledHeight);

      // createImageBitmap can take an ImageBitmapSource (which canvas is)
      createImageBitmap(canvas)
        .then((imageBitmap) => {
          const lowResThreeTexture = texture.clone(); // Clone the original texture
          lowResThreeTexture.image = imageBitmap; // Replace its image
          lowResThreeTexture.source.data = imageBitmap; // Ensure source data is updated
          lowResThreeTexture.needsUpdate = true; // Signal Three.js to update the GPU texture

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
}
