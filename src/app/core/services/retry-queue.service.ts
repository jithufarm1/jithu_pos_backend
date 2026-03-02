import { Injectable } from '@angular/core';
import { QueuedRequest } from '../models/vehicle.model';
import { RequestQueueRepository } from '../repositories/request-queue.repository';
import { NetworkDetectionService } from './network-detection.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * Retry Queue Service
 * Manages failed API requests and retries them when network is restored
 * Implements exponential backoff and idempotency checks
 */
@Injectable({
  providedIn: 'root',
})
export class RetryQueueService {
  private readonly maxRetries = 5;
  private readonly baseDelay = 1000; // 1 second
  private isProcessing = false;

  constructor(
    private queueRepository: RequestQueueRepository,
    private networkService: NetworkDetectionService,
    private http: HttpClient
  ) {
    this.initNetworkListener();
  }

  /**
   * Listen for network status changes and trigger queue processing
   */
  private initNetworkListener(): void {
    this.networkService.getNetworkStatus().subscribe((status) => {
      if (status.isOnline && !this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Add failed request to queue
   */
  async enqueue(
    url: string,
    method: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<void> {
    const request: QueuedRequest = {
      id: this.generateRequestId(url, method, body),
      url,
      method,
      body,
      headers,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: this.maxRetries,
    };

    // Check for duplicate
    const existing = await this.findDuplicate(request.id);
    if (existing) {
      console.log('Request already queued, skipping duplicate');
      return;
    }

    await this.queueRepository.add(request);
    console.log('Request queued for retry:', request.id);
  }

  /**
   * Process all queued requests
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || !this.networkService.isOnline()) {
      return;
    }

    this.isProcessing = true;
    console.log('Processing retry queue...');

    try {
      // Purge old requests first
      const purgedCount = await this.queueRepository.purgeOld();
      if (purgedCount > 0) {
        console.log(`Purged ${purgedCount} old requests from queue`);
      }

      const requests = await this.queueRepository.getAllRequests();
      console.log(`Found ${requests.length} requests to retry`);

      for (const request of requests) {
        await this.retryRequest(request);
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Retry a single request with exponential backoff
   */
  private async retryRequest(request: QueuedRequest): Promise<void> {
    if (request.retryCount >= request.maxRetries) {
      console.log(`Max retries reached for request ${request.id}, removing from queue`);
      await this.queueRepository.remove(request.id);
      return;
    }

    try {
      // Calculate delay with exponential backoff
      const delay = this.baseDelay * Math.pow(2, request.retryCount);
      await this.sleep(delay);

      // Attempt request
      console.log(`Retrying request ${request.id} (attempt ${request.retryCount + 1})`);
      
      const options: any = {
        headers: request.headers,
      };

      if (request.method === 'GET') {
        await firstValueFrom(this.http.get(request.url, options));
      } else if (request.method === 'POST') {
        await firstValueFrom(this.http.post(request.url, request.body, options));
      } else if (request.method === 'PUT') {
        await firstValueFrom(this.http.put(request.url, request.body, options));
      }

      // Success - remove from queue
      console.log(`Request ${request.id} succeeded, removing from queue`);
      await this.queueRepository.remove(request.id);
    } catch (error) {
      // Failure - increment retry count
      console.log(`Request ${request.id} failed, incrementing retry count`);
      request.retryCount++;
      await this.queueRepository.add(request);
    }
  }

  /**
   * Generate unique request ID for idempotency
   */
  private generateRequestId(url: string, method: string, body?: any): string {
    const bodyStr = body ? JSON.stringify(body) : '';
    const combined = `${method}:${url}:${bodyStr}`;
    return btoa(combined); // Simple base64 encoding for ID
  }

  /**
   * Find duplicate request in queue
   */
  private async findDuplicate(id: string): Promise<QueuedRequest | null> {
    const requests = await this.queueRepository.getAllRequests();
    return requests.find((r) => r.id === id) || null;
  }

  /**
   * Clear all queued requests
   */
  async clearQueue(): Promise<void> {
    await this.queueRepository.clearQueue();
    console.log('Retry queue cleared');
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    return this.queueRepository.getStats();
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
