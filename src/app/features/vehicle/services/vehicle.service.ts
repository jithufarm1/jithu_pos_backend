import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { Vehicle, ReferenceData, SearchCriteria } from '../../../core/models/vehicle.model';
import { VehicleCacheRepository } from '../../../core/repositories/vehicle-cache.repository';
import { ReferenceDataRepository } from '../../../core/repositories/reference-data.repository';
import { NetworkDetectionService } from '../../../core/services/network-detection.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { RetryQueueService } from '../../../core/services/retry-queue.service';
import { VinDecoderService } from '../../../core/services/vin-decoder.service';
import { VehicleDataLoaderService } from '../../../core/services/vehicle-data-loader.service';
import { VehicleDataIndexService } from '../../../core/services/vehicle-data-index.service';
import { VehicleDataChunk } from '../../../core/models/vehicle-data-cache.model';
import { environment } from '../../../../environments/environment';

/**
 * Vehicle Service
 * Handles all vehicle-related API calls with offline support
 * Implements network-first caching strategy with IndexedDB fallback
 */
@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  private readonly apiUrl = environment.apiBaseUrl;

  constructor(
    private http: HttpClient,
    private vehicleCache: VehicleCacheRepository,
    private referenceDataRepo: ReferenceDataRepository,
    private networkService: NetworkDetectionService,
    private errorHandler: ErrorHandlerService,
    private retryQueue: RetryQueueService,
    private vinDecoder: VinDecoderService,
    private chunkLoader: VehicleDataLoaderService,
    private indexService: VehicleDataIndexService
  ) {}

  /**
   * Search vehicles by year, make, and model
   * Network-first strategy with cache fallback
   */
  searchVehicles(criteria: SearchCriteria): Observable<Vehicle> {
    const url = `${this.apiUrl}/vehicles`;
    const params: any = {};
    
    if (criteria.year) params.year = criteria.year.toString();
    if (criteria.make) params.make = criteria.make;
    if (criteria.model) params.model = criteria.model;

    // Try network first
    return this.http.get<Vehicle>(url, { params }).pipe(
      tap((vehicle) => {
        // Cache successful response
        this.vehicleCache.save(vehicle);
        this.networkService.updateLastSync();
      }),
      catchError((error) => {
        console.log('API call failed, attempting cache fallback');
        
        // Try cache fallback
        return this.searchFromCache(criteria).pipe(
          catchError(() => {
            // Queue for retry if recoverable
            if (this.errorHandler.isRecoverable(error)) {
              this.retryQueue.enqueue(url, 'GET', null, { params });
            }
            return this.errorHandler.handleError(error);
          })
        );
      })
    );
  }

  /**
   * Search vehicle by VIN
   * Network-first strategy with cache fallback
   */
  searchByVin(vin: string): Observable<Vehicle> {
    if (!this.isValidVin(vin)) {
      return throwError(() => ({
        message: 'Please enter a valid 17-character VIN.',
        category: 'VALIDATION',
      }));
    }

    const url = `${this.apiUrl}/vehicles/${vin}`;

    // Try network first
    return this.http.get<Vehicle>(url).pipe(
      tap((vehicle) => {
        // Cache successful response
        this.vehicleCache.save(vehicle);
        this.networkService.updateLastSync();
      }),
      catchError((error) => {
        console.log('VIN lookup failed, attempting cache fallback');
        
        // Try cache fallback
        return this.getFromCacheByVin(vin).pipe(
          catchError(() => {
            // Queue for retry if recoverable
            if (this.errorHandler.isRecoverable(error)) {
              this.retryQueue.enqueue(url, 'GET');
            }
            return this.errorHandler.handleError(error);
          })
        );
      })
    );
  }

  /**
   * Search vehicle by VIN using NHTSA decoder
   * 3-tier fallback: VIN Decoder → Chunked Cache → Legacy Cache
   */
  searchByVinWithDecoder(vin: string): Observable<Vehicle> {
    console.log(`[VehicleService] Searching by VIN: ${vin}`);

    // Step 1: Decode VIN using NHTSA API
    return this.vinDecoder.decodeVin(vin).pipe(
      switchMap(vinResult => {
        if (!vinResult.valid) {
          return throwError(() => ({
            message: vinResult.errorMessage || 'Invalid VIN',
            category: 'VALIDATION'
          }));
        }

        console.log(`[VehicleService] VIN decoded: ${vinResult.year} ${vinResult.make} ${vinResult.model}`);

        // Step 2: Try to find vehicle in chunked cache
        if (vinResult.year && vinResult.make && vinResult.model) {
          return this.searchVehiclesChunked({
            year: vinResult.year,
            make: vinResult.make,
            model: vinResult.model
          }).pipe(
            map(vehicle => ({
              ...vehicle,
              vin: vin // Add VIN to result
            })),
            catchError(error => {
              console.log('[VehicleService] Chunked cache miss, trying legacy cache');
              // Step 3: Fallback to legacy cache
              return this.getFromCacheByVin(vin);
            })
          );
        }

        // If VIN decode didn't provide enough info, try legacy cache
        return this.getFromCacheByVin(vin);
      }),
      catchError(error => {
        console.error('[VehicleService] VIN search failed:', error);
        // Final fallback: try legacy VIN lookup
        return this.searchByVin(vin);
      })
    );
  }

  /**
   * Search vehicles using chunked cache
   * Cache-first strategy with network fallback
   */
  searchVehiclesChunked(criteria: SearchCriteria): Observable<Vehicle> {
    console.log('[VehicleService] Searching with chunked cache:', criteria);

    if (!criteria.year || !criteria.make) {
      // Fall back to legacy search if year/make not provided
      return this.searchVehicles(criteria);
    }

    return new Observable((observer) => {
      // Find chunk ID using index service
      this.indexService.findChunkByVehicle(
        criteria.year!,
        criteria.make!,
        criteria.model
      ).then(chunkId => {
        if (!chunkId) {
          // No chunk found, fall back to legacy search
          console.log('[VehicleService] No chunk found, using legacy search');
          this.searchVehicles(criteria).subscribe({
            next: v => observer.next(v),
            error: e => observer.error(e),
            complete: () => observer.complete()
          });
          return;
        }

        console.log(`[VehicleService] Loading chunk: ${chunkId}`);

        // Load chunk
        this.chunkLoader.loadChunk(chunkId).subscribe({
          next: (chunk) => {
            // Find vehicle in chunk
            const vehicle = this.findVehicleInChunk(chunk, criteria);

            if (vehicle) {
              console.log('[VehicleService] Vehicle found in chunk');
              observer.next(vehicle);
              observer.complete();
            } else {
              console.log('[VehicleService] Vehicle not found in chunk');
              observer.error({
                message: 'Vehicle not found',
                category: 'NOT_FOUND'
              });
            }
          },
          error: (err) => {
            console.error('[VehicleService] Chunk load failed:', err);
            // Fall back to legacy search
            this.searchVehicles(criteria).subscribe({
              next: v => observer.next(v),
              error: e => observer.error(e),
              complete: () => observer.complete()
            });
          }
        });
      }).catch(error => {
        console.error('[VehicleService] Index lookup failed:', error);
        observer.error(error);
      });
    });
  }

  /**
   * Find vehicle in chunk data
   */
  private findVehicleInChunk(
    chunk: VehicleDataChunk,
    criteria: SearchCriteria
  ): Vehicle | null {
    for (const model of chunk.models) {
      // Check if model matches (case-insensitive)
      if (criteria.model &&
          model.model.toLowerCase() !== criteria.model.toLowerCase()) {
        continue;
      }

      // Return first trim for matching model (or first model if no specific model requested)
      if (model.trims.length > 0) {
        const trim = model.trims[0];
        return {
          vin: '',
          year: chunk.year,
          make: chunk.make,
          model: model.model,
          engine: trim.specs.engine || '',
          oilType: trim.specs.oilType || '',
          oilCapacity: trim.specs.oilCapacity?.toString() || '',
          recommendedServices: [],
          serviceInterval: 5000
        };
      }
    }

    return null;
  }

  /**
   * Get reference data (makes, models, engines, service types)
   * Cache-first strategy with network fallback
   */
  getReferenceData(): Observable<ReferenceData> {
    console.log('[VehicleService] Getting reference data...');
    console.log('[VehicleService] API URL:', `${this.apiUrl}/vehicles/reference-data`);
    
    // Check cache first
    return new Observable((observer) => {
      this.referenceDataRepo.getData().then((cachedData) => {
        this.referenceDataRepo.isStale().then((isStale) => {
          // Use cache if available and not stale
          if (cachedData && !isStale) {
            console.log('[VehicleService] Using cached reference data');
            observer.next(cachedData);
            observer.complete();
            return;
          }

          // Fetch from network if stale or not cached
          console.log('[VehicleService] Fetching fresh reference data from API');
          this.fetchReferenceDataFromNetwork()
            .pipe(
              catchError((error) => {
                console.error('[VehicleService] Network fetch failed:', error);
                // If network fails and we have cached data, use it
                if (cachedData) {
                  console.log('[VehicleService] Network failed, using stale cached data');
                  return of(cachedData);
                }
                return this.errorHandler.handleError(error);
              })
            )
            .subscribe({
              next: (data) => {
                console.log('[VehicleService] Reference data received:', data);
                observer.next(data);
                observer.complete();
              },
              error: (err) => {
                console.error('[VehicleService] Error in subscription:', err);
                observer.error(err);
              },
            });
        });
      }).catch((error) => {
        console.error('[VehicleService] IndexedDB error:', error);
        // If IndexedDB fails, try network directly
        this.fetchReferenceDataFromNetwork().subscribe({
          next: (data) => observer.next(data),
          error: (err) => observer.error(err),
          complete: () => observer.complete(),
        });
      });
    });
  }

  /**
   * Fetch reference data from network
   */
  private fetchReferenceDataFromNetwork(): Observable<ReferenceData> {
    const url = `${this.apiUrl}/vehicles/reference-data`;
    
    return this.http.get<ReferenceData>(url).pipe(
      tap((data) => {
        // Cache the data
        this.referenceDataRepo.save(data);
        this.networkService.updateLastSync();
        console.log('Reference data cached successfully');
      }),
      catchError((error) => {
        // Queue for retry if recoverable
        if (this.errorHandler.isRecoverable(error)) {
          this.retryQueue.enqueue(url, 'GET');
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Search from cache
   */
  private searchFromCache(criteria: SearchCriteria): Observable<Vehicle> {
    return new Observable((observer) => {
      this.vehicleCache.search(criteria).then((vehicle) => {
        if (vehicle) {
          console.log('Vehicle found in cache');
          observer.next(vehicle);
          observer.complete();
        } else {
          observer.error({
            message: 'Vehicle not found in cache. Please try again when online.',
            category: 'NOT_FOUND',
          });
        }
      }).catch((error) => {
        observer.error(error);
      });
    });
  }

  /**
   * Get vehicle from cache by VIN
   */
  private getFromCacheByVin(vin: string): Observable<Vehicle> {
    return new Observable((observer) => {
      this.vehicleCache.getByVin(vin).then((vehicle) => {
        if (vehicle) {
          console.log('Vehicle found in cache by VIN');
          observer.next(vehicle);
          observer.complete();
        } else {
          observer.error({
            message: 'Vehicle not found in cache. Please try again when online.',
            category: 'NOT_FOUND',
          });
        }
      }).catch((error) => {
        observer.error(error);
      });
    });
  }

  /**
   * Validate VIN format (17 alphanumeric characters)
   */
  private isValidVin(vin: string): boolean {
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i;
    return vinRegex.test(vin);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return this.vehicleCache.getStats();
  }

  /**
   * Clear vehicle cache
   */
  async clearCache() {
    await this.vehicleCache.clearCache();
    await this.referenceDataRepo.clearCache();
    console.log('All caches cleared');
  }
}
