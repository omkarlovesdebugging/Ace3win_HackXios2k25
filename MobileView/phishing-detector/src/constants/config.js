// src/constants/config.js

// API Configuration
export const API_CONFIG = {
  BASE_URL: 'https://linkshield-backend-edrp.onrender.com', // Production backend
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// Cache Configuration
export const CACHE_CONFIG = {
  EXPIRY_MS: 3600000, // 1 hour
  MAX_SIZE: 500,
};

// Scanning Configuration
export const SCAN_CONFIG = {
  DEBOUNCE_DELAY: 800,
  MAX_HISTORY: 50,
  AUTO_SCAN_ENABLED: true,
};

// UI Configuration
export const UI_CONFIG = {
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 3000,
  MODAL_ANIMATION_TENSION: 50,
  MODAL_ANIMATION_FRICTION: 7,
};

// Security Configuration
export const SECURITY_CONFIG = {
  BLOCK_PHISHING: true,
  SHOW_WARNINGS: true,
  ALLOW_CONTINUE_ANYWAY: true,
  LOG_SCANS: true,
};

// Network Configuration
export const NETWORK_CONFIG = {
  CHECK_CONNECTIVITY: true,
  OFFLINE_MODE_ENABLED: false,
  CONNECTION_TIMEOUT: 5000,
};