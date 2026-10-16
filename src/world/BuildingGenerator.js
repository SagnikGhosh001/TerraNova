import * as THREE from 'three';
import { StructureModels } from './StructureModels.js';
import { Random } from '../utils/Random.js';
import { WorldConfig } from './WorldConfig.js';
import { BiomeType } from './BiomeSystem.js';

/**
 * BuildingGenerator procedurally places cabins, settlements, watchtowers,
 * bridges, and shrines deterministically across terrain chunks.
 */
export class BuildingGenerator {
  constructor(materials) {
    this.materials = materials;
    this.models = new StructureModels(materials);
  }

  /**
   * Generates structures for chunk (cx, cz).
   */
  generateChunkBuildings(cx, cz, terrainGenerator, collisionSystem, discoverySystem) {
    const group = new THREE.Group();
    group.name = `Buildings_${cx}_${cz}`;

    const colliders = [];
    const walkables = [];

    const size = WorldConfig.chunkSize;
    const originX = cx * size;
    const originZ = cz * size;

    const rng = new Random(WorldConfig.seed ^ (cx * 15485863) ^ (cz * 32452843));

    // 1. STARTER OUTPOST in chunk (0, 0)
    if (cx === 0 && cz === 0) {
      this._buildStarterOutpost(group, colliders, walkables, terrainGenerator, collisionSystem);
      return { group, colliders, walkables };
    }

    // Determine biome from chunk center
    const centerWX = originX + size * 0.5;
    const centerWZ = originZ + size * 0.5;
    const centerH = terrainGenerator.getHeight(centerWX, centerWZ);
    const biome = terrainGenerator.biomeSystem.getBiome(centerWX, centerWZ, centerH);

    // River Bridge Check: if a significant river passes through this chunk
    const riverFactor = terrainGenerator.getRiverFactor(centerWX, centerWZ);
    if (riverFactor > 0.4 && centerH < WorldConfig.waterLevel + 1.2) {
      // Compute river channel gradient to orient bridge perpendicular across water
      const eps = 2.0;
      const rL = terrainGenerator.getRiverFactor(centerWX - eps, centerWZ);
      const rR = terrainGenerator.getRiverFactor(centerWX + eps, centerWZ);
      const rD = terrainGenerator.getRiverFactor(centerWX, centerWZ - eps);
      const rU = terrainGenerator.getRiverFactor(centerWX, centerWZ + eps);
      const gradX = (rR - rL) / (2 * eps);
      const gradZ = (rU - rD) / (2 * eps);
      const bridgeAngle = (Math.hypot(gradX, gradZ) > 0.001)
        ? Math.atan2(gradX, gradZ)
        : Math.PI / 2;

      // Sample riverbank elevations at bridge ends
      const bridgeLen = 24.0;
      const halfSpan = 10.0;
      const b1X = centerWX + Math.sin(bridgeAngle) * halfSpan;
      const b1Z = centerWZ + Math.cos(bridgeAngle) * halfSpan;
      const b2X = centerWX - Math.sin(bridgeAngle) * halfSpan;
      const b2Z = centerWZ - Math.cos(bridgeAngle) * halfSpan;
      const h1 = terrainGenerator.getHeight(b1X, b1Z);
      const h2 = terrainGenerator.getHeight(b2X, b2Z);
      const bridgeY = Math.max(h1, h2, WorldConfig.waterLevel + 1.2);

      // Place a wooden bridge spanning the water
      const bridge = this.models.createWoodenBridge(bridgeLen, 4.2);
      bridge.mesh.position.set(centerWX, bridgeY, centerWZ);
      bridge.mesh.rotation.y = bridgeAngle;
      group.add(bridge.mesh);

      for (const col of bridge.colliders) {
        collisionSystem.addObstacleMesh(col);
        colliders.push(col);
      }
      for (const w of bridge.walkables) {
        collisionSystem.addGroundMesh(w);
        walkables.push(w);
      }

      if (discoverySystem) {
        discoverySystem.registerLandmark({
          id: `bridge_${cx}_${cz}`,
          type: 'bridge',
          name: 'Valley Bridge',
          x: centerWX,
          z: centerWZ,
        });
      }
      return { group, colliders, walkables };
    }

    // Deterministic Landmark selection
    const hash = Math.abs((cx * 37 + cz * 17 + WorldConfig.seed) % 29);

    // A) Mountain Watchtower on peaks
    if (biome === BiomeType.MOUNTAIN && hash % 7 === 0 && centerH > 18.0) {
      const tower = this.models.createWatchtower(3.4, 12.0);
      tower.mesh.position.set(centerWX, centerH, centerWZ);
      group.add(tower.mesh);

      for (const col of tower.colliders) {
        collisionSystem.addObstacleMesh(col);
        colliders.push(col);
      }
      for (const w of tower.walkables) {
        collisionSystem.addGroundMesh(w);
        walkables.push(w);
      }

      if (discoverySystem) {
        discoverySystem.registerLandmark({
          id: `watchtower_${cx}_${cz}`,
          type: 'watchtower',
          name: 'Mountain Watchtower',
          x: centerWX,
          z: centerWZ,
        });
      }
    }
    // B) Village Settlement in Plains / Forest
    else if ((biome === BiomeType.PLAINS || biome === BiomeType.FOREST) && hash === 3) {
      this._buildVillage(
        group,
        colliders,
        walkables,
        centerWX,
        centerWZ,
        terrainGenerator,
        collisionSystem,
        rng
      );

      if (discoverySystem) {
        discoverySystem.registerLandmark({
          id: `village_${cx}_${cz}`,
          type: 'village',
          name: 'Wildwood Village',
          x: centerWX,
          z: centerWZ,
        });
      }
    }
    // C) Ancient Megalithic Shrine
    else if (hash === 9) {
      const shrine = this.models.createStoneCircle(6.5, 6);
      shrine.mesh.position.set(centerWX, centerH, centerWZ);
      group.add(shrine.mesh);

      for (const col of shrine.colliders) {
        collisionSystem.addObstacleMesh(col);
        colliders.push(col);
      }
      for (const w of shrine.walkables) {
        collisionSystem.addGroundMesh(w);
        walkables.push(w);
      }

      if (discoverySystem) {
        discoverySystem.registerLandmark({
          id: `shrine_${cx}_${cz}`,
          type: 'shrine',
          name: 'Ancient Stone Shrine',
          x: centerWX,
          z: centerWZ,
        });
      }
    }
    // D) Solitary Forest Cabin
    else if (biome === BiomeType.FOREST && hash % 11 === 0 && centerH > WorldConfig.waterLevel + 2.0) {
      const cabin = this.models.createCabin(6.2, 5.2, 3.4);
      cabin.mesh.position.set(centerWX, centerH, centerWZ);
      cabin.mesh.rotation.y = rng.range(0, Math.PI * 2);
      group.add(cabin.mesh);

      for (const col of cabin.colliders) {
        collisionSystem.addObstacleMesh(col);
        colliders.push(col);
      }
      for (const w of cabin.walkables) {
        collisionSystem.addGroundMesh(w);
        walkables.push(w);
      }

      if (discoverySystem) {
        discoverySystem.registerLandmark({
          id: `cabin_${cx}_${cz}`,
          type: 'cabin',
          name: 'Woodland Cabin',
          x: centerWX,
          z: centerWZ,
        });
      }
    }

    return { group, colliders, walkables };
  }

