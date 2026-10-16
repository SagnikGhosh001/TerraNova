import * as THREE from 'three';

/**
 * Procedural architectural models for cabins, towers, bridges, shrines, and village features.
 * All models seat naturally on terrain with deep stone foundation slabs.
 */
export class StructureModels {
  constructor(materials) {
    this.materials = materials;
  }

  /**
   * Cozy Explorer / Settler Cabin.
   */
  createCabin(width = 6.0, depth = 5.0, height = 3.2) {
    const group = new THREE.Group();
    group.name = 'Cabin';

    const colliders = [];
    const walkables = [];

    // 1. Deep Stone Foundation (prevents floating on hills)
    const foundationGeo = new THREE.BoxGeometry(width + 0.4, 2.0, depth + 0.4);
    foundationGeo.translate(0, -0.9, 0);
    const foundation = new THREE.Mesh(foundationGeo, this.materials.stone);
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    group.add(foundation);
    colliders.push(foundation);
    walkables.push(foundation);

    // 2. Timber Walls
    const wallGeo = new THREE.BoxGeometry(width, height, depth);
    wallGeo.translate(0, height * 0.5, 0);
    const walls = new THREE.Mesh(wallGeo, this.materials.wood);
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);
    colliders.push(walls);

    // 3. Peaked Gabled Roof
    const roofOverhang = 0.8;
    const roofWidth = width + roofOverhang;
    const roofDepth = depth + roofOverhang;
    const roofHeight = 1.8;

    const roofGeo = new THREE.ConeGeometry(roofWidth * 0.72, roofHeight, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.scale(1.0, 1.0, roofDepth / roofWidth);
    roofGeo.translate(0, height + roofHeight * 0.5, 0);
    const roof = new THREE.Mesh(roofGeo, this.materials.woodTrim);
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);
    colliders.push(roof);
    walkables.push(roof);

    // 4. Stone Chimney
    const chimneyGeo = new THREE.BoxGeometry(0.9, height + roofHeight + 0.6, 0.9);
    chimneyGeo.translate(width * 0.35, (height + roofHeight + 0.6) * 0.5, -depth * 0.25);
    const chimney = new THREE.Mesh(chimneyGeo, this.materials.ancientStone);
    chimney.castShadow = true;
    chimney.receiveShadow = true;
    group.add(chimney);
    colliders.push(chimney);

    // 5. Front Timber Porch
    const porchWidth = 3.2;
    const porchDepth = 2.0;
    const porchGeo = new THREE.BoxGeometry(porchWidth, 0.3, porchDepth);
    porchGeo.translate(0, 0.15, depth * 0.5 + porchDepth * 0.5);
    const porch = new THREE.Mesh(porchGeo, this.materials.wood);
    porch.castShadow = true;
    porch.receiveShadow = true;
    group.add(porch);
    walkables.push(porch);

