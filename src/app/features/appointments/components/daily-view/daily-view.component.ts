import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Appointment, AppointmentStatus } from '../../../../core/models/appointment.model';
import { AppointmentService } from '../../services/appointment.service';
import { CustomerService } from '../../../customer/services/customer.service';

interface TimeSlotRow {
  time: string;
  hour: number;
  minute: number;
}

interface AppointmentCard {
  appointment: Appointment;
  customerName: string;
  vehicleInfo: string;
  startRow: number;
  rowSpan: number;
  bayColumn: number;
}

@Component({
  selector: 'app-daily-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-view.component.html',
  styleUrls: ['./daily-view.component.css']
})
export class DailyViewComponent implements OnInit, OnDestroy {
  @Input() selectedDate: Date = new Date();

  timeSlots: TimeSlotRow[] = [];
  appointments: Appointment[] = [];
  appointmentCards: AppointmentCard[] = [];
  bays = [1, 2, 3, 4];
  loading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private appointmentService: AppointmentService,
    private customerService: CustomerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.generateTimeSlots();
    this.loadAppointments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Generate time slots from 8 AM to 6 PM in 30-minute intervals
   */
  private generateTimeSlots(): void {
    this.timeSlots = [];
    for (let hour = 8; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break; // Stop at 6:00 PM
        
        const displayHour = hour > 12 ? hour - 12 : hour;
        const period = hour >= 12 ? 'PM' : 'AM';
        const minuteStr = minute.toString().padStart(2, '0');
        
        this.timeSlots.push({
          time: `${displayHour}:${minuteStr} ${period}`,
          hour,
          minute
        });
      }
    }
  }

  /**
   * Load appointments for the selected date
   */
  loadAppointments(): void {
    this.loading = true;
    this.error = null;

    this.appointmentService.getAppointmentsByDate(this.selectedDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (appointments) => {
          this.appointments = appointments;
          this.processAppointments();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading appointments:', err);
          this.error = 'Failed to load appointments. Please try again.';
          this.loading = false;
        }
      });
  }

  /**
   * Process appointments and create appointment cards with positioning
   */
  private async processAppointments(): Promise<void> {
    this.appointmentCards = [];

    for (const appointment of this.appointments) {
      const customerName = await this.getCustomerName(appointment.customerId);
      const vehicleInfo = await this.getVehicleInfo(appointment.vehicleId);
      
      const startRow = this.calculateRowPosition(appointment.scheduledDateTime);
      const rowSpan = this.calculateRowSpan(appointment.duration);
      
      this.appointmentCards.push({
        appointment,
        customerName,
        vehicleInfo,
        startRow,
        rowSpan,
        bayColumn: appointment.serviceBay
      });
    }
  }

  /**
   * Calculate grid row position based on appointment time
   */
  private calculateRowPosition(dateTimeStr: string): number {
    const dateTime = new Date(dateTimeStr);
    const hour = dateTime.getHours();
    const minute = dateTime.getMinutes();
    
    // Calculate row index (0-based)
    // Each hour has 2 rows (30-min intervals), starting from 8 AM
    const rowIndex = (hour - 8) * 2 + (minute >= 30 ? 1 : 0);
    return rowIndex + 1; // CSS grid is 1-based
  }

  /**
   * Calculate how many rows the appointment spans
   */
  private calculateRowSpan(durationMinutes: number): number {
    // Each row is 30 minutes
    return Math.ceil(durationMinutes / 30);
  }

  /**
   * Get customer name from cache or service
   */
  private async getCustomerName(customerId: string): Promise<string> {
    try {
      const customer = await this.customerService.getCustomerById(customerId).toPromise();
      return customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown Customer';
    } catch (err) {
      console.error('Error fetching customer:', err);
      return 'Unknown Customer';
    }
  }

  /**
   * Get vehicle info from customer's vehicles
   */
  private async getVehicleInfo(vehicleId: string): Promise<string> {
    try {
      const customer = this.appointments.find(a => 
        a.vehicleId === vehicleId
      );
      
      if (customer) {
        const customerData = await this.customerService.getCustomerById(customer.customerId).toPromise();
        const vehicle = customerData?.vehicles?.find(v => v.id === vehicleId);
        
        if (vehicle) {
          return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
        }
      }
      
      return 'Unknown Vehicle';
    } catch (err) {
      console.error('Error fetching vehicle:', err);
      return 'Unknown Vehicle';
    }
  }

  /**
   * Get status color class for appointment card
   */
  getStatusColor(status: AppointmentStatus): string {
    const colorMap: Record<AppointmentStatus, string> = {
      'scheduled': 'status-scheduled',
      'checked-in': 'status-checked-in',
      'in-progress': 'status-in-progress',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled',
      'no-show': 'status-no-show'
    };
    return colorMap[status] || 'status-scheduled';
  }

  /**
   * Get status display text
   */
  getStatusText(status: AppointmentStatus): string {
    const textMap: Record<AppointmentStatus, string> = {
      'scheduled': 'Scheduled',
      'checked-in': 'Checked In',
      'in-progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'no-show': 'No Show'
    };
    return textMap[status] || status;
  }

  /**
   * Check if appointment can be checked in
   */
  canCheckIn(appointment: Appointment): boolean {
    return appointment.status === 'scheduled';
  }

  /**
   * Quick check-in action
   */
  async quickCheckIn(appointment: Appointment, event: Event): Promise<void> {
    event.stopPropagation();
    
    if (!this.canCheckIn(appointment)) {
      return;
    }

    try {
      await this.appointmentService.checkInAppointment(appointment.id).toPromise();
      this.loadAppointments(); // Reload to show updated status
    } catch (err) {
      console.error('Error checking in appointment:', err);
      alert('Failed to check in appointment. Please try again.');
    }
  }

  /**
   * Navigate to appointment detail
   */
  viewAppointmentDetail(appointment: Appointment): void {
    this.router.navigate(['/appointments', appointment.id]);
  }

  /**
   * Get grid position style for appointment card
   */
  getCardStyle(card: AppointmentCard): any {
    return {
      'grid-row-start': card.startRow,
      'grid-row-end': `span ${card.rowSpan}`,
      'grid-column': card.bayColumn + 1 // +1 because first column is time labels
    };
  }

  /**
   * Format time for display
   */
  formatTime(dateTimeStr: string): string {
    const dateTime = new Date(dateTimeStr);
    const hour = dateTime.getHours();
    const minute = dateTime.getMinutes();
    const displayHour = hour > 12 ? hour - 12 : hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    const minuteStr = minute.toString().padStart(2, '0');
    return `${displayHour}:${minuteStr} ${period}`;
  }
}
