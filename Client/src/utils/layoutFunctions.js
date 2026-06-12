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

export const calculateVerticalPositions = (images) => {
  if (images.length === 0) return [];
  const xPositions = [-50, -17, 17, 50];
  const ySpacing = 15;
  const startY = 20;

  return images.map((_, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = xPositions[col];
    const y = startY - row * ySpacing;
    const z = 0;
    return [x, y, z];
  });
};
