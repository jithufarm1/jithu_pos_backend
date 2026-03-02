/**
 * Appointment Management Models
 * 
 * Core data models for the appointments management feature including
 * appointments, service types, time slots, and related entities.
 */

/**
 * Appointment status enumeration
 */
export type AppointmentStatus = 
  | 'scheduled'
  | 'checked-in'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'no-show';

/**
 * Service category enumeration
 */
export type ServiceCategory =
  | 'Oil Change'
  | 'Fluid Service'
  | 'Filter Service'
  | 'Battery'
  | 'Wiper'
  | 'Light'
  | 'Tire'
  | 'Inspection'
  | 'Custom';

/**
 * Core appointment entity
 */
export interface Appointment {
  id: string;
  customerId: string;
  vehicleId: string;
  serviceTypes: string[];
  scheduledDateTime: string; // ISO 8601
  endDateTime: string; // ISO 8601
  duration: number; // minutes
  bufferTime: number; // minutes (always 15)
  serviceBay: number; // 1-4
  technicianId: string;
  status: AppointmentStatus;
  checkInTime?: string;
  startTime?: string;
  completionTime?: string;
  cancellationTime?: string;
  cancellationReason?: string;
  notes?: string;
  createdBy: string;
  createdDate: string;
  lastModifiedBy?: string;
  lastModifiedDate?: string;
  version: number; // for optimistic locking
}

/**
 * Service type definition
 */
export interface ServiceType {
  id: string;
  name: string;
  category: ServiceCategory;
  duration: number; // minutes
  description: string;
  isActive: boolean;
  isCustom?: boolean;
}

/**
 * Time slot with availability information
 */
export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  availableBays: number[];
  isAvailable: boolean;
}

/**
 * Search criteria for appointments
 */
export interface AppointmentSearchCriteria {
  searchTerm?: string;
  customerId?: string;
  vehicleId?: string;
  status?: AppointmentStatus;
  serviceType?: string;
  technicianId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Daily appointment summary
 */
export interface AppointmentSummary {
  date: Date;
  totalAppointments: number;
  scheduled: number;
  checkedIn: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

/**
 * Service type statistics
 */
export interface ServiceTypeStats {
  serviceType: string;
  count: number;
  percentage: number;
}

/**
 * Technician utilization metrics
 */
export interface TechnicianUtilization {
  technicianId: string;
  technicianName: string;
  totalAppointments: number;
  totalHours: number;
  utilizationPercentage: number;
}

/**
 * No-show statistics
 */
export interface NoShowStats {
  totalAppointments: number;
  noShowCount: number;
  noShowPercentage: number;
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  type: NotificationType;
  subject: string;
  body: string;
  variables: string[];
}

/**
 * Notification type enumeration
 */
export type NotificationType =
  | 'confirmation'
  | 'reminder'
  | 'cancellation'
  | 'reschedule'
  | 'technician-assignment'
  | 'check-in';

/**
 * Store hours configuration
 */
export interface StoreHours {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  isOpen: boolean;
  openTime: string; // HH:mm format
  closeTime: string; // HH:mm format
}

/**
 * Business rules configuration
 */
export interface BusinessRules {
  maxServiceBays: number;
  bufferTimeMinutes: number;
  advanceBookingDays: number;
  checkInWindowMinutes: number;
  noShowThresholdMinutes: number;
  storeHours: StoreHours[];
}

/**
 * Customer summary for appointments
 */
export interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  email: string;
  preferredContactMethod: 'email' | 'phone' | 'sms';
}

/**
 * Vehicle summary for appointments
 */
export interface VehicleSummary {
  id: string;
  year: number;
  make: string;
  model: string;
  vin: string;
  licensePlate?: string;
}

/**
 * Service history record
 */
export interface ServiceHistoryRecord {
  appointmentId: string;
  customerId: string;
  vehicleId: string;
  serviceDate: string;
  services: string[];
  technicianId: string;
  duration: number;
  notes?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalAppointments: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  cacheSize: number; // bytes
  lastRefresh: Date;
}
