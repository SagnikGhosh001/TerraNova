import * as THREE from 'three';
import { Random } from '../utils/Random.js';
import { WorldConfig } from './WorldConfig.js';
import { BiomeType } from './BiomeSystem.js';

/**
 * VegetationGenerator instantiates performant instanced trees, rocks,
 * and grass clumps per terrain chunk using THREE.InstancedMesh.
 */
export class VegetationGenerator {
  constructor(materials) {
    this.materials = materials;

    this._dummy = new THREE.Object3D();

    // 1. Shared Prototype Geometries
    // A) Pine Tree (Multi-tier cone canopy with rustic brown trunk)
    this.pineTreeGeo = this._createPineGeometry();
    this.pineTreeMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.05,
      flatShading: true,
    });

    // B) Broadleaf / Oak Tree (Layered organic canopy with gnarled bark trunk)
    this.oakTreeGeo = this._createOakGeometry();
    this.oakTreeMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.05,
      flatShading: true,
    });

    // C) Birch Tree (Pale paper bark trunk with golden-green crown)
    this.birchTreeGeo = this._createBirchGeometry();
    this.birchTreeMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.05,
      flatShading: true,
    });

    // D) Rock / Boulder
    this.rockGeo = new THREE.DodecahedronGeometry(1.0, 0);
    this.rockMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true,
    });

    // E) Stylized Grass Clump (Multi-blade arched tufts with wildflower accents)
    this.grassGeo = this._createGrassClumpGeometry();
    this.grassMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
      flatShading: true,
    });
  }

  _createPineGeometry() {
    const group = new THREE.Group();

    // 1. Rustic timber trunk
    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.44, 2.8, 6);
    trunkGeo.translate(0, 1.4, 0);
    const trunk = new THREE.Mesh(trunkGeo);
    trunk.userData.color = new THREE.Color(0x4a3222);
    group.add(trunk);

    // 2. Lower foliage cone (broad, shadowed)
    const cone1Geo = new THREE.ConeGeometry(2.4, 2.8, 7);
    cone1Geo.translate(0, 3.2, 0);
    const cone1 = new THREE.Mesh(cone1Geo);
    cone1.userData.color = new THREE.Color(0x1a4a1b);
    group.add(cone1);

    // 3. Middle foliage cone
    const cone2Geo = new THREE.ConeGeometry(1.8, 2.4, 7);
    cone2Geo.translate(0, 4.6, 0);
    const cone2 = new THREE.Mesh(cone2Geo);
    cone2.userData.color = new THREE.Color(0x276226);
    group.add(cone2);

    // 4. Upper foliage cone (sunlit tip)
    const cone3Geo = new THREE.ConeGeometry(1.2, 2.1, 7);
    cone3Geo.translate(0, 5.9, 0);
    const cone3 = new THREE.Mesh(cone3Geo);
    cone3.userData.color = new THREE.Color(0x3b7d34);
    group.add(cone3);

    return this._mergeGroupGeometry(group);
  }

  _createOakGeometry() {
    const group = new THREE.Group();

    // 1. Sturdy gnarled oak trunk
    const trunkGeo = new THREE.CylinderGeometry(0.34, 0.55, 2.5, 6);
    trunkGeo.translate(0, 1.25, 0);
    const trunk = new THREE.Mesh(trunkGeo);
    trunk.userData.color = new THREE.Color(0x563821);
    group.add(trunk);

    // 2. Base canopy (rich forest shadow)
    const c1 = new THREE.DodecahedronGeometry(2.1, 1);
    c1.translate(0, 3.3, 0);
    const m1 = new THREE.Mesh(c1);
    m1.userData.color = new THREE.Color(0x2f6b1b);
    group.add(m1);

    // 3. Left canopy lobe
    const c2 = new THREE.DodecahedronGeometry(1.6, 1);
    c2.translate(0.9, 4.1, 0.4);
    const m2 = new THREE.Mesh(c2);
    m2.userData.color = new THREE.Color(0x448624);
    group.add(m2);

    // 4. Right canopy lobe
    const c3 = new THREE.DodecahedronGeometry(1.5, 1);
    c3.translate(-0.8, 3.9, -0.4);
    const m3 = new THREE.Mesh(c3);
    m3.userData.color = new THREE.Color(0x3e7f21);
    group.add(m3);

    // 5. Crown canopy (warm sunlit highlight)
    const c4 = new THREE.DodecahedronGeometry(1.7, 1);
    c4.translate(0.1, 4.8, 0.1);
    const m4 = new THREE.Mesh(c4);
    m4.userData.color = new THREE.Color(0x5ca52e);
    group.add(m4);

    return this._mergeGroupGeometry(group);
  }

  _createBirchGeometry() {
    const group = new THREE.Group();

    // 1. Pale birch bark trunk
    const trunkGeo = new THREE.CylinderGeometry(0.24, 0.36, 3.0, 6);
    trunkGeo.translate(0, 1.5, 0);
    const trunk = new THREE.Mesh(trunkGeo);
    trunk.userData.color = new THREE.Color(0xe2ded4);
    group.add(trunk);

    // 2. Airy golden-green autumn/spring canopy
    const c1 = new THREE.DodecahedronGeometry(1.7, 1);
    c1.translate(0, 3.6, 0);
    const m1 = new THREE.Mesh(c1);
    m1.userData.color = new THREE.Color(0x7da426);
    group.add(m1);

    const c2 = new THREE.DodecahedronGeometry(1.3, 1);
    c2.translate(0.3, 4.5, 0.2);
    const m2 = new THREE.Mesh(c2);
    m2.userData.color = new THREE.Color(0x9ec033);
    group.add(m2);

    return this._mergeGroupGeometry(group);
  }

  _createBladeGeometry(width = 0.22, height = 0.85, curve = 0.15) {
    const geo = new THREE.PlaneGeometry(width, height, 1, 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) + height * 0.5;
      const t = Math.max(0, Math.min(1, y / height));

      // Curve blade backward/outward as it grows up
      pos.setZ(i, pos.getZ(i) + t * t * curve);

      // Taper blade at tip
      if (t > 0.5) {
        const taper = 1.0 - ((t - 0.5) / 0.5) * 0.8;
        pos.setX(i, pos.getX(i) * taper);
      }

      // Root (dark soil green) -> Mid (vibrant spring meadow) -> Tip (sunlit golden lime)
      let r, g, b;
      if (t < 0.45) {
        const s = t / 0.45;
        r = THREE.MathUtils.lerp(0.10, 0.28, s);
        g = THREE.MathUtils.lerp(0.20, 0.56, s);
        b = THREE.MathUtils.lerp(0.06, 0.12, s);
      } else {
        const s = (t - 0.45) / 0.55;
        r = THREE.MathUtils.lerp(0.28, 0.64, s);
        g = THREE.MathUtils.lerp(0.56, 0.86, s);
        b = THREE.MathUtils.lerp(0.12, 0.22, s);
      }

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.translate(0, height * 0.5, 0);
    return geo;
  }

  _createGrassClumpGeometry() {
    const group = new THREE.Group();

    // 6 Arched grass blades at varied radial angles and heights
    const bladeConfigs = [
      { rotY: 0, height: 0.85, width: 0.24, curve: 0.18 },
      { rotY: Math.PI * 0.32, height: 0.72, width: 0.20, curve: 0.14 },
      { rotY: Math.PI * 0.65, height: 0.92, width: 0.26, curve: 0.20 },
      { rotY: Math.PI * 1.02, height: 0.78, width: 0.22, curve: 0.16 },
      { rotY: Math.PI * 1.35, height: 0.88, width: 0.24, curve: 0.19 },
      { rotY: Math.PI * 1.70, height: 0.68, width: 0.19, curve: 0.13 },
    ];

    for (const cfg of bladeConfigs) {
      const bladeGeo = this._createBladeGeometry(cfg.width, cfg.height, cfg.curve);
      bladeGeo.rotateY(cfg.rotY);
      const bladeMesh = new THREE.Mesh(bladeGeo, this.materials.grass);
      group.add(bladeMesh);
    }

    // 2 Wildflower blossoms in the tuft
    // Flower 1: Golden buttercup
    const stemGeo1 = new THREE.CylinderGeometry(0.02, 0.02, 0.95, 4);
    stemGeo1.translate(0.1, 0.48, 0.08);
    const stem1 = new THREE.Mesh(stemGeo1);
    stem1.userData.color = new THREE.Color(0x366318);
    group.add(stem1);

    const bloomGeo1 = new THREE.DodecahedronGeometry(0.10, 0);
    bloomGeo1.translate(0.1, 0.96, 0.08);
    const bloom1 = new THREE.Mesh(bloomGeo1);
    bloom1.userData.color = new THREE.Color(0xfbbf24); // Warm sunflower gold
    group.add(bloom1);

    // Flower 2: Red field poppy
    const stemGeo2 = new THREE.CylinderGeometry(0.02, 0.02, 0.82, 4);
    stemGeo2.translate(-0.12, 0.41, -0.05);
    const stem2 = new THREE.Mesh(stemGeo2);
    stem2.userData.color = new THREE.Color(0x366318);
    group.add(stem2);

    const bloomGeo2 = new THREE.DodecahedronGeometry(0.09, 0);
    bloomGeo2.translate(-0.12, 0.83, -0.05);
    const bloom2 = new THREE.Mesh(bloomGeo2);
    bloom2.userData.color = new THREE.Color(0xf43f5e); // Vivid poppy red
    group.add(bloom2);

    return this._mergeGroupGeometry(group);
  }

  _mergeGroupGeometry(group) {
    const geometries = [];
    const colors = [];
    group.updateMatrixWorld(true);
    group.traverse((child) => {
      if (child.isMesh) {
        const cloned = child.geometry.clone();
        cloned.applyMatrix4(child.matrixWorld);
        geometries.push(cloned);

        const col = child.userData.color || (child.material && child.material.color) || new THREE.Color(0xffffff);
        colors.push(col);
      }
    });

    let totalVerts = 0;
    for (const g of geometries) {
      totalVerts += g.attributes.position.count;
    }

    const mergedPositions = new Float32Array(totalVerts * 3);
    const mergedNormals = new Float32Array(totalVerts * 3);
    const mergedColors = new Float32Array(totalVerts * 3);

    let offset = 0;
    for (let i = 0; i < geometries.length; i++) {
      const g = geometries[i];
      const col = colors[i];
      const pos = g.attributes.position.array;
      const norm = g.attributes.normal.array;
      const count = g.attributes.position.count;

      mergedPositions.set(pos, offset * 3);
      mergedNormals.set(norm, offset * 3);

      for (let v = 0; v < count; v++) {
        if (g.attributes.color) {
          mergedColors[(offset + v) * 3] = g.attributes.color.getX(v);
          mergedColors[(offset + v) * 3 + 1] = g.attributes.color.getY(v);
          mergedColors[(offset + v) * 3 + 2] = g.attributes.color.getZ(v);
        } else {
          mergedColors[(offset + v) * 3] = col.r;
          mergedColors[(offset + v) * 3 + 1] = col.g;
          mergedColors[(offset + v) * 3 + 2] = col.b;
        }
      }

      offset += count;
      g.dispose();
    }

    const mergedGeo = new THREE.BufferGeometry();
    mergedGeo.setAttribute('position', new THREE.BufferAttribute(mergedPositions, 3));
    mergedGeo.setAttribute('normal', new THREE.BufferAttribute(mergedNormals, 3));
    mergedGeo.setAttribute('color', new THREE.BufferAttribute(mergedColors, 3));
    mergedGeo.computeBoundingBox();
    mergedGeo.computeBoundingSphere();

    return mergedGeo;
  }

  /**
   * Generates instanced vegetation for a chunk and returns { group, colliders }.
   */
  generateChunkVegetation(cx, cz, terrainGenerator, collisionSystem) {
    const group = new THREE.Group();
    group.name = `Vegetation_${cx}_${cz}`;

    const size = WorldConfig.chunkSize;
    const originX = cx * size;
    const originZ = cz * size;

    // Deterministic PRNG for this chunk
    const rng = new Random(WorldConfig.seed ^ (cx * 73856093) ^ (cz * 19349663));

    // Determine biome from chunk center
    const centerH = terrainGenerator.getHeight(originX + size * 0.5, originZ + size * 0.5);
    const biome = terrainGenerator.biomeSystem.getBiome(
      originX + size * 0.5,
      originZ + size * 0.5,
      centerH
    );

    // Target counts based on biome
    let numPines = 0;
    let numOaks = 0;
    let numBirch = 0;
    let numRocks = 0;
    let numGrass = 0;

    switch (biome) {
      case BiomeType.FOREST:
        numPines = rng.integer(18, 26);
        numOaks = rng.integer(8, 14);
        numBirch = rng.integer(4, 9);
        numRocks = rng.integer(5, 10);
        numGrass = rng.integer(80, 130);
        break;
      case BiomeType.PLAINS:
        numPines = rng.integer(2, 6);
        numOaks = rng.integer(6, 12);
        numBirch = rng.integer(3, 7);
        numRocks = rng.integer(4, 8);
        numGrass = rng.integer(100, 160);
        break;
      case BiomeType.MOUNTAIN:
        numPines = rng.integer(1, 5);
        numOaks = 0;
        numBirch = 0;
        numRocks = rng.integer(15, 25);
        numGrass = rng.integer(15, 35);
        break;
      case BiomeType.BEACH:
        numPines = 0;
        numOaks = 0;
        numBirch = 0;
        numRocks = rng.integer(2, 5);
        numGrass = rng.integer(8, 20);
        break;
    }

    const colliders = [];

    // Helper to generate candidate positions
    const populateInstanced = (count, instancedMesh, scaleRange, addColliders, colliderRadius, colliderHeight) => {
      if (count <= 0) return;

      let placed = 0;
      for (let i = 0; i < count * 2 && placed < count; i++) {
        const lx = rng.range(3, size - 3);
        const lz = rng.range(3, size - 3);
        const wx = originX + lx;
        const wz = originZ + lz;

        // Skip spawn clearing to preserve open starter space
        if (Math.hypot(wx - WorldConfig.spawnX, wz - WorldConfig.spawnZ) < 14) {
          continue;
        }

        const h = terrainGenerator.getHeight(wx, wz);
        const slope = terrainGenerator.getSlopeAngle(wx, wz);

        // Don't place in water or on vertical cliffs
        if (h < WorldConfig.waterLevel + 0.4 || slope > 0.6) {
          continue;
        }

        const s = rng.range(scaleRange[0], scaleRange[1]);
        const rotY = rng.range(0, Math.PI * 2);

        this._dummy.position.set(wx, h, wz);
        this._dummy.rotation.set(0, rotY, 0);
        this._dummy.scale.set(s, s, s);
        this._dummy.updateMatrix();

        instancedMesh.setMatrixAt(placed, this._dummy.matrix);

        // Add obstacle collider
        if (addColliders && collisionSystem) {
          const colGeo = new THREE.CylinderGeometry(
            colliderRadius * s,
            colliderRadius * s,
            colliderHeight * s,
            6
          );
          const colMesh = new THREE.Mesh(colGeo, this.materials.stone);
          colMesh.position.set(wx, h + (colliderHeight * s) * 0.5, wz);
          colMesh.updateMatrixWorld(true);
          collisionSystem.addObstacleMesh(colMesh);
          colliders.push(colMesh);
        }

        placed++;
      }

      instancedMesh.count = placed;
      instancedMesh.instanceMatrix.needsUpdate = true;
      group.add(instancedMesh);
    };

    // 1. Pines
    if (numPines > 0) {
      const pineMesh = new THREE.InstancedMesh(this.pineTreeGeo, this.pineTreeMat, numPines);
      pineMesh.receiveShadow = true;
      pineMesh.castShadow = true;
      populateInstanced(numPines, pineMesh, [0.8, 1.3], true, 0.4, 3.0);
    }

    // 2. Oaks
    if (numOaks > 0) {
      const oakMesh = new THREE.InstancedMesh(this.oakTreeGeo, this.oakTreeMat, numOaks);
      oakMesh.receiveShadow = true;
      oakMesh.castShadow = true;
      populateInstanced(numOaks, oakMesh, [0.8, 1.25], true, 0.45, 2.5);
    }

    // 3. Birch
    if (numBirch > 0) {
      const birchMesh = new THREE.InstancedMesh(this.birchTreeGeo, this.birchTreeMat, numBirch);
      birchMesh.receiveShadow = true;
      birchMesh.castShadow = true;
      populateInstanced(numBirch, birchMesh, [0.75, 1.25], true, 0.35, 2.8);
    }

    // 4. Rocks
    if (numRocks > 0) {
      const rockMesh = new THREE.InstancedMesh(this.rockGeo, this.rockMat, numRocks);
      rockMesh.receiveShadow = true;
      rockMesh.castShadow = true;
      populateInstanced(numRocks, rockMesh, [0.6, 1.4], true, 0.7, 1.2);
    }

    // 5. Grass & Wildflowers
    if (numGrass > 0) {
      const grassMesh = new THREE.InstancedMesh(this.grassGeo, this.grassMat, numGrass);
      grassMesh.receiveShadow = true;
      populateInstanced(numGrass, grassMesh, [0.7, 1.3], false);
    }

    return { group, colliders };
  }
}
