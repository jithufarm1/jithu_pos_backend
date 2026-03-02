/**
 * Vehicle Data Cache Models
 * Models for large-scale vehicle data caching with compression and chunking
 */

export interface VehicleDataChunk {
  chunkId: string;
  year: number;
  make: string;
  models: VehicleModel[];
  metadata: ChunkMetadata;
}

export interface VehicleModel {
  model: string;
  trims: VehicleTrim[];
}

export interface VehicleTrim {
  trim: string;
  specs: VehicleSpecs;
}

export interface VehicleSpecs {
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  fuelType?: string;
  mpgCity?: number;
  mpgHighway?: number;
  horsepower?: number;
  torque?: number;
  displacement?: number;
  cylinders?: number;
  oilCapacity?: number;
  oilType?: string;
  tireSize?: string;
  wheelSize?: string;
  weight?: number;
  [key: string]: any;
}

export interface ChunkMetadata {
  version: string;
  timestamp: number;
  checksum: string;
  originalSize: number;
  compressedSize: number;
}

export interface CachedChunk {
  chunkId: string;
  data: Blob; // Compressed data
  metadata: ChunkMetadata;
  lastAccessed: number;
  accessCount: number;
  priority: ChunkPriority;
  protected: boolean;
}

export type ChunkPriority = 'critical' | 'high' | 'medium' | 'low';

export interface ChunkCatalog {
  version: string;
  lastUpdated: number;
  chunks: ChunkCatalogEntry[];
}

export interface ChunkCatalogEntry {
  chunkId: string;
  year: number;
  make: string;
  size: number;
  compressedSize: number;
  checksum: string;
  priority: ChunkPriority;
}

export interface CacheProgress {
  status: 'downloading' | 'decompressing' | 'storing' | 'complete' | 'error';
  chunkId: string;
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  error?: string;
}

export interface CacheSettings {
  enabled: boolean;
  maxSize: number; // MB
  prefetchOnWiFi: boolean;
  prefetchOnMobile: boolean;
  autoEviction: boolean;
  popularMakesOnly: boolean;
  compressionEnabled: boolean;
}

export interface CacheMetrics {
  totalSize: number;
  compressedSize: number;
  chunkCount: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  prefetchCount: number;
  avgLoadTime: number;
  lastSync: number;
}

export interface VehicleSearchIndex {
  searchKey: string; // e.g., "TOYOTA_CAMRY_2024"
  chunkId: string;
  offset?: number;
}

export interface LRUEntry {
  chunkId: string;
  lastAccessed: number;
  accessCount: number;
  size: number;
  priority: ChunkPriority;
  protected: boolean;
}

export interface PrefetchJob {
  id: string;
  chunkIds: string[];
  priority: ChunkPriority;
  reason: 'user-search' | 'popular-makes' | 'idle-time' | 'wifi-detected' | 'pattern-based' | 'current-year';
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: number;
  endTime?: number;
  error?: string;
}

export const DEFAULT_CACHE_SETTINGS: CacheSettings = {
  enabled: true,
  maxSize: 300, // 300MB default
  prefetchOnWiFi: true,
  prefetchOnMobile: false,
  autoEviction: true,
  popularMakesOnly: false,
  compressionEnabled: true,
};

export const POPULAR_MAKES = [
  'TOYOTA',
  'FORD',
  'CHEVROLET',
  'HONDA',
  'NISSAN',
  'RAM',
  'JEEP',
  'GMC',
  'HYUNDAI',
  'KIA',
];

export const CACHE_STORAGE_LIMITS = {
  LIGHT: 100, // MB
  MEDIUM: 300,
  HEAVY: 600,
  MAXIMUM: 800,
};

export const CACHE_THRESHOLDS = {
  EVICTION_THRESHOLD: 0.8, // Start evicting at 80% full
  EVICTION_AMOUNT: 0.2, // Evict 20% of chunks
  PROTECTION_TIME: 24 * 60 * 60 * 1000, // 24 hours
  MAX_MEMORY_CHUNKS: 10, // Keep max 10 decompressed chunks in memory
};
