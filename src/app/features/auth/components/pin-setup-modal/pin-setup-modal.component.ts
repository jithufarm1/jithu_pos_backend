import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { Employee } from '../../../../core/models/auth.model';

@Component({
  selector: 'app-pin-setup-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pin-setup-modal.component.html',
  styleUrls: ['./pin-setup-modal.component.css']
})
export class PinSetupModalComponent implements OnInit {
  @Output() setupComplete = new EventEmitter<void>();
  @Output() setupSkipped = new EventEmitter<void>();

  pin: string = '';
  confirmPin: string = '';
  errorMessage: string | null = null;
  loading: boolean = false;
  currentEmployee: Employee | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Get current employee from auth service
    const employee = this.authService.getCurrentEmployee();
    if (employee) {
      this.currentEmployee = employee;
    }
  }

  /**
   * Validate PIN format
   */
  validatePIN(): boolean {
    this.errorMessage = null;

    if (!this.pin) {
      this.errorMessage = 'Please enter a PIN';
      return false;
    }

    if (!/^[0-9]{4,6}$/.test(this.pin)) {
      this.errorMessage = 'PIN must be 4-6 digits';
      return false;
    }

    if (!this.confirmPin) {
      this.errorMessage = 'Please confirm your PIN';
      return false;
    }

    if (this.pin !== this.confirmPin) {
      this.errorMessage = 'PINs do not match';
      return false;
    }

    return true;
  }

  /**
   * Submit PIN setup
   */
  async onSubmit(): Promise<void> {
    console.log('[PinSetupModal] onSubmit called');
    
    if (!this.validatePIN()) {
      console.log('[PinSetupModal] Validation failed');
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    try {
      console.log('[PinSetupModal] Calling authService.setupPIN...');
      const result = await this.authService.setupPIN(this.pin);
      console.log('[PinSetupModal] setupPIN result:', result);

      if (result.success) {
        console.log('[PinSetupModal] PIN setup successful');
        this.setupComplete.emit();
      } else {
        console.error('[PinSetupModal] PIN setup failed:', result.message);
        this.errorMessage = result.message || 'PIN setup failed';
      }
    } catch (error: any) {
      console.error('[PinSetupModal] Setup failed with exception:', error);
      console.error('[PinSetupModal] Error message:', error?.message);
      console.error('[PinSetupModal] Error stack:', error?.stack);
      this.errorMessage = error?.message || 'PIN setup failed. Please check browser console for details.';
    } finally {
      this.loading = false;
    }
  }

  /**
   * Skip PIN setup
   */
  onSkip(): void {
    this.setupSkipped.emit();
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.errorMessage = null;
  }
}