    return { mesh: group, colliders, walkables };
  }

  /**
   * Ancient Stone Watchtower.
   */
  createWatchtower(radius = 3.5, height = 12.0) {
    const group = new THREE.Group();
    group.name = 'Watchtower';

    const colliders = [];
    const walkables = [];

    // 1. Deep cylindrical foundation
    const baseGeo = new THREE.CylinderGeometry(radius + 0.5, radius + 0.8, 3.0, 8);
    baseGeo.translate(0, -1.0, 0);
    const base = new THREE.Mesh(baseGeo, this.materials.ancientStone);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);
    colliders.push(base);

    // 2. Tower Shaft
    const shaftGeo = new THREE.CylinderGeometry(radius * 0.85, radius, height, 8);
    shaftGeo.translate(0, height * 0.5, 0);
    const shaft = new THREE.Mesh(shaftGeo, this.materials.ancientStone);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    group.add(shaft);
    colliders.push(shaft);

    // 3. Top Lookout Platform
    const platformGeo = new THREE.CylinderGeometry(radius * 1.15, radius * 0.95, 0.8, 8);
    platformGeo.translate(0, height + 0.4, 0);
    const platform = new THREE.Mesh(platformGeo, this.materials.ancientStone);
    platform.castShadow = true;
    platform.receiveShadow = true;
    group.add(platform);
    walkables.push(platform);
    colliders.push(platform);

    // 4. Crenellations / Battlements
    const numCrenels = 8;
    for (let i = 0; i < numCrenels; i++) {
      const angle = (i / numCrenels) * Math.PI * 2;
      const crenelGeo = new THREE.BoxGeometry(1.0, 0.9, 0.5);
      const crenel = new THREE.Mesh(crenelGeo, this.materials.ancientStone);
      crenel.position.set(
        Math.cos(angle) * (radius * 1.05),
        height + 1.2,
        Math.sin(angle) * (radius * 1.05)
      );
      crenel.rotation.y = -angle;
      crenel.castShadow = true;
      group.add(crenel);
      colliders.push(crenel);
    }

    // 5. Beacon Brazier with glowing fire
    const brazierGeo = new THREE.CylinderGeometry(0.8, 0.5, 0.6, 8);
    brazierGeo.translate(0, height + 1.1, 0);
    const brazier = new THREE.Mesh(brazierGeo, this.materials.ancientStone);
    group.add(brazier);
    colliders.push(brazier);

    const fireGeo = new THREE.DodecahedronGeometry(0.55, 1);
    const fireMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    const fire = new THREE.Mesh(fireGeo, fireMat);
    fire.position.set(0, height + 1.6, 0);
    group.add(fire);

    return { mesh: group, colliders, walkables };
  }

  /**
   * Ancient Stone Circle / Megalithic Shrine.
   */
  createStoneCircle(radius = 7.0, numPillars = 6) {
    const group = new THREE.Group();
    group.name = 'StoneCircle';

    const colliders = [];
    const walkables = [];

    // Central Altar Stone
    const altarGeo = new THREE.BoxGeometry(2.4, 1.1, 1.6);
    const altar = new THREE.Mesh(altarGeo, this.materials.ancientStone);
    altar.position.y = 0.55;
    altar.castShadow = true;
    altar.receiveShadow = true;
    group.add(altar);
    colliders.push(altar);
    walkables.push(altar);

    // Floating Glowing Runic Crystal above Altar
    const crystalGeo = new THREE.OctahedronGeometry(0.8, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.6,
      roughness: 0.1,
      metalness: 0.9,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.set(0, 2.2, 0);
    group.add(crystal);

    // Standing Megalith Pillars
    for (let i = 0; i < numPillars; i++) {
      const angle = (i / numPillars) * Math.PI * 2;
      const h = 4.5 + (i % 2) * 1.2;
      const pillarGeo = new THREE.BoxGeometry(1.2, h, 1.0);
      pillarGeo.translate(0, h * 0.5, 0);
      const pillar = new THREE.Mesh(pillarGeo, this.materials.ancientStone);
      pillar.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      pillar.rotation.y = -angle + 0.1;
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      group.add(pillar);
      colliders.push(pillar);
      walkables.push(pillar);
    }

    return { mesh: group, colliders, walkables };
  }

  /**
   * Wooden Trestle River Bridge.
   */
  createWoodenBridge(length = 20.0, width = 4.2) {
    const group = new THREE.Group();
    group.name = 'WoodenBridge';

    const colliders = [];
    const walkables = [];

    // 1. Deck Planks
    const deckGeo = new THREE.BoxGeometry(width, 0.35, length);
    deckGeo.translate(0, 0.18, 0);
    const deck = new THREE.Mesh(deckGeo, this.materials.wood);
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);
    walkables.push(deck);

    // Smooth approach ramps on both riverbank ends
    const rampLen = 3.0;
    const rampGeo1 = new THREE.BoxGeometry(width, 0.3, rampLen);
    rampGeo1.rotateX(0.14);
    rampGeo1.translate(0, -0.05, -length * 0.5 - rampLen * 0.45);
    const ramp1 = new THREE.Mesh(rampGeo1, this.materials.wood);
    ramp1.castShadow = true;
    ramp1.receiveShadow = true;
    group.add(ramp1);
    walkables.push(ramp1);

    const rampGeo2 = new THREE.BoxGeometry(width, 0.3, rampLen);
    rampGeo2.rotateX(-0.14);
    rampGeo2.translate(0, -0.05, length * 0.5 + rampLen * 0.45);
    const ramp2 = new THREE.Mesh(rampGeo2, this.materials.wood);
    ramp2.castShadow = true;
    ramp2.receiveShadow = true;
    group.add(ramp2);
    walkables.push(ramp2);

    // 2. Side Beam Railings
    const railingGeo = new THREE.BoxGeometry(0.2, 0.9, length + 2.0);
    const leftRail = new THREE.Mesh(railingGeo, this.materials.woodTrim);
    leftRail.position.set(-width * 0.48, 0.8, 0);
    leftRail.castShadow = true;
    group.add(leftRail);
    colliders.push(leftRail);

    const rightRail = new THREE.Mesh(railingGeo, this.materials.woodTrim);
    rightRail.position.set(width * 0.48, 0.8, 0);
    rightRail.castShadow = true;
    group.add(rightRail);
    colliders.push(rightRail);

    // 3. Support Pilings underneath
    const numPilings = Math.floor(length / 5);
    for (let i = 0; i <= numPilings; i++) {
      const zPos = -length * 0.5 + i * (length / numPilings);
      const postGeo = new THREE.CylinderGeometry(0.2, 0.25, 4.0, 6);
      postGeo.translate(0, -2.1, 0); // Sunk well below bridge deck

      const pLeft = new THREE.Mesh(postGeo, this.materials.wood);
      pLeft.position.set(-width * 0.45, 0, zPos);
      pLeft.castShadow = true;
      group.add(pLeft);

      const pRight = new THREE.Mesh(postGeo, this.materials.wood);
      pRight.position.set(width * 0.45, 0, zPos);
      pRight.castShadow = true;
      group.add(pRight);
    }

    return { mesh: group, colliders, walkables };
  }

  /**
   * Village Town Well.
   */
  createTownWell() {
    const group = new THREE.Group();
    group.name = 'TownWell';

    const colliders = [];
    const walkables = [];

    // Well stone ring
    const ringGeo = new THREE.CylinderGeometry(1.4, 1.6, 1.1, 8);
    ringGeo.translate(0, 0.55, 0);
    const ring = new THREE.Mesh(ringGeo, this.materials.ancientStone);
    ring.castShadow = true;
    ring.receiveShadow = true;
    group.add(ring);
    colliders.push(ring);
    walkables.push(ring);

    // Wooden canopy roof
    const roofGeo = new THREE.ConeGeometry(1.8, 1.2, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.translate(0, 2.7, 0);
    const roof = new THREE.Mesh(roofGeo, this.materials.woodTrim);
    roof.castShadow = true;
    group.add(roof);

    return { mesh: group, colliders, walkables };
  }

  /**
   * Wooden River Dock / Pier extending into water.
   */
  createRiverDock(length = 9.0, width = 3.2) {
    const group = new THREE.Group();
    group.name = 'RiverDock';

    const colliders = [];
    const walkables = [];

    // Timber plank deck
    const deckGeo = new THREE.BoxGeometry(width, 0.3, length);
    deckGeo.translate(0, 0.15, length * 0.5);
    const deck = new THREE.Mesh(deckGeo, this.materials.wood);
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);
    walkables.push(deck);

    // Support Pilings
    const numPilings = 4;
    for (let i = 0; i <= numPilings; i++) {
      const zPos = i * (length / numPilings);
      const postGeo = new THREE.CylinderGeometry(0.18, 0.22, 3.5, 6);
      postGeo.translate(0, -1.5, 0);

      const pLeft = new THREE.Mesh(postGeo, this.materials.wood);
      pLeft.position.set(-width * 0.45, 0, zPos);
      pLeft.castShadow = true;
      group.add(pLeft);
      colliders.push(pLeft);

      const pRight = new THREE.Mesh(postGeo, this.materials.wood);
      pRight.position.set(width * 0.45, 0, zPos);
      pRight.castShadow = true;
      group.add(pRight);
      colliders.push(pRight);
    }

    // Mooring bollard posts
    const bollardGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.6, 6);
    bollardGeo.translate(0, 0.45, 0);
    const b1 = new THREE.Mesh(bollardGeo, this.materials.woodTrim);
    b1.position.set(-width * 0.4, 0, length - 0.4);
    group.add(b1);
    colliders.push(b1);

    const b2 = new THREE.Mesh(bollardGeo, this.materials.woodTrim);
    b2.position.set(width * 0.4, 0, length - 0.4);
    group.add(b2);
    colliders.push(b2);

    return { mesh: group, colliders, walkables };
  }

  /**
   * Timber Lantern Post with glowing warm lantern.
   */
  createLanternPost(height = 3.2) {
    const group = new THREE.Group();
    group.name = 'LanternPost';

    const colliders = [];
    const walkables = [];

    // Wooden post
    const postGeo = new THREE.CylinderGeometry(0.12, 0.16, height, 6);
    postGeo.translate(0, height * 0.5, 0);
    const post = new THREE.Mesh(postGeo, this.materials.wood);
    post.castShadow = true;
    group.add(post);
    colliders.push(post);

    // Cross arm
    const armGeo = new THREE.BoxGeometry(0.6, 0.08, 0.08);
    armGeo.translate(0.25, height - 0.1, 0);
    const arm = new THREE.Mesh(armGeo, this.materials.wood);
    group.add(arm);

    // Lantern box
    const lanternGeo = new THREE.BoxGeometry(0.24, 0.32, 0.24);
    lanternGeo.translate(0.5, height - 0.35, 0);
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    group.add(lantern);

    return { mesh: group, colliders, walkables };
  }
}
