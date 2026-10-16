import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { CameraController } from '../src/player/CameraController.js';

describe('CameraController', () => {
  let camera;
  let controller;

  beforeEach(() => {
    camera = new THREE.PerspectiveCamera(60, 1.0, 0.1, 1000);
    controller = new CameraController(camera, null);
  });

  it('clamps pitch within safe vertical range', () => {
    // Try to rotate pitch extremely high
    controller.handleMouseMove(0, -5000);
    expect(controller.pitch).toBeLessThanOrEqual(controller.maxPitch);

    // Try to rotate pitch extremely low
    controller.handleMouseMove(0, 10000);
    expect(controller.pitch).toBeGreaterThanOrEqual(controller.minPitch);
  });

  it('clamps zoom distance within limits', () => {
    // Zoom in a lot
    controller.handleMouseWheel(-10000);
    expect(controller.targetDistance).toBeGreaterThanOrEqual(controller.minDistance);

    // Zoom out a lot
    controller.handleMouseWheel(20000);
    expect(controller.targetDistance).toBeLessThanOrEqual(controller.maxDistance);
  });

  it('calculates correct horizontal forward and right vectors', () => {
    controller.yaw = 0; // facing -Z
    const fwd = controller.getHorizontalForward();
    expect(fwd.z).toBeCloseTo(-1, 2);
    expect(fwd.x).toBeCloseTo(0, 2);

    const right = controller.getHorizontalRight();
    expect(right.x).toBeCloseTo(1, 2);
    expect(right.z).toBeCloseTo(0, 2);
  });
});
