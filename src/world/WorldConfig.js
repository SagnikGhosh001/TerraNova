/**
 * Centralized world generation and streaming configuration.
 * Single source of truth for seed, chunk size, LOD, and distances.
 */
export const WorldConfig = {
  // Generation seed
  seed: 84920,

  // Chunk grid dimensions
  chunkSize: 64,          // Size in world meters
  chunkResolution: 32,    // Subdivisions per chunk (33x33 vertices = 1089 vertices)

  // Streaming radius
  renderDistance: 3,      // Radius of active chunks around player (approx 448m diameter)
  unloadDistance: 4,      // Radius beyond which distant chunks are pruned

  // Budgeting
  maxChunksPerFrame: 1,   // Max chunks to generate per frame to prevent stutter

  // Terrain height shaping
  baseElevation: 2.0,     // Base terrain floor
  maxElevation: 30.0,     // Tallest mountain summits
  waterLevel: 3.8,        // Ocean / Lake / River water plane height

  // Noise scales (lower frequency = larger landforms)
  continentScale: 0.0018, // Broad landmass and ocean/lake basin distribution
  mountainScale: 0.0055,  // Mountain chains and ridges
  hillsScale: 0.014,      // Rolling hills and mounds
  detailScale: 0.045,     // Small ground undulations and texture
  biomeScale: 0.0012,     // Biome moisture and temperature distribution
  riverScale: 0.0032,     // River valley paths
  riverWidth: 12.0,       // Carved river channel width

  // Spawn point
  spawnX: 0,
  spawnZ: 0,
};
