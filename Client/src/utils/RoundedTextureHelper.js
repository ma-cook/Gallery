import * as THREE from 'three';

// Apply rounded corners to a texture by modifying it directly
export function applyRoundedCorners(texture, cornerRadius = 0.05) {
  if (!texture || !texture.image) return texture;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  
  const img = texture.image;
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  
  canvas.width = width;
  canvas.height = height;
  
  const radius = Math.min(width, height) * cornerRadius;
  
  // Draw rounded rectangle mask
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(width - radius, 0);
  ctx.quadraticCurveTo(width, 0, width, radius);
  ctx.lineTo(width, height - radius);
  ctx.quadraticCurveTo(width, height, width - radius, height);
  ctx.lineTo(radius, height);
  ctx.quadraticCurveTo(0, height, 0, height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.clip();
  
  // Draw the image
  ctx.drawImage(img, 0, 0, width, height);
  
  // Create new texture from canvas
  const roundedTexture = new THREE.CanvasTexture(canvas);
  roundedTexture.minFilter = THREE.LinearFilter;
  roundedTexture.magFilter = THREE.LinearFilter;
  roundedTexture.generateMipmaps = false;
  roundedTexture.needsUpdate = true;
  
  return roundedTexture;
}
