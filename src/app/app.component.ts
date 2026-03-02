import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AppHeaderComponent } from './shared/components/app-header/app-header.component';
import { RetryQueueService } from './core/services/retry-queue.service';
import { AuthService } from './core/services/auth.service';
import { PinSetupModalComponent } from './features/auth/components/pin-setup-modal/pin-setup-modal.component';
import { filter } from 'rxjs/operators';

/**
 * App Component
 * Root component that initializes the application
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AppHeaderComponent, PinSetupModalComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  showHeader = false;
  showPINSetupModal = false;

  constructor(
    private retryQueueService: RetryQueueService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    console.log('Vehicle POS PWA initialized');
    
    // Determine if header should show based on current route
    this.updateHeaderVisibility();
    
    // Listen to route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateHeaderVisibility();
      });
    
    // Subscribe to PIN setup needed observable
    // Only show modal when authenticated (not during logout)
    this.authService.isPINSetupNeeded().subscribe(needed => {
      if (needed && this.authService.isAuthenticated()) {
        this.showPINSetupModal = true;
      } else {
        this.showPINSetupModal = false;
      }
    });
  }
  
  private updateHeaderVisibility(): void {
    // Hide header on login page and home page (they have their own headers)
    const currentUrl = this.router.url;
    this.showHeader = currentUrl !== '/login' && currentUrl !== '/' && currentUrl !== '/home';
  }
  
  /**
   * Handle PIN setup completion
   */
  onPINSetupComplete(): void {
    this.showPINSetupModal = false;
    alert('PIN setup successful! You can now use your PIN to log in when offline.');
  }

  /**
   * Handle PIN setup skipped
   */
  onPINSetupSkipped(): void {
    this.showPINSetupModal = false;
  }
}
