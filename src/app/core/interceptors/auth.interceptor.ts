import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Auth HTTP Interceptor
 * Automatically adds authentication token to outgoing requests
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // Skip auth header for login and public endpoints
  const publicEndpoints = ['/api/auth/login', '/api/auth/refresh'];
  const isPublicEndpoint = publicEndpoints.some(endpoint => req.url.includes(endpoint));
  
  if (isPublicEndpoint) {
    return next(req);
  }
  
  // Add auth token if available
  const token = authService.getToken();
  
  if (token) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return next(clonedReq);
  }
  
  return next(req);
};
