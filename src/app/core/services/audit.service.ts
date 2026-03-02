import { Injectable } from '@angular/core';
import { AuditRepository, AuditLogEntry } from '../repositories/audit.repository';
import { ExpirationService, ExpirationTier } from './expiration.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AuthEvent {
  userID: string;
  deviceID: string;
  eventType: 'pin_auth' | 'override_auth' | 'emergency_auth' | 'online_auth' | 'pin_setup' | 'logout';
  success: boolean;
  expirationTier?: ExpirationTier;
  attemptsRemaining?: number;
}

export interface OverrideEvent extends AuthEvent {
  managerID: string;
  employeeID: string;
  overrideCode: string;
  overridesRemaining: number;
}

export interface EmergencyEvent extends AuthEvent {
  securityQuestionUsed: boolean;
  highPriority: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private deviceID: string = '';

  constructor(
    private auditRepository: AuditRepository,
    private expirationService: ExpirationService,
    private http: HttpClient
  ) {
    this.initializeDeviceID();
  }

  /**
   * Initialize or retrieve device ID
   */
  private async initializeDeviceID(): Promise<void> {
    let deviceID = localStorage.getItem('device_id');
    if (!deviceID) {
      deviceID = crypto.randomUUID();
      localStorage.setItem('device_id', deviceID);
    }
    this.deviceID = deviceID;
  }

  /**
   * Get the current device ID
   */
  async getDeviceID(): Promise<string> {
    if (!this.deviceID) {
      await this.initializeDeviceID();
    }
    return this.deviceID;
  }

  /**
   * Log a general authentication attempt
   */
  async logAuthAttempt(event: AuthEvent): Promise<void> {
    const deviceID = await this.getDeviceID();
    const tier = event.expirationTier || await this.expirationService.getCurrentTier();

    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userID: event.userID,
      deviceID,
      eventType: event.eventType,
      success: event.success,
      details: {
        expirationTier: tier,
        attemptsRemaining: event.attemptsRemaining
      },
      synced: false
    };

    await this.auditRepository.storeAuditLog(entry);
  }

  /**
   * Log override usage with manager and employee IDs
   */
  async logOverrideUsage(event: OverrideEvent): Promise<void> {
    const deviceID = await this.getDeviceID();
    const tier = event.expirationTier || await this.expirationService.getCurrentTier();

    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userID: event.employeeID,
      deviceID,
      eventType: 'override_auth',
      success: event.success,
      details: {
        managerID: event.managerID,
        employeeID: event.employeeID,
        overrideCode: event.overrideCode,
        overridesRemaining: event.overridesRemaining,
        expirationTier: tier
      },
      synced: false
    };

    await this.auditRepository.storeAuditLog(entry);
  }

  /**
   * Log emergency access with high-priority flag
   */
  async logEmergencyAccess(event: EmergencyEvent): Promise<void> {
    const deviceID = await this.getDeviceID();
    const tier = event.expirationTier || await this.expirationService.getCurrentTier();

    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userID: event.userID,
      deviceID,
      eventType: 'emergency_auth',
      success: event.success,
      details: {
        securityQuestionUsed: event.securityQuestionUsed,
        highPriority: true,
        expirationTier: tier
      },
      synced: false
    };

    await this.auditRepository.storeAuditLog(entry);
  }

  /**
   * Log failed PIN attempt with attempt count
   */
  async logFailedPINAttempt(userID: string, attemptsRemaining: number): Promise<void> {
    await this.logAuthAttempt({
      userID,
      deviceID: await this.getDeviceID(),
      eventType: 'pin_auth',
      success: false,
      attemptsRemaining
    });
  }

  /**
   * Flag an account for security review
   */
  async flagAccountForReview(userID: string, reason: string): Promise<void> {
    const deviceID = await this.getDeviceID();

    const entry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userID,
      deviceID,
      eventType: 'pin_auth',
      success: false,
      details: {
        flaggedForReview: true,
        reason
      },
      synced: false
    };

    await this.auditRepository.storeAuditLog(entry);
  }

  /**
   * Sync all pending audit logs to backend
   */
  async syncAuditLogs(): Promise<void> {
    const pendingLogs = await this.auditRepository.getPendingLogs();
    
    if (pendingLogs.length === 0) {
      return;
    }

    try {
      // Send logs to backend
      await firstValueFrom(
        this.http.post('/api/audit/sync', { logs: pendingLogs })
      );

      // Mark logs as synced
      const logIDs = pendingLogs.map(log => log.id);
      await this.auditRepository.markLogsSynced(logIDs);
    } catch (error) {
      console.error('Failed to sync audit logs:', error);
      // Logs remain unsynced and will be retried on next sync
    }
  }

  /**
   * Get all pending logs (for debugging/admin)
   */
  async getPendingLogs(): Promise<AuditLogEntry[]> {
    return await this.auditRepository.getPendingLogs();
  }

  /**
   * Get all logs (for admin review)
   */
  async getAllLogs(): Promise<AuditLogEntry[]> {
    return await this.auditRepository.getAllLogs();
  }

  /**
   * Get logs for a specific user
   */
  async getLogsByUser(userID: string): Promise<AuditLogEntry[]> {
    return await this.auditRepository.getLogsByUser(userID);
  }
}
