import { Injectable } from '@angular/core';
import { IndexedDBRepository } from './indexeddb.repository';
import { CryptoService } from '../services/crypto.service';

/**
 * Interface for PIN storage data structure
 */
export interface PINStorage {
  id: string;
  pinHash: string;
  attemptCount: number;
  locked: boolean;
  createdAt: string;
  lastVerifiedAt: string;
}

/**
 * PINRepository manages PIN storage in IndexedDB with encryption
 */
@Injectable({
  providedIn: 'root'
})
export class PINRepository extends IndexedDBRepository {
  private readonly STORE_NAME = 'pin-storage';

  constructor(private cryptoService: CryptoService) {
    super();
  }

  /**
   * Stores a PIN hash in IndexedDB with encryption
   * 
   * @param employeeId The employee ID to associate with the PIN
   * @param hash The bcrypt hash to store
   */
  async storePINHash(employeeId: string, hash: string): Promise<void> {
    console.log('[PINRepository] storePINHash called for employee:', employeeId);
    
    try {
      console.log('[PINRepository] Getting device key...');
      const key = await this.cryptoService.getOrCreateDeviceKey();
      console.log('[PINRepository] Device key obtained');
      
      console.log('[PINRepository] Encrypting hash...');
      const encryptedHash = await this.cryptoService.encrypt(hash, key);
      console.log('[PINRepository] Hash encrypted');

      console.log('[PINRepository] Getting existing PIN data...');
      const existingData = await this.getPINData(employeeId);
      console.log('[PINRepository] Existing data:', existingData ? 'found' : 'not found');
      
      const pinData: PINStorage = {
        id: employeeId,
        pinHash: encryptedHash,
        attemptCount: existingData?.attemptCount || 0,
        locked: existingData?.locked || false,
        createdAt: existingData?.createdAt || new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString()
      };

      console.log('[PINRepository] Storing PIN data...');
      await this.put(this.STORE_NAME, pinData);
      console.log('[PINRepository] PIN hash stored successfully');
    } catch (error: any) {
      console.error('[PINRepository] Error storing PIN hash:', error);
      console.error('[PINRepository] Error message:', error?.message);
      console.error('[PINRepository] Error stack:', error?.stack);
      throw new Error('Failed to store PIN hash: ' + (error?.message || 'Unknown error'));
    }
  }

  /**
   * Retrieves the PIN hash from IndexedDB and decrypts it
   * 
   * @param employeeId The employee ID to retrieve the PIN for
   * @returns The decrypted PIN hash or null if not found
   */
  async getPINHash(employeeId: string): Promise<string | null> {
    try {
      const pinData = await this.getPINData(employeeId);
      if (!pinData || !pinData.pinHash) {
        return null;
      }

      const key = await this.cryptoService.getOrCreateDeviceKey();
      const decryptedHash = await this.cryptoService.decrypt(pinData.pinHash, key);
      return decryptedHash;
    } catch (error) {
      console.error('Error retrieving PIN hash:', error);
      return null;
    }
  }

  /**
   * Stores the failed attempt count
   * 
   * @param employeeId The employee ID
   * @param count The number of failed attempts
   */
  async storeAttemptCount(employeeId: string, count: number): Promise<void> {
    try {
      const pinData = await this.getPINData(employeeId);
      if (!pinData) {
        throw new Error('PIN data not found');
      }

      pinData.attemptCount = count;
      await this.put(this.STORE_NAME, pinData);
    } catch (error) {
      console.error('Error storing attempt count:', error);
      throw new Error('Failed to store attempt count');
    }
  }

  /**
   * Retrieves the failed attempt count
   * 
   * @param employeeId The employee ID
   * @returns The number of failed attempts
   */
  async getAttemptCount(employeeId: string): Promise<number> {
    try {
      const pinData = await this.getPINData(employeeId);
      return pinData?.attemptCount || 0;
    } catch (error) {
      console.error('Error retrieving attempt count:', error);
      return 0;
    }
  }

  /**
   * Stores the lock status
   * 
   * @param employeeId The employee ID
   * @param locked Whether the PIN is locked
   */
  async storeLockStatus(employeeId: string, locked: boolean): Promise<void> {
    try {
      const pinData = await this.getPINData(employeeId);
      if (!pinData) {
        throw new Error('PIN data not found');
      }

      pinData.locked = locked;
      await this.put(this.STORE_NAME, pinData);
    } catch (error) {
      console.error('Error storing lock status:', error);
      throw new Error('Failed to store lock status');
    }
  }

  /**
   * Checks if the PIN is locked
   * 
   * @param employeeId The employee ID
   * @returns True if locked, false otherwise
   */
  async isLocked(employeeId: string): Promise<boolean> {
    try {
      const pinData = await this.getPINData(employeeId);
      return pinData?.locked || false;
    } catch (error) {
      console.error('Error checking lock status:', error);
      return false;
    }
  }

  /**
   * Retrieves the complete PIN data object
   * 
   * @param employeeId The employee ID
   * @returns The PIN storage data or null if not found
   */
  private async getPINData(employeeId: string): Promise<PINStorage | null> {
    try {
      return await this.get<PINStorage>(this.STORE_NAME, employeeId);
    } catch (error) {
      console.error('Error retrieving PIN data:', error);
      return null;
    }
  }

  /**
   * Deletes all PIN data for an employee (for testing or reset)
   * 
   * @param employeeId The employee ID
   */
  async deletePINData(employeeId: string): Promise<void> {
    try {
      await this.delete(this.STORE_NAME, employeeId);
    } catch (error) {
      console.error('Error deleting PIN data:', error);
      throw new Error('Failed to delete PIN data');
    }
  }

  /**
   * Migrates legacy single-user PIN to employee-keyed storage
   * 
   * @param employeeId The employee ID to migrate the PIN to
   * @returns True if migration was performed, false if no legacy PIN exists
   */
  async migrateSingleUserPIN(employeeId: string): Promise<boolean> {
    try {
      // Check if legacy PIN exists
      const legacyPIN = await this.get<PINStorage>(this.STORE_NAME, 'user-pin');
      if (!legacyPIN) {
        return false; // No migration needed
      }
      
      console.log('[PINRepository] Found legacy PIN, migrating to employee:', employeeId);
      
      // Check if employee already has a PIN
      const existingPIN = await this.get<PINStorage>(this.STORE_NAME, employeeId);
      if (existingPIN) {
        // Employee already has PIN, just delete legacy
        console.log('[PINRepository] Employee already has PIN, deleting legacy only');
        await this.delete(this.STORE_NAME, 'user-pin');
        return true;
      }
      
      // Migrate: copy with new ID
      const migratedPIN: PINStorage = {
        ...legacyPIN,
        id: employeeId
      };
      await this.put(this.STORE_NAME, migratedPIN);
      
      // Delete legacy record
      await this.delete(this.STORE_NAME, 'user-pin');
      
      console.log('[PINRepository] Migrated legacy PIN to employee', employeeId);
      return true;
    } catch (error) {
      console.error('[PINRepository] Migration failed:', error);
      return false;
    }
  }

  /**
   * Checks if a legacy single-user PIN exists
   * 
   * @returns True if legacy PIN exists, false otherwise
   */
  async hasSingleUserPIN(): Promise<boolean> {
    try {
      const legacyPIN = await this.get<PINStorage>(this.STORE_NAME, 'user-pin');
      return legacyPIN !== null;
    } catch (error) {
      console.error('[PINRepository] Error checking for legacy PIN:', error);
      return false;
    }
  }
}
