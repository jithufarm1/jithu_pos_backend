import { TestBed } from '@angular/core/testing';
import { VehicleDataChunkRepository } from './vehicle-data-chunk.repository';
import {
  CachedChunk,
  ChunkCatalog,
  VehicleSearchIndex,
  ChunkMetadata,
} from '../models/vehicle-data-cache.model';

describe('VehicleDataChunkRepository', () => {
  let repository: VehicleDataChunkRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    repository = TestBed.inject(VehicleDataChunkRepository);
  });

  afterEach(async () => {
    // Clean up after each test
    await repository.clearAllChunks();
    await repository.clearCatalog();
    await repository.clearIndex();
  });

  it('should be created', () => {
    expect(repository).toBeTruthy();
  });

  describe('Chunk CRUD operations', () => {
    it('should save and retrieve a chunk', async () => {
      const mockChunk: CachedChunk = {
        chunkId: '2024_TOYOTA',
        data: new Blob(['test data']),
        metadata: {
          version: '1.0',
          timestamp: Date.now(),
          checksum: 'abc123',
          originalSize: 1000,
          compressedSize: 300,
        },
        lastAccessed: Date.now(),
        accessCount: 1,
        priority: 'high',
        protected: false,
      };

      await repository.saveChunk(mockChunk);
      const retrieved = await repository.getChunk('2024_TOYOTA');

      expect(retrieved).toBeTruthy();
      expect(retrieved?.chunkId).toBe('2024_TOYOTA');
      expect(retrieved?.priority).toBe('high');
    });

    it('should return null for non-existent chunk', async () => {
      const chunk = await repository.getChunk('NON_EXISTENT');
      expect(chunk).toBeNull();
    });

    it('should delete a chunk', async () => {
      const mockChunk: CachedChunk = {
        chunkId: '2024_FORD',
        data: new Blob(['test']),
        metadata: {} as ChunkMetadata,
        lastAccessed: Date.now(),
        accessCount: 1,
        priority: 'medium',
        protected: false,
      };

      await repository.saveChunk(mockChunk);
      expect(await repository.chunkExists('2024_FORD')).toBe(true);

      await repository.deleteChunk('2024_FORD');
      expect(await repository.chunkExists('2024_FORD')).toBe(false);
    });

    it('should check if chunk exists', async () => {
      const mockChunk: CachedChunk = {
        chunkId: '2024_HONDA',
        data: new Blob(['test']),
        metadata: {} as ChunkMetadata,
        lastAccessed: Date.now(),
        accessCount: 1,
        priority: 'low',
        protected: false,
      };

      expect(await repository.chunkExists('2024_HONDA')).toBe(false);
      await repository.saveChunk(mockChunk);
      expect(await repository.chunkExists('2024_HONDA')).toBe(true);
    });
  });

  describe('Catalog operations', () => {
    it('should save and retrieve catalog', async () => {
      const mockCatalog: ChunkCatalog = {
        version: '2024.01',
        lastUpdated: Date.now(),
        chunks: [
          {
            chunkId: '2024_TOYOTA',
            year: 2024,
            make: 'TOYOTA',
            size: 600000,
            compressedSize: 180000,
            checksum: 'abc123',
            priority: 'high',
          },
        ],
      };

      await repository.saveCatalog(mockCatalog);
      const retrieved = await repository.getCatalog();

      expect(retrieved).toBeTruthy();
      expect(retrieved?.version).toBe('2024.01');
      expect(retrieved?.chunks.length).toBe(1);
      expect(retrieved?.chunks[0].chunkId).toBe('2024_TOYOTA');
    });

    it('should return null for non-existent catalog', async () => {
      const catalog = await repository.getCatalog();
      expect(catalog).toBeNull();
    });

    it('should clear catalog', async () => {
      const mockCatalog: ChunkCatalog = {
        version: '2024.01',
        lastUpdated: Date.now(),
        chunks: [],
      };

      await repository.saveCatalog(mockCatalog);
      expect(await repository.getCatalog()).toBeTruthy();

      await repository.clearCatalog();
      expect(await repository.getCatalog()).toBeNull();
    });
  });

  describe('Index operations', () => {
    it('should save and retrieve index entry', async () => {
      const mockIndex: VehicleSearchIndex = {
        searchKey: 'TOYOTA_CAMRY_2024',
        chunkId: '2024_TOYOTA',
      };

      await repository.saveIndex(mockIndex);
      const retrieved = await repository.getIndexBySearchKey('TOYOTA_CAMRY_2024');

      expect(retrieved).toBeTruthy();
      expect(retrieved?.chunkId).toBe('2024_TOYOTA');
    });

    it('should search index by partial query', async () => {
      const indexes: VehicleSearchIndex[] = [
        { searchKey: 'TOYOTA_CAMRY_2024', chunkId: '2024_TOYOTA' },
        { searchKey: 'TOYOTA_COROLLA_2024', chunkId: '2024_TOYOTA' },
        { searchKey: 'FORD_F150_2024', chunkId: '2024_FORD' },
      ];

      for (const index of indexes) {
        await repository.saveIndex(index);
      }

      const results = await repository.searchIndex('TOYOTA');
      expect(results.length).toBe(2);
      expect(results.every(r => r.searchKey.includes('TOYOTA'))).toBe(true);
    });

    it('should get index size', async () => {
      expect(await repository.getIndexSize()).toBe(0);

      await repository.saveIndex({ searchKey: 'TEST_1', chunkId: 'chunk1' });
      await repository.saveIndex({ searchKey: 'TEST_2', chunkId: 'chunk2' });

      expect(await repository.getIndexSize()).toBe(2);
    });

    it('should bulk save index entries', async () => {
      const entries: VehicleSearchIndex[] = [
        { searchKey: 'KEY_1', chunkId: 'chunk1' },
        { searchKey: 'KEY_2', chunkId: 'chunk2' },
        { searchKey: 'KEY_3', chunkId: 'chunk3' },
      ];

      await repository.bulkSaveIndexEntries(entries);
      expect(await repository.getIndexSize()).toBe(3);
    });
  });

  describe('Bulk operations', () => {
    beforeEach(async () => {
      // Create test chunks
      const chunks: CachedChunk[] = [
        {
          chunkId: '2024_TOYOTA',
          data: new Blob(['data1']),
          metadata: {} as ChunkMetadata,
          lastAccessed: Date.now() - 1000,
          accessCount: 5,
          priority: 'high',
          protected: false,
        },
        {
          chunkId: '2024_FORD',
          data: new Blob(['data2']),
          metadata: {} as ChunkMetadata,
          lastAccessed: Date.now() - 2000,
          accessCount: 3,
          priority: 'medium',
          protected: false,
        },
        {
          chunkId: '2023_TOYOTA',
          data: new Blob(['data3']),
          metadata: {} as ChunkMetadata,
          lastAccessed: Date.now() - 3000,
          accessCount: 1,
          priority: 'low',
          protected: false,
        },
      ];

      for (const chunk of chunks) {
        await repository.saveChunk(chunk);
      }
    });

    it('should get all chunks', async () => {
      const chunks = await repository.getAllChunks();
      expect(chunks.length).toBe(3);
    });

    it('should get chunks by year', async () => {
      const chunks2024 = await repository.getChunksByYear(2024);
      expect(chunks2024.length).toBe(2);
      expect(chunks2024.every(c => c.chunkId.startsWith('2024'))).toBe(true);

      const chunks2023 = await repository.getChunksByYear(2023);
      expect(chunks2023.length).toBe(1);
    });

    it('should get chunks by make', async () => {
      const toyotaChunks = await repository.getChunksByMake('TOYOTA');
      expect(toyotaChunks.length).toBe(2);
      expect(toyotaChunks.every(c => c.chunkId.includes('TOYOTA'))).toBe(true);
    });

    it('should get chunks by priority', async () => {
      const highPriority = await repository.getChunksByPriority('high');
      expect(highPriority.length).toBe(1);
      expect(highPriority[0].chunkId).toBe('2024_TOYOTA');
    });

    it('should get chunks by IDs', async () => {
      const chunks = await repository.getChunksByIds(['2024_TOYOTA', '2024_FORD']);
      expect(chunks.length).toBe(2);
    });
  });

  describe('Cache management', () => {
    it('should get total size', async () => {
      const chunk1: CachedChunk = {
        chunkId: 'chunk1',
        data: new Blob(['x'.repeat(1000)]),
        metadata: {} as ChunkMetadata,
        lastAccessed: Date.now(),
        accessCount: 1,
        priority: 'medium',
        protected: false,
      };

      const chunk2: CachedChunk = {
        chunkId: 'chunk2',
        data: new Blob(['y'.repeat(2000)]),
        metadata: {} as ChunkMetadata,
        lastAccessed: Date.now(),
        accessCount: 1,
        priority: 'medium',
        protected: false,
      };

      await repository.saveChunk(chunk1);
      await repository.saveChunk(chunk2);

      const totalSize = await repository.getTotalSize();
      expect(totalSize).toBeGreaterThan(0);
    });

    it('should get chunk count', async () => {
      expect(await repository.getChunkCount()).toBe(0);

      await repository.saveChunk({
        chunkId: 'test1',
        data: new Blob(['test']),
        metadata: {} as ChunkMetadata,
        lastAccessed: Date.now(),
        accessCount: 1,
        priority: 'low',
        protected: false,
      });

      expect(await repository.getChunkCount()).toBe(1);
    });

    it('should clear all chunks', async () => {
      await repository.saveChunk({
        chunkId: 'test1',
        data: new Blob(['test']),
        metadata: {} as ChunkMetadata,
        lastAccessed: Date.now(),
        accessCount: 1,
        priority: 'low',
        protected: false,
      });

      expect(await repository.getChunkCount()).toBe(1);
      await repository.clearAllChunks();
      expect(await repository.getChunkCount()).toBe(0);
    });
  });

  describe('LRU support', () => {
    it('should update access time', async () => {
      const chunk: CachedChunk = {
        chunkId: 'test_chunk',
        data: new Blob(['test']),
        metadata: {} as ChunkMetadata,
        lastAccessed: Date.now() - 10000,
        accessCount: 1,
        priority: 'medium',
        protected: false,
      };

      await repository.saveChunk(chunk);
      const before = await repository.getChunk('test_chunk');
      const beforeTime = before!.lastAccessed;
      const beforeCount = before!.accessCount;

      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      await repository.updateAccessTime('test_chunk');
      const after = await repository.getChunk('test_chunk');

      expect(after!.lastAccessed).toBeGreaterThan(beforeTime);
      expect(after!.accessCount).toBe(beforeCount + 1);
    });

    it('should get chunks sorted by access time', async () => {
      const now = Date.now();
      const chunks: CachedChunk[] = [
        {
          chunkId: 'newest',
          data: new Blob(['test']),
          metadata: {} as ChunkMetadata,
          lastAccessed: now,
          accessCount: 1,
          priority: 'medium',
          protected: false,
        },
        {
          chunkId: 'oldest',
          data: new Blob(['test']),
          metadata: {} as ChunkMetadata,
          lastAccessed: now - 10000,
          accessCount: 1,
          priority: 'medium',
          protected: false,
        },
        {
          chunkId: 'middle',
          data: new Blob(['test']),
          metadata: {} as ChunkMetadata,
          lastAccessed: now - 5000,
          accessCount: 1,
          priority: 'medium',
          protected: false,
        },
      ];

      for (const chunk of chunks) {
        await repository.saveChunk(chunk);
      }

      const sorted = await repository.getChunksSortedByAccess();
      expect(sorted[0].chunkId).toBe('oldest');
      expect(sorted[1].chunkId).toBe('middle');
      expect(sorted[2].chunkId).toBe('newest');
    });

    it('should get chunks sorted by priority', async () => {
      const chunks: CachedChunk[] = [
        {
          chunkId: 'low_priority',
          data: new Blob(['test']),
          metadata: {} as ChunkMetadata,
          lastAccessed: Date.now(),
          accessCount: 1,
          priority: 'low',
          protected: false,
        },
        {
          chunkId: 'critical_priority',
          data: new Blob(['test']),
          metadata: {} as ChunkMetadata,
          lastAccessed: Date.now(),
          accessCount: 1,
          priority: 'critical',
          protected: false,
        },
        {
          chunkId: 'high_priority',
          data: new Blob(['test']),
          metadata: {} as ChunkMetadata,
          lastAccessed: Date.now(),
          accessCount: 1,
          priority: 'high',
          protected: false,
        },
      ];

      for (const chunk of chunks) {
        await repository.saveChunk(chunk);
      }

      const sorted = await repository.getChunksSortedByPriority();
      expect(sorted[0].priority).toBe('critical');
      expect(sorted[1].priority).toBe('high');
      expect(sorted[2].priority).toBe('low');
    });
  });
});
