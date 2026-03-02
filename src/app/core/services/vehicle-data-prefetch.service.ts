import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { VehicleDataLoaderService } from './vehicle-data-loader.service';
import { VehicleDataChunkRepository } from '../repositories/vehicle-data-chunk.repository';
import { NetworkDetectionService } from './network-detection.service';
import {
  PrefetchJob,
  CacheSettings,
  ChunkCatalog
} from '../models/vehicle-data-cache.model';

/**
 * Popular vehicle makes for prefetching
 */
const POPULAR_MAKES = [
  'TOYOTA',
  'FORD',
  'HONDA',
  'CHEVROLET',
  'NISSAN',
  'RAM',
  'JEEP',
  'GMC',
  'HYUNDAI',
  'SUBARU'
];

/**
 * Vehicle Data Prefetch Service
 * Implements intelligent background prefetching
 */
@Injectable({
  providedIn: 'root'
})
export class VehicleDataPrefetchService {
  private prefetchQueue: PrefetchJob[] = [];
  private isPrefetchingFlag = false;
  private prefetchJobsSubject = new Subject<PrefetchJob[]>();
  private currentJobId = 0;

  constructor(
    private loader: VehicleDataLoaderService,
    private chunkRepo: VehicleDataChunkRepository,
    private network: NetworkDetectionService
  ) {}

  /**
   * Prefetch popular makes for current year
   */
  prefetchPopularMakes(): Observable<PrefetchJob> {
    const currentYear = new Date().getFullYear();
    const chunkIds = POPULAR_MAKES.map(make => `${currentYear}_${make}`);

    const job: PrefetchJob = {
      id: `popular-${this.currentJobId++}`,
      chunkIds,
      priority: 'high',
      reason: 'popular-makes',
      status: 'pending',
      progress: 0,
      startTime: Date.now()
    };

    return this.startPrefetchJob(job);
  }

  /**
   * Prefetch all chunks for current year
   */
  prefetchCurrentYear(): Observable<PrefetchJob> {
    return new Observable((observer) => {
      this.loader.loadCatalog().subscribe({
        next: (catalog) => {
          const currentYear = new Date().getFullYear();
          const chunkIds = catalog.chunks
            .filter(c => c.year === currentYear)
            .map(c => c.chunkId);

          const job: PrefetchJob = {
            id: `current-year-${this.currentJobId++}`,
            chunkIds,
            priority: 'high',
            reason: 'current-year',
            status: 'pending',
            progress: 0,
            startTime: Date.now()
          };

          this.startPrefetchJob(job).subscribe({
            next: (updatedJob) => observer.next(updatedJob),
            complete: () => observer.complete(),
            error: (err) => observer.error(err)
          });
        },
        error: (err) => observer.error(err)
      });
    });
  }

  /**
   * Prefetch related chunks based on user's search
   */
  prefetchRelatedChunks(chunkId: string): Observable<PrefetchJob> {
    const [year, make] = chunkId.split('_');

    // Prefetch other popular makes for the same year
    const relatedChunks = POPULAR_MAKES
      .filter(m => m !== make)
      .slice(0, 5)
      .map(m => `${year}_${m}`);

    const job: PrefetchJob = {
      id: `related-${this.currentJobId++}`,
      chunkIds: relatedChunks,
      priority: 'medium',
      reason: 'pattern-based',
      status: 'pending',
      progress: 0,
      startTime: Date.now()
    };

    return this.startPrefetchJob(job);
  }

  /**
   * Prefetch chunks by pattern
   */
  prefetchByPattern(chunkIds: string[]): Observable<PrefetchJob> {
    const job: PrefetchJob = {
      id: `pattern-${this.currentJobId++}`,
      chunkIds,
      priority: 'low',
      reason: 'pattern-based',
      status: 'pending',
      progress: 0,
      startTime: Date.now()
    };

    return this.startPrefetchJob(job);
  }

  /**
   * Start a prefetch job
   */
  startPrefetchJob(job: PrefetchJob): Observable<PrefetchJob> {
    return new Observable((observer) => {
      // Check if prefetch is enabled
      this.getSettings().then(async (settings) => {
        if (!settings.enabled) {
          observer.error({ message: 'Prefetch disabled in settings' });
          return;
        }

        // Check network type
        const isOnline = this.network.isOnline();
        if (!isOnline) {
          observer.error({ message: 'Device is offline' });
          return;
        }

        // Check if WiFi only setting is enabled
        if (settings.prefetchOnWiFi && !settings.prefetchOnMobile) {
          // For now, assume we're on WiFi if online
          // In production, would check actual connection type
          console.log('[PrefetchService] Prefetch allowed on current network');
        }

        // Check storage capacity
        const totalSize = await this.chunkRepo.getTotalSize();
        const maxSize = settings.maxSize * 1024 * 1024;
        if (totalSize / maxSize > 0.7) {
          observer.error({ message: 'Storage capacity too high for prefetch (>70%)' });
          return;
        }

        // Filter out already cached chunks
        const uncachedChunks: string[] = [];
        for (const chunkId of job.chunkIds) {
          const exists = await this.chunkRepo.chunkExists(chunkId);
          if (!exists) {
            uncachedChunks.push(chunkId);
          }
        }

        if (uncachedChunks.length === 0) {
          job.status = 'completed';
          job.progress = 100;
          job.endTime = Date.now();
          observer.next(job);
          observer.complete();
          return;
        }

        // Update job with uncached chunks only
        job.chunkIds = uncachedChunks;
        job.status = 'in-progress';
        this.prefetchQueue.push(job);
        this.updateJobsList();

        // Start processing
        this.processPrefetchQueue(job).subscribe({
          next: (progress) => {
            job.progress = progress;
            observer.next(job);
          },
          complete: () => {
            job.status = 'completed';
            job.progress = 100;
            job.endTime = Date.now();
            observer.next(job);
            observer.complete();
            this.updateJobsList();
          },
          error: (err) => {
            job.status = 'failed';
            job.error = err.message;
            job.endTime = Date.now();
            observer.error(err);
            this.updateJobsList();
          }
        });
      }).catch(err => observer.error(err));
    });
  }

