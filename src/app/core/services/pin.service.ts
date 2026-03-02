import { Injectable } from '@angular/core';
import { PINRepository } from '../repositories/pin.repository';
import { CryptoService } from './crypto.service';

/**
 * PINService manages PIN creation, validation, verification, and attempt tracking
 * for offline authentication
 */
@Injectable({
  providedIn: 'root'
})
export class PINService {
  private readonly MAX_ATTEMPTS = 3;

  constructor(
    private pinRepository: PINRepository,
    private cryptoService: CryptoService
  ) {}

  /**
   * Creates a new PIN after validation
   * 
   * @param employeeId The employee ID to associate with the PIN
   * @param pin The PIN to create (must be 4-6 digits)
   * @throws Error if PIN is invalid
   */
  async createPIN(employeeId: string, pin: string): Promise<void> {
    console.log('[PINService] createPIN called for employee:', employeeId, 'PIN length:', pin?.length);
    
    if (!this.validatePINFormat(pin)) {
      console.error('[PINService] Invalid PIN format');
      throw new Error('PIN must be between 4 and 6 digits');
    }

    try {
      console.log('[PINService] Hashing PIN...');
      const hash = await this.cryptoService.hashPIN(pin);
      console.log('[PINService] PIN hashed successfully, hash length:', hash?.length);
      
      console.log('[PINService] Storing PIN hash...');
      await this.pinRepository.storePINHash(employeeId, hash);
      console.log('[PINService] PIN hash stored successfully');
      
      // Reset attempts when creating new PIN
      console.log('[PINService] Resetting attempt count...');
      await this.pinRepository.storeAttemptCount(employeeId, 0);
      console.log('[PINService] Resetting lock status...');
      await this.pinRepository.storeLockStatus(employeeId, false);
      console.log('[PINService] PIN creation complete');
    } catch (error: any) {
      console.error('[PINService] Error creating PIN:', error);
      console.error('[PINService] Error message:', error?.message);
      console.error('[PINService] Error stack:', error?.stack);
      throw new Error('Failed to create PIN: ' + (error?.message || 'Unknown error'));
    }
  }

  /**
   * Verifies a PIN against the stored hash
   * 
   * @param employeeId The employee ID
   * @param pin The PIN to verify
   * @returns True if PIN is valid, false otherwise
   */
  async verifyPIN(employeeId: string, pin: string): Promise<boolean> {
    try {
      // Check if locked
      const locked = await this.isLocked(employeeId);
      if (locked) {
        throw new Error('PIN is locked due to too many failed attempts');
      }

      // Get stored hash
      const storedHash = await this.pinRepository.getPINHash(employeeId);
      if (!storedHash) {
        return false;
      }

      // Verify PIN
      const isValid = await this.cryptoService.verifyPINHash(pin, storedHash);
      
      return isValid;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      throw error;
    }
  }

  /**
   * Checks if a PIN exists for an employee
   * 
   * @param employeeId The employee ID
   * @returns True if PIN exists, false otherwise
   */
  async hasPIN(employeeId: string): Promise<boolean> {
    try {
      const hash = await this.pinRepository.getPINHash(employeeId);
      return hash !== null;
    } catch (error) {
      console.error('Error checking PIN existence:', error);
      return false;
    }
  }

  /**
   * Records a failed PIN attempt and increments the counter
   * 
   * @param employeeId The employee ID
   * @returns The new attempt count
   */
  async recordFailedAttempt(employeeId: string): Promise<number> {
    try {
      const currentCount = await this.pinRepository.getAttemptCount(employeeId);
      const newCount = currentCount + 1;
      
      await this.pinRepository.storeAttemptCount(employeeId, newCount);
      
      // Lock if max attempts reached
      if (newCount >= this.MAX_ATTEMPTS) {
        await this.pinRepository.storeLockStatus(employeeId, true);
      }
      
      return newCount;
    } catch (error) {
      console.error('Error recording failed attempt:', error);
      throw new Error('Failed to record attempt');
    }
  }

  /**
   * Resets the failed attempt counter to zero
   * 
   * @param employeeId The employee ID
   */
  async resetAttempts(employeeId: string): Promise<void> {
    try {
      await this.pinRepository.storeAttemptCount(employeeId, 0);
      await this.pinRepository.storeLockStatus(employeeId, false);
    } catch (error) {
      console.error('Error resetting attempts:', error);
      throw new Error('Failed to reset attempts');
    }
  }

  /**
   * Gets the number of remaining PIN attempts
   * 
   * @param employeeId The employee ID
   * @returns Number of attempts remaining (0-3)
   */
  async getRemainingAttempts(employeeId: string): Promise<number> {
    try {
      const currentCount = await this.pinRepository.getAttemptCount(employeeId);
      return Math.max(0, this.MAX_ATTEMPTS - currentCount);
    } catch (error) {
      console.error('Error getting remaining attempts:', error);
      return 0;
    }
  }

  /**
   * Checks if the PIN is locked due to too many failed attempts
   * 
   * @param employeeId The employee ID
   * @returns True if locked, false otherwise
   */
  async isLocked(employeeId: string): Promise<boolean> {
    try {
      return await this.pinRepository.isLocked(employeeId);
    } catch (error) {
      console.error('Error checking lock status:', error);
      return false;
    }
  }

  /**
   * Validates PIN format (4-6 digits)
   * 
   * @param pin The PIN to validate
   * @returns True if valid format, false otherwise
   */
  private validatePINFormat(pin: string): boolean {
    // Must be 4-6 digits only
    const pinRegex = /^\d{4,6}$/;
    return pinRegex.test(pin);
  }

  /**
   * Public method to validate PIN format (for UI validation)
   * 
   * @param pin The PIN to validate
   * @returns True if valid format, false otherwise
   */
  isValidPINFormat(pin: string): boolean {
    return this.validatePINFormat(pin);
  }
}
