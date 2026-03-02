import { TestBed } from '@angular/core/testing';
import { PINService } from './pin.service';
import { PINRepository } from '../repositories/pin.repository';
import { CryptoService } from './crypto.service';
import * as fc from 'fast-check';

describe('PINService', () => {
  let service: PINService;
  let repository: PINRepository;
  let cryptoService: CryptoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PINService);
    repository = TestBed.inject(PINRepository);
    cryptoService = TestBed.inject(CryptoService);
  });

  const testEmployeeId = 'EMP001';

  afterEach(async () => {
    // Clean up IndexedDB after each test
    try {
      await repository.deletePINData(testEmployeeId);
    } catch (e) {
      // Ignore errors during cleanup
    }
    
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

  describe('PIN Creation', () => {
    it('should create a valid PIN', async () => {
      const pin = '1234';
      await service.createPIN(testEmployeeId, pin);
      
      const hasPIN = await service.hasPIN(testEmployeeId);
      expect(hasPIN).toBe(true);
    });

    it('should reject PIN with less than 4 digits', async () => {
      const pin = '123';
      await expectAsync(service.createPIN(testEmployeeId, pin)).toBeRejected();
    });

    it('should reject PIN with more than 6 digits', async () => {
      const pin = '1234567';
      await expectAsync(service.createPIN(testEmployeeId, pin)).toBeRejected();
    });

    it('should reject PIN with non-numeric characters', async () => {
      const pin = '12ab';
      await expectAsync(service.createPIN(testEmployeeId, pin)).toBeRejected();
    });

    it('should accept 4-digit PIN', async () => {
      const pin = '1234';
      await expectAsync(service.createPIN(testEmployeeId, pin)).toBeResolved();
    });

    it('should accept 5-digit PIN', async () => {
      const pin = '12345';
      await expectAsync(service.createPIN(testEmployeeId, pin)).toBeResolved();
    });

    it('should accept 6-digit PIN', async () => {
      const pin = '123456';
      await expectAsync(service.createPIN(testEmployeeId, pin)).toBeResolved();
    });
  });

  describe('PIN Verification', () => {
    it('should verify correct PIN', async () => {
      const pin = '5678';
      await service.createPIN(testEmployeeId, pin);
      
      const isValid = await service.verifyPIN(testEmployeeId, pin);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect PIN', async () => {
      const pin = '1234';
      const wrongPin = '5678';
      await service.createPIN(testEmployeeId, pin);
      
      const isValid = await service.verifyPIN(testEmployeeId, wrongPin);
      expect(isValid).toBe(false);
    });

    it('should return false when no PIN exists', async () => {
      const isValid = await service.verifyPIN(testEmployeeId, '1234');
      expect(isValid).toBe(false);
    });
  });

  describe('Attempt Tracking', () => {
    it('should start with 3 remaining attempts', async () => {
      const pin = '1234';
      await service.createPIN(testEmployeeId, pin);
      
      const remaining = await service.getRemainingAttempts(testEmployeeId);
      expect(remaining).toBe(3);
    });

    it('should decrement remaining attempts on failed attempt', async () => {
      const pin = '1234';
      await service.createPIN(testEmployeeId, pin);
      
      await service.recordFailedAttempt(testEmployeeId);
      const remaining = await service.getRemainingAttempts(testEmployeeId);
      expect(remaining).toBe(2);
    });

    it('should lock after 3 failed attempts', async () => {
      const pin = '1234';
      await service.createPIN(testEmployeeId, pin);
      
      await service.recordFailedAttempt(testEmployeeId);
      await service.recordFailedAttempt(testEmployeeId);
      await service.recordFailedAttempt(testEmployeeId);
      
      const isLocked = await service.isLocked(testEmployeeId);
      expect(isLocked).toBe(true);
    });

    it('should throw error when verifying locked PIN', async () => {
      const pin = '1234';
      await service.createPIN(testEmployeeId, pin);
      
      await service.recordFailedAttempt(testEmployeeId);
      await service.recordFailedAttempt(testEmployeeId);
      await service.recordFailedAttempt(testEmployeeId);
      
      await expectAsync(service.verifyPIN(testEmployeeId, pin)).toBeRejected();
    });

    it('should reset attempts', async () => {
      const pin = '1234';
      await service.createPIN(testEmployeeId, pin);
      
      await service.recordFailedAttempt(testEmployeeId);
      await service.recordFailedAttempt(testEmployeeId);
      
      await service.resetAttempts(testEmployeeId);
      
      const remaining = await service.getRemainingAttempts(testEmployeeId);
      expect(remaining).toBe(3);
      
      const isLocked = await service.isLocked(testEmployeeId);
      expect(isLocked).toBe(false);
    });
  });

  describe('Property-Based Tests', () => {
    describe('Property 1: PIN validation accepts only 4-6 digit strings', () => {
      it('should accept any 4-6 digit string', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.integer({ min: 1000, max: 999999 }).map(n => n.toString()),
            async (pin) => {
              const isValid = service.isValidPINFormat(pin);
              
              if (pin.length >= 4 && pin.length <= 6) {
                expect(isValid).toBe(true);
              } else {
                expect(isValid).toBe(false);
              }
            }
          ),
          { numRuns: 5 }
        );
      });

      it('should reject non-numeric strings', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 4, maxLength: 6 }).filter(s => !/^\d+$/.test(s)),
            async (pin) => {
              const isValid = service.isValidPINFormat(pin);
              expect(isValid).toBe(false);
            }
          ),
          { numRuns: 10 }
        );
      });
    });

    describe('Property 3: PIN storage round-trip', () => {
      it('should store and retrieve PIN hash correctly', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.integer({ min: 1000, max: 999999 }).map(n => n.toString()),
            async (pin) => {
              // Clean up before each iteration
              try {
                await repository.deletePINData(testEmployeeId);
              } catch (e) {}
              
              await service.createPIN(testEmployeeId, pin);
              const hasPIN = await service.hasPIN(testEmployeeId);
              expect(hasPIN).toBe(true);
              
              const isValid = await service.verifyPIN(testEmployeeId, pin);
              expect(isValid).toBe(true);
            }
          ),
          { numRuns: 3 } // Reduced due to bcrypt being slow
        );
      });
    });

    describe('Property 8: PIN verification uses bcrypt comparison', () => {
      it('should verify PIN using bcrypt', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.integer({ min: 1000, max: 999999 }).map(n => n.toString()),
            async (pin) => {
              // Clean up before each iteration
              try {
                await repository.deletePINData(testEmployeeId);
              } catch (e) {}
              
              await service.createPIN(testEmployeeId, pin);
              
              // Correct PIN should verify
              const isValid = await service.verifyPIN(testEmployeeId, pin);
              expect(isValid).toBe(true);
              
              // Wrong PIN should not verify
              const wrongPin = (parseInt(pin) + 1).toString().padStart(pin.length, '0');
              if (wrongPin.length >= 4 && wrongPin.length <= 6) {
                const isInvalid = await service.verifyPIN(testEmployeeId, wrongPin);
                expect(isInvalid).toBe(false);
              }
            }
          ),
          { numRuns: 3 } // Reduced due to bcrypt being slow
        );
      });
    });

    describe('Property 10: Failed attempts increment counter', () => {
      it('should increment counter by exactly 1 for each failed attempt', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.integer({ min: 0, max: 2 }),
            async (initialAttempts) => {
              // Clean up and setup
              try {
                await repository.deletePINData(testEmployeeId);
              } catch (e) {}
              
              await service.createPIN(testEmployeeId, '1234');
              
              // Set initial attempts
              for (let i = 0; i < initialAttempts; i++) {
                await service.recordFailedAttempt(testEmployeeId);
              }
              
              const beforeCount = await repository.getAttemptCount(testEmployeeId);
              await service.recordFailedAttempt(testEmployeeId);
              const afterCount = await repository.getAttemptCount(testEmployeeId);
              
              expect(afterCount).toBe(beforeCount + 1);
            }
          ),
          { numRuns: 5 }
        );
      });
    });

    describe('Property 11: Successful authentication resets attempt counter', () => {
      it('should reset counter to 0 after successful auth', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.integer({ min: 1, max: 2 }),
            async (failedAttempts) => {
              // Clean up and setup
              try {
                await repository.deletePINData(testEmployeeId);
              } catch (e) {}
              
              await service.createPIN(testEmployeeId, '1234');
              
              // Record some failed attempts
              for (let i = 0; i < failedAttempts; i++) {
                await service.recordFailedAttempt(testEmployeeId);
              }
              
              const beforeCount = await repository.getAttemptCount(testEmployeeId);
              expect(beforeCount).toBeGreaterThan(0);
              
              // Reset attempts (simulating successful auth)
              await service.resetAttempts(testEmployeeId);
              
              const afterCount = await repository.getAttemptCount(testEmployeeId);
              expect(afterCount).toBe(0);
            }
          ),
          { numRuns: 5 }
        );
      });
    });
  });

  describe('Unit Test: 3-attempt lockout edge case', () => {
    it('should lock exactly after 3 failed attempts', async () => {
      const pin = '1234';
      await service.createPIN(testEmployeeId, pin);
      
      // First attempt
      await service.recordFailedAttempt(testEmployeeId);
      expect(await service.isLocked(testEmployeeId)).toBe(false);
      expect(await service.getRemainingAttempts(testEmployeeId)).toBe(2);
      
      // Second attempt
      await service.recordFailedAttempt(testEmployeeId);
      expect(await service.isLocked(testEmployeeId)).toBe(false);
      expect(await service.getRemainingAttempts(testEmployeeId)).toBe(1);
      
      // Third attempt - should lock
      await service.recordFailedAttempt(testEmployeeId);
      expect(await service.isLocked(testEmployeeId)).toBe(true);
      expect(await service.getRemainingAttempts(testEmployeeId)).toBe(0);
    });
  });
});
