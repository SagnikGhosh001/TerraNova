import * as THREE from 'three';
import { WorldConfig } from '../world/WorldConfig.js';

/**
 * Shortest-angle interpolation between two radian angles.
 */
function lerpAngle(from, to, t) {
  let diff = (to - from) % (Math.PI * 2);
  if (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > Math.PI) diff -= Math.PI * 2;
  return from + diff * t;
}

/**
 * PlayerController handles user input, character physics, ground collision,
 * slope navigation, and smooth locomotion.
 */
export class PlayerController {
  constructor(player, cameraController, collisionSystem) {
    this.player = player;
    this.cameraController = cameraController;
    this.collisionSystem = collisionSystem;

    // Movement parameters (m/s)
    this.walkSpeed = 5.0;
    this.sprintSpeed = 10.5;
    this.wadeSpeed = 3.2;
    this.wadeSprintSpeed = 5.8;
    this.isWading = false;
    this.acceleration = 16.0;
    this.deceleration = 18.0;
    this.airControl = 6.0;
    this.turnSpeed = 14.0;

    // Jump & Gravity parameters
    this.gravity = -22.0;
    this.jumpForce = 8.5;
    this.terminalVelocity = -35.0;

    // State
    this.velocity = new THREE.Vector3();
    this.horizontalVelocity = new THREE.Vector3();
    this.isGrounded = true;
    this.movementState = 'idle'; // 'idle' | 'walking' | 'sprinting' | 'in-air'
    this.facingYaw = 0;

    // Timers
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.coyoteDuration = 0.12;
    this.jumpBufferDuration = 0.12;

    // Key states
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
    };

    // Cached vectors to avoid allocation
    this._inputDir = new THREE.Vector3();
    this._targetVelocity = new THREE.Vector3();

