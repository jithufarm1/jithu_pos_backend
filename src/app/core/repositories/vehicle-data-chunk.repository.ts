import { Injectable } from '@angular/core';
import { IndexedDBRepository } from './indexeddb.repository';
import {
  CachedChunk,
  ChunkCatalog,
  VehicleSearchIndex,
} from '../models/vehicle-data-cache.model';

/**
 * Vehicle Data Chunk Repository
 * Manages IndexedDB operations for vehicle data chunks
 * Extends base IndexedDBRepository for core CRUD operations
 */
@Injectable({
  providedIn: 'root'
})
export class VehicleDataChunkRepository extends IndexedDBRepository {
  private readonly CHUNKS_STORE = 'vehicle-data-chunks';
  private readonly CATALOG_STORE = 'vehicle-data-catalog';
  private readonly INDEX_STORE = 'vehicle-data-index';
  private readonly SETTINGS_STORE = 'vehicle-cache-settings';
  private readonly METRICS_STORE = 'vehicle-cache-metrics';

  constructor() {
    super();
  }

  /**
   * Save a chunk to IndexedDB
   */
  async saveChunk(chunk: CachedChunk): Promise<void> {
    await this.put(this.CHUNKS_STORE, chunk);
  }

  /**
   * Get a chunk from IndexedDB
   */
  async getChunk(chunkId: string): Promise<CachedChunk | null> {
    return await this.get<CachedChunk>(this.CHUNKS_STORE, chunkId);
  }

  /**
   * Delete a chunk from IndexedDB
   */
  async deleteChunk(chunkId: string): Promise<void> {
    await this.delete(this.CHUNKS_STORE, chunkId);
  }

  /**
   * Check if a chunk exists in IndexedDB
   */
  async chunkExists(chunkId: string): Promise<boolean> {
    const chunk = await this.getChunk(chunkId);
    return chunk !== null;
  }

  /**
   * Save catalog to IndexedDB
   */
  async saveCatalog(catalog: ChunkCatalog): Promise<void> {
    await this.put(this.CATALOG_STORE, { ...catalog, id: 'current' });
  }

  /**
   * Get catalog from IndexedDB
   */
  async getCatalog(): Promise<ChunkCatalog | null> {
    const result = await this.get<ChunkCatalog & { id: string }>(
      this.CATALOG_STORE,
      'current'
    );
    if (!result) return null;
    
    // Remove the id field before returning
    const { id, ...catalog } = result;
    return catalog as ChunkCatalog;
  }

  /**
   * Save search index entry
   */
  async saveIndex(index: VehicleSearchIndex): Promise<void> {
    await this.put(this.INDEX_STORE, index);
  }

  /**
   * Get index entry by search key
   */
  async getIndexBySearchKey(searchKey: string): Promise<VehicleSearchIndex | null> {
    return await this.get<VehicleSearchIndex>(this.INDEX_STORE, searchKey);
  }

  /**
   * Search index by partial query
   */
  async searchIndex(query: string): Promise<VehicleSearchIndex[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.INDEX_STORE, 'readonly');
      const store = transaction.objectStore(this.INDEX_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const allIndexes = request.result as VehicleSearchIndex[];
        const queryUpper = query.toUpperCase();
        const filtered = allIndexes.filter(index =>
          index.searchKey.includes(queryUpper)
        );
        resolve(filtered);
      };

