import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CustomerService } from '../../services/customer.service';
import { ValidationService } from '../../../../core/services/validation.service';
import { Customer } from '../../../../core/models/customer.model';
import { AppHeaderComponent } from '../../../../shared/components/app-header/app-header.component';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppHeaderComponent],
  templateUrl: './customer-form.component.html',
  styleUrls: ['./customer-form.component.css'],
})
export class CustomerFormComponent implements OnInit, OnDestroy {
  customerForm: FormGroup;
  isEditMode = false;
  customerId: string | null = null;
  isLoading = false;
  isSaving = false;
  showValidationSummary = false;
  private destroy$ = new Subject<void>();

  usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService,
    private validationService: ValidationService
  ) {
    this.customerForm = this.createForm();
  }

  ngOnInit(): void {
    this.customerId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.customerId;

    if (this.isEditMode && this.customerId) {
      this.loadCustomer(this.customerId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createForm(): FormGroup {
    return this.fb.group({
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      alternatePhone: ['', [Validators.pattern(/^\d{10}$/)]],
      street: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}(-\d{4})?$/)]],
      emailNotifications: [true],
      smsNotifications: [true],
      marketingEmails: [true],
      preferredContactMethod: ['email'],
      notes: ['']
    });
  }

  loadCustomer(customerId: string): void {
    this.isLoading = true;
    this.customerService.getCustomerById(customerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (customer) => {
          if (customer) {
            this.customerForm.patchValue({
              firstName: customer.firstName,
              lastName: customer.lastName,
              email: customer.email,
              phone: customer.phone,
              alternatePhone: customer.alternatePhone,
              street: customer.address.street,
              city: customer.address.city,
              state: customer.address.state,
              zipCode: customer.address.zipCode,
              emailNotifications: customer.preferences.emailNotifications,
              smsNotifications: customer.preferences.smsNotifications,
              marketingEmails: customer.preferences.marketingEmails,
              preferredContactMethod: customer.preferences.preferredContactMethod,
              notes: customer.notes
            });
          }
          this.isLoading = false;
        },
        error: () => {
          alert('Failed to load customer');
          this.isLoading = false;
        }
      });
  }

  onSubmit(): void {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      this.showValidationSummary = true;
      console.log('[CustomerForm] Form is invalid:', this.customerForm.errors);
      Object.keys(this.customerForm.controls).forEach(key => {
        const control = this.customerForm.get(key);
        if (control?.invalid) {
          console.log(`[CustomerForm] Invalid field: ${key}`, control.errors);
        }
      });
      // Scroll to top to show validation summary
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    this.showValidationSummary = false;
    console.log('[CustomerForm] Submitting form...');
    this.isSaving = true;
    const formValue = this.customerForm.value;
    
    const customerData: Partial<Customer> = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      phone: formValue.phone,
      alternatePhone: formValue.alternatePhone,
      address: {
        street: formValue.street,
        city: formValue.city,
        state: formValue.state,
        zipCode: formValue.zipCode,
        country: 'USA'
      },
      preferences: {
        emailNotifications: formValue.emailNotifications,
        smsNotifications: formValue.smsNotifications,
        marketingEmails: formValue.marketingEmails,
        preferredContactMethod: formValue.preferredContactMethod,
        preferredLanguage: 'en'
      },
      notes: formValue.notes
    };

    console.log('[CustomerForm] Customer data:', customerData);

    const operation = this.isEditMode && this.customerId
      ? this.customerService.updateCustomer(this.customerId, customerData)
      : this.customerService.createCustomer(customerData);

    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        console.log('[CustomerForm] Operation result:', result);
        if (result) {
          alert(this.isEditMode ? 'Customer updated successfully' : 'Customer created successfully');
          this.router.navigate(['/customers', result.id]);
        } else {
          alert('Operation failed - no result returned');
          this.isSaving = false;
        }
      },
      error: (error) => {
        console.error('[CustomerForm] Operation error:', error);
        alert('Operation failed: ' + (error.message || 'Unknown error'));
        this.isSaving = false;
      }
    });
  }

  cancel(): void {
    if (this.isEditMode && this.customerId) {
      this.router.navigate(['/customers', this.customerId]);
    } else {
      this.router.navigate(['/customers']);
    }
  }
}
