import { Injectable } from '@angular/core';
import { IndexedDBRepository } from './indexeddb.repository';
import { CryptoService } from '../services/crypto.service';

export interface EmergencyTokenStorage {
  encryptedToken: string;
  createdAt: Date;
  expiresAt: Date;
  securityQuestion: string;
  securityAnswerHash: string;
  used: boolean;
  usedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class EmergencyTokenRepository extends IndexedDBRepository {
  private readonly EMERGENCY_TOKEN_KEY = 'emergency_token';

  constructor(private cryptoService: CryptoService) {
    super();
  }

  /**
   * Store emergency token with encryption
   */
  async storeEmergencyToken(
    token: string,
    validityDays: number,
    securityQuestion: string,
    securityAnswerHash: string
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

    // Encrypt the token with device key
    const deviceKey = await this.cryptoService.getOrCreateDeviceKey();
    const encryptedToken = await this.cryptoService.encrypt(token, deviceKey);

    const storage: EmergencyTokenStorage = {
      encryptedToken,
      createdAt: now,
      expiresAt,
      securityQuestion,
      securityAnswerHash,
      used: false
    };

    // Encrypt the entire storage object
    const encrypted = await this.cryptoService.encrypt(JSON.stringify(storage), deviceKey);

    await this.put('offline_auth', {
      key: this.EMERGENCY_TOKEN_KEY,
      value: encrypted,
      timestamp: now
    });
  }

  /**
   * Get emergency token storage
   * Returns null if token doesn't exist or is expired
   */
  async getEmergencyToken(): Promise<EmergencyTokenStorage | null> {
    try {
      const record = await this.get<{ key: string; value: string; timestamp: Date }>('offline_auth', this.EMERGENCY_TOKEN_KEY);
      if (!record) {
        return null;
      }

      // Decrypt the storage
      const deviceKey = await this.cryptoService.getOrCreateDeviceKey();
      const decrypted = await this.cryptoService.decrypt(record.value, deviceKey);
      const storage: EmergencyTokenStorage = JSON.parse(decrypted);

      // Convert date strings back to Date objects
      storage.createdAt = new Date(storage.createdAt);
      storage.expiresAt = new Date(storage.expiresAt);
      if (storage.usedAt) {
        storage.usedAt = new Date(storage.usedAt);
      }

      // Check if token is expired
      const now = new Date();
      if (now > storage.expiresAt) {
        return null;
      }

      return storage;
    } catch (error) {
      console.error('Error retrieving emergency token:', error);
      return null;
    }
  }

  /**
   * Decrypt the emergency token
   */
  async decryptEmergencyToken(storage: EmergencyTokenStorage): Promise<string> {
    const deviceKey = await this.cryptoService.getOrCreateDeviceKey();
    return await this.cryptoService.decrypt(storage.encryptedToken, deviceKey);
  }

  /**
   * Mark emergency token as used
   */
  async markTokenAsUsed(): Promise<void> {
    const storage = await this.getEmergencyToken();
    if (!storage) {
      throw new Error('No emergency token found');
    }

    storage.used = true;
    storage.usedAt = new Date();

    // Encrypt and store updated storage
    const deviceKey = await this.cryptoService.getOrCreateDeviceKey();
    const encrypted = await this.cryptoService.encrypt(JSON.stringify(storage), deviceKey);

    await this.put('offline_auth', {
      key: this.EMERGENCY_TOKEN_KEY,
      value: encrypted,
      timestamp: new Date()
    });
  }

  /**
   * Check if emergency token exists and is valid
   */
  async hasValidEmergencyToken(): Promise<boolean> {
    const storage = await this.getEmergencyToken();
    return storage !== null && !storage.used;
  }

  /**
   * Clear emergency token
   */
  async clearEmergencyToken(): Promise<void> {
    await this.delete('offline_auth', this.EMERGENCY_TOKEN_KEY);
  }
}
