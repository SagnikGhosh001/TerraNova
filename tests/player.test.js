import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { Player } from '../src/player/Player.js';
import { PlayerController } from '../src/player/PlayerController.js';
import { CameraController } from '../src/player/CameraController.js';
import { CollisionSystem } from '../src/player/CollisionSystem.js';
import { Materials } from '../src/environment/Materials.js';

describe('PlayerController', () => {
  let player;
  let playerController;
  let cameraController;
  let collisionSystem;

  beforeEach(() => {
    const materials = new Materials();
    player = new Player(materials);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    collisionSystem = new CollisionSystem();

    // Add flat ground
    const geo = new THREE.PlaneGeometry(100, 100);
    geo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    ground.updateMatrixWorld(true);
    collisionSystem.addGroundMesh(ground);

    cameraController = new CameraController(camera, collisionSystem);
    playerController = new PlayerController(player, cameraController, collisionSystem);

    player.setPosition(0, 0, 0);
  });

  it('accelerates forward when KeyW is active', () => {
    playerController.keys.forward = true;

    // Simulate several frames
    for (let i = 0; i < 15; i++) {
      playerController.update(0.016);
    }

    expect(playerController.getSpeed()).toBeGreaterThan(1.0);
    expect(playerController.getState()).toBe('walking');
  });

  it('sprints at higher velocity when Shift is pressed', () => {
    playerController.keys.forward = true;
    playerController.keys.sprint = true;

    // Simulate 30 frames to reach top sprint speed
    for (let i = 0; i < 30; i++) {
      playerController.update(0.016);
    }

    expect(playerController.getSpeed()).toBeGreaterThan(playerController.walkSpeed);
    expect(playerController.getState()).toBe('sprinting');
  });

  it('decelerates smoothly to idle when keys are released', () => {
    playerController.keys.forward = true;
    for (let i = 0; i < 20; i++) {
      playerController.update(0.016);
    }
    expect(playerController.getSpeed()).toBeGreaterThan(2.0);

    // Release key
    playerController.keys.forward = false;
    for (let i = 0; i < 40; i++) {
      playerController.update(0.016);
    }

    expect(playerController.getSpeed()).toBeLessThan(0.1);
    expect(playerController.getState()).toBe('idle');
  });

  it('applies upward impulse when jumping and enters in-air state', () => {
    playerController.keys.jump = true;
    playerController.jumpBufferTimer = 0.1;
    playerController.update(0.016);

    expect(playerController.velocity.y).toBeGreaterThan(5.0);
    expect(playerController.getState()).toBe('in-air');
  });

  it('calculates compass heading accurately', () => {
    playerController.facingYaw = 0; // facing North
    expect(playerController.getFacingHeading()).toBe(0);

    playerController.facingYaw = Math.PI / 2; // East (90 deg)
    expect(playerController.getFacingHeading()).toBe(90);

    playerController.facingYaw = Math.PI; // South (180 deg)
    expect(playerController.getFacingHeading()).toBe(180);
  });
});
