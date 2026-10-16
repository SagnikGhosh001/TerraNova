import * as THREE from 'three';

/**
 * CollisionSystem handles terrain height queries, obstacle resolution,
 * slope checks, and camera occlusion raycasting.
 */
export class CollisionSystem {
  constructor() {
    this.groundMeshes = [];
    this.obstacleMeshes = [];

    // Raycasters
    this.downRaycaster = new THREE.Raycaster();
    this.downRaycaster.firstHitOnly = true;

    this.horizontalRaycaster = new THREE.Raycaster();
    this.horizontalRaycaster.firstHitOnly = true;

    this.cameraRaycaster = new THREE.Raycaster();
    this.cameraRaycaster.firstHitOnly = true;

    // Vectors for reuse to prevent garbage collection
    this._downVec = new THREE.Vector3(0, -1, 0);
    this._rayOrigin = new THREE.Vector3();
    this._camDir = new THREE.Vector3();
    this._localPos = new THREE.Vector3();
    this._invMatrix = new THREE.Matrix4();
    this._pushVec = new THREE.Vector3();

    // Configuration
    this.playerRadius = 0.45;
    this.playerHeight = 1.8;
    this.stepHeight = 0.55; // Max step-up height for stairs/curbs/bridge ramps
    this.maxWalkableSlope = Math.PI / 4; // 45 degrees
    this.terrainGenerator = null;
  }

  setTerrainGenerator(terrainGenerator) {
    this.terrainGenerator = terrainGenerator;
  }

  addGroundMesh(mesh) {
    if (!this.groundMeshes.includes(mesh)) {
      this.groundMeshes.push(mesh);
    }
  }

  removeGroundMesh(mesh) {
    this.groundMeshes = this.groundMeshes.filter(m => m !== mesh);
  }

  addObstacleMesh(mesh) {
    if (!this.obstacleMeshes.includes(mesh)) {
      this.obstacleMeshes.push(mesh);
    }
  }

  removeObstacleMesh(mesh) {
    this.obstacleMeshes = this.obstacleMeshes.filter(m => m !== mesh);
  }

  /**
   * Cast a ray downward from slightly above the player to find the exact ground surface.
   * Seamlessly falls back to analytical procedural terrain height if no mesh is hit.
   */
  getGroundInfo(x, y, z, rayHeight = 2.5, maxDrop = 15) {
    let meshGroundY = -Infinity;
    let meshNormal = null;
    let meshHitDist = Infinity;

    if (this.groundMeshes.length > 0) {
      this._rayOrigin.set(x, y + rayHeight, z);
      this.downRaycaster.set(this._rayOrigin, this._downVec);
      this.downRaycaster.far = rayHeight + maxDrop;

      const hits = this.downRaycaster.intersectObjects(this.groundMeshes, true);
      if (hits.length > 0) {
        const hit = hits[0];
        meshGroundY = hit.point.y;
        meshNormal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
        meshHitDist = hit.distance;
      }
    }

    // Check analytical procedural terrain generator
    let terrainY = -Infinity;
    let terrainNormal = null;
    if (this.terrainGenerator) {
      terrainY = this.terrainGenerator.getHeight(x, z);
      terrainNormal = this.terrainGenerator.getNormal(x, z);
    }

    // Pick highest between mesh (e.g. raised bridge/stairs) and procedural terrain
    if (meshGroundY >= terrainY && meshGroundY !== -Infinity) {
      const slopeAngle = Math.acos(Math.min(Math.max(meshNormal.y, -1), 1));
      return {
        hasGround: true,
        groundY: meshGroundY,
        normal: meshNormal,
        slopeAngle,
        isWalkable: slopeAngle <= this.maxWalkableSlope,
        distanceFromOrigin: meshHitDist,
      };
    } else if (terrainY !== -Infinity) {
      const slopeAngle = Math.acos(Math.min(Math.max(terrainNormal.y, -1), 1));
      const dist = (y + rayHeight) - terrainY;
      return {
        hasGround: true,
        groundY: terrainY,
        normal: terrainNormal,
        slopeAngle,
        isWalkable: slopeAngle <= this.maxWalkableSlope,
        distanceFromOrigin: dist,
      };
    }

    return {
      hasGround: false,
      groundY: 0,
      normal: new THREE.Vector3(0, 1, 0),
      slopeAngle: 0,
      isWalkable: true,
      distanceFromOrigin: Infinity,
    };
  }

