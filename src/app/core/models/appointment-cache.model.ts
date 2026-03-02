/**
 * Appointment Cache Models
 * 
 * Models specific to caching and offline synchronization for appointments.
 */

import { Appointment, CustomerSummary, VehicleSummary } from './appointment.model';

/**
 * Cached appointment with additional metadata
 */
export interface CachedAppointment extends Appointment {
  cachedAt: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
  customerData?: CustomerSummary; // preloaded
  vehicleData?: VehicleSummary; // preloaded
}

/**
 * Queued appointment operation for offline sync
 */
export interface QueuedAppointmentOperation {
  id: string;
  operation: 'create' | 'update' | 'delete' | 'status-change';
  appointmentId?: string;
  data?: Partial<Appointment>;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

/**
 * Conflict resolution record
 */
export interface ConflictResolution {
  appointmentId: string;
  localVersion: number;
  serverVersion: number;
  localData: Partial<Appointment>;
  serverData: Appointment;
  resolution: 'server-wins' | 'local-wins' | 'manual';
  resolvedAt: Date;
}

/**
 * Sync queue status
 */
export interface SyncQueueStatus {
  pendingOperations: number;
  lastSyncAttempt?: Date;
  lastSuccessfulSync?: Date;
  conflicts: ConflictResolution[];
}
