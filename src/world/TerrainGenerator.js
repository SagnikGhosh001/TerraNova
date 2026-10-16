import * as THREE from 'three';
import { SimplexNoise } from '../utils/Noise.js';
import { BiomeSystem } from './BiomeSystem.js';
import { WorldConfig } from './WorldConfig.js';

/**
 * TerrainGenerator evaluates deterministic continuous heightmaps,
 * analytical seam-free normals, and builds optimized chunk geometries.
 */
export class TerrainGenerator {
  constructor(seed = WorldConfig.seed) {
    this.seed = seed;
    this.biomeSystem = new BiomeSystem(seed);

    // Multi-frequency noise generators
    this.continentNoise = new SimplexNoise(seed);
    this.mountainNoise = new SimplexNoise(seed + 1);
    this.hillsNoise = new SimplexNoise(seed + 2);
    this.detailNoise = new SimplexNoise(seed + 3);
    this.riverNoise = new SimplexNoise(seed + 4);

    // Scratch vector to avoid garbage collection
    this._normalScratch = new THREE.Vector3();
    this._colorScratch = new THREE.Color();
  }

  /**
   * Evaluates river channel presence [0 = no river, 1 = deep river center].
   */
  getRiverFactor(worldX, worldZ) {
    const raw = Math.abs(this.riverNoise.noise2D(
      worldX * WorldConfig.riverScale,
      worldZ * WorldConfig.riverScale
    ));
    const riverThreshold = 0.07;
    if (raw < riverThreshold) {
      const t = raw / riverThreshold;
      return Math.cos(t * Math.PI * 0.5);
    }
    return 0;
  }

  /**
   * Deterministic continuous height function for any world coordinate.
   */
  getHeight(worldX, worldZ) {
    // 1. Broad continental mask: defines lowlands vs mountain ranges
    const cont = this.continentNoise.fBm(
      worldX * WorldConfig.continentScale,
      worldZ * WorldConfig.continentScale,
      3
    );

    // 2. Rolling hills layer
    const hills = this.hillsNoise.fBm(
      worldX * WorldConfig.hillsScale,
      worldZ * WorldConfig.hillsScale,
      3
    );

    // 3. Sharp mountain ridges (masked by continent height)
    const mountainMask = Math.pow(Math.max(0, (cont - 0.44) / 0.56), 1.6);
    let mountainHeight = 0;
    if (mountainMask > 0.001) {
      const ridges = this.mountainNoise.ridgedNoise(
        worldX * WorldConfig.mountainScale,
        worldZ * WorldConfig.mountainScale,
        4
      );
      mountainHeight = ridges * WorldConfig.maxElevation * mountainMask;
    }

    // 4. Fine ground micro-undulations
    const detail = (this.detailNoise.noise2D(
      worldX * WorldConfig.detailScale,
      worldZ * WorldConfig.detailScale
    ) + 1) * 0.5;

    // Base elevation blend
    let h = WorldConfig.baseElevation + 2.0 + (hills * 6.5) + mountainHeight + (detail * 0.5);

    // 5. Lake basins in low continental depressions
    if (cont < 0.28) {
      const lakeDepth = (0.28 - cont) / 0.28;
      const targetLakeH = WorldConfig.waterLevel - 1.8;
      h = THREE.MathUtils.lerp(h, targetLakeH, Math.min(1, lakeDepth * 1.5));
    }

    // 6. River carving
    const riverFactor = this.getRiverFactor(worldX, worldZ);
    if (riverFactor > 0) {
      const targetRiverH = WorldConfig.waterLevel - 1.4;
      h = THREE.MathUtils.lerp(h, targetRiverH, riverFactor * 0.85);
    }

    // 7. Safe starting spawn clearing smoothing
    const spawnDist = Math.hypot(worldX - WorldConfig.spawnX, worldZ - WorldConfig.spawnZ);
    if (spawnDist < 30) {
      const spawnFactor = Math.min(1.0, spawnDist / 30);
      const targetSpawnH = WorldConfig.waterLevel + 2.4;
      h = targetSpawnH + (h - targetSpawnH) * (spawnFactor * spawnFactor);
    }

    return h;
  }

