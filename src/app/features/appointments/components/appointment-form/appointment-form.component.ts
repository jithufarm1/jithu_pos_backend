import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppointmentService } from '../../services/appointment.service';
import { ServiceTypeService } from '../../services/service-type.service';
import { TimeSlotValidatorService } from '../../services/time-slot-validator.service';
import { CustomerService } from '../../../customer/services/customer.service';
import { Appointment, ServiceType, TimeSlot } from '../../../../core/models/appointment.model';
import { CustomerSummary } from '../../../../core/models/customer.model';

/**
 * Appointment Form Component
 * Create and edit appointments with customer, vehicle, service type, and time slot selection
 */
@Component({
  selector: 'app-appointment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment-form.component.html',
  styleUrls: ['./appointment-form.component.css']
})
export class AppointmentFormComponent implements OnInit {
  appointmentForm: FormGroup;
  customers: CustomerSummary[] = [];
  customerVehicles: any[] = [];
  serviceTypes: ServiceType[] = [];
  selectedServiceTypes: ServiceType[] = [];
  availableTimeSlots: TimeSlot[] = [];
  availableBays: number[] = [1, 2, 3, 4];
  technicians: any[] = [
    { id: 'TECH-001', name: 'John Smith' },
    { id: 'TECH-002', name: 'Sarah Johnson' },
    { id: 'TECH-003', name: 'Mike Williams' },
    { id: 'TECH-004', name: 'Emily Davis' }
  ];
  
  loading = false;
  saving = false;
  error: string | null = null;
  
  // Calculated values
  totalDuration = 0;
  estimatedEndTime: Date | null = null;
  
