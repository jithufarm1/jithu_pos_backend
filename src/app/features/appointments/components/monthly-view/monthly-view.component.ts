import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { Appointment } from '../../../../core/models/appointment.model';
import { AppointmentService } from '../../services/appointment.service';

interface DayCell {
  date: Date;
  dayNumber: number;
  appointmentCount: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
}

@Component({
  selector: 'app-monthly-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monthly-view.component.html',
  styleUrls: ['./monthly-view.component.css']
})
export class MonthlyViewComponent implements OnInit, OnDestroy {
  @Input() selectedDate: Date = new Date();
  @Output() daySelected = new EventEmitter<Date>();
  @Output() monthChanged = new EventEmitter<Date>();

  monthDays: DayCell[] = [];
  monthName: string = '';
  year: number = 0;
  loading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private appointmentService: AppointmentService) {}

  ngOnInit(): void {
    this.generateMonthCalendar();
    this.loadMonthAppointments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Generate calendar grid for the month
   */
  private generateMonthCalendar(): void {
    this.monthDays = [];
    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth();
    
    this.monthName = this.selectedDate.toLocaleDateString('en-US', { month: 'long' });
    this.year = year;

    // Get first day of month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    
    // Get last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Calculate start date (may be in previous month)
    const startDate = new Date(firstDay);
    const daysToSubtract = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday start
    startDate.setDate(startDate.getDate() - daysToSubtract);

    // Generate 42 days (6 weeks) to fill calendar grid
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const isCurrentMonth = date.getMonth() === month;
      
      this.monthDays.push({
        date,
        dayNumber: date.getDate(),
        appointmentCount: 0,
        isCurrentMonth,
        isToday: this.isToday(date),
        appointments: []
      });
    }
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
   * Load appointments for the month
   */
  loadMonthAppointments(): void {
    this.loading = true;
    this.error = null;

    const startDate = this.monthDays[0].date;
    const endDate = this.monthDays[this.monthDays.length - 1].date;

    this.appointmentService.getAppointmentsByDateRange(startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (appointments) => {
          this.processAppointments(appointments);
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading month appointments:', err);
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
    this.monthDays.forEach(day => {
      day.appointmentCount = 0;
      day.appointments = [];
    });

    // Group appointments by day
    appointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.scheduledDateTime);
      const dayCell = this.monthDays.find(day => 
        this.isSameDay(day.date, appointmentDate)
      );

      if (dayCell) {
        dayCell.appointments.push(appointment);
        dayCell.appointmentCount++;
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
    if (dayCell.isCurrentMonth) {
      this.daySelected.emit(dayCell.date);
    }
  }

  /**
   * Navigate to previous month
   */
  previousMonth(): void {
    const newDate = new Date(this.selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    this.selectedDate = newDate;
    this.generateMonthCalendar();
    this.loadMonthAppointments();
    this.monthChanged.emit(newDate);
  }

  /**
   * Navigate to next month
   */
  nextMonth(): void {
    const newDate = new Date(this.selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    this.selectedDate = newDate;
    this.generateMonthCalendar();
    this.loadMonthAppointments();
    this.monthChanged.emit(newDate);
  }

  /**
   * Navigate to current month
   */
  goToToday(): void {
    this.selectedDate = new Date();
    this.generateMonthCalendar();
    this.loadMonthAppointments();
    this.monthChanged.emit(this.selectedDate);
  }

  /**
   * Get CSS class for day cell
   */
  getDayClass(dayCell: DayCell): string {
    const classes = ['day-cell'];
    
    if (!dayCell.isCurrentMonth) {
      classes.push('other-month');
    }
    
    if (dayCell.isToday) {
      classes.push('today');
    }
    
    if (dayCell.appointmentCount > 0) {
      classes.push('has-appointments');
    }
    
    return classes.join(' ');
  }

  /**
   * Get color intensity based on appointment count
   */
  getIntensityClass(count: number): string {
    if (count === 0) return 'intensity-0';
    if (count <= 2) return 'intensity-1';
    if (count <= 5) return 'intensity-2';
    if (count <= 8) return 'intensity-3';
    if (count <= 12) return 'intensity-4';
    return 'intensity-5';
  }

  /**
   * Get week days for header
   */
  getWeekDays(): string[] {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }

  /**
   * Get month and year display text
   */
  getMonthYearText(): string {
    return `${this.monthName} ${this.year}`;
  }
}
