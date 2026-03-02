import { Injectable } from '@angular/core';
import { OverrideRepository, OverrideCode, OverrideUsage } from '../repositories/override.repository';
import { ConfigRepository } from '../repositories/config.repository';
import { EmergencyTokenRepository } from '../repositories/emergency-token.repository';
import { CryptoService } from './crypto.service';

@Injectable({
  providedIn: 'root'
})
export class OverrideService {
  constructor(
    private overrideRepository: OverrideRepository,
    private configRepository: ConfigRepository,
    private emergencyTokenRepository: EmergencyTokenRepository,
    private cryptoService: CryptoService
  ) {}

  /**
   * Cache override codes received from backend
   */
  async cacheOverrideCodes(codes: OverrideCode[]): Promise<void> {
    await this.overrideRepository.cacheOverrideCodes(codes);
  }

  /**
   * Verify if an override code is valid
   * Checks:
   * - Code exists in cache
   * - Code is not expired
   * - Code is within valid time window
   */
  async verifyOverrideCode(code: string): Promise<boolean> {
    const codes = await this.overrideRepository.getOverrideCodes();
    if (!codes || codes.length === 0) {
      return false;
    }

    const now = new Date();
    const matchingCode = codes.find(c => 
      c.code === code &&
      now >= c.validFrom &&
      now <= c.validUntil
    );

    return !!matchingCode;
  }

  /**
   * Get the manager ID associated with an override code
   */
  async getManagerIDForCode(code: string): Promise<string | null> {
    const codes = await this.overrideRepository.getOverrideCodes();
    if (!codes) {
      return null;
    }

    const matchingCode = codes.find(c => c.code === code);
    return matchingCode?.managerID || null;
  }

  /**
   * Record override usage
   * Increments usage counter and stores manager/employee pair
   */
  async recordOverrideUsage(managerID: string, employeeID: string, code: string): Promise<void> {
    const config = await this.configRepository.getConfig();
    const usage: OverrideUsage = {
      timestamp: new Date(),
      managerID,
      employeeID,
      code,
      daysExtended: config.overrideExtensionDays
    };

    await this.overrideRepository.storeOverrideUsage(usage);
  }

  /**
   * Get remaining override count (max 3 by default)
   */
  async getRemainingOverrides(): Promise<number> {
    return await this.overrideRepository.getRemainingOverrides();
  }

  /**
   * Check if override usage limit has been reached
   */
  async isOverrideLimitReached(): Promise<boolean> {
    const remaining = await this.getRemainingOverrides();
    return remaining <= 0;
  }

  /**
   * Get override extension days from configuration
   */
  async getOverrideExtensionDays(): Promise<number> {
    const config = await this.configRepository.getConfig();
    return config.overrideExtensionDays;
  }

  /**
   * Clear all override data (used during remote invalidation)
   */
  async clearOverrideCache(): Promise<void> {
    await this.overrideRepository.clearOverrideCache();
  }

  // ========== Emergency Token Methods ==========

  /**
   * Generate a new emergency token
   * Uses crypto.randomUUID() for secure random generation
   */
  async generateEmergencyToken(): Promise<string> {
    return crypto.randomUUID();
  }

  /**
   * Store emergency token with security question and answer
   */
  async storeEmergencyToken(
    token: string,
    securityQuestion: string,
    securityAnswer: string
  ): Promise<void> {
    const config = await this.configRepository.getConfig();
    const validityDays = config.emergencyTokenValidityDays;

    // Hash the security answer
    const answerHash = await this.cryptoService.hashPIN(securityAnswer);

    await this.emergencyTokenRepository.storeEmergencyToken(
      token,
      validityDays,
      securityQuestion,
      answerHash
    );
  }

  /**
   * Verify emergency token with PIN and security answer
   * Returns true only if:
   * - Token exists and is not expired
   * - Security answer matches
   * - Token has not been used before
   */
  async verifyEmergencyToken(
    pin: string,
    securityAnswer: string
  ): Promise<boolean> {
    const storage = await this.emergencyTokenRepository.getEmergencyToken();
    if (!storage) {
      return false;
    }

    // Check if token has been used
    if (storage.used) {
      return false;
    }

    // Verify security answer
    const answerValid = await this.cryptoService.verifyPINHash(
      securityAnswer,
      storage.securityAnswerHash
    );

    return answerValid;
  }

  /**
   * Get the decrypted emergency token
   * Should only be called after verification
   */
  async getEmergencyToken(): Promise<string | null> {
    const storage = await this.emergencyTokenRepository.getEmergencyToken();
    if (!storage) {
      return null;
    }

    return await this.emergencyTokenRepository.decryptEmergencyToken(storage);
  }

  /**
   * Mark emergency token as used
   */
  async markEmergencyTokenUsed(): Promise<void> {
    await this.emergencyTokenRepository.markTokenAsUsed();
  }

  /**
   * Check if a valid emergency token exists
   */
  async hasValidEmergencyToken(): Promise<boolean> {
    return await this.emergencyTokenRepository.hasValidEmergencyToken();
  }

  /**
   * Clear emergency token (used during remote invalidation)
   */
  async clearEmergencyToken(): Promise<void> {
    await this.emergencyTokenRepository.clearEmergencyToken();
  }
}
