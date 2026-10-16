import { Random } from './Random.js';

/**
 * 2D Simplex Noise implementation with seeded permutation table
 * and Fractional Brownian Motion (fBm) octave synthesis.
 */
export class SimplexNoise {
  constructor(seed = 12345) {
    this.random = new Random(seed);
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);

    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    // Shuffle permutation table deterministically
    for (let i = 255; i > 0; i--) {
      const r = this.random.integer(0, i);
      const temp = p[i];
      p[i] = p[r];
      p[r] = temp;
    }

    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }

    // Skewing and unskewing factors for 2D
    this.F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    this.G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    // 12 2D gradient vectors
    this.grad2 = [
      [1, 1], [-1, 1], [1, -1], [-1, -1],
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [-1, 1], [1, -1], [-1, -1]
    ];
  }

  /**
   * 2D Simplex noise sample in range [-1, 1]
   */
  noise2D(xin, yin) {
    const s = (xin + yin) * this.F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * this.G2;

    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1, j1;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    const x1 = x0 - i1 + this.G2;
    const y1 = y0 - j1 + this.G2;
    const x2 = x0 - 1.0 + 2.0 * this.G2;
    const y2 = y0 - 1.0 + 2.0 * this.G2;

    const ii = i & 255;
    const jj = j & 255;

    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

    let n0, n1, n2;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
      n0 = 0.0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * (this.grad2[gi0][0] * x0 + this.grad2[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0.0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * (this.grad2[gi1][0] * x1 + this.grad2[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0.0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * (this.grad2[gi2][0] * x2 + this.grad2[gi2][1] * y2);
    }

    // Scale to [-1, 1]
    return 70.0 * (n0 + n1 + n2);
  }

  /**
   * Fractal Brownian Motion (octaves of noise summed together)
   * Returns value roughly normalized in [0, 1]
   */
  fBm(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0, frequency = 1.0) {
    let total = 0;
    let amplitude = 1;
    let maxValue = 0;
    let freq = frequency;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * freq, y * freq) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      freq *= lacunarity;
    }

    // Normalize from [-maxValue, maxValue] to [0, 1]
    return (total / maxValue + 1) * 0.5;
  }

  /**
   * Ridged multifractal noise (great for sharp mountain ridges)
   */
  ridgedNoise(x, y, octaves = 4, frequency = 1.0) {
    let total = 0;
    let amplitude = 1;
    let maxValue = 0;
    let freq = frequency;

    for (let i = 0; i < octaves; i++) {
      let n = Math.abs(this.noise2D(x * freq, y * freq));
      n = 1.0 - n; // Invert so valleys become ridges
      n = n * n;   // Sharpen ridges
      total += n * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      freq *= 2.0;
    }

    return total / maxValue;
  }
}