  // Service type categories for grouping
  serviceCategories = [
    { id: 'Oil Change', name: 'Oil Change' },
    { id: 'Fluid Service', name: 'Fluid Service' },
    { id: 'Filter Service', name: 'Filter Service' },
    { id: 'Battery', name: 'Battery' },
    { id: 'Wiper', name: 'Wiper' },
    { id: 'Light', name: 'Light' },
    { id: 'Tire', name: 'Tire' },
    { id: 'Inspection', name: 'Inspection' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private appointmentService: AppointmentService,
    private serviceTypeService: ServiceTypeService,
    private timeSlotValidator: TimeSlotValidatorService,
    private customerService: CustomerService
  ) {
    this.appointmentForm = this.fb.group({
      customerId: ['', Validators.required],
      vehicleId: ['', Validators.required],
      appointmentDate: ['', Validators.required],
      appointmentTime: ['', Validators.required],
      serviceBay: ['', Validators.required],
      technicianId: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadCustomers();
    this.loadServiceTypes();
    
    // Watch for customer selection changes
    this.appointmentForm.get('customerId')?.valueChanges.subscribe(customerId => {
      if (customerId) {
        this.loadCustomerVehicles(customerId);
      }
    });
    
    // Watch for date changes to load available time slots
    this.appointmentForm.get('appointmentDate')?.valueChanges.subscribe(date => {
      if (date && this.totalDuration > 0) {
        this.loadAvailableTimeSlots(new Date(date));
      }
    });
    
    // Watch for time selection to validate and calculate end time
    this.appointmentForm.get('appointmentTime')?.valueChanges.subscribe(time => {
      if (time) {
        this.calculateEndTime();
      }
    });
  }

  /**
   * Load customers for dropdown
   */
  loadCustomers(): void {
    this.loading = true;
    this.customerService.searchCustomers({}).subscribe({
      next: (customers: any) => {
        this.customers = customers;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        this.error = 'Failed to load customers';
        this.loading = false;
      }
    });
  }

  /**
   * Load vehicles for selected customer
   */
  loadCustomerVehicles(customerId: string): void {
    this.customerService.getCustomerById(customerId).subscribe({
      next: (customer) => {
        if (customer) {
          this.customerVehicles = customer.vehicles || [];
          // Reset vehicle selection
          this.appointmentForm.patchValue({ vehicleId: '' });
        }
      },
      error: (error) => {
        console.error('Error loading customer vehicles:', error);
        this.error = 'Failed to load customer vehicles';
      }
    });
  }

  /**
   * Load service types
   */
  loadServiceTypes(): void {
    console.log('[AppointmentForm] Loading service types...');
    this.serviceTypeService.getServiceTypes().subscribe({
      next: (serviceTypes) => {
        console.log('[AppointmentForm] Service types loaded:', serviceTypes.length, serviceTypes);
        this.serviceTypes = serviceTypes;
      },
      error: (error) => {
        console.error('[AppointmentForm] Error loading service types:', error);
        this.error = 'Failed to load service types';
      }
    });
  }

  /**
   * Get service types for a specific category
   */
  getServiceTypesForCategory(categoryId: string): ServiceType[] {
    const filtered = this.serviceTypes.filter(st => st.category === categoryId);
    console.log('[AppointmentForm] Service types for category', categoryId, ':', filtered.length);
    return filtered;
  }

  /**
   * Toggle service type selection
   */
  toggleServiceType(serviceType: ServiceType): void {
    console.log('[AppointmentForm] Toggle service type:', serviceType.name);
    const index = this.selectedServiceTypes.findIndex(st => st.id === serviceType.id);
    if (index >= 0) {
      // Remove service type
      this.selectedServiceTypes.splice(index, 1);
      console.log('[AppointmentForm] Removed service, total selected:', this.selectedServiceTypes.length);
    } else {
      // Add service type
      this.selectedServiceTypes.push(serviceType);
      console.log('[AppointmentForm] Added service, total selected:', this.selectedServiceTypes.length);
    }
    
    // Recalculate duration
    this.calculateDuration();
    
    // Reload time slots if date is selected
    const date = this.appointmentForm.get('appointmentDate')?.value;
    console.log('[AppointmentForm] Current date value:', date);
    console.log('[AppointmentForm] Total duration:', this.totalDuration);
    if (date && this.totalDuration > 0) {
      console.log('[AppointmentForm] Reloading time slots...');
      this.loadAvailableTimeSlots(new Date(date));
    } else {
      console.log('[AppointmentForm] Not loading time slots - date:', !!date, 'duration:', this.totalDuration);
      // Clear time slots if no duration
      if (this.totalDuration === 0) {
        this.availableTimeSlots = [];
        this.appointmentForm.patchValue({ appointmentTime: '' });
      }
    }
  }

  /**
   * Check if service type is selected
   */
  isServiceTypeSelected(serviceType: ServiceType): boolean {
    return this.selectedServiceTypes.some(st => st.id === serviceType.id);
  }

  /**
   * Calculate total duration
   */
  calculateDuration(): void {
    this.totalDuration = this.serviceTypeService.calculateTotalDuration(
      this.selectedServiceTypes.map(st => st.id)
    );
    
    // Recalculate end time if time is selected
    const time = this.appointmentForm.get('appointmentTime')?.value;
    if (time) {
      this.calculateEndTime();
    }
  }

  /**
   * Load available time slots for selected date and duration
   */
  loadAvailableTimeSlots(date: Date): void {
    console.log('[AppointmentForm] Loading time slots for date:', date, 'duration:', this.totalDuration);
    if (this.totalDuration === 0) {
      this.availableTimeSlots = [];
      console.log('[AppointmentForm] No duration, clearing time slots');
      return;
    }
    
    this.timeSlotValidator.getAvailableSlots(date, this.totalDuration).then(slots => {
      console.log('[AppointmentForm] Time slots loaded:', slots.length);
      this.availableTimeSlots = slots;
    }).catch(error => {
      console.error('[AppointmentForm] Error loading available time slots:', error);
      this.error = 'Failed to load available time slots';
    });
  }

  /**
   * Calculate estimated end time
   */
  calculateEndTime(): void {
    const date = this.appointmentForm.get('appointmentDate')?.value;
    const time = this.appointmentForm.get('appointmentTime')?.value;
    
    if (!date || !time || this.totalDuration === 0) {
      this.estimatedEndTime = null;
      return;
    }
    
    // Combine date and time
    const startDateTime = new Date(`${date}T${time}`);
    
    // Add duration in minutes
    this.estimatedEndTime = new Date(startDateTime.getTime() + this.totalDuration * 60000);
  }

  /**
   * Format time for display
   */
  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Format time for form value (HH:mm format)
   */
  formatTimeForValue(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Format duration for display
   */
  formatDuration(minutes: number): string {
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

  /**
   * Get today's date in YYYY-MM-DD format for date input min attribute
   */
  getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  /**
   * Submit appointment
   */
  onSubmit(): void {
    if (this.appointmentForm.invalid || this.selectedServiceTypes.length === 0) {
      this.error = 'Please fill in all required fields and select at least one service';
      return;
    }

    this.saving = true;
    this.error = null;

    // Get form values
    const customerId = this.appointmentForm.get('customerId')?.value;
    const vehicleId = this.appointmentForm.get('vehicleId')?.value;
    const date = this.appointmentForm.get('appointmentDate')?.value;
    const time = this.appointmentForm.get('appointmentTime')?.value;
    const serviceBay = this.appointmentForm.get('serviceBay')?.value;
    const technicianId = this.appointmentForm.get('technicianId')?.value;
    const notes = this.appointmentForm.get('notes')?.value;

    // Get customer and vehicle details
    const customer = this.customers.find(c => c.id === customerId);
    const vehicle = this.customerVehicles.find(v => v.id === vehicleId);

    if (!customer || !vehicle) {
      this.error = 'Invalid customer or vehicle selection';
      this.saving = false;
      return;
    }

    // Combine date and time
    const scheduledDateTime = new Date(`${date}T${time}`);

    // Build appointment
    const appointment: Partial<Appointment> = {
      customerId: customer.id,
      vehicleId: vehicle.id,
      serviceTypes: this.selectedServiceTypes.map(st => st.id),
      scheduledDateTime: scheduledDateTime.toISOString(),
      duration: this.totalDuration,
      serviceBay: parseInt(serviceBay),
      technicianId: technicianId,
      notes: notes || undefined
    };

    this.appointmentService.createAppointment(appointment).subscribe({
      next: (createdAppointment) => {
        if (createdAppointment) {
          console.log('Appointment created successfully:', createdAppointment);
          this.saving = false;
          
          // Show success message and navigate to home
          const customerName = customer.name;
          alert(`Appointment created successfully!\n\nCustomer: ${customerName}\nDate: ${new Date(createdAppointment.scheduledDateTime).toLocaleString()}\nServices: ${this.selectedServiceTypes.map(st => st.name).join(', ')}`);
          
          // Navigate to home page
          this.router.navigate(['/home']);
        } else {
          this.error = 'Failed to create appointment';
          this.saving = false;
        }
      },
      error: (error) => {
        console.error('Error creating appointment:', error);
        this.error = error.message || 'Failed to create appointment. Please try again.';
        this.saving = false;
      }
    });
  }

  /**
   * Cancel and go back
   */
  onCancel(): void {
    this.router.navigate(['/home']);
  }
}
