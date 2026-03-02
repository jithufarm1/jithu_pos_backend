/**
 * Time Slot Validator Service
 * 
 * Validates appointment time slots and checks availability:
 * - Time slot availability checking
 * - Service bay capacity validation
 * - Store hours validation
 * - Advance booking window validation
 * - Conflict detection
 */

import { Injectable } from '@angular/core';
import { TimeSlot, ValidationResult, BusinessRules, StoreHours } from '../../../core/models/appointment.model';
import { CachedAppointment } from '../../../core/models/appointment-cache.model';
import { AppointmentCacheRepository } from '../../../core/repositories/appointment-cache.repository';

@Injectable({
  providedIn: 'root',
})
export class TimeSlotValidatorService {
  /**
   * Business rules configuration
   */
  private readonly businessRules: BusinessRules = {
    maxServiceBays: 4,
    bufferTimeMinutes: 15,
    advanceBookingDays: 30,
    checkInWindowMinutes: 30,
    noShowThresholdMinutes: 15,
    storeHours: [
      { dayOfWeek: 0, isOpen: false, openTime: '00:00', closeTime: '00:00' }, // Sunday - Closed
      { dayOfWeek: 1, isOpen: true, openTime: '08:00', closeTime: '18:00' },  // Monday
      { dayOfWeek: 2, isOpen: true, openTime: '08:00', closeTime: '18:00' },  // Tuesday
      { dayOfWeek: 3, isOpen: true, openTime: '08:00', closeTime: '18:00' },  // Wednesday
      { dayOfWeek: 4, isOpen: true, openTime: '08:00', closeTime: '18:00' },  // Thursday
      { dayOfWeek: 5, isOpen: true, openTime: '08:00', closeTime: '18:00' },  // Friday
      { dayOfWeek: 6, isOpen: true, openTime: '08:00', closeTime: '18:00' },  // Saturday
    ],
  };

  constructor(private appointmentCache: AppointmentCacheRepository) {}

  /**
   * Check if a time slot is available
   */
  async isTimeSlotAvailable(dateTime: Date, duration: number, excludeAppointmentId?: string): Promise<boolean> {
    // Validate basic constraints
    const timeValidation = this.validateAppointmentTime(dateTime);
    if (!timeValidation.isValid) {
      return false;
    }

    const durationValidation = this.validateDuration(duration);
    if (!durationValidation.isValid) {
      return false;
    }

    const storeHoursValidation = this.validateWithinStoreHours(dateTime, duration);
    if (!storeHoursValidation.isValid) {
      return false;
    }

    const advanceBookingValidation = this.validateAdvanceBooking(dateTime);
    if (!advanceBookingValidation.isValid) {
      return false;
    }

    // Check if time slot would cause overbooking
    const wouldOverbook = await this.wouldCauseOverbooking(dateTime, duration, excludeAppointmentId);
    return !wouldOverbook;
  }

  /**
   * Get available time slots for a given date and duration
   * Returns 30-minute intervals within store hours
   */
  async getAvailableSlots(date: Date, duration: number): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const storeHours = this.getStoreHoursForDate(date);

    if (!storeHours.isOpen) {
      return slots;
    }

    // Parse store hours
    const [openHour, openMinute] = storeHours.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = storeHours.closeTime.split(':').map(Number);

    // Create time slots in 30-minute intervals
    const startTime = new Date(date);
    startTime.setHours(openHour, openMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(closeHour, closeMinute, 0, 0);

    let currentTime = new Date(startTime);

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration + this.businessRules.bufferTimeMinutes);

      // Check if slot end time is within store hours
      if (slotEnd <= endTime) {
        const availableBays = await this.getAvailableBays(currentTime, duration);
        const isAvailable = availableBays.length > 0;

        slots.push({
          startTime: new Date(currentTime),
          endTime: slotEnd,
          availableBays,
          isAvailable,
        });
      }

