import * as THREE from 'three';
import { WorldConfig } from './WorldConfig.js';

/**
 * WaterGenerator creates stylized, animated water surfaces for rivers and lakes.
 * Only chunks with depressions below waterLevel instantiate water geometry.
 */
export class WaterGenerator {
  constructor() {
    this.waterHeight = WorldConfig.waterLevel;
    this.activeWaterMeshes = [];

    // Stylized custom water shader with gentle sine wave ripples & depth tint
    const vertexShader = `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        vUv = uv;
        vec3 pos = position;

        // Subtle gentle surface ripples with dual harmonics
        float wave1 = sin(pos.x * 0.45 + uTime * 1.6) * 0.09;
        float wave2 = cos(pos.z * 0.38 + uTime * 1.3) * 0.09;
        float wave3 = sin((pos.x + pos.z) * 0.25 + uTime * 2.0) * 0.05;
        pos.y += wave1 + wave2 + wave3;

        vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `;

    const fragmentShader = `
      uniform vec3 uShallowColor;
      uniform vec3 uDeepColor;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorldPos;

      void main() {
        // Multi-frequency wave shimmer
        float waveA = sin(vWorldPos.x * 0.6 + uTime * 2.2);
        float waveB = cos(vWorldPos.z * 0.6 + uTime * 1.8);
        float shimmer = waveA * waveB * 0.5 + 0.5;

        // Base color blend
        vec3 waterColor = mix(uDeepColor, uShallowColor, shimmer * 0.4 + 0.35);

        // Sunlight specular glint reflection
        vec3 sunDir = normalize(vec3(0.53, 0.75, 0.4));
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 halfVec = normalize(sunDir + viewDir);
        vec3 normal = normalize(vec3(
          -cos(vWorldPos.x * 0.6 + uTime * 2.2) * 0.15,
          1.0,
          -sin(vWorldPos.z * 0.6 + uTime * 1.8) * 0.15
        ));

        float spec = pow(max(dot(normal, halfVec), 0.0), 32.0);
        waterColor += vec3(1.0, 0.95, 0.85) * spec * 0.65;

        gl_FragColor = vec4(waterColor, 0.84);
      }
    `;

    this.waterMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uShallowColor: { value: new THREE.Color(0x38bdf8) }, // Bright turquoise
        uDeepColor: { value: new THREE.Color(0x0284c7) },    // Rich azure
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }

  /**
   * Builds water mesh for a chunk if any area in the chunk is below waterLevel.
   */
  createChunkWater(cx, cz, terrainGenerator) {
    const size = WorldConfig.chunkSize;
    const originX = cx * size;
    const originZ = cz * size;

    // Fast probe: check 9 sample points across chunk to see if water exists
    let hasWater = false;
    const samples = [0, size * 0.5, size];
    for (const sx of samples) {
      for (const sz of samples) {
        if (terrainGenerator.getHeight(originX + sx, originZ + sz) < this.waterHeight + 0.2) {
          hasWater = true;
          break;
        }
      }
      if (hasWater) break;
    }

    if (!hasWater) return null;

    // Plane geometry covering the chunk
    const waterGeo = new THREE.PlaneGeometry(size, size, 8, 8);
    waterGeo.rotateX(-Math.PI / 2);

    const waterMesh = new THREE.Mesh(waterGeo, this.waterMaterial);
    waterMesh.name = `WaterChunk_${cx}_${cz}`;
    // Position at chunk center at waterHeight
    waterMesh.position.set(originX + size * 0.5, this.waterHeight, originZ + size * 0.5);
    waterMesh.receiveShadow = true;

    return waterMesh;
  }

  update(deltaTime, elapsedTime) {
    if (this.waterMaterial.uniforms.uTime) {
      this.waterMaterial.uniforms.uTime.value = elapsedTime;
    }
  }

  dispose() {
    this.waterMaterial.dispose();
  }
}
