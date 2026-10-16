import { TerrainGenerator } from './TerrainGenerator.js';
import { ChunkManager } from './ChunkManager.js';
import { WorldConfig } from './WorldConfig.js';
import { Coordinates } from '../utils/Coordinates.js';

/**
 * WorldManager serves as the unified facade and coordinator for
 * procedural terrain generation, chunk streaming, and world queries.
 */
export class WorldManager {
  constructor(scene, collisionSystem, materials, seed = WorldConfig.seed) {
    this.scene = scene;
    this.collisionSystem = collisionSystem;
    this.materials = materials;
    this.seed = seed;

    this.terrainGenerator = new TerrainGenerator(this.seed);
    this.chunkManager = new ChunkManager(
      this.scene,
      this.terrainGenerator,
      this.collisionSystem,
      this.materials
    );
  }

  setDiscoverySystem(discoverySystem) {
    this.chunkManager.setDiscoverySystem(discoverySystem);
  }

  /**
   * Update world streaming around the player.
   */
  update(playerPosition, deltaTime, elapsedTime) {
    this.chunkManager.update(playerPosition, deltaTime, elapsedTime);
  }

  /**
   * Fast mathematical ground height query anywhere in the world.
   */
  getHeightAt(worldX, worldZ) {
    return this.terrainGenerator.getHeight(worldX, worldZ);
  }

  /**
   * Continuous analytical normal query anywhere in the world.
   */
  getNormalAt(worldX, worldZ) {
    return this.terrainGenerator.getNormal(worldX, worldZ);
  }

  /**
   * Biome at world coordinate.
   */
  getBiomeAt(worldX, worldZ) {
    const h = this.getHeightAt(worldX, worldZ);
    return this.terrainGenerator.biomeSystem.getBiome(worldX, worldZ, h);
  }

  /**
   * Telemetry stats for HUD.
   */
  getStats(playerPos) {
    const chunkCoords = playerPos
      ? Coordinates.worldToChunk(playerPos.x, playerPos.z, WorldConfig.chunkSize)
      : { cx: 0, cz: 0 };

    return {
      cx: chunkCoords.cx,
      cz: chunkCoords.cz,
      activeChunks: this.chunkManager.getActiveChunkCount(),
      queueLength: this.chunkManager.getQueueLength(),
      isGenerating: this.chunkManager.isGenerating(),
    };
  }

  dispose() {
    this.chunkManager.dispose();
  }
}
