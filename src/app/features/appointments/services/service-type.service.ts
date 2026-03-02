/**
 * Service Type Service
 * 
 * Manages service types for appointments including:
 * - Retrieving predefined service types
 * - Creating custom service types
 * - Calculating total duration for multiple services
 * - Caching service types in IndexedDB
 */

import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { ServiceType, ServiceCategory } from '../../../core/models/appointment.model';
import { SERVICE_TYPES, getServiceTypeById as getServiceTypeByIdFromData } from '../../../core/data/service-types.data';
import { IndexedDBRepository } from '../../../core/repositories/indexeddb.repository';

@Injectable({
  providedIn: 'root',
})
export class ServiceTypeService extends IndexedDBRepository {
  private readonly STORE_NAME = 'service-types';
  private cacheInitialized = false;

  /**
   * Get all service types
   * Returns cached data if available, otherwise loads from predefined data
   */
  getServiceTypes(): Observable<ServiceType[]> {
    return from(this.ensureCacheInitialized()).pipe(
      switchMap(() => from(this.getAll<ServiceType>(this.STORE_NAME))),
      catchError(error => {
        console.error('Error getting service types:', error);
        return of(SERVICE_TYPES);
      })
    );
  }

  /**
   * Get service type by ID
   */
  getServiceTypeById(id: string): Observable<ServiceType | null> {
    return from(this.ensureCacheInitialized()).pipe(
      switchMap(() => from(this.get<ServiceType>(this.STORE_NAME, id))),
      catchError(error => {
        console.error('Error getting service type:', error);
        const serviceType = getServiceTypeByIdFromData(id);
        return of(serviceType || null);
      })
    );
  }

  /**
   * Get service types by category
   */
  getServiceTypesByCategory(category: ServiceCategory): Observable<ServiceType[]> {
    return this.getServiceTypes().pipe(
      map(serviceTypes => serviceTypes.filter(st => st.category === category && st.isActive))
    );
  }

  /**
   * Calculate total duration for multiple service types
   */
  calculateTotalDuration(serviceTypeIds: string[]): number {
    if (!serviceTypeIds || serviceTypeIds.length === 0) {
      return 0;
    }

    let totalDuration = 0;
    
    for (const id of serviceTypeIds) {
      const serviceType = getServiceTypeByIdFromData(id);
      if (serviceType) {
        totalDuration += serviceType.duration;
      }
    }

    return totalDuration;
  }

  /**
   * Calculate total duration asynchronously (for cached service types)
   */
  calculateTotalDurationAsync(serviceTypeIds: string[]): Observable<number> {
    if (!serviceTypeIds || serviceTypeIds.length === 0) {
      return of(0);
    }

    return this.getServiceTypes().pipe(
      map(serviceTypes => {
        let totalDuration = 0;
        
        for (const id of serviceTypeIds) {
          const serviceType = serviceTypes.find(st => st.id === id);
          if (serviceType) {
            totalDuration += serviceType.duration;
          }
        }

        return totalDuration;
      })
    );
  }

  /**
   * Create a custom service type
   */
  createCustomServiceType(name: string, duration: number, description: string = ''): Observable<ServiceType> {
    const customServiceType: ServiceType = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      category: 'Custom',
      duration,
      description,
      isActive: true,
      isCustom: true,
    };

    return from(this.saveServiceType(customServiceType)).pipe(
      map(() => customServiceType),
      catchError(error => {
        console.error('Error creating custom service type:', error);
        throw error;
      })
    );
  }

  /**
   * Update a service type
   */
  updateServiceType(serviceType: ServiceType): Observable<ServiceType> {
    return from(this.saveServiceType(serviceType)).pipe(
      map(() => serviceType),
      catchError(error => {
        console.error('Error updating service type:', error);
        throw error;
      })
    );
  }

  /**
   * Delete a custom service type
   */
  deleteServiceType(id: string): Observable<void> {
    return from(this.delete(this.STORE_NAME, id)).pipe(
      catchError(error => {
        console.error('Error deleting service type:', error);
        throw error;
      })
    );
  }

  /**
   * Get all custom service types
   */
  getCustomServiceTypes(): Observable<ServiceType[]> {
    return this.getServiceTypes().pipe(
      map(serviceTypes => serviceTypes.filter(st => st.isCustom === true))
    );
  }

  /**
   * Private helper methods
   */

  /**
   * Ensure cache is initialized with predefined service types
   */
  private async ensureCacheInitialized(): Promise<void> {
    if (this.cacheInitialized) {
      return;
    }

    try {
      const existingTypes = await this.getAll<ServiceType>(this.STORE_NAME);
      
      if (existingTypes.length === 0) {
        // Cache is empty, load predefined service types
        await this.loadPredefinedServiceTypes();
      }

      this.cacheInitialized = true;
    } catch (error) {
      console.error('Error initializing service type cache:', error);
      // Load predefined types anyway
      await this.loadPredefinedServiceTypes();
      this.cacheInitialized = true;
    }
  }

  /**
   * Load predefined service types into cache
   */
  private async loadPredefinedServiceTypes(): Promise<void> {
    for (const serviceType of SERVICE_TYPES) {
      await this.saveServiceType(serviceType);
    }
  }

  /**
   * Save service type to cache
   */
  private async saveServiceType(serviceType: ServiceType): Promise<void> {
    await this.put(this.STORE_NAME, serviceType);
  }

  /**
   * Clear service type cache
   */
  clearCache(): Observable<void> {
    this.cacheInitialized = false;
    return from(this.clear(this.STORE_NAME)).pipe(
      catchError(error => {
        console.error('Error clearing service type cache:', error);
        throw error;
      })
    );
  }

  /**
   * Refresh cache with latest predefined service types
   */
  refreshCache(): Observable<void> {
    return this.clearCache().pipe(
      tap(() => {
        this.cacheInitialized = false;
      }),
      map(() => from(this.ensureCacheInitialized())),
      map(promise => from(promise)),
      map(() => undefined)
    ) as Observable<void>;
  }
}
