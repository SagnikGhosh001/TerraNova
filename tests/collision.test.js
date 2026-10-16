import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { CollisionSystem } from '../src/player/CollisionSystem.js';

describe('CollisionSystem', () => {
  let collisionSystem;
  let groundMesh;

  beforeEach(() => {
    collisionSystem = new CollisionSystem();

    // Create a flat ground mesh at y = 2
    const geo = new THREE.PlaneGeometry(20, 20);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial();
    groundMesh = new THREE.Mesh(geo, mat);
    groundMesh.position.set(0, 2, 0);
    groundMesh.updateMatrixWorld(true);

    collisionSystem.addGroundMesh(groundMesh);
  });

  it('detects ground height accurately under the player', () => {
    const info = collisionSystem.getGroundInfo(0, 5, 0);
    expect(info.hasGround).toBe(true);
    expect(info.groundY).toBeCloseTo(2, 2);
    expect(info.isWalkable).toBe(true);
  });

  it('returns hasGround = false when query is outside mesh boundary', () => {
    const info = collisionSystem.getGroundInfo(100, 5, 100);
    expect(info.hasGround).toBe(false);
  });

  it('correctly calculates walkable slopes (< 45 degrees)', () => {
    // Normal facing straight up (0 deg slope)
    const info = collisionSystem.getGroundInfo(0, 5, 0);
    expect(info.slopeAngle).toBeCloseTo(0, 2);
    expect(info.isWalkable).toBe(true);
  });

  it('resolves horizontal obstacle collision', () => {
    // Obstacle block at (5, 0, 0), size (2, 4, 2)
    const blockGeo = new THREE.BoxGeometry(2, 4, 2);
    const block = new THREE.Mesh(blockGeo, new THREE.MeshBasicMaterial());
    block.position.set(5, 2, 0);
    block.updateMatrixWorld(true);

    collisionSystem.addObstacleMesh(block);

    // Player position right next to block edge, trying to enter inside
    const playerPos = new THREE.Vector3(4.05, 0, 0);
    const velocity = new THREE.Vector3(2, 0, 0);

    const initialX = playerPos.x;
    collisionSystem.resolveObstacleCollisions(playerPos, velocity);

    // Player should have been pushed away to the left (x < initialX)
    expect(playerPos.x).toBeLessThan(initialX);
  });

  it('restricts camera distance when obstacle blocks view', () => {
    // Obstacle block between eye (0, 1.5, 0) and desired camera (0, 1.5, 5)
    const wallGeo = new THREE.BoxGeometry(10, 5, 1);
    const wall = new THREE.Mesh(wallGeo, new THREE.MeshBasicMaterial());
    wall.position.set(0, 1.5, 2.5); // At z = 2.5
    wall.updateMatrixWorld(true);

    collisionSystem.addObstacleMesh(wall);

    const targetPos = new THREE.Vector3(0, 1.5, 0);
    const desiredCamPos = new THREE.Vector3(0, 1.5, 6);
    const maxDistance = 6.0;

    const safeDist = collisionSystem.getSafeCameraDistance(targetPos, desiredCamPos, maxDistance);
    // Wall front face is at z = 2.0, so safe distance must be <= 2.0
    expect(safeDist).toBeLessThanOrEqual(2.0);
    expect(safeDist).toBeGreaterThan(0.5);
  });

  it('correctly handles rotated obstacle without inflating collision bounds', () => {
    // Thin rotated railing: 0.2m wide, 20m long, rotated 45 degrees
    const railGeo = new THREE.BoxGeometry(0.2, 1.0, 20.0);
    const rail = new THREE.Mesh(railGeo, new THREE.MeshBasicMaterial());
    rail.position.set(0, 1.0, 0);
    rail.rotation.y = Math.PI / 4;
    rail.updateMatrixWorld(true);

    collisionSystem.addObstacleMesh(rail);

    // Player position at (0, 0, 3) - 2.12 meters away from the railing in local space
    const centerPos = new THREE.Vector3(0, 0.5, 3.0);
    const initialPos = centerPos.clone();
    collisionSystem.resolveObstacleCollisions(centerPos, new THREE.Vector3());

    // Should NOT be blocked or pushed because center is open
    expect(centerPos.x).toBeCloseTo(initialPos.x, 2);
    expect(centerPos.z).toBeCloseTo(initialPos.z, 2);
  });
});