  /**
   * Resolve horizontal collisions against solid obstacle meshes.
   * Uses robust bounding volume closest-point projection with penetration resolution
   * and velocity wall-sliding.
   */
  resolveObstacleCollisions(position, velocity) {
    if (this.obstacleMeshes.length === 0) return position;

    const playerBottom = position.y;
    const playerTop = position.y + this.playerHeight;

    for (let i = 0; i < this.obstacleMeshes.length; i++) {
      const mesh = this.obstacleMeshes[i];
      if (!mesh.geometry) continue;

      if (!mesh.geometry.boundingBox) {
        mesh.geometry.computeBoundingBox();
      }

      // Check if mesh has rotation (e.g. bridge railings, rotated buildings)
      // If rotated, test in local space to avoid axis-aligned bounding box inflation
      const hasRotation =
        Math.abs(mesh.rotation.x) > 0.001 ||
        Math.abs(mesh.rotation.y) > 0.001 ||
        Math.abs(mesh.rotation.z) > 0.001 ||
        (mesh.parent && Math.abs(mesh.parent.rotation.y) > 0.001);

      if (hasRotation) {
        mesh.updateMatrixWorld();
        this._invMatrix.copy(mesh.matrixWorld).invert();
        this._localPos.copy(position).applyMatrix4(this._invMatrix);
        const localBox = mesh.geometry.boundingBox;

        if (this._localPos.y + this.playerHeight < localBox.min.y || this._localPos.y > localBox.max.y) {
          continue;
        }

        const clampedX = Math.max(localBox.min.x, Math.min(localBox.max.x, this._localPos.x));
        const clampedZ = Math.max(localBox.min.z, Math.min(localBox.max.z, this._localPos.z));

        const dx = this._localPos.x - clampedX;
        const dz = this._localPos.z - clampedZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < this.playerRadius * this.playerRadius) {
          const dist = Math.sqrt(distSq);
          let pushLocalX = 0;
          let pushLocalZ = 0;

          if (dist > 0.0001) {
            const overlap = this.playerRadius - dist;
            pushLocalX = (dx / dist) * overlap;
            pushLocalZ = (dz / dist) * overlap;
          } else {
            const distToMinX = Math.abs(this._localPos.x - localBox.min.x);
            const distToMaxX = Math.abs(localBox.max.x - this._localPos.x);
            const distToMinZ = Math.abs(this._localPos.z - localBox.min.z);
            const distToMaxZ = Math.abs(localBox.max.z - this._localPos.z);
            const minDist = Math.min(distToMinX, distToMaxX, distToMinZ, distToMaxZ);
            if (minDist === distToMinX) pushLocalX = -(distToMinX + this.playerRadius);
            else if (minDist === distToMaxX) pushLocalX = distToMaxX + this.playerRadius;
            else if (minDist === distToMinZ) pushLocalX = -(distToMinZ + this.playerRadius);
            else pushLocalZ = distToMaxZ + this.playerRadius;
          }

          this._pushVec.set(pushLocalX, 0, pushLocalZ).transformDirection(mesh.matrixWorld);
          this._pushVec.y = 0;

          position.x += this._pushVec.x;
          position.z += this._pushVec.z;

          if (velocity) {
            const pushLen = Math.hypot(this._pushVec.x, this._pushVec.z);
            if (pushLen > 0.0001) {
              const nx = this._pushVec.x / pushLen;
              const nz = this._pushVec.z / pushLen;
              const dot = velocity.x * nx + velocity.z * nz;
              if (dot < 0) {
                velocity.x -= nx * dot;
                velocity.z -= nz * dot;
              }
            }
          }
        }
        continue;
      }

      // Compute world-space AABB for unrotated obstacles
      const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);

      // Check vertical overlap between player cylinder and obstacle
      if (playerTop < box.min.y || playerBottom > box.max.y) {
        continue;
      }

      // Find closest point on box in XZ plane
      const clampedX = Math.max(box.min.x, Math.min(box.max.x, position.x));
      const clampedZ = Math.max(box.min.z, Math.min(box.max.z, position.z));

      const dx = position.x - clampedX;
      const dz = position.z - clampedZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < this.playerRadius * this.playerRadius) {
        const dist = Math.sqrt(distSq);
        let pushX = 0;
        let pushZ = 0;

        if (dist > 0.0001) {
          const overlap = this.playerRadius - dist;
          pushX = (dx / dist) * overlap;
          pushZ = (dz / dist) * overlap;
        } else {
          // Player center is directly inside obstacle: push along axis of least penetration
          const distToMinX = Math.abs(position.x - box.min.x);
          const distToMaxX = Math.abs(box.max.x - position.x);
          const distToMinZ = Math.abs(position.z - box.min.z);
          const distToMaxZ = Math.abs(box.max.z - position.z);

          const minDist = Math.min(distToMinX, distToMaxX, distToMinZ, distToMaxZ);
          if (minDist === distToMinX) {
            pushX = -(distToMinX + this.playerRadius);
          } else if (minDist === distToMaxX) {
            pushX = distToMaxX + this.playerRadius;
          } else if (minDist === distToMinZ) {
            pushZ = -(distToMinZ + this.playerRadius);
          } else {
            pushZ = distToMaxZ + this.playerRadius;
          }
        }

        position.x += pushX;
        position.z += pushZ;

        // Dampen velocity into wall (sliding vector)
        if (velocity) {
          const pushLen = Math.hypot(pushX, pushZ);
          if (pushLen > 0.0001) {
            const nx = pushX / pushLen;
            const nz = pushZ / pushLen;
            const dot = velocity.x * nx + velocity.z * nz;
            if (dot < 0) {
              velocity.x -= nx * dot;
              velocity.z -= nz * dot;
            }
          }
        }
      }
    }

    return position;
  }

  /**
   * Check line of sight from camera target (player eye/shoulder) to desired camera position.
   * Returns safe distance preventing camera clipping through geometry.
   */
  getSafeCameraDistance(targetPos, desiredCamPos, maxDistance) {
    this._camDir.subVectors(desiredCamPos, targetPos);
    const distToTarget = this._camDir.length();
    this._camDir.normalize();

    this.cameraRaycaster.set(targetPos, this._camDir);
    this.cameraRaycaster.far = distToTarget;

    // Check both terrain and obstacles
    const colliders = [...this.groundMeshes, ...this.obstacleMeshes];
    const hits = this.cameraRaycaster.intersectObjects(colliders, true);

    if (hits.length > 0) {
      // Keep camera slightly in front of the hit point
      const safeDist = Math.max(0.6, hits[0].distance - 0.3);
      return Math.min(safeDist, maxDistance);
    }

    return maxDistance;
  }
}
