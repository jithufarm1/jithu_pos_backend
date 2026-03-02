import { Injectable } from '@angular/core';
import { VehicleDataChunkRepository } from '../repositories/vehicle-data-chunk.repository';
import {
  VehicleDataChunk,
  VehicleSearchIndex
} from '../models/vehicle-data-cache.model';

/**
 * Vehicle Data Index Service
 * Manages search index for fast vehicle lookups
 */
@Injectable({
  providedIn: 'root'
})
export class VehicleDataIndexService {
  constructor(private chunkRepo: VehicleDataChunkRepository) {}

  /**
   * Build index from chunks
   */
  async buildIndex(chunks: VehicleDataChunk[]): Promise<void> {
    console.log(`[IndexService] Building index for ${chunks.length} chunks`);
    const indexes: VehicleSearchIndex[] = [];

    for (const chunk of chunks) {
      for (const model of chunk.models) {
        for (const trim of model.trims) {
          // Create search key
          const searchKey = this.createSearchKey(
            chunk.year,
            chunk.make,
            model.model,
            trim.trim
          );

          indexes.push({
            searchKey,
            chunkId: chunk.chunkId
          });
        }

        // Also index by model only (without trim)
        const modelSearchKey = this.createSearchKey(
          chunk.year,
          chunk.make,
          model.model
        );

        indexes.push({
          searchKey: modelSearchKey,
          chunkId: chunk.chunkId
        });
      }

      // Also index by make only
      const makeSearchKey = this.createSearchKey(
        chunk.year,
        chunk.make
      );

      indexes.push({
        searchKey: makeSearchKey,
        chunkId: chunk.chunkId
      });
    }

    // Save all indexes
    for (const index of indexes) {
      await this.chunkRepo.saveIndex(index);
    }

    console.log(`[IndexService] Built ${indexes.length} index entries`);
  }

  /**
   * Update index for a single chunk
   */
  async updateIndex(chunk: VehicleDataChunk): Promise<void> {
    console.log(`[IndexService] Updating index for chunk: ${chunk.chunkId}`);

    // Remove old indexes for this chunk
    const oldIndexes = await this.chunkRepo.searchIndex(chunk.chunkId);
    for (const index of oldIndexes) {
      await this.chunkRepo.deleteIndex(index.searchKey);
    }

    // Rebuild indexes for this chunk
    await this.buildIndex([chunk]);
  }

  /**
   * Rebuild entire index
   */
  async rebuildIndex(): Promise<void> {
    console.log('[IndexService] Rebuilding entire index');

    // Clear existing index
    await this.clearIndex();

    // Get all chunks
    const chunks = await this.chunkRepo.getAllChunks();

    // Decompress and parse chunks
    const parsedChunks: VehicleDataChunk[] = [];
    for (const cached of chunks) {
      try {
        // Note: We'd need compression service here, but for now assume data is accessible
        // In real implementation, inject VehicleDataCompressionService
        console.log(`[IndexService] Processing chunk: ${cached.chunkId}`);
        // parsedChunks.push(parsed);
      } catch (error) {
        console.error(`[IndexService] Failed to parse chunk ${cached.chunkId}:`, error);
      }
    }

    // Build index
    await this.buildIndex(parsedChunks);
  }

  /**
   * Find chunk by vehicle details
   */
  async findChunkByVehicle(
    year: number,
    make: string,
    model?: string
  ): Promise<string | null> {
    // Try exact match first
    if (model) {
      const searchKey = this.createSearchKey(year, make, model);
      const index = await this.chunkRepo.getIndexBySearchKey(searchKey);

      if (index) {
        return index.chunkId;
      }
    }

    // Try make only
    const makeSearchKey = this.createSearchKey(year, make);
    const makeIndex = await this.chunkRepo.getIndexBySearchKey(makeSearchKey);

    if (makeIndex) {
      return makeIndex.chunkId;
    }

    // Fallback: determine chunk from year and make
    return `${year}_${make.toUpperCase()}`;
  }

  /**
   * Find chunks by make
   */
  async findChunksByMake(make: string): Promise<string[]> {
    const normalizedMake = make.toUpperCase();
    const indexes = await this.chunkRepo.searchIndex(normalizedMake);

    // Extract unique chunk IDs
    const chunkIds = new Set<string>();
    for (const index of indexes) {
      if (index.chunkId.includes(normalizedMake)) {
        chunkIds.add(index.chunkId);
      }
    }

    return Array.from(chunkIds);
  }

  /**
   * Find chunks by year
   */
  async findChunksByYear(year: number): Promise<string[]> {
    const yearStr = year.toString();
    const indexes = await this.chunkRepo.searchIndex(yearStr);

    // Extract unique chunk IDs
    const chunkIds = new Set<string>();
    for (const index of indexes) {
      if (index.chunkId.startsWith(yearStr)) {
        chunkIds.add(index.chunkId);
      }
    }

    return Array.from(chunkIds);
  }

  /**
   * Search vehicles by query
   */
  async searchVehicles(query: string): Promise<VehicleSearchIndex[]> {
    const normalizedQuery = query.toUpperCase().trim();
    return this.chunkRepo.searchIndex(normalizedQuery);
  }

  /**
   * Create search key from vehicle details
   */
  private createSearchKey(
    year: number,
    make: string,
    model?: string,
    trim?: string
  ): string {
    const parts = [
      make.toUpperCase(),
      model?.toUpperCase(),
      trim?.toUpperCase(),
      year.toString()
    ].filter(Boolean);

    return parts.join('_');
  }

  /**
   * Get index size
   */
  async getIndexSize(): Promise<number> {
    // This would need to be implemented in the repository
    // For now, return 0
    return 0;
  }

  /**
   * Clear index
   */
  async clearIndex(): Promise<void> {
    await this.chunkRepo.clearIndex();
    console.log('[IndexService] Index cleared');
  }

  /**
   * Validate index
   */
  async validateIndex(): Promise<boolean> {
    const catalog = await this.chunkRepo.getCatalog();
    if (!catalog) return false;

    const stats = await this.getIndexStats();

    // Rough validation: should have multiple indexes per chunk
    const expectedMinIndexes = catalog.chunks.length * 10;
    return stats.entries >= expectedMinIndexes;
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<{ entries: number; size: number }> {
    // This would need to count all index entries
    // For now, return placeholder
    return {
      entries: 0,
      size: 0
    };
  }
}
