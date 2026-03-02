import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { CustomerService } from '../../services/customer.service';
import { CustomerSummary } from '../../../../core/models/customer.model';
import { AppHeaderComponent } from '../../../../shared/components/app-header/app-header.component';

/**
 * Customer Search Component
 * Provides search functionality with real-time results
 */
@Component({
  selector: 'app-customer-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppHeaderComponent],
  templateUrl: './customer-search.component.html',
  styleUrls: ['./customer-search.component.css'],
})
export class CustomerSearchComponent implements OnInit, OnDestroy {
  searchControl = new FormControl('');
  customers: CustomerSummary[] = [];
  isLoading = false;
  hasSearched = false;
  private destroy$ = new Subject<void>();

  constructor(
    private customerService: CustomerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Real-time search with debouncing (300ms)
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm) => {
        if (searchTerm && searchTerm.trim().length > 0) {
          this.performSearch(searchTerm.trim());
        } else {
          this.customers = [];
          this.hasSearched = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Perform customer search
   */
  performSearch(searchTerm: string): void {
    this.isLoading = true;
    this.hasSearched = true;

    this.customerService
      .searchCustomers({ searchTerm })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.customers = results;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('[CustomerSearchComponent] Search error:', error);
          this.customers = [];
          this.isLoading = false;
        },
      });
  }

  /**
   * View customer details
   */
  viewCustomer(customerId: string): void {
    this.router.navigate(['/customers', customerId]);
  }

  /**
   * Create new customer
   */
  createCustomer(): void {
    this.router.navigate(['/customers/new']);
  }

  /**
   * Start new service for customer
   */
  newService(customerId: string): void {
    // TODO: Navigate to service creation with customer context
    console.log('[CustomerSearchComponent] New service for customer:', customerId);
    alert('New Service - Coming Soon!');
  }
}
