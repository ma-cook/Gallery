/**
 * IndexedDB-based image cache to reduce bandwidth usage
 * Stores downloaded images locally to avoid re-downloading
 */

const DB_NAME = 'GalleryImageCache';
const STORE_NAME = 'images';
const DB_VERSION = 2; // Increment to force cache clear on structure change
const CACHE_EXPIRY_DAYS = 30; // Cache images for 30 days
const CACHE_VERSION_KEY = 'cacheVersion';
const CURRENT_CACHE_VERSION = '2.0'; // Increment this to force cache clear

class ImageCache {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        this.db = request.result;
        
        // Check cache version and clear if outdated
        await this.checkAndClearOldCache();
        
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Clear old stores if they exist
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }
        
        // Create fresh store
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      };
    });
  }

  async checkAndClearOldCache() {
    try {
      const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
      if (storedVersion !== CURRENT_CACHE_VERSION) {
        console.log('Cache version mismatch. Clearing old cache...');
        await this.clear();
        localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
      }
    } catch (error) {
      console.error('Error checking cache version:', error);
    }
  }

  async ensureInit() {
    if (!this.db) {
      await this.initPromise;
    }
  }

  /**
   * Get cached image blob URL
   * @param {string} url - Original image URL
   * @returns {Promise<string|null>} Blob URL or null if not cached
   */
  async get(url) {
    try {
      await this.ensureInit();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(url);

        request.onsuccess = () => {
          const result = request.result;
          
          if (!result) {
            resolve(null);
            return;
          }

          // Check if cache entry has expired
          const expiryTime = result.timestamp + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
          if (Date.now() > expiryTime) {
            // Expired, delete it
            this.delete(url);
            resolve(null);
            return;
          }

          // Create blob URL from cached data
          // IMPORTANT: Caller must revoke this URL when done with URL.revokeObjectURL()
          const blobUrl = URL.createObjectURL(result.blob);
          resolve(blobUrl);
        };

        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  /**
   * Store image in cache
   * @param {string} url - Original image URL
   * @param {Blob} blob - Image blob data
   * @returns {Promise<boolean>} Success status
   */
  async set(url, blob) {
    try {
      await this.ensureInit();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const cacheEntry = {
          url,
          blob,
          timestamp: Date.now(),
          size: blob.size
        };

        const request = store.put(cacheEntry);

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    } catch (error) {
      console.error('Error setting cache:', error);
      return false;
    }
  }

  /**
   * Delete cached image
   * @param {string} url - Image URL to delete
   */
  async delete(url) {
    try {
      await this.ensureInit();

      return new Promise((resolve) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(url);

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    } catch (error) {
      console.error('Error deleting from cache:', error);
      return false;
    }
  }

  /**
   * Clear all cached images
   */
  async clear() {
    try {
      await this.ensureInit();

      return new Promise((resolve) => {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('Image cache cleared successfully');
          resolve(true);
        };
        request.onerror = () => resolve(false);
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }

  /**
   * Force clear cache and reset version (useful for debugging)
   */
  async forceReset() {
    await this.clear();
    localStorage.removeItem(CACHE_VERSION_KEY);
    console.log('Cache force reset complete');
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      await this.ensureInit();

      return new Promise((resolve) => {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const entries = request.result;
          const totalSize = entries.reduce((sum, entry) => sum + (entry.size || 0), 0);
          
          resolve({
            count: entries.length,
            totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
          });
        };

        request.onerror = () => resolve({ count: 0, totalSize: 0, totalSizeMB: 0 });
      });
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { count: 0, totalSize: 0, totalSizeMB: 0 };
    }
  }

  /**
   * Load image with caching
   * @param {string} url - Image URL to load
   * @returns {Promise<string>} Blob URL (either from cache or newly downloaded)
   * IMPORTANT: Caller MUST revoke the returned blob URL with URL.revokeObjectURL() when done
   */
  async loadImage(url) {
    // Validate URL
    if (!url) {
      throw new Error('Invalid URL provided');
    }

    // Try to get from cache first
    const cachedUrl = await this.get(url);
    if (cachedUrl) {
      return cachedUrl; // Returns blob URL - caller must revoke it
    }

    // Not in cache, fetch it
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        throw error;
      }

      const blob = await response.blob();
      
      // Store in cache (don't await, let it happen in background)
      this.set(url, blob);

      // Return blob URL
      return URL.createObjectURL(blob);
    } catch (error) {
      // Only log non-404 errors to avoid spam when images don't exist
      if (!error.status || error.status !== 404) {
        console.error('Error loading image:', error);
      }
      throw error;
    }
  }
}

// Export singleton instance
export const imageCache = new ImageCache();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.clearImageCache = () => imageCache.forceReset();
  console.log('To clear image cache, run: clearImageCache()');
}

