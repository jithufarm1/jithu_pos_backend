import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ServiceTicketService } from '../../services/service-ticket.service';
import { CustomerService } from '../../../customer/services/customer.service';
import { ServiceTicket, ServiceCategory } from '../../../../core/models/service-ticket.model';
import { ServiceItem, ServiceRecommendation } from '../../../../core/models/service-catalog.model';
import { Customer, CustomerSummary } from '../../../../core/models/customer.model';

/**
 * Ticket Form Component
 * Create and edit service tickets
 */
@Component({
  selector: 'app-ticket-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ticket-form.component.html',
  styleUrls: ['./ticket-form.component.css']
})
export class TicketFormComponent implements OnInit {
  ticketForm: FormGroup;
  customers: CustomerSummary[] = [];
  customerVehicles: any[] = [];
  serviceCatalog: ServiceItem[] = [];
  selectedServices: any[] = [];
  recommendations: ServiceRecommendation[] = [];
  
  loading = false;
  saving = false;
  error: string | null = null;
  
  // Service categories for tabs
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
  
  selectedCategory: ServiceCategory = 'Oil_Change';
  
  // Pricing summary
  subtotal = 0;
  tax = 0;
  total = 0;
  partsTotal = 0;
  laborTotal = 0;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private ticketService: ServiceTicketService,
    private customerService: CustomerService
  ) {
    this.ticketForm = this.fb.group({
      customerId: ['', Validators.required],
      vehicleId: ['', Validators.required],
      currentMileage: ['', [Validators.required, Validators.min(0)]],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadCustomers();
    this.loadServiceCatalog();
    
    // Watch for customer selection changes
    this.ticketForm.get('customerId')?.valueChanges.subscribe(customerId => {
      if (customerId) {
        this.loadCustomerVehicles(customerId);
      }
    });
    
    // Watch for vehicle selection changes
    this.ticketForm.get('vehicleId')?.valueChanges.subscribe(vehicleId => {
      if (vehicleId) {
        this.loadRecommendations(vehicleId);
      }
    });
    
    // Watch for mileage changes
    this.ticketForm.get('currentMileage')?.valueChanges.subscribe(() => {
      const vehicleId = this.ticketForm.get('vehicleId')?.value;
      if (vehicleId) {
        this.loadRecommendations(vehicleId);
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
          this.ticketForm.patchValue({ vehicleId: '' });
        }
      },
      error: (error) => {
        console.error('Error loading customer vehicles:', error);
        this.error = 'Failed to load customer vehicles';
      }
    });
  }

  /**
   * Load service catalog
   */
  loadServiceCatalog(): void {
    console.log('[TicketFormComponent] Loading service catalog...');
    this.ticketService.getServiceCatalog().subscribe({
      next: (catalog) => {
        console.log('[TicketFormComponent] Service catalog loaded:', catalog);
        this.serviceCatalog = catalog.services;
        if (!this.serviceCatalog || this.serviceCatalog.length === 0) {
          console.warn('[TicketFormComponent] Service catalog is empty');
          this.error = 'Service catalog is empty. Please ensure mock backend is running with catalog data.';
        }
      },
      error: (error) => {
        console.error('[TicketFormComponent] Error loading service catalog:', error);
        console.error('[TicketFormComponent] Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: error.url
        });
        
        if (error.status === 0) {
          this.error = 'Cannot connect to backend server. Please ensure mock backend is running on port 3000.';
        } else if (error.status === 404) {
          this.error = 'Service catalog endpoint not found. Please restart the mock backend server.';
        } else {
          this.error = `Failed to load service catalog: ${error.message || 'Unknown error'}`;
        }
      }
    });
  }

  /**
   * Load service recommendations for vehicle
   */
  loadRecommendations(vehicleId: string): void {
    const currentMileage = this.ticketForm.get('currentMileage')?.value;
    if (!currentMileage) {
      return;
    }

    this.ticketService.getServiceRecommendations(vehicleId, currentMileage).subscribe({
      next: (recommendations) => {
        this.recommendations = recommendations;
      },
      error: (error) => {
        console.error('Error loading recommendations:', error);
      }
    });
  }

  /**
   * Get services for selected category
   */
  getServicesForCategory(): ServiceItem[] {
    return this.serviceCatalog.filter(s => s.category === this.selectedCategory && s.isActive);
  }

  /**
   * Add service to ticket
   */
  addService(service: ServiceItem): void {
    // Check if service already added
    const existing = this.selectedServices.find(s => s.id === service.id);
    if (existing) {
      // Increment quantity
      existing.quantity++;
    } else {
      // Add new service
      this.selectedServices.push({
        id: service.id,
        name: service.name,
        category: service.category,
        quantity: 1,
        unitPrice: service.basePrice,
        partsCost: service.partsCost,
        laborCost: service.laborCost,
        laborMinutes: service.laborMinutes
      });
    }
    
    this.calculateTotals();
  }

  /**
   * Remove service from ticket
   */
  removeService(serviceId: string): void {
    this.selectedServices = this.selectedServices.filter(s => s.id !== serviceId);
    this.calculateTotals();
  }

  /**
   * Update service quantity
   */
  updateQuantity(serviceId: string, quantity: number): void {
    const service = this.selectedServices.find(s => s.id === serviceId);
    if (service && quantity > 0) {
      service.quantity = quantity;
      this.calculateTotals();
    }
  }

  /**
   * Calculate ticket totals
   */
  calculateTotals(): void {
    this.subtotal = 0;
    this.partsTotal = 0;
    this.laborTotal = 0;
    
    this.selectedServices.forEach(service => {
      const lineTotal = service.unitPrice * service.quantity;
      this.subtotal += lineTotal;
      this.partsTotal += service.partsCost * service.quantity;
      this.laborTotal += service.laborCost * service.quantity;
    });
    
    // Calculate tax (8% default)
    this.tax = Math.round(this.subtotal * 0.08 * 100) / 100;
    this.total = this.subtotal + this.tax;
  }

  /**
   * Accept recommendation
   */
  acceptRecommendation(recommendation: ServiceRecommendation): void {
    const service = this.serviceCatalog.find(s => s.id === recommendation.serviceId);
    if (service) {
      this.addService(service);
    }
    
    // Remove from recommendations
    this.recommendations = this.recommendations.filter(r => r.serviceId !== recommendation.serviceId);
  }

  /**
   * Dismiss recommendation
   */
  dismissRecommendation(recommendation: ServiceRecommendation): void {
    this.recommendations = this.recommendations.filter(r => r.serviceId !== recommendation.serviceId);
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(category: ServiceCategory): string {
    return category.replace(/_/g, ' ');
  }

  /**
   * Get priority badge class
   */
  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return '';
    }
  }

  /**
   * Submit ticket
   */
  onSubmit(): void {
    if (this.ticketForm.invalid || this.selectedServices.length === 0) {
      this.error = 'Please fill in all required fields and add at least one service';
      return;
    }

    this.saving = true;
    this.error = null;

    // Get selected customer and vehicle
    const customerId = this.ticketForm.get('customerId')?.value;
    const vehicleId = this.ticketForm.get('vehicleId')?.value;
    const customer = this.customers.find(c => c.id === customerId);
    const vehicle = this.customerVehicles.find(v => v.id === vehicleId);

    if (!customer || !vehicle) {
      this.error = 'Invalid customer or vehicle selection';
      this.saving = false;
      return;
    }

    // Build ticket
    const ticket: Partial<ServiceTicket> = {
      customerId: customer.id,
      customerName: customer.name,
      vehicleId: vehicle.id,
      vehicleInfo: {
        id: vehicle.id,
        vin: vehicle.vin,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        licensePlate: vehicle.licensePlate
      },
      currentMileage: this.ticketForm.get('currentMileage')?.value,
      notes: this.ticketForm.get('notes')?.value,
      lineItems: this.selectedServices.map(s => ({
        id: '',
        serviceId: s.id,
        serviceName: s.name,
        category: s.category,
        quantity: s.quantity,
        unitPrice: s.unitPrice,
        lineTotal: s.unitPrice * s.quantity,
        partsCost: s.partsCost,
        laborCost: s.laborCost,
        laborMinutes: s.laborMinutes
      })),
      createdBy: 'current-user' // TODO: Get from auth service
    };

    this.ticketService.createTicket(ticket).subscribe({
      next: (createdTicket) => {
        if (createdTicket) {
          console.log('Ticket created successfully:', createdTicket);
          this.saving = false;
          
          // Show success message and navigate to home
          alert(`Service Ticket #${createdTicket.ticketNumber} created successfully!\n\nTotal: $${createdTicket.total.toFixed(2)}\nStatus: ${createdTicket.status}`);
          
          // Navigate to home page
          this.router.navigate(['/home']);
        } else {
          this.error = 'Failed to create ticket';
          this.saving = false;
        }
      },
      error: (error) => {
        console.error('Error creating ticket:', error);
        this.error = 'Failed to create ticket. Please try again.';
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
