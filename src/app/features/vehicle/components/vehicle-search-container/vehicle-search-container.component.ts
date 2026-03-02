import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleSearchComponent } from '../vehicle-search/vehicle-search.component';
import { VehicleDetailsComponent } from '../vehicle-details/vehicle-details.component';
import { Vehicle } from '../../../../core/models/vehicle.model';
import { RetryQueueService } from '../../../../core/services/retry-queue.service';
import { AppHeaderComponent } from '../../../../shared/components/app-header/app-header.component';

/**
 * Vehicle Search Container Component
 * Container for vehicle search and details display
 */
@Component({
  selector: 'app-vehicle-search-container',
  standalone: true,
  imports: [CommonModule, VehicleSearchComponent, VehicleDetailsComponent, AppHeaderComponent],
  templateUrl: './vehicle-search-container.component.html',
  styleUrls: ['./vehicle-search-container.component.css'],
})
export class VehicleSearchContainerComponent implements OnInit {
  selectedVehicle: Vehicle | null = null;

  constructor(private retryQueueService: RetryQueueService) {}

  ngOnInit(): void {
    console.log('Vehicle Search Container initialized');
  }

  /**
   * Handle vehicle found event from search component
   */
  onVehicleFound(vehicle: Vehicle): void {
    this.selectedVehicle = vehicle;
    console.log('Vehicle found:', vehicle);
  }

  /**
   * Handle search error event
   */
  onSearchError(error: string): void {
    console.error('Search error:', error);
  }
}
