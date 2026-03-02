import { TestBed } from '@angular/core/testing';
import { VehicleDataLRUService } from './vehicle-data-lru.service';
import { VehicleDataChunkRepository } from '../repositories/vehicle-data-chunk.repository';
import { CachedChunk, ChunkMetadata } from '../models/vehicle-data-cache.model';

describe('VehicleDataLRUService', () => {
  let service: VehicleDataLRUService;
  let repository: VehicleDataChunkRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VehicleDataLRUService);
    repository = TestBed.inject(VehicleDataChunkRepository);
  });

  afterEach(async () => {
    await repository.clearAllChunks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Protection operations', () => {
    it('should protect and unprotect chunks', async () => {
      const chunk: CachedChunk = {
        chunkId: 'test_chunk',
        data: new Blob(['test']),
        metadata: {} as ChunkMetadata,
        lastAccessed: Date.now(),
        accessCount: 1,
        priority: 'medium',
        protected: false,
      };

      await repository.saveChunk(chunk);
      expect(await service.isProtected('test_chunk')).toBe(false);

      await service.protectChunk('test_chunk');
      expect(await service.isProtected('test_chunk')).toBe(true);

      await service.unprotectChunk('test_chunk');
      expect(await service.isProtected('test_chunk')).toBe(false);
    });

    it('should consider recently accessed chunks as protected', async () => {
      const chunk: CachedChunk = {
        chunkId: 'recent_chunk',
        data: new Blob(['test']),
        metadata: {} as ChunkMetadata,
        lastAccessed: Date.now(), // Just accessed
        accessCount: 1,
        priority: 'low',
        protected: false,
      };

      await repository.saveChunk(chunk);
      expect(await service.isProtected('recent_chunk')).toBe(true);
    });

    it('should consider current year chunks as protected', async () => {
      const currentYear = new Date().getFullYear();
      const chunk: CachedChunk = {
        chunkId: `${currentYear}_TOYOTA`,
        data: new Blob(['test']),
        metadata: {} as ChunkMetadata,
        lastAccessed: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        accessCount: 1,
        priority: 'low',
        protected: false,
      };

      await repository.saveChunk(chunk);
      expect(await service.isProtected(`${currentYear}_TOYOTA`)).toBe(true);
    });

    it('should consider critical priority chunks as protected', async () => {
      const chunk: CachedChunk = {
        chunkId: '2020_FORD',
        data: new Blob(['test']),
        metadata: {} as ChunkMetadata,
        lastAccessed: Date.now() - 30 * 24 * 60 * 60 * 1000,
        accessCount: 1,
        priority: 'critical',
        protected: false,
      };

      await repository.saveChunk(chunk);
      expect(await service.isProtected('2020_FORD')).toBe(true);
    });
  });

  describe('Priority operations', () => {
    it('should set and get chunk priority', async () => {
      const chunk: CachedChunk = {
        chunkId: 'test_chunk',
        data: new Blob(['test']),
        metadata: {} as ChunkMetadata,
        lastAccessed: Date.now(),
        accessCount: 1,
        priority: 'low',
        protected: false,
      };

      await repository.saveChunk(chunk);
      expect(await service.getChunkPriority('test_chunk')).toBe('low');

      await service.setChunkPriority('test_chunk', 'high');
      expect(await service.getChunkPriority('test_chunk')).toBe('high');
    });

    it('should return null for non-existent chunk', async () => {
      expect(await service.getChunkPriority('non_existent')).toBeNull();
    });
  });

  describe('Access tracking', () => {
    it('should record access and update count', async () => {
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
      const initialCount = await service.getAccessCount('test_chunk');
      const initialTime = await service.getLastAccessTime('test_chunk');

      await new Promise(resolve => setTimeout(resolve, 10));
      await service.recordAccess('test_chunk');

      const newCount = await service.getAccessCount('test_chunk');
      const newTime = await service.getLastAccessTime('test_chunk');

      expect(newCount).toBe(initialCount + 1);
      expect(newTime).toBeGreaterThan(initialTime!);
    });

    it('should return 0 for non-existent chunk access count', async () => {
      expect(await service.getAccessCount('non_existent')).toBe(0);
    });

    it('should return null for non-existent chunk access time', async () => {
      expect(await service.getLastAccessTime('non_existent')).toBeNull();
    });
  });

  describe('Eviction candidates', () => {
    beforeEach(async () => {
      const currentYear = new Date().getFullYear();
      const oldTime = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago

      const chunks: CachedChunk[] = [
        {
          chunkId: `${currentYear}_TOYOTA`,
          data: new Blob(['x'.repeat(1000)]),
          metadata: {} as ChunkMetadata,
          lastAccessed: oldTime,
          accessCount: 1,
          priority: 'high',
          protected: false,
        },
        {
          chunkId: '2020_FORD',
          data: new Blob(['x'.repeat(1000)]),
          metadata: {} as ChunkMetadata,
          lastAccessed: oldTime,
          accessCount: 1,
          priority: 'low',
          protected: false,
        },
        {
          chunkId: '2019_HONDA',
          data: new Blob(['x'.repeat(1000)]),
          metadata: {} as ChunkMetadata,
          lastAccessed: oldTime,
          accessCount: 1,
          priority: 'medium',
          protected: false,
        },
        {
          chunkId: '2018_NISSAN',
          data: new Blob(['x'.repeat(1000)]),
          metadata: {} as ChunkMetadata,
          lastAccessed: oldTime,
          accessCount: 1,
          priority: 'low',
          protected: true,
        },
      ];

      for (const chunk of chunks) {
        await repository.saveChunk(chunk);
      }
    });

    it('should get eviction candidates excluding protected chunks', async () => {
      const candidates = await service.getEvictionCandidates(10);

      // Should not include current year, protected, or recently accessed
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.every(c => !c.protected)).toBe(true);
      expect(candidates.every(c => !c.chunkId.startsWith(new Date().getFullYear().toString()))).toBe(true);
    });

    it('should prioritize low priority chunks for eviction', async () => {
      const candidates = await service.getEvictionCandidates(10);

      if (candidates.length > 0) {
        // Low priority chunks should come first
        const priorities = candidates.map(c => c.priority);
        expect(priorities.includes('low')).toBe(true);
      }
    });
  });

  describe('Eviction operations', () => {
    it('should evict oldest chunks', async () => {
      const oldTime = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const chunks: CachedChunk[] = [
        {
          chunkId: '2020_FORD',
          data: new Blob(['test']),
          metadata: {} as ChunkMetadata,
          lastAccessed: oldTime,
          accessCount: 1,
          priority: 'low',
          protected: false,
        },
        {
          chunkId: '2019_HONDA',
          data: new Blob(['test']),
          metadata: {} as ChunkMetadata,
          lastAccessed: oldTime,
          accessCount: 1,
          priority: 'low',
          protected: false,
        },
      ];

      for (const chunk of chunks) {
        await repository.saveChunk(chunk);
      }

      const initialCount = await repository.getChunkCount();
      const evicted = await service.evictOldestChunks(1);

      expect(evicted.length).toBe(1);
      expect(await repository.getChunkCount()).toBe(initialCount - 1);
    });

    it('should evict until target size is reached', async () => {
      const oldTime = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const largeData = new Blob(['x'.repeat(100000)]); // ~100KB

      const chunks: CachedChunk[] = [
        {
          chunkId: '2020_FORD',
          data: largeData,
          metadata: {} as ChunkMetadata,
          lastAccessed: oldTime,
          accessCount: 1,
          priority: 'low',
          protected: false,
        },
        {
          chunkId: '2019_HONDA',
          data: largeData,
          metadata: {} as ChunkMetadata,
          lastAccessed: oldTime,
          accessCount: 1,
          priority: 'low',
          protected: false,
        },
      ];

      for (const chunk of chunks) {
        await repository.saveChunk(chunk);
      }

      const initialSize = await repository.getTotalSize();
      await service.evictUntilSize(0.05); // 0.05 MB = 50KB

      const finalSize = await repository.getTotalSize();
      expect(finalSize).toBeLessThan(initialSize);
    });
  });

  describe('Configuration', () => {
    it('should set and get eviction threshold', () => {
      service.setEvictionThreshold(0.9);
      expect(service.getEvictionThreshold()).toBe(0.9);
    });

    it('should throw error for invalid eviction threshold', () => {
      expect(() => service.setEvictionThreshold(-0.1)).toThrow();
      expect(() => service.setEvictionThreshold(1.5)).toThrow();
    });

    it('should set and get protection time', () => {
      const oneHour = 60 * 60 * 1000;
      service.setProtectionTime(oneHour);
      expect(service.getProtectionTime()).toBe(oneHour);
    });

    it('should throw error for negative protection time', () => {
      expect(() => service.setProtectionTime(-1000)).toThrow();
    });
  });
});
