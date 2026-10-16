import { MapRenderer } from './MapRenderer.js';
import { FogOfWar } from './FogOfWar.js';
import { DiscoverySystem } from './DiscoverySystem.js';
import { WorldConfig } from '../world/WorldConfig.js';

/**
 * WorldMap manages coordinate transformations, pan/zoom interactions,
 * and high-level map state.
 */
export class WorldMap {
  constructor(canvas, terrainGenerator) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.terrainGenerator = terrainGenerator;

    // Subsystems
    this.discoverySystem = new DiscoverySystem(8.0, 52.0);
    this.fogOfWar = new FogOfWar(this.discoverySystem);
    this.renderer = new MapRenderer(
      this.terrainGenerator,
      this.fogOfWar,
      this.discoverySystem
    );

    // View state
    this.viewCenterX = WorldConfig.spawnX;
    this.viewCenterZ = WorldConfig.spawnZ;
    this.scale = 1.2; // Pixels per world meter
    this.minScale = 0.35;
    this.maxScale = 4.0;

    // Interaction state
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // Register starting landmarks
    this._registerInitialLandmarks();

    this._bindEvents();
  }

  _registerInitialLandmarks() {
    this.discoverySystem.registerLandmark({
      id: 'spawn_outpost',
      type: 'cabin',
      name: 'Starter Outpost',
      x: WorldConfig.spawnX + 8,
      z: WorldConfig.spawnZ + 6,
    });

    this.discoverySystem.registerLandmark({
      id: 'starter_bridge',
      type: 'bridge',
      name: 'East Valley Bridge',
      x: WorldConfig.spawnX + 26,
      z: WorldConfig.spawnZ + 4,
    });
  }

  _bindEvents() {
    if (!this.canvas || !this.canvas.addEventListener) return;

    // Mouse Drag Pan
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', (e) => {
        if (this.isDragging) {
          const dx = e.clientX - this.lastMouseX;
          const dy = e.clientY - this.lastMouseY;
          this.lastMouseX = e.clientX;
          this.lastMouseY = e.clientY;

          // Move view opposite to drag direction
          this.viewCenterX -= dx / this.scale;
          this.viewCenterZ -= dy / this.scale;
        }
      });

      window.addEventListener('mouseup', () => {
        this.isDragging = false;
      });
    }

    // Mouse Wheel Zoom
    this.canvas.addEventListener('wheel', (e) => {
      if (e.preventDefault) e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      this.zoom(zoomFactor, e.clientX, e.clientY);
    }, { passive: false });
  }

  zoom(factor) {
    const oldScale = this.scale;
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));
  }

  recenter(playerPos) {
    if (playerPos) {
      this.viewCenterX = playerPos.x;
      this.viewCenterZ = playerPos.z;
    }
  }

  /**
   * Update exploration with latest player position.
   */
  updateExploration(playerPos) {
    if (!playerPos) return;
    return this.discoverySystem.update(playerPos.x, playerPos.z);
  }

  /**
   * Render the map to its canvas.
   */
  render(playerPos, playerHeading) {
    this.renderer.render(
      this.canvas,
      this.ctx,
      this.viewCenterX,
      this.viewCenterZ,
      this.scale,
      playerPos,
      playerHeading
    );
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
