import { Injectable } from '@angular/core';
import { TokenRepository } from '../repositories/token.repository';

/**
 * Interface for token metadata
 */
export interface TokenMetadata {
  locked: boolean;
  lastSyncTime: string;
  deviceID: string;
}

/**
 * TokenService manages JWT token storage with locking mechanism
 * for offline authentication
 */
@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly DEVICE_ID_KEY = 'device_id';

  constructor(private tokenRepository: TokenRepository) {}

  /**
   * Stores a JWT token with locked status
   * 
   * @param employeeId The employee ID
   * @param token The JWT token to store
   * @param locked Whether the token should be locked
   */
  async storeToken(employeeId: string, token: string, locked: boolean = false): Promise<void> {
    try {
      const tokenKey = `auth_token_${employeeId}`;
      const metadataKey = `auth_token_metadata_${employeeId}`;
      
      // Store the token
      await this.tokenRepository.store(tokenKey, token, false);

      // Store metadata
      const deviceID = await this.getOrCreateDeviceID();
      const metadata: TokenMetadata = {
        locked,
        lastSyncTime: new Date().toISOString(),
        deviceID
      };
      await this.tokenRepository.store(
        metadataKey,
        JSON.stringify(metadata),
        false
      );
    } catch (error) {
      console.error('Error storing token:', error);
      throw new Error('Failed to store token');
    }
  }

  /**
   * Retrieves the JWT token if it's not locked
   * 
   * @param employeeId The employee ID
   * @returns The token or null if not found or locked
   */
  async getToken(employeeId: string): Promise<string | null> {
    try {
      const isLocked = await this.isTokenLocked(employeeId);
      if (isLocked) {
        return null;
      }

      const tokenKey = `auth_token_${employeeId}`;
      return await this.tokenRepository.retrieve(tokenKey, false);
    } catch (error) {
      console.error('Error retrieving token:', error);
      return null;
    }
  }

  /**
   * Locks the token without deleting it
   * 
   * @param employeeId The employee ID
   */
  async lockToken(employeeId: string): Promise<void> {
    try {
      const metadata = await this.getMetadata(employeeId);
      if (!metadata) {
        throw new Error('No token metadata found');
      }

      metadata.locked = true;
      const metadataKey = `auth_token_metadata_${employeeId}`;
      await this.tokenRepository.store(
        metadataKey,
        JSON.stringify(metadata),
        false
      );
    } catch (error) {
      console.error('Error locking token:', error);
      throw new Error('Failed to lock token');
    }
  }

  /**
   * Unlocks the token
   * 
   * @param employeeId The employee ID
   */
  async unlockToken(employeeId: string): Promise<void> {
    try {
      const metadata = await this.getMetadata(employeeId);
      if (!metadata) {
        throw new Error('No token metadata found');
      }

      metadata.locked = false;
      const metadataKey = `auth_token_metadata_${employeeId}`;
      await this.tokenRepository.store(
        metadataKey,
        JSON.stringify(metadata),
        false
      );
    } catch (error) {
      console.error('Error unlocking token:', error);
      throw new Error('Failed to unlock token');
    }
  }

  /**
   * Checks if the token is locked
   * 
   * @param employeeId The employee ID
   * @returns True if locked, false otherwise
   */
  async isTokenLocked(employeeId: string): Promise<boolean> {
    try {
      const metadata = await this.getMetadata(employeeId);
      return metadata?.locked || false;
    } catch (error) {
      console.error('Error checking token lock status:', error);
      return false;
    }
  }

  /**
   * Deletes the token and metadata
   * 
   * @param employeeId The employee ID
   */
  async deleteToken(employeeId: string): Promise<void> {
    try {
      const tokenKey = `auth_token_${employeeId}`;
      const metadataKey = `auth_token_metadata_${employeeId}`;
      await this.tokenRepository.delete(tokenKey);
      await this.tokenRepository.delete(metadataKey);
    } catch (error) {
      console.error('Error deleting token:', error);
      throw new Error('Failed to delete token');
    }
  }

  /**
   * Gets the last sync time
   * 
   * @param employeeId The employee ID
   * @returns The last sync time or null if not found
   */
  async getLastSyncTime(employeeId: string): Promise<Date | null> {
    try {
      const metadata = await this.getMetadata(employeeId);
      if (!metadata || !metadata.lastSyncTime) {
        return null;
      }

      return new Date(metadata.lastSyncTime);
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  /**
   * Updates the last sync time to now
   * 
   * @param employeeId The employee ID
   */
  async updateLastSyncTime(employeeId: string): Promise<void> {
    try {
      const metadata = await this.getMetadata(employeeId);
      if (!metadata) {
        throw new Error('No token metadata found');
      }

      metadata.lastSyncTime = new Date().toISOString();
      const metadataKey = `auth_token_metadata_${employeeId}`;
      await this.tokenRepository.store(
        metadataKey,
        JSON.stringify(metadata),
        false
      );
    } catch (error) {
      console.error('Error updating last sync time:', error);
      throw new Error('Failed to update last sync time');
    }
  }

  /**
   * Gets the device ID
   * 
   * @returns The device ID or null if not found
   */
  async getDeviceID(): Promise<string | null> {
    try {
      return await this.tokenRepository.retrieve(this.DEVICE_ID_KEY, false);
    } catch (error) {
      console.error('Error getting device ID:', error);
      return null;
    }
  }

  /**
   * Gets the raw token regardless of lock status (for internal use)
   * 
   * @param employeeId The employee ID
   * @returns The token or null if not found
   */
  async getRawToken(employeeId: string): Promise<string | null> {
    try {
      const tokenKey = `auth_token_${employeeId}`;
      return await this.tokenRepository.retrieve(tokenKey, false);
    } catch (error) {
      console.error('Error retrieving raw token:', error);
      return null;
    }
  }

  /**
   * Retrieves token metadata
   * 
   * @param employeeId The employee ID
   * @returns The metadata or null if not found
   */
  private async getMetadata(employeeId: string): Promise<TokenMetadata | null> {
    try {
      const metadataKey = `auth_token_metadata_${employeeId}`;
      const metadataStr = await this.tokenRepository.retrieve(
        metadataKey,
        false
      );
      if (!metadataStr) {
        return null;
      }

      return JSON.parse(metadataStr) as TokenMetadata;
    } catch (error) {
      console.error('Error retrieving metadata:', error);
      return null;
    }
  }

  /**
   * Gets or creates a unique device ID
   * 
   * @returns The device ID
   */
  private async getOrCreateDeviceID(): Promise<string> {
    try {
      let deviceID = await this.tokenRepository.retrieve(this.DEVICE_ID_KEY, false);
      
      if (!deviceID) {
        // Generate a new device ID using crypto.randomUUID()
        deviceID = crypto.randomUUID();
        await this.tokenRepository.store(this.DEVICE_ID_KEY, deviceID, false);
      }

      return deviceID;
    } catch (error) {
      console.error('Error getting or creating device ID:', error);
      throw new Error('Failed to get or create device ID');
    }
  }

  /**
   * Migrates legacy single-user token to employee-keyed storage
   * 
   * @param employeeId The employee ID to migrate the token to
   * @returns True if migration was performed, false if no legacy token exists
   */
  async migrateSingleUserToken(employeeId: string): Promise<boolean> {
    try {
      // Check for legacy token
      const legacyToken = await this.tokenRepository.retrieve('auth_token', false);
      if (!legacyToken) {
        return false;
      }
      
      console.log('[TokenService] Found legacy token, migrating to employee:', employeeId);
      
      // Check if employee already has token
      const tokenKey = `auth_token_${employeeId}`;
      const existingToken = await this.tokenRepository.retrieve(tokenKey, false);
      if (existingToken) {
        // Delete legacy only
        console.log('[TokenService] Employee already has token, deleting legacy only');
        await this.tokenRepository.delete('auth_token');
        await this.tokenRepository.delete('auth_token_metadata');
        return true;
      }
      
      // Migrate token
      await this.tokenRepository.store(tokenKey, legacyToken, false);
      
      // Migrate metadata
      const legacyMetadata = await this.tokenRepository.retrieve('auth_token_metadata', false);
      if (legacyMetadata) {
        const metadataKey = `auth_token_metadata_${employeeId}`;
        await this.tokenRepository.store(metadataKey, legacyMetadata, false);
      }
      
      // Delete legacy records
      await this.tokenRepository.delete('auth_token');
      await this.tokenRepository.delete('auth_token_metadata');
      
      console.log('[TokenService] Migrated legacy token to employee', employeeId);
      return true;
    } catch (error) {
      console.error('[TokenService] Token migration failed:', error);
      return false;
    }
  }
}
