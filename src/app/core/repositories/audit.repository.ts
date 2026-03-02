import { Injectable } from '@angular/core';
import { IndexedDBRepository } from './indexeddb.repository';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userID: string;
  deviceID: string;
  eventType: 'pin_auth' | 'override_auth' | 'emergency_auth' | 'online_auth' | 'pin_setup' | 'logout';
  success: boolean;
  details: Record<string, any>;
  synced: boolean;
  syncedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuditRepository extends IndexedDBRepository {
  constructor() {
    super();
  }

  /**
   * Store an audit log entry
   */
  async storeAuditLog(entry: AuditLogEntry): Promise<void> {
    await this.put('audit_logs', {
      ...entry,
      key: entry.id
    });
  }

  /**
   * Get all pending (unsynced) audit logs
   */
  async getPendingLogs(): Promise<AuditLogEntry[]> {
    const allLogs = await this.getAll('audit_logs');
    
    return allLogs
      .filter((log: any) => !log.synced)
      .map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp),
        syncedAt: log.syncedAt ? new Date(log.syncedAt) : undefined
      }));
  }

  /**
   * Get all audit logs (for admin review)
   */
  async getAllLogs(): Promise<AuditLogEntry[]> {
    const allLogs = await this.getAll('audit_logs');
    
    return allLogs.map((log: any) => ({
      ...log,
      timestamp: new Date(log.timestamp),
      syncedAt: log.syncedAt ? new Date(log.syncedAt) : undefined
    }));
  }

  /**
   * Mark logs as synced
   */
  async markLogsSynced(logIDs: string[]): Promise<void> {
    const syncedAt = new Date();
    
    for (const id of logIDs) {
      const log = await this.get<AuditLogEntry>('audit_logs', id);
      if (log) {
        await this.put('audit_logs', {
          ...log,
          synced: true,
          syncedAt
        });
      }
    }
  }

  /**
   * Get logs for a specific user
   */
  async getLogsByUser(userID: string): Promise<AuditLogEntry[]> {
    const allLogs = await this.getAllLogs();
    return allLogs.filter(log => log.userID === userID);
  }

  /**
   * Get logs by event type
   */
  async getLogsByEventType(eventType: string): Promise<AuditLogEntry[]> {
    const allLogs = await this.getAllLogs();
    return allLogs.filter(log => log.eventType === eventType);
  }

  /**
   * Clear all audit logs (use with caution)
   */
  async clearAllLogs(): Promise<void> {
    const allLogs = await this.getAll<AuditLogEntry>('audit_logs');
    for (const log of allLogs) {
      await this.delete('audit_logs', log.id);
    }
  }
}
