/**
 * MapInterface coordinates the modal UI, toolbar buttons,
 * and keyboard toggles (M key / Esc) for the World Map.
 */
export class MapInterface {
  constructor(worldMap, onOpenChange) {
    this.worldMap = worldMap;
    this.onOpenChange = onOpenChange;

    this.isOpen = false;

    // DOM Elements
    this.modalEl = document.getElementById('map-modal');
    this.canvasEl = document.getElementById('map-canvas');
    this.closeBtn = document.getElementById('map-close-btn');
    this.zoomInBtn = document.getElementById('map-zoom-in');
    this.zoomOutBtn = document.getElementById('map-zoom-out');
    this.recenterBtn = document.getElementById('map-recenter');
    this.statsEl = document.getElementById('map-stats');

    this._bindEvents();
    this._handleResize();
  }

  _bindEvents() {
    // Keyboard Toggle (M key)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        this.toggle(this._lastPlayerPos);
      } else if (e.code === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    }

    if (this.zoomInBtn) {
      this.zoomInBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.worldMap.zoom(1.25);
      });
    }

    if (this.zoomOutBtn) {
      this.zoomOutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.worldMap.zoom(0.8);
      });
    }

    if (this.recenterBtn) {
      this.recenterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this._lastPlayerPos) {
          this.worldMap.recenter(this._lastPlayerPos);
        }
      });
    }

    window.addEventListener('resize', () => this._handleResize());
  }

  _handleResize() {
    if (!this.canvasEl) return;
    const rect = this.canvasEl.getBoundingClientRect();
    const w = Math.floor(rect.width || window.innerWidth * 0.85);
    const h = Math.floor(rect.height || window.innerHeight * 0.8);
    this.worldMap.resize(w, h);
  }

  open(playerPos) {
    this.isOpen = true;
    if (this.modalEl) {
      this.modalEl.classList.add('visible');
    }
    this._handleResize();
    if (playerPos) {
      this.worldMap.recenter(playerPos);
    }
    if (this.onOpenChange) {
      this.onOpenChange(true);
    }
  }

  close() {
    this.isOpen = false;
    if (this.modalEl) {
      this.modalEl.classList.remove('visible');
    }
    if (this.onOpenChange) {
      this.onOpenChange(false);
    }
  }

  toggle(playerPos) {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(playerPos);
    }
  }

  update(playerPos, playerHeading) {
    this._lastPlayerPos = playerPos;

    // Continuous fog-of-war discovery update
    const discoveryResult = this.worldMap.updateExploration(playerPos);
    if (discoveryResult && discoveryResult.newLandmarks && discoveryResult.newLandmarks.length > 0) {
      for (const lm of discoveryResult.newLandmarks) {
        if (this.onNewDiscovery) {
          this.onNewDiscovery(lm);
        }
      }
    }

    // Update stats pill
    if (this.statsEl) {
      const cells = this.worldMap.discoverySystem.getDiscoveredCount();
      const lms = this.worldMap.discoverySystem.getDiscoveredLandmarks().length;
      this.statsEl.textContent = `${cells * 64} m² Explored • ${lms} Landmarks`;
    }

    // Render if map is currently open
    if (this.isOpen) {
      this.worldMap.render(playerPos, playerHeading);
    }
  }
}
