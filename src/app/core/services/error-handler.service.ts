import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  NOT_FOUND = 'NOT_FOUND',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Structured error information
 */
export interface AppError {
  category: ErrorCategory;
  message: string;
  originalError?: any;
  timestamp: Date;
}

/**
 * Centralized Error Handler Service
 * Provides error categorization, logging, and user-friendly messages
 */
@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  /**
   * Handle error and return user-friendly message
   */
  handleError(error: any): Observable<never> {
    const appError = this.categorizeError(error);
    this.logError(appError);
    return throwError(() => appError);
  }

  /**
   * Categorize error based on type and status
   */
  private categorizeError(error: any): AppError {
    let category: ErrorCategory;
    let message: string;

    // Network errors
    if (error.status === 0 || error.name === 'NetworkError') {
      category = ErrorCategory.NETWORK;
      message = 'Unable to connect. Using cached data.';
    }
    // Not found errors
    else if (error.status === 404) {
      category = ErrorCategory.NOT_FOUND;
      message = 'Vehicle not found. Please check your search criteria.';
    }
    // Server errors
    else if (error.status >= 500) {
      category = ErrorCategory.SERVER;
      message = 'Service temporarily unavailable. Please try again.';
    }
    // Validation errors
    else if (error.status === 400 || error.status === 422) {
      category = ErrorCategory.VALIDATION;
      message = error.error?.message || 'Invalid input. Please check your data.';
    }
    // Timeout errors
    else if (error.name === 'TimeoutError') {
      category = ErrorCategory.NETWORK;
      message = 'Request timed out. Please try again.';
    }
    // Unknown errors
    else {
      category = ErrorCategory.UNKNOWN;
      message = 'An unexpected error occurred. Please try again.';
    }

    return {
      category,
      message,
      originalError: error,
      timestamp: new Date(),
    };
  }

  /**
   * Log error to console (in production, this would send to logging service)
   */
  logError(error: AppError): void {
    console.error('[Error Handler]', {
      category: error.category,
      message: error.message,
      timestamp: error.timestamp,
      originalError: error.originalError,
    });
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: any): string {
    if (error.message) {
      return error.message;
    }
    return this.categorizeError(error).message;
  }

  /**
   * Check if error is recoverable (can be retried)
   */
  isRecoverable(error: AppError): boolean {
    return (
      error.category === ErrorCategory.NETWORK ||
      error.category === ErrorCategory.SERVER
    );
  }
}
