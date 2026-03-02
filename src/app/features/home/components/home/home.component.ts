import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { Employee } from '../../../../core/models/auth.model';
import { OnlineStatusComponent } from '../../../../shared/components/online-status/online-status.component';

/**
 * Home Component
 * Main dashboard with all POS features
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, OnlineStatusComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  currentEmployee: Employee | null = null;
  currentTime: Date = new Date();
  showUserMenu = false;

  // Dashboard metrics (mock data for now)
  todayMetrics = {
    revenue: 4250.00,
    servicesCompleted: 18,
    averageTicket: 236.11,
    customerCount: 18,
    pendingAppointments: 5,
    lowStockItems: 3,
  };

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentEmployee = this.authService.getCurrentEmployee();
    
    // Update time every minute
    setInterval(() => {
      this.currentTime = new Date();
    }, 60000);
  }

  /**
   * Navigate to feature
   */
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  /**
   * Toggle user menu
   */
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  /**
   * Logout user
   */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Check if current user is a manager
   */
  isManager(): boolean {
    return this.currentEmployee?.role === 'Manager';
  }

  /**
   * Show coming soon message
   */
  showComingSoon(featureName: string): void {
    alert(`${featureName} - Coming Soon!\n\nThis feature is under development and will be available in the next release.`);
  }
}
