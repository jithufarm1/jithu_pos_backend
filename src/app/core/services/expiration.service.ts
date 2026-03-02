import { Injectable } from '@angular/core';
import { ConfigRepository, ExpirationConfig } from '../repositories/config.repository';
import { TokenService } from './token.service';

/**
 * Expiration tier enum
 * Represents the current authentication restriction level
 */
export enum ExpirationTier {
  NORMAL = 'normal',
  WARNING = 'warning',
  GRACE = 'grace',
  OVERRIDE_REQUIRED = 'override_required'
}

/**
 * ExpirationService manages tier calculation based on last sync time
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */
@Injectable({
  providedIn: 'root'
})
export class ExpirationService {
  constructor(
    private configRepository: ConfigRepository,
    private tokenService: TokenService
  ) {}

  /**
   * Get the current expiration tier based on days since last sync
   * 
   * Tier logic:
   * - NORMAL: 0 to normalPeriodDays (default: 0-7 days)
   * - WARNING: normalPeriodDays to gracePeriodDays (default: 7-14 days)
   * - GRACE: gracePeriodDays to overrideRequiredDays (default: not used in current config)
   * - OVERRIDE_REQUIRED: overrideRequiredDays and beyond (default: 14+ days)
   * 
   * @param employeeId Optional employee ID
   * @returns The current expiration tier
   */
  async getCurrentTier(employeeId?: string): Promise<ExpirationTier> {
    const daysSinceSync = await this.getDaysSinceLastSync(employeeId);
    const config = await this.getConfig();

    if (daysSinceSync < config.normalPeriodDays) {
      return ExpirationTier.NORMAL;
    } else if (daysSinceSync < config.gracePeriodDays) {
      return ExpirationTier.WARNING;
    } else if (daysSinceSync < config.overrideRequiredDays) {
      return ExpirationTier.GRACE;
    } else {
      return ExpirationTier.OVERRIDE_REQUIRED;
    }
  }

  /**
   * Calculate days since last sync
   * 
   * @param employeeId Optional employee ID. If not provided, returns 0
   * @returns Number of days since last sync, or 0 if no sync time found
   */
  async getDaysSinceLastSync(employeeId?: string): Promise<number> {
    if (!employeeId) {
      return 0;
    }
    
    const lastSyncTime = await this.tokenService.getLastSyncTime(employeeId);
    
    if (!lastSyncTime) {
      return 0;
    }

    const now = new Date();
    const diffMs = now.getTime() - lastSyncTime.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  /**
   * Calculate days until the next tier
   * 
   * @returns Number of days until next tier, or 0 if already at override required
   */
  async getDaysUntilNextTier(): Promise<number> {
    const daysSinceSync = await this.getDaysSinceLastSync();
    const config = await this.getConfig();
    const currentTier = await this.getCurrentTier();

    switch (currentTier) {
      case ExpirationTier.NORMAL:
        return config.normalPeriodDays - daysSinceSync;
      case ExpirationTier.WARNING:
        return config.gracePeriodDays - daysSinceSync;
      case ExpirationTier.GRACE:
        return config.overrideRequiredDays - daysSinceSync;
      case ExpirationTier.OVERRIDE_REQUIRED:
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Get the current configuration
   * 
   * @returns The expiration configuration
   */
  async getConfig(): Promise<ExpirationConfig> {
    return await this.configRepository.getConfig();
  }

  /**
   * Update the configuration
   * 
   * @param config Partial configuration to update
   */
  async updateConfig(config: Partial<ExpirationConfig>): Promise<void> {
    await this.configRepository.storeConfig(config);
  }

  /**
   * Check if standard PIN authentication is allowed
   * 
   * @returns True if PIN auth is allowed, false if override/emergency required
   */
  async isPINAuthAllowed(): Promise<boolean> {
    const tier = await this.getCurrentTier();
    return tier !== ExpirationTier.OVERRIDE_REQUIRED;
  }

  /**
   * Get a user-friendly message for the current tier
   * 
   * @returns A message describing the current tier and actions needed
   */
  async getTierMessage(): Promise<string> {
    const tier = await this.getCurrentTier();
    const daysUntilNext = await this.getDaysUntilNextTier();

    switch (tier) {
      case ExpirationTier.NORMAL:
        return `You have ${daysUntilNext} days until sync is recommended.`;
      case ExpirationTier.WARNING:
        return `Warning: Please sync soon. You have ${daysUntilNext} days remaining.`;
      case ExpirationTier.GRACE:
        return `Important: Sync required soon. You have ${daysUntilNext} days remaining.`;
      case ExpirationTier.OVERRIDE_REQUIRED:
        return 'Override or emergency authentication required. Please sync online or use an override code.';
      default:
        return '';
    }
  }
}
