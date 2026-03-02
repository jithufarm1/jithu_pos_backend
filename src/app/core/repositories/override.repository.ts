import { Injectable } from '@angular/core';
import { IndexedDBRepository } from './indexeddb.repository';
import { CryptoService } from '../services/crypto.service';

export interface OverrideCode {
  code: string;
  validFrom: Date;
  validUntil: Date;
  managerID: string;
}

export interface OverrideUsage {
  timestamp: Date;
  managerID: string;
  employeeID: string;
  code: string;
  daysExtended: number;
}

export interface OverrideCache {
  codes: OverrideCode[];
  cachedAt: Date;
  expiresAt: Date;
  usageCount: number;
  usageHistory: OverrideUsage[];
}

@Injectable({
  providedIn: 'root'
})
export class OverrideRepository extends IndexedDBRepository {
  private readonly OVERRIDE_CACHE_KEY = 'override_cache';
  private readonly OVERRIDE_USAGE_KEY = 'override_usage';

  constructor(private cryptoService: CryptoService) {
    super();
  }

  /**
   * Cache override codes with encryption
   * Codes are valid for 30 days from cache time
   */
  async cacheOverrideCodes(codes: OverrideCode[]): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const cache: OverrideCache = {
      codes,
      cachedAt: now,
      expiresAt,
      usageCount: 0,
      usageHistory: []
    };

    // Encrypt the cache before storing
    const deviceKey = await this.cryptoService.getOrCreateDeviceKey();
    const encrypted = await this.cryptoService.encrypt(JSON.stringify(cache), deviceKey);

    await this.put('offline_auth', {
      key: this.OVERRIDE_CACHE_KEY,
      value: encrypted,
      timestamp: now
    });
  }

  /**
   * Get cached override codes with expiration check
   * Returns null if cache is expired or doesn't exist
   */
  async getOverrideCodes(): Promise<OverrideCode[] | null> {
    try {
      const record = await this.get<{ key: string; value: string; timestamp: Date }>('offline_auth', this.OVERRIDE_CACHE_KEY);
      if (!record) {
        return null;
      }

      // Decrypt the cache
      const deviceKey = await this.cryptoService.getOrCreateDeviceKey();
      const decrypted = await this.cryptoService.decrypt(record.value, deviceKey);
      const cache: OverrideCache = JSON.parse(decrypted);

      // Convert date strings back to Date objects
      cache.cachedAt = new Date(cache.cachedAt);
      cache.expiresAt = new Date(cache.expiresAt);
      cache.codes = cache.codes.map(code => ({
        ...code,
        validFrom: new Date(code.validFrom),
        validUntil: new Date(code.validUntil)
      }));

      // Check if cache is expired
      const now = new Date();
      if (now > cache.expiresAt) {
        return null;
      }

      return cache.codes;
    } catch (error) {
      console.error('Error retrieving override codes:', error);
      return null;
    }
  }

  /**
   * Get the full override cache including usage information
   */
  async getOverrideCache(): Promise<OverrideCache | null> {
    try {
      const record = await this.get<{ key: string; value: string; timestamp: Date }>('offline_auth', this.OVERRIDE_CACHE_KEY);
      if (!record) {
        return null;
      }

      const deviceKey = await this.cryptoService.getOrCreateDeviceKey();
      const decrypted = await this.cryptoService.decrypt(record.value, deviceKey);
      const cache: OverrideCache = JSON.parse(decrypted);

      // Convert date strings back to Date objects
      cache.cachedAt = new Date(cache.cachedAt);
      cache.expiresAt = new Date(cache.expiresAt);
      cache.codes = cache.codes.map(code => ({
        ...code,
        validFrom: new Date(code.validFrom),
        validUntil: new Date(code.validUntil)
      }));
      cache.usageHistory = cache.usageHistory.map(usage => ({
        ...usage,
        timestamp: new Date(usage.timestamp)
      }));

      return cache;
    } catch (error) {
      console.error('Error retrieving override cache:', error);
      return null;
    }
  }

  /**
   * Store override usage information
   */
  async storeOverrideUsage(usage: OverrideUsage): Promise<void> {
    const cache = await this.getOverrideCache();
    if (!cache) {
      throw new Error('No override cache found');
    }

    cache.usageCount++;
    cache.usageHistory.push(usage);

    // Encrypt and store updated cache
    const deviceKey = await this.cryptoService.getOrCreateDeviceKey();
    const encrypted = await this.cryptoService.encrypt(JSON.stringify(cache), deviceKey);

    await this.put('offline_auth', {
      key: this.OVERRIDE_CACHE_KEY,
      value: encrypted,
      timestamp: new Date()
    });
  }

  /**
   * Get remaining override count (max 3)
   */
  async getRemainingOverrides(): Promise<number> {
    const cache = await this.getOverrideCache();
    if (!cache) {
      return 0;
    }

    const maxOverrides = 3; // This could be configurable
    return Math.max(0, maxOverrides - cache.usageCount);
  }

  /**
   * Clear all override data
   */
  async clearOverrideCache(): Promise<void> {
    await this.delete('offline_auth', this.OVERRIDE_CACHE_KEY);
  }
}
