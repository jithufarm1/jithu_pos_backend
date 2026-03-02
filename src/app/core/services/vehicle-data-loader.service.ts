import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, from, of } from 'rxjs';
import { map, switchMap, catchError, tap, filter } from 'rxjs/operators';
import { VehicleDataChunkRepository } from '../repositories/vehicle-data-chunk.repository';
import { VehicleDataCompressionService } from './vehicle-data-compression.service';
import { VehicleDataLRUService } from './vehicle-data-lru.service';
import {
  VehicleDataChunk,
  CachedChunk,
  ChunkCatalog,
  CacheProgress,
  CacheMetrics,
  ChunkPriority,
  VehicleTrim,
  VehicleSpecs,
  POPULAR_MAKES,
} from '../models/vehicle-data-cache.model';
import { environment } from '../../../environments/environment';

/**
 * Vehicle Data Loader Service
 * Orchestrates chunk loading with caching and network fallback
 */
@Injectable({
  providedIn: 'root'
})
export class VehicleDataLoaderService {
  private readonly apiUrl = environment.apiBaseUrl || 'http://localhost:3000/api';
  private progressSubject = new BehaviorSubject<CacheProgress | null>(null);

  constructor(
    private http: HttpClient,
    private chunkRepo: VehicleDataChunkRepository,
    private compression: VehicleDataCompressionService,
    private lruService: VehicleDataLRUService
  ) {}

