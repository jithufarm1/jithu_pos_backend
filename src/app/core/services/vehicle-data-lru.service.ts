import { Injectable } from '@angular/core';
import { VehicleDataChunkRepository } from '../repositories/vehicle-data-chunk.repository';
import {
  CachedChunk,
  LRUEntry,
  ChunkPriority,
  CacheSettings,
  DEFAULT_CACHE_SETTINGS,
  CACHE_THRESHOLDS,
} from '../models/vehicle-data-cache.model';

/**
 * Vehicle Data LRU Service
 * Implements Least Recently Used eviction strategy for vehicle data chunks
 */
@Injectable({
  providedIn: 'root'
})
export class VehicleDataLRUService {
  private evictionThreshold = CACHE_THRESHOLDS.EVICTION_THRESHOLD;
  private targetThreshold = 0.7; // Target 70% after eviction
  private protectionTime = CACHE_THRESHOLDS.PROTECTION_TIME;

  constructor(private chunkRepo: VehicleDataChunkRepository) {}

  /**
   * Check storage usage and evict if necessary
   */
  async checkAndEvict(): Promise<void> {
    const totalSize = await this.chunkRepo.getTotalSize();
    const maxSize = await this.getMaxSize();
    const percentUsed = totalSize / maxSize;

    if (percentUsed >= this.evictionThreshold) {
      console.log(`[LRU] Storage at ${(percentUsed * 100).toFixed(1)}%, triggering eviction`);
      await this.evictUntilThreshold(this.targetThreshold);
    }
  }

  /**
   * Evict oldest chunks until target threshold is reached
   */
  private async evictUntilThreshold(targetPercent: number): Promise<string[]> {
    const evictedChunks: string[] = [];
    const maxSize = await this.getMaxSize();
    let currentSize = await this.chunkRepo.getTotalSize();
    let percentUsed = currentSize / maxSize;

    while (percentUsed > targetPercent) {
      // Get eviction candidates
      const candidates = await this.getEvictionCandidates(10);

      if (candidates.length === 0) {
        console.warn('[LRU] No evictable chunks found, storage may exceed limit');
        break;
      }

      // Evict oldest candidate
      const victim = candidates[0];
      await this.chunkRepo.deleteChunk(victim.chunkId);
      evictedChunks.push(victim.chunkId);

      console.log(`[LRU] Evicted chunk: ${victim.chunkId}`);

      // Recalculate
      currentSize = await this.chunkRepo.getTotalSize();
      percentUsed = currentSize / maxSize;
    }

    console.log(`[LRU] Eviction complete. Evicted ${evictedChunks.length} chunks`);
    return evictedChunks;
  }

  /**
   * Evict oldest N chunks
   */
  async evictOldestChunks(count: number): Promise<string[]> {
    const candidates = await this.getEvictionCandidates(count);
    const evictedChunks: string[] = [];

    for (const candidate of candidates) {
      await this.chunkRepo.deleteChunk(candidate.chunkId);
      evictedChunks.push(candidate.chunkId);
    }

    return evictedChunks;
  }

  /**
   * Evict chunks until target size is reached
   */
  async evictUntilSize(targetSizeMB: number): Promise<string[]> {
    const targetBytes = targetSizeMB * 1024 * 1024;
    const evictedChunks: string[] = [];
    let currentSize = await this.chunkRepo.getTotalSize();

    while (currentSize > targetBytes) {
      const candidates = await this.getEvictionCandidates(10);

      if (candidates.length === 0) {
        break;
      }

      const victim = candidates[0];
      await this.chunkRepo.deleteChunk(victim.chunkId);
      evictedChunks.push(victim.chunkId);

      currentSize = await this.chunkRepo.getTotalSize();
    }

    return evictedChunks;
  }

  /**
   * Get eviction candidates sorted by priority
   */
  async getEvictionCandidates(count: number): Promise<LRUEntry[]> {
    const allChunks = await this.chunkRepo.getChunksSortedByAccess();
    const now = Date.now();
    const currentYear = new Date().getFullYear();
    const candidates: LRUEntry[] = [];

    for (const chunk of allChunks) {
      // Skip protected chunks
      if (chunk.protected) {
        continue;
      }

      // Skip recently accessed (within protection time)
      if (now - chunk.lastAccessed < this.protectionTime) {
        continue;
      }

      // Skip current year chunks
      const [year] = chunk.chunkId.split('_');
      if (parseInt(year) === currentYear) {
        continue;
      }

      // Skip high priority chunks if possible
      if (chunk.priority === 'critical' || chunk.priority === 'high') {
        // Only evict if no other options and we're at the end
        if (candidates.length === 0 && allChunks.indexOf(chunk) > allChunks.length - 5) {
          candidates.push(this.toLRUEntry(chunk));
        }
        continue;
      }

      candidates.push(this.toLRUEntry(chunk));

      if (candidates.length >= count) {
        break;
      }
    }

    return candidates;
  }