      // Move to next 30-minute interval
      currentTime.setMinutes(currentTime.getMinutes() + 30);
    }

    return slots;
  }

  /**
   * Get available service bays for a time slot
   */
  async getAvailableBays(dateTime: Date, duration: number): Promise<number[]> {
    const allBays = Array.from({ length: this.businessRules.maxServiceBays }, (_, i) => i + 1);
    const conflicts = await this.detectConflicts(dateTime, duration);

    // Remove bays that have conflicts
    const occupiedBays = new Set(conflicts.map(apt => apt.serviceBay));
    return allBays.filter(bay => !occupiedBays.has(bay));
  }

  /**
   * Validate appointment time (not in past, valid date)
   */
  validateAppointmentTime(dateTime: Date): ValidationResult {
    const errors: string[] = [];

    if (!(dateTime instanceof Date) || isNaN(dateTime.getTime())) {
      errors.push('Invalid date/time');
      return { isValid: false, errors };
    }

    // Allow current time for walk-ins, but not past times
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    if (dateTime < fiveMinutesAgo) {
      errors.push('Appointment time cannot be in the past');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate duration is positive and non-zero
   */
  validateDuration(duration: number): ValidationResult {
    const errors: string[] = [];

    if (typeof duration !== 'number' || isNaN(duration)) {
      errors.push('Duration must be a valid number');
    } else if (duration <= 0) {
      errors.push('Duration must be positive and non-zero');
    } else if (duration > 480) { // Max 8 hours
      errors.push('Duration cannot exceed 8 hours (480 minutes)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate service bay number (1-4)
   */
  validateBayNumber(bayNumber: number): ValidationResult {
    const errors: string[] = [];

    if (typeof bayNumber !== 'number' || isNaN(bayNumber)) {
      errors.push('Bay number must be a valid number');
    } else if (bayNumber < 1 || bayNumber > this.businessRules.maxServiceBays) {
      errors.push(`Bay number must be between 1 and ${this.businessRules.maxServiceBays}`);
    } else if (!Number.isInteger(bayNumber)) {
      errors.push('Bay number must be an integer');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate appointment is within store hours
   * Checks both start time and end time + buffer
   */
  validateWithinStoreHours(dateTime: Date, duration: number): ValidationResult {
    const errors: string[] = [];
    const storeHours = this.getStoreHoursForDate(dateTime);

    if (!storeHours.isOpen) {
      errors.push('Store is closed on this day');
      return { isValid: false, errors };
    }

    // Parse store hours
    const [openHour, openMinute] = storeHours.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = storeHours.closeTime.split(':').map(Number);

    const appointmentHour = dateTime.getHours();
    const appointmentMinute = dateTime.getMinutes();

    // Check start time
    const startMinutes = appointmentHour * 60 + appointmentMinute;
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    if (startMinutes < openMinutes) {
      errors.push(`Appointment cannot start before store opens at ${storeHours.openTime}`);
    }

    // Check end time + buffer
    const endTime = new Date(dateTime);
    endTime.setMinutes(endTime.getMinutes() + duration + this.businessRules.bufferTimeMinutes);

    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();
    const endMinutes = endHour * 60 + endMinute;

    if (endMinutes > closeMinutes) {
      errors.push(`Appointment (including buffer time) must end before store closes at ${storeHours.closeTime}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate appointment is within advance booking window (30 days)
   */
  validateAdvanceBooking(dateTime: Date): ValidationResult {
    const errors: string[] = [];
    const now = new Date();
    const maxAdvanceDate = new Date(now);
    maxAdvanceDate.setDate(maxAdvanceDate.getDate() + this.businessRules.advanceBookingDays);

    if (dateTime > maxAdvanceDate) {
      errors.push(`Appointments can only be booked up to ${this.businessRules.advanceBookingDays} days in advance`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Detect conflicts with existing appointments
   * Returns appointments that overlap with the given time slot
   */
  async detectConflicts(
    dateTime: Date,
    duration: number,
    bayNumber?: number,
    excludeAppointmentId?: string
  ): Promise<CachedAppointment[]> {
    // Calculate time range including buffer
    const startTime = dateTime;
    const endTime = new Date(dateTime);
    endTime.setMinutes(endTime.getMinutes() + duration + this.businessRules.bufferTimeMinutes);

    // Get appointments for the date
    const appointments = await this.appointmentCache.getByDate(dateTime);

    // Filter for conflicts
    return appointments.filter(apt => {
      // Exclude the appointment being updated
      if (excludeAppointmentId && apt.id === excludeAppointmentId) {
        return false;
      }

      // Skip cancelled and no-show appointments
      if (apt.status === 'cancelled' || apt.status === 'no-show') {
        return false;
      }

      // If bay number specified, only check that bay
      if (bayNumber !== undefined && apt.serviceBay !== bayNumber) {
        return false;
      }

      // Check time overlap
      const aptStart = new Date(apt.scheduledDateTime);
      const aptEnd = new Date(apt.endDateTime);
      aptEnd.setMinutes(aptEnd.getMinutes() + this.businessRules.bufferTimeMinutes);

      // Check if time ranges overlap
      return (startTime < aptEnd && endTime > aptStart);
    });
  }

  /**
   * Check if scheduling would cause overbooking
   * Returns true if all 4 bays are occupied during the time slot
   */
  async wouldCauseOverbooking(dateTime: Date, duration: number, excludeAppointmentId?: string): Promise<boolean> {
    const conflicts = await this.detectConflicts(dateTime, duration, undefined, excludeAppointmentId);
    
    // Count unique bays occupied
    const occupiedBays = new Set(conflicts.map(apt => apt.serviceBay));
    
    // Overbooking occurs when all bays are occupied
    return occupiedBays.size >= this.businessRules.maxServiceBays;
  }

  /**
   * Get store hours for a specific date
   */
  private getStoreHoursForDate(date: Date): StoreHours {
    const dayOfWeek = date.getDay();
    return this.businessRules.storeHours[dayOfWeek];
  }

  /**
   * Get business rules
   */
  getBusinessRules(): BusinessRules {
    return { ...this.businessRules };
  }

  /**
   * Validate check-in timing (not more than 30 minutes early)
   */
  validateCheckInTiming(scheduledDateTime: Date): ValidationResult {
    const errors: string[] = [];
    const now = new Date();
    const scheduled = new Date(scheduledDateTime);
    const earlyCheckInLimit = new Date(scheduled);
    earlyCheckInLimit.setMinutes(earlyCheckInLimit.getMinutes() - this.businessRules.checkInWindowMinutes);

    if (now < earlyCheckInLimit) {
      const minutesEarly = Math.floor((earlyCheckInLimit.getTime() - now.getTime()) / (1000 * 60));
      errors.push(`Cannot check in more than ${this.businessRules.checkInWindowMinutes} minutes early (${minutesEarly} minutes too early)`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if appointment should be marked as no-show
   * Returns true if more than 15 minutes past scheduled time
   */
  shouldMarkAsNoShow(scheduledDateTime: Date, currentStatus: string): boolean {
    if (currentStatus !== 'scheduled') {
      return false;
    }

    const now = new Date();
    const scheduled = new Date(scheduledDateTime);
    const noShowThreshold = new Date(scheduled);
    noShowThreshold.setMinutes(noShowThreshold.getMinutes() + this.businessRules.noShowThresholdMinutes);

    return now > noShowThreshold;
  }
}
