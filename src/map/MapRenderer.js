import { WorldConfig } from '../world/WorldConfig.js';
import { BiomeType } from '../world/BiomeSystem.js';

/**
 * MapRenderer draws terrain contours, water features, discovered landmarks,
 * fog of war, and player position onto a 2D HTML5 canvas.
 */
export class MapRenderer {
  constructor(terrainGenerator, fogOfWar, discoverySystem) {
    this.terrainGenerator = terrainGenerator;
    this.fogOfWar = fogOfWar;
    this.discoverySystem = discoverySystem;

    // Palette
    this.colors = {
      water: '#0284c7',
      waterShallow: '#38bdf8',
      beach: '#caba86',
      plains: '#569642',
      forest: '#2d6a26',
      rock: '#606975',
      snow: '#e2e8f0',
      grid: 'rgba(255, 255, 255, 0.06)',
      gridText: 'rgba(255, 255, 255, 0.25)',
      player: '#38bdf8',
      spawn: '#f59e0b',
    };
  }

  /**
   * Main render method.
   */
  render(canvas, ctx, viewCenterX, viewCenterZ, scale, playerPos, playerHeading) {
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Terrain & Water
    this._renderTerrainAndWater(ctx, viewCenterX, viewCenterZ, scale, width, height);

    // 2. Draw Coordinate Grid
    this._renderGrid(ctx, viewCenterX, viewCenterZ, scale, width, height);

    // 3. Apply Fog of War Mask
    this.fogOfWar.render(ctx, viewCenterX, viewCenterZ, scale, width, height, playerPos);

    // 4. Draw Starting Location Waypoint (always visible once discovered/started)
    this._renderSpawnMarker(ctx, viewCenterX, viewCenterZ, scale, width, height);

    // 5. Draw Discovered Landmarks (Only revealed landmarks)
    this._renderDiscoveredLandmarks(ctx, viewCenterX, viewCenterZ, scale, width, height);

    // 6. Draw Player Marker & Direction Heading
    if (playerPos) {
      this._renderPlayerMarker(ctx, viewCenterX, viewCenterZ, scale, width, height, playerPos, playerHeading);
    }
  }

  _renderTerrainAndWater(ctx, viewX, viewZ, scale, width, height) {
    // Dynamic sampling step based on zoom level (meters per pixel)
    const step = Math.max(4, Math.floor(8 / scale));

    const halfW = (width * 0.5) / scale;
    const halfH = (height * 0.5) / scale;

    const minX = Math.floor((viewX - halfW) / step) * step;
    const maxX = Math.ceil((viewX + halfW) / step) * step;
    const minZ = Math.floor((viewZ - halfH) / step) * step;
    const maxZ = Math.ceil((viewZ + halfH) / step) * step;

    const pixelStep = step * scale;

    for (let wz = minZ; wz <= maxZ; wz += step) {
      const sy = Math.floor(height * 0.5 + (wz - viewZ) * scale);

      for (let wx = minX; wx <= maxX; wx += step) {
        const sx = Math.floor(width * 0.5 + (wx - viewX) * scale);

        const h = this.terrainGenerator.getHeight(wx, wz);
        const riverFactor = this.terrainGenerator.getRiverFactor(wx, wz);

        let color = this.colors.plains;

        // Water check
        if (h < WorldConfig.waterLevel || riverFactor > 0.35) {
          color = riverFactor > 0.5 ? this.colors.water : this.colors.waterShallow;
        } else {
          // Biome & elevation check
          const biome = this.terrainGenerator.biomeSystem.getBiome(wx, wz, h);
          if (biome === BiomeType.BEACH) {
            color = this.colors.beach;
          } else if (biome === BiomeType.FOREST) {
            color = this.colors.forest;
          } else if (biome === BiomeType.MOUNTAIN || h > 16.0) {
            color = h > 22.0 ? this.colors.snow : this.colors.rock;
          }
        }

        ctx.fillStyle = color;
        ctx.fillRect(sx, sy, Math.ceil(pixelStep + 1), Math.ceil(pixelStep + 1));
      }
    }
  }

