/**
 * Authentication models for employee login
 */

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  storeId: string;
}

export interface LoginCredentials {
  employeeId: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  employee?: Employee;
  token?: string;
  tokenExpiration?: number; // Timestamp when token expires
  message?: string;
  attemptsRemaining?: number;
  lockoutTime?: number;
  isOffline?: boolean; // Indicates if login was performed offline
  expirationTier?: string; // Offline auth expiration tier
}

export interface AuthState {
  isAuthenticated: boolean;
  employee: Employee | null;
  token: string | null;
  tokenExpiration?: number; // Timestamp when token expires
  issuedAt?: number; // Timestamp when token was issued
}

export interface LoginAttempt {
  employeeId: string;
  attempts: number;
  lastAttempt: number;
  lockedUntil?: number;
}

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}
