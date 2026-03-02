import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Employee, LoginCredentials, LoginResponse, AuthState, LoginAttempt, PasswordValidation } from '../models/auth.model';
import { environment } from '../../../environments/environment';
import { PINService } from './pin.service';
import { PINRepository } from '../repositories/pin.repository';
import { TokenService } from './token.service';
import { ExpirationService, ExpirationTier } from './expiration.service';
import { OverrideService } from './override.service';
import { AuditService } from './audit.service';

/**
 * Authentication Service - JWT Token-Based
 * Handles employee login, logout, and authentication state with JWT tokens
 * No password storage - uses token expiration for offline access
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = environment.apiBaseUrl;
  private readonly AUTH_STORAGE_KEY = 'pos_auth_state';
  private readonly LOGIN_ATTEMPTS_KEY = 'pos_login_attempts';
  
  // Security Configuration (Enterprise IT Standards)
  private readonly MAX_LOGIN_ATTEMPTS = 3;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly ATTEMPT_RESET_TIME_MS = 30 * 60 * 1000; // 30 minutes
  
  // Token Configuration
  private readonly TOKEN_EXPIRATION_MS = 48 * 60 * 60 * 1000; // 48 hours
  private readonly TOKEN_REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  // Password Requirements (Enterprise IT Standards)
  private readonly MIN_PASSWORD_LENGTH = 8;
  private readonly REQUIRE_UPPERCASE = true;
  private readonly REQUIRE_LOWERCASE = true;
  private readonly REQUIRE_NUMBER = true;
  private readonly REQUIRE_SPECIAL_CHAR = true;

  private authState$ = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    employee: null,
    token: null,
    tokenExpiration: undefined,
    issuedAt: undefined,
  });

  // Flag to track if PIN setup is needed
  private pinSetupNeeded$ = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private pinService: PINService,
    private tokenService: TokenService,
    private expirationService: ExpirationService,
    private overrideService: OverrideService,
    private auditService: AuditService,
    private pinRepository: PINRepository
  ) {
    this.loadAuthState();
    this.cleanupOldAttempts();
    this.checkTokenExpiration();
    this.startTokenRefreshCheck();
  }

  /**
   * Check if token is expired and logout if needed
   */
  private checkTokenExpiration(): void {
    const state = this.authState$.value;
    if (state.isAuthenticated && state.tokenExpiration) {
      const now = Date.now();
      if (now >= state.tokenExpiration) {
        console.log('[AuthService] Token expired, logging out');
        this.logout();
      } else {
        // Set timeout to auto-logout when token expires
        const timeUntilExpiration = state.tokenExpiration - now;
        setTimeout(() => {
          console.log('[AuthService] Token expired, auto-logout');
          this.logout();
        }, timeUntilExpiration);
      }
    }
  }

  /**
   * Check if token needs refresh (within 24 hours of expiration)
   */
  isTokenNearExpiration(): boolean {
    const state = this.authState$.value;
    if (!state.isAuthenticated || !state.tokenExpiration) {
      return false;
    }
    const now = Date.now();
    const timeUntilExpiration = state.tokenExpiration - now;
    return timeUntilExpiration <= this.TOKEN_REFRESH_THRESHOLD_MS;
  }

  /**
   * Start periodic check for token refresh
   * Checks every 5 minutes if token needs refresh
   */
  private startTokenRefreshCheck(): void {
    // Check every 5 minutes
    setInterval(() => {
      this.checkAndRefreshToken();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if token needs refresh and refresh it automatically
   */
  private checkAndRefreshToken(): void {
    if (!this.isAuthenticated()) {
      return;
    }

    if (this.isTokenNearExpiration()) {
      console.log('[AuthService] Token near expiration, attempting automatic refresh');
      this.refreshToken().subscribe({
        next: (response) => {
          if (response.success) {
            console.log('[AuthService] Token refreshed successfully');
          }
        },
        error: (error) => {
          console.log('[AuthService] Token refresh failed (offline or error):', error.message);
        }
      });
    }
  }

  /**
   * Refresh the authentication token
   * Gets a new token from the backend with extended expiration
   */
  refreshToken(): Observable<LoginResponse> {
    const currentState = this.authState$.value;
    
    if (!currentState.isAuthenticated || !currentState.employee) {
      return of({
        success: false,
        message: 'Not authenticated'
      });
    }

    console.log('[AuthService] Refreshing token for:', currentState.employee.employeeId);

    // Call backend to refresh token
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/refresh`, {
      employeeId: currentState.employee.employeeId,
      currentToken: currentState.token
    }).pipe(
      tap((response) => {
        if (response.success && response.token) {
          // Update with new token and expiration
          const now = Date.now();
          const tokenExpiration = response.tokenExpiration || (now + this.TOKEN_EXPIRATION_MS);
          
          const authState: AuthState = {
            isAuthenticated: true,
            employee: response.employee || currentState.employee,
            token: response.token,
            tokenExpiration,
            issuedAt: now,
          };
          
          this.authState$.next(authState);
          this.saveAuthState(authState);
          
          console.log('[AuthService] Token refreshed:', 
                      `(new token valid for ${Math.floor((tokenExpiration - now) / (1000 * 60 * 60))}h)`);
        }
      }),
      catchError((error) => {
        console.log('[AuthService] Token refresh failed:', error.message);
        return of({
          success: false,
          message: 'Token refresh failed'
        });
      })
    );
  }

  /**
   * Get remaining token validity time in hours
   */
  getTokenRemainingHours(): number {
    const state = this.authState$.value;
    if (!state.isAuthenticated || !state.tokenExpiration) {
      return 0;
    }
    const now = Date.now();
    const remaining = state.tokenExpiration - now;
    return Math.max(0, Math.floor(remaining / (1000 * 60 * 60)));
  }

  /**
   * Validate password against enterprise security criteria
   */
  validatePassword(password: string): PasswordValidation {
    const errors: string[] = [];

    if (password.length < this.MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`);
    }

    if (this.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.REQUIRE_SPECIAL_CHAR && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*...)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if account is locked due to failed attempts
   */
  isAccountLocked(employeeId: string): { locked: boolean; remainingTime?: number } {
    const attempts = this.getLoginAttempts(employeeId);
    
    if (!attempts || !attempts.lockedUntil) {
      return { locked: false };
    }

    const now = Date.now();
    if (attempts.lockedUntil > now) {
      const remainingTime = Math.ceil((attempts.lockedUntil - now) / 1000 / 60); // minutes
      return { locked: true, remainingTime };
    }

    // Lockout expired, clear it
    this.clearLoginAttempts(employeeId);
    return { locked: false };
  }

  /**
   * Get login attempts for an employee
   */
  private getLoginAttempts(employeeId: string): LoginAttempt | null {
    try {
      const stored = localStorage.getItem(`${this.LOGIN_ATTEMPTS_KEY}_${employeeId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[AuthService] Error reading login attempts:', error);
    }
    return null;
  }

  /**
   * Record failed login attempt
   */
  private recordFailedAttempt(employeeId: string): number {
    const now = Date.now();
    let attempts = this.getLoginAttempts(employeeId);

    if (!attempts) {
      attempts = {
        employeeId,
        attempts: 1,
        lastAttempt: now,
      };
    } else {
      // Reset attempts if last attempt was too long ago
      if (now - attempts.lastAttempt > this.ATTEMPT_RESET_TIME_MS) {
        attempts.attempts = 1;
      } else {
        attempts.attempts += 1;
      }
      attempts.lastAttempt = now;
    }

    // Lock account if max attempts reached
    if (attempts.attempts >= this.MAX_LOGIN_ATTEMPTS) {
      attempts.lockedUntil = now + this.LOCKOUT_DURATION_MS;
    }

    try {
      localStorage.setItem(`${this.LOGIN_ATTEMPTS_KEY}_${employeeId}`, JSON.stringify(attempts));
    } catch (error) {
      console.error('[AuthService] Error saving login attempts:', error);
    }

    return this.MAX_LOGIN_ATTEMPTS - attempts.attempts;
  }

  /**
   * Clear login attempts after successful login
   */
  private clearLoginAttempts(employeeId: string): void {
    try {
      localStorage.removeItem(`${this.LOGIN_ATTEMPTS_KEY}_${employeeId}`);
    } catch (error) {
      console.error('[AuthService] Error clearing login attempts:', error);
    }
  }

  /**
   * Clean up old login attempt records
   */
  private cleanupOldAttempts(): void {
    try {
      const now = Date.now();
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith(this.LOGIN_ATTEMPTS_KEY)) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const attempts: LoginAttempt = JSON.parse(stored);
            // Remove if older than reset time and not locked
            if (now - attempts.lastAttempt > this.ATTEMPT_RESET_TIME_MS && !attempts.lockedUntil) {
              localStorage.removeItem(key);
            }
          }
        }
      });
    } catch (error) {
      console.error('[AuthService] Error cleaning up attempts:', error);
    }
  }

  /**
   * Load authentication state from localStorage
   */
  private loadAuthState(): void {
    try {
      const stored = localStorage.getItem(this.AUTH_STORAGE_KEY);
      if (stored) {
        const state: AuthState = JSON.parse(stored);
        
        // Check if token is expired
        if (state.tokenExpiration && Date.now() >= state.tokenExpiration) {
          console.log('[AuthService] Stored token expired, clearing state');
          this.clearAuthState();
          return;
        }
        
        this.authState$.next(state);
        console.log('[AuthService] Loaded auth state:', state.employee?.name, 
                    `(expires in ${this.getTokenRemainingHours()}h)`);
      }
    } catch (error) {
      console.error('[AuthService] Error loading auth state:', error);
      this.clearAuthState();
    }
  }

  /**
   * Save authentication state to localStorage
   */
  private saveAuthState(state: AuthState): void {
    try {
      localStorage.setItem(this.AUTH_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('[AuthService] Error saving auth state:', error);
    }
  }

  /**
   * Clear authentication state
   */
  private clearAuthState(): void {
    localStorage.removeItem(this.AUTH_STORAGE_KEY);
    this.authState$.next({
      isAuthenticated: false,
      employee: null,
      token: null,
      tokenExpiration: undefined,
      issuedAt: undefined,
    });
  }

  /**
   * Login with employee ID and password
   * Uses JWT token-based authentication with 48-hour expiration
   */
  login(credentials: LoginCredentials): Observable<LoginResponse> {
    console.log('[AuthService] Attempting login for:', credentials.employeeId);

    // Check if account is locked
    const lockStatus = this.isAccountLocked(credentials.employeeId);
    if (lockStatus.locked) {
      return of({
        success: false,
        message: `Account temporarily locked. Please try again in ${lockStatus.remainingTime} minutes.`,
        attemptsRemaining: 0,
      });
    }

    // Validate password format (but don't reveal requirements on failure)
    const validation = this.validatePassword(credentials.password);
    if (!validation.isValid) {
      // Don't reveal password requirements - just record as failed attempt
      const attemptsRemaining = this.recordFailedAttempt(credentials.employeeId);
      return of({
        success: false,
        message: attemptsRemaining > 0 
          ? `Invalid employee ID or password. ${attemptsRemaining} attempt(s) remaining.`
          : `Account temporarily locked. Please try again in ${this.LOCKOUT_DURATION_MS / 1000 / 60} minutes.`,
        attemptsRemaining,
      });
    }

    // Try online authentication
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(async (response) => {
        if (response.success && response.employee && response.token) {
          // Clear failed attempts on successful login
          this.clearLoginAttempts(credentials.employeeId);
          
          // Calculate token expiration (48 hours from now)
          const now = Date.now();
          const tokenExpiration = response.tokenExpiration || (now + this.TOKEN_EXPIRATION_MS);
          
          const authState: AuthState = {
            isAuthenticated: true,
            employee: response.employee,
            token: response.token,
            tokenExpiration,
            issuedAt: now,
          };
          
          this.authState$.next(authState);
          this.saveAuthState(authState);
          
          // Store token in TokenService for offline auth
          await this.tokenService.storeToken(response.employee.employeeId, response.token, false);
          await this.tokenService.updateLastSyncTime(response.employee.employeeId);
          
          // Check if PIN setup is needed
          const hasPIN = await this.pinService.hasPIN(response.employee.employeeId);
          if (!hasPIN) {
            this.pinSetupNeeded$.next(true);
          }
          
          // Log online authentication
          await this.auditService.logAuthAttempt({
            userID: response.employee.employeeId,
            deviceID: await this.auditService.getDeviceID(),
            eventType: 'online_auth',
            success: true
          });
          
          // Set auto-logout timer
          const timeUntilExpiration = tokenExpiration - now;
          setTimeout(() => {
            console.log('[AuthService] Token expired, auto-logout');
            this.logout();
          }, timeUntilExpiration);
          
          console.log('[AuthService] Login successful:', response.employee.name, 
                      `(token valid for ${Math.floor(timeUntilExpiration / (1000 * 60 * 60))}h)`);
        } else {
          // Record failed attempt
          const attemptsRemaining = this.recordFailedAttempt(credentials.employeeId);
          response.attemptsRemaining = attemptsRemaining;
          
          if (attemptsRemaining <= 0) {
            response.message = `Account temporarily locked. Please try again in ${this.LOCKOUT_DURATION_MS / 1000 / 60} minutes.`;
          } else {
            response.message = `Invalid employee ID or password. ${attemptsRemaining} attempt(s) remaining.`;
          }
        }
      }),
      catchError((error) => {
        console.error('[AuthService] Login failed:', error);
        
        // Check if we have a valid token for offline access
        const currentState = this.authState$.value;
        if (currentState.isAuthenticated && 
            currentState.tokenExpiration && 
            Date.now() < currentState.tokenExpiration &&
            currentState.employee?.employeeId === credentials.employeeId) {
          
          console.log('[AuthService] Using existing valid token for offline access');
          return of({
            success: true,
            employee: currentState.employee,
            token: currentState.token!,
            tokenExpiration: currentState.tokenExpiration,
            message: 'Using cached session (offline mode)',
            isOffline: true,
          });
        }
        
        // No valid token, record failed attempt
        const attemptsRemaining = this.recordFailedAttempt(credentials.employeeId);
        
        return of({
          success: false,
          message: attemptsRemaining > 0 
            ? `Invalid employee ID or password. ${attemptsRemaining} attempt(s) remaining.`
            : `Account temporarily locked. Please try again in ${this.LOCKOUT_DURATION_MS / 1000 / 60} minutes.`,
          attemptsRemaining,
        });
      })
    );
  }

  /**
   * Logout current employee
   * Implements soft logout - locks token instead of deleting it
   */
  async logout(): Promise<void> {
    console.log('[AuthService] Logging out');
    
    const employee = this.getCurrentEmployee();
    if (employee) {
      // Log logout event
      await this.auditService.logAuthAttempt({
        userID: employee.employeeId,
        deviceID: await this.auditService.getDeviceID(),
        eventType: 'logout',
        success: true
      });
      
      // Lock token instead of deleting
      await this.tokenService.lockToken(employee.employeeId);
    }
    
    // Reset PIN setup flag
    this.pinSetupNeeded$.next(false);
    
    // Update auth state to logged out but preserve employee data
    const state = this.authState$.value;
    this.authState$.next({
      ...state,
      isAuthenticated: false
    });
    
    // Don't clear auth state completely - preserve for offline re-auth
    // this.clearAuthState();
  }

  /**
   * Get current authentication state
   */
  getAuthState(): Observable<AuthState> {
    return this.authState$.asObservable();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const state = this.authState$.value;
    // Check both authentication flag and token expiration
    if (!state.isAuthenticated || !state.tokenExpiration) {
      return false;
    }
    return Date.now() < state.tokenExpiration;
  }

  /**
   * Get current employee
   */
  getCurrentEmployee(): Employee | null {
    return this.authState$.value.employee;
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    const state = this.authState$.value;
    // Only return token if not expired
    if (state.token && state.tokenExpiration && Date.now() < state.tokenExpiration) {
      return state.token;
    }
    return null;
  }

  /**
   * Get password requirements for display
   */
  getPasswordRequirements(): string[] {
    const requirements: string[] = [];
    requirements.push(`At least ${this.MIN_PASSWORD_LENGTH} characters long`);
    if (this.REQUIRE_UPPERCASE) requirements.push('At least one uppercase letter (A-Z)');
    if (this.REQUIRE_LOWERCASE) requirements.push('At least one lowercase letter (a-z)');
    if (this.REQUIRE_NUMBER) requirements.push('At least one number (0-9)');
    if (this.REQUIRE_SPECIAL_CHAR) requirements.push('At least one special character (!@#$%^&*...)');
    return requirements;
  }

  /**
   * Decode JWT token to extract payload
   * @param token JWT token string
   * @returns Decoded token payload
   */
  private decodeJWT(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      // Decode the payload (second part)
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('[AuthService] JWT decode error:', error);
      throw new Error('Failed to decode JWT token');
    }
  }

  // ========== Offline Authentication Methods ==========

  /**
   * Check if PIN setup is needed
   */
  isPINSetupNeeded(): Observable<boolean> {
    return this.pinSetupNeeded$.asObservable();
  }

  /**
   * Set up PIN for offline authentication
   * Called after first successful online login
   */
  async setupPIN(pin: string): Promise<{ success: boolean; message: string }> {
    console.log('[AuthService] setupPIN called');
    
    try {
      const employee = this.getCurrentEmployee();
      console.log('[AuthService] Current employee:', employee?.employeeId);
      
      if (!employee) {
        console.error('[AuthService] No authenticated user');
        return { success: false, message: 'No authenticated user' };
      }

      // Attempt migration before creating new PIN
      console.log('[AuthService] Attempting migration...');
      await this.pinRepository.migrateSingleUserPIN(employee.employeeId);
      await this.tokenService.migrateSingleUserToken(employee.employeeId);
      console.log('[AuthService] Migration complete');

      // Create PIN
      console.log('[AuthService] Creating PIN...');
      await this.pinService.createPIN(employee.employeeId, pin);
      console.log('[AuthService] PIN created successfully');

      // Log PIN setup
      console.log('[AuthService] Logging PIN setup...');
      await this.auditService.logAuthAttempt({
        userID: employee.employeeId,
        deviceID: await this.auditService.getDeviceID(),
        eventType: 'pin_setup',
        success: true
      });
      console.log('[AuthService] PIN setup logged');

      // Clear PIN setup flag
      this.pinSetupNeeded$.next(false);

      // Generate and store emergency token
      console.log('[AuthService] Generating emergency token...');
      const emergencyToken = await this.overrideService.generateEmergencyToken();
      console.log('[AuthService] Storing emergency token...');
      await this.overrideService.storeEmergencyToken(
        emergencyToken,
        'What is your employee ID?', // Simple security question
        employee.employeeId
      );
      console.log('[AuthService] Emergency token stored');

      return { success: true, message: 'PIN setup successful' };
    } catch (error: any) {
      console.error('[AuthService] PIN setup failed:', error);
      console.error('[AuthService] Error message:', error?.message);
      console.error('[AuthService] Error stack:', error?.stack);
      return { 
        success: false, 
        message: error?.message || 'PIN setup failed. Please check browser console for details.' 
      };
    }
  }

  /**
   * Check if user has a PIN set up
   */
  async hasPIN(): Promise<boolean> {
    const employee = this.getCurrentEmployee();
    if (!employee) {
      return false;
    }
    return await this.pinService.hasPIN(employee.employeeId);
  }

  /**
   * Login with PIN for offline authentication
   */
  async loginOffline(employeeId: string, pin: string): Promise<LoginResponse> {
    try {
      // Check for clock tampering
      if (await this.checkClockTampering()) {
        return {
          success: false,
          message: 'Clock tampering detected. Please connect to the internet and log in online.'
        };
      }

      // Check if PIN exists for this employee
      const hasPIN = await this.pinService.hasPIN(employeeId);
      if (!hasPIN) {
        return {
          success: false,
          message: `Employee ${employeeId} has no PIN configured. Please log in online first to set up a PIN.`
        };
      }

      // Check if token is locked
      const isLocked = await this.tokenService.isTokenLocked(employeeId);
      if (!isLocked) {
        return {
          success: false,
          message: 'Session is not locked'
        };
      }

      // Check expiration tier
      const tier = await this.expirationService.getCurrentTier();
      const isPINAllowed = await this.expirationService.isPINAuthAllowed();

      if (!isPINAllowed) {
        return {
          success: false,
          message: 'Override or emergency authentication required',
          expirationTier: tier
        };
      }

      // Check if PIN is locked
      if (await this.pinService.isLocked(employeeId)) {
        return {
          success: false,
          message: 'PIN locked. Please connect to the internet and log in online.',
          attemptsRemaining: 0
        };
      }

      // Verify PIN
      const isValid = await this.pinService.verifyPIN(employeeId, pin);

      if (isValid) {
        // Unlock token
        await this.tokenService.unlockToken(employeeId);
        await this.pinService.resetAttempts(employeeId);

        // Update last timestamp
        this.updateLastTimestamp();

        // Get token for this employee
        const token = await this.tokenService.getToken(employeeId);
        if (!token) {
          return {
            success: false,
            message: 'No cached session available for this employee. Please log in online first.'
          };
        }

        // Decode token to get employee data
        let employee: Employee | undefined;
        let tokenExpiration: number = 0;
        let issuedAt: number = Date.now();
        try {
          const decoded = this.decodeJWT(token);
          employee = {
            id: decoded.sub,
            employeeId: decoded.employeeId,
            name: decoded.name,
            role: decoded.role,
            storeId: decoded.storeId
          };
          
          // Get token expiration from JWT exp claim (in seconds, convert to ms)
          tokenExpiration = decoded.exp ? decoded.exp * 1000 : Date.now() + this.TOKEN_EXPIRATION_MS;
          issuedAt = decoded.iat ? decoded.iat * 1000 : Date.now();
        } catch (error) {
          console.error('[AuthService] Failed to decode token:', error);
          return {
            success: false,
            message: 'Invalid cached session. Please log in online first.'
          };
        }

        // Log successful authentication
        await this.auditService.logAuthAttempt({
          userID: employeeId,
          deviceID: await this.auditService.getDeviceID(),
          eventType: 'pin_auth',
          success: true,
          expirationTier: tier
        });

        // Update auth state with the employee who just logged in
        this.authState$.next({
          isAuthenticated: true,
          employee: employee,
          token: token,
          tokenExpiration: tokenExpiration,
          issuedAt: issuedAt
        });

        return {
          success: true,
          employee,
          token: token,
          message: 'Offline authentication successful',
          isOffline: true,
          expirationTier: tier
        };
      } else {
        // Record failed attempt
        const attemptsRemaining = await this.pinService.getRemainingAttempts(employeeId);

        // Log failed attempt
        await this.auditService.logFailedPINAttempt(employeeId, attemptsRemaining);

        return {
          success: false,
          message: attemptsRemaining > 0
            ? `Invalid Employee ID or PIN. ${attemptsRemaining} attempt(s) remaining.`
            : 'PIN locked. Please connect to the internet and log in online.',
          attemptsRemaining
        };
      }
    } catch (error) {
      console.error('[AuthService] Offline login failed:', error);
      return {
        success: false,
        message: 'Offline authentication failed'
      };
    }
  }

  /**
   * Authenticate with manager override code
   */
  async authenticateWithOverride(employeeId: string, pin: string, overrideCode: string): Promise<LoginResponse> {
    try {
      // Verify override code
      const isCodeValid = await this.overrideService.verifyOverrideCode(overrideCode);
      if (!isCodeValid) {
        return {
          success: false,
          message: 'Invalid override code'
        };
      }

      // Check if override limit reached
      if (await this.overrideService.isOverrideLimitReached()) {
        return {
          success: false,
          message: 'Maximum overrides reached. Please connect to the internet to sync.',
          attemptsRemaining: 0
        };
      }

      // Verify PIN
      const isPINValid = await this.pinService.verifyPIN(employeeId, pin);
      if (!isPINValid) {
        const attemptsRemaining = await this.pinService.getRemainingAttempts(employeeId);
        return {
          success: false,
          message: `Invalid PIN. ${attemptsRemaining} attempt(s) remaining.`,
          attemptsRemaining
        };
      }

      // Get manager ID for the code
      const managerID = await this.overrideService.getManagerIDForCode(overrideCode);
      if (!managerID) {
        return {
          success: false,
          message: 'Invalid override code'
        };
      }

      // Get employee from current state (should match employeeId)
      const employee = this.getCurrentEmployee();
      if (!employee || employee.employeeId !== employeeId) {
        return {
          success: false,
          message: 'Employee mismatch. Please log in online first.'
        };
      }

      // Record override usage
      await this.overrideService.recordOverrideUsage(managerID, employeeId, overrideCode);

      // Extend access period
      const extensionDays = await this.overrideService.getOverrideExtensionDays();
      const currentLastSync = await this.tokenService.getLastSyncTime(employeeId);
      if (currentLastSync) {
        const extendedTime = new Date(currentLastSync.getTime() + extensionDays * 24 * 60 * 60 * 1000);
        await this.tokenService.updateLastSyncTime(employeeId);
      }

      // Unlock token
      await this.tokenService.unlockToken(employeeId);
      await this.pinService.resetAttempts(employeeId);

      // Log override usage
      const overridesRemaining = await this.overrideService.getRemainingOverrides();
      await this.auditService.logOverrideUsage({
        userID: employeeId,
        deviceID: await this.auditService.getDeviceID(),
        eventType: 'override_auth',
        success: true,
        managerID,
        employeeID: employeeId,
        overrideCode,
        overridesRemaining
      });

      // Update auth state
      const token = await this.tokenService.getToken(employeeId);
      const state = this.authState$.value;
      this.authState$.next({
        ...state,
        isAuthenticated: true
      });

      return {
        success: true,
        employee,
        token: token || undefined,
        message: `Override successful. ${extensionDays} days of access granted.`,
        isOffline: true
      };
    } catch (error) {
      console.error('[AuthService] Override authentication failed:', error);
      return {
        success: false,
        message: 'Override authentication failed'
      };
    }
  }

  /**
   * Authenticate with emergency token
   */
  async authenticateWithEmergency(employeeId: string, pin: string, securityAnswer: string): Promise<LoginResponse> {
    try {
      // Check if emergency token is available
      const hasToken = await this.overrideService.hasValidEmergencyToken();
      if (!hasToken) {
        return {
          success: false,
          message: 'No valid emergency token available'
        };
      }

      // Check expiration tier - emergency auth only allowed in override required period
      const tier = await this.expirationService.getCurrentTier();
      if (tier !== ExpirationTier.OVERRIDE_REQUIRED) {
        return {
          success: false,
          message: 'Emergency authentication not yet required'
        };
      }

      // Verify PIN and security answer
      const isValid = await this.overrideService.verifyEmergencyToken(pin, securityAnswer);
      if (!isValid) {
        return {
          success: false,
          message: 'Invalid PIN or security answer'
        };
      }

      // Verify PIN separately for attempt tracking
      const isPINValid = await this.pinService.verifyPIN(employeeId, pin);
      if (!isPINValid) {
        const attemptsRemaining = await this.pinService.getRemainingAttempts(employeeId);
        return {
          success: false,
          message: `Invalid PIN. ${attemptsRemaining} attempt(s) remaining.`,
          attemptsRemaining
        };
      }

      // Get employee from current state (should match employeeId)
      const employee = this.getCurrentEmployee();
      if (!employee || employee.employeeId !== employeeId) {
        return {
          success: false,
          message: 'Employee mismatch. Please log in online first.'
        };
      }

      // Mark emergency token as used
      await this.overrideService.markEmergencyTokenUsed();

      // Unlock token
      await this.tokenService.unlockToken(employeeId);
      await this.pinService.resetAttempts(employeeId);

      // Log emergency access
      await this.auditService.logEmergencyAccess({
        userID: employeeId,
        deviceID: await this.auditService.getDeviceID(),
        eventType: 'emergency_auth',
        success: true,
        securityQuestionUsed: true,
        highPriority: true
      });

      // Update auth state
      const token = await this.tokenService.getToken(employeeId);
      const state = this.authState$.value;
      this.authState$.next({
        ...state,
        isAuthenticated: true
      });

      return {
        success: true,
        employee,
        token: token || undefined,
        message: 'Emergency authentication successful',
        isOffline: true
      };
    } catch (error) {
      console.error('[AuthService] Emergency authentication failed:', error);
      return {
        success: false,
        message: 'Emergency authentication failed'
      };
    }
  }

  /**
   * Get authentication status including offline auth details
   */
  async getAuthStatus(): Promise<{
    isAuthenticated: boolean;
    isOnline: boolean;
    daysSinceLastSync: number;
    expirationTier: ExpirationTier;
    attemptsRemaining: number;
    overridesRemaining: number;
    warningMessage?: string;
  }> {
    const isAuthenticated = this.isAuthenticated();
    
    // Get current employee for tracking
    const employee = this.getCurrentEmployee();
    const employeeId = employee?.employeeId;
    
    const daysSinceLastSync = await this.expirationService.getDaysSinceLastSync(employeeId);
    const tier = await this.expirationService.getCurrentTier(employeeId);
    
    // Get current employee for attempt tracking
    const attemptsRemaining = employee ? await this.pinService.getRemainingAttempts(employee.employeeId) : 0;
    
    const overridesRemaining = await this.overrideService.getRemainingOverrides();
    const daysUntilNext = await this.expirationService.getDaysUntilNextTier();
    
    // Generate warning message based on tier
    let warningMessage: string | undefined;
    if (tier === ExpirationTier.WARNING) {
      warningMessage = `Sync recommended. ${daysUntilNext} days remaining.`;
    } else if (tier === ExpirationTier.GRACE) {
      warningMessage = `Important: Sync required soon. You have ${daysUntilNext} days remaining.`;
    } else if (tier === ExpirationTier.OVERRIDE_REQUIRED) {
      warningMessage = 'Override or emergency authentication required. Please sync online or use an override code.';
    }

    return {
      isAuthenticated,
      isOnline: navigator.onLine,
      daysSinceLastSync,
      expirationTier: tier,
      attemptsRemaining,
      overridesRemaining,
      warningMessage
    };
  }

  /**
   * Check if offline authentication is available
   */
  async canAuthenticateOffline(employeeId: string): Promise<boolean> {
    console.log('[AuthService] canAuthenticateOffline called for employee:', employeeId);
    
    const hasPIN = await this.pinService.hasPIN(employeeId);
    console.log('[AuthService] hasPIN:', hasPIN);
    
    const isLocked = await this.tokenService.isTokenLocked(employeeId);
    console.log('[AuthService] isTokenLocked:', isLocked);
    
    // Use getRawToken to check if token exists regardless of lock status
    const token = await this.tokenService.getRawToken(employeeId);
    console.log('[AuthService] token exists:', token !== null);
    
    const result = hasPIN && isLocked && token !== null;
    console.log('[AuthService] canAuthenticateOffline result:', result);
    
    return result;
  }

  // ========== Security Features ==========

  /**
   * Check for clock tampering
   * Detects if system clock has moved backward since last auth
   */
  private async checkClockTampering(): Promise<boolean> {
    const lastTimestamp = localStorage.getItem('last_auth_timestamp');
    if (!lastTimestamp) {
      return false;
    }

    const now = Date.now();
    const last = parseInt(lastTimestamp, 10);

    // If current time is before last known time, clock was tampered
    if (now < last) {
      console.warn('[AuthService] Clock tampering detected');
      return true;
    }

    return false;
  }

  /**
   * Update last known timestamp
   */
  private updateLastTimestamp(): void {
    localStorage.setItem('last_auth_timestamp', Date.now().toString());
  }

  /**
   * Invalidate all cached credentials (remote invalidation)
   * Called when server sends invalidation command during sync
   */
  async invalidateCredentials(): Promise<void> {
    console.log('[AuthService] Invalidating all cached credentials');

    const employee = this.getCurrentEmployee();
    if (employee) {
      // Clear PIN for this employee
      await this.pinRepository.deletePINData(employee.employeeId);

      // Clear tokens for this employee
      await this.tokenService.deleteToken(employee.employeeId);

      // Log invalidation
      await this.auditService.logAuthAttempt({
        userID: employee.employeeId,
        deviceID: await this.auditService.getDeviceID(),
        eventType: 'online_auth',
        success: false
      });
    }

    // Clear override codes
    await this.overrideService.clearOverrideCache();

    // Clear emergency token
    await this.overrideService.clearEmergencyToken();

    // Clear auth state
    this.clearAuthState();
  }
}
