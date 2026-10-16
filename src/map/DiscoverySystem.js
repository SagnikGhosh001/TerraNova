/**
 * DiscoverySystem tracks explored cells, fog of war visibility,
 * and discovered points of interest / landmarks.
 */
export class DiscoverySystem {
  constructor(cellSize = 8.0, discoveryRadius = 52.0) {
    this.cellSize = cellSize;
    this.discoveryRadius = discoveryRadius;

    // Set of explored cell keys: 'cx,cz'
    this.discoveredCells = new Set();

    // Registered landmarks in the world: id -> { id, type, name, x, z, icon }
    this.registeredLandmarks = new Map();

    // Discovered landmarks: id -> { id, type, name, x, z, icon }
    this.discoveredLandmarks = new Map();

    this.lastPlayerCellX = null;
    this.lastPlayerCellZ = null;
  }

  /**
   * Register a point of interest or landmark so it can be revealed upon discovery.
   */
  registerLandmark(landmark) {
    if (!landmark || !landmark.id) return;
    this.registeredLandmarks.set(landmark.id, landmark);
  }

  /**
   * Update exploration around player position (playerX, playerZ).
   * Returns { hasNewDiscoveries, newLandmarks }
   */
  update(playerX, playerZ) {
    const cellX = Math.floor(playerX / this.cellSize);
    const cellZ = Math.floor(playerZ / this.cellSize);

    let hasNewCells = false;
    const newLandmarks = [];

    // Cell radius to check
    const cellRadius = Math.ceil(this.discoveryRadius / this.cellSize);
    const radiusSq = this.discoveryRadius * this.discoveryRadius;

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        const cx = cellX + dx;
        const cz = cellZ + dz;

        // World coordinates of cell center
        const cellWorldX = (cx + 0.5) * this.cellSize;
        const cellWorldZ = (cz + 0.5) * this.cellSize;

        const distSq = (cellWorldX - playerX) ** 2 + (cellWorldZ - playerZ) ** 2;
        if (distSq <= radiusSq) {
          const key = `${cx},${cz}`;
          if (!this.discoveredCells.has(key)) {
            this.discoveredCells.add(key);
            hasNewCells = true;
          }
        }
      }
    }

    // Check for landmark discoveries within exploration radius
    for (const [id, landmark] of this.registeredLandmarks.entries()) {
      if (!this.discoveredLandmarks.has(id)) {
        const distSq = (landmark.x - playerX) ** 2 + (landmark.z - playerZ) ** 2;
        if (distSq <= (this.discoveryRadius + 12) ** 2) {
          this.discoveredLandmarks.set(id, landmark);
          newLandmarks.push(landmark);
        }
      }
    }

    return {
      hasNewDiscoveries: hasNewCells || newLandmarks.length > 0,
      newLandmarks,
    };
  }

  isCellDiscovered(cx, cz) {
    return this.discoveredCells.has(`${cx},${cz}`);
  }

  isWorldDiscovered(worldX, worldZ) {
    const cx = Math.floor(worldX / this.cellSize);
    const cz = Math.floor(worldZ / this.cellSize);
    return this.isCellDiscovered(cx, cz);
  }

  getDiscoveredCount() {
    return this.discoveredCells.size;
  }

  getDiscoveredLandmarks() {
    return Array.from(this.discoveredLandmarks.values());
  }

  reset() {
    this.discoveredCells.clear();
    this.discoveredLandmarks.clear();
  }
}
