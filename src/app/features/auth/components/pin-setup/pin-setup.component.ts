import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-pin-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pin-setup-container">
      <div class="pin-setup-card">
        <h2>Set Up Your PIN</h2>
        <p>Create a 4-6 digit PIN for offline authentication</p>
        
        <form (ngSubmit)="setupPIN()" #pinForm="ngForm">
          <div class="form-group">
            <label for="pin">PIN (4-6 digits)</label>
            <input
              type="password"
              id="pin"
              name="pin"
              [(ngModel)]="pin"
              pattern="[0-9]{4,6}"
              required
              maxlength="6"
              class="form-control"
              [class.error]="pinForm.submitted && !isValidPIN()"
            />
            <small *ngIf="pinForm.submitted && !isValidPIN()" class="error-text">
              PIN must be 4-6 digits
            </small>
          </div>

          <div class="form-group">
            <label for="confirmPin">Confirm PIN</label>
            <input
              type="password"
              id="confirmPin"
              name="confirmPin"
              [(ngModel)]="confirmPin"
              required
              maxlength="6"
              class="form-control"
              [class.error]="pinForm.submitted && pin !== confirmPin"
            />
            <small *ngIf="pinForm.submitted && pin !== confirmPin" class="error-text">
              PINs do not match
            </small>
          </div>

          <div *ngIf="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>

          <div *ngIf="successMessage" class="success-message">
            {{ successMessage }}
          </div>

          <div class="button-group">
            <button type="submit" class="btn btn-primary" [disabled]="loading">
              {{ loading ? 'Setting up...' : 'Set Up PIN' }}
            </button>
            <button type="button" class="btn btn-secondary" (click)="skip()" [disabled]="loading">
              Skip for Now
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .pin-setup-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f5f5f5;
      padding: 20px;
    }

    .pin-setup-card {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      max-width: 400px;
      width: 100%;
    }

    h2 {
      margin: 0 0 10px 0;
      color: #333;
    }

    p {
      color: #666;
      margin-bottom: 30px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 5px;
      color: #333;
      font-weight: 500;
    }

    .form-control {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
    }

    .form-control.error {
      border-color: #dc3545;
    }

    .error-text {
      color: #dc3545;
      font-size: 14px;
      margin-top: 5px;
      display: block;
    }

    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 20px;
    }

    .success-message {
      background: #d4edda;
      color: #155724;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 20px;
    }

    .button-group {
      display: flex;
      gap: 10px;
    }

    .btn {
      flex: 1;
      padding: 12px;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      transition: background 0.3s;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0056b3;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #545b62;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class PinSetupComponent {
  pin = '';
  confirmPin = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  isValidPIN(): boolean {
    return /^[0-9]{4,6}$/.test(this.pin);
  }

  async setupPIN(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.isValidPIN()) {
      this.errorMessage = 'PIN must be 4-6 digits';
      return;
    }

    if (this.pin !== this.confirmPin) {
      this.errorMessage = 'PINs do not match';
      return;
    }

    this.loading = true;

    try {
      const result = await this.authService.setupPIN(this.pin);
      
      if (result.success) {
        this.successMessage = 'PIN setup successful!';
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 1500);
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.errorMessage = 'Failed to set up PIN. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  skip(): void {
    this.router.navigate(['/home']);
  }
}
