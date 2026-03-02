import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NetworkStatusComponent } from '../network-status/network-status.component';
import { AuthService } from '../../../core/services/auth.service';
import { Employee } from '../../../core/models/auth.model';
import { environment } from '../../../../environments/environment';

/**
 * Header Component
 * Displays application branding, store ID, employee info, and network status
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NetworkStatusComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  storeId = environment.storeId;
  appTitle = 'Vehicle POS';
  currentEmployee: Employee | null = null;
  isAuthenticated = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.getAuthState().subscribe((state) => {
      this.isAuthenticated = state.isAuthenticated;
      this.currentEmployee = state.employee;
    });
  }

  /**
   * Handle logout
   */
  onLogout(): void {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }
}
