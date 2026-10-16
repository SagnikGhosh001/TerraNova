import * as THREE from 'three';
import { GameLoop } from './GameLoop.js';
import { SceneManager } from './SceneManager.js';
import { Materials } from '../environment/Materials.js';
import { Sky } from '../environment/Sky.js';
import { Lighting } from '../environment/Lighting.js';
import { CollisionSystem } from '../player/CollisionSystem.js';
import { Player } from '../player/Player.js';
import { CameraController } from '../player/CameraController.js';
import { PlayerController } from '../player/PlayerController.js';
import { WorldManager } from '../world/WorldManager.js';
import { WorldConfig } from '../world/WorldConfig.js';
import { HUD } from '../ui/HUD.js';
import { ControlsHelp } from '../ui/ControlsHelp.js';

import { WorldMap } from '../map/WorldMap.js';
import { MapInterface } from '../ui/MapInterface.js';

/**
 * Game orchestrates all primary subsystems, lifecycle loops, and input pointer-lock flows.
 */
export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.resumeBtn = document.getElementById('resume-btn');
    this.restartBtn = document.getElementById('restart-btn');
    this.newSeedBtn = document.getElementById('new-seed-btn');
    this.menuSeedEl = document.getElementById('menu-seed');
    this.menuCoordsEl = document.getElementById('menu-coords');
    this.menuExploredEl = document.getElementById('menu-explored');
    this.menuLandmarksEl = document.getElementById('menu-landmarks');
    this.mapCanvas = document.getElementById('map-canvas');

    this.isPointerLocked = false;

    this._init();
  }

  _init() {
    // 1. Core Scene & Loop
    this.sceneManager = new SceneManager(this.canvas);
    this.gameLoop = new GameLoop();

    // 2. Materials Palette
    this.materials = new Materials();

    // 3. Collision Subsystem
    this.collisionSystem = new CollisionSystem();

    // 4. Procedural World & Chunk Manager
    this.worldManager = new WorldManager(
      this.sceneManager.scene,
      this.collisionSystem,
      this.materials,
      WorldConfig.seed
    );
    this.collisionSystem.setTerrainGenerator(this.worldManager.terrainGenerator);

    // 5. Atmosphere & Lighting
    this.sky = new Sky(this.sceneManager.scene);
    this.lighting = new Lighting(this.sceneManager.scene);

    // 6. Player Character
    this.player = new Player(this.materials);
    this.sceneManager.scene.add(this.player.mesh);

    // Spawn point: select a randomized safe exploration location on land each session
    const spawn = this._findRandomSpawnPoint(this.worldManager.terrainGenerator);
    WorldConfig.spawnX = spawn.x;
    WorldConfig.spawnZ = spawn.z;
    this.player.setPosition(spawn.x, spawn.y, spawn.z);

    // 7. Third-Person Camera Controller
    this.cameraController = new CameraController(
      this.sceneManager.camera,
      this.collisionSystem
    );
    this.cameraController.update(0.016, this.player.getPosition());

    // 8. Player Controller
    this.playerController = new PlayerController(
      this.player,
      this.cameraController,
      this.collisionSystem
    );

    // 9. World Map & Discovery Subsystem
    this.worldMap = new WorldMap(this.mapCanvas, this.worldManager.terrainGenerator);
    this.worldMap.viewCenterX = spawn.x;
    this.worldMap.viewCenterZ = spawn.z;
    this.worldMap.updateExploration(this.player.getPosition());
    this.worldManager.setDiscoverySystem(this.worldMap.discoverySystem);

    this.mapInterface = new MapInterface(this.worldMap, (isOpen) => {
      if (isOpen) {
        if (this.isPointerLocked) {
          try {
            document.exitPointerLock();
          } catch (e) {
            // ignore
          }
        }
        if (this.pauseOverlay) {
          this.pauseOverlay.classList.remove('visible');
        }
      } else {
        // Map closed: immediately re-engage pointer lock
        this._requestPointerLock();
      }
    });

    // 10. UI Subsystems
    this.hud = new HUD();
    this.controlsHelp = new ControlsHelp();

    this.mapInterface.onNewDiscovery = (landmark) => {
      this.hud.showDiscoveryToast(landmark);
    };

    const hudMapBtn = document.getElementById('hud-map-btn');
    if (hudMapBtn) {
      hudMapBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.mapInterface.toggle(this.player.getPosition());
      });
    }

    // 11. Pointer Lock & Input Events
    this._bindPointerLock();
    this._bindMouseEvents();

    // 12. Register Update & Render loops
    this.gameLoop.onUpdate((dt, elapsed) => this.update(dt, elapsed));
    this.gameLoop.onRender(() => this.render());

    // 13. Start Game Loop
    this.gameLoop.start();
  }

  _findRandomSpawnPoint(terrainGenerator) {
    const minR = 60;
    const maxR = 360;
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = minR + Math.random() * (maxR - minR);
      const x = Math.round(Math.cos(angle) * r);
      const z = Math.round(Math.sin(angle) * r);

      const h = terrainGenerator.getHeight(x, z);
      const isUnderwater = terrainGenerator.isUnderwater(x, z);
      const slope = terrainGenerator.getSlopeAngle(x, z);

      if (!isUnderwater && h > WorldConfig.waterLevel + 1.2 && slope < 0.42) {
        return { x, y: h + 0.1, z };
      }
    }
    return { x: 0, y: terrainGenerator.getHeight(0, 0) + 0.1, z: 0 };
  }

  _requestPointerLock() {
    if (this.mapInterface && this.mapInterface.isOpen) return;

    if (!this.isPointerLocked) {
      try {
        const promise = this.canvas.requestPointerLock();
        if (promise && promise.catch) {
          promise.catch(() => {});
        }
      } catch (err) {
        // ignore
      }
    }
  }

  _updatePauseMenuStats() {
    if (this.menuSeedEl) {
      this.menuSeedEl.textContent = `${WorldConfig.seed}`;
    }
    if (this.player && this.menuCoordsEl) {
      const pos = this.player.getPosition();
      this.menuCoordsEl.textContent = `X: ${Math.round(pos.x)} • Z: ${Math.round(pos.z)}`;
    }
    if (this.worldMap && this.worldMap.discoverySystem) {
      const cells = this.worldMap.discoverySystem.getDiscoveredCount();
      const lms = this.worldMap.discoverySystem.getDiscoveredLandmarks().length;
      if (this.menuExploredEl) {
        this.menuExploredEl.textContent = `${cells * 64} m²`;
      }
      if (this.menuLandmarksEl) {
        this.menuLandmarksEl.textContent = `${lms} Found`;
      }
    }
  }

  restartExpedition(changeSeed = false) {
    if (changeSeed) {
      WorldConfig.seed = Math.floor(Math.random() * 900000) + 10000;
      this.worldManager.terrainGenerator = new TerrainGenerator(WorldConfig.seed);
      this.collisionSystem.setTerrainGenerator(this.worldManager.terrainGenerator);
      this.worldManager.chunkManager.dispose();
      this.worldManager.chunkManager = new ChunkManager(
        this.sceneManager.scene,
        this.worldManager.terrainGenerator,
        this.collisionSystem,
        this.materials
      );
      this.worldManager.setDiscoverySystem(this.worldMap.discoverySystem);
    }

    const spawn = this._findRandomSpawnPoint(this.worldManager.terrainGenerator);
    WorldConfig.spawnX = spawn.x;
    WorldConfig.spawnZ = spawn.z;

    this.player.setPosition(spawn.x, spawn.y, spawn.z);
    this.playerController.velocity.set(0, 0, 0);
    this.playerController.horizontalVelocity.set(0, 0, 0);

    this.cameraController.update(0.016, this.player.getPosition());

    if (this.worldMap) {
      if (changeSeed) {
        this.worldMap.terrainGenerator = this.worldManager.terrainGenerator;
        this.worldMap.renderer.terrainGenerator = this.worldManager.terrainGenerator;
      }
      this.worldMap.discoverySystem.reset();
      this.worldMap.viewCenterX = spawn.x;
      this.worldMap.viewCenterZ = spawn.z;
      this.worldMap.updateExploration(this.player.getPosition());
    }

    if (this.pauseOverlay) {
      this.pauseOverlay.classList.remove('visible');
    }
    this._requestPointerLock();

    if (this.hud) {
      this.hud.showDiscoveryToast({
        name: changeSeed ? `New World Seed: ${WorldConfig.seed}` : 'New Expedition Begun',
        type: 'cabin',
      });
    }
  }

  _bindPointerLock() {
    if (this.resumeBtn) {
      this.resumeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._requestPointerLock();
      });
    }

    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.restartExpedition(false);
      });
    }

    if (this.newSeedBtn) {
      this.newSeedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.restartExpedition(true);
      });
    }

    if (this.pauseOverlay) {
      this.pauseOverlay.addEventListener('click', (e) => {
        if (e.target === this.pauseOverlay) {
          this._requestPointerLock();
        }
      });
    }

    this.canvas.addEventListener('click', () => {
      this._requestPointerLock();
    });

    window.addEventListener('click', (e) => {
      if (this.mapInterface && this.mapInterface.isOpen) return;
      if (
        e.target.closest('#map-modal') ||
        e.target.closest('#controls-drawer') ||
        e.target.closest('#hud-map-btn') ||
        e.target.closest('#controls-toggle') ||
        e.target.closest('#pause-overlay')
      ) {
        return;
      }
      this._requestPointerLock();
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.mapInterface && this.mapInterface.isOpen) {
          this.mapInterface.close();
        } else if (this.pauseOverlay && this.pauseOverlay.classList.contains('visible')) {
          this.pauseOverlay.classList.remove('visible');
          this._requestPointerLock();
        } else {
          this._updatePauseMenuStats();
          if (this.pauseOverlay) {
            this.pauseOverlay.classList.add('visible');
          }
          if (this.isPointerLocked) {
            try {
              document.exitPointerLock();
            } catch (err) {}
          }
        }
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
      if (this.isPointerLocked) {
        if (this.pauseOverlay) {
          this.pauseOverlay.classList.remove('visible');
        }
        if (this.mapInterface && this.mapInterface.isOpen) {
          this.mapInterface.close();
        }
      } else {
        if (!this.mapInterface || !this.mapInterface.isOpen) {
          this._updatePauseMenuStats();
          if (this.pauseOverlay) {
            this.pauseOverlay.classList.add('visible');
          }
        }
      }
    });

    document.addEventListener('pointerlockerror', () => {
      console.warn('Pointer lock failed or was denied by the browser.');
    });
  }

  _bindMouseEvents() {
    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.cameraController.handleMouseMove(e.movementX, e.movementY);
      }
    });

    window.addEventListener('wheel', (e) => {
      // Allow camera zoom at all times or during pointer lock
      this.cameraController.handleMouseWheel(e.deltaY);
    }, { passive: true });
  }

  update(deltaTime, elapsed) {
    // 1. Update player locomotion and animation
    this.playerController.update(deltaTime);

    const playerPos = this.player.getPosition();

    // 2. Stream procedural terrain chunks, vegetation, and water around player
    this.worldManager.update(playerPos, deltaTime, elapsed);

    // 3. Update third-person follow camera
    this.cameraController.update(deltaTime, playerPos);

    // 4. Keep sunlight and atmospheric dome centered around player
    this.lighting.update(playerPos);
    this.sky.update(playerPos);

    // 5. Update telemetry HUD
    const worldStats = this.worldManager.getStats(playerPos);
    const biome = this.worldManager.getBiomeAt(playerPos.x, playerPos.z);
    this.hud.update(this.playerController, this.gameLoop.getFPS(), worldStats, biome);

    // 6. Update map discovery & active map view
    this.mapInterface.update(playerPos, this.playerController.getFacingHeading());
  }

  render() {
    this.sceneManager.render();
  }
}
