import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CustomerService } from '../../services/customer.service';
import { Customer, CustomerAnalytics } from '../../../../core/models/customer.model';
import { AppHeaderComponent } from '../../../../shared/components/app-header/app-header.component';

/**
 * Customer Detail Component
 * Displays complete customer profile with all sections
 */
@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, AppHeaderComponent],
  templateUrl: './customer-detail.component.html',
  styleUrls: ['./customer-detail.component.css'],
})
export class CustomerDetailComponent implements OnInit, OnDestroy {
  customer: Customer | null = null;
  analytics: CustomerAnalytics | null = null;
  isLoading = true;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService
  ) {}

  ngOnInit(): void {
    const customerId = this.route.snapshot.paramMap.get('id');
    if (customerId) {
      this.loadCustomer(customerId);
    } else {
      this.error = 'Customer ID not provided';
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load customer data
   */
  loadCustomer(customerId: string): void {
    this.isLoading = true;
    this.error = null;

    this.customerService
      .getCustomerById(customerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (customer) => {
          if (customer) {
            this.customer = customer;
            this.calculateAnalytics();
          } else {
            this.error = 'Customer not found';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('[CustomerDetailComponent] Load error:', error);
          this.error = 'Failed to load customer details';
          this.isLoading = false;
        },
      });
  }

  /**
   * Calculate customer analytics
   */
  calculateAnalytics(): void {
    if (!this.customer) return;

    this.analytics = {
      totalVisits: this.customer.totalVisits,
      totalSpent: this.customer.totalSpent,
      averageTicketValue: this.customer.totalVisits > 0 
        ? this.customer.totalSpent / this.customer.totalVisits 
        : 0,
      lastVisitDate: this.customer.lastVisitDate,
      preferredServices: [], // TODO: Calculate from service history
      vehicleCount: this.customer.vehicles.length
    };
  }

  /**
   * Navigate to edit customer
   */
  editCustomer(): void {
    if (this.customer) {
      this.router.navigate(['/customers', this.customer.id, 'edit']);
    }
  }

  /**
   * Delete customer with confirmation
   */
  deleteCustomer(): void {
    if (!this.customer) return;

    const confirmed = confirm(
      `Are you sure you want to delete ${this.customer.firstName} ${this.customer.lastName}?\n\n` +
      'This action cannot be undone. Service history will be archived.'
    );

    if (confirmed) {
      this.customerService
        .deleteCustomer(this.customer.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (success) => {
            if (success) {
              alert('Customer deleted successfully');
              this.router.navigate(['/customers']);
            } else {
              alert('Failed to delete customer');
            }
          },
          error: (error) => {
            console.error('[CustomerDetailComponent] Delete error:', error);
            alert('Failed to delete customer');
          },
        });
    }
  }

  /**
   * Send email to customer
   */
  sendEmail(): void {
    if (this.customer) {
      window.location.href = `mailto:${this.customer.email}`;
    }
  }

  /**
   * Send SMS to customer
   */
  sendSMS(): void {
    if (this.customer) {
      window.location.href = `sms:${this.customer.phone}`;
    }
  }

  /**
   * Print customer information
   */
  printCustomer(): void {
    window.print();
  }

  /**
   * Export customer data as JSON
   */
  exportCustomer(): void {
    if (!this.customer) return;

    const dataStr = JSON.stringify(this.customer, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customer-${this.customer.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Navigate back to search
   */
  goBack(): void {
    this.router.navigate(['/customers']);
  }

  /**
   * Get primary vehicle
   */
  getPrimaryVehicle() {
    return this.customer?.vehicles.find(v => v.isPrimary);
  }

  /**
   * Format phone number
   */
  formatPhone(phone: string): string {
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    return phone;
  }
}
