/**
 * FogOfWar manages the visual shroud over unexplored territory on the world map.
 * Explored territory is clearly revealed with soft feathered edges, while unexplored
 * areas remain obscured in an uncharted stylized dark veil.
 */
export class FogOfWar {
  constructor(discoverySystem) {
    this.discoverySystem = discoverySystem;

    // Offscreen mask canvas for smooth alpha blending
    if (typeof document !== 'undefined' && document.createElement) {
      this.maskCanvas = document.createElement('canvas');
      this.maskCtx = this.maskCanvas.getContext('2d');
    } else {
      this.maskCanvas = { width: 0, height: 0 };
      this.maskCtx = null;
    }
  }

  /**
   * Render fog of war over map canvas:
   * Obscures unexplored cells and softly reveals discovered cells.
   */
  render(ctx, viewCenterX, viewCenterZ, scale, width, height, playerPos) {
    const cellSize = this.discoverySystem.cellSize;

    // View boundaries in world space
    const halfW = (width * 0.5) / scale;
    const halfH = (height * 0.5) / scale;

    const minX = viewCenterX - halfW;
    const maxX = viewCenterX + halfW;
    const minZ = viewCenterZ - halfH;
    const maxZ = viewCenterZ + halfH;

    const minCellX = Math.floor(minX / cellSize);
    const maxCellX = Math.ceil(maxX / cellSize);
    const minCellZ = Math.floor(minZ / cellSize);
    const maxCellZ = Math.ceil(maxZ / cellSize);

    // Resize mask canvas if dimensions changed
    if (this.maskCanvas.width !== width || this.maskCanvas.height !== height) {
      this.maskCanvas.width = width;
      this.maskCanvas.height = height;
    }

    const mCtx = this.maskCtx;

    // 1. Fill mask with solid dark uncharted fog
    mCtx.globalCompositeOperation = 'source-over';
    mCtx.fillStyle = '#0c111a';
    mCtx.fillRect(0, 0, width, height);

    // 2. Punch out / reveal discovered cells using 'destination-out'
    mCtx.globalCompositeOperation = 'destination-out';

    const cellPixelSize = cellSize * scale;

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        if (this.discoverySystem.isCellDiscovered(cx, cz)) {
          const worldX = cx * cellSize;
          const worldZ = cz * cellSize;

          const screenX = width * 0.5 + (worldX - viewCenterX) * scale;
          const screenY = height * 0.5 + (worldZ - viewCenterZ) * scale;

          // Slightly expand cell drawing by 1px to prevent subpixel hairline gaps
          mCtx.fillStyle = 'rgba(0, 0, 0, 1.0)';
          mCtx.fillRect(
            Math.floor(screenX),
            Math.floor(screenY),
            Math.ceil(cellPixelSize + 1),
            Math.ceil(cellPixelSize + 1)
          );
        }
      }
    }

    // 3. Add soft glowing sight circle around player currently active position
    if (playerPos) {
      const playerScreenX = width * 0.5 + (playerPos.x - viewCenterX) * scale;
      const playerScreenY = height * 0.5 + (playerPos.z - viewCenterZ) * scale;
      const radiusPixels = this.discoverySystem.discoveryRadius * scale;

      const radialGrad = mCtx.createRadialGradient(
        playerScreenX,
        playerScreenY,
        radiusPixels * 0.7,
        playerScreenX,
        playerScreenY,
        radiusPixels
      );
      radialGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
      radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

      mCtx.fillStyle = radialGrad;
      mCtx.beginPath();
      mCtx.arc(playerScreenX, playerScreenY, radiusPixels, 0, Math.PI * 2);
      mCtx.fill();
    }

    // 4. Draw the mask back onto the main map canvas
    ctx.drawImage(this.maskCanvas, 0, 0);

    // Reset composite operation
    mCtx.globalCompositeOperation = 'source-over';
  }
}
