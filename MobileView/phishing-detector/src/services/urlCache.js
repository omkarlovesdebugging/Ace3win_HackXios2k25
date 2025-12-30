// src/services/urlCache.js

import { CACHE_CONFIG } from '../constants/config';

const { EXPIRY_MS, MAX_SIZE } = CACHE_CONFIG;

class URLCache {
  constructor() {
    this.cache = new Map();
    this.accessOrder = [];
  }

  get(url) {
    const normalizedURL = this.normalizeURL(url);
    const entry = this.cache.get(normalizedURL);

    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > EXPIRY_MS;
    
    if (isExpired) {
      this.cache.delete(normalizedURL);
      this.removeFromAccessOrder(normalizedURL);
      return null;
    }

    this.updateAccessOrder(normalizedURL);
    return entry.result;
  }

  set(url, result) {
    const normalizedURL = this.normalizeURL(url);

    if (this.cache.size >= MAX_SIZE && !this.cache.has(normalizedURL)) {
      this.evictOldest();
    }

    this.cache.set(normalizedURL, {
      result,
      timestamp: Date.now(),
    });

    this.updateAccessOrder(normalizedURL);
  }

  normalizeURL(url) {
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      parsed.search = '';
      return parsed.toString().toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  updateAccessOrder(url) {
    this.removeFromAccessOrder(url);
    this.accessOrder.push(url);
  }

  removeFromAccessOrder(url) {
    const index = this.accessOrder.indexOf(url);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  evictOldest() {
    if (this.accessOrder.length === 0) return;
    
    const oldest = this.accessOrder.shift();
    this.cache.delete(oldest);
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: MAX_SIZE,
      expiryMs: EXPIRY_MS,
      hitRate: this.calculateHitRate(),
    };
  }

  calculateHitRate() {
    // This would need to be tracked separately in a real implementation
    return 0;
  }

  // Remove expired entries
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > EXPIRY_MS) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    });
  }
}

export default new URLCache();