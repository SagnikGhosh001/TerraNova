import * as THREE from 'three';

/**
 * TestEnvironment generates a rich, stylized testing ground for Phase 1:
 * - Rolling undulating hills with varying slopes
 * - Stepped stone terrace and ramps to test stepping and elevation changes
 * - Ancient stone pillars, arches, and monoliths to test solid obstacles and camera collision
 * - Low-poly trees and boulders for scale reference
 */
export class TestEnvironment {
  constructor(scene, materials, collisionSystem) {
    this.scene = scene;
    this.materials = materials;
    this.collisionSystem = collisionSystem;

    this.group = new THREE.Group();
    this.group.name = 'TestEnvironment';
    this.scene.add(this.group);

    this._buildTerrain();
    this._buildStoneTerrace();
    this._buildObstaclesAndPillars();
    this._buildProps();
  }

  _buildTerrain() {
    const size = 180;
    const segments = 90;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Keep spawn clearing relatively flat within 15m radius
      const distFromCenter = Math.hypot(x, z);
      const centerFactor = Math.min(1.0, Math.max(0.0, (distFromCenter - 12) / 25));

      // Layered sine/cosine elevation
      let h = (
        Math.sin(x * 0.05) * 3.5 +
        Math.cos(z * 0.04) * 3.2 +
        Math.sin((x + z) * 0.08) * 1.8 +
        Math.cos(x * 0.02 - z * 0.03) * 4.5
      ) * centerFactor;

      // Add a scenic raised hill to the northeast
      const hillDist = Math.hypot(x - 45, z - 45);
      if (hillDist < 30) {
        h += Math.cos((hillDist / 30) * (Math.PI / 2)) * 8.0;
      }

      pos.setY(i, h);
    }

    geometry.computeVertexNormals();

    const terrainMesh = new THREE.Mesh(geometry, this.materials.grass);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = false;

