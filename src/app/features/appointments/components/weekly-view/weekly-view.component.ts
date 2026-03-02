import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { Appointment } from '../../../../core/models/appointment.model';
import { AppointmentService } from '../../services/appointment.service';

interface DayCell {
  date: Date;
  dayOfWeek: string;
  dayNumber: number;
  appointmentCount: number;
  isBusy: boolean;
  isToday: boolean;
  appointments: Appointment[];
}

@Component({
  selector: 'app-weekly-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weekly-view.component.html',
  styleUrls: ['./weekly-view.component.css']
})
export class WeeklyViewComponent implements OnInit, OnDestroy {
  @Input() selectedDate: Date = new Date();
  @Output() daySelected = new EventEmitter<Date>();

  weekDays: DayCell[] = [];
  weekStartDate: Date = new Date();
  weekEndDate: Date = new Date();
  loading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private appointmentService: AppointmentService) {}

  ngOnInit(): void {
    this.generateWeekDays();
    this.loadWeekAppointments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Generate 6-day grid (Monday-Saturday)
   */
  private generateWeekDays(): void {
    this.weekDays = [];
    const startOfWeek = this.getStartOfWeek(this.selectedDate);
    this.weekStartDate = startOfWeek;

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 6; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      this.weekDays.push({
        date,
        dayOfWeek: dayNames[i],
        dayNumber: date.getDate(),
        appointmentCount: 0,
        isBusy: false,
        isToday: this.isToday(date),
        appointments: []
      });
    }

    this.weekEndDate = this.weekDays[5].date;
  }

  /**
   * Get the Monday of the week containing the given date
   */
  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust when day is Sunday (0)
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Check if date is today
   */
  private isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  /**
   * Load appointments for the week
   */
  loadWeekAppointments(): void {
    this.loading = true;
    this.error = null;

    this.appointmentService.getAppointmentsByDateRange(this.weekStartDate, this.weekEndDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (appointments) => {
          this.processAppointments(appointments);
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading week appointments:', err);
          this.error = 'Failed to load appointments. Please try again.';
          this.loading = false;
        }
      });
  }

  /**
   * Process appointments and group by day
   */
  private processAppointments(appointments: Appointment[]): void {
    // Reset counts
    this.weekDays.forEach(day => {
      day.appointmentCount = 0;
      day.isBusy = false;
      day.appointments = [];
    });

    // Group appointments by day
    appointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.scheduledDateTime);
      const dayCell = this.weekDays.find(day => 
        this.isSameDay(day.date, appointmentDate)
      );

      if (dayCell) {
        dayCell.appointments.push(appointment);
        dayCell.appointmentCount++;
        
        // Mark as busy if more than 10 appointments
        if (dayCell.appointmentCount > 10) {
          dayCell.isBusy = true;
        }
      }
    });
  }

  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  /**
   * Handle day click - navigate to daily view
   */
  onDayClick(dayCell: DayCell): void {
    this.daySelected.emit(dayCell.date);
  }

  /**
   * Get CSS class for day cell based on appointment count
   */
  getDayClass(dayCell: DayCell): string {
    const classes = ['day-cell'];
    
    if (dayCell.isToday) {
      classes.push('today');
    }
    
    if (dayCell.isBusy) {
      classes.push('busy');
    } else if (dayCell.appointmentCount > 5) {
      classes.push('moderate');
    } else if (dayCell.appointmentCount > 0) {
      classes.push('light');
    }
    
    return classes.join(' ');
  }

  /**
   * Get intensity level for visual indicator
   */
  getIntensityLevel(count: number): string {
    if (count === 0) return 'none';
    if (count <= 3) return 'low';
    if (count <= 7) return 'medium';
    if (count <= 10) return 'high';
    return 'very-high';
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  }

  /**
   * Get week range display text
   */
  getWeekRangeText(): string {
    const startMonth = this.weekStartDate.toLocaleDateString('en-US', { month: 'short' });
    const startDay = this.weekStartDate.getDate();
    const endMonth = this.weekEndDate.toLocaleDateString('en-US', { month: 'short' });
    const endDay = this.weekEndDate.getDate();
    const year = this.weekStartDate.getFullYear();

    if (this.weekStartDate.getMonth() === this.weekEndDate.getMonth()) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
  }
}
