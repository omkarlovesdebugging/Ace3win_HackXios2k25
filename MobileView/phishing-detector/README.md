# 🛡️ LinkShield - Phishing Detection App

A React Native app with native Android accessibility service for system-wide phishing protection.

## 🚀 Features

- **System-wide URL monitoring** across all browsers
- **Real-time phishing detection** using machine learning
- **Automatic threat overlays** with safe redirect options
- **Trusted domain whitelist** (Google, YouTube, GitHub, etc.)
- **Background service** with auto-restart functionality

## 📱 Installation

1. Install the APK: `android/app/build/outputs/apk/debug/app-debug.apk`
2. Grant Accessibility Permission: Settings → Accessibility → LinkShield → Enable
3. Grant Overlay Permission: Settings → Apps → LinkShield → Display over other apps → Allow
4. Open app and enable Real-time Protection

## 🔧 Development

### Prerequisites
- Node.js 18+
- React Native CLI
- Android Studio
- Android SDK

### Setup
```bash
npm install
npx expo prebuild
cd android && ./gradlew assembleDebug
```

### Build APK
```bash
cd android
./gradlew assembleDebug
```

## 📁 Project Structure

```
src/
├── components/           # React Native UI components
├── services/            # Core services (API, PhishingService, etc.)
├── hooks/               # Custom React hooks
└── constants/           # App configuration

android/app/src/main/java/com/phishingdetector/
├── PhishingAccessibilityService.kt    # Main accessibility service
├── SystemOverlayModule.kt             # Threat overlay system
├── PhishingBackgroundService.kt       # Background service
├── AccessibilityManagerModule.kt      # Accessibility management
├── PermissionManagerModule.kt         # Permission handling
├── PhishingDetectionServiceModule.kt  # Service coordination
├── PhishingDetectorPackage.kt         # Native module package
└── BootReceiver.kt                    # Auto-start on boot
```

## 🛡️ How It Works

1. Accessibility service monitors browser address bars
2. Extracts URLs when pages load
3. Sends URLs to ML backend for phishing analysis
4. Shows system overlay warning if threat detected
5. "Go Back" button redirects to safe Google.com homepage

## 🔒 Privacy & Security

- Only scans URLs, no personal data collection
- Trusted domains automatically whitelisted
- Local caching reduces backend requests
- No browsing history stored

## 📊 Backend Integration

The app connects to a machine learning backend for phishing detection. Configure the backend URL in `src/constants/config.js`.

## 🎯 Production Ready

This app is fully functional and ready for production use with comprehensive phishing protection across the entire Android device.