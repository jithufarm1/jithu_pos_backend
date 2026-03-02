import { Injectable } from '@angular/core';
import { IndexedDBRepository } from './indexeddb.repository';

/**
 * Configuration data structure for offline authentication
 */
export interface ExpirationConfig {
  id: string;
  normalPeriodDays: number;        // Default: 7
  warningStartDays: number;         // Default: 7
  gracePeriodDays: number;          // Default: 14
  overrideRequiredDays: number;     // Default: 14
  emergencyTokenValidityDays: number; // Default: 30
  overrideExtensionDays: number;    // Default: 7
  maxOverrideCount: number;         // Default: 3
  lastUpdated: Date;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ExpirationConfig = {
  id: 'expiration-config',
  normalPeriodDays: 7,
  warningStartDays: 7,
  gracePeriodDays: 14,
  overrideRequiredDays: 14,
  emergencyTokenValidityDays: 30,
  overrideExtensionDays: 7,
  maxOverrideCount: 3,
  lastUpdated: new Date()
};

/**
 * Config Repository
 * Manages configuration storage in IndexedDB with default values
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */
@Injectable({
  providedIn: 'root'
})
export class ConfigRepository extends IndexedDBRepository {
  private readonly STORE_NAME = 'config-storage';
  private readonly CONFIG_KEY = 'expiration-config';

  /**
   * Store configuration in IndexedDB
   * @param config Configuration object to store
   */
  async storeConfig(config: Partial<ExpirationConfig>): Promise<void> {
    const existingConfig = await this.getConfig();
    const updatedConfig: ExpirationConfig = {
      ...existingConfig,
      ...config,
      id: this.CONFIG_KEY,
      lastUpdated: new Date()
    };
    await this.put(this.STORE_NAME, updatedConfig);
  }

  /**
   * Get configuration from IndexedDB
   * Returns default values if no configuration exists
   * @returns Configuration object
   */
  async getConfig(): Promise<ExpirationConfig> {
    const config = await this.get<ExpirationConfig>(this.STORE_NAME, this.CONFIG_KEY);
    
    if (!config) {
      // Initialize with default values
      await this.put(this.STORE_NAME, DEFAULT_CONFIG);
      return { ...DEFAULT_CONFIG };
    }

    // Ensure lastUpdated is a Date object
    if (config.lastUpdated && !(config.lastUpdated instanceof Date)) {
      config.lastUpdated = new Date(config.lastUpdated);
    }

    return config;
  }

  /**
   * Reset configuration to default values
   */
  async resetToDefaults(): Promise<void> {
    await this.put(this.STORE_NAME, { ...DEFAULT_CONFIG, lastUpdated: new Date() });
  }
}
