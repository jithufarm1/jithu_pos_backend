import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ServiceTicketService } from '../../services/service-ticket.service';
import { ServiceItem, ServiceCategory } from '../../../../core/models/service-catalog.model';

@Component({
  selector: 'app-service-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './service-catalog.component.html',
  styleUrls: ['./service-catalog.component.css']
})
export class ServiceCatalogComponent implements OnInit, OnDestroy {
  @Output() serviceSelected = new EventEmitter<ServiceItem>();

  services: ServiceItem[] = [];
  filteredServices: ServiceItem[] = [];
  categories: ServiceCategory[] = [
    'Oil_Change',
    'Fluid_Services',
    'Filters',
    'Battery',
    'Wipers',
    'Lights',
    'Tires',
    'Inspection'
  ];
  
  selectedCategory: ServiceCategory | 'All' = 'All';
  searchQuery = '';
  isLoading = false;
  error: string | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(private serviceTicketService: ServiceTicketService) {}

  ngOnInit(): void {
    this.loadCatalog();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCatalog(): void {
    this.isLoading = true;
    this.error = null;

    this.serviceTicketService.getServiceCatalog()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (catalog) => {
          this.services = catalog.services.filter(s => s.isActive);
          this.applyFilters();
          this.isLoading = false;
        },
        error: (err) => {
          this.error = 'Failed to load service catalog. Please try again.';
          console.error('Error loading catalog:', err);
          this.isLoading = false;
        }
      });
  }

  onCategoryChange(category: ServiceCategory | 'All'): void {
    this.selectedCategory = category;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.services];

    // Apply category filter
    if (this.selectedCategory !== 'All') {
      filtered = filtered.filter(s => s.category === this.selectedCategory);
    }

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query)
      );
    }

    this.filteredServices = filtered;
  }

  selectService(service: ServiceItem): void {
    this.serviceSelected.emit(service);
  }

  getCategoryLabel(category: ServiceCategory | 'All'): string {
    const labels: Record<ServiceCategory | 'All', string> = {
      'All': 'All Services',
      'Oil_Change': 'Oil Change',
      'Fluid_Services': 'Fluid Services',
      'Filters': 'Filters',
      'Battery': 'Battery',
      'Wipers': 'Wipers',
      'Lights': 'Lights',
      'Tires': 'Tires',
      'Inspection': 'Inspection'
    };
    return labels[category] || category;
  }

  getCategoryIcon(category: ServiceCategory | 'All'): string {
    const icons: Record<ServiceCategory | 'All', string> = {
      'All': '📋',
      'Oil_Change': '🛢️',
      'Fluid_Services': '💧',
      'Filters': '🔧',
      'Battery': '🔋',
      'Wipers': '🌧️',
      'Lights': '💡',
      'Tires': '🚗',
      'Inspection': '🔍'
    };
    return icons[category] || '🔧';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatLaborTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  }
}
