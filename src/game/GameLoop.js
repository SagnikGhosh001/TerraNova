/**
 * GameLoop coordinates frame updates, calculates delta time, and measures FPS.
 */
export class GameLoop {
  constructor() {
    this.isRunning = false;
    this.lastTime = 0;
    this.maxDelta = 0.1; // clamp to 100ms to avoid physics exploding after tab switch
    this.updateCallbacks = [];
    this.renderCallbacks = [];

    // FPS calculation
    this.fps = 60;
    this.framesCount = 0;
    this.fpsTimer = 0;

    this._loop = this._loop.bind(this);
  }

  /**
   * Register a callback for simulation/logic updates: fn(deltaTime, elapsedTime)
   */
  onUpdate(callback) {
    this.updateCallbacks.push(callback);
    return () => {
      this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Register a callback for rendering: fn(deltaTime, elapsedTime)
   */
  onRender(callback) {
    this.renderCallbacks.push(callback);
    return () => {
      this.renderCallbacks = this.renderCallbacks.filter(cb => cb !== callback);
    };
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.framesCount = 0;
    this.fpsTimer = this.lastTime;
    requestAnimationFrame(this._loop);
  }

  stop() {
    this.isRunning = false;
  }

  _loop(currentTime) {
    if (!this.isRunning) return;

    let delta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Guard against huge spikes (e.g. background tab or frame hitch)
    if (delta > this.maxDelta) {
      delta = this.maxDelta;
    }

    // FPS tracking
    this.framesCount++;
    if (currentTime - this.fpsTimer >= 500) {
      this.fps = Math.round((this.framesCount * 1000) / (currentTime - this.fpsTimer));
      this.framesCount = 0;
      this.fpsTimer = currentTime;
    }

    const elapsed = currentTime / 1000;

    // Run logic updates
    for (let i = 0; i < this.updateCallbacks.length; i++) {
      this.updateCallbacks[i](delta, elapsed);
    }

    // Run render updates
    for (let i = 0; i < this.renderCallbacks.length; i++) {
      this.renderCallbacks[i](delta, elapsed);
    }

    requestAnimationFrame(this._loop);
  }

  getFPS() {
    return this.fps;
  }
}
