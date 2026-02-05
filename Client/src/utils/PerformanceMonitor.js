// Experimental: Performance monitoring and adaptive quality system
// Monitors frame times and adjusts render quality dynamically

class PerformanceMonitor {
  constructor() {
    this.frameTimes = [];
    this.maxSamples = 60; // Sample last 60 frames
    this.targetFPS = 60;
    this.targetFrameTime = 1000 / this.targetFPS;
    this.qualityLevel = 1.0; // 1.0 = full quality, 0.5 = half quality
    this.listeners = new Set();
  }

  recordFrame(delta) {
    const frameTime = delta * 1000; // Convert to milliseconds
    this.frameTimes.push(frameTime);
    
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }

    // Update quality every 30 frames
    if (this.frameTimes.length === this.maxSamples) {
      this.updateQuality();
    }
  }

  updateQuality() {
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const currentFPS = 1000 / avgFrameTime;
    
    // Experimental: Adjust quality based on performance
    if (currentFPS < 50) {
      // Performance is poor, reduce quality
      this.qualityLevel = Math.max(0.5, this.qualityLevel - 0.1);
      this.notifyListeners();
    } else if (currentFPS > 58 && this.qualityLevel < 1.0) {
      // Performance is good, restore quality
      this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.05);
      this.notifyListeners();
    }
  }

  getQualityLevel() {
    return this.qualityLevel;
  }

  getAverageFPS() {
    if (this.frameTimes.length === 0) return 60;
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return 1000 / avgFrameTime;
  }

  onQualityChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.qualityLevel));
  }

  reset() {
    this.frameTimes = [];
    this.qualityLevel = 1.0;
  }
}

export const performanceMonitor = new PerformanceMonitor();