  /**
   * Check if a chunk is protected from eviction
   */
  async isProtected(chunkId: string): Promise<boolean> {
    const chunk = await this.chunkRepo.getChunk(chunkId);
    if (!chunk) return false;

    const now = Date.now();
    const currentYear = new Date().getFullYear();

    // Protected if explicitly marked
    if (chunk.protected) return true;

    // Protected if accessed within protection time
    if (now - chunk.lastAccessed < this.protectionTime) return true;

    // Protected if current year
    const [year] = chunkId.split('_');
    if (parseInt(year) === currentYear) return true;

    // Protected if critical priority
    if (chunk.priority === 'critical') return true;

    return false;
  }

  /**
   * Protect a chunk from eviction
   */
  async protectChunk(chunkId: string, durationMs?: number): Promise<void> {
    const chunk = await this.chunkRepo.getChunk(chunkId);
    if (chunk) {
      chunk.protected = true;
      await this.chunkRepo.saveChunk(chunk);

      // Auto-unprotect after duration if specified
      if (durationMs) {
        setTimeout(async () => {
          await this.unprotectChunk(chunkId);
        }, durationMs);
      }
    }
  }

  /**
   * Unprotect a chunk
   */
  async unprotectChunk(chunkId: string): Promise<void> {
    const chunk = await this.chunkRepo.getChunk(chunkId);
    if (chunk) {
      chunk.protected = false;
      await this.chunkRepo.saveChunk(chunk);
    }
  }

  /**
   * Set chunk priority
   */
  async setChunkPriority(chunkId: string, priority: ChunkPriority): Promise<void> {
    const chunk = await this.chunkRepo.getChunk(chunkId);
    if (chunk) {
      chunk.priority = priority;
      await this.chunkRepo.saveChunk(chunk);
    }
  }

  /**
   * Get chunk priority
   */
  async getChunkPriority(chunkId: string): Promise<ChunkPriority | null> {
    const chunk = await this.chunkRepo.getChunk(chunkId);
    return chunk ? chunk.priority : null;
  }

  /**
   * Record access to a chunk
   */
  async recordAccess(chunkId: string): Promise<void> {
    await this.chunkRepo.updateAccessTime(chunkId);
  }

  /**
   * Get access count for a chunk
   */
  async getAccessCount(chunkId: string): Promise<number> {
    const chunk = await this.chunkRepo.getChunk(chunkId);
    return chunk ? chunk.accessCount : 0;
  }

  /**
   * Get last access time for a chunk
   */
  async getLastAccessTime(chunkId: string): Promise<number | null> {
    const chunk = await this.chunkRepo.getChunk(chunkId);
    return chunk ? chunk.lastAccessed : null;
  }

  /**
   * Set eviction threshold (0-1)
   */
  setEvictionThreshold(percent: number): void {
    if (percent < 0 || percent > 1) {
      throw new Error('Eviction threshold must be between 0 and 1');
    }
    this.evictionThreshold = percent;
  }

  /**
   * Set protection time in milliseconds
   */
  setProtectionTime(ms: number): void {
    if (ms < 0) {
      throw new Error('Protection time must be positive');
    }
    this.protectionTime = ms;
  }

  /**
   * Get current eviction threshold
   */
  getEvictionThreshold(): number {
    return this.evictionThreshold;
  }

  /**
   * Get current protection time
   */
  getProtectionTime(): number {
    return this.protectionTime;
  }

  /**
   * Convert CachedChunk to LRUEntry
   */
  private toLRUEntry(chunk: CachedChunk): LRUEntry {
    return {
      chunkId: chunk.chunkId,
      lastAccessed: chunk.lastAccessed,
      accessCount: chunk.accessCount,
      size: chunk.data.size,
      priority: chunk.priority,
      protected: chunk.protected,
    };
  }

  /**
   * Get max cache size from settings
   */
  private async getMaxSize(): Promise<number> {
    const settings = await this.getSettings();
    return settings.maxSize * 1024 * 1024; // Convert MB to bytes
  }

  /**
   * Get cache settings
   */
  private async getSettings(): Promise<CacheSettings> {
    const db = await this.chunkRepo['initDB']();
    return new Promise((resolve) => {
      const transaction = db.transaction('vehicle-cache-settings', 'readonly');
      const store = transaction.objectStore('vehicle-cache-settings');
      const request = store.get('settings');

      request.onsuccess = () => {
        const settings = request.result;
        if (settings) {
          const { id, ...settingsData } = settings;
          resolve(settingsData as CacheSettings);
        } else {
          resolve(DEFAULT_CACHE_SETTINGS);
        }
      };

      request.onerror = () => {
        resolve(DEFAULT_CACHE_SETTINGS);
      };
    });
  }
}
