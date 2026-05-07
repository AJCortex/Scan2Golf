/**
 * Terrain Generator for Scan2Golf
 * Converts scan point count into a heightmap grid
 * Also generates procedural demo greens
 */

const GRID_SIZE = 32; // 32x32 height grid

/**
 * Simple noise function (no external deps required)
 */
function smoothNoise(x, y, seed = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.3) * 43758.5453;
  return n - Math.floor(n);
}

function interpolatedNoise(x, y, seed = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  // Smooth interpolation
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = smoothNoise(ix, iy, seed);
  const b = smoothNoise(ix + 1, iy, seed);
  const c = smoothNoise(ix, iy + 1, seed);
  const d = smoothNoise(ix + 1, iy + 1, seed);

  return a + (b - a) * ux + (c - a) * uy + (d - a + (a - b) - (c - d)) * ux * uy;
}

function fractalNoise(x, y, octaves = 4, seed = 0) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += interpolatedNoise(x * frequency, y * frequency, seed + i) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

/**
 * Generate terrain heightmap from a real scan session
 * In a real LiDAR implementation, this would process the actual point cloud.
 * Here we use the point count as a seed to generate believable terrain.
 */
export function generateTerrainFromScan(pointCount) {
  const seed = pointCount % 1000;
  const heights = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const nx = x / GRID_SIZE;
      const ny = y / GRID_SIZE;

      // Multi-octave noise for realistic green undulation
      let h = fractalNoise(nx * 3, ny * 3, 4, seed);

      // Add subtle slope (greens typically have drainage slope)
      h += nx * 0.08 + ny * 0.06;

      // Add a gentle bowl near the hole area
      const holePosX = 0.6;
      const holePosY = 0.5;
      const distFromHole = Math.sqrt(
        Math.pow(nx - holePosX, 2) + Math.pow(ny - holePosY, 2)
      );
      h -= Math.max(0, 0.15 - distFromHole) * 0.8;

      row.push(h);
    }
    heights.push(row);
  }

  // Normalize to 0-1 range
  let min = Infinity;
  let max = -Infinity;
  heights.forEach((row) => row.forEach((h) => {
    min = Math.min(min, h);
    max = Math.max(max, h);
  }));

  const range = max - min;
  const normalized = heights.map((row) =>
    row.map((h) => (h - min) / range)
  );

  return {
    grid: normalized,
    gridSize: GRID_SIZE,
    pointCount,
    holePosition: { x: 0.6, y: 0.5 },
    seed,
    scanned: true,
  };
}

/**
 * Generate a procedural demo green
 */
export function generateDemoTerrain(variant = 0) {
  const variants = [
    { name: 'Left Tier', slope: 'left' },
    { name: 'Right Tier', slope: 'right' },
    { name: 'Back Bowl', slope: 'bowl' },
    { name: 'False Front', slope: 'front' },
  ];

  const v = variants[variant % variants.length];
  const seed = variant * 137;
  const heights = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    const row = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const nx = x / GRID_SIZE;
      const ny = y / GRID_SIZE;

      let h = fractalNoise(nx * 2.5, ny * 2.5, 3, seed) * 0.4;

      // Apply variant-specific shape
      switch (v.slope) {
        case 'left':
          h += nx * 0.3;
          break;
        case 'right':
          h += (1 - nx) * 0.3;
          break;
        case 'bowl':
          const cx = 0.5, cy = 0.5;
          const dist = Math.sqrt(Math.pow(nx - cx, 2) + Math.pow(ny - cy, 2));
          h += dist * 0.5;
          break;
        case 'front':
          h += ny * 0.4;
          break;
      }

      row.push(h);
    }
    heights.push(row);
  }

  // Normalize
  let min = Infinity;
  let max = -Infinity;
  heights.forEach((row) => row.forEach((h) => {
    min = Math.min(min, h);
    max = Math.max(max, h);
  }));
  const range = max - min;
  const normalized = heights.map((row) =>
    row.map((h) => (h - min) / range)
  );

  return {
    grid: normalized,
    gridSize: GRID_SIZE,
    holePosition: { x: 0.55, y: 0.45 },
    seed,
    scanned: false,
    variantName: v.name,
  };
}

/**
 * Sample the height at a normalized position (0-1, 0-1)
 */
export function sampleHeight(terrainData, nx, ny) {
  if (!terrainData) return 0;
  const { grid, gridSize } = terrainData;
  const gx = Math.max(0, Math.min(gridSize - 1, Math.floor(nx * gridSize)));
  const gy = Math.max(0, Math.min(gridSize - 1, Math.floor(ny * gridSize)));
  return grid[gy][gx];
}

/**
 * Get surface normal at position (for ball physics)
 */
export function getSurfaceNormal(terrainData, nx, ny) {
  const eps = 1 / terrainData.gridSize;
  const h = sampleHeight(terrainData, nx, ny);
  const hx = sampleHeight(terrainData, nx + eps, ny);
  const hy = sampleHeight(terrainData, nx, ny + eps);

  // Return gradient vector (slope direction)
  return {
    x: (hx - h) / eps,
    y: (hy - h) / eps,
  };
}
