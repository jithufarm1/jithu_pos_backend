import { TestBed } from '@angular/core/testing';
import { TokenService } from './token.service';
import { TokenRepository } from '../repositories/token.repository';
import { CryptoService } from './crypto.service';
import * as fc from 'fast-check';

describe('TokenService', () => {
  let service: TokenService;
  let repository: TokenRepository;
  const testEmployeeId = 'EMP001';

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenService);
    repository = TestBed.inject(TokenRepository);
  });

  afterEach(() => {
    // Clean up localStorage after each test
    localStorage.clear();
    
    // Clean up IndexedDB
    const dbName = 'valvoline-pos-db';
    const deleteRequest = indexedDB.deleteDatabase(dbName);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Token Storage', () => {
    it('should store a token', async () => {
      const token = 'test-jwt-token';
      await service.storeToken(testEmployeeId, token, false);
      
      const hasToken = service.hasToken();
      expect(hasToken).toBe(true);
    });

    it('should retrieve a stored token', async () => {
      const token = 'test-jwt-token';
      await service.storeToken(testEmployeeId, token, false);
      
      const retrievedToken = await service.getToken(testEmployeeId);
      expect(retrievedToken).toBe(token);
    });

    it('should delete a token', async () => {
      const token = 'test-jwt-token';
      await service.storeToken(testEmployeeId, token, false);
      
      await service.deleteToken(testEmployeeId);
      
      const hasToken = service.hasToken();
      expect(hasToken).toBe(false);
    });
  });

  describe('Token Locking', () => {
    it('should store a token as locked', async () => {
      const token = 'test-jwt-token';
      await service.storeToken(testEmployeeId, token, true);
      
      const isLocked = await service.isTokenLocked(testEmployeeId);
      expect(isLocked).toBe(true);
    });

    it('should store a token as unlocked', async () => {
      const token = 'test-jwt-token';
      await service.storeToken(testEmployeeId, token, false);
      
      const isLocked = await service.isTokenLocked(testEmployeeId);
      expect(isLocked).toBe(false);
    });

    it('should lock a token', async () => {
      const token = 'test-jwt-token';
      await service.storeToken(testEmployeeId, token, false);
      
      await service.lockToken(testEmployeeId);
      
      const isLocked = await service.isTokenLocked(testEmployeeId);
      expect(isLocked).toBe(true);
    });

    it('should unlock a token', async () => {
      const token = 'test-jwt-token';
      await service.storeToken(testEmployeeId, token, true);
      
      await service.unlockToken(testEmployeeId);
      
      const isLocked = await service.isTokenLocked(testEmployeeId);
      expect(isLocked).toBe(false);
    });

    it('should return null when getting locked token', async () => {
      const token = 'test-jwt-token';
      await service.storeToken(testEmployeeId, token, true);
      
      const retrievedToken = await service.getToken(testEmployeeId);
      expect(retrievedToken).toBeNull();
    });

    it('should return token when getting unlocked token', async () => {
      const token = 'test-jwt-token';
      await service.storeToken(testEmployeeId, token, false);
      
      const retrievedToken = await service.getToken(testEmployeeId);
      expect(retrievedToken).toBe(token);
    });
  });

  describe('Last Sync Time', () => {
    it('should store last sync time when storing token', async () => {
      const token = 'test-jwt-token';
      const beforeTime = new Date();
      
      await service.storeToken(testEmployeeId, token, false);
      
      const afterTime = new Date();
      const lastSyncTime = await service.getLastSyncTime(testEmployeeId);
      
      expect(lastSyncTime).toBeTruthy();
      expect(lastSyncTime!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(lastSyncTime!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should update last sync time', async () => {
      const token = 'test-jwt-token';
      await service.storeToken(testEmployeeId, token, false);
      
      const firstSyncTime = await service.getLastSyncTime(testEmployeeId);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await service.updateLastSyncTime(testEmployeeId);
      
      const secondSyncTime = await service.getLastSyncTime(testEmployeeId);
      
      expect(secondSyncTime!.getTime()).toBeGreaterThan(firstSyncTime!.getTime());
    });
  });

  describe('Device ID', () => {
    it('should generate a device ID', async () => {
      const token = 'test-jwt-token';
      await service.storeToken(testEmployeeId, token, false);
      
      const deviceID = await service.getDeviceID();
      expect(deviceID).toBeTruthy();
      expect(typeof deviceID).toBe('string');
    });

    it('should return the same device ID on subsequent calls', async () => {
      const token = 'test-jwt-token';
      await service.storeToken(testEmployeeId, token, false);
      
      const deviceID1 = await service.getDeviceID();
      const deviceID2 = await service.getDeviceID();
      
      expect(deviceID1).toBe(deviceID2);
    });
  });

  describe('Property-Based Tests', () => {
    describe('Property 5: Logout preserves locked token', () => {
      it('should preserve token when locking it', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 10, maxLength: 200 }),
            async (token) => {
              // Clean up before each iteration
              localStorage.clear();
              
              // Store token as unlocked
              await service.storeToken(testEmployeeId, token, false);
              
              // Lock the token (simulating logout)
              await service.lockToken(testEmployeeId);
              
              // Token should still exist
              const hasToken = service.hasToken();
              expect(hasToken).toBe(true);
              
              // Token should be locked
              const isLocked = await service.isTokenLocked(testEmployeeId);
              expect(isLocked).toBe(true);
              
              // Raw token should still be retrievable
              const rawToken = await service.getRawToken(testEmployeeId);
              expect(rawToken).toBe(token);
            }
          ),
          { numRuns: 5 }
        );
      });
    });

    describe('Property 7: Locked token blocks resource access', () => {
      it('should return null for locked tokens', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 10, maxLength: 200 }),
            async (token) => {
              // Clean up before each iteration
              localStorage.clear();
              
              // Store token as locked
              await service.storeToken(testEmployeeId, token, true);
              
              // getToken() should return null for locked tokens
              const retrievedToken = await service.getToken(testEmployeeId);
              expect(retrievedToken).toBeNull();
            }
          ),
          { numRuns: 5 }
        );
      });
    });

    describe('Property 9: Successful authentication unlocks token', () => {
      it('should unlock token and make it accessible', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 10, maxLength: 200 }),
            async (token) => {
              // Clean up before each iteration
              localStorage.clear();
              
              // Store token as locked
              await service.storeToken(testEmployeeId, token, true);
              
              // Verify it's locked
              const isLockedBefore = await service.isTokenLocked(testEmployeeId);
              expect(isLockedBefore).toBe(true);
              
              // Unlock token (simulating successful auth)
              await service.unlockToken(testEmployeeId);
              
              // Token should be unlocked
              const isLockedAfter = await service.isTokenLocked(testEmployeeId);
              expect(isLockedAfter).toBe(false);
              
              // Token should be accessible
              const retrievedToken = await service.getToken(testEmployeeId);
              expect(retrievedToken).toBe(token);
            }
          ),
          { numRuns: 5 }
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing token gracefully', async () => {
      const token = await service.getToken(testEmployeeId);
      expect(token).toBeNull();
    });

    it('should handle missing metadata gracefully', async () => {
      const isLocked = await service.isTokenLocked(testEmployeeId);
      expect(isLocked).toBe(false);
    });

    it('should handle lock operation on non-existent token', async () => {
      await expectAsync(service.lockToken(testEmployeeId)).toBeRejected();
    });

    it('should handle unlock operation on non-existent token', async () => {
      await expectAsync(service.unlockToken(testEmployeeId)).toBeRejected();
    });
  });
});
