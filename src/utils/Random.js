/**
 * Seeded pseudorandom number generator (Mulberry32).
 * Provides fast, deterministic random numbers for procedural generation.
 */
export class Random {
  constructor(seed = 12345) {
    this.seed = typeof seed === 'string' ? this.hashString(seed) : seed;
    this.state = this.seed >>> 0;
  }

  /**
   * Convert string seed to 32-bit integer.
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash >>> 0;
  }

  /**
   * Returns a float in [0, 1).
   */
  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a float in [min, max).
   */
  range(min, max) {
    return min + (max - min) * this.next();
  }

  /**
   * Returns an integer in [min, max] inclusive.
   */
  integer(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Returns a 2D deterministic sub-seed for specific coordinates.
   */
  fork(offsetX = 0, offsetZ = 0) {
    const combined = (this.seed ^ (offsetX * 73856093) ^ (offsetZ * 19349663)) >>> 0;
    return new Random(combined);
  }
}
