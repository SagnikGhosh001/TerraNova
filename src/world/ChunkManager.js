import * as THREE from 'three';
import { Coordinates } from '../utils/Coordinates.js';
import { WorldConfig } from './WorldConfig.js';
import { WaterGenerator } from './WaterGenerator.js';
import { VegetationGenerator } from './VegetationGenerator.js';
import { BuildingGenerator } from './BuildingGenerator.js';

/**
 * ChunkManager handles terrain, water, vegetation, and structure streaming,
 * progressive queue generation, and distant chunk memory recycling.
 */
export class ChunkManager {
  constructor(scene, terrainGenerator, collisionSystem, materials) {
    this.scene = scene;
    this.terrainGenerator = terrainGenerator;
    this.collisionSystem = collisionSystem;
    this.materials = materials;

    // Subsystems
    this.waterGenerator = new WaterGenerator();
    this.vegetationGenerator = new VegetationGenerator(materials);
    this.buildingGenerator = new BuildingGenerator(materials);

    // Active chunk dictionary: key -> ChunkRecord
    this.activeChunks = new Map();

    // Generation queue
    this.loadQueue = [];
    this.loadingKeys = new Set();

    // Player chunk tracking
    this.playerCx = null;
    this.playerCz = null;

    this.discoverySystem = null;

    // Shared terrain material with vertex colors
    this.terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.08,
      flatShading: false,
    });
  }

  /**
   * Main streaming update called every frame with player world position.
   */
  update(playerPosition, deltaTime = 0.016, elapsedTime = 0) {
    // 1. Update water ripple shader animation
    this.waterGenerator.update(deltaTime, elapsedTime);

    if (!playerPosition) return;

    const { cx, cz } = Coordinates.worldToChunk(
      playerPosition.x,
      playerPosition.z,
      WorldConfig.chunkSize
    );

    // If player entered a new chunk or on initial setup
    if (this.playerCx !== cx || this.playerCz !== cz) {
      this.playerCx = cx;
      this.playerCz = cz;
      this._updateStreamingGrid(cx, cz);
    }

    // Process queued chunk generation progressively
    this._processQueue();
  }

  /**
   * Determine chunks to load and prune chunks out of range.
   */
  _updateStreamingGrid(centerCx, centerCz) {
    const requiredCoords = Coordinates.getSpiralChunkCoords(
      centerCx,
      centerCz,
      WorldConfig.renderDistance
    );

    // 1. Enqueue missing chunks
    for (const { cx, cz, dist } of requiredCoords) {
      const key = Coordinates.chunkKey(cx, cz);
      if (!this.activeChunks.has(key) && !this.loadingKeys.has(key)) {
        this.loadingKeys.add(key);
        this.loadQueue.push({ cx, cz, dist, key });
      }
    }

    // Re-sort load queue so closest chunks to player generate first
    this.loadQueue.sort((a, b) => {
      const distA = Math.hypot(a.cx - centerCx, a.cz - centerCz);
      const distB = Math.hypot(b.cx - centerCx, b.cz - centerCz);
      return distA - distB;
    });

    // 2. Prune distant chunks
    const pruneKeys = [];
    for (const [key, chunk] of this.activeChunks.entries()) {
      const dist = Math.hypot(chunk.cx - centerCx, chunk.cz - centerCz);
      if (dist > WorldConfig.unloadDistance) {
        pruneKeys.push(key);
      }
    }

    for (const key of pruneKeys) {
      this._unloadChunk(key);
    }
  }

  /**
   * Generate up to maxChunksPerFrame from the queue.
   */
  _processQueue() {
    let generated = 0;
    while (this.loadQueue.length > 0 && generated < WorldConfig.maxChunksPerFrame) {
      const item = this.loadQueue.shift();
      this.loadingKeys.delete(item.key);

      // Verify still within unload distance before building
      const dist = Math.hypot(item.cx - this.playerCx, item.cz - this.playerCz);
      if (dist <= WorldConfig.unloadDistance + 0.5) {
        this._buildChunk(item.cx, item.cz, item.key);
        generated++;
      }
    }
  }

  setDiscoverySystem(discoverySystem) {
    this.discoverySystem = discoverySystem;
  }

  /**
   * Synchronously build a full terrain chunk with water, vegetation, and structures.
   */
  _buildChunk(cx, cz, key) {
    // 1. Terrain Mesh
    const geometry = this.terrainGenerator.generateChunkGeometry(cx, cz);
    const mesh = new THREE.Mesh(geometry, this.terrainMaterial);
    mesh.name = `TerrainChunk_${key}`;
    mesh.receiveShadow = true;
    mesh.castShadow = false;

    this.scene.add(mesh);
    this.collisionSystem.addGroundMesh(mesh);

    // 2. Water Feature (Rivers & Lakes)
    const waterMesh = this.waterGenerator.createChunkWater(cx, cz, this.terrainGenerator);
    if (waterMesh) {
      this.scene.add(waterMesh);
    }

    // 3. Instanced Vegetation (Trees, Rocks, Grass)
    const vegResult = this.vegetationGenerator.generateChunkVegetation(
      cx,
      cz,
      this.terrainGenerator,
      this.collisionSystem
    );
    if (vegResult.group.children.length > 0) {
      this.scene.add(vegResult.group);
    }

    // 4. Procedural Buildings & Landmarks (Cabins, Villages, Towers, Bridges)
    const bldResult = this.buildingGenerator.generateChunkBuildings(
      cx,
      cz,
      this.terrainGenerator,
      this.collisionSystem,
      this.discoverySystem
    );
    if (bldResult.group.children.length > 0) {
      this.scene.add(bldResult.group);
    }

    this.activeChunks.set(key, {
      cx,
      cz,
      key,
      mesh,
      geometry,
      waterMesh,
      vegetationGroup: vegResult.group,
      vegetationColliders: vegResult.colliders,
      buildingGroup: bldResult.group,
      buildingColliders: bldResult.colliders,
      buildingWalkables: bldResult.walkables,
    });
  }

  /**
   * Dispose and unmount a chunk cleanly.
   */
  _unloadChunk(key) {
    const chunk = this.activeChunks.get(key);
    if (!chunk) return;

    // 1. Terrain cleanup
    this.scene.remove(chunk.mesh);
    this.collisionSystem.removeGroundMesh(chunk.mesh);
    if (chunk.geometry) {
      chunk.geometry.dispose();
    }

    // 2. Water cleanup
    if (chunk.waterMesh) {
      this.scene.remove(chunk.waterMesh);
      if (chunk.waterMesh.geometry) {
        chunk.waterMesh.geometry.dispose();
      }
    }

    // 3. Vegetation cleanup
    if (chunk.vegetationGroup) {
      this.scene.remove(chunk.vegetationGroup);
      for (const col of chunk.vegetationColliders) {
        this.collisionSystem.removeObstacleMesh(col);
        if (col.geometry) col.geometry.dispose();
      }
      chunk.vegetationGroup.traverse((child) => {
        if (child.isInstancedMesh) {
          if (child.geometry) child.geometry.dispose();
        }
      });
    }

    // 4. Buildings cleanup
    if (chunk.buildingGroup) {
      this.scene.remove(chunk.buildingGroup);
      for (const col of chunk.buildingColliders) {
        this.collisionSystem.removeObstacleMesh(col);
        if (col.geometry) col.geometry.dispose();
      }
      for (const w of chunk.buildingWalkables) {
        this.collisionSystem.removeGroundMesh(w);
        if (w.geometry) w.geometry.dispose();
      }
      chunk.buildingGroup.traverse((child) => {
        if (child.isMesh && child.geometry) {
          child.geometry.dispose();
        }
      });
    }

    this.activeChunks.delete(key);
  }

  isGenerating() {
    return this.loadQueue.length > 0;
  }

  getQueueLength() {
    return this.loadQueue.length;
  }

  getActiveChunkCount() {
    return this.activeChunks.size;
  }

  dispose() {
    for (const key of this.activeChunks.keys()) {
      this._unloadChunk(key);
    }
    this.terrainMaterial.dispose();
    this.waterGenerator.dispose();
  }
}
