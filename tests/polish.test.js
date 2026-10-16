import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { Player } from '../src/player/Player.js';
import { PlayerController } from '../src/player/PlayerController.js';
import { CameraController } from '../src/player/CameraController.js';
import { CollisionSystem } from '../src/player/CollisionSystem.js';
import { Materials } from '../src/environment/Materials.js';
import { Sky } from '../src/environment/Sky.js';
import { HUD } from '../src/ui/HUD.js';
import { TerrainGenerator } from '../src/world/TerrainGenerator.js';
import { WorldConfig } from '../src/world/WorldConfig.js';

describe('Phase 5 Exploration Polish', () => {
  let materials;

  beforeEach(() => {
    materials = new Materials();
  });

  describe('Dynamic Camera Sprint FOV Kick', () => {
    it('smoothly expands FOV when sprinting and restores base FOV when walking', () => {
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      const collisionSystem = new CollisionSystem();
      const cameraController = new CameraController(camera, collisionSystem);

      expect(camera.fov).toBe(60);

      // Trigger sprinting
      cameraController.setSprinting(true);
      const dummyPos = new THREE.Vector3(0, 0, 0);

      // Simulate a few frames of update
      for (let i = 0; i < 20; i++) {
        cameraController.update(0.016, dummyPos);
      }

      expect(camera.fov).toBeGreaterThan(65);
      expect(camera.fov).toBeLessThanOrEqual(67);

      // Cancel sprinting
      cameraController.setSprinting(false);
      for (let i = 0; i < 30; i++) {
        cameraController.update(0.016, dummyPos);
      }

      expect(camera.fov).toBeCloseTo(60, 0);
    });
  });

  describe('Player Landing Squash & Stretch Feedback', () => {
    it('triggers squash compression on landing and rebounds to normal scale', () => {
      const player = new Player(materials);
      expect(player.landingSquash).toBe(0);

      player.triggerLandingSquash();
      expect(player.landingSquash).toBeGreaterThan(0.2);

      // Run animation frames
      player.updateAnimation(0.016, 'idle', 0);
      expect(player.bodyGroup.scale.y).toBeLessThan(1.0); // Compressed vertically
      expect(player.bodyGroup.scale.x).toBeGreaterThan(1.0); // Stretched horizontally

      // Simulate several frames for rebound
      for (let i = 0; i < 40; i++) {
        player.updateAnimation(0.016, 'idle', 0);
      }

      expect(player.landingSquash).toBeLessThan(0.01);
      expect(player.bodyGroup.scale.y).toBeCloseTo(1.0, 1);
      expect(player.bodyGroup.scale.x).toBeCloseTo(1.0, 1);
    });
  });

  describe('Procedural Drifting Cloud System in Sky', () => {
    it('creates cloud meshes and drifts them continuously over time', () => {
      const sky = new Sky();
      expect(sky.clouds.length).toBeGreaterThan(10);

      const initialX = sky.clouds[0].mesh.position.x;

      // Update clouds over 2 seconds
      sky.update(new THREE.Vector3(0, 0, 0), 2.0);

      const newX = sky.clouds[0].mesh.position.x;
      expect(newX).toBeGreaterThan(initialX);
    });
  });

  describe('Water Wading State Detection', () => {
    it('transitions player to wading state when entering water basin', () => {
      const player = new Player(materials);
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      const collisionSystem = new CollisionSystem();
      const terrainGenerator = new TerrainGenerator(WorldConfig.seed);
      collisionSystem.setTerrainGenerator(terrainGenerator);

      const cameraController = new CameraController(camera, collisionSystem);
      const playerController = new PlayerController(player, cameraController, collisionSystem);

      // Find a lake/river coordinate where height is below water level
      let lakeX = 0;
      let lakeZ = 0;
      for (let x = -200; x <= 200; x += 20) {
        for (let z = -200; z <= 200; z += 20) {
          if (terrainGenerator.isUnderwater(x, z)) {
            lakeX = x;
            lakeZ = z;
            break;
          }
        }
        if (lakeX !== 0) break;
      }

      const waterHeight = terrainGenerator.getHeight(lakeX, lakeZ);
      expect(waterHeight).toBeLessThan(WorldConfig.waterLevel);

      player.setPosition(lakeX, waterHeight + 0.1, lakeZ);
      playerController.keys.forward = true;

      for (let i = 0; i < 15; i++) {
        playerController.update(0.016);
      }

      expect(playerController.isWading).toBe(true);
      expect(playerController.getState()).toBe('wading');
    });
  });

  describe('Discovery Toast Notification UI', () => {
    it('queues and displays discovery banner when landmark is found', () => {
      const hud = new HUD();
      const landmark = {
        name: 'Grand Watchtower',
        type: 'watchtower',
      };

      hud.showDiscoveryToast(landmark);
      expect(hud.activeToast).not.toBeNull();
      expect(hud.activeToast.name).toBe('Grand Watchtower');

      // Update timer to expire toast
      hud.updateToast(5.0);
      expect(hud.activeToast).toBeNull();
    });
  });
});
