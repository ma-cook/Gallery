export function calculateImageDimensions(image, maxWidth = 10) {
  if (!image || !image.naturalWidth || !image.naturalHeight) {
    // Return default dimensions or throw an error if image is invalid
    return [1, 1];
  }

  const aspectRatio = image.naturalWidth / image.naturalHeight;

  let newWidth, newHeight;
  if (image.naturalWidth > image.naturalHeight) {
    newWidth = maxWidth;
    newHeight = maxWidth / aspectRatio;
  } else {
    newHeight = maxWidth;
    newWidth = maxWidth * aspectRatio;
  }

  return [Math.round(newWidth), Math.round(newHeight)];
}
