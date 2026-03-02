import { Injectable } from '@angular/core';
import { QueuedRequest } from '../models/vehicle.model';
import { IndexedDBRepository } from './indexeddb.repository';

/**
 * Request Queue Repository
 * Manages failed API requests for retry when network is restored
 * Implements automatic purging of old requests (>24 hours)
 */
@Injectable({
  providedIn: 'root',
})
export class RequestQueueRepository extends IndexedDBRepository {
  private readonly storeName = 'request-queue';
  private readonly maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly maxQueueSize = 100;

  /**
   * Add request to queue
   */
  async add(request: QueuedRequest): Promise<void> {
    // Check queue size
    const count = await this.count(this.storeName);
    if (count >= this.maxQueueSize) {
      // Remove oldest request
      await this.removeOldest();
    }

    await this.put(this.storeName, request);
  }

  /**
   * Get all queued requests
   */
  async getAllRequests(): Promise<QueuedRequest[]> {
    return super.getAll<QueuedRequest>(this.storeName);
  }

  /**
   * Remove request from queue by ID
   */
  async remove(id: string): Promise<void> {
    return this.delete(this.storeName, id);
  }

  /**
   * Purge requests older than maxAge (24 hours)
   */
  async purgeOld(): Promise<number> {
    const db = await this.initDB();
    const cutoffTime = new Date(Date.now() - this.maxAge);
    let purgedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const queuedRequest = cursor.value as QueuedRequest;
          const requestTime = new Date(queuedRequest.timestamp);

          if (requestTime < cutoffTime) {
            cursor.delete();
            purgedCount++;
          }

          cursor.continue();
        } else {
          resolve(purgedCount);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to purge old requests'));
      };
    });
  }

  /**
   * Remove oldest request from queue
   */
  private async removeOldest(): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          resolve();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to remove oldest request'));
      };
    });
  }

  /**
   * Clear all queued requests
   */
  async clearQueue(): Promise<void> {
    return this.clear(this.storeName);
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    count: number;
    maxSize: number;
    oldestRequest?: Date;
  }> {
    const requests = await this.getAllRequests();
    const count = requests.length;

    let oldestRequest: Date | undefined;
    if (requests.length > 0) {
      oldestRequest = requests.reduce((oldest, req) => {
        const reqTime = new Date(req.timestamp);
        return reqTime < oldest ? reqTime : oldest;
      }, new Date(requests[0].timestamp));
    }

    return {
      count,
      maxSize: this.maxQueueSize,
      oldestRequest,
    };
  }
}
