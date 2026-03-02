import { Injectable } from '@angular/core';
import * as bcrypt from 'bcryptjs';

/**
 * CryptoService provides cryptographic operations for offline authentication
 * including device key management, encryption/decryption, and PIN hashing.
 */
@Injectable({
  providedIn: 'root'
})
export class CryptoService {
  private readonly DB_NAME = 'vehicle-pos-db';
  private readonly DB_VERSION = 7;
  private readonly DEVICE_KEY_STORE = 'device-keys';
  private readonly DEVICE_KEY_ID = 'primary-device-key';
  private readonly BCRYPT_WORK_FACTOR = 10;

  constructor() {}

  /**
   * Gets or creates a device-specific cryptographic key.
   * The key is stored in IndexedDB with non-extractable flag for security.
   * 
   * @returns Promise<CryptoKey> The device key for encryption operations
   */
  async getOrCreateDeviceKey(): Promise<CryptoKey> {
    console.log('[CryptoService] getOrCreateDeviceKey called');
    
    try {
      // Try to retrieve existing key
      console.log('[CryptoService] Retrieving existing device key...');
      const existingKey = await this.retrieveDeviceKey();
      if (existingKey) {
        console.log('[CryptoService] Existing device key found');
        return existingKey;
      }

      // Generate new key if none exists
      console.log('[CryptoService] No existing key, generating new device key...');
      const key = await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        false, // non-extractable for security
        ['encrypt', 'decrypt']
      );
      console.log('[CryptoService] Device key generated');

      // Store the key in IndexedDB
      console.log('[CryptoService] Storing device key...');
      await this.storeDeviceKey(key);
      console.log('[CryptoService] Device key stored');
      
      return key;
    } catch (error: any) {
      console.error('[CryptoService] Error getting or creating device key:', error);
      console.error('[CryptoService] Error message:', error?.message);
      console.error('[CryptoService] Error stack:', error?.stack);
      throw new Error('Failed to initialize device encryption key: ' + (error?.message || 'Unknown error'));
    }
  }

  /**
   * Retrieves the device key from IndexedDB.
   * 
   * @returns Promise<CryptoKey | null> The stored key or null if not found
   */
  private async retrieveDeviceKey(): Promise<CryptoKey | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains(this.DEVICE_KEY_STORE)) {
          resolve(null);
          return;
        }

        const transaction = db.transaction([this.DEVICE_KEY_STORE], 'readonly');
        const store = transaction.objectStore(this.DEVICE_KEY_STORE);
        const getRequest = store.get(this.DEVICE_KEY_ID);

        getRequest.onsuccess = () => {
          resolve(getRequest.result?.key || null);
        };

        getRequest.onerror = () => reject(getRequest.error);
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.DEVICE_KEY_STORE)) {
          db.createObjectStore(this.DEVICE_KEY_STORE, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Stores the device key in IndexedDB.
   * 
   * @param key The CryptoKey to store
   */
  private async storeDeviceKey(key: CryptoKey): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.DEVICE_KEY_STORE], 'readwrite');
        const store = transaction.objectStore(this.DEVICE_KEY_STORE);
        
        const putRequest = store.put({
          id: this.DEVICE_KEY_ID,
          key: key,
          createdAt: new Date().toISOString()
        });

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.DEVICE_KEY_STORE)) {
          db.createObjectStore(this.DEVICE_KEY_STORE, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Encrypts data using AES-GCM with the device key.
   * 
   * @param data Plain text data to encrypt
   * @param key CryptoKey to use for encryption
   * @returns Promise<string> Base64-encoded encrypted data with IV
   */
  async encrypt(data: string, key: CryptoKey): Promise<string> {
    console.log('[CryptoService] encrypt called');
    
    try {
      // Generate a random initialization vector
      console.log('[CryptoService] Generating IV...');
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      // Encode the data
      console.log('[CryptoService] Encoding data...');
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(data);

      // Encrypt the data
      console.log('[CryptoService] Encrypting data...');
      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encodedData
      );
      console.log('[CryptoService] Data encrypted');

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedData), iv.length);

      // Convert to base64 for storage
      console.log('[CryptoService] Converting to base64...');
      const result = this.arrayBufferToBase64(combined);
      console.log('[CryptoService] Encryption complete');
      
      return result;
    } catch (error: any) {
      console.error('[CryptoService] Encryption error:', error);
      console.error('[CryptoService] Error message:', error?.message);
      console.error('[CryptoService] Error stack:', error?.stack);
      throw new Error('Failed to encrypt data: ' + (error?.message || 'Unknown error'));
    }
  }

  /**
   * Decrypts data using AES-GCM with the device key.
   * 
   * @param encryptedData Base64-encoded encrypted data with IV
   * @param key CryptoKey to use for decryption
   * @returns Promise<string> Decrypted plain text data
   */
  async decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
    try {
      // Convert from base64
      const combined = this.base64ToArrayBuffer(encryptedData);
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      // Decrypt the data
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        data
      );

      // Decode the data
      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hashes a PIN using bcrypt with work factor 10.
   * 
   * @param pin The PIN to hash (4-6 digits)
   * @returns Promise<string> The bcrypt hash
   */
  async hashPIN(pin: string): Promise<string> {
    console.log('[CryptoService] hashPIN called');
    
    try {
      // Check if bcrypt is available
      if (typeof bcrypt === 'undefined' || !bcrypt) {
        console.error('[CryptoService] bcrypt is not available');
        throw new Error('bcrypt library not loaded');
      }
      
      console.log('[CryptoService] Generating salt...');
      const salt = await bcrypt.genSalt(this.BCRYPT_WORK_FACTOR);
      console.log('[CryptoService] Salt generated, hashing PIN...');
      
      const hash = await bcrypt.hash(pin, salt);
      console.log('[CryptoService] PIN hashed successfully');
      
      return hash;
    } catch (error: any) {
      console.error('[CryptoService] PIN hashing error:', error);
      console.error('[CryptoService] Error message:', error?.message);
      console.error('[CryptoService] Error stack:', error?.stack);
      throw new Error('Failed to hash PIN: ' + (error?.message || 'Unknown error'));
    }
  }

  /**
   * Verifies a PIN against a bcrypt hash.
   * 
   * @param pin The PIN to verify
   * @param hash The bcrypt hash to compare against
   * @returns Promise<boolean> True if PIN matches hash
   */
  async verifyPINHash(pin: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(pin, hash);
    } catch (error) {
      console.error('PIN verification error:', error);
      throw new Error('Failed to verify PIN');
    }
  }

  /**
   * Converts an ArrayBuffer to a base64 string.
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  /**
   * Converts a base64 string to an ArrayBuffer.
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
