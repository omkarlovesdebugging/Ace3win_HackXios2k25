// src/services/PhishingService.js - Background Phishing Detection Service

import { NativeModules, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './api';
import urlCache from './urlCache';

class PhishingService {
  constructor() {
    this.isRunning = false;
    this.threatHistory = [];
    this.scanCount = 0;
    this.lastScanTime = null;
    
    // Trusted domains that should never be flagged as phishing
    this.trustedDomains = [
      'google.com',
      'www.google.com',
      'gmail.com',
      'youtube.com',
      'www.youtube.com',
      'github.com',
      'www.github.com'
    ];
    
    // Trusted full URLs that should never be flagged as phishing
    this.trustedUrls = [
      'https://google.com',
      'https://www.google.com',
      'http://google.com',
      'http://www.google.com'
    ];
  }

  // Start the background service
  async startService() {
    try {
      // Start the native background service
      if (NativeModules.PhishingDetectionService) {
        await NativeModules.PhishingDetectionService.startService();
      }

      // Set up event listeners for URL detection
      this.setupEventListeners();
      
      this.isRunning = true;
      await this.saveServiceState();
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // Stop the background service
  async stopService() {
    try {
      if (NativeModules.PhishingDetectionService) {
        await NativeModules.PhishingDetectionService.stopService();
      }

      this.removeEventListeners();
      this.isRunning = false;
      await this.saveServiceState();
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // Set up event listeners for URL detection
  setupEventListeners() {
    // Listen for URLs detected by accessibility service
    this.urlDetectedListener = DeviceEventEmitter.addListener(
      'URL_DETECTED',
      this.handleURLDetected.bind(this)
    );

    // Listen for browser navigation events
    this.navigationListener = DeviceEventEmitter.addListener(
      'BROWSER_NAVIGATION',
      this.handleBrowserNavigation.bind(this)
    );

    // Listen for threat detection events from background service
    this.threatDetectedListener = DeviceEventEmitter.addListener(
      'THREAT_DETECTED',
      this.handleThreatDetected.bind(this)
    );
  }

  // Remove event listeners
  removeEventListeners() {
    if (this.urlDetectedListener) {
      this.urlDetectedListener.remove();
    }
    if (this.navigationListener) {
      this.navigationListener.remove();
    }
    if (this.threatDetectedListener) {
      this.threatDetectedListener.remove();
    }
  }

  // Check if URL is in trusted domains or URLs
  isTrustedDomain(url) {
    try {
      // First check if the full URL is in trusted URLs list
      if (this.trustedUrls.includes(url.toLowerCase())) {
        return true;
      }
      
      // Then check domain-based matching
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      return this.trustedDomains.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      );
    } catch {
      return false;
    }
  }

  // Handle URL detected from accessibility service
  async handleURLDetected(event) {
    const { url, packageName, timestamp } = event;
    
    if (!url || !this.isValidURL(url)) {
      return;
    }

    // Skip trusted domains and URLs (including https://google.com)
    if (this.isTrustedDomain(url)) {
      return;
    }
    
    // Scan the URL for threats (this will increment scan count)
    await this.scanURLInBackground(url, packageName);
  }

  // Handle browser navigation events
  async handleBrowserNavigation(event) {
    const { url, browserPackage } = event;
    
    if (!url || !this.isValidURL(url)) {
      return;
    }

    // Skip trusted domains and URLs (including https://google.com)
    if (this.isTrustedDomain(url)) {
      return;
    }
    
    // Scan the URL for threats
    await this.scanURLInBackground(url, browserPackage);
  }

  // Handle threat detected from background service
  async handleThreatDetected(event) {
    const { url, result, timestamp } = event;
    
    // Show overlay for the threat
    await this.showThreatOverlay(url, result, 'browser');
    
    // Record the threat
    await this.recordThreat(url, result, 'browser');
  }

  // Scan URL in background and show overlay if threat detected
  async scanURLInBackground(url, sourceApp) {
    try {
      // Check cache first - DON'T increment scan count for cached results
      const cachedResult = urlCache.get(url);
      if (cachedResult) {
        if (cachedResult.prediction === 0) {
          await this.showThreatOverlay(url, cachedResult, sourceApp);
        }
        return;
      }
      
      // Only increment scan count for actual backend calls
      this.scanCount++;
      this.lastScanTime = Date.now();
      
      // Scan with backend
      const result = await apiService.checkURL(url);
      
      // Cache the result
      urlCache.set(url, result);
      
      // If threat detected, show overlay and record
      if (result.prediction === 0) {
        await this.showThreatOverlay(url, result, sourceApp);
        await this.recordThreat(url, result, sourceApp);
      }
      
      await this.saveServiceState();
      
    } catch (error) {
      // Still count failed scans as attempts
      this.scanCount++;
      this.lastScanTime = Date.now();
      await this.saveServiceState();
    }
  }

  // Show threat overlay over other apps
  async showThreatOverlay(url, result, sourceApp) {
    try {
      if (NativeModules.SystemOverlay) {
        await NativeModules.SystemOverlay.showOverlay({
          type: 'THREAT_WARNING',
          data: {
            url,
            result,
            sourceApp,
            timestamp: Date.now(),
          }
        });
      }
    } catch (error) {
      // Silently fail
    }
  }

  // Record threat in history
  async recordThreat(url, result, sourceApp) {
    const threat = {
      url,
      result,
      sourceApp,
      timestamp: Date.now(),
    };

    this.threatHistory.unshift(threat);
    
    // Keep only last 100 threats
    if (this.threatHistory.length > 100) {
      this.threatHistory = this.threatHistory.slice(0, 100);
    }

    await this.saveThreatHistory();
  }

  // Get recent threats
  async getRecentThreats() {
    await this.loadThreatHistory();
    return this.threatHistory;
  }

  // Clear URL cache to force fresh scans
  clearCache() {
    urlCache.clear();
  }

  // Add URL to trusted list
  addTrustedUrl(url) {
    if (!this.trustedUrls.includes(url.toLowerCase())) {
      this.trustedUrls.push(url.toLowerCase());
    }
  }

  // Add domain to trusted list
  addTrustedDomain(domain) {
    if (!this.trustedDomains.includes(domain.toLowerCase())) {
      this.trustedDomains.push(domain.toLowerCase());
    }
  }

  // Get service statistics
  getServiceStats() {
    return {
      isRunning: this.isRunning,
      scanCount: this.scanCount,
      threatCount: this.threatHistory.length,
      lastScanTime: this.lastScanTime,
    };
  }

  // Validate URL format
  isValidURL(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // Save service state to storage
  async saveServiceState() {
    try {
      const state = {
        isRunning: this.isRunning,
        scanCount: this.scanCount,
        lastScanTime: this.lastScanTime,
      };
      await AsyncStorage.setItem('phishing_service_state', JSON.stringify(state));
    } catch (error) {
      // Silently fail
    }
  }

  // Load service state from storage
  async loadServiceState() {
    try {
      const stateJson = await AsyncStorage.getItem('phishing_service_state');
      if (stateJson) {
        const state = JSON.parse(stateJson);
        this.isRunning = state.isRunning || false;
        this.scanCount = state.scanCount || 0;
        this.lastScanTime = state.lastScanTime || null;
      }
    } catch (error) {
      // Silently fail
    }
  }

  // Save threat history to storage
  async saveThreatHistory() {
    try {
      await AsyncStorage.setItem('threat_history', JSON.stringify(this.threatHistory));
    } catch (error) {
      // Silently fail
    }
  }

  // Load threat history from storage
  async loadThreatHistory() {
    try {
      const historyJson = await AsyncStorage.getItem('threat_history');
      if (historyJson) {
        this.threatHistory = JSON.parse(historyJson);
      }
    } catch (error) {
      // Silently fail
    }
  }

  // Initialize service on app start
  async initialize() {
    await this.loadServiceState();
    await this.loadThreatHistory();
    
    // If service was running before, restart it
    if (this.isRunning) {
      try {
        await this.startService();
      } catch (error) {
        // Reset state if restart fails
        this.isRunning = false;
        await this.saveServiceState();
      }
    }
    
    // Set up periodic service check to ensure it stays running
    this.setupServiceWatchdog();
  }

  // Watchdog to ensure service stays running
  setupServiceWatchdog() {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
    }
    
    this.watchdogInterval = setInterval(async () => {
      if (this.isRunning) {
        try {
          // Check if native service is still running
          if (NativeModules.PhishingDetectionService) {
            const isNativeRunning = await NativeModules.PhishingDetectionService.isServiceRunning();
            if (!isNativeRunning) {
              await this.startService();
            }
          }
        } catch (error) {
          // Silently fail
        }
      }
    }, 30000); // Check every 30 seconds
  }
}

export default new PhishingService();