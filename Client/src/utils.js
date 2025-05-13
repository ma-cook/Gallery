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
export function createLowResTexture(texture, scale = 0.25) {
  if (!texture || !texture.image) return null;

  // Create a canvas for downscaling
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Set canvas dimensions to a fraction of the original image
  const width = Math.max(32, Math.floor(texture.image.width * scale));
  const height = Math.max(32, Math.floor(texture.image.height * scale));

  canvas.width = width;
  canvas.height = height;

  // Draw the image at the reduced resolution
  ctx.drawImage(texture.image, 0, 0, width, height);

  // Create a new texture from the canvas
  const lowResTexture = texture.clone();
  lowResTexture.image = canvas;
  lowResTexture.needsUpdate = true;

  return lowResTexture;
}
