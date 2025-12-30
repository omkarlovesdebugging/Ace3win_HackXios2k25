// src/services/api.js

import { API_CONFIG } from '../constants/config';

class APIService {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.requestQueue = [];
    this.isProcessing = false;
  }

  async checkURL(url) {
    return this.makeRequestWithRetry('/predict_url', { url });
  }

  async checkWithFeatures(features) {
    return this.makeRequestWithRetry('/predict', { features });
  }

  async makeRequestWithRetry(endpoint, payload, attempt = 1) {
    try {
      return await this.makeRequest(endpoint, payload);
    } catch (error) {
      if (attempt < API_CONFIG.RETRY_ATTEMPTS) {
        await this.delay(API_CONFIG.RETRY_DELAY * attempt);
        return this.makeRequestWithRetry(endpoint, payload, attempt + 1);
      }
      throw error;
    }
  }

  async makeRequest(endpoint, payload) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
      console.log(`🌐 Making request to: ${this.baseURL}${endpoint}`);
      console.log(`📤 Request payload:`, payload);
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      console.log(`📥 Response status: ${response.status}`);
      console.log(`📥 Response headers:`, response.headers);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ API Error Response:`, errorData);
        throw new Error(
          errorData.detail || `Request failed with status ${response.status}`
        );
      }

      const result = await response.json();
      console.log(`✅ API Success Response:`, result);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      console.error(`❌ Request failed:`, error);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please try again.');
      }
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network connection failed. Please check your internet.');
      }
      
      throw error;
    }
  }

  async healthCheck() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.baseURL}/health`, { 
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new APIService(API_CONFIG.BASE_URL);