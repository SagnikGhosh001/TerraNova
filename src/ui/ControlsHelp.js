/**
 * ControlsHelp manages the collapsible controls card in the HUD.
 */
export class ControlsHelp {
  constructor() {
    this.toggleBtn = document.getElementById('toggle-controls-btn');
    this.contentEl = document.getElementById('controls-content');
    this.isCollapsed = false;

    if (this.toggleBtn && this.contentEl) {
      this.toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });
    }
  }

  toggle() {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) {
      this.contentEl.classList.add('collapsed');
      this.toggleBtn.textContent = '+';
    } else {
      this.contentEl.classList.remove('collapsed');
      this.toggleBtn.textContent = '_';
    }
  }
}
