/**
 * Shared coordinate conversion and chunk index calculations.
 */
export const Coordinates = {
  /**
   * Convert world coordinates (x, z) to chunk grid coordinates (cx, cz).
   */
  worldToChunk(x, z, chunkSize) {
    return {
      cx: Math.floor(x / chunkSize),
      cz: Math.floor(z / chunkSize),
    };
  },

  /**
   * Convert chunk coordinates (cx, cz) to world origin (min X, min Z) of the chunk.
   */
  chunkToWorldOrigin(cx, cz, chunkSize) {
    return {
      x: cx * chunkSize,
      z: cz * chunkSize,
    };
  },

  /**
   * Convert chunk coordinates (cx, cz) to world center point of the chunk.
   */
  chunkToWorldCenter(cx, cz, chunkSize) {
    return {
      x: (cx + 0.5) * chunkSize,
      z: (cz + 0.5) * chunkSize,
    };
  },

  /**
   * Unique string key for chunk map lookups: 'cx,cz'
   */
  chunkKey(cx, cz) {
    return `${cx},${cz}`;
  },

  /**
   * Parse chunk key back to { cx, cz }
   */
  parseChunkKey(key) {
    const parts = key.split(',');
    return {
      cx: parseInt(parts[0], 10),
      cz: parseInt(parts[1], 10),
    };
  },

  /**
   * Euclidean distance in chunks
   */
  chunkDistance(cx1, cz1, cx2, cz2) {
    return Math.hypot(cx1 - cx2, cz1 - cz2);
  },

  /**
   * Chebyshev distance (grid ring distance)
   */
  chebyshevDistance(cx1, cz1, cx2, cz2) {
    return Math.max(Math.abs(cx1 - cx2), Math.abs(cz1 - cz2));
  },

  /**
   * Return array of { cx, cz, dist } sorted by distance from center chunk
   */
  getSpiralChunkCoords(centerCx, centerCz, radius) {
    const coords = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const cx = centerCx + dx;
        const cz = centerCz + dz;
        const dist = Math.hypot(dx, dz);
        if (dist <= radius + 0.5) {
          coords.push({ cx, cz, dist });
        }
      }
    }

    // Sort closest to farthest so nearby chunks generate first
    coords.sort((a, b) => a.dist - b.dist);
    return coords;
  },
};