  _buildStarterOutpost(group, colliders, walkables, terrainGenerator, collisionSystem) {
    // 1. Starter Cabin
    const cabinX = 8;
    const cabinZ = 6;
    const cabinY = terrainGenerator.getHeight(cabinX, cabinZ);
    const cabin = this.models.createCabin(6.5, 5.5, 3.4);
    cabin.mesh.position.set(cabinX, cabinY, cabinZ);
    cabin.mesh.rotation.y = -Math.PI / 4;
    group.add(cabin.mesh);

    for (const c of cabin.colliders) {
      collisionSystem.addObstacleMesh(c);
      colliders.push(c);
    }
    for (const w of cabin.walkables) {
      collisionSystem.addGroundMesh(w);
      walkables.push(w);
    }

    // 2. Campfire ring in clearing
    const fireX = 4;
    const fireZ = 12;
    const fireY = terrainGenerator.getHeight(fireX, fireZ);

    const fireGeo = new THREE.CylinderGeometry(0.8, 1.0, 0.3, 8);
    const fireRing = new THREE.Mesh(fireGeo, this.materials.ancientStone);
    fireRing.position.set(fireX, fireY + 0.15, fireZ);
    fireRing.castShadow = true;
    group.add(fireRing);
    collisionSystem.addObstacleMesh(fireRing);
    colliders.push(fireRing);

    // Benches around fire
    const benchGeo = new THREE.BoxGeometry(1.8, 0.4, 0.5);
    const b1 = new THREE.Mesh(benchGeo, this.materials.wood);
    b1.position.set(fireX + 1.8, fireY + 0.2, fireZ);
    b1.rotation.y = Math.PI / 2;
    b1.castShadow = true;
    group.add(b1);
    collisionSystem.addObstacleMesh(b1);
    colliders.push(b1);

    const b2 = new THREE.Mesh(benchGeo, this.materials.wood);
    b2.position.set(fireX - 1.8, fireY + 0.2, fireZ);
    b2.rotation.y = Math.PI / 2;
    b2.castShadow = true;
    group.add(b2);
    collisionSystem.addObstacleMesh(b2);
    colliders.push(b2);

    // 3. Wooden bridge across eastern valley
    const bridgeX = 26;
    const bridgeZ = 4;
    const bridge = this.models.createWoodenBridge(18.0, 4.0);
    bridge.mesh.position.set(bridgeX, WorldConfig.waterLevel + 1.4, bridgeZ);
    bridge.mesh.rotation.y = Math.PI / 2;
    group.add(bridge.mesh);

    for (const c of bridge.colliders) {
      collisionSystem.addObstacleMesh(c);
      colliders.push(c);
    }
    for (const w of bridge.walkables) {
      collisionSystem.addGroundMesh(w);
      walkables.push(w);
    }

    // 4. Lantern posts (one by cabin trail, one by bridge head)
    const lp1X = 6.2;
    const lp1Z = 9.5;
    const lp1Y = terrainGenerator.getHeight(lp1X, lp1Z);
    const lantern1 = this.models.createLanternPost(3.0);
    lantern1.mesh.position.set(lp1X, lp1Y, lp1Z);
    group.add(lantern1.mesh);
    for (const c of lantern1.colliders) {
      collisionSystem.addObstacleMesh(c);
      colliders.push(c);
    }

    const lp2X = 18.0;
    const lp2Z = 5.6;
    const lp2Y = terrainGenerator.getHeight(lp2X, lp2Z);
    const lantern2 = this.models.createLanternPost(3.0);
    lantern2.mesh.position.set(lp2X, lp2Y, lp2Z);
    group.add(lantern2.mesh);
    for (const c of lantern2.colliders) {
      collisionSystem.addObstacleMesh(c);
      colliders.push(c);
    }

    // 5. River dock on eastern riverbank
    const dockX = 26.0;
    const dockZ = -8.0;
    const dock = this.models.createRiverDock(8.0, 2.2);
    dock.mesh.position.set(dockX, WorldConfig.waterLevel + 0.35, dockZ);
    dock.mesh.rotation.y = 0;
    group.add(dock.mesh);
    for (const c of dock.colliders) {
      collisionSystem.addObstacleMesh(c);
      colliders.push(c);
    }
    for (const w of dock.walkables) {
      collisionSystem.addGroundMesh(w);
      walkables.push(w);
    }
  }