      request.onerror = () => {
        reject(new Error('Failed to search index'));
      };
    });
  }

  /**
   * Get all chunks
   */
  async getAllChunks(): Promise<CachedChunk[]> {
    return await this.getAll<CachedChunk>(this.CHUNKS_STORE);
  }

  /**
   * Get chunks by year
   */
  async getChunksByYear(year: number): Promise<CachedChunk[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.CHUNKS_STORE, 'readonly');
      const store = transaction.objectStore(this.CHUNKS_STORE);
      const index = store.index('year');
      const request = index.getAll(year);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get chunks for year ${year}`));
      };
    });
  }

  /**
   * Get chunks by make
   */
  async getChunksByMake(make: string): Promise<CachedChunk[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.CHUNKS_STORE, 'readonly');
      const store = transaction.objectStore(this.CHUNKS_STORE);
      const index = store.index('make');
      const request = index.getAll(make.toUpperCase());

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get chunks for make ${make}`));
      };
    });
  }

  /**
   * Get total size of all cached chunks
   */
  async getTotalSize(): Promise<number> {
    const chunks = await this.getAllChunks();
    return chunks.reduce((total, chunk) => total + chunk.data.size, 0);
  }

  /**
   * Get count of cached chunks
   */
  async getChunkCount(): Promise<number> {
    return await this.count(this.CHUNKS_STORE);
  }

  /**
   * Clear all chunks
   */
  async clearAllChunks(): Promise<void> {
    await this.clear(this.CHUNKS_STORE);
  }

  /**
   * Update access time for a chunk
   */
  async updateAccessTime(chunkId: string): Promise<void> {
    const chunk = await this.getChunk(chunkId);
    if (chunk) {
      chunk.lastAccessed = Date.now();
      chunk.accessCount++;
      await this.saveChunk(chunk);
    }
  }

  /**
   * Get chunks sorted by last accessed time (ascending)
   */
  async getChunksSortedByAccess(): Promise<CachedChunk[]> {
    const chunks = await this.getAllChunks();
    return chunks.sort((a, b) => a.lastAccessed - b.lastAccessed);
  }

  /**
   * Get chunks sorted by priority and access time
   */
  async getChunksSortedByPriority(): Promise<CachedChunk[]> {
    const chunks = await this.getAllChunks();
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    return chunks.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by last accessed (most recent first)
      return b.lastAccessed - a.lastAccessed;
    });
  }

  /**
   * Get chunks by priority
   */
  async getChunksByPriority(priority: 'critical' | 'high' | 'medium' | 'low'): Promise<CachedChunk[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.CHUNKS_STORE, 'readonly');
      const store = transaction.objectStore(this.CHUNKS_STORE);
      const index = store.index('priority');
      const request = index.getAll(priority);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get chunks with priority ${priority}`));
      };
    });
  }

  /**
   * Clear catalog
   */
  async clearCatalog(): Promise<void> {
    await this.delete(this.CATALOG_STORE, 'current');
  }

  /**
   * Delete index entry by search key
   */
  async deleteIndex(searchKey: string): Promise<void> {
    await this.delete(this.INDEX_STORE, searchKey);
  }

  /**
   * Clear index
   */
  async clearIndex(): Promise<void> {
    await this.clear(this.INDEX_STORE);
  }

  /**
   * Get index size (number of entries)
   */
  async getIndexSize(): Promise<number> {
    return await this.count(this.INDEX_STORE);
  }

  /**
   * Get all index entries
   */
  async getAllIndexEntries(): Promise<VehicleSearchIndex[]> {
    return await this.getAll<VehicleSearchIndex>(this.INDEX_STORE);
  }

  /**
   * Bulk save index entries
   */
  async bulkSaveIndexEntries(entries: VehicleSearchIndex[]): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.INDEX_STORE, 'readwrite');
      const store = transaction.objectStore(this.INDEX_STORE);

      let completed = 0;
      const total = entries.length;

      entries.forEach(entry => {
        const request = store.put(entry);
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };
        request.onerror = () => {
          reject(new Error('Failed to save index entry'));
        };
      });

      if (total === 0) {
        resolve();
      }
    });
  }

  /**
   * Get chunks by chunkIds
   */
  async getChunksByIds(chunkIds: string[]): Promise<CachedChunk[]> {
    const chunks: CachedChunk[] = [];
    for (const chunkId of chunkIds) {
      const chunk = await this.getChunk(chunkId);
      if (chunk) {
        chunks.push(chunk);
      }
    }
    return chunks;
  }

  /**
   * Get cache settings
   */
  async getSettings(): Promise<any | null> {
    return await this.get(this.SETTINGS_STORE, 'settings');
  }

  /**
   * Update cache settings
   */
  async updateSettings(settings: any): Promise<void> {
    await this.put(this.SETTINGS_STORE, { ...settings, id: 'settings' });
  }

  /**
   * Get cache metrics
   */
  async getMetrics(): Promise<any | null> {
    return await this.get(this.METRICS_STORE, 'metrics');
  }

  /**
   * Update cache metrics
   */
  async updateMetrics(metrics: any): Promise<void> {
    await this.put(this.METRICS_STORE, { ...metrics, id: 'metrics' });
  }
}
