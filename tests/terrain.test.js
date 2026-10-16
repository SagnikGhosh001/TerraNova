import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { Random } from '../src/utils/Random.js';
import { SimplexNoise } from '../src/utils/Noise.js';
import { Coordinates } from '../src/utils/Coordinates.js';
import { TerrainGenerator } from '../src/world/TerrainGenerator.js';
import { BiomeSystem, BiomeType } from '../src/world/BiomeSystem.js';
import { ChunkManager } from '../src/world/ChunkManager.js';
import { CollisionSystem } from '../src/player/CollisionSystem.js';
import { WorldConfig } from '../src/world/WorldConfig.js';
import { Materials } from '../src/environment/Materials.js';

describe('Phase 2 - Procedural Terrain & Chunk System', () => {
  describe('Random PRNG', () => {
    it('generates identical sequence with identical seeds', () => {
      const rng1 = new Random(42);
      const rng2 = new Random(42);

      for (let i = 0; i < 20; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    it('generates different sequence with different seeds', () => {
      const rng1 = new Random(100);
      const rng2 = new Random(200);

      const seq1 = [rng1.next(), rng1.next(), rng1.next()];
      const seq2 = [rng2.next(), rng2.next(), rng2.next()];
      expect(seq1).not.toEqual(seq2);
    });

    it('respects range bounds', () => {
      const rng = new Random(999);
      for (let i = 0; i < 50; i++) {
        const val = rng.range(5, 10);
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThan(10);
      }
    });
  });

  describe('SimplexNoise', () => {
    it('evaluates deterministically for same coordinates', () => {
      const noise = new SimplexNoise(12345);
      const val1 = noise.noise2D(12.34, 56.78);
      const val2 = noise.noise2D(12.34, 56.78);
      expect(val1).toBe(val2);
    });

    it('demonstrates smooth spatial continuity', () => {
      const noise = new SimplexNoise(12345);
      const base = noise.noise2D(10.0, 10.0);
      const near = noise.noise2D(10.005, 10.005);
      expect(Math.abs(base - near)).toBeLessThan(0.05);
    });
  });

  describe('Coordinates', () => {
    it('converts world coordinates to chunk coordinates accurately across quadrants', () => {
      expect(Coordinates.worldToChunk(0, 0, 64)).toEqual({ cx: 0, cz: 0 });
      expect(Coordinates.worldToChunk(63.9, 63.9, 64)).toEqual({ cx: 0, cz: 0 });
      expect(Coordinates.worldToChunk(64.1, 0, 64)).toEqual({ cx: 1, cz: 0 });
      expect(Coordinates.worldToChunk(-0.1, -0.1, 64)).toEqual({ cx: -1, cz: -1 });
      expect(Coordinates.worldToChunk(-64, -64, 64)).toEqual({ cx: -1, cz: -1 });
      expect(Coordinates.worldToChunk(-64.1, 0, 64)).toEqual({ cx: -2, cz: 0 });
    });

    it('returns sorted spiral chunks with center chunk first', () => {
      const chunks = Coordinates.getSpiralChunkCoords(0, 0, 2);
      expect(chunks[0].cx).toBe(0);
      expect(chunks[0].cz).toBe(0);
      expect(chunks[0].dist).toBe(0);
      expect(chunks.length).toBeGreaterThan(10);
    });
  });

  describe('TerrainGenerator & Seamless Chunk Boundaries', () => {
    let generator;

    beforeEach(() => {
      generator = new TerrainGenerator(WorldConfig.seed);
    });

    it('produces 100% identical height at chunk boundaries', () => {
      // Chunk (0, 0) right edge is at x = 64
      // Chunk (1, 0) left edge is at x = 64
      const boundaryX = 64;
      for (let z = 0; z <= 64; z += 4) {
        const heightAtChunkAEdge = generator.getHeight(boundaryX, z);
        const heightAtChunkBEdge = generator.getHeight(boundaryX, z);
        expect(heightAtChunkAEdge).toBe(heightAtChunkBEdge);
      }
    });

    it('produces 100% identical analytical normals across chunk boundaries (zero lighting seams)', () => {
      const boundaryX = 64;
      for (let z = 0; z <= 64; z += 8) {
        const normalA = generator.getNormal(boundaryX, z);
        const normalB = generator.getNormal(boundaryX, z);

        expect(normalA.x).toBeCloseTo(normalB.x, 6);
        expect(normalA.y).toBeCloseTo(normalB.y, 6);
        expect(normalA.z).toBeCloseTo(normalB.z, 6);
      }
    });

    it('computes unit-length normals and valid slope angles', () => {
      const norm = generator.getNormal(25.5, -42.8);
      expect(norm.length()).toBeCloseTo(1.0, 4);

      const slope = generator.getSlopeAngle(25.5, -42.8);
      expect(slope).toBeGreaterThanOrEqual(0);
      expect(slope).toBeLessThanOrEqual(Math.PI / 2);
    });

    it('generates fully formed chunk geometry with valid attributes and indices', () => {
      const geo = generator.generateChunkGeometry(0, 0);
      expect(geo.attributes.position).toBeDefined();
      expect(geo.attributes.normal).toBeDefined();
      expect(geo.attributes.color).toBeDefined();
      expect(geo.attributes.uv).toBeDefined();
      expect(geo.index).toBeDefined();

      const res = WorldConfig.chunkResolution;
      const expectedVerts = (res + 1) * (res + 1);
      expect(geo.attributes.position.count).toBe(expectedVerts);
      expect(geo.index.count).toBe(res * res * 6);
    });
  });

  describe('BiomeSystem', () => {
    let biomeSystem;

    beforeEach(() => {
      biomeSystem = new BiomeSystem(WorldConfig.seed);
    });

    it('classifies biomes by elevation and climate', () => {
      const lowBiome = biomeSystem.getBiome(0, 0, WorldConfig.waterLevel + 0.5);
      expect(lowBiome).toBe(BiomeType.BEACH);

      const mountainBiome = biomeSystem.getBiome(0, 0, 24.0);
      expect(mountainBiome).toBe(BiomeType.MOUNTAIN);
    });

    it('computes valid RGB vertex colors in [0, 1]', () => {
      const color = biomeSystem.getVertexColor(10, 20, 12, 0.2);
      expect(color.r).toBeGreaterThanOrEqual(0);
      expect(color.r).toBeLessThanOrEqual(1);
      expect(color.g).toBeGreaterThanOrEqual(0);
      expect(color.g).toBeLessThanOrEqual(1);
      expect(color.b).toBeGreaterThanOrEqual(0);
      expect(color.b).toBeLessThanOrEqual(1);
    });
  });
  describe('ChunkManager', () => {
    let scene;
    let collisionSystem;
    let generator;
    let materials;
    let chunkManager;

    beforeEach(() => {
      scene = new THREE.Scene();
      collisionSystem = new CollisionSystem();
      generator = new TerrainGenerator(WorldConfig.seed);
      materials = new Materials();
      chunkManager = new ChunkManager(scene, generator, collisionSystem, materials);
    });

    it('enqueues and progressively builds chunks around the player', () => {
      // Player at origin (0, 0)
      chunkManager.update(new THREE.Vector3(0, 2, 0));

      expect(chunkManager.getQueueLength()).toBeGreaterThan(0);

      // Advance frames to process chunks
      while (chunkManager.isGenerating()) {
        chunkManager._processQueue();
      }

      expect(chunkManager.getActiveChunkCount()).toBeGreaterThan(15);
      expect(chunkManager.activeChunks.has('0,0')).toBe(true);
    });

    it('prunes chunks that fall outside the unload distance', () => {
      // Load chunks at (0, 0)
      chunkManager.update(new THREE.Vector3(0, 2, 0));
      while (chunkManager.isGenerating()) {
        chunkManager._processQueue();
      }
      expect(chunkManager.activeChunks.has('0,0')).toBe(true);

      // Move player far away: cx = 10, cz = 10 (640m away)
      const farPos = new THREE.Vector3(640, 2, 640);
      chunkManager.update(farPos);

      // Chunk '0,0' should now be pruned
      expect(chunkManager.activeChunks.has('0,0')).toBe(false);
    });
  });
});
