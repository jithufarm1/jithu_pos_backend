import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.css']
})
export class AppHeaderComponent implements OnInit {
  currentUser: any = null;
  showUserMenu = false;
  canGoBack = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentEmployee();
    
    // Check if we can go back
    this.checkCanGoBack();
    
    // Listen to route changes to update back button state
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkCanGoBack();
        this.showUserMenu = false; // Close menu on navigation
      });
  }

  checkCanGoBack() {
    // Simple check: if not on home or login, we can go back
    const currentUrl = this.router.url;
    this.canGoBack = currentUrl !== '/home' && currentUrl !== '/login';
  }

  goBack() {
    this.location.back();
  }

  goHome() {
    this.router.navigate(['/home']);
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  navigateTo(route: string) {
    this.showUserMenu = false;
    this.router.navigate([route]);
  }

  logout() {
    this.showUserMenu = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isManager(): boolean {
    return this.currentUser?.role === 'Manager';
  }
}
