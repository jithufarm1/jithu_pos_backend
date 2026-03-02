import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Auth Guard
 * Protects routes that require authentication
 */
export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  console.log('[AuthGuard] User not authenticated, redirecting to login');
  router.navigate(['/login']);
  return false;
};
