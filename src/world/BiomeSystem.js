import * as THREE from 'three';
import { SimplexNoise } from '../utils/Noise.js';
import { WorldConfig } from './WorldConfig.js';

export const BiomeType = {
  PLAINS: 'plains',
  FOREST: 'forest',
  MOUNTAIN: 'mountain',
  BEACH: 'beach',
};

/**
 * BiomeSystem determines biome classification, terrain parameters,
 * and vertex color blending based on temperature, moisture, height, and slope.
 */
export class BiomeSystem {
  constructor(seed = WorldConfig.seed) {
    this.tempNoise = new SimplexNoise(seed + 101);
    this.moistureNoise = new SimplexNoise(seed + 202);

    // Pre-allocate color objects to avoid GC
    this._cPlains = new THREE.Color(0x569642);     // Vibrant green
    this._cForest = new THREE.Color(0x38732e);     // Deep woodland green
    this._cBeach = new THREE.Color(0xcaba86);      // Warm sandy shore
    this._cRock = new THREE.Color(0x606975);       // Slate cliff rock
    this._cDarkRock = new THREE.Color(0x424953);   // Steep dark rock
    this._cSnow = new THREE.Color(0xecf3f8);       // Crisp alpine snow
    this._cDirt = new THREE.Color(0x826747);       // Valley loam

    this._tempColor = new THREE.Color();
  }

  /**
   * Get temperature and moisture at world coordinate in [0, 1]
   */
  getClimate(worldX, worldZ) {
    const scale = WorldConfig.biomeScale;
    const temp = this.tempNoise.fBm(worldX * scale, worldZ * scale, 3);
    const moisture = this.moistureNoise.fBm(worldX * scale + 500, worldZ * scale + 500, 3);
    return { temp, moisture };
  }

  /**
   * Determine primary biome type at world coordinate.
   */
  getBiome(worldX, worldZ, elevation) {
    if (elevation < WorldConfig.waterLevel + 1.2) {
      return BiomeType.BEACH;
    }

    if (elevation > 16.0) {
      return BiomeType.MOUNTAIN;
    }

    const { moisture } = this.getClimate(worldX, worldZ);
    if (moisture > 0.52) {
      return BiomeType.FOREST;
    }

    return BiomeType.PLAINS;
  }

  /**
   * Calculate stylized vertex color based on biome, elevation, and surface slope.
   */
  getVertexColor(worldX, worldZ, elevation, slopeAngle, outColor) {
    const color = outColor || new THREE.Color();
    const { moisture } = this.getClimate(worldX, worldZ);

    // 1. Shore / Beach transition near water
    const beachEdge = WorldConfig.waterLevel + 1.2;
    if (elevation <= beachEdge) {
      const t = Math.max(0, Math.min(1, (elevation - WorldConfig.waterLevel) / 1.2));
      color.copy(this._cBeach).lerp(this._cPlains, t * 0.7);
      return color;
    }

    // 2. Base ground color by moisture (plains vs forest)
    const forestBlend = Math.min(1, Math.max(0, (moisture - 0.42) / 0.25));
    color.copy(this._cPlains).lerp(this._cForest, forestBlend);

    // 3. Slope check: steep cliffs (> 32 deg) expose rock
    const slopeDeg = slopeAngle * (180 / Math.PI);
    if (slopeDeg > 28) {
      const rockBlend = Math.min(1, (slopeDeg - 28) / 16);
      const cliffColor = slopeDeg > 45 ? this._cDarkRock : this._cRock;
      color.lerp(cliffColor, rockBlend * 0.95);
      return color;
    }

    // 4. Elevation blend: high altitudes transition into rock and snow
    if (elevation > 14) {
      const rockT = Math.min(1, (elevation - 14) / 7);
      color.lerp(this._cRock, rockT * 0.85);

      if (elevation > 21) {
        const snowT = Math.min(1, (elevation - 21) / 5);
        color.lerp(this._cSnow, snowT * 0.95);
      }
    }

    return color;
  }
}