  isUnderwater(worldX, worldZ) {
    return this.getHeight(worldX, worldZ) < WorldConfig.waterLevel;
  }

  getBiome(worldX, worldZ) {
    const h = this.getHeight(worldX, worldZ);
    return this.biomeSystem.getBiome(worldX, worldZ, h);
  }

  /**
   * Analytical central-difference surface normal at any world point.
   * Guarantees 100% seamless lighting continuity across chunk boundaries!
   */
  getNormal(worldX, worldZ, eps = 0.25) {
    const hL = this.getHeight(worldX - eps, worldZ);
    const hR = this.getHeight(worldX + eps, worldZ);
    const hD = this.getHeight(worldX, worldZ - eps);
    const hU = this.getHeight(worldX, worldZ + eps);

    const dx = (hR - hL) / (2 * eps);
    const dz = (hU - hD) / (2 * eps);

    this._normalScratch.set(-dx, 1.0, -dz).normalize();
    return this._normalScratch;
  }

  /**
   * Surface slope angle in radians [0, PI/2].
   */
  getSlopeAngle(worldX, worldZ) {
    const norm = this.getNormal(worldX, worldZ);
    return Math.acos(Math.min(1, Math.max(-1, norm.y)));
  }

  /**
   * Generate an indexed BufferGeometry for a terrain chunk at grid (cx, cz).
   */
  generateChunkGeometry(cx, cz) {
    const size = WorldConfig.chunkSize;
    const res = WorldConfig.chunkResolution;
    const numVertsAcross = res + 1;
    const totalVerts = numVertsAcross * numVertsAcross;

    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const colors = new Float32Array(totalVerts * 3);
    const uvs = new Float32Array(totalVerts * 2);

    const worldOriginX = cx * size;
    const worldOriginZ = cz * size;

    let vIdx = 0;
    let uvIdx = 0;

    for (let iz = 0; iz <= res; iz++) {
      const fracZ = iz / res;
      const worldZ = worldOriginZ + fracZ * size;

      for (let ix = 0; ix <= res; ix++) {
        const fracX = ix / res;
        const worldX = worldOriginX + fracX * size;

        const h = this.getHeight(worldX, worldZ);
        const norm = this.getNormal(worldX, worldZ);
        const slope = Math.acos(Math.min(1, Math.max(-1, norm.y)));

        // World-space coordinates inside chunk
        positions[vIdx * 3 + 0] = worldX;
        positions[vIdx * 3 + 1] = h;
        positions[vIdx * 3 + 2] = worldZ;

        // Continuous analytical normals
        normals[vIdx * 3 + 0] = norm.x;
        normals[vIdx * 3 + 1] = norm.y;
        normals[vIdx * 3 + 2] = norm.z;

        // Stylized biome vertex colors
        this.biomeSystem.getVertexColor(worldX, worldZ, h, slope, this._colorScratch);
        colors[vIdx * 3 + 0] = this._colorScratch.r;
        colors[vIdx * 3 + 1] = this._colorScratch.g;
        colors[vIdx * 3 + 2] = this._colorScratch.b;

        // UVs
        uvs[uvIdx * 2 + 0] = fracX;
        uvs[uvIdx * 2 + 1] = fracZ;

        vIdx++;
        uvIdx++;
      }
    }

    // Build quad indices
    const indices = [];
    for (let iz = 0; iz < res; iz++) {
      for (let ix = 0; ix < res; ix++) {
        const a = iz * numVertsAcross + ix;
        const b = a + 1;
        const c = (iz + 1) * numVertsAcross + ix;
        const d = c + 1;

        // Two triangles per cell
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
  }
}
