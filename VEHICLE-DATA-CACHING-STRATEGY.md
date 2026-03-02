# Vehicle Data Caching Strategy
## On-Demand Caching for 200-800MB Motor Vehicle Database

**Date:** February 28, 2026  
**Status:** Architecture & Implementation Plan

---

## Executive Summary

This document outlines a comprehensive strategy for caching large motor vehicle datasets (200-800MB) using an on-demand, chunked approach with intelligent prefetching and storage optimization.

### Key Features:
- ✅ On-demand loading (only cache what's needed)
- ✅ Chunked data architecture (by year, make, model)
- ✅ Compression (reduce storage by 60-70%)
- ✅ LRU cache eviction (manage storage limits)
- ✅ Background prefetching (predictive loading)
- ✅ IndexedDB storage (handles large datasets)
- ✅ Progress tracking (user feedback)

---

## 1. Data Architecture

### Hierarchical Chunking Strategy

```
Vehicle Data Structure:
├── Years (2000-2024) → ~25 chunks
│   ├── Makes (per year) → ~50 chunks per year
│   │   ├── Models (per make) → ~20 chunks per make
│   │   │   ├── Trims (per model) → ~5 chunks per model
│   │   │   │   └── Specifications
```

### Chunk Size Optimization

| Level | Chunk Size | Estimated Count | Total Size |
|-------|-----------|-----------------|------------|
| **Year** | ~30MB | 25 years | 750MB |
| **Make** | ~600KB | 1,250 makes | 750MB |
| **Model** | ~30KB | 25,000 models | 750MB |
| **Trim** | ~6KB | 125,000 trims | 750MB |

**Strategy:** Cache at **Make level** (600KB chunks) for optimal balance

---

## 2. Storage Strategy

### IndexedDB Schema

```typescript
Database: VehicleDataCache
Version: 1

Stores:
1. vehicle_chunks
   - Key: chunkId (e.g., "2024_TOYOTA")
   - Value: compressed data blob
   - Indexes: year, make, lastAccessed, size

2. vehicle_metadata
   - Key: metadataId
   - Value: chunk catalog, version info
   
3. vehicle_index
   - Key: searchKey (e.g., "TOYOTA_CAMRY_2024")
   - Value: chunkId reference
```

### Storage Limits

```typescript
Browser Limits:
- Chrome: ~60% of available disk space
- Firefox: ~50% of available disk space  
- Safari: ~1GB (stricter)

Target Usage:
- Initial: 0MB (nothing cached)
- Light use: 50-100MB (10-20 makes)
- Medium use: 200-300MB (40-60 makes)
- Heavy use: 400-600MB (80-120 makes)
- Maximum: 800MB (all data)
```

---

## 3. Compression Strategy

### Compression Algorithm: **Brotli/GZIP**

```typescript
Compression Ratios:
- JSON data: 70-80% reduction
- 600KB → 120-180KB per chunk
- 800MB → 160-240MB compressed

Benefits:
✅ Faster network transfer
✅ Less storage usage
✅ Decompress on-demand in memory
```

### Implementation

```typescript
// Compress before storing
const compressed = await compress(jsonData);
await db.put('vehicle_chunks', { 
  chunkId, 
  data: compressed,
  originalSize,
  compressedSize 
});

// Decompress when reading
const chunk = await db.get('vehicle_chunks', chunkId);
const data = await decompress(chunk.data);
```

---

## 4. On-Demand Loading Strategy

### Loading Workflow

```
User Action → Check Cache → Load if Missing → Store → Return Data
     ↓              ↓              ↓              ↓         ↓
  Search VIN   IndexedDB    API Request    Compress   Display
                  ↓              ↓              ↓
              Hit: Fast    Background     Update LRU
              Miss: Load   Prefetch       
```

### Priority Levels

1. **Critical** (Load immediately)
   - Current search/selection
   - VIN decode results
   
2. **High** (Load in background)
   - Popular makes (Toyota, Ford, Honda, Chevrolet)
   - Current year vehicles
   
3. **Medium** (Prefetch when idle)
   - Recent years (last 5 years)
   - Common makes in region
   
4. **Low** (Load on demand only)
   - Older vehicles (>10 years)
   - Rare makes

---

## 5. LRU Cache Eviction

### Eviction Strategy

```typescript
When storage reaches 80% of limit:
1. Sort chunks by lastAccessed timestamp
2. Remove oldest 20% of chunks
3. Keep frequently accessed chunks
4. Never evict chunks accessed in last 24 hours

Priority Protection:
- Current year: Never evict
- Popular makes: Low eviction priority
- Recently accessed: Protected for 24 hours
```

### Access Tracking

```typescript
interface ChunkMetadata {
  chunkId: string;
  size: number;
  compressedSize: number;
  lastAccessed: number;
  accessCount: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  protected: boolean;
}
```

---

## 6. Prefetching Strategy

### Intelligent Prefetching

```typescript
Prefetch Triggers:
1. User searches for a make → Prefetch that make's models
2. User selects a year → Prefetch popular makes for that year
3. Idle time detected → Prefetch top 10 makes
4. WiFi connection → Aggressive prefetch
5. Pattern detection → Prefetch based on usage history

Prefetch Limits:
- Mobile data: Disabled (user opt-in only)
- WiFi: Enabled (up to 200MB)
- Idle time: Low priority chunks only
```

### Background Sync

```typescript
// Service Worker background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'prefetch-vehicle-data') {
    event.waitUntil(prefetchPopularMakes());
  }
});
```

---

## 7. Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

**Files to Create:**
1. `vehicle-data-cache.repository.ts` - IndexedDB operations
2. `vehicle-data-compression.service.ts` - Compression/decompression
3. `vehicle-data-chunk.service.ts` - Chunk management
4. `vehicle-data-lru.service.ts` - LRU eviction logic

### Phase 2: Loading & Caching (Week 2)

**Files to Create:**
5. `vehicle-data-loader.service.ts` - On-demand loading
6. `vehicle-data-prefetch.service.ts` - Background prefetching
7. `vehicle-data-index.service.ts` - Search index

### Phase 3: Integration (Week 3)

**Files to Update:**
8. `vehicle.service.ts` - Integrate caching
9. `vehicle-search.component.ts` - Add progress UI
10. `service-worker.ts` - Background sync

### Phase 4: Optimization (Week 4)

**Tasks:**
11. Performance testing
12. Storage optimization
13. Prefetch tuning
14. User settings (cache size limits)

---

## 8. API Design

### Backend API Endpoints

```typescript
// Get chunk catalog (metadata only, ~50KB)
GET /api/vehicle-data/catalog
Response: {
  version: "2024.02",
  chunks: [
    { id: "2024_TOYOTA", size: 620000, checksum: "abc123" },
    { id: "2024_FORD", size: 580000, checksum: "def456" }
  ]
}

// Get specific chunk (compressed)
GET /api/vehicle-data/chunk/:chunkId
Response: Compressed binary data

// Search index (for quick lookups)
GET /api/vehicle-data/search?q=CAMRY&year=2024
Response: { chunkId: "2024_TOYOTA", offset: 1234 }
```

### Chunk Format

```typescript
interface VehicleChunk {
  chunkId: string;
  year: number;
  make: string;
  models: VehicleModel[];
  metadata: {
    version: string;
    timestamp: number;
    checksum: string;
  };
}

interface VehicleModel {
  model: string;
  trims: VehicleTrim[];
}

interface VehicleTrim {
  trim: string;
  specs: VehicleSpecs;
}
```

---

## 9. User Experience

### Progress Indicators

```typescript
// Show download progress
interface CacheProgress {
  status: 'downloading' | 'decompressing' | 'storing' | 'complete';
  chunkId: string;
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
}

// UI Component
<div class="cache-progress" *ngIf="cacheProgress">
  <div class="progress-bar">
    <div class="progress-fill" [style.width.%]="cacheProgress.percentage"></div>
  </div>
  <span>Loading {{ cacheProgress.chunkId }}... {{ cacheProgress.percentage }}%</span>
</div>
```

### Settings UI

```typescript
// User preferences
interface CacheSettings {
  enabled: boolean;
  maxSize: number; // MB
  prefetchOnWiFi: boolean;
  prefetchOnMobile: boolean;
  autoEviction: boolean;
  popularMakesOnly: boolean;
}

// Settings component
<div class="cache-settings">
  <label>
    <input type="checkbox" [(ngModel)]="settings.enabled">
    Enable offline vehicle data
  </label>
  
  <label>
    Max cache size:
    <select [(ngModel)]="settings.maxSize">
      <option value="100">100 MB (Light)</option>
      <option value="300">300 MB (Medium)</option>
      <option value="600">600 MB (Heavy)</option>
      <option value="800">800 MB (Maximum)</option>
    </select>
  </label>
  
  <label>
    <input type="checkbox" [(ngModel)]="settings.prefetchOnWiFi">
    Prefetch popular makes on WiFi
  </label>
</div>
```

---

## 10. Performance Optimization

### Memory Management

```typescript
// Don't keep decompressed data in memory
// Decompress → Use → Discard

class VehicleDataCache {
  private memoryCache = new Map<string, any>(); // Max 10 chunks
  private readonly MAX_MEMORY_CHUNKS = 10;
  
  async getChunk(chunkId: string): Promise<VehicleChunk> {
    // Check memory cache first
    if (this.memoryCache.has(chunkId)) {
      return this.memoryCache.get(chunkId);
    }
    
    // Load from IndexedDB
    const compressed = await this.db.get(chunkId);
    const data = await decompress(compressed);
    
    // Add to memory cache (with limit)
    if (this.memoryCache.size >= this.MAX_MEMORY_CHUNKS) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    this.memoryCache.set(chunkId, data);
    
    return data;
  }
}
```

### Network Optimization

```typescript
// Use HTTP/2 multiplexing for parallel chunk downloads
// Use Range requests for partial chunk loading
// Use ETags for cache validation

const downloadChunk = async (chunkId: string) => {
  const response = await fetch(`/api/vehicle-data/chunk/${chunkId}`, {
    headers: {
      'Accept-Encoding': 'br, gzip',
      'If-None-Match': cachedETag
    }
  });
  
  if (response.status === 304) {
    // Use cached version
    return getCachedChunk(chunkId);
  }
  
  return response.blob();
};
```

---

## 11. Monitoring & Analytics

### Cache Metrics

```typescript
interface CacheMetrics {
  totalSize: number;
  chunkCount: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  prefetchCount: number;
  avgLoadTime: number;
}

// Track and report
class CacheMonitor {
  private metrics: CacheMetrics;
  
  recordHit(chunkId: string, loadTime: number) {
    this.metrics.hitRate++;
    this.metrics.avgLoadTime = 
      (this.metrics.avgLoadTime + loadTime) / 2;
  }
  
  recordMiss(chunkId: string) {
    this.metrics.missRate++;
  }
  
  getReport(): CacheMetrics {
    return this.metrics;
  }
}
```

---

## 12. Testing Strategy

### Test Scenarios

1. **Cold Start** (No cache)
   - First search should load chunk
   - Subsequent searches should be instant
   
2. **Storage Full** (At limit)
   - LRU eviction should work
   - Critical chunks protected
   
3. **Offline Mode**
   - Cached data accessible
   - Uncached data shows error
   
4. **Network Failure**
   - Graceful fallback to cache
   - Retry logic works
   
5. **Concurrent Requests**
   - No duplicate downloads
   - Request deduplication

### Performance Benchmarks

```typescript
Target Performance:
- Cache hit: <50ms
- Cache miss + download: <2s
- Decompression: <100ms
- Search: <200ms
- Prefetch: Background, no UI impact
```

---

## 13. Migration & Rollout

### Gradual Rollout

**Phase 1:** Beta users (10%)
- Monitor performance
- Gather feedback
- Tune parameters

**Phase 2:** Staged rollout (50%)
- Expand to more users
- Monitor storage usage
- Optimize eviction

**Phase 3:** Full rollout (100%)
- All users enabled
- Continuous monitoring
- Regular optimization

### Backward Compatibility

```typescript
// Support old API during transition
if (newCacheAvailable) {
  return getFromChunkedCache(query);
} else {
  return getFromLegacyAPI(query);
}
```

---

## 14. Cost-Benefit Analysis

### Benefits

✅ **Performance:** 50ms vs 2s load time (40x faster)  
✅ **Offline:** Full vehicle data available offline  
✅ **Bandwidth:** 70% reduction in data transfer  
✅ **UX:** Instant search results  
✅ **Scalability:** Handles 800MB dataset efficiently  

### Costs

⚠️ **Development:** 4 weeks implementation  
⚠️ **Storage:** 100-600MB per device  
⚠️ **Complexity:** More moving parts  
⚠️ **Maintenance:** Cache invalidation logic  

### ROI

- **User satisfaction:** Significantly improved
- **Server load:** Reduced by 60-70%
- **Bandwidth costs:** Reduced by 70%
- **Offline capability:** Enabled

**Recommendation:** ✅ **IMPLEMENT** - Benefits far outweigh costs

---

## 15. Next Steps

### Immediate Actions

1. ✅ Review and approve architecture
2. ⏳ Create detailed technical specs
3. ⏳ Set up development environment
4. ⏳ Implement Phase 1 (Core Infrastructure)
5. ⏳ Create backend API endpoints
6. ⏳ Implement compression service
7. ⏳ Build cache repository
8. ⏳ Integrate with vehicle service
9. ⏳ Add UI components
10. ⏳ Test and optimize

### Timeline

- **Week 1:** Core infrastructure
- **Week 2:** Loading & caching
- **Week 3:** Integration & UI
- **Week 4:** Testing & optimization
- **Week 5:** Beta rollout
- **Week 6:** Full deployment

---

## Conclusion

This on-demand caching strategy provides an optimal solution for handling 200-800MB of vehicle data:

- **Efficient:** Only caches what's needed
- **Fast:** Sub-50ms cache hits
- **Scalable:** Handles full dataset
- **User-friendly:** Progress indicators and settings
- **Reliable:** LRU eviction and compression
- **Offline-capable:** Works without network

**Status:** Ready for implementation ✅