  /**
   * Process prefetch queue
   */
  private processPrefetchQueue(job: PrefetchJob): Observable<number> {
    return new Observable((observer) => {
      if (this.isPrefetchingFlag) {
        observer.error({ message: 'Prefetch already in progress' });
        return;
      }

      this.isPrefetchingFlag = true;
      const total = job.chunkIds.length;
      let completed = 0;

      const processNext = () => {
        if (completed >= total) {
          this.isPrefetchingFlag = false;
          const index = this.prefetchQueue.indexOf(job);
          if (index !== -1) {
            this.prefetchQueue.splice(index, 1);
          }
          observer.complete();
          return;
        }

        const chunkId = job.chunkIds[completed];

        this.loader.loadChunk(chunkId).subscribe({
          next: () => {
            completed++;
            const progress = (completed / total) * 100;
            observer.next(progress);

            // Small delay between chunks to avoid blocking
            setTimeout(processNext, 100);
          },
          error: (err) => {
            console.error(`[PrefetchService] Failed to prefetch chunk ${chunkId}:`, err);
            completed++;
            const progress = (completed / total) * 100;
            observer.next(progress);

            // Continue with next chunk
            setTimeout(processNext, 100);
          }
        });
      };

      processNext();
    });
  }

  /**
   * Cancel a prefetch job
   */
  cancelPrefetchJob(jobId: string): void {
    const index = this.prefetchQueue.findIndex(j => j.id === jobId);
    if (index !== -1) {
      this.prefetchQueue[index].status = 'cancelled';
      this.prefetchQueue.splice(index, 1);
      this.updateJobsList();
      console.log(`[PrefetchService] Cancelled job: ${jobId}`);
    }
  }

  /**
   * Get all prefetch jobs
   */
  getPrefetchJobs(): Observable<PrefetchJob[]> {
    return this.prefetchJobsSubject.asObservable();
  }

  /**
   * Enable/disable prefetch
   */
  async enablePrefetch(enabled: boolean): Promise<void> {
    const settings = await this.getSettings();
    settings.enabled = enabled;
    await this.updateSettings(settings);
    console.log(`[PrefetchService] Prefetch ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set prefetch on WiFi only
   */
  async setPrefetchOnWiFiOnly(wifiOnly: boolean): Promise<void> {
    const settings = await this.getSettings();
    settings.prefetchOnWiFi = true;
    settings.prefetchOnMobile = !wifiOnly;
    await this.updateSettings(settings);
    console.log(`[PrefetchService] WiFi only: ${wifiOnly}`);
  }

  /**
   * Set maximum prefetch size
   */
  async setMaxPrefetchSize(sizeMB: number): Promise<void> {
    const settings = await this.getSettings();
    settings.maxSize = sizeMB;
    await this.updateSettings(settings);
    console.log(`[PrefetchService] Max size set to: ${sizeMB}MB`);
  }

  /**
   * Trigger: User searched for a vehicle
   */
  onUserSearch(year: number, make: string): void {
    const chunkId = `${year}_${make}`;
    this.prefetchRelatedChunks(chunkId).subscribe({
      next: () => console.log('[PrefetchService] Related chunks prefetched'),
      error: (err) => console.error('[PrefetchService] Prefetch failed:', err)
    });
  }

  /**
   * Trigger: Idle time detected
   */
  onIdleDetected(): void {
    this.prefetchPopularMakes().subscribe({
      next: () => console.log('[PrefetchService] Popular makes prefetched'),
      error: (err) => console.error('[PrefetchService] Prefetch failed:', err)
    });
  }

  /**
   * Trigger: WiFi connected
   */
  onWiFiConnected(): void {
    this.prefetchCurrentYear().subscribe({
      next: () => console.log('[PrefetchService] Current year prefetched'),
      error: (err) => console.error('[PrefetchService] Prefetch failed:', err)
    });
  }

  /**
   * Check if prefetching
   */
  isPrefetching(): boolean {
    return this.isPrefetchingFlag;
  }

  /**
   * Get prefetch progress
   */
  getPrefetchProgress(): Observable<number> {
    // Return progress of current job
    return new Observable((observer) => {
      if (this.prefetchQueue.length > 0) {
        observer.next(this.prefetchQueue[0].progress);
      } else {
        observer.next(0);
      }
      observer.complete();
    });
  }

  /**
   * Get settings
   */
  private async getSettings(): Promise<CacheSettings> {
    const settings = await this.chunkRepo.getSettings();
    return settings || {
      id: 'settings',
      enabled: true,
      maxSize: 300,
      prefetchOnWiFi: true,
      prefetchOnMobile: false,
      autoEviction: true,
      popularMakesOnly: false,
      compressionEnabled: true
    };
  }

  /**
   * Update settings
   */
  private async updateSettings(settings: CacheSettings): Promise<void> {
    await this.chunkRepo.updateSettings(settings);
  }

  /**
   * Update jobs list
   */
  private updateJobsList(): void {
    this.prefetchJobsSubject.next([...this.prefetchQueue]);
  }
}
