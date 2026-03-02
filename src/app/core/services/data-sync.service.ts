import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  DataPackage,
  DataVersion,
  DownloadOptions,
  DownloadJob,
  StorageInfo,
  SyncHistoryEntry,
  AuditLog,
  HealthStatus
} from '../models/data-sync.model';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { NetworkDetectionService } from './network-detection.service';

/**
 * Data Sync Service
 * Handles vehicle database synchronization with manual on-demand downloads
 */
@Injectable({
  providedIn: 'root',
})
export class DataSyncService {
  private readonly CDN_BASE = environment.apiBaseUrl.replace('/api', '/data');
  private readonly CHUNK_SIZE = 1_000_000; // 1 MB
  private readonly DB_NAME = 'ValvolinePOS';
  private readonly DB_VERSION = 2;
  
  private db: IDBDatabase | null = null;
  private currentJob: DownloadJob | null = null;
  
  // Observable for download progress
  private downloadProgressSubject = new BehaviorSubject<number>(0);
  public downloadProgress$ = this.downloadProgressSubject.asObservable();
  
  // Observable for download status
  private downloadStatusSubject = new BehaviorSubject<string>('idle');
  public downloadStatus$ = this.downloadStatusSubject.asObservable();
  
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private networkService: NetworkDetectionService
  ) {
    this.initializeDatabase();
  }
  
  /**
   * Initialize IndexedDB
   */
  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        
        // Vehicle data stores
        if (!db.objectStoreNames.contains('vehicle-makes')) {
          const makeStore = db.createObjectStore('vehicle-makes', { keyPath: 'id' });
          makeStore.createIndex('name', 'name', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('vehicle-models')) {
          const modelStore = db.createObjectStore('vehicle-models', { keyPath: 'id' });
          modelStore.createIndex('makeId', 'makeId', { unique: false });
          modelStore.createIndex('name', 'name', { unique: false });
          modelStore.createIndex('year', 'year', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('vehicle-specs')) {
          const specStore = db.createObjectStore('vehicle-specs', { keyPath: 'id' });
          specStore.createIndex('modelId', 'modelId', { unique: false });
          specStore.createIndex('vin', 'vin', { unique: false });
        }
        
        // Metadata store
        if (!db.objectStoreNames.contains('vehicle-metadata')) {
          db.createObjectStore('vehicle-metadata', { keyPath: 'key' });
        }
        
        // Backup store
        if (!db.objectStoreNames.contains('vehicle-backup')) {
          db.createObjectStore('vehicle-backup', { keyPath: 'id' });
        }
        
        // Download chunks store (temporary)
        if (!db.objectStoreNames.contains('download-chunks')) {
          db.createObjectStore('download-chunks', { keyPath: 'index' });
        }
        
        // Sync history store
        if (!db.objectStoreNames.contains('sync-history')) {
          const historyStore = db.createObjectStore('sync-history', { keyPath: 'id', autoIncrement: true });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Audit log store
        if (!db.objectStoreNames.contains('audit-logs')) {
          const auditStore = db.createObjectStore('audit-logs', { keyPath: 'id', autoIncrement: true });
          auditStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }
  
  /**
   * Check for available updates
   */
  async checkForUpdates(): Promise<DataPackage | null> {
    try {
      const currentVersion = await this.getCurrentVersion();
      const latestManifest = await this.fetchLatestManifest();
      
      if (!currentVersion || this.isNewerVersion(latestManifest.version, currentVersion.version)) {
        return latestManifest;
      }
      
      return null;
    } catch (error) {
      console.error('[DataSync] Error checking for updates:', error);
      return null;
    }
  }
  
  /**
   * Fetch latest manifest from CDN
   */
  private async fetchLatestManifest(): Promise<DataPackage> {
    // In production, this would fetch from CDN
    // For now, return mock data
    return {
      version: '2024.03',
      releaseDate: '2024-03-01T00:00:00Z',
      expiryDate: '2024-04-30T23:59:59Z',
      packageSize: 253000000,
      compressedSize: 85000000,
      checksum: 'sha256:mock-checksum',
      chunks: 85,
      chunkSize: this.CHUNK_SIZE,
      metadata: {
        totalVehicles: 125847,
        newVehicles: 1247,
        updatedVehicles: 89,
        makes: 87,
        models: 3421
      },
      changelog: [
        'Added 2024 model year vehicles',
        'Updated service intervals for Toyota models',
        'Added new EV maintenance schedules'
      ],
      downloadUrl: `${this.CDN_BASE}/vehicles/2024.03/`,
      manifestUrl: `${this.CDN_BASE}/vehicles/2024.03/manifest.json`
    };
  }
  
  /**
   * Get current installed version
   */
  async getCurrentVersion(): Promise<DataVersion | null> {
    if (!this.db) await this.initializeDatabase();
    
    return new Promise((resolve) => {
      const tx = this.db!.transaction(['vehicle-metadata'], 'readonly');
      const store = tx.objectStore('vehicle-metadata');
      const request = store.get('vehicle-data-version');
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => resolve(null);
    });
  }
  
  /**
   * Download and install package
   */
  async downloadPackage(packageInfo: DataPackage, options: DownloadOptions): Promise<void> {
    // Validate prerequisites
    await this.validatePrerequisites(packageInfo, options);
    
    // Create download job
    const job = this.createDownloadJob(packageInfo, options);
    this.currentJob = job;
    
    // Schedule or start immediately
    if (options.schedule?.type === 'scheduled' && options.schedule.time) {
      await this.scheduleDownload(job, options.schedule.time);
    } else {
      await this.startDownload(job);
    }
  }
  
  /**
   * Validate prerequisites before download
   */
  private async validatePrerequisites(packageInfo: DataPackage, options: DownloadOptions): Promise<void> {
    // Check network
    if (!this.networkService.isOnline()) {
      throw new Error('No network connection available');
    }
    
    // Check WiFi requirement
    if (options.networkType === 'wifi-only' && !this.isWiFiConnected()) {
      throw new Error('WiFi connection required');
    }
    
    // Check storage space
    const estimate = await navigator.storage.estimate();
    const available = (estimate.quota || 0) - (estimate.usage || 0);
    
    if (available < packageInfo.packageSize) {
      throw new Error(`Insufficient storage space. Need ${this.formatBytes(packageInfo.packageSize)}, have ${this.formatBytes(available)}`);
    }
    
    // Check manager permission
    const user = this.authService.getCurrentEmployee();
    if (!user || user.role !== 'Manager') {
      throw new Error('Manager permission required');
    }
  }
  
  /**
   * Create download job
   */
  private createDownloadJob(packageInfo: DataPackage, options: DownloadOptions): DownloadJob {
    return {
      id: `job_${Date.now()}`,
      packageInfo,
      options,
      status: 'pending',
      progress: 0,
      startTime: Date.now(),
      chunksDownloaded: []
    };
  }
  
  /**
   * Start download
   */
  private async startDownload(job: DownloadJob): Promise<void> {
    try {
      console.log('[DataSync] Starting download:', job.id);
      
      job.status = 'downloading';
      this.downloadStatusSubject.next('downloading');
      
      await this.logAuditEvent('DATA_SYNC_STARTED', {
        version: job.packageInfo.version,
        size: job.packageInfo.compressedSize
      });
      
      // Download all chunks
      for (let i = 0; i < job.packageInfo.chunks; i++) {
        // Check if already downloaded (resume support)
        if (job.chunksDownloaded.includes(i)) {
          continue;
        }
        
        // Download chunk with retry
        const chunk = await this.downloadChunkWithRetry(
          job.packageInfo.downloadUrl,
          i,
          job.options.maxRetries
        );
        
        // Save chunk temporarily
        await this.saveChunk(job.id, i, chunk);
        job.chunksDownloaded.push(i);
        
        // Update progress
        job.progress = (job.chunksDownloaded.length / job.packageInfo.chunks) * 100;
        this.downloadProgressSubject.next(job.progress);
        
        // Throttle bandwidth if configured
        if (job.options.bandwidthLimit > 0) {
          await this.throttleBandwidth(job.options.bandwidthLimit);
        }
      }
      
      // All chunks downloaded - install
      job.status = 'installing';
      this.downloadStatusSubject.next('installing');
      
      await this.installPackage(job);
      
      job.status = 'completed';
      job.endTime = Date.now();
      this.downloadStatusSubject.next('completed');
      
      // Cleanup
      await this.cleanupDownload(job.id);
      
      await this.logAuditEvent('DATA_SYNC_COMPLETED', {
        version: job.packageInfo.version,
        size: job.packageInfo.packageSize,
        duration: job.endTime - job.startTime
      });
      
      // Add to sync history
      await this.addSyncHistory({
        id: job.id,
        timestamp: new Date(),
        version: job.packageInfo.version,
        action: 'install',
        status: 'success',
        duration: job.endTime - job.startTime,
        size: job.packageInfo.packageSize,
        userId: this.authService.getCurrentEmployee()?.id || '',
        userName: this.authService.getCurrentEmployee()?.name || ''
      });
      
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      job.endTime = Date.now();
      this.downloadStatusSubject.next('failed');
      
      await this.logAuditEvent('DATA_SYNC_FAILED', {
        version: job.packageInfo.version,
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Download single chunk with retry
   */
  private async downloadChunkWithRetry(
    baseUrl: string,
    chunkIndex: number,
    maxRetries: number
  ): Promise<ArrayBuffer> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // In production, this would download from CDN
        // For now, generate mock data
        const mockData = new ArrayBuffer(this.CHUNK_SIZE);
        await this.sleep(100); // Simulate network delay
        return mockData;
        
      } catch (error: any) {
        lastError = error;
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await this.sleep(delay);
      }
    }
    
    throw new Error(`Failed to download chunk ${chunkIndex} after ${maxRetries} attempts: ${lastError?.message}`);
  }
  
  /**
   * Save chunk to temporary storage
   */
  private async saveChunk(jobId: string, index: number, data: ArrayBuffer): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['download-chunks'], 'readwrite');
      const store = tx.objectStore('download-chunks');
      
      store.put({ index, jobId, data });
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  
  /**
   * Install package to IndexedDB
   */
  private async installPackage(job: DownloadJob): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    
    // Backup current data
    await this.backupCurrentData();
    
    try {
      // Clear old data
      await this.clearVehicleData();
      
      // Load and install chunks
      for (let i = 0; i < job.packageInfo.chunks; i++) {
        const chunk = await this.loadChunk(job.id, i);
        // In production, decompress and parse chunk data
        // For now, just simulate
        await this.sleep(10);
      }
      
      // Update metadata
      await this.updateMetadata({
        key: 'vehicle-data-version',
        version: job.packageInfo.version,
        installedDate: new Date().toISOString(),
        recordCount: job.packageInfo.metadata.totalVehicles,
        size: job.packageInfo.packageSize
      });
      
      // Delete backup (success)
      await this.deleteBackup();
      
    } catch (error) {
      // Rollback on error
      await this.rollbackToBackup();
      throw error;
    }
  }
  
  /**
   * Backup current data
   */
  private async backupCurrentData(): Promise<void> {
    // Implementation would copy vehicle data to backup store
    console.log('[DataSync] Backing up current data');
  }
  
  /**
   * Clear vehicle data
   */
  private async clearVehicleData(): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['vehicle-makes', 'vehicle-models', 'vehicle-specs'], 'readwrite');
      
      tx.objectStore('vehicle-makes').clear();
      tx.objectStore('vehicle-models').clear();
      tx.objectStore('vehicle-specs').clear();
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  
  /**
   * Load chunk from temporary storage
   */
  private async loadChunk(jobId: string, index: number): Promise<ArrayBuffer> {
    if (!this.db) await this.initializeDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['download-chunks'], 'readonly');
      const store = tx.objectStore('download-chunks');
      const request = store.get(index);
      
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.data);
        } else {
          reject(new Error(`Chunk ${index} not found`));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Update metadata
   */
  private async updateMetadata(data: any): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['vehicle-metadata'], 'readwrite');
      const store = tx.objectStore('vehicle-metadata');
      
      store.put(data);
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  
  /**
   * Delete backup
   */
  private async deleteBackup(): Promise<void> {
    console.log('[DataSync] Deleting backup');
  }
  
  /**
   * Rollback to backup
   */
  private async rollbackToBackup(): Promise<void> {
    console.log('[DataSync] Rolling back to backup');
  }
  
  /**
   * Cleanup download
   */
  private async cleanupDownload(jobId: string): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['download-chunks'], 'readwrite');
      const store = tx.objectStore('download-chunks');
      
      store.clear();
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  
  /**
   * Schedule download for later
   */
  private async scheduleDownload(job: DownloadJob, scheduledTime: Date): Promise<void> {
    const delay = scheduledTime.getTime() - Date.now();
    
    if (delay > 0) {
      console.log(`[DataSync] Download scheduled for ${scheduledTime.toLocaleString()}`);
      setTimeout(() => this.startDownload(job), delay);
    } else {
      await this.startDownload(job);
    }
  }
  
  /**
   * Pause current download
   */
  async pauseCurrentDownload(): Promise<void> {
    if (this.currentJob && this.currentJob.status === 'downloading') {
      this.currentJob.status = 'pending';
      this.downloadStatusSubject.next('paused');
    }
  }
  
  /**
   * Resume current download
   */
  async resumeCurrentDownload(): Promise<void> {
    if (this.currentJob && this.currentJob.status === 'pending') {
      await this.startDownload(this.currentJob);
    }
  }
  
  /**
   * Cancel current download
   */
  async cancelCurrentDownload(): Promise<void> {
    if (this.currentJob) {
      this.currentJob.status = 'cancelled';
      this.downloadStatusSubject.next('cancelled');
      
      await this.cleanupDownload(this.currentJob.id);
      
      await this.logAuditEvent('DATA_SYNC_CANCELLED', {
        version: this.currentJob.packageInfo.version
      });
      
      this.currentJob = null;
    }
  }
  
  /**
   * Get storage info
   */
  async getStorageInfo(): Promise<StorageInfo> {
    const estimate = await navigator.storage.estimate();
    
    return {
      totalUsed: estimate.usage || 0,
      vehicleData: 0, // Would calculate from IndexedDB
      customerCache: 0,
      serviceTickets: 0,
      other: 0,
      quota: estimate.quota || 0,
      percentUsed: ((estimate.usage || 0) / (estimate.quota || 1)) * 100
    };
  }
  
  /**
   * Get sync history
   */
  async getSyncHistory(): Promise<SyncHistoryEntry[]> {
    if (!this.db) await this.initializeDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['sync-history'], 'readonly');
      const store = tx.objectStore('sync-history');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Add sync history entry
   */
  private async addSyncHistory(entry: SyncHistoryEntry): Promise<void> {
    if (!this.db) await this.initializeDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['sync-history'], 'readwrite');
      const store = tx.objectStore('sync-history');
      
      store.add(entry);
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  
  /**
   * Log audit event
   */
  private async logAuditEvent(action: string, details: any): Promise<void> {
    const user = this.authService.getCurrentEmployee();
    
    const log: AuditLog = {
      timestamp: new Date(),
      userId: user?.id || '',
      userName: user?.name || '',
      storeId: environment.storeId,
      action: action as any,
      details,
      userAgent: navigator.userAgent
    };
    
    if (!this.db) await this.initializeDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['audit-logs'], 'readwrite');
      const store = tx.objectStore('audit-logs');
      
      store.add(log);
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  
  /**
   * Perform health check
   */
  async performHealthCheck(): Promise<HealthStatus> {
    const currentVersion = await this.getCurrentVersion();
    const storageInfo = await this.getStorageInfo();
    const pendingUpdate = await this.checkForUpdates();
    
    const dataAge = currentVersion
      ? Math.floor((Date.now() - new Date(currentVersion.installedDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    
    const issues: any[] = [];
    
    if (dataAge > 45) {
      issues.push({
        severity: 'warning',
        message: `Vehicle data is ${dataAge} days old. Update recommended.`
      });
    }
    
    if (storageInfo.percentUsed > 90) {
      issues.push({
        severity: 'error',
        message: 'Storage usage above 90%. Clear old data.'
      });
    }
    
    return {
      dataVersion: currentVersion,
      dataAge,
      storageUsage: storageInfo.percentUsed,
      lastSyncDate: currentVersion ? new Date(currentVersion.installedDate) : null,
      pendingUpdates: !!pendingUpdate,
      issues
    };
  }
  
  // Utility methods
  
  private isNewerVersion(v1: string, v2: string): boolean {
    return v1 > v2;
  }
  
  private isWiFiConnected(): boolean {
    // In production, check connection type
    return true;
  }
  
  private async throttleBandwidth(mbps: number): Promise<void> {
    // Calculate delay based on bandwidth limit
    const delay = (this.CHUNK_SIZE * 8) / (mbps * 1_000_000) * 1000;
    await this.sleep(delay);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
