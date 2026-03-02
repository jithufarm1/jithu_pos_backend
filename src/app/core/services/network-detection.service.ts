import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge } from 'rxjs';
import { map } from 'rxjs/operators';
import { NetworkStatus } from '../models/vehicle.model';

/**
 * Network Detection Service
 * Monitors browser online/offline events and provides network status
 * Triggers retry queue processing when connection is restored
 */
@Injectable({
  providedIn: 'root',
})
export class NetworkDetectionService {
  private networkStatus$ = new BehaviorSubject<NetworkStatus>({
    isOnline: navigator.onLine,
    lastOnline: navigator.onLine ? new Date() : undefined,
    lastSync: undefined,
  });

  constructor() {
    this.initNetworkListeners();
  }

  /**
   * Initialize browser online/offline event listeners
   */
  private initNetworkListeners(): void {
    const online$ = fromEvent(window, 'online').pipe(map(() => true));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => false));

    merge(online$, offline$).subscribe((isOnline) => {
      const currentStatus = this.networkStatus$.value;
      this.networkStatus$.next({
        isOnline,
        lastOnline: isOnline ? new Date() : currentStatus.lastOnline,
        lastSync: currentStatus.lastSync,
      });

      console.log(`Network status changed: ${isOnline ? 'Online' : 'Offline'}`);
    });
  }

  /**
   * Get observable stream of network status
   */
  getNetworkStatus(): Observable<NetworkStatus> {
    return this.networkStatus$.asObservable();
  }

  /**
   * Get current network status (synchronous)
   */
  isOnline(): boolean {
    return this.networkStatus$.value.isOnline;
  }

  /**
   * Update last sync timestamp
   */
  updateLastSync(): void {
    const currentStatus = this.networkStatus$.value;
    this.networkStatus$.next({
      ...currentStatus,
      lastSync: new Date(),
    });
  }

  /**
   * Get current network status value
   */
  getCurrentStatus(): NetworkStatus {
    return this.networkStatus$.value;
  }
}
