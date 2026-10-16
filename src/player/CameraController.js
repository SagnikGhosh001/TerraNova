import * as THREE from 'three';

/**
 * CameraController provides third-person orbit follow camera with
 * smooth tracking, distance zooming, pitch limits, and collision avoidance.
 */
export class CameraController {
  constructor(camera, collisionSystem) {
    this.camera = camera;
    this.collisionSystem = collisionSystem;

    // Angles
    this.yaw = 0;
    this.pitch = 0.25; // slight angle looking down

    // Pitch limits (radians)
    this.minPitch = -0.55; // Looking up from low angle (~ -31 deg)
    this.maxPitch = 1.35;  // Looking down from above (~ 77 deg)

    // Zoom limits
    this.minDistance = 2.0;
    this.maxDistance = 12.0;
    this.targetDistance = 5.5;
    this.currentDistance = 5.5;

    // Sensitivity
    this.mouseSensitivity = 0.0022;
    this.zoomSpeed = 0.003;

    // Smoothing speeds
    this.followDamping = 12;
    this.zoomDamping = 10;

    // Offsets
    this.playerEyeOffset = new THREE.Vector3(0, 1.5, 0);

    // Current smoothed target point in world
    this.targetPosition = new THREE.Vector3();
    this.hasTarget = false;

    // Dynamic FOV kick
    this.baseFOV = 60;
    this.sprintFOV = 67;
    this.isSprinting = false;

    // Temp vectors to avoid allocation
    this._desiredPosition = new THREE.Vector3();
    this._offset = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
  }

  setSprinting(isSprinting) {
    this.isSprinting = isSprinting;
  }

  handleMouseMove(deltaX, deltaY) {
    this.yaw -= deltaX * this.mouseSensitivity;
    this.pitch -= deltaY * this.mouseSensitivity;

    // Clamp pitch to avoid gimbal lock or camera flipping
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
  }

  handleMouseWheel(deltaY) {
    this.targetDistance += deltaY * this.zoomSpeed;
    this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetDistance));
  }

  update(deltaTime, playerPosition) {
    if (!playerPosition) return;

    // Desired look target at character shoulder/eye level
    const goalTarget = playerPosition.clone().add(this.playerEyeOffset);

    if (!this.hasTarget) {
      this.targetPosition.copy(goalTarget);
      this.hasTarget = true;
    } else {
      // Smoothly interpolate target position to filter small bumps
      const t = 1 - Math.exp(-this.followDamping * deltaTime);
      this.targetPosition.lerp(goalTarget, t);
    }

    // Calculate ideal spherical offset
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    // Position behind character relative to yaw and pitch
    this._offset.set(
      this.targetDistance * sinYaw * cosPitch,
      this.targetDistance * sinPitch,
      this.targetDistance * cosYaw * cosPitch
    );

    this._desiredPosition.copy(this.targetPosition).add(this._offset);

    // Collision check: prevent clipping through terrain or walls
    let safeDistance = this.targetDistance;
    if (this.collisionSystem) {
      safeDistance = this.collisionSystem.getSafeCameraDistance(
        this.targetPosition,
        this._desiredPosition,
        this.targetDistance
      );
    }

    // Smoothly interpolate current distance to safe distance
    const distT = 1 - Math.exp(-this.zoomDamping * deltaTime);
    this.currentDistance = THREE.MathUtils.lerp(this.currentDistance, safeDistance, distT);

    // Final camera position with safe distance
    this.camera.position.set(
      this.targetPosition.x + this.currentDistance * sinYaw * cosPitch,
      this.targetPosition.y + this.currentDistance * sinPitch,
      this.targetPosition.z + this.currentDistance * cosYaw * cosPitch
    );

    this.camera.lookAt(this.targetPosition);

    // Dynamic FOV kick for sprinting
    const targetFOV = this.isSprinting ? this.sprintFOV : this.baseFOV;
    if (Math.abs(this.camera.fov - targetFOV) > 0.05) {
      const fovT = 1 - Math.exp(-6 * deltaTime);
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, fovT);
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Returns normalized horizontal forward vector (XZ plane) of the camera.
   */
  getHorizontalForward() {
    this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    return this._forward;
  }

  /**
   * Returns normalized horizontal right vector (XZ plane) of the camera.
   */
  getHorizontalRight() {
    this._right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
    return this._right;
  }

  getYaw() {
    return this.yaw;
  }
}
