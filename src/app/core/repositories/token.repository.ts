import { Injectable } from '@angular/core';
import { CryptoService } from '../services/crypto.service';

/**
 * TokenRepository manages JWT token storage in localStorage
 * with support for encryption and locking mechanism
 */
@Injectable({
  providedIn: 'root'
})
export class TokenRepository {
  constructor(private cryptoService: CryptoService) {}

  /**
   * Stores a value in localStorage with optional encryption
   * 
   * @param key The storage key
   * @param value The value to store
   * @param encrypted Whether to encrypt the value
   */
  async store(key: string, value: string, encrypted: boolean = false): Promise<void> {
    try {
      if (encrypted) {
        const deviceKey = await this.cryptoService.getOrCreateDeviceKey();
        const encryptedValue = await this.cryptoService.encrypt(value, deviceKey);
        localStorage.setItem(key, encryptedValue);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Error storing value:', error);
      throw new Error('Failed to store value in localStorage');
    }
  }

  /**
   * Retrieves a value from localStorage with optional decryption
   * 
   * @param key The storage key
   * @param encrypted Whether the value is encrypted
   * @returns The retrieved value or null if not found
   */
  async retrieve(key: string, encrypted: boolean = false): Promise<string | null> {
    try {
      const value = localStorage.getItem(key);
      if (!value) {
        return null;
      }

      if (encrypted) {
        const deviceKey = await this.cryptoService.getOrCreateDeviceKey();
        return await this.cryptoService.decrypt(value, deviceKey);
      }

      return value;
    } catch (error) {
      console.error('Error retrieving value:', error);
      return null;
    }
  }

  /**
   * Deletes a value from localStorage
   * 
   * @param key The storage key
   */
  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error deleting value:', error);
      throw new Error('Failed to delete value from localStorage');
    }
  }

  /**
   * Checks if a key exists in localStorage
   * 
   * @param key The storage key
   * @returns True if key exists, false otherwise
   */
  exists(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Clears all values from localStorage (use with caution)
   */
  clearAll(): void {
    localStorage.clear();
  }
}
