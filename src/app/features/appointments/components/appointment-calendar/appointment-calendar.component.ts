import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DailyViewComponent } from '../daily-view/daily-view.component';
import { WeeklyViewComponent } from '../weekly-view/weekly-view.component';
import { MonthlyViewComponent } from '../monthly-view/monthly-view.component';

type CalendarView = 'daily' | 'weekly' | 'monthly';

@Component({
  selector: 'app-appointment-calendar',
  standalone: true,
  imports: [
    CommonModule,
    DailyViewComponent,
    WeeklyViewComponent,
    MonthlyViewComponent
  ],
  templateUrl: './appointment-calendar.component.html',
  styleUrls: ['./appointment-calendar.component.css']
})
export class AppointmentCalendarComponent implements OnInit {
  activeView: CalendarView = 'daily';
  selectedDate: Date = new Date();
  syncing = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Initialize with today's date
    this.selectedDate = new Date();
  }

  /**
   * Switch between calendar views
   */
  setView(view: CalendarView): void {
    this.activeView = view;
  }

  /**
   * Navigate to previous period based on active view
   */
  previousPeriod(): void {
    const newDate = new Date(this.selectedDate);
    
    switch (this.activeView) {
      case 'daily':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'weekly':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'monthly':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }
    
    this.selectedDate = newDate;
  }

  /**
   * Navigate to next period based on active view
   */
  nextPeriod(): void {
    const newDate = new Date(this.selectedDate);
    
    switch (this.activeView) {
      case 'daily':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'weekly':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'monthly':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
    
    this.selectedDate = newDate;
  }

  /**
   * Jump to today
   */
  goToToday(): void {
    this.selectedDate = new Date();
  }

  /**
   * Navigate to new appointment form
   */
  createNewAppointment(): void {
    this.router.navigate(['/appointments/new']);
  }

  /**
   * Navigate to appointment search
   */
  openSearch(): void {
    this.router.navigate(['/appointments/search']);
  }

  /**
   * Refresh appointments data
   */
  async refreshData(): Promise<void> {
    this.syncing = true;
    
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Trigger reload by updating the date reference
    this.selectedDate = new Date(this.selectedDate);
    
    this.syncing = false;
  }

  /**
   * Handle day selection from weekly/monthly views
   */
  onDaySelected(date: Date): void {
    this.selectedDate = date;
    this.activeView = 'daily';
  }

  /**
   * Handle month change from monthly view
   */
  onMonthChanged(date: Date): void {
    this.selectedDate = date;
  }

  /**
   * Get current period display text
   */
  getPeriodText(): string {
    const options: Intl.DateTimeFormatOptions = {};
    
    switch (this.activeView) {
      case 'daily':
        options.weekday = 'long';
        options.year = 'numeric';
        options.month = 'long';
        options.day = 'numeric';
        return this.selectedDate.toLocaleDateString('en-US', options);
        
      case 'weekly':
        const startOfWeek = this.getStartOfWeek(this.selectedDate);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 5); // Saturday
        
        const startMonth = startOfWeek.toLocaleDateString('en-US', { month: 'short' });
        const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short' });
        const year = startOfWeek.getFullYear();
        
        if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
          return `${startMonth} ${startOfWeek.getDate()}-${endOfWeek.getDate()}, ${year}`;
        } else {
          return `${startMonth} ${startOfWeek.getDate()} - ${endMonth} ${endOfWeek.getDate()}, ${year}`;
        }
        
      case 'monthly':
        options.year = 'numeric';
        options.month = 'long';
        return this.selectedDate.toLocaleDateString('en-US', options);
        
      default:
        return '';
    }
  }

  /**
   * Get Monday of the week containing the given date
   */
  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Check if view is active
   */
  isViewActive(view: CalendarView): boolean {
    return this.activeView === view;
  }
}
