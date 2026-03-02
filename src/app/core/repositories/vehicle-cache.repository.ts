import { Injectable } from '@angular/core';
import { Vehicle, SearchCriteria } from '../models/vehicle.model';
import { IndexedDBRepository } from './indexeddb.repository';

/**
 * Vehicle Cache Repository
 * Manages vehicle data caching in IndexedDB
 * Implements LRU eviction strategy (max 100 entries)
 */
@Injectable({
  providedIn: 'root',
})
export class VehicleCacheRepository extends IndexedDBRepository {
  private readonly storeName = 'vehicle-cache';
  private readonly maxEntries = 100;

  /**
   * Save vehicle to cache
   * Implements LRU eviction if cache is full
   */
  async save(vehicle: Vehicle): Promise<void> {
    // Add timestamp for LRU tracking
    const vehicleWithTimestamp = {
      ...vehicle,
      cachedAt: new Date(),
    };

    // Check if cache is full
    const count = await this.count(this.storeName);
    if (count >= this.maxEntries) {
      await this.evictOldest();
    }

    await this.put(this.storeName, vehicleWithTimestamp);
  }

  /**
   * Get vehicle by VIN
   */
  async getByVin(vin: string): Promise<Vehicle | null> {
    return this.get<Vehicle>(this.storeName, vin);
  }

  /**
   * Search vehicles by criteria (year, make, model)
   * Returns first matching vehicle from cache
   */
  async search(criteria: SearchCriteria): Promise<Vehicle | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const vehicle = cursor.value as Vehicle;
          
          // Check if vehicle matches criteria
          const yearMatch = !criteria.year || vehicle.year === criteria.year;
          const makeMatch =
            !criteria.make ||
            vehicle.make.toLowerCase() === criteria.make.toLowerCase();
          const modelMatch =
            !criteria.model ||
            vehicle.model.toLowerCase() === criteria.model.toLowerCase();

          if (yearMatch && makeMatch && modelMatch) {
            resolve(vehicle);
            return;
          }

          cursor.continue();
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to search vehicles'));
      };
    });
  }

  /**
   * Get all cached vehicles
   */
  async getAllVehicles(): Promise<Vehicle[]> {
    return super.getAll<Vehicle>(this.storeName);
  }

  /**
   * Evict oldest cached vehicle (LRU strategy)
   */
  async evictOldest(): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('cachedAt');
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          resolve();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to evict oldest vehicle'));
      };
    });
  }

  /**
   * Clear all cached vehicles
   */
  async clearCache(): Promise<void> {
    return this.clear(this.storeName);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ count: number; maxEntries: number }> {
    const count = await this.count(this.storeName);
    return {
      count,
      maxEntries: this.maxEntries,
    };
  }
}
