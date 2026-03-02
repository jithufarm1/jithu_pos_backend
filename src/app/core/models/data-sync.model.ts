/**
 * Data Sync Models
 * Models for vehicle data synchronization
 */

export interface DataPackage {
  version: string;
  releaseDate: string;
  expiryDate: string;
  packageSize: number;
  compressedSize: number;
  checksum: string;
  chunks: number;
  chunkSize: number;
  metadata: DataPackageMetadata;
  changelog: string[];
  downloadUrl: string;
  manifestUrl: string;
}

export interface DataPackageMetadata {
  totalVehicles: number;
  newVehicles: number;
  updatedVehicles: number;
  makes: number;
  models: number;
}

export interface DataVersion {
  version: string;
  installedDate: string;
  recordCount: number;
  size: number;
}

export interface DownloadOptions {
  bandwidthLimit: 0 | 1 | 5 | 10 | 25 | 50;
  networkType: 'any' | 'wifi-only' | 'ethernet-only';
  schedule?: DownloadSchedule;
  maxRetries: number;
  resumable: boolean;
  notifyOnComplete: boolean;
  notifyOnError: boolean;
}

export interface DownloadSchedule {
  type: 'immediate' | 'scheduled';
  time?: Date;
  timezone?: string;
}

export interface DownloadJob {
  id: string;
  packageInfo: DataPackage;
  options: DownloadOptions;
  status: 'pending' | 'downloading' | 'installing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: number;
  endTime?: number;
  error?: string;
  chunksDownloaded: number[];
}

export interface StorageInfo {
  totalUsed: number;
  vehicleData: number;
  customerCache: number;
  serviceTickets: number;
  other: number;
  quota: number;
  percentUsed: number;
}

export interface SyncHistoryEntry {
  id: string;
  timestamp: Date;
  version: string;
  action: 'download' | 'install' | 'rollback' | 'delete';
  status: 'success' | 'failed';
  duration: number;
  size: number;
  userId: string;
  userName: string;
  error?: string;
}

export interface AuditLog {
  timestamp: Date;
  userId: string;
  userName: string;
  storeId: string;
  action: 'DATA_SYNC_STARTED' | 'DATA_SYNC_COMPLETED' | 'DATA_SYNC_FAILED' | 'DATA_SYNC_CANCELLED' | 'DATA_SYNC_ROLLBACK';
  details: {
    version?: string;
    size?: number;
    duration?: number;
    error?: string;
  };
  ipAddress?: string;
  userAgent: string;
}

export interface HealthStatus {
  dataVersion: DataVersion | null;
  dataAge: number; // days
  storageUsage: number; // percentage
  lastSyncDate: Date | null;
  pendingUpdates: boolean;
  issues: HealthIssue[];
}

export interface HealthIssue {
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export const DOWNLOAD_PRESETS: Record<string, DownloadOptions> = {
  OVERNIGHT: {
    bandwidthLimit: 10,
    networkType: 'any',
    schedule: { type: 'scheduled' },
    maxRetries: 5,
    resumable: true,
    notifyOnComplete: true,
    notifyOnError: true
  },
  IMMEDIATE: {
    bandwidthLimit: 0,
    networkType: 'any',
    schedule: { type: 'immediate' },
    maxRetries: 3,
    resumable: true,
    notifyOnComplete: true,
    notifyOnError: true
  },
  CONSERVATIVE: {
    bandwidthLimit: 1,
    networkType: 'wifi-only',
    schedule: { type: 'immediate' },
    maxRetries: 10,
    resumable: true,
    notifyOnComplete: true,
    notifyOnError: true
  }
};
