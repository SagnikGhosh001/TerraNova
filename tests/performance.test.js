import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ChunkManager } from '../src/world/ChunkManager.js';
import { TerrainGenerator } from '../src/world/TerrainGenerator.js';
import { CollisionSystem } from '../src/player/CollisionSystem.js';
import { Materials } from '../src/environment/Materials.js';
import { WorldConfig } from '../src/world/WorldConfig.js';
import { Coordinates } from '../src/utils/Coordinates.js';

describe('Phase 6 Performance, Stability & Determinism', () => {
  let scene;
  let materials;
  let collisionSystem;
  let terrainGenerator;
  let chunkManager;

  beforeEach(() => {
    scene = new THREE.Scene();
    materials = new Materials();
    collisionSystem = new CollisionSystem();
    terrainGenerator = new TerrainGenerator(WorldConfig.seed);
    collisionSystem.setTerrainGenerator(terrainGenerator);
    chunkManager = new ChunkManager(scene, terrainGenerator, collisionSystem, materials);
  });

  describe('Chunk Streaming Budgeting', () => {
    it('enqueues spiral neighborhood and processes at most maxChunksPerFrame per frame', () => {
      const playerPos = new THREE.Vector3(0, 5, 0);

      // Frame 1: queues chunks and generates maxChunksPerFrame
      chunkManager.update(playerPos, 0.016);

      expect(chunkManager.getActiveChunkCount()).toBeLessThanOrEqual(WorldConfig.maxChunksPerFrame);
      expect(chunkManager.getQueueLength()).toBeGreaterThan(0);

      const initialActive = chunkManager.getActiveChunkCount();

      // Frame 2: generates another batch
      chunkManager.update(playerPos, 0.016);
      expect(chunkManager.getActiveChunkCount()).toBe(initialActive + WorldConfig.maxChunksPerFrame);
    });

    it('eventually loads all render distance chunks over subsequent frames', () => {
      const playerPos = new THREE.Vector3(0, 5, 0);
      chunkManager.update(playerPos, 0.016);

      // Run enough frames to clear the queue
      let maxFrames = 50;
      while (chunkManager.isGenerating() && maxFrames-- > 0) {
        chunkManager.update(playerPos, 0.016);
      }

      expect(chunkManager.getQueueLength()).toBe(0);
      // For renderDistance = 3, (2*3+1)^2 = 49 chunks or spiral neighborhood count
      expect(chunkManager.getActiveChunkCount()).toBeGreaterThanOrEqual(25);
    });
  });

  describe('Distant Chunk Pruning & Resource Cleanup', () => {
    it('unloads chunks outside unload distance and cleans up collision meshes', () => {
      // Load chunks near origin
      const playerPos = new THREE.Vector3(0, 5, 0);
      chunkManager.update(playerPos, 0.016);

      while (chunkManager.isGenerating()) {
        chunkManager.update(playerPos, 0.016);
      }

      const originChunkKey = Coordinates.chunkKey(0, 0);
      expect(chunkManager.activeChunks.has(originChunkKey)).toBe(true);

      const initialSceneChildren = scene.children.length;
      const initialGroundMeshes = collisionSystem.groundMeshes.length;

      // Teleport far away (e.g. 1000m north)
      const farPos = new THREE.Vector3(0, 5, 1000);
      chunkManager.update(farPos, 0.016);

      // Origin chunk (0, 0) should be immediately pruned because dist > unloadDistance
      expect(chunkManager.activeChunks.has(originChunkKey)).toBe(false);
      expect(collisionSystem.groundMeshes.length).toBeLessThan(initialGroundMeshes);
    });

    it('completely disposes all active chunks, materials, and water on dispose()', () => {
      const playerPos = new THREE.Vector3(0, 5, 0);
      for (let i = 0; i < 5; i++) {
        chunkManager.update(playerPos, 0.016);
      }

      expect(chunkManager.getActiveChunkCount()).toBeGreaterThan(0);

      chunkManager.dispose();

      expect(chunkManager.getActiveChunkCount()).toBe(0);
      expect(scene.children.length).toBe(0);
      expect(collisionSystem.groundMeshes.length).toBe(0);
      expect(collisionSystem.obstacleMeshes.length).toBe(0);
    });
  });

  describe('Multi-seed Determinism and Landscape Invariance', () => {
    it('produces identical elevations for the same seed across 100 sample coordinates', () => {
      const genA = new TerrainGenerator(12345);
      const genB = new TerrainGenerator(12345);

      for (let i = 0; i < 100; i++) {
        const x = (i % 10) * 37.5 - 150;
        const z = Math.floor(i / 10) * 41.2 - 200;

        const hA = genA.getHeight(x, z);
        const hB = genB.getHeight(x, z);
        expect(hA).toBe(hB);

        const biomeA = genA.getBiome(x, z);
        const biomeB = genB.getBiome(x, z);
        expect(biomeA).toBe(biomeB);
      }
    });

    it('produces distinct landscapes for different seeds', () => {
      const gen1 = new TerrainGenerator(11111);
      const gen2 = new TerrainGenerator(99999);

      let differences = 0;
      for (let i = 1; i <= 20; i++) {
        const x = i * 45;
        const z = i * -55;
        if (Math.abs(gen1.getHeight(x, z) - gen2.getHeight(x, z)) > 0.1) {
          differences++;
        }
      }

      expect(differences).toBeGreaterThan(15);
    });
  });
});
