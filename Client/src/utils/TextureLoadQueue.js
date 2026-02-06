// Texture loading queue to prevent too many concurrent texture loads
// This helps maintain smooth camera movement during image loading

class TextureLoadQueue {
  constructor(maxConcurrent = 2, movingConcurrent = null) {
    this.maxConcurrent = maxConcurrent;
    this.baseMaxConcurrent = maxConcurrent;
    // Allow different concurrency during movement (defaults to 1 if not specified)
    this.movingConcurrent = movingConcurrent !== null ? movingConcurrent : 1;
    this.currentLoading = 0;
    this.queue = [];
    this.loadingItems = new Set();
    this.isPaused = false;
    this.cameraMoving = false;
    this.pausedQueue = [];
    this.isProcessing = false; // Prevent concurrent processQueue calls
    this.needsReprocess = false; // Flag to indicate another processQueue is needed
  }

  // Notify queue of camera movement state
  setCameraMoving(isMoving) {
    const wasMoving = this.cameraMoving;
    this.cameraMoving = isMoving;
    
    if (isMoving && !wasMoving) {
      // Camera started moving - reduce concurrent loads
      this.maxConcurrent = this.movingConcurrent;
      // Trigger processQueue to handle any state changes
      this.processQueue();
    } else if (!isMoving && wasMoving) {
      // Camera stopped - restore normal concurrency
      this.maxConcurrent = this.baseMaxConcurrent;
      // Process any queued loads immediately
      this.processQueue();
    }
  }

  // Temporarily pause all texture loading
  pause() {
    this.isPaused = true;
  }

  // Resume texture loading
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
      
      // Safety mechanism: if queue has items but nothing is loading after a delay,
      // trigger processQueue again (handles edge cases where queue gets stuck)
      setTimeout(() => {
        if (this.queue.length > 0 && this.currentLoading === 0 && !this.isPaused) {
          console.warn('TextureLoadQueue watchdog: restarting stalled queue');
          this.processQueue();
        }
      }, 1000);
    });
  }

  async processQueue() {
    // Prevent concurrent processQueue calls - if already processing, mark for reprocess
    if (this.isProcessing) {
      this.needsReprocess = true;
      return;
    }
    
    this.isProcessing = true;
    this.needsReprocess = false;
    
    try {
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
    } finally {
      this.isProcessing = false;
      
      // If another processQueue was requested while we were processing, run it now
      if (this.needsReprocess) {
        // Use setImmediate or setTimeout to avoid deep recursion
        setTimeout(() => this.processQueue(), 0);
      }
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

// Global instance for medium/high quality textures with optimized concurrency
// Throttles to 1 concurrent during camera movement to prevent jerkiness
export const textureLoadQueue = new TextureLoadQueue(4, 1);

// Separate queue for thumbnails with higher concurrency (thumbnails are small - 256px)
// Allows 4 concurrent even during movement since thumbnails load quickly
// This prevents jerky camera movement while still loading images progressively
export const thumbnailLoadQueue = new TextureLoadQueue(8, 4);
