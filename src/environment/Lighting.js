import * as THREE from 'three';

/**
 * Lighting sets up directional sunlight with cascaded shadow volume and hemisphere ambient bounce.
 */
export class Lighting {
  constructor(scene) {
    this.scene = scene;

    // 1. Hemisphere Light (Soft sky dome + ground bounce)
    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x47623a, 0.75);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // 2. Directional Sun Light
    this.sunLight = new THREE.DirectionalLight(0xfff8ea, 1.4);
    this.sunLight.position.set(50, 70, 40);
    this.sunLight.castShadow = true;

    // Configure shadows
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 250;

    const d = 65;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.03;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Offset vector of the sun relative to the target
    this.sunOffset = new THREE.Vector3(60, 85, 45);
  }

  /**
   * Keep the sun's shadow frustum centered around the player position.
   */
  update(playerPosition) {
    if (!playerPosition) return;

    this.sunLight.target.position.copy(playerPosition);
    this.sunLight.position.copy(playerPosition).add(this.sunOffset);
  }
}
