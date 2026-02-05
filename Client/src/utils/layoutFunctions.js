import * as THREE from 'three';

export const calculateSpherePositions = (images, sphereRadius) => {
  return images.map((_, index) => {
    const total = images.length;
    const phi = Math.acos(-1 + (2 * index) / total);
    const theta = Math.sqrt(total * Math.PI) * phi;
    return [
      sphereRadius * Math.cos(theta) * Math.sin(phi),
      sphereRadius * Math.sin(theta) * Math.sin(phi),
      sphereRadius * Math.cos(phi),
    ];
  });
};

export const calculatePlanePositions = (images) => {
  const gridSize = Math.ceil(Math.sqrt(images.length));
  const spacing = 10 + images.length * 0.1; // Adjust the spacing based on the number of images
  return images.map((_, index) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    return [
      col * spacing - (gridSize * spacing) / 2,
      row * spacing - (gridSize * spacing) / 2,
      0,
    ];
  });
};