  _buildVillage(group, colliders, walkables, cx, cz, terrainGenerator, collisionSystem, rng) {
    // Center Town Well
    const wellH = terrainGenerator.getHeight(cx, cz);
    const well = this.models.createTownWell();
    well.mesh.position.set(cx, wellH, cz);
    group.add(well.mesh);

    for (const c of well.colliders) {
      collisionSystem.addObstacleMesh(c);
      colliders.push(c);
    }
    for (const w of well.walkables) {
      collisionSystem.addGroundMesh(w);
      walkables.push(w);
    }

    // 3 Surrounding Cottages
    const offsets = [
      { dx: -10, dz: -6, rot: 0.3 },
      { dx: 11, dz: -5, rot: -0.4 },
      { dx: 1, dz: 12, rot: Math.PI },
    ];

    for (const off of offsets) {
      const wx = cx + off.dx;
      const wz = cz + off.dz;
      const h = terrainGenerator.getHeight(wx, wz);

      const cabin = this.models.createCabin(5.8, 5.0, 3.2);
      cabin.mesh.position.set(wx, h, wz);
      cabin.mesh.rotation.y = off.rot;
      group.add(cabin.mesh);

      for (const c of cabin.colliders) {
        collisionSystem.addObstacleMesh(c);
        colliders.push(c);
      }
      for (const w of cabin.walkables) {
        collisionSystem.addGroundMesh(w);
        walkables.push(w);
      }
    }
  }
}
