import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { Materials } from '../src/environment/Materials.js';
import { WaterGenerator } from '../src/world/WaterGenerator.js';
import { VegetationGenerator } from '../src/world/VegetationGenerator.js';
import { StructureModels } from '../src/world/StructureModels.js';
import { BuildingGenerator } from '../src/world/BuildingGenerator.js';
import { TerrainGenerator } from '../src/world/TerrainGenerator.js';
import { CollisionSystem } from '../src/player/CollisionSystem.js';
import { WorldConfig } from '../src/world/WorldConfig.js';

describe('Phase 3 - Environment Generation', () => {
  let materials;
  let terrainGenerator;
  let collisionSystem;

  beforeEach(() => {
    materials = new Materials();
    terrainGenerator = new TerrainGenerator(WorldConfig.seed);
    collisionSystem = new CollisionSystem();
  });

  describe('WaterGenerator', () => {
    let waterGen;

    beforeEach(() => {
      waterGen = new WaterGenerator();
    });

    it('creates animated water shader material with ripple uniform', () => {
      expect(waterGen.waterMaterial).toBeDefined();
      expect(waterGen.waterMaterial.uniforms.uTime).toBeDefined();

      waterGen.update(0.016, 2.5);
      expect(waterGen.waterMaterial.uniforms.uTime.value).toBe(2.5);
    });

    it('creates water plane mesh when chunk terrain is below water level', () => {
      // Create mock terrain generator with low depression
      const mockTerrain = {
        getHeight: () => WorldConfig.waterLevel - 1.0,
      };

      const mesh = waterGen.createChunkWater(0, 0, mockTerrain);
      expect(mesh).not.toBeNull();
      expect(mesh.position.y).toBe(WorldConfig.waterLevel);
    });

    it('returns null when chunk is completely above water', () => {
      const mockHighTerrain = {
        getHeight: () => WorldConfig.waterLevel + 10.0,
      };

      const mesh = waterGen.createChunkWater(0, 0, mockHighTerrain);
      expect(mesh).toBeNull();
    });
  });

  describe('VegetationGenerator', () => {
    let vegGen;

    beforeEach(() => {
      vegGen = new VegetationGenerator(materials);
    });

    it('generates instanced trees, rocks, and grass for a chunk', () => {
      const result = vegGen.generateChunkVegetation(0, 0, terrainGenerator, collisionSystem);

      expect(result.group).toBeDefined();
      expect(result.group.children.length).toBeGreaterThan(0);

      // Verify instanced meshes are present
      const hasInstanced = result.group.children.some((child) => child.isInstancedMesh);
      expect(hasInstanced).toBe(true);
    });

    it('adds obstacle colliders for solid tree trunks and rocks', () => {
      const initialColliders = collisionSystem.obstacleMeshes.length;
      const result = vegGen.generateChunkVegetation(0, 0, terrainGenerator, collisionSystem);

      expect(result.colliders.length).toBeGreaterThan(0);
      expect(collisionSystem.obstacleMeshes.length).toBe(initialColliders + result.colliders.length);
    });
  });

  describe('StructureModels', () => {
    let models;

    beforeEach(() => {
      models = new StructureModels(materials);
    });

    it('creates cabin with foundation, walls, roof, chimney, and colliders', () => {
      const cabin = models.createCabin(6.0, 5.0, 3.2);
      expect(cabin.mesh).toBeDefined();
      expect(cabin.colliders.length).toBeGreaterThan(2);
      expect(cabin.walkables.length).toBeGreaterThan(0);
    });

    it('creates watchtower with battlements and observation platform', () => {
      const tower = models.createWatchtower(3.5, 12.0);
      expect(tower.mesh).toBeDefined();
      expect(tower.colliders.length).toBeGreaterThan(0);
      expect(tower.walkables.length).toBeGreaterThan(0);
    });

    it('creates wooden bridge with deck walkables and railings', () => {
      const bridge = models.createWoodenBridge(20.0, 4.0);
      expect(bridge.mesh).toBeDefined();
      expect(bridge.walkables.length).toBeGreaterThan(0); // Deck
      expect(bridge.colliders.length).toBeGreaterThan(0); // Railings
    });
  });

  describe('BuildingGenerator', () => {
    let buildingGen;

    beforeEach(() => {
      buildingGen = new BuildingGenerator(materials);
    });

    it('deterministically generates Starter Outpost at chunk (0, 0)', () => {
      const result = buildingGen.generateChunkBuildings(0, 0, terrainGenerator, collisionSystem);

      expect(result.group.children.length).toBeGreaterThan(0);
      expect(result.colliders.length).toBeGreaterThan(0);
      expect(result.walkables.length).toBeGreaterThan(0);

      // Should include cabin, campfire/benches, and bridge
      const names = result.group.children.map((c) => c.name);
      expect(names).toContain('Cabin');
      expect(names).toContain('WoodenBridge');
    });

    it('generates consistent structures across repeated invocations', () => {
      const r1 = buildingGen.generateChunkBuildings(1, 1, terrainGenerator, collisionSystem);
      const r2 = buildingGen.generateChunkBuildings(1, 1, terrainGenerator, collisionSystem);

      expect(r1.group.children.length).toBe(r2.group.children.length);
    });
  });
});
