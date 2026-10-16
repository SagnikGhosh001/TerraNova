import * as THREE from 'three';

/**
 * Centralized material palette for consistent stylized aesthetics.
 */
export class Materials {
  constructor() {
    // Terrain materials
    this.grass = new THREE.MeshStandardMaterial({
      color: 0x4a853d,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });

    this.dirtPath = new THREE.MeshStandardMaterial({
      color: 0x8b6d4b,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: true,
    });

    this.stone = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.75,
      metalness: 0.1,
      flatShading: true,
    });

    this.ancientStone = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true,
    });

    this.wood = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.7,
      metalness: 0.0,
      flatShading: true,
    });

    this.woodTrim = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.65,
      metalness: 0.0,
      flatShading: true,
    });

    // Character materials
    this.characterJacket = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Vibrant sky blue explorer jacket
      roughness: 0.6,
      metalness: 0.1,
      flatShading: true,
    });

    this.characterTrim = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Amber yellow accent stripes
      roughness: 0.5,
      metalness: 0.1,
      flatShading: true,
    });

    this.characterPants = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark navy slate pants
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true,
    });

    this.characterBoots = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Charcoal boots
      roughness: 0.6,
      metalness: 0.2,
      flatShading: true,
    });

    this.characterSkin = new THREE.MeshStandardMaterial({
      color: 0xf1c27d, // Warm stylized skin
      roughness: 0.6,
      metalness: 0.0,
      flatShading: true,
    });

    this.characterVisor = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });

    this.characterBackpack = new THREE.MeshStandardMaterial({
      color: 0xb45309, // Leather backpack
      roughness: 0.7,
      metalness: 0.05,
      flatShading: true,
    });

    // Test obstacle accent
    this.accentPillar = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0369a1,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.2,
      flatShading: true,
    });
  }
}
