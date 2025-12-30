// App.js - System-Wide Phishing Protection Service

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Switch,
  ScrollView,
  NativeModules,
  AppState,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import PhishingService from './src/services/PhishingService';
import PermissionManager from './src/services/PermissionManager';
import { useServiceStatus } from './src/hooks/useServiceStatus';
import { API_CONFIG } from './src/constants/config';

export default function App() {
  const [isServiceEnabled, setIsServiceEnabled] = useState(false);
  const [hasOverlayPermission, setHasOverlayPermission] = useState(false);
  const [hasAccessibilityPermission, setHasAccessibilityPermission] = useState(false);
  const [threatCount, setThreatCount] = useState(0);
  const [recentThreats, setRecentThreats] = useState([]);

  const {
    isServiceRunning,
    lastScanTime,
    totalScans,
    startService,
    stopService,
  } = useServiceStatus();

  // Add state refresh interval
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (isServiceEnabled) {
        refreshStats();
      }
      // Also check permissions regularly
      checkPermissions();
    }, 2000); // Refresh every 2 seconds

    return () => clearInterval(refreshInterval);
  }, [isServiceEnabled]);

  // Add focus listener to check permissions when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('App came to foreground, checking permissions...');
        checkPermissions();
        refreshStats();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const refreshStats = async () => {
    try {
      const stats = PhishingService.getServiceStats();
      const threats = await PhishingService.getRecentThreats();
      
      setThreatCount(threats.length);
      setRecentThreats(threats);
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  };

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    console.log('App: Initializing application...');
    
    // Initialize PhishingService first
    await PhishingService.initialize();
    
    // Check permissions
    await checkPermissions();
    
    // Load threat history
    await loadThreatHistory();
    
    // Check if service should be running and restart it
    const serviceStats = PhishingService.getServiceStats();
    console.log('App: Service stats on init:', serviceStats);
    
    if (serviceStats.isRunning) {
      console.log('App: Service was running, restarting...');
      setIsServiceEnabled(true);
      // Force restart the service
      await startService();
    }
    
    console.log('App: Initialization complete');
  };

  const checkPermissions = async () => {
    try {
      console.log('App: Checking permissions...');
      const overlayPermission = await PermissionManager.checkOverlayPermission();
      const accessibilityPermission = await PermissionManager.checkAccessibilityPermission();
      
      console.log('App: Permission status - Overlay:', overlayPermission, 'Accessibility:', accessibilityPermission);
      
      setHasOverlayPermission(overlayPermission);
      setHasAccessibilityPermission(accessibilityPermission);
      
      // If permissions changed, update service status
      if (overlayPermission && accessibilityPermission && !isServiceEnabled) {
        console.log('App: All permissions granted, service can be enabled');
      }
    } catch (error) {
      console.error('App: Error checking permissions:', error);
    }
  };

  const loadThreatHistory = async () => {
    const threats = await PhishingService.getRecentThreats();
    setRecentThreats(threats);
    setThreatCount(threats.length);
  };

  const handleServiceToggle = async (enabled) => {
    console.log('Service toggle requested:', enabled);
    console.log('Current permissions - Overlay:', hasOverlayPermission, 'Accessibility:', hasAccessibilityPermission);
    
    if (enabled) {
      if (!hasOverlayPermission) {
        Alert.alert(
          'Permission Required',
          'Overlay permission is required to show warnings over other apps.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Grant Permission', onPress: requestOverlayPermission }
          ]
        );
        return;
      }

      if (!hasAccessibilityPermission) {
        Alert.alert(
          'Accessibility Permission Required',
          'Accessibility permission is required to monitor URLs in browsers.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Grant Permission', onPress: requestAccessibilityPermission }
          ]
        );
        return;
      }

      console.log('Starting phishing service...');
      const success = await startService();
      console.log('Service start result:', success);
      setIsServiceEnabled(success);
    } else {
      console.log('Stopping phishing service...');
      const success = await stopService();
      console.log('Service stop result:', success);
      setIsServiceEnabled(false);
    }
  };

  const requestOverlayPermission = async () => {
    const granted = await PermissionManager.requestOverlayPermission();
    setHasOverlayPermission(granted);
    
    if (granted) {
      Alert.alert('Success', 'Overlay permission granted! You can now enable protection.');
    }
  };

  const requestAccessibilityPermission = async () => {
    await PermissionManager.requestAccessibilityPermission();
    // Note: Accessibility permission requires manual enabling in settings
    Alert.alert(
      'Enable Accessibility Service',
      'Please enable the Phishing Detector accessibility service in Settings > Accessibility.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => PermissionManager.openAccessibilitySettings() }
      ]
    );
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getStatusColor = () => {
    if (!hasOverlayPermission || !hasAccessibilityPermission) return '#E74C3C';
    if (isServiceRunning) return '#27AE60';
    return '#F39C12';
  };

  const getStatusText = () => {
    if (!hasOverlayPermission || !hasAccessibilityPermission) return 'Permissions Required';
    if (isServiceRunning) return 'Protected';
    return 'Not Protected';
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🛡️ LinkShield</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Protection Toggle */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Real-time Protection</Text>
              <Switch
                value={isServiceEnabled && isServiceRunning}
                onValueChange={handleServiceToggle}
                trackColor={{ false: '#E1E8ED', true: '#4A90E2' }}
                thumbColor={isServiceEnabled ? '#FFFFFF' : '#BDC3C7'}
              />
            </View>
            <Text style={styles.cardDescription}>
              Monitors URLs across all browsers and apps to detect phishing threats in real-time.
            </Text>
          </View>

          {/* Permissions Status */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Permissions Status</Text>
            
            <View style={styles.permissionItem}>
              <View style={styles.permissionLeft}>
                <Text style={styles.permissionIcon}>🔍</Text>
                <View>
                  <Text style={styles.permissionName}>Accessibility Service</Text>
                  <Text style={styles.permissionDesc}>Monitor browser URLs</Text>
                </View>
              </View>
              <View style={[
                styles.permissionStatus,
                hasAccessibilityPermission ? styles.granted : styles.denied
              ]}>
                <Text style={[
                  styles.permissionStatusText,
                  hasAccessibilityPermission ? styles.grantedText : styles.deniedText
                ]}>
                  {hasAccessibilityPermission ? 'Granted' : 'Required'}
                </Text>
              </View>
            </View>

            <View style={styles.permissionItem}>
              <View style={styles.permissionLeft}>
                <Text style={styles.permissionIcon}>⚠️</Text>
                <View>
                  <Text style={styles.permissionName}>Display Over Apps</Text>
                  <Text style={styles.permissionDesc}>Show warning overlays</Text>
                </View>
              </View>
              <View style={[
                styles.permissionStatus,
                hasOverlayPermission ? styles.granted : styles.denied
              ]}>
                <Text style={[
                  styles.permissionStatusText,
                  hasOverlayPermission ? styles.grantedText : styles.deniedText
                ]}>
                  {hasOverlayPermission ? 'Granted' : 'Required'}
                </Text>
              </View>
            </View>

            {(!hasOverlayPermission || !hasAccessibilityPermission) && (
              <TouchableOpacity 
                style={styles.permissionButton}
                onPress={() => {
                  if (!hasOverlayPermission) requestOverlayPermission();
                  else if (!hasAccessibilityPermission) requestAccessibilityPermission();
                }}
              >
                <Text style={styles.permissionButtonText}>Grant Permissions</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Statistics */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Protection Statistics</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalScans}</Text>
                <Text style={styles.statLabel}>URLs Scanned</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, styles.threatNumber]}>{threatCount}</Text>
                <Text style={styles.statLabel}>Threats Blocked</Text>
              </View>
            </View>

            <View style={styles.lastScanContainer}>
              <Text style={styles.lastScanLabel}>Last Scan:</Text>
              <Text style={styles.lastScanTime}>{formatTimestamp(lastScanTime)}</Text>
            </View>
          </View>

          {/* Recent Threats */}
          {recentThreats.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Recent Threats Blocked</Text>
                <Text style={styles.threatCountBadge}>{recentThreats.length}</Text>
              </View>
              
              <ScrollView 
                style={styles.threatHistoryContainer}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {recentThreats.map((threat, index) => (
                  <View key={index} style={styles.threatItem}>
                    <Text style={styles.threatIcon}>🚫</Text>
                    <View style={styles.threatDetails}>
                      <Text style={styles.threatUrl} numberOfLines={2}>
                        {threat.url}
                      </Text>
                      <Text style={styles.threatTime}>
                        {formatTimestamp(threat.timestamp)}
                      </Text>
                      <Text style={styles.threatSource}>
                        Source: {threat.sourceApp || 'Browser'}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              
              {recentThreats.length > 5 && (
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => {
                    // Could navigate to full history screen
                    Alert.alert('Threat History', `Total threats blocked: ${recentThreats.length}`);
                  }}
                >
                  <Text style={styles.viewAllText}>View All ({recentThreats.length})</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* How It Works */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>How It Works</Text>
            
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>
                Monitors URLs as you browse in any browser or app
              </Text>
            </View>
            
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                Analyzes each URL using machine learning for threats
              </Text>
            </View>
            
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>
                Shows instant warning overlay if phishing is detected
              </Text>
            </View>
          </View>

          {/* Debug Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Debug & Testing</Text>
            
            <TouchableOpacity 
              style={[styles.debugButton, { backgroundColor: '#9B59B6' }]}
              onPress={async () => {
                console.log('🔍 Checking accessibility service status...');
                try {
                  const isEnabled = await PermissionManager.checkAccessibilityPermission();
                  console.log('Accessibility permission:', isEnabled);
                  
                  // Also check if monitoring is active
                  if (NativeModules.AccessibilityManager) {
                    await NativeModules.AccessibilityManager.startURLMonitoring();
                  }
                  
                  Alert.alert('Service Check', 
                    `Accessibility Permission: ${isEnabled ? 'GRANTED' : 'NOT GRANTED'}\n\n` +
                    `If granted, check Android logs for:\n` +
                    `"🚀 ACCESSIBILITY SERVICE CONNECTED!"\n` +
                    `"📱 ACCESSIBILITY EVENT:"`
                  );
                } catch (error) {
                  Alert.alert('Error', `Check failed: ${error.message}`);
                }
              }}
            >
              <Text style={styles.debugButtonText}>🔍 Check Service Status</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.debugButton, { backgroundColor: '#E74C3C' }]}
              onPress={async () => {
                console.log('🔍 Forcing address bar scan...');
                try {
                  // Send broadcast to force address bar URL extraction
                  const { NativeModules } = require('react-native');
                  
                  if (NativeModules.AccessibilityManager) {
                    // This will trigger FORCE_URL_SCAN broadcast
                    await NativeModules.AccessibilityManager.startURLMonitoring();
                    
                    // Also send direct broadcast
                    const intent = {
                      action: 'FORCE_URL_SCAN'
                    };
                    
                    Alert.alert('Address Bar Scan', 'Extracting URL from browser address bar...');
                  } else {
                    Alert.alert('Error', 'AccessibilityManager not available');
                  }
                } catch (error) {
                  console.error('Force scan error:', error);
                  Alert.alert('Error', `Failed to scan: ${error.message}`);
                }
              }}
            >
              <Text style={styles.debugButtonText}>🔍 Scan Address Bar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.debugButton}
              onPress={async () => {
                console.log('Manual URL scan test...');
                // Test with the malicious URL you showed
                await PhishingService.handleURLDetected({
                  url: 'https://join4ra.com/chicken-',
                  packageName: 'com.android.chrome',
                  timestamp: Date.now()
                });
              }}
            >
              <Text style={styles.debugButtonText}>Test Malicious URL</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.debugButton}
              onPress={async () => {
                console.log('Testing with real URL...');
                // Test with a real URL that backend can process
                await PhishingService.handleURLDetected({
                  url: 'https://google.com',
                  packageName: 'com.android.chrome',
                  timestamp: Date.now()
                });
              }}
            >
              <Text style={styles.debugButtonText}>Test Real URL (Google)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.debugButton}
              onPress={async () => {
                console.log('Testing complete URL detection flow...');
                // Simulate URL detection from accessibility service
                await PhishingService.handleURLDetected({
                  url: 'https://phishing-test.example.com',
                  packageName: 'com.android.chrome',
                  timestamp: Date.now()
                });
              }}
            >
              <Text style={styles.debugButtonText}>Test Complete Flow</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.debugButton}
              onPress={async () => {
                console.log('Testing URL scan...');
                await PhishingService.scanURLInBackground('https://example.com', 'com.android.chrome');
              }}
            >
              <Text style={styles.debugButtonText}>Test URL Scan</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.debugButton}
              onPress={async () => {
                console.log('Checking service status...');
                try {
                  const stats = PhishingService.getServiceStats();
                  const nativeStatus = await NativeModules.PhishingDetectionService.isServiceRunning();
                  
                  Alert.alert('Service Status', 
                    `JS Service Running: ${stats.isRunning}\n` +
                    `Native Service Running: ${nativeStatus}\n` +
                    `Scan Count: ${stats.scanCount}\n` +
                    `Threat Count: ${stats.threatCount}`
                  );
                } catch (error) {
                  Alert.alert('Error', `Failed to check status: ${error.message}`);
                }
              }}
            >
              <Text style={styles.debugButtonText}>Check Service Status</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.debugButton}
              onPress={async () => {
                console.log('Force restarting service...');
                try {
                  await stopService();
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  await startService();
                  setIsServiceEnabled(true);
                  Alert.alert('Success', 'Service force restarted');
                } catch (error) {
                  Alert.alert('Error', `Failed to restart: ${error.message}`);
                }
              }}
            >
              <Text style={styles.debugButtonText}>Force Restart Service</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.debugButton}
              onPress={async () => {
                console.log('Clearing URL cache...');
                PhishingService.clearCache();
                Alert.alert('Debug', 'URL cache cleared. Fresh scans will be performed.');
              }}
            >
              <Text style={styles.debugButtonText}>Clear Cache</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.debugButton}
              onPress={async () => {
                console.log('Checking accessibility service status...');
                const isEnabled = await PermissionManager.checkAccessibilityPermission();
                console.log('Accessibility service enabled:', isEnabled);
                
                if (isEnabled && NativeModules.AccessibilityManager) {
                  try {
                    await NativeModules.AccessibilityManager.startURLMonitoring();
                    console.log('URL monitoring started');
                    Alert.alert('Debug', 'URL monitoring started. Try browsing to a website.');
                  } catch (error) {
                    console.error('Failed to start URL monitoring:', error);
                    Alert.alert('Debug Error', `Failed to start monitoring: ${error.message}`);
                  }
                } else {
                  Alert.alert('Debug', 'Accessibility service not enabled or module not found');
                }
              }}
            >
              <Text style={styles.debugButtonText}>Start URL Monitoring</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.debugButton, { backgroundColor: '#3498DB' }]}
              onPress={async () => {
                console.log('Testing network connectivity...');
                
                try {
                  // Test basic connectivity to the backend server
                  const testUrls = [
                    `${API_CONFIG.BASE_URL}/`,
                    `${API_CONFIG.BASE_URL}/health`,
                    'https://google.com',
                    'https://httpbin.org/get'
                  ];
                  
                  let results = [];
                  
                  for (const url of testUrls) {
                    try {
                      console.log(`Testing: ${url}`);
                      const startTime = Date.now();
                      
                      const response = await fetch(url, {
                        method: 'GET',
                        timeout: 5000
                      });
                      
                      const endTime = Date.now();
                      const responseTime = endTime - startTime;
                      
                      results.push(`✅ ${url}\nStatus: ${response.status}\nTime: ${responseTime}ms`);
                      
                    } catch (error) {
                      results.push(`❌ ${url}\nError: ${error.message}`);
                    }
                  }
                  
                  Alert.alert('Network Test Results', results.join('\n\n'));
                  
                } catch (error) {
                  console.error('Network test error:', error);
                  Alert.alert('Network Test Error', error.message);
                }
              }}
            >
              <Text style={styles.debugButtonText}>🌐 Test Network</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  permissionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  permissionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  permissionDesc: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  permissionStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  granted: {
    backgroundColor: '#E8F5E9',
  },
  denied: {
    backgroundColor: '#FFE5E5',
  },
  permissionStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  grantedText: {
    color: '#27AE60',
  },
  deniedText: {
    color: '#E74C3C',
  },
  permissionButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4A90E2',
  },
  threatNumber: {
    color: '#E74C3C',
  },
  statLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
  },
  lastScanContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastScanLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginRight: 8,
  },
  lastScanTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  threatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  threatIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  threatDetails: {
    flex: 1,
  },
  threatUrl: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
  },
  threatTime: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4A90E2',
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  threatCountBadge: {
    backgroundColor: '#E74C3C',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  threatHistoryContainer: {
    maxHeight: 200,
    marginBottom: 10,
  },
  threatSource: {
    fontSize: 11,
    color: '#95A5A6',
    marginTop: 2,
  },
  viewAllButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  debugButton: {
    backgroundColor: '#95A5A6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});