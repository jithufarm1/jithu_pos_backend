import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LoginCredentials } from '../../../../core/models/auth.model';
import { OnlineStatusComponent } from '../../../../shared/components/online-status/online-status.component';

/**
 * Login Component
 * Employee POS login with employee ID and secure password
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, OnlineStatusComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  employeeId: string = '';
  password: string = '';
  pin: string = '';
  employeeIdForPIN: string = '';
  pinError: string = '';
  loading: boolean = false;
  errorMessage: string | null = null;
  showPassword: boolean = false;
  passwordRequirements: string[] = [];
  showRequirements: boolean = false;
  attemptsRemaining: number | null = null;
  isOfflineMode: boolean = false;
  showPINInput: boolean = false;
  canUseOfflineAuth: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.passwordRequirements = this.authService.getPasswordRequirements();
    this.checkOfflineAuthAvailability();
    
    // Re-check offline auth availability when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkOfflineAuthAvailability();
      }
    });
  }

  /**
   * Check if offline authentication is available
   */
  async checkOfflineAuthAvailability(): Promise<void> {
    console.log('[LoginComponent] Checking offline auth availability...');
    
    // For multi-user, we need to check if ANY employee has offline auth available
    // We'll show the PIN input if there's a cached employee session
    const currentEmployee = this.authService.getCurrentEmployee();
    if (currentEmployee) {
      this.canUseOfflineAuth = await this.authService.canAuthenticateOffline(currentEmployee.employeeId);
      console.log('[LoginComponent] Can use offline auth for', currentEmployee.employeeId, ':', this.canUseOfflineAuth);
    } else {
      // No cached employee, but we still show PIN input for multi-user support
      this.canUseOfflineAuth = true;
      console.log('[LoginComponent] No cached employee, showing PIN input for multi-user');
    }
    
    if (this.canUseOfflineAuth) {
      this.showPINInput = true;
      console.log('[LoginComponent] PIN input field enabled');
    } else {
      this.showPINInput = false;
      console.log('[LoginComponent] PIN input field disabled');
    }
  }

  /**
   * Login with PIN for offline authentication
   */
  async onPINLogin(): Promise<void> {
    this.pinError = '';
    this.attemptsRemaining = null;

    if (!this.employeeIdForPIN || !this.pin) {
      this.pinError = 'Employee ID and PIN are required';
      return;
    }

    if (!/^[0-9]{4,6}$/.test(this.pin)) {
      this.pinError = 'PIN must be 4-6 digits';
      return;
    }

    this.loading = true;

    try {
      const response = await this.authService.loginOffline(this.employeeIdForPIN, this.pin);

      if (response.success) {
        this.isOfflineMode = true;
        // Clear form
        this.employeeIdForPIN = '';
        this.pin = '';
        this.router.navigate(['/home']);
      } else {
        this.pinError = response.message || 'Offline login failed';
        this.attemptsRemaining = response.attemptsRemaining ?? null;
      }
    } catch (error) {
      this.pinError = 'Offline login failed. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  /**
   * Handle login form submission
   */
  onLogin(): void {
    this.errorMessage = null;
    this.attemptsRemaining = null;

    // Validation
    if (!this.employeeId || !this.password) {
      this.errorMessage = 'Please enter both Employee ID and Password';
      return;
    }

    this.loading = true;

    const credentials: LoginCredentials = {
      employeeId: this.employeeId.trim(),
      password: this.password,
    };

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          console.log('Login successful');
          this.isOfflineMode = response.isOffline || false;
          if (this.isOfflineMode) {
            console.log('Logged in using offline mode');
          }
          
          // Navigate to home - PIN setup modal will show automatically if needed
          this.router.navigate(['/home']);
        } else {
          this.errorMessage = response.message || 'Login failed. Please try again.';
          this.attemptsRemaining = response.attemptsRemaining ?? null;
          this.password = ''; // Clear password on failure
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = 'Login failed. Please check your credentials.';
        this.password = ''; // Clear password on error
        console.error('Login error:', error);
      },
    });
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Toggle password requirements display
   */
  toggleRequirements(): void {
    this.showRequirements = !this.showRequirements;
  }

  /**
   * Handle Enter key press
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onLogin();
    }
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.errorMessage = null;
    this.attemptsRemaining = null;
  }

  /**
   * Clear login lockout (for development/testing)
   */
  clearLockout(): void {
    // Clear all login attempt records from localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('pos_login_attempts_')) {
        localStorage.removeItem(key);
      }
    });
    
    this.errorMessage = null;
    this.attemptsRemaining = null;
    alert('Login lockout cleared! You can now try logging in again.');
  }
}
