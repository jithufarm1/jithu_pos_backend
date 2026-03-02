import { Injectable } from '@angular/core';
import { ReferenceData } from '../models/vehicle.model';
import { IndexedDBRepository } from './indexeddb.repository';

/**
 * Reference Data Repository
 * Manages reference data (makes, models, engines, service types) in IndexedDB
 * Implements TTL-based staleness check (24 hours)
 */
@Injectable({
  providedIn: 'root',
})
export class ReferenceDataRepository extends IndexedDBRepository {
  private readonly storeName = 'reference-data';
  private readonly dataKey = 'reference-data-v1';
  private readonly ttlHours = 24;

  /**
   * Save reference data to cache
   */
  async save(data: ReferenceData): Promise<void> {
    const dataWithMetadata = {
      id: this.dataKey,
      ...data,
      lastUpdated: new Date(),
    };
    await this.put(this.storeName, dataWithMetadata);
  }

  /**
   * Get reference data from cache
   */
  async getData(): Promise<ReferenceData | null> {
    const data = await this.get<ReferenceData & { id: string }>(
      this.storeName,
      this.dataKey
    );
    if (!data) {
      return null;
    }

    // Remove the id field before returning
    const { id, ...referenceData } = data;
    return referenceData as ReferenceData;
  }

  /**
   * Check if cached reference data is stale (older than TTL)
   */
  async isStale(): Promise<boolean> {
    const data = await this.get<ReferenceData & { id: string }>(
      this.storeName,
      this.dataKey
    );

    if (!data || !data.lastUpdated) {
      return true;
    }

    const lastUpdated = new Date(data.lastUpdated);
    const now = new Date();
    const hoursSinceUpdate =
      (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

    return hoursSinceUpdate >= this.ttlHours;
  }

  /**
   * Clear reference data cache
   */
  async clearCache(): Promise<void> {
    return this.delete(this.storeName, this.dataKey);
  }

  /**
   * Get cache metadata
   */
  async getMetadata(): Promise<{
    exists: boolean;
    lastUpdated?: Date;
    isStale: boolean;
  }> {
    const data = await this.get<ReferenceData & { id: string }>(
      this.storeName,
      this.dataKey
    );
    const isStale = await this.isStale();

    return {
      exists: !!data,
      lastUpdated: data?.lastUpdated,
      isStale,
    };
  }
}
