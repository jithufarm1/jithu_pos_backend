import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Vehicle, ReferenceData, Make, Model } from '../../../../core/models/vehicle.model';
import { VehicleService } from '../../services/vehicle.service';

/**
 * Vehicle Search Component
 * Provides search interface for vehicle lookup by criteria or VIN
 */
@Component({
  selector: 'app-vehicle-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicle-search.component.html',
  styleUrls: ['./vehicle-search.component.css'],
})
export class VehicleSearchComponent implements OnInit {
  @Output() vehicleFound = new EventEmitter<Vehicle>();
  @Output() searchError = new EventEmitter<string>();

  // Reference data
  referenceData: ReferenceData | null = null;
  years: number[] = [];
  makes: Make[] = [];
  filteredModels: Model[] = [];

  // Search criteria
  selectedYear: number | null = null;
  selectedMake: string = '';
  selectedModel: string = '';
  vinInput: string = '';

  // UI state
  loading = false;
  errorMessage: string | null = null;

  constructor(private vehicleService: VehicleService) {}

  ngOnInit(): void {
    this.loadReferenceData();
    this.generateYears();
  }

  /**
   * Load reference data (makes, models, engines, service types)
   */
  loadReferenceData(): void {
    this.vehicleService.getReferenceData().subscribe({
      next: (data) => {
        this.referenceData = data;
        this.makes = data.makes;
        console.log('Reference data loaded successfully:', data);
        console.log('Available makes:', this.makes.map(m => m.name));
      },
      error: (error) => {
        console.error('Failed to load reference data:', error);
        this.errorMessage = 'Failed to load vehicle data. Please refresh the page.';
      },
    });
  }

  /**
   * Generate years array (current year back to 1990)
   */
  generateYears(): void {
    const currentYear = new Date().getFullYear();
    const startYear = 1990;
    this.years = [];
    for (let year = currentYear + 1; year >= startYear; year--) {
      this.years.push(year);
    }
  }

  /**
   * Handle make selection - filter models
   */
  onMakeChange(): void {
    console.log('Make changed to:', this.selectedMake);
    this.selectedModel = '';
    this.filteredModels = [];
    this.errorMessage = null;

    if (this.selectedMake && this.referenceData) {
      const make = this.referenceData.makes.find(
        (m) => m.name === this.selectedMake
      );
      console.log('Found make:', make);
      if (make) {
        this.filteredModels = make.models;
        console.log('Filtered models:', this.filteredModels.map(m => m.name));
      }
    }
  }

  /**
   * Handle year change
   */
  onYearChange(): void {
    this.errorMessage = null;
  }

  /**
   * Handle model change
   */
  onModelChange(): void {
    this.errorMessage = null;
  }

  /**
   * Search by criteria (year, make, model)
   */
  /**
     * Search by criteria (year, make, model) using chunked cache
     */
    searchByCriteria(): void {
      if (!this.selectedYear || !this.selectedMake || !this.selectedModel) {
        this.errorMessage = 'Please select year, make, and model.';
        return;
      }

      this.loading = true;
      this.errorMessage = null;

      // Use chunked cache search
      this.vehicleService
        .searchVehiclesChunked({
          year: this.selectedYear,
          make: this.selectedMake,
          model: this.selectedModel,
        })
        .subscribe({
          next: (vehicle) => {
            this.loading = false;
            console.log('[VehicleSearch] Vehicle found in chunked cache:', vehicle);
            this.vehicleFound.emit(vehicle);
          },
          error: (error) => {
            this.loading = false;
            console.error('[VehicleSearch] Search error:', error);
            this.errorMessage = error.message || 'Failed to search vehicle.';
            this.searchError.emit(this.errorMessage || '');
          },
        });
    }

  /**
   * Search by VIN
   */
  /**
     * Search by VIN using NHTSA decoder
     */
    searchByVin(): void {
      if (!this.vinInput || this.vinInput.trim().length === 0) {
        this.errorMessage = 'Please enter a VIN.';
        return;
      }

      const vin = this.vinInput.trim().toUpperCase();

      this.loading = true;
      this.errorMessage = null;

      // Use the new VIN decoder with chunked cache
      this.vehicleService.searchByVinWithDecoder(vin).subscribe({
        next: (vehicle) => {
          this.loading = false;
          console.log('[VehicleSearch] Vehicle found:', vehicle);
          this.vehicleFound.emit(vehicle);
        },
        error: (error) => {
          this.loading = false;
          console.error('[VehicleSearch] VIN search error:', error);
          this.errorMessage = error.message || 'Failed to search vehicle by VIN.';
          this.searchError.emit(this.errorMessage || '');
        },
      });
    }

  /**
   * Handle VIN input keypress (Enter key)
   */
  onVinKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.searchByVin();
    }
  }

  /**
   * Clear search form
   */
  clearSearch(): void {
    this.selectedYear = null;
    this.selectedMake = '';
    this.selectedModel = '';
    this.vinInput = '';
    this.filteredModels = [];
    this.errorMessage = null;
  }
}
