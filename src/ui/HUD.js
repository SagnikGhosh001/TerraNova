/**
 * HUD handles telemetry updates for coordinates, speed, state badge, compass heading, and FPS.
 */
export class HUD {
  constructor() {
    const hasDoc = typeof document !== 'undefined';
    this.coordsEl = hasDoc ? document.getElementById('hud-coords') : null;
    this.speedEl = hasDoc ? document.getElementById('hud-speed') : null;
    this.statusEl = hasDoc ? document.getElementById('hud-status') : null;
    this.headingEl = hasDoc ? document.getElementById('hud-heading') : null;
    this.biomeEl = hasDoc ? document.getElementById('hud-biome') : null;
    this.chunkEl = hasDoc ? document.getElementById('hud-chunk') : null;
    this.fpsEl = hasDoc ? document.getElementById('hud-fps') : null;

    // Discovery Toast
    this.toastEl = hasDoc ? document.getElementById('discovery-toast') : null;
    this.toastIconEl = hasDoc ? document.getElementById('toast-icon') : null;
    this.toastTitleEl = hasDoc ? document.getElementById('toast-title') : null;
    this._toastTimer = null;
    this.activeToast = null;
    this.toastRemainingTime = 0;

    this.compassDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  }

  showDiscoveryToast(landmark) {
    if (!landmark) return;
    this.activeToast = landmark;
    this.toastRemainingTime = 4.2;

    if (this.toastIconEl) {
      let icon = '📍';
      if (landmark.type === 'cabin') icon = '🏠';
      else if (landmark.type === 'village') icon = '🏘️';
      else if (landmark.type === 'watchtower') icon = '🏰';
      else if (landmark.type === 'shrine') icon = '🏛️';
      else if (landmark.type === 'bridge') icon = '🌉';
      this.toastIconEl.textContent = icon;
    }

    if (this.toastTitleEl) {
      this.toastTitleEl.textContent = landmark.name;
    }

    if (this.toastEl) {
      this.toastEl.classList.add('show');
    }

    if (this._toastTimer) {
      clearTimeout(this._toastTimer);
    }

    this._toastTimer = setTimeout(() => {
      if (this.toastEl) this.toastEl.classList.remove('show');
      this.activeToast = null;
    }, 4200);
  }

  updateToast(deltaTime) {
    if (this.toastRemainingTime > 0) {
      this.toastRemainingTime -= deltaTime;
      if (this.toastRemainingTime <= 0) {
        this.activeToast = null;
        if (this.toastEl) this.toastEl.classList.remove('show');
      }
    }
  }

  update(playerController, fps, worldStats, currentBiome) {
    if (!playerController) return;

    const pos = playerController.player.getPosition();
    const speed = playerController.getSpeed();
    const state = playerController.getState();
    const headingDeg = playerController.getFacingHeading();

    // 1. Coordinates
    if (this.coordsEl) {
      this.coordsEl.textContent = `X: ${pos.x.toFixed(1)}  •  Y: ${pos.y.toFixed(1)}  •  Z: ${pos.z.toFixed(1)}`;
    }

    // 2. Speed
    if (this.speedEl) {
      this.speedEl.textContent = `${speed.toFixed(1)} m/s`;
    }

    // 3. Status Badge
    if (this.statusEl) {
      this.statusEl.textContent = state.toUpperCase().replace('-', ' ');
      this.statusEl.className = `badge ${state}`;
    }

    // 4. Heading
    if (this.headingEl) {
      const idx = Math.round(headingDeg / 45) % 8;
      const dir = this.compassDirections[idx];
      this.headingEl.textContent = `${headingDeg}° (${dir})`;
    }

    // 5. Biome
    if (this.biomeEl && currentBiome) {
      this.biomeEl.textContent = currentBiome.toUpperCase();
    }

    // 6. Chunk Stats
    if (this.chunkEl && worldStats) {
      const genIndicator = worldStats.isGenerating ? ' • GEN…' : '';
      this.chunkEl.textContent = `[${worldStats.cx}, ${worldStats.cz}] • ${worldStats.activeChunks} CHUNKS${genIndicator}`;
    }

    // 7. FPS
    if (this.fpsEl && fps !== undefined) {
      this.fpsEl.textContent = fps;
    }
  }
}