  /**
   * Load a chunk with cache-first strategy
   */
  loadChunk(chunkId: string): Observable<VehicleDataChunk> {
    return new Observable((observer) => {
      // Step 1: Check cache
      this.chunkRepo.getChunk(chunkId).then(async (cached) => {
        if (cached) {
          // Cache hit
          console.log(`[Loader] Cache hit for chunk: ${chunkId}`);
          await this.lruService.recordAccess(chunkId);

          try {
            // Decompress
            const startTime = Date.now();
            const json = await this.compression.decompress(cached.data);
            const chunk = JSON.parse(json) as VehicleDataChunk;
            const loadTime = Date.now() - startTime;

            console.log(`[Loader] Decompressed chunk in ${loadTime}ms`);
            observer.next(chunk);
            observer.complete();
          } catch (error) {
            console.error(`[Loader] Decompression failed:`, error);
            observer.error(error);
          }
          return;
        }

        // Cache miss - download from network
        console.log(`[Loader] Cache miss for chunk: ${chunkId}`);

        if (!this.isOnline()) {
          observer.error({
            message: 'Vehicle data not cached. Please connect to download.',
            category: 'OFFLINE'
          });
          return;
        }

        // Step 2: Download from API
        this.downloadAndCacheChunk(chunkId).subscribe({
          next: (chunk) => {
            observer.next(chunk);
            observer.complete();
          },
          error: (err) => observer.error(err)
        });
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  /**
   * Download and cache a chunk from the network
   */
  private downloadAndCacheChunk(chunkId: string): Observable<VehicleDataChunk> {
    const url = `${this.apiUrl}/vehicle-data/chunk/${chunkId}`;

    return this.http.get(url, {
      responseType: 'blob',
      reportProgress: true,
      observe: 'events'
    }).pipe(
      tap((event) => {
        // Report progress
        if (event.type === HttpEventType.DownloadProgress) {
          const progress: CacheProgress = {
            status: 'downloading',
            chunkId,
            bytesDownloaded: event.loaded,
            totalBytes: event.total || 0,
            percentage: event.total ? (event.loaded / event.total) * 100 : 0
          };
          this.progressSubject.next(progress);
        }
      }),
      filter((event) => event.type === HttpEventType.Response),
      map((event: any) => event.body as Blob),
      switchMap((blob) => from(this.processDownloadedChunk(chunkId, blob))),
      catchError((error) => {
        this.progressSubject.next({
          status: 'error',
          chunkId,
          bytesDownloaded: 0,
          totalBytes: 0,
          percentage: 0,
          error: error.message
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Process downloaded chunk (decompress, parse, cache)
   */
  private async processDownloadedChunk(chunkId: string, blob: Blob): Promise<VehicleDataChunk> {
    // Decompress and parse
    this.progressSubject.next({
      status: 'decompressing',
      chunkId,
      bytesDownloaded: blob.size,
      totalBytes: blob.size,
      percentage: 100
    });

    const json = await this.compression.decompress(blob);
    const chunk = JSON.parse(json) as VehicleDataChunk;

    // Store in cache
    this.progressSubject.next({
      status: 'storing',
      chunkId,
      bytesDownloaded: blob.size,
      totalBytes: blob.size,
      percentage: 100
    });

    await this.cacheChunk(chunkId, blob, chunk.metadata);

    this.progressSubject.next({
      status: 'complete',
      chunkId,
      bytesDownloaded: blob.size,
      totalBytes: blob.size,
      percentage: 100
    });

    return chunk;
  }

  /**
   * Cache a chunk
   */
  private async cacheChunk(
    chunkId: string,
    compressedData: Blob,
    metadata: any
  ): Promise<void> {
    const cached: CachedChunk = {
      chunkId,
      data: compressedData,
      metadata,
      lastAccessed: Date.now(),
      accessCount: 1,
      priority: this.determinePriority(chunkId),
      protected: false
    };

    await this.chunkRepo.saveChunk(cached);
    await this.lruService.checkAndEvict();
  }

  /**
   * Determine chunk priority based on year and make
   */
  private determinePriority(chunkId: string): ChunkPriority {
    const [year, make] = chunkId.split('_');
    const currentYear = new Date().getFullYear();

    // Current year = critical
    if (parseInt(year) === currentYear) {
      return 'critical';
    }

    // Popular makes = high
    if (POPULAR_MAKES.includes(make)) {
      return 'high';
    }

    // Recent years (last 5) = medium
    if (parseInt(year) >= currentYear - 5) {
      return 'medium';
    }

    // Older = low
    return 'low';
  }

  /**
   * Load chunks by year
   */
  loadChunksByYear(year: number): Observable<VehicleDataChunk[]> {
    return from(this.chunkRepo.getChunksByYear(year)).pipe(
      switchMap(async (cachedChunks) => {
        const chunks: VehicleDataChunk[] = [];
        for (const cached of cachedChunks) {
          const json = await this.compression.decompress(cached.data);
          const chunk = JSON.parse(json) as VehicleDataChunk;
          chunks.push(chunk);
        }
        return chunks;
      })
    );
  }

  /**
   * Load chunks by make
   */
  loadChunksByMake(make: string): Observable<VehicleDataChunk[]> {
    return from(this.chunkRepo.getChunksByMake(make)).pipe(
      switchMap(async (cachedChunks) => {
        const chunks: VehicleDataChunk[] = [];
        for (const cached of cachedChunks) {
          const json = await this.compression.decompress(cached.data);
          const chunk = JSON.parse(json) as VehicleDataChunk;
          chunks.push(chunk);
        }
        return chunks;
      })
    );
  }

  /**
   * Search for a vehicle across chunks
   */
  searchVehicle(year: number, make: string, model: string): Observable<VehicleTrim[]> {
    const chunkId = `${year}_${make.toUpperCase()}`;
    
    return this.loadChunk(chunkId).pipe(
      map((chunk) => {
        const vehicleModel = chunk.models.find(m => 
          m.model.toUpperCase() === model.toUpperCase()
        );
        return vehicleModel ? vehicleModel.trims : [];
      })
    );
  }

  /**
   * Get vehicle by VIN (placeholder - requires VIN decoding)
   */
  getVehicleByVin(vin: string): Observable<VehicleSpecs | null> {
    // VIN decoding would happen here
    // For now, return null as this requires external VIN decoder
    return of(null);
  }

  /**
   * Load catalog from API
   */
  loadCatalog(): Observable<ChunkCatalog> {
    // Check cache first
    return from(this.chunkRepo.getCatalog()).pipe(
      switchMap((cached) => {
        if (cached) {
          return of(cached);
        }
        return this.refreshCatalog();
      })
    );
  }

  /**
   * Refresh catalog from API
   */
  refreshCatalog(): Observable<ChunkCatalog> {
    const url = `${this.apiUrl}/vehicle-data/catalog`;
    
    return this.http.get<ChunkCatalog>(url).pipe(
      tap(async (catalog) => {
        await this.chunkRepo.saveCatalog(catalog);
      }),
      catchError((error) => {
        console.error('[Loader] Failed to refresh catalog:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get load progress observable
   */
  getLoadProgress(): Observable<CacheProgress | null> {
    return this.progressSubject.asObservable();
  }

  /**
   * Preload multiple chunks
   */
  preloadChunks(chunkIds: string[]): Observable<number> {
    return new Observable((observer) => {
      let completed = 0;
      const total = chunkIds.length;

      const loadNext = (index: number) => {
        if (index >= total) {
          observer.complete();
          return;
        }

        this.loadChunk(chunkIds[index]).subscribe({
          next: () => {
            completed++;
            observer.next((completed / total) * 100);
            loadNext(index + 1);
          },
          error: (err) => {
            console.error(`Failed to preload chunk ${chunkIds[index]}:`, err);
            completed++;
            observer.next((completed / total) * 100);
            loadNext(index + 1);
          }
        });
      };

      loadNext(0);
    });
  }

  /**
   * Clear all cached chunks
   */
  async clearCache(): Promise<void> {
    await this.chunkRepo.clearAllChunks();
    await this.chunkRepo.clearCatalog();
    await this.chunkRepo.clearIndex();
  }

  /**
   * Get cache metrics
   */
  async getCacheMetrics(): Promise<CacheMetrics> {
    const totalSize = await this.chunkRepo.getTotalSize();
    const chunkCount = await this.chunkRepo.getChunkCount();

    return {
      totalSize,
      compressedSize: totalSize,
      chunkCount,
      hitCount: 0, // Would be tracked separately
      missCount: 0,
      evictionCount: 0,
      prefetchCount: 0,
      avgLoadTime: 0,
      lastSync: Date.now()
    };
  }

  /**
   * Check if online
   */
  private isOnline(): boolean {
    return navigator.onLine;
  }
}
