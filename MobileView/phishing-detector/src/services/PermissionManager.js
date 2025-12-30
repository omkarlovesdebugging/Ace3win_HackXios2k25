// src/services/PermissionManager.js - Permission Management

import { NativeModules, Linking, Alert } from 'react-native';

class PermissionManager {
  
  // Check if overlay permission is granted
  async checkOverlayPermission() {
    try {
      if (NativeModules.PermissionManager) {
        return await NativeModules.PermissionManager.canDrawOverlays();
      }
      return false;
    } catch (error) {
      console.error('Failed to check overlay permission:', error);
      return false;
    }
  }

  // Request overlay permission
  async requestOverlayPermission() {
    try {
      if (NativeModules.PermissionManager) {
        const result = await NativeModules.PermissionManager.requestOverlayPermission();
        return result;
      }
      return false;
    } catch (error) {
      console.error('Failed to request overlay permission:', error);
      return false;
    }
  }

  // Check if accessibility service is enabled
  async checkAccessibilityPermission() {
    try {
      if (NativeModules.AccessibilityManager) {
        return await NativeModules.AccessibilityManager.isAccessibilityServiceEnabled();
      }
      return false;
    } catch (error) {
      console.error('Failed to check accessibility permission:', error);
      return false;
    }
  }

  // Debug accessibility service (for troubleshooting)
  async debugAccessibilityService() {
    try {
      if (NativeModules.PermissionManager) {
        return await NativeModules.PermissionManager.debugAccessibilityService();
      }
      return null;
    } catch (error) {
      console.error('Failed to debug accessibility service:', error);
      return null;
    }
  }

  // Request accessibility permission (opens settings)
  async requestAccessibilityPermission() {
    try {
      if (NativeModules.AccessibilityManager) {
        await NativeModules.AccessibilityManager.openAccessibilitySettings();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to request accessibility permission:', error);
      return false;
    }
  }

  // Open accessibility settings
  async openAccessibilitySettings() {
    try {
      if (NativeModules.AccessibilityManager) {
        await NativeModules.AccessibilityManager.openAccessibilitySettings();
      } else {
        // Fallback to generic settings
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Failed to open accessibility settings:', error);
      Alert.alert(
        'Settings Required',
        'Please manually enable the Phishing Detector accessibility service in Settings > Accessibility.'
      );
    }
  }

  // Check if all required permissions are granted
  async checkAllPermissions() {
    const overlayPermission = await this.checkOverlayPermission();
    const accessibilityPermission = await this.checkAccessibilityPermission();
    
    return {
      overlay: overlayPermission,
      accessibility: accessibilityPermission,
      allGranted: overlayPermission && accessibilityPermission,
    };
  }

  // Request all required permissions
  async requestAllPermissions() {
    const results = {
      overlay: false,
      accessibility: false,
    };

    // Request overlay permission first
    results.overlay = await this.requestOverlayPermission();
    
    if (results.overlay) {
      // Then request accessibility permission
      await this.requestAccessibilityPermission();
      // Note: Accessibility permission requires manual enabling
      results.accessibility = false; // Will be checked later
    }

    return results;
  }

  // Show permission explanation dialog
  showPermissionExplanation(permissionType) {
    const explanations = {
      overlay: {
        title: 'Display Over Other Apps',
        message: 'This permission allows the app to show security warnings over your browser and other apps when phishing websites are detected. This is essential for real-time protection.',
        benefits: [
          'Shows instant warnings over any browser',
          'Protects you across all apps',
          'Cannot be blocked by malicious websites',
        ]
      },
      accessibility: {
        title: 'Accessibility Service',
        message: 'This service allows the app to monitor URLs in your browser to detect phishing threats in real-time. Your browsing data is only used for security analysis.',
        benefits: [
          'Monitors URLs automatically',
          'Works with any browser',
          'No manual scanning required',
        ]
      }
    };

    const explanation = explanations[permissionType];
    if (!explanation) return;

    Alert.alert(
      explanation.title,
      `${explanation.message}\n\nBenefits:\n${explanation.benefits.map(b => `• ${b}`).join('\n')}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Grant Permission', 
          onPress: () => {
            if (permissionType === 'overlay') {
              this.requestOverlayPermission();
            } else if (permissionType === 'accessibility') {
              this.requestAccessibilityPermission();
            }
          }
        }
      ]
    );
  }

  // Check if device supports required features
  async checkDeviceCompatibility() {
    const compatibility = {
      overlaySupported: true,
      accessibilitySupported: true,
      issues: [],
    };

    try {
      // Check Android version (minimum API 23 for overlay)
      if (NativeModules.DeviceInfo) {
        const apiLevel = await NativeModules.DeviceInfo.getApiLevel();
        if (apiLevel < 23) {
          compatibility.overlaySupported = false;
          compatibility.issues.push('Android 6.0+ required for overlay permission');
        }
      }

      // Check if accessibility service is available
      if (!NativeModules.AccessibilityManager) {
        compatibility.accessibilitySupported = false;
        compatibility.issues.push('Accessibility service not available');
      }

    } catch (error) {
      console.error('Failed to check device compatibility:', error);
      compatibility.issues.push('Unable to verify device compatibility');
    }

    return compatibility;
  }

  // Get permission status for UI display
  async getPermissionStatus() {
    const permissions = await this.checkAllPermissions();
    
    return {
      overlay: {
        granted: permissions.overlay,
        status: permissions.overlay ? 'Granted' : 'Required',
        description: 'Show warnings over other apps',
        icon: '⚠️',
      },
      accessibility: {
        granted: permissions.accessibility,
        status: permissions.accessibility ? 'Enabled' : 'Required',
        description: 'Monitor browser URLs',
        icon: '🔍',
      },
    };
  }

  // Handle permission result from native side
  handlePermissionResult(permissionType, granted) {
    console.log(`Permission ${permissionType} ${granted ? 'granted' : 'denied'}`);
    
    if (granted) {
      Alert.alert(
        'Permission Granted',
        `${permissionType} permission has been granted successfully.`
      );
    } else {
      Alert.alert(
        'Permission Required',
        `${permissionType} permission is required for the app to function properly. Please grant it in settings.`
      );
    }
  }
}

export default new PermissionManager();