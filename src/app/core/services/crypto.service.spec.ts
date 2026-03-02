import { TestBed } from '@angular/core/testing';
import { CryptoService } from './crypto.service';
import * as fc from 'fast-check';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CryptoService);
  });

  afterEach(async () => {
    // Clean up IndexedDB after each test
    const dbName = 'valvoline-pos-db';
    const deleteRequest = indexedDB.deleteDatabase(dbName);
    await new Promise<void>((resolve) => {
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve();
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Device Key Management', () => {
    it('should generate a device key', async () => {
      const key = await service.getOrCreateDeviceKey();
      expect(key).toBeTruthy();
      expect(key.type).toBe('secret');
      expect(key.algorithm.name).toBe('AES-GCM');
    });

    it('should return the same key on subsequent calls', async () => {
      const key1 = await service.getOrCreateDeviceKey();
      const key2 = await service.getOrCreateDeviceKey();
      
      // Keys should be the same object
      expect(key1).toBe(key2);
    });
  });

  describe('Encryption and Decryption', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const key = await service.getOrCreateDeviceKey();
      const plainText = 'sensitive data';
      
      const encrypted = await service.encrypt(plainText, key);
      const decrypted = await service.decrypt(encrypted, key);
      
      expect(decrypted).toBe(plainText);
      expect(encrypted).not.toBe(plainText);
    });

    it('should produce different encrypted values for the same input', async () => {
      const key = await service.getOrCreateDeviceKey();
      const plainText = 'test data';
      
      const encrypted1 = await service.encrypt(plainText, key);
      const encrypted2 = await service.encrypt(plainText, key);
      
      // Different IVs should produce different ciphertexts
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same value
      const decrypted1 = await service.decrypt(encrypted1, key);
      const decrypted2 = await service.decrypt(encrypted2, key);
      expect(decrypted1).toBe(plainText);
      expect(decrypted2).toBe(plainText);
    });

    it('should fail to decrypt with wrong key', async () => {
      const key1 = await service.getOrCreateDeviceKey();
      
      // Generate a different key
      const key2 = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      
      const plainText = 'secret';
      const encrypted = await service.encrypt(plainText, key1);
      
      await expectAsync(service.decrypt(encrypted, key2)).toBeRejected();
    });
  });

  describe('PIN Hashing', () => {
    it('should hash a PIN', async () => {
      const pin = '1234';
      const hash = await service.hashPIN(pin);
      
      expect(hash).toBeTruthy();
      expect(hash).not.toBe(pin);
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    });

    it('should verify a correct PIN', async () => {
      const pin = '5678';
      const hash = await service.hashPIN(pin);
      const isValid = await service.verifyPINHash(pin, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect PIN', async () => {
      const pin = '1234';
      const wrongPin = '5678';
      const hash = await service.hashPIN(pin);
      const isValid = await service.verifyPINHash(wrongPin, hash);
      
      expect(isValid).toBe(false);
    });

    it('should produce different hashes for the same PIN', async () => {
      const pin = '9999';
      const hash1 = await service.hashPIN(pin);
      const hash2 = await service.hashPIN(pin);
      
      // Different salts should produce different hashes
      expect(hash1).not.toBe(hash2);
      
      // But both should verify correctly
      expect(await service.verifyPINHash(pin, hash1)).toBe(true);
      expect(await service.verifyPINHash(pin, hash2)).toBe(true);
    });
  });

  describe('Property-Based Tests', () => {
    describe('Property: Encryption/decryption round-trip', () => {
      it('should successfully round-trip any string through encryption', async () => {
        const key = await service.getOrCreateDeviceKey();
        
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 0, maxLength: 1000 }),
            async (plainText) => {
              const encrypted = await service.encrypt(plainText, key);
              const decrypted = await service.decrypt(encrypted, key);
              expect(decrypted).toBe(plainText);
              expect(encrypted).not.toBe(plainText);
            }
          ),
          { numRuns: 5 }
        );
      });
    });

    describe('Property 2: PIN hashing produces bcrypt hashes', () => {
      it('should produce valid bcrypt hashes for any valid PIN', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.integer({ min: 1000, max: 999999 }).map(n => n.toString()),
            async (pin) => {
              const hash = await service.hashPIN(pin);
              
              // Hash should not equal the original PIN
              expect(hash).not.toBe(pin);
              
              // Hash should be a valid bcrypt hash (starts with $2a$ or $2b$)
              expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
              
              // Hash should verify correctly
              const isValid = await service.verifyPINHash(pin, hash);
              expect(isValid).toBe(true);
            }
          ),
          { numRuns: 3 } // Reduced runs due to bcrypt being slow
        );
      });
    });

    describe('Property 31: Bcrypt work factor minimum', () => {
      it('should use bcrypt work factor of at least 10', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.integer({ min: 1000, max: 999999 }).map(n => n.toString()),
            async (pin) => {
              const hash = await service.hashPIN(pin);
              
              // Extract work factor from bcrypt hash
              // Format: $2a$10$... where 10 is the work factor
              const parts = hash.split('$');
              const workFactor = parseInt(parts[2], 10);
              
              expect(workFactor).toBeGreaterThanOrEqual(10);
            }
          ),
          { numRuns: 3 } // Reduced runs due to bcrypt being slow
        );
      });
    });
  });
});
