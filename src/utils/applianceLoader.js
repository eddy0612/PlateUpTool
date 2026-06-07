/**
 * @module applianceLoader
 * @description Utility to load and cache appliances data from appliances.json.
 */

import { ref, onMounted } from 'vue'

// The base URL for assets (assuming Vue/Vite setup)
const BASE_URL = import.meta.env.BASE_URL || '/'

/**
 * Fetches appliance data once and caches it.
 * @returns {Promise<Object>} A promise that resolves with the parsed JSON object of appliances.
 */
export async function loadApplianceData() {
  if (window.__applianceDataCache) {
    console.log('Using cached appliance data.');
    return window.__applianceDataCache;
  }

  try {
    const response = await fetch(BASE_URL + 'res/appliances.json')
    if (!response.ok) {
      throw new Error(`Failed to load appliances.json: ${response.statusText}`);
    }
    const data = await response.json()
    
    // Cache the data globally for this session
    window.__applianceDataCache = data; 
    console.log('Successfully loaded and cached appliance data.');
    return data;

  } catch (error) {
    console.error('Error loading appliances.json:', error);
    throw error;
  }
}