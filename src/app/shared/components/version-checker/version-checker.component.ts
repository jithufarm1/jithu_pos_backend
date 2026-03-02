import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

/**
 * Version Checker Component
 * Detects when a new version of the app is available and prompts user to update
 */
@Component({
  selector: 'app-version-checker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="updateAvailable" class="update-banner">
      <div class="update-content">
        <span class="update-icon">🔄</span>
        <span class="update-message">A new version is available!</span>
        <button class="update-button" (click)="updateApp()">Update Now</button>
        <button class="dismiss-button" (click)="dismissUpdate()">Later</button>
      </div>
    </div>
  `,
  styles: [`
    .update-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
      from {
        transform: translateY(-100%);
      }
      to {
        transform: translateY(0);
      }
    }

    .update-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .update-icon {
      font-size: 24px;
      animation: rotate 2s linear infinite;
    }

    @keyframes rotate {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .update-message {
      font-weight: 500;
      font-size: 16px;
    }

    .update-button,
    .dismiss-button {
      padding: 8px 20px;
      border: none;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
    }

    .update-button {
      background: white;
      color: #667eea;
    }

    .update-button:hover {
      background: #f0f0f0;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .dismiss-button {
      background: transparent;
      color: white;
      border: 1px solid white;
    }

    .dismiss-button:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    @media (max-width: 768px) {
      .update-content {
        flex-wrap: wrap;
        gap: 10px;
      }

      .update-message {
        flex: 1 1 100%;
        text-align: center;
      }
    }
  `]
})
export class VersionCheckerComponent implements OnInit {
  updateAvailable = false;

  constructor(private swUpdate: SwUpdate) {}

  ngOnInit(): void {
    // Only check for updates if service worker is enabled (production mode)
    if (this.swUpdate.isEnabled) {
      // Check for updates every 5 minutes
      setInterval(() => {
        this.swUpdate.checkForUpdate();
      }, 5 * 60 * 1000);

      // Listen for version updates
      this.swUpdate.versionUpdates
        .pipe(
          filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY')
        )
        .subscribe(event => {
          console.log('New version available:', event.latestVersion);
          this.updateAvailable = true;
        });

      // Check for update immediately on load
      this.swUpdate.checkForUpdate().then(updateAvailable => {
        if (updateAvailable) {
          console.log('Update available on initial check');
        }
      });
    }
  }

  /**
   * Update the app by reloading the page
   */
  updateApp(): void {
    this.swUpdate.activateUpdate().then(() => {
      console.log('Activating new version...');
      window.location.reload();
    });
  }

  /**
   * Dismiss the update notification
   */
  dismissUpdate(): void {
    this.updateAvailable = false;
  }
}