    this._bindKeyboardEvents();
  }

  _bindKeyboardEvents() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => this._onKeyDown(e));
      window.addEventListener('keyup', (e) => this._onKeyUp(e));
    }
  }

  _onKeyDown(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = true;
        break;
      case 'Space':
        if (!e.repeat) {
          this.jumpBufferTimer = this.jumpBufferDuration;
        }
        this.keys.jump = true;
        break;
    }
  }

  _onKeyUp(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = false;
        break;
      case 'Space':
        this.keys.jump = false;
        break;
    }
  }

  update(deltaTime) {
    const position = this.player.getPosition();
    const wasGrounded = this.isGrounded;

    // 1. Update jump buffer & coyote timers
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= deltaTime;
    }
    if (this.isGrounded) {
      this.coyoteTimer = this.coyoteDuration;
    } else {
      this.coyoteTimer -= deltaTime;
    }

    // 2. Compute desired move direction relative to camera yaw
    let moveZ = 0;
    let moveX = 0;
    if (this.keys.forward) moveZ += 1;
    if (this.keys.backward) moveZ -= 1;
    if (this.keys.left) moveX -= 1;
    if (this.keys.right) moveX += 1;

    const hasInput = moveX !== 0 || moveZ !== 0;
    this._inputDir.set(0, 0, 0);

    if (hasInput) {
      const camForward = this.cameraController.getHorizontalForward();
      const camRight = this.cameraController.getHorizontalRight();

      this._inputDir
        .addScaledVector(camForward, moveZ)
        .addScaledVector(camRight, moveX)
        .normalize();
    }

    // 3. Determine target speed with water wading damping
    const isSprinting = this.keys.sprint && hasInput;
    const maxWalk = this.isWading ? this.wadeSpeed : this.walkSpeed;
    const maxSprint = this.isWading ? this.wadeSprintSpeed : this.sprintSpeed;
    const currentMaxSpeed = isSprinting ? maxSprint : maxWalk;

    this._targetVelocity.copy(this._inputDir).multiplyScalar(hasInput ? currentMaxSpeed : 0);

    // 4. Smooth horizontal acceleration / deceleration
    const currentAccel = this.isGrounded
      ? (hasInput ? this.acceleration : this.deceleration)
      : this.airControl;

    const lerpFactor = 1 - Math.exp(-currentAccel * deltaTime);
    this.horizontalVelocity.lerp(this._targetVelocity, lerpFactor);

    this.velocity.x = this.horizontalVelocity.x;
    this.velocity.z = this.horizontalVelocity.z;

    // 5. Jump logic with coyote time & buffer
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
    }

    // 6. Apply gravity
    if (!this.isGrounded) {
      this.velocity.y += this.gravity * deltaTime;
      if (this.velocity.y < this.terminalVelocity) {
        this.velocity.y = this.terminalVelocity;
      }
    }

    // 7. Calculate prospective new position
    const newPos = position.clone().addScaledVector(this.velocity, deltaTime);

    // Water wading & buoyancy (only active when positioned in a submerged water basin)
    const tg = this.collisionSystem ? this.collisionSystem.terrainGenerator : null;
    const isWaterBasin = tg ? tg.isUnderwater(newPos.x, newPos.z) : false;
    this.isWading = isWaterBasin && (newPos.y < WorldConfig.waterLevel + 0.15);
    if (isWaterBasin && newPos.y < WorldConfig.waterLevel - 0.75) {
      newPos.y = WorldConfig.waterLevel - 0.75;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // 8. Ground & Slope collision check
    const groundInfo = this.collisionSystem.getGroundInfo(newPos.x, newPos.y, newPos.z);

    if (groundInfo.hasGround) {
      const groundY = groundInfo.groundY;
      const heightAboveGround = newPos.y - groundY;

      // If we are falling or close to the ground
      if (this.velocity.y <= 0) {
        // Step-up / Snap threshold (accommodates bridge decks, ramps, and curbs)
        if (heightAboveGround <= 0.55 && heightAboveGround >= -0.95) {
          if (groundInfo.isWalkable) {
            newPos.y = groundY;
            this.velocity.y = 0;
            this.isGrounded = true;
          } else {
            // Slope is too steep: slide down slope normal
            newPos.y = groundY;
            const slideForce = (1 - groundInfo.normal.y) * 8.0;
            newPos.x += groundInfo.normal.x * slideForce * deltaTime;
            newPos.z += groundInfo.normal.z * slideForce * deltaTime;
            this.isGrounded = false;
          }
        } else if (heightAboveGround < -0.8) {
          // Hard ground penetration prevention
          newPos.y = groundY;
          this.velocity.y = 0;
          this.isGrounded = true;
        } else {
          // In the air above ground
          this.isGrounded = false;
        }
      } else {
        // Ascending during jump
        this.isGrounded = false;
      }
    } else {
      // In air over void/drop
      this.isGrounded = false;
    }

    // Landing detection
    if (!wasGrounded && this.isGrounded) {
      this.player.triggerLandingSquash();
    }

    // 9. Resolve obstacle collisions (walls, pillars, ruins)
    this.collisionSystem.resolveObstacleCollisions(newPos, this.velocity);

    // Apply resolved position
    this.player.setPosition(newPos.x, newPos.y, newPos.z);

    // 10. Smoothly rotate character toward movement direction
    const currentSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (currentSpeed > 0.2) {
      const targetYaw = Math.atan2(this.velocity.x, this.velocity.z);
      const turnT = 1 - Math.exp(-this.turnSpeed * deltaTime);
      this.facingYaw = lerpAngle(this.facingYaw, targetYaw, turnT);
      this.player.setRotationY(this.facingYaw);
    }

    // Dynamic camera sprint FOV kick
    if (this.cameraController && this.cameraController.setSprinting) {
      this.cameraController.setSprinting(isSprinting && currentSpeed > 5.5);
    }

    // 11. Determine movement state for HUD & Animation
    if (!this.isGrounded) {
      this.movementState = 'in-air';
    } else if (this.isWading && currentSpeed > 0.25) {
      this.movementState = 'wading';
    } else if (currentSpeed < 0.25) {
      this.movementState = 'idle';
    } else if (isSprinting && currentSpeed > 5.5) {
      this.movementState = 'sprinting';
    } else {
      this.movementState = 'walking';
    }

    // 12. Update procedural animation
    const speedRatio = Math.min(1.0, currentSpeed / this.sprintSpeed);
    this.player.updateAnimation(deltaTime, this.movementState, speedRatio);
  }

  getSpeed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  getState() {
    return this.movementState;
  }

  getFacingHeading() {
    // Convert radians to compass degrees [0, 360)
    let deg = (this.facingYaw * (180 / Math.PI)) % 360;
    if (deg < 0) deg += 360;
    return Math.round(deg);
  }
}
