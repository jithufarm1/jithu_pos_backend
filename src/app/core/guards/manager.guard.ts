import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Manager Guard
 * Restricts access to manager-only routes
 */
export const managerGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentEmployee();

  if (user && user.role === 'Manager') {
    return true;
  }

  // Redirect to home if not a manager
  router.navigate(['/home']);
  return false;
};
