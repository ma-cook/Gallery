// Texture loading queue to prevent too many concurrent texture loads
// This helps maintain smooth camera movement during image loading

class TextureLoadQueue {
  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
    this.baseMaxConcurrent = maxConcurrent;
    this.currentLoading = 0;
    this.queue = [];
    this.loadingItems = new Set();
    this.isPaused = false; // Experimental: pause during rapid camera movement
    this.cameraMoving = false;
    this.pausedQueue = [];
  }

  // Experimental: Notify queue of camera movement state
  setCameraMoving(isMoving) {
    this.cameraMoving = isMoving;
    if (isMoving) {
      // Reduce concurrent loads during camera movement
      this.maxConcurrent = Math.max(1, Math.floor(this.baseMaxConcurrent / 2));
    } else {
      // Restore normal concurrency when camera stops
      this.maxConcurrent = this.baseMaxConcurrent;
      this.processQueue();
    }
  }

  // Experimental: Temporarily pause all texture loading
  pause() {
    this.isPaused = true;
  }

  // Experimental: Resume texture loading
  resume() {
    this.isPaused = false;
    this.processQueue();
  }

  async load(loadFunction, priority = 0) {
    return new Promise((resolve, reject) => {
      this.queue.push({ loadFunction, resolve, reject, priority });
      // Sort by priority (higher priority first)
      this.queue.sort((a, b) => b.priority - a.priority);
      this.processQueue();
    });
  }

  async processQueue() {
    // Don't process if paused
    if (this.isPaused) return;
    
    // Process multiple items in parallel up to maxConcurrent
    while (this.currentLoading < this.maxConcurrent && this.queue.length > 0) {
      const { loadFunction, resolve, reject, priority } = this.queue.shift();
      this.currentLoading++;

      // Process asynchronously
      (async () => {
        try {
          const result = await loadFunction();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.currentLoading--;
          // Process next items in queue
          this.processQueue();
        }
      })();
    }
  }

  setMaxConcurrent(max) {
    this.baseMaxConcurrent = max;
    this.maxConcurrent = max;
    this.processQueue();
  }

  getQueueLength() {
    return this.queue.length;
  }

  isLoading() {
    return this.currentLoading > 0 || this.queue.length > 0;
  }

  clear() {
    this.queue = [];
  }
}

// Global instance with optimized concurrency
export const textureLoadQueue = new TextureLoadQueue(2);