  _renderGrid(ctx, viewX, viewZ, scale, width, height) {
    const gridStep = WorldConfig.chunkSize; // 64m chunk grid lines
    const halfW = (width * 0.5) / scale;
    const halfH = (height * 0.5) / scale;

    const minX = Math.floor((viewX - halfW) / gridStep) * gridStep;
    const maxX = Math.ceil((viewX + halfW) / gridStep) * gridStep;
    const minZ = Math.floor((viewZ - halfH) / gridStep) * gridStep;
    const maxZ = Math.ceil((viewZ + halfH) / gridStep) * gridStep;

    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 1;
    ctx.fillStyle = this.colors.gridText;
    ctx.font = '10px monospace';

    // Vertical grid lines (constant X)
    for (let x = minX; x <= maxX; x += gridStep) {
      const sx = width * 0.5 + (x - viewX) * scale;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
      ctx.stroke();

      if (scale > 0.6) {
        ctx.fillText(`${x}`, sx + 4, 14);
      }
    }

    // Horizontal grid lines (constant Z)
    for (let z = minZ; z <= maxZ; z += gridStep) {
      const sy = height * 0.5 + (z - viewZ) * scale;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
      ctx.stroke();

      if (scale > 0.6) {
        ctx.fillText(`${z}`, 6, sy - 4);
      }
    }
  }

  _renderSpawnMarker(ctx, viewX, viewZ, scale, width, height) {
    const sx = width * 0.5 + (WorldConfig.spawnX - viewX) * scale;
    const sy = height * 0.5 + (WorldConfig.spawnZ - viewZ) * scale;

    // Outer star glow
    ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.beginPath();
    ctx.arc(sx, sy, 14, 0, Math.PI * 2);
    ctx.fill();

    // Star icon
    ctx.fillStyle = this.colors.spawn;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Label
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Spawn Outpost', sx, sy - 10);
  }

  _renderDiscoveredLandmarks(ctx, viewX, viewZ, scale, width, height) {
    const landmarks = this.discoverySystem.getDiscoveredLandmarks();

    for (const lm of landmarks) {
      const sx = width * 0.5 + (lm.x - viewX) * scale;
      const sy = height * 0.5 + (lm.z - viewZ) * scale;

      // Don't draw if outside visible screen
      if (sx < -40 || sx > width + 40 || sy < -40 || sy > height + 40) {
        continue;
      }

      // Icon badge styling
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Icon symbol
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let symbol = '📍';
      if (lm.type === 'cabin') symbol = '🏠';
      else if (lm.type === 'village') symbol = '🏘️';
      else if (lm.type === 'watchtower') symbol = '🏰';
      else if (lm.type === 'bridge') symbol = '🌉';
      else if (lm.type === 'shrine') symbol = '🏛️';

      ctx.fillText(symbol, sx, sy);

      // Label pill
      ctx.font = '10px Outfit, sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.textBaseline = 'bottom';
      ctx.fillText(lm.name, sx, sy - 14);

      ctx.restore();
    }
  }

  _renderPlayerMarker(ctx, viewX, viewZ, scale, width, height, playerPos, playerHeading) {
    const sx = width * 0.5 + (playerPos.x - viewX) * scale;
    const sy = height * 0.5 + (playerPos.z - viewZ) * scale;

    // Pulse ring
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.beginPath();
    ctx.arc(sx, sy, 16, 0, Math.PI * 2);
    ctx.fill();

    // Directional Player Arrow
    ctx.save();
    ctx.translate(sx, sy);
    // Heading in radians (playerHeading is in degrees clockwise from North = -Z)
    const headingRad = (playerHeading * Math.PI) / 180;
    ctx.rotate(headingRad);

    ctx.fillStyle = this.colors.player;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -10); // Nose pointing forward
    ctx.lineTo(7, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-7, 8);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
