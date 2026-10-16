import * as THREE from 'three';

/**
 * Sky manages the atmospheric sky dome, sun disk, horizon haze,
 * and gently drifting stylized clouds.
 */
export class Sky {
  constructor(scene = null) {
    this.scene = scene;

    const skyColor = new THREE.Color(0x3a88e9);
    const horizonColor = new THREE.Color(0xc2ddfc);

    // 1. Scene background & Fog
    if (this.scene) {
      this.scene.background = horizonColor;
      this.scene.fog = new THREE.Fog(horizonColor, 70, 260);
    }

    // 2. Stylized Gradient Sky Dome
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;

      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `;

    const uniforms = {
      topColor: { value: skyColor },
      bottomColor: { value: horizonColor },
      offset: { value: 15 },
      exponent: { value: 0.65 },
    };

    const skyGeo = new THREE.SphereGeometry(450, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
    });

    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    if (this.scene) this.scene.add(this.skyMesh);

    // 3. Stylized Sun Disk
    const sunGeo = new THREE.CircleGeometry(16, 24);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfffaea,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    // Align with sun direction (60, 85, 45)
    const sunDir = new THREE.Vector3(60, 85, 45).normalize();
    this.sunMesh.position.copy(sunDir.clone().multiplyScalar(400));
    this.sunMesh.lookAt(0, 0, 0);
    if (this.scene) this.scene.add(this.sunMesh);

    // 4. Drifting Low-Poly Clouds Group
    this.cloudsGroup = new THREE.Group();
    if (this.scene) this.scene.add(this.cloudsGroup);
    this._createClouds();
  }

  get clouds() {
    return this.cloudList;
  }

  _createClouds() {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: true,
      transparent: true,
      opacity: 0.88,
    });

    this.cloudList = [];
    const numClouds = 22;
    const spread = 350;

    for (let i = 0; i < numClouds; i++) {
      const cloud = new THREE.Group();
      const numPuffs = 4 + Math.floor(Math.random() * 4);

      for (let j = 0; j < numPuffs; j++) {
        const puffGeo = new THREE.DodecahedronGeometry(
          8 + Math.random() * 8,
          1
        );
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set(
          (j - numPuffs * 0.5) * 8 + (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 8
        );
        puff.scale.set(1.2, 0.7, 1.0);
        cloud.add(puff);
      }

      cloud.position.set(
        (Math.random() - 0.5) * spread * 2,
        110 + Math.random() * 30,
        (Math.random() - 0.5) * spread * 2
      );

      this.cloudsGroup.add(cloud);
      this.cloudList.push({
        mesh: cloud,
        speed: 1.8 + Math.random() * 2.2,
      });
    }
  }

  update(playerPosition = null, deltaTime = 0.016) {
    let pos = playerPosition;
    let dt = deltaTime;
    if (typeof playerPosition === 'number') {
      dt = playerPosition;
      pos = new THREE.Vector3(0, 0, 0);
    }
    if (!pos) {
      pos = new THREE.Vector3(0, 0, 0);
    }

    // Follow player horizontally
    if (this.skyMesh) this.skyMesh.position.copy(pos);

    const sunDir = new THREE.Vector3(60, 85, 45).normalize();
    if (this.sunMesh) this.sunMesh.position.copy(pos).add(sunDir.clone().multiplyScalar(400));

    // Slowly drift clouds horizontally across the world
    for (const item of this.cloudList) {
      item.mesh.position.x += item.speed * dt;

      // Wrap around relative to player position
      if (item.mesh.position.x - pos.x > 380) {
        item.mesh.position.x = pos.x - 380;
      } else if (item.mesh.position.x - pos.x < -380) {
        item.mesh.position.x = pos.x + 380;
      }

      if (item.mesh.position.z - pos.z > 380) {
        item.mesh.position.z = pos.z - 380;
      } else if (item.mesh.position.z - pos.z < -380) {
        item.mesh.position.z = pos.z + 380;
      }
    }
  }
}
