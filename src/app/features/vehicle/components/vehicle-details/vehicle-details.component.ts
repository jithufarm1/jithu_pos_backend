import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Vehicle } from '../../../../core/models/vehicle.model';

/**
 * Vehicle Details Component
 * Displays complete vehicle information including specifications and service data
 */
@Component({
  selector: 'app-vehicle-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vehicle-details.component.html',
  styleUrls: ['./vehicle-details.component.css'],
})
export class VehicleDetailsComponent {
  @Input() vehicle: Vehicle | null = null;
}
