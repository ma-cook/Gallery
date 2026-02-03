// Texture loading queue to prevent too many concurrent texture loads
// This helps maintain smooth camera movement during image loading

class TextureLoadQueue {
  constructor(maxConcurrent = 3) { // Increased from 2 to 3 for better balance
    this.maxConcurrent = maxConcurrent;
    this.currentLoading = 0;
    this.queue = [];
    this.loadingItems = new Set();
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
export const textureLoadQueue = new TextureLoadQueue(3);
