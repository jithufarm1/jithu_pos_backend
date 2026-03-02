import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { NetworkStatus } from '../../../core/models/vehicle.model';
import { NetworkDetectionService } from '../../../core/services/network-detection.service';

/**
 * Network Status Component
 * Displays real-time online/offline indicator with last sync timestamp
 */
@Component({
  selector: 'app-network-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './network-status.component.html',
  styleUrls: ['./network-status.component.css'],
})
export class NetworkStatusComponent implements OnInit {
  networkStatus$!: Observable<NetworkStatus>;

  constructor(private networkService: NetworkDetectionService) {}

  ngOnInit(): void {
    this.networkStatus$ = this.networkService.getNetworkStatus();
  }

  /**
   * Format last sync time for display
   */
  formatLastSync(date: Date | undefined): string {
    if (!date) {
      return 'Never';
    }

    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours}h ago`;
    }
  }
}
