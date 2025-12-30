// src/hooks/useServiceStatus.js - Service Status Management Hook

import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import PhishingService from '../services/PhishingService';

export const useServiceStatus = () => {
  const [isServiceRunning, setIsServiceRunning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(null);
  const [totalScans, setTotalScans] = useState(0);
  const [threatCount, setThreatCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize service status
  useEffect(() => {
    initializeServiceStatus();
    setupEventListeners();
    
    return () => {
      removeEventListeners();
    };
  }, []);

  // Initialize service status from storage
  const initializeServiceStatus = async () => {
    try {
      await PhishingService.initialize();
      const stats = PhishingService.getServiceStats();
      
      setIsServiceRunning(stats.isRunning);
      setTotalScans(stats.scanCount);
      setThreatCount(stats.threatCount);
      setLastScanTime(stats.lastScanTime);
    } catch (error) {
      console.error('Failed to initialize service status:', error);
    }
  };

  // Set up event listeners for service updates
  const setupEventListeners = () => {
    // Listen for service status changes
    DeviceEventEmitter.addListener('SERVICE_STATUS_CHANGED', (status) => {
      setIsServiceRunning(status.isRunning);
    });

    // Listen for scan completion
    DeviceEventEmitter.addListener('URL_SCAN_COMPLETED', (scanData) => {
      setTotalScans(prev => prev + 1);
      setLastScanTime(scanData.timestamp);
      
      if (scanData.result.prediction === 0) {
        setThreatCount(prev => prev + 1);
      }
    });

    // Listen for threat detection
    DeviceEventEmitter.addListener('THREAT_DETECTED', (threatData) => {
      setThreatCount(prev => prev + 1);
    });
  };

  // Remove event listeners
  const removeEventListeners = () => {
    DeviceEventEmitter.removeAllListeners('SERVICE_STATUS_CHANGED');
    DeviceEventEmitter.removeAllListeners('URL_SCAN_COMPLETED');
    DeviceEventEmitter.removeAllListeners('THREAT_DETECTED');
  };

  // Start the phishing detection service
  const startService = useCallback(async () => {
    setIsLoading(true);
    try {
      const success = await PhishingService.startService();
      if (success) {
        setIsServiceRunning(true);
        
        // Emit status change event
        DeviceEventEmitter.emit('SERVICE_STATUS_CHANGED', { isRunning: true });
      }
      return success;
    } catch (error) {
      console.error('Failed to start service:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Stop the phishing detection service
  const stopService = useCallback(async () => {
    setIsLoading(true);
    try {
      const success = await PhishingService.stopService();
      if (success) {
        setIsServiceRunning(false);
        
        // Emit status change event
        DeviceEventEmitter.emit('SERVICE_STATUS_CHANGED', { isRunning: false });
      }
      return success;
    } catch (error) {
      console.error('Failed to stop service:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh service statistics
  const refreshStats = useCallback(async () => {
    try {
      const stats = PhishingService.getServiceStats();
      const threats = await PhishingService.getRecentThreats();
      
      setIsServiceRunning(stats.isRunning);
      setTotalScans(stats.scanCount);
      setThreatCount(threats.length);
      setLastScanTime(stats.lastScanTime);
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  }, []);

  // Get detailed service information
  const getServiceInfo = useCallback(() => {
    return {
      isRunning: isServiceRunning,
      lastScanTime,
      totalScans,
      threatCount,
      isLoading,
      uptime: isServiceRunning && lastScanTime ? Date.now() - lastScanTime : 0,
    };
  }, [isServiceRunning, lastScanTime, totalScans, threatCount, isLoading]);

  // Check if service is healthy
  const isServiceHealthy = useCallback(() => {
    if (!isServiceRunning) return false;
    
    // Service is considered healthy if it has scanned recently (within last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return lastScanTime && lastScanTime > oneHourAgo;
  }, [isServiceRunning, lastScanTime]);

  // Get service status text for UI
  const getStatusText = useCallback(() => {
    if (isLoading) return 'Loading...';
    if (!isServiceRunning) return 'Stopped';
    if (isServiceHealthy()) return 'Active';
    return 'Idle';
  }, [isLoading, isServiceRunning, isServiceHealthy]);

  // Get status color for UI
  const getStatusColor = useCallback(() => {
    if (isLoading) return '#F39C12';
    if (!isServiceRunning) return '#E74C3C';
    if (isServiceHealthy()) return '#27AE60';
    return '#F39C12';
  }, [isLoading, isServiceRunning, isServiceHealthy]);

  return {
    // Status
    isServiceRunning,
    isLoading,
    lastScanTime,
    totalScans,
    threatCount,
    
    // Actions
    startService,
    stopService,
    refreshStats,
    
    // Computed values
    getServiceInfo,
    isServiceHealthy: isServiceHealthy(),
    statusText: getStatusText(),
    statusColor: getStatusColor(),
  };
};