import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataSyncService } from '../../../../core/services/data-sync.service';
import {
  DataPackage,
  DataVersion,
  DownloadOptions,
  StorageInfo,
  SyncHistoryEntry,
  HealthStatus,
  DOWNLOAD_PRESETS
} from '../../../../core/models/data-sync.model';
import { AppHeaderComponent } from '../../../../shared/components/app-header/app-header.component';

@Component({
  selector: 'app-data-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderComponent],
  templateUrl: './data-management.component.html',
  styleUrls: ['./data-management.component.css']
})
export class DataManagementComponent implements OnInit, OnDestroy {
  currentVersion: DataVersion | null = null;
  availableUpdate: DataPackage | null = null;
  downloadProgress = 0;
  downloadStatus = 'idle';
  storageInfo: StorageInfo | null = null;
  syncHistory: SyncHistoryEntry[] = [];
  healthStatus: HealthStatus | null = null;
  
  isLoading = false;
  isDownloading = false;
  showScheduleModal = false;
  showHistoryModal = false;
  showChangelogModal = false;
  
  downloadOptions: DownloadOptions = { ...DOWNLOAD_PRESETS['OVERNIGHT'] };
  scheduledTime = '02:00';
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private dataSyncService: DataSyncService,
    private router: Router
  ) {}
  
  async ngOnInit() {
    await this.loadData();
    this.subscribeToProgress();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  async loadData() {
    this.isLoading = true;
    
    try {
      this.currentVersion = await this.dataSyncService.getCurrentVersion();
      this.availableUpdate = await this.dataSyncService.checkForUpdates();
      this.storageInfo = await this.dataSyncService.getStorageInfo();
      this.syncHistory = await this.dataSyncService.getSyncHistory();
      this.healthStatus = await this.dataSyncService.performHealthCheck();
    } catch (error) {
      console.error('[DataManagement] Error loading data:', error);
    } finally {
      this.isLoading = false;
    }
  }
  
  subscribeToProgress() {
    this.dataSyncService.downloadProgress$
      .pipe(takeUntil(this.destroy$))
      .subscribe(progress => {
        this.downloadProgress = progress;
      });
    
    this.dataSyncService.downloadStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.downloadStatus = status;
        this.isDownloading = status === 'downloading' || status === 'installing';
      });
  }
  
  async downloadNow() {
    if (!this.availableUpdate) return;
    
    const confirmed = confirm(
      `Download vehicle database update?\n\n` +
      `Version: ${this.availableUpdate.version}\n` +
      `Size: ${this.formatBytes(this.availableUpdate.compressedSize)}\n` +
      `Estimated time: ${this.estimateDownloadTime(this.availableUpdate.compressedSize)}\n\n` +
      `The download will happen in the background and you can continue working.`
    );
    
    if (!confirmed) return;
    
    try {
      this.isDownloading = true;
      
      await this.dataSyncService.downloadPackage(
        this.availableUpdate,
        { ...DOWNLOAD_PRESETS['IMMEDIATE'] }
      );
      
      alert('Vehicle database updated successfully!');
      await this.loadData();
      
    } catch (error: any) {
      alert(`Download failed: ${error.message}`);
    } finally {
      this.isDownloading = false;
    }
  }
  
  openScheduleModal() {
    this.showScheduleModal = true;
  }
  
  closeScheduleModal() {
    this.showScheduleModal = false;
  }
  
  async scheduleDownload() {
    if (!this.availableUpdate) return;
    
    const [hours, minutes] = this.scheduledTime.split(':').map(Number);
    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);
    
    // If time is in the past, schedule for tomorrow
    if (scheduledDate < new Date()) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }
    
    try {
      this.downloadOptions.schedule = {
        type: 'scheduled',
        time: scheduledDate
      };
      
      await this.dataSyncService.downloadPackage(
        this.availableUpdate,
        this.downloadOptions
      );
      
      alert(`Download scheduled for ${scheduledDate.toLocaleString()}`);
      this.closeScheduleModal();
      
    } catch (error: any) {
      alert(`Failed to schedule download: ${error.message}`);
    }
  }
  
  async pauseDownload() {
    await this.dataSyncService.pauseCurrentDownload();
  }
  
  async resumeDownload() {
    await this.dataSyncService.resumeCurrentDownload();
  }
  
  async cancelDownload() {
    if (confirm('Cancel download? Progress will be lost.')) {
      await this.dataSyncService.cancelCurrentDownload();
    }
  }
  
  viewChangelog() {
    this.showChangelogModal = true;
  }
  
  closeChangelogModal() {
    this.showChangelogModal = false;
  }
  
  viewHistory() {
    this.showHistoryModal = true;
  }
  
  closeHistoryModal() {
    this.showHistoryModal = false;
  }
  
  async refreshData() {
    await this.loadData();
  }
  
  formatBytes(bytes: number): string {
    return this.dataSyncService.formatBytes(bytes);
  }
  
  estimateDownloadTime(bytes: number): string {
    const mbps = this.downloadOptions.bandwidthLimit || 100;
    const seconds = (bytes * 8) / (mbps * 1_000_000);
    
    if (seconds < 60) return `${Math.round(seconds)} seconds`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
    return `${Math.round(seconds / 3600)} hours`;
  }
  
  formatDate(date: string | Date): string {
    return new Date(date).toLocaleString();
  }
  
  getDataAge(): string {
    if (!this.currentVersion) return 'N/A';
    
    const days = Math.floor(
      (Date.now() - new Date(this.currentVersion.installedDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }
  
  getStatusClass(): string {
    if (!this.currentVersion) return 'status-warning';
    if (this.availableUpdate) return 'status-info';
    if (this.healthStatus && this.healthStatus.dataAge > 45) return 'status-warning';
    return 'status-success';
  }
  
  getStatusText(): string {
    if (!this.currentVersion) return 'Not installed';
    if (this.availableUpdate) return 'Update available';
    if (this.healthStatus && this.healthStatus.dataAge > 45) return 'Update recommended';
    return 'Up to date';
  }
}
