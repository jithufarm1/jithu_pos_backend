import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { fromEvent, merge, of, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Online Status Indicator Component
 * Shows whether the app is online or offline
 */
@Component({
  selector: 'app-online-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="online-status" [class.online]="isOnline" [class.offline]="!isOnline">
      <span class="status-dot"></span>
      <span class="status-text">{{ isOnline ? 'Online' : 'Offline' }}</span>
    </div>
  `,
  styles: [`
    .online-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .online-status.online {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .online-status.offline {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    .online .status-dot {
      background-color: #28a745;
    }

    .offline .status-dot {
      background-color: #dc3545;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .status-text {
      user-select: none;
    }
  `]
})
export class OnlineStatusComponent implements OnInit, OnDestroy {
  isOnline: boolean = navigator.onLine;
  private subscription?: Subscription;

  ngOnInit(): void {
    // Listen for online/offline events
    this.subscription = merge(
      of(navigator.onLine),
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    ).subscribe(status => {
      this.isOnline = status;
      console.log('[OnlineStatus] Connection status changed:', status ? 'Online' : 'Offline');
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
