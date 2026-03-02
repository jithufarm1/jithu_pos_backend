/**
 * Appointment Business Rules
 * 
 * Constants and configuration for appointment business rules.
 */

import { BusinessRules, StoreHours } from '../models/appointment.model';

/**
 * Store hours configuration
 * Monday-Saturday: 8 AM - 6 PM
 * Sunday: Closed
 */
export const STORE_HOURS: StoreHours[] = [
  { dayOfWeek: 0, isOpen: false, openTime: '00:00', closeTime: '00:00' }, // Sunday - Closed
  { dayOfWeek: 1, isOpen: true, openTime: '08:00', closeTime: '18:00' },  // Monday
  { dayOfWeek: 2, isOpen: true, openTime: '08:00', closeTime: '18:00' },  // Tuesday
  { dayOfWeek: 3, isOpen: true, openTime: '08:00', closeTime: '18:00' },  // Wednesday
  { dayOfWeek: 4, isOpen: true, openTime: '08:00', closeTime: '18:00' },  // Thursday
  { dayOfWeek: 5, isOpen: true, openTime: '08:00', closeTime: '18:00' },  // Friday
  { dayOfWeek: 6, isOpen: true, openTime: '08:00', closeTime: '18:00' },  // Saturday
];

/**
 * Business rules configuration
 */
export const APPOINTMENT_BUSINESS_RULES: BusinessRules = {
  maxServiceBays: 4,
  bufferTimeMinutes: 15,
  advanceBookingDays: 30,
  checkInWindowMinutes: 30,
  noShowThresholdMinutes: 15,
  storeHours: STORE_HOURS,
};

/**
 * Time slot interval in minutes
 */
export const TIME_SLOT_INTERVAL_MINUTES = 30;

/**
 * Cache duration in days
 */
export const CACHE_DURATION_DAYS = 7;

/**
 * Maximum retry attempts for sync operations
 */
export const MAX_SYNC_RETRIES = 5;

/**
 * Debounce delay for search in milliseconds
 */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Pagination size for search results
 */
export const SEARCH_PAGE_SIZE = 50;
