import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleDataLoaderService } from '../../../../core/services/vehicle-data-loader.service';
import { VehicleDataLRUService } from '../../../../core/services/vehicle-data-lru.service';
import { VehicleDataPrefetchService } from '../../../../core/services/vehicle-data-prefetch.service';
import { Subscription } from 'rxjs';

interface CacheMetrics {
  totalSize: number;
  chunkCount: number;
  hitCount: number;
  missCount: number;
  compressedSize: number;
}

interface ChunkInfo {
  chunkId: string;
  year: number;
  make: string;
  size: number;
  lastAccessed: number;
  priority: number;
}

@Component({
  selector: 'app-cache-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cache-demo.component.html',
  styleUrls: ['./cache-demo.component.css']
})
export class CacheDemoComponent implements OnInit, OnDestroy {
  selectedYear: number = new Date().getFullYear();
  selectedMake: string = 'Honda';
  makes = ['Honda', 'Toyota', 'Ford', 'Chevrolet', 'Nissan'];
  
  loading = false;
  error: string | null = null;
  success: string | null = null;
  
  downloadProgress = 0;
  currentOperation = '';
  
  metrics: CacheMetrics | null = null;
  cachedChunks: ChunkInfo[] = [];
  
  private subscriptions: Subscription[] = [];

  constructor(
    private loaderService: VehicleDataLoaderService,
    private lruService: VehicleDataLRUService,
    private prefetchService: VehicleDataPrefetchService
  ) {}

  ngOnInit() {
    this.loadMetrics();
    this.loadCachedChunks();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async loadChunk() {
    this.loading = true;
    this.error = null;
    this.success = null;
    this.currentOperation = `Loading ${this.selectedYear} ${this.selectedMake}...`;
    
    const chunkId = `${this.selectedYear}-${this.selectedMake.toLowerCase()}`;
    
    const sub = this.loaderService.loadChunk(chunkId).subscribe({
      next: (chunk) => {
        this.success = `Loaded ${chunk.models.length} models`;
        this.loading = false;
        this.loadMetrics();
        this.loadCachedChunks();
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      }
    });
    
    this.subscriptions.push(sub);
  }

  async loadCatalog() {
    this.loading = true;
    this.error = null;
    this.currentOperation = 'Loading catalog...';
    
    this.loaderService.loadCatalog().subscribe({
      next: () => {
        this.success = 'Catalog loaded successfully';
        this.loading = false;
      },
      error: (err: any) => {
        this.error = err.message;
        this.loading = false;
      }
    });
  }

  async prefetchPopular() {
    this.loading = true;
    this.error = null;
    this.currentOperation = 'Prefetching popular makes...';
    
    const sub = this.prefetchService.prefetchPopularMakes().subscribe({
      next: (job) => {
        this.downloadProgress = job.progress;
        this.currentOperation = `Prefetching... ${job.progress}%`;
        
        if (job.status === 'completed') {
          this.success = `Prefetched ${job.chunkIds.length} chunks`;
          this.loading = false;
          this.loadMetrics();
          this.loadCachedChunks();
        }
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
      }
    });
    
    this.subscriptions.push(sub);
  }

  async clearCache() {
    if (!confirm('Clear all cached vehicle data?')) {
      return;
    }
    
    this.loading = true;
    this.currentOperation = 'Clearing cache...';
    
    try {
      await this.loaderService.clearCache();
      this.success = 'Cache cleared successfully';
      this.loading = false;
      this.loadMetrics();
      this.loadCachedChunks();
    } catch (err: any) {
      this.error = err.message;
      this.loading = false;
    }
  }

  private async loadMetrics() {
    try {
      this.metrics = await this.loaderService.getCacheMetrics();
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  }

  private async loadCachedChunks() {
    this.cachedChunks = [];
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