    this.group.add(terrainMesh);
    this.collisionSystem.addGroundMesh(terrainMesh);
  }

  _buildStoneTerrace() {
    const terraceGroup = new THREE.Group();
    terraceGroup.position.set(-25, 0, 15);

    // Main elevated platform
    const platformGeo = new THREE.BoxGeometry(16, 2.4, 16);
    const platform = new THREE.Mesh(platformGeo, this.materials.ancientStone);
    platform.position.set(0, 1.2, 0);
    platform.receiveShadow = true;
    platform.castShadow = true;
    terraceGroup.add(platform);
    this.collisionSystem.addGroundMesh(platform);
    this.collisionSystem.addObstacleMesh(platform);

    // Stone Steps leading up to terrace (4 steps, 0.3m height each)
    const numSteps = 8;
    const stepDepth = 1.0;
    const stepWidth = 4.0;
    const stepRise = 0.3;

    for (let i = 0; i < numSteps; i++) {
      const stepGeo = new THREE.BoxGeometry(stepWidth, stepRise, stepDepth);
      const step = new THREE.Mesh(stepGeo, this.materials.ancientStone);
      step.position.set(0, (i + 0.5) * stepRise, 8 + (i + 0.5) * stepDepth);
      step.receiveShadow = true;
      step.castShadow = true;
      terraceGroup.add(step);
      this.collisionSystem.addGroundMesh(step);
    }

    // Low protective stone curbs on platform
    const curbGeo = new THREE.BoxGeometry(0.6, 0.8, 16);
    const curbLeft = new THREE.Mesh(curbGeo, this.materials.ancientStone);
    curbLeft.position.set(-7.7, 2.8, 0);
    curbLeft.castShadow = true;
    curbLeft.receiveShadow = true;
    terraceGroup.add(curbLeft);
    this.collisionSystem.addObstacleMesh(curbLeft);

    const curbRight = new THREE.Mesh(curbGeo, this.materials.ancientStone);
    curbRight.position.set(7.7, 2.8, 0);
    curbRight.castShadow = true;
    curbRight.receiveShadow = true;
    terraceGroup.add(curbRight);
    this.collisionSystem.addObstacleMesh(curbRight);

    this.group.add(terraceGroup);
  }

  _buildObstaclesAndPillars() {
    // 1. Ancient stone monoliths in spawn clearing
    const monolithPositions = [
      { x: 12, z: -8, h: 6, w: 1.6 },
      { x: 14, z: -12, h: 8, w: 1.8 },
      { x: 18, z: -7, h: 5, w: 1.5 },
      { x: -14, z: -14, h: 7, w: 1.6 },
      { x: -18, z: -10, h: 9, w: 2.0 },
    ];

    for (const m of monolithPositions) {
      const geo = new THREE.BoxGeometry(m.w, m.h, m.w);
      const mesh = new THREE.Mesh(geo, this.materials.ancientStone);
      mesh.position.set(m.x, m.h / 2, m.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Subtle tilt for ancient ruin feel
      mesh.rotation.y = (m.x + m.z) * 0.2;
      mesh.rotation.z = 0.05 * (m.x % 2 === 0 ? 1 : -1);

      this.group.add(mesh);
      this.collisionSystem.addObstacleMesh(mesh);
      this.collisionSystem.addGroundMesh(mesh); // Top can be jumped on
    }

    // 2. Ruined stone archway
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, -22);

    const pillarGeo = new THREE.BoxGeometry(1.6, 6.5, 1.6);
    const leftPillar = new THREE.Mesh(pillarGeo, this.materials.ancientStone);
    leftPillar.position.set(-3.5, 3.25, 0);
    leftPillar.castShadow = true;
    leftPillar.receiveShadow = true;
    archGroup.add(leftPillar);
    this.collisionSystem.addObstacleMesh(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, this.materials.ancientStone);
    rightPillar.position.set(3.5, 3.25, 0);
    rightPillar.castShadow = true;
    rightPillar.receiveShadow = true;
    archGroup.add(rightPillar);
    this.collisionSystem.addObstacleMesh(rightPillar);

    const lintelGeo = new THREE.BoxGeometry(9.5, 1.4, 2.0);
    const lintel = new THREE.Mesh(lintelGeo, this.materials.ancientStone);
    lintel.position.set(0, 6.8, 0);
    lintel.castShadow = true;
    lintel.receiveShadow = true;
    archGroup.add(lintel);
    this.collisionSystem.addObstacleMesh(lintel);
    this.collisionSystem.addGroundMesh(lintel);

    this.group.add(archGroup);
  }

  _buildProps() {
    // Stylized low-poly trees
    const treePositions = [
      { x: -8, z: 12, s: 1.1 },
      { x: -14, z: 20, s: 1.3 },
      { x: 16, z: 14, s: 1.0 },
      { x: 22, z: 18, s: 1.2 },
      { x: 28, z: 5, s: 1.4 },
      { x: -5, z: 28, s: 1.2 },
      { x: 30, z: -25, s: 1.5 },
      { x: -30, z: -30, s: 1.3 },
    ];

    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 3.2, 6);
    const foliageGeo1 = new THREE.ConeGeometry(2.4, 3.5, 6);
    const foliageGeo2 = new THREE.ConeGeometry(1.8, 2.8, 6);

    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x3d7436,
      roughness: 0.8,
      metalness: 0.05,
      flatShading: true,
    });

    for (const tp of treePositions) {
      const tree = new THREE.Group();
      tree.position.set(tp.x, 0, tp.z);
      tree.scale.setScalar(tp.s);

      // Trunk
      const trunk = new THREE.Mesh(trunkGeo, this.materials.wood);
      trunk.position.y = 1.6;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      tree.add(trunk);

      // Foliage layers
      const f1 = new THREE.Mesh(foliageGeo1, foliageMat);
      f1.position.y = 3.6;
      f1.castShadow = true;
      tree.add(f1);

      const f2 = new THREE.Mesh(foliageGeo2, foliageMat);
      f2.position.y = 5.2;
      f2.castShadow = true;
      tree.add(f2);

      this.group.add(tree);
      this.collisionSystem.addObstacleMesh(trunk);
    }

    // Boulders
    const boulderGeo = new THREE.DodecahedronGeometry(1.4, 0);
    const boulderPositions = [
      { x: 8, z: 8, s: 1.0 },
      { x: 10, z: 6, s: 0.7 },
      { x: -10, z: -6, s: 1.2 },
      { x: -12, z: 8, s: 0.9 },
    ];

    for (const bp of boulderPositions) {
      const boulder = new THREE.Mesh(boulderGeo, this.materials.stone);
      boulder.position.set(bp.x, 0.8 * bp.s, bp.z);
      boulder.scale.set(bp.s, bp.s * 0.85, bp.s * 1.1);
      boulder.rotation.set(bp.x, bp.z, 0.4);
      boulder.castShadow = true;
      boulder.receiveShadow = true;
      this.group.add(boulder);
      this.collisionSystem.addObstacleMesh(boulder);
      this.collisionSystem.addGroundMesh(boulder);
    }
  }
}
