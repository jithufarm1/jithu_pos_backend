/**
 * Appointment Service
 * 
 * Handles all appointment-related operations with network-first strategy:
 * - Create, read, update, delete appointments
 * - Search and filtering
 * - Status management (check-in, start, complete, cancel)
 * - Time slot validation and availability
 * - Offline support with sync queue
 * - Integration with customer and vehicle services
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, from, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { 
  Appointment, 
  AppointmentSearchCriteria, 
  AppointmentStatus,
  TimeSlot,
  CustomerSummary,
  VehicleSummary
} from '../../../core/models/appointment.model';
import { CachedAppointment, QueuedAppointmentOperation } from '../../../core/models/appointment-cache.model';
import { environment } from '../../../../environments/environment';
import { AppointmentCacheRepository } from '../../../core/repositories/appointment-cache.repository';
import { NetworkDetectionService } from '../../../core/services/network-detection.service';
import { TimeSlotValidatorService } from './time-slot-validator.service';
import { ServiceTypeService } from './service-type.service';
import { CustomerService } from '../../customer/services/customer.service';

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private readonly apiUrl = `${environment.apiBaseUrl}/appointments`;

  constructor(
    private http: HttpClient,
    private cacheRepo: AppointmentCacheRepository,
    private networkService: NetworkDetectionService,
    private timeSlotValidator: TimeSlotValidatorService,
    private serviceTypeService: ServiceTypeService,
    private customerService: CustomerService
  ) {}

  /**
   * Create new appointment
   */
  createAppointment(appointment: Partial<Appointment>): Observable<Appointment | null> {
    console.log('[AppointmentService] Creating appointment');

    return from(this.validateAndPrepareAppointment(appointment)).pipe(
      switchMap(validatedAppointment => {
        if (this.networkService.isOnline()) {
          // Online: persist to backend immediately
          return this.http.post<Appointment>(this.apiUrl, validatedAppointment).pipe(
            switchMap(async (newAppointment) => {
              console.log('[AppointmentService] Appointment created:', newAppointment.id);
              // Cache the new appointment
              await this.cacheAppointment(newAppointment);
              return newAppointment;
            }),
            catchError((error) => {
              console.error('[AppointmentService] Create appointment error:', error);
              return throwError(() => error);
            })
          );
        } else {
          // Offline: store locally and queue for sync
          return from(this.createAppointmentOffline(validatedAppointment));
        }
      })
    );
  }

  /**
   * Create walk-in appointment (uses current timestamp)
   */
  createWalkIn(customerId: string, vehicleId: string, serviceTypes: string[]): Observable<Appointment | null> {
    console.log('[AppointmentService] Creating walk-in appointment');

    const now = new Date();
    const duration = this.serviceTypeService.calculateTotalDuration(serviceTypes);

    const walkInAppointment: Partial<Appointment> = {
      customerId,
      vehicleId,
      serviceTypes,
      scheduledDateTime: now.toISOString(),
      duration,
      status: 'scheduled',
    };

    return this.createAppointment(walkInAppointment);
  }

  /**
   * Get appointment by ID
   */
  getAppointmentById(appointmentId: string): Observable<Appointment | null> {
    console.log('[AppointmentService] Getting appointment:', appointmentId);

    if (this.networkService.isOnline()) {
      return this.http.get<Appointment>(`${this.apiUrl}/${appointmentId}`).pipe(
        switchMap(async (appointment) => {
          console.log('[AppointmentService] Appointment found from API');
          await this.cacheAppointment(appointment);
          return appointment;
        }),
        catchError((error) => {
          console.warn('[AppointmentService] API get failed, falling back to cache:', error.message);
          return from(this.cacheRepo.getById(appointmentId));
        })
      );
    } else {
      return from(this.cacheRepo.getById(appointmentId));
    }
  }

  /**
   * Get appointments for a specific date
   */
  getAppointmentsByDate(date: Date): Observable<Appointment[]> {
    console.log('[AppointmentService] Getting appointments for date:', date.toDateString());

    if (this.networkService.isOnline()) {
      const params = new HttpParams().set('date', date.toISOString().split('T')[0]);
      
      return this.http.get<Appointment[]>(this.apiUrl, { params }).pipe(
        switchMap(async (appointments) => {
          console.log('[AppointmentService] Found appointments from API:', appointments.length);
          // Cache all appointments
          for (const apt of appointments) {
            await this.cacheAppointment(apt);
          }
          return appointments;
        }),
        catchError((error) => {
          console.warn('[AppointmentService] API get failed, falling back to cache:', error.message);
          return from(this.cacheRepo.getByDate(date));
        })
      );
    } else {
      return from(this.cacheRepo.getByDate(date));
    }
  }

  /**
   * Get appointments for a date range
   */
  getAppointmentsByDateRange(startDate: Date, endDate: Date): Observable<Appointment[]> {
    console.log('[AppointmentService] Getting appointments for range:', startDate.toDateString(), '-', endDate.toDateString());

    if (this.networkService.isOnline()) {
      const params = new HttpParams()
        .set('startDate', startDate.toISOString().split('T')[0])
        .set('endDate', endDate.toISOString().split('T')[0]);
      
      return this.http.get<Appointment[]>(this.apiUrl, { params }).pipe(
        switchMap(async (appointments) => {
          console.log('[AppointmentService] Found appointments from API:', appointments.length);
          // Cache all appointments
          for (const apt of appointments) {
            await this.cacheAppointment(apt);
          }
          return appointments;
        }),
        catchError((error) => {
          console.warn('[AppointmentService] API get failed, falling back to cache:', error.message);
          return from(this.cacheRepo.getByDateRange(startDate, endDate));
        })
      );
    } else {
      return from(this.cacheRepo.getByDateRange(startDate, endDate));
    }
  }

  /**
   * Search appointments by criteria
   */
  searchAppointments(criteria: AppointmentSearchCriteria): Observable<Appointment[]> {
    console.log('[AppointmentService] Searching appointments:', criteria);

    if (this.networkService.isOnline()) {
      let params = new HttpParams();
      
      if (criteria.searchTerm) params = params.set('q', criteria.searchTerm);
      if (criteria.customerId) params = params.set('customerId', criteria.customerId);
      if (criteria.vehicleId) params = params.set('vehicleId', criteria.vehicleId);
      if (criteria.status) params = params.set('status', criteria.status);
      if (criteria.serviceType) params = params.set('serviceType', criteria.serviceType);
      if (criteria.technicianId) params = params.set('technicianId', criteria.technicianId);
      if (criteria.startDate) params = params.set('startDate', criteria.startDate.toISOString().split('T')[0]);
      if (criteria.endDate) params = params.set('endDate', criteria.endDate.toISOString().split('T')[0]);

      return this.http.get<Appointment[]>(`${this.apiUrl}/search`, { params }).pipe(
        map((appointments) => {
          console.log('[AppointmentService] Found appointments from API:', appointments.length);
          return appointments;
        }),
        catchError((error) => {
          console.warn('[AppointmentService] API search failed, falling back to cache:', error.message);
          return from(this.cacheRepo.search(criteria));
        })
      );
    } else {
      return from(this.cacheRepo.search(criteria));
    }
  }

  /**
   * Filter appointments by status
   */
  filterByStatus(status: AppointmentStatus): Observable<Appointment[]> {
    return this.searchAppointments({ status });
  }

  /**
   * Filter appointments by technician
   */
  filterByTechnician(technicianId: string): Observable<Appointment[]> {
    return this.searchAppointments({ technicianId });
  }

  /**
   * Filter appointments by service type
   */
  filterByServiceType(serviceType: string): Observable<Appointment[]> {
    return this.searchAppointments({ serviceType });
  }

  /**
   * Update appointment
   */
  updateAppointment(appointmentId: string, updates: Partial<Appointment>): Observable<Appointment | null> {
    console.log('[AppointmentService] Updating appointment:', appointmentId);

    return from(this.validateAppointmentUpdate(appointmentId, updates)).pipe(
      switchMap(validatedUpdates => {
        if (this.networkService.isOnline()) {
          return this.http.put<Appointment>(`${this.apiUrl}/${appointmentId}`, validatedUpdates).pipe(
            switchMap(async (updatedAppointment) => {
              console.log('[AppointmentService] Appointment updated');
              await this.cacheAppointment(updatedAppointment);
              return updatedAppointment;
            }),
            catchError((error) => {
              console.error('[AppointmentService] Update appointment error:', error);
              return throwError(() => error);
            })
          );
        } else {
          return from(this.updateAppointmentOffline(appointmentId, validatedUpdates));
        }
      })
    );
  }

  /**
   * Reschedule appointment to new date/time
   */
  rescheduleAppointment(appointmentId: string, newDateTime: Date): Observable<Appointment | null> {
    console.log('[AppointmentService] Rescheduling appointment:', appointmentId);

    return this.getAppointmentById(appointmentId).pipe(
      switchMap(appointment => {
        if (!appointment) {
          return throwError(() => new Error('Appointment not found'));
        }

        // Validate new time slot
        return from(this.timeSlotValidator.isTimeSlotAvailable(newDateTime, appointment.duration, appointmentId)).pipe(
          switchMap(isAvailable => {
            if (!isAvailable) {
              return throwError(() => new Error('New time slot is not available'));
            }

            const endDateTime = new Date(newDateTime);
            endDateTime.setMinutes(endDateTime.getMinutes() + appointment.duration);

            return this.updateAppointment(appointmentId, {
              scheduledDateTime: newDateTime.toISOString(),
              endDateTime: endDateTime.toISOString(),
            });
          })
        );
      })
    );
  }

  /**
   * Reassign appointment to different service bay
   */
  reassignBay(appointmentId: string, bayNumber: number): Observable<Appointment | null> {
    console.log('[AppointmentService] Reassigning bay:', appointmentId, bayNumber);

    // Validate bay number
    const bayValidation = this.timeSlotValidator.validateBayNumber(bayNumber);
    if (!bayValidation.isValid) {
      return throwError(() => new Error(bayValidation.errors.join(', ')));
    }

    return this.getAppointmentById(appointmentId).pipe(
      switchMap(appointment => {
        if (!appointment) {
          return throwError(() => new Error('Appointment not found'));
        }

        // Check if bay is available
        const dateTime = new Date(appointment.scheduledDateTime);
        return from(this.timeSlotValidator.detectConflicts(dateTime, appointment.duration, bayNumber, appointmentId)).pipe(
          switchMap(conflicts => {
            if (conflicts.length > 0) {
              return throwError(() => new Error('Bay is not available for this time slot'));
            }

            return this.updateAppointment(appointmentId, { serviceBay: bayNumber });
          })
        );
      })
    );
  }

  /**
   * Reassign appointment to different technician
   */
  reassignTechnician(appointmentId: string, technicianId: string): Observable<Appointment | null> {
    console.log('[AppointmentService] Reassigning technician:', appointmentId, technicianId);
    return this.updateAppointment(appointmentId, { technicianId });
  }

  /**
   * Update services for an appointment (recalculates duration)
   */
  updateServices(appointmentId: string, serviceTypes: string[]): Observable<Appointment | null> {
    console.log('[AppointmentService] Updating services:', appointmentId);

    const newDuration = this.serviceTypeService.calculateTotalDuration(serviceTypes);

    return this.getAppointmentById(appointmentId).pipe(
      switchMap(appointment => {
        if (!appointment) {
          return throwError(() => new Error('Appointment not found'));
        }

        const scheduledDateTime = new Date(appointment.scheduledDateTime);
        const endDateTime = new Date(scheduledDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + newDuration);

        // Validate new duration doesn't cause conflicts
        return from(this.timeSlotValidator.isTimeSlotAvailable(scheduledDateTime, newDuration, appointmentId)).pipe(
          switchMap(isAvailable => {
            if (!isAvailable) {
              return throwError(() => new Error('Updated duration would cause scheduling conflict'));
            }

            return this.updateAppointment(appointmentId, {
              serviceTypes,
              duration: newDuration,
              endDateTime: endDateTime.toISOString(),
            });
          })
        );
      })
    );
  }

  /**
   * Private helper methods
   */

  /**
   * Validate and prepare appointment data before creation
   */
  private async validateAndPrepareAppointment(appointment: Partial<Appointment>): Promise<Partial<Appointment>> {
    // Validate required fields
    if (!appointment.customerId || !appointment.vehicleId || !appointment.serviceTypes || !appointment.scheduledDateTime) {
      throw new Error('Missing required fields: customerId, vehicleId, serviceTypes, scheduledDateTime');
    }

    // Validate customer exists
    const customer = await this.customerService.getCustomerById(appointment.customerId).toPromise();
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Validate vehicle exists and belongs to customer
    const vehicle = customer.vehicles?.find(v => v.id === appointment.vehicleId);
    if (!vehicle) {
      throw new Error('Vehicle not found or does not belong to the specified customer');
    }

    // Calculate duration
    const duration = this.serviceTypeService.calculateTotalDuration(appointment.serviceTypes);
    const scheduledDateTime = new Date(appointment.scheduledDateTime);
    const endDateTime = new Date(scheduledDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + duration);

    // Validate time slot
    const isAvailable = await this.timeSlotValidator.isTimeSlotAvailable(scheduledDateTime, duration);
    if (!isAvailable) {
      throw new Error('Time slot is not available');
    }

    // Assign service bay if not specified
    let serviceBay = appointment.serviceBay;
    if (!serviceBay) {
      const availableBays = await this.timeSlotValidator.getAvailableBays(scheduledDateTime, duration);
      if (availableBays.length === 0) {
        throw new Error('No service bays available');
      }
      serviceBay = availableBays[0];
    }

    // Prepare complete appointment
    return {
      ...appointment,
      duration,
      endDateTime: endDateTime.toISOString(),
      bufferTime: 15,
      serviceBay,
      status: 'scheduled',
      createdDate: new Date().toISOString(),
      version: 1,
    };
  }

  /**
   * Validate appointment update
   */
  private async validateAppointmentUpdate(appointmentId: string, updates: Partial<Appointment>): Promise<Partial<Appointment>> {
    const existing = await this.cacheRepo.getById(appointmentId);
    if (!existing) {
      throw new Error('Appointment not found');
    }

    // Prevent updates to completed or cancelled appointments
    if (existing.status === 'completed' || existing.status === 'cancelled') {
      throw new Error('Cannot update completed or cancelled appointments');
    }

    // Add timestamp and increment version
    return {
      ...updates,
      lastModifiedDate: new Date().toISOString(),
      version: existing.version + 1,
    };
  }

  /**
   * Cache appointment with preloaded customer and vehicle data
   */
  private async cacheAppointment(appointment: Appointment): Promise<void> {
    const cachedAppointment: CachedAppointment = {
      ...appointment,
      cachedAt: new Date(),
      syncStatus: 'synced',
    };

    // Preload customer and vehicle data
    try {
      const customer = await this.customerService.getCustomerById(appointment.customerId).toPromise();
      if (customer) {
        cachedAppointment.customerData = {
          id: customer.id,
          name: `${customer.firstName} ${customer.lastName}`,
          phone: customer.phone,
          email: customer.email,
          preferredContactMethod: 'email', // Default to email
        };

        // Vehicle data is embedded in customer object
        const vehicle = customer.vehicles?.find((v: any) => v.id === appointment.vehicleId);
        if (vehicle) {
          cachedAppointment.vehicleData = {
            id: vehicle.id,
            year: vehicle.year,
            make: vehicle.make,
            model: vehicle.model,
            vin: vehicle.vin,
            licensePlate: vehicle.licensePlate,
          };
        }
      }
    } catch (error) {
      console.warn('[AppointmentService] Failed to preload customer/vehicle data:', error);
    }

    await this.cacheRepo.save(cachedAppointment);
  }

  /**
   * Create appointment offline
   */
  private async createAppointmentOffline(appointment: Partial<Appointment>): Promise<Appointment> {
    const offlineId = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newAppointment: Appointment = {
      ...(appointment as Appointment),
      id: offlineId,
    };

    const cachedAppointment: CachedAppointment = {
      ...newAppointment,
      cachedAt: new Date(),
      syncStatus: 'pending',
    };

    await this.cacheRepo.save(cachedAppointment);

    // Queue for sync
    const operation: QueuedAppointmentOperation = {
      id: `op-${Date.now()}`,
      operation: 'create',
      data: newAppointment,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    await this.cacheRepo.queueOperation(operation);

    return newAppointment;
  }

  /**
   * Update appointment offline
   */
  private async updateAppointmentOffline(appointmentId: string, updates: Partial<Appointment>): Promise<Appointment> {
    await this.cacheRepo.update(appointmentId, {
      ...updates,
      syncStatus: 'pending',
    });

    // Queue for sync
    const operation: QueuedAppointmentOperation = {
      id: `op-${Date.now()}`,
      operation: 'update',
      appointmentId,
      data: updates,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    await this.cacheRepo.queueOperation(operation);

    const updated = await this.cacheRepo.getById(appointmentId);
    return updated as Appointment;
  }

  /**
   * Get available time slots for a date
   */
  getAvailableTimeSlots(date: Date, duration: number): Observable<TimeSlot[]> {
    return from(this.timeSlotValidator.getAvailableSlots(date, duration));
  }

  /**
   * Validate time slot availability
   */
  validateTimeSlot(dateTime: Date, duration: number, bayNumber?: number): Observable<boolean> {
    return from(this.timeSlotValidator.isTimeSlotAvailable(dateTime, duration));
  }

  /**
   * Status Management Operations
   */

  /**
   * Check in appointment
   */
  checkInAppointment(appointmentId: string): Observable<Appointment | null> {
    console.log('[AppointmentService] Checking in appointment:', appointmentId);

    return this.getAppointmentById(appointmentId).pipe(
      switchMap(appointment => {
        if (!appointment) {
          return throwError(() => new Error('Appointment not found'));
        }

        if (appointment.status !== 'scheduled') {
          return throwError(() => new Error('Only scheduled appointments can be checked in'));
        }

        // Validate check-in timing
        const timingValidation = this.timeSlotValidator.validateCheckInTiming(new Date(appointment.scheduledDateTime));
        if (!timingValidation.isValid) {
          return throwError(() => new Error(timingValidation.errors.join(', ')));
        }

        return this.updateAppointmentStatus(appointmentId, 'checked-in', {
          checkInTime: new Date().toISOString(),
        });
      })
    );
  }

  /**
   * Start service on appointment
   */
  startService(appointmentId: string): Observable<Appointment | null> {
    console.log('[AppointmentService] Starting service:', appointmentId);

    return this.getAppointmentById(appointmentId).pipe(
      switchMap(appointment => {
        if (!appointment) {
          return throwError(() => new Error('Appointment not found'));
        }

        if (appointment.status !== 'checked-in') {
          return throwError(() => new Error('Only checked-in appointments can be started'));
        }

        return this.updateAppointmentStatus(appointmentId, 'in-progress', {
          startTime: new Date().toISOString(),
        });
      })
    );
  }

  /**
   * Complete appointment
   */
  completeAppointment(appointmentId: string): Observable<Appointment | null> {
    console.log('[AppointmentService] Completing appointment:', appointmentId);

    return this.getAppointmentById(appointmentId).pipe(
      switchMap(appointment => {
        if (!appointment) {
          return throwError(() => new Error('Appointment not found'));
        }

        if (appointment.status !== 'in-progress') {
          return throwError(() => new Error('Only in-progress appointments can be completed'));
        }

        return this.updateAppointmentStatus(appointmentId, 'completed', {
          completionTime: new Date().toISOString(),
        }).pipe(
          tap(async (completedAppointment) => {
            if (completedAppointment) {
              // Create service history record
              await this.createServiceHistoryRecord(completedAppointment);
            }
          })
        );
      })
    );
  }

  /**
   * Cancel appointment (manager only)
   */
  cancelAppointment(appointmentId: string, reason: string): Observable<Appointment | null> {
    console.log('[AppointmentService] Cancelling appointment:', appointmentId);

    if (!reason || reason.trim().length === 0) {
      return throwError(() => new Error('Cancellation reason is required'));
    }

    return this.getAppointmentById(appointmentId).pipe(
      switchMap(appointment => {
        if (!appointment) {
          return throwError(() => new Error('Appointment not found'));
        }

        if (appointment.status === 'completed' || appointment.status === 'cancelled') {
          return throwError(() => new Error('Cannot cancel completed or already cancelled appointments'));
        }

        return this.updateAppointmentStatus(appointmentId, 'cancelled', {
          cancellationTime: new Date().toISOString(),
          cancellationReason: reason,
        });
      })
    );
  }

  /**
   * Mark appointment as no-show
   */
  markNoShow(appointmentId: string): Observable<Appointment | null> {
    console.log('[AppointmentService] Marking as no-show:', appointmentId);

    return this.getAppointmentById(appointmentId).pipe(
      switchMap(appointment => {
        if (!appointment) {
          return throwError(() => new Error('Appointment not found'));
        }

        if (appointment.status !== 'scheduled') {
          return throwError(() => new Error('Only scheduled appointments can be marked as no-show'));
        }

        return this.updateAppointmentStatus(appointmentId, 'no-show', {});
      })
    );
  }

  /**
   * Update appointment status
   */
  private updateAppointmentStatus(
    appointmentId: string, 
    status: AppointmentStatus, 
    additionalUpdates: Partial<Appointment>
  ): Observable<Appointment | null> {
    const updates: Partial<Appointment> = {
      status,
      ...additionalUpdates,
    };

    if (this.networkService.isOnline()) {
      return this.http.patch<Appointment>(`${this.apiUrl}/${appointmentId}/status`, updates).pipe(
        switchMap(async (updatedAppointment) => {
          console.log('[AppointmentService] Status updated');
          await this.cacheAppointment(updatedAppointment);
          return updatedAppointment;
        }),
        catchError((error) => {
          console.error('[AppointmentService] Update status error:', error);
          return throwError(() => error);
        })
      );
    } else {
      return from(this.updateAppointmentOffline(appointmentId, updates));
    }
  }

  /**
   * Create service history record when appointment is completed
   */
  private async createServiceHistoryRecord(appointment: Appointment): Promise<void> {
    try {
      const historyRecord = {
        appointmentId: appointment.id,
        customerId: appointment.customerId,
        vehicleId: appointment.vehicleId,
        serviceDate: appointment.completionTime || new Date().toISOString(),
        services: appointment.serviceTypes,
        technicianId: appointment.technicianId,
        duration: appointment.duration,
        notes: appointment.notes,
      };

      // This would typically call a service history API
      // For now, we'll just log it
      console.log('[AppointmentService] Service history record created:', historyRecord);
      
      // TODO: Implement actual service history API call
      // await this.http.post(`${environment.apiBaseUrl}/service-history`, historyRecord).toPromise();
    } catch (error) {
      console.error('[AppointmentService] Failed to create service history record:', error);
    }
  }

  /**
   * Cache Management
   */

  /**
   * Initialize cache with appointments for next 7 days
   */
  initializeCache(): Observable<void> {
    console.log('[AppointmentService] Initializing cache');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    return this.getAppointmentsByDateRange(today, sevenDaysLater).pipe(
      map(() => {
        console.log('[AppointmentService] Cache initialized');
        return undefined;
      })
    );
  }

  /**
   * Refresh cache
   */
  refreshCache(): Observable<void> {
    console.log('[AppointmentService] Refreshing cache');
    return this.initializeCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): Observable<any> {
    return from(this.cacheRepo.getStats());
  }

  /**
   * Evict old appointments from cache
   */
  evictOldAppointments(): Observable<void> {
    console.log('[AppointmentService] Evicting old appointments');
    return from(this.cacheRepo.evictOldAppointments());
  }

  /**
   * Offline Sync and Conflict Resolution
   */

  /**
   * Process queued operations when coming back online
   */
  processQueuedOperations(): Observable<{ processed: number; failed: number; conflicts: number }> {
    console.log('[AppointmentService] Processing queued operations');

    return from(this.cacheRepo.getQueuedOperations()).pipe(
      switchMap(operations => {
        if (operations.length === 0) {
          console.log('[AppointmentService] No queued operations to process');
          return of({ processed: 0, failed: 0, conflicts: 0 });
        }

        console.log('[AppointmentService] Found queued operations:', operations.length);

        let processed = 0;
        let failed = 0;
        let conflicts = 0;

        // Process operations sequentially in chronological order
        const processNext = async (index: number): Promise<void> => {
          if (index >= operations.length) {
            return;
          }

          const operation = operations[index];

          try {
            await this.processQueuedOperation(operation);
            await this.cacheRepo.removeQueuedOperation(operation.id);
            processed++;
          } catch (error: any) {
            console.error('[AppointmentService] Failed to process operation:', error);
            
            if (error.message?.includes('conflict')) {
              conflicts++;
              await this.cacheRepo.removeQueuedOperation(operation.id);
            } else if (operation.retryCount >= operation.maxRetries) {
              failed++;
              await this.cacheRepo.removeQueuedOperation(operation.id);
            } else {
              // Increment retry count
              operation.retryCount++;
              await this.cacheRepo.queueOperation(operation);
            }
          }

          await processNext(index + 1);
        };

        return from(processNext(0)).pipe(
          map(() => ({ processed, failed, conflicts }))
        );
      })
    );
  }

  /**
   * Process a single queued operation
   */
  private async processQueuedOperation(operation: QueuedAppointmentOperation): Promise<void> {
    console.log('[AppointmentService] Processing operation:', operation.operation, operation.appointmentId);

    switch (operation.operation) {
      case 'create':
        await this.syncCreateOperation(operation);
        break;
      case 'update':
        await this.syncUpdateOperation(operation);
        break;
      case 'delete':
        await this.syncDeleteOperation(operation);
        break;
      case 'status-change':
        await this.syncStatusChangeOperation(operation);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.operation}`);
    }
  }

  /**
   * Sync create operation
   */
  private async syncCreateOperation(operation: QueuedAppointmentOperation): Promise<void> {
    if (!operation.data) {
      throw new Error('No data for create operation');
    }

    // Re-validate time slot availability
    const scheduledDateTime = new Date(operation.data.scheduledDateTime!);
    const isAvailable = await this.timeSlotValidator.isTimeSlotAvailable(
      scheduledDateTime,
      operation.data.duration!
    );

    if (!isAvailable) {
      throw new Error('Time slot no longer available - conflict detected');
    }

    // Create on server
    const response = await this.http.post<Appointment>(this.apiUrl, operation.data).toPromise();
    
    if (response) {
      // Update local cache with server ID
      if (operation.data.id?.startsWith('offline-')) {
        await this.cacheRepo.deleteAppointment(operation.data.id);
      }
      await this.cacheAppointment(response);
    }
  }

  /**
   * Sync update operation
   */
  private async syncUpdateOperation(operation: QueuedAppointmentOperation): Promise<void> {
    if (!operation.appointmentId || !operation.data) {
      throw new Error('Missing appointmentId or data for update operation');
    }

    try {
      // Get current server version
      const serverAppointment = await this.http.get<Appointment>(`${this.apiUrl}/${operation.appointmentId}`).toPromise();
      
      if (!serverAppointment) {
        throw new Error('Appointment deleted on server - conflict detected');
      }

      // Detect version conflict
      const localVersion = operation.data.version || 1;
      if (serverAppointment.version !== localVersion - 1) {
        // Conflict detected - apply last-write-wins
        console.warn('[AppointmentService] Version conflict detected, applying last-write-wins');
        await this.resolveConflict(operation.appointmentId, operation.data, serverAppointment);
        throw new Error('Version conflict resolved - conflict detected');
      }

      // Update on server
      const response = await this.http.put<Appointment>(`${this.apiUrl}/${operation.appointmentId}`, operation.data).toPromise();
      
      if (response) {
        await this.cacheAppointment(response);
      }
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error('Appointment deleted on server - conflict detected');
      }
      throw error;
    }
  }

  /**
   * Sync delete operation
   */
  private async syncDeleteOperation(operation: QueuedAppointmentOperation): Promise<void> {
    if (!operation.appointmentId) {
      throw new Error('Missing appointmentId for delete operation');
    }

    try {
      await this.http.delete(`${this.apiUrl}/${operation.appointmentId}`).toPromise();
      await this.cacheRepo.deleteAppointment(operation.appointmentId);
    } catch (error: any) {
      if (error.status === 404) {
        // Already deleted, just remove from cache
        await this.cacheRepo.deleteAppointment(operation.appointmentId);
      } else {
        throw error;
      }
    }
  }

  /**
   * Sync status change operation
   */
  private async syncStatusChangeOperation(operation: QueuedAppointmentOperation): Promise<void> {
    if (!operation.appointmentId || !operation.data) {
      throw new Error('Missing appointmentId or data for status change operation');
    }

    try {
      const response = await this.http.patch<Appointment>(
        `${this.apiUrl}/${operation.appointmentId}/status`,
        operation.data
      ).toPromise();
      
      if (response) {
        await this.cacheAppointment(response);
      }
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error('Appointment deleted on server - conflict detected');
      }
      throw error;
    }
  }

  /**
   * Resolve conflict using last-write-wins strategy
   */
  private async resolveConflict(
    appointmentId: string,
    localData: Partial<Appointment>,
    serverData: Appointment
  ): Promise<void> {
    console.log('[AppointmentService] Resolving conflict for appointment:', appointmentId);

    // Compare timestamps
    const localTimestamp = new Date(localData.lastModifiedDate || 0);
    const serverTimestamp = new Date(serverData.lastModifiedDate || 0);

    let resolvedData: Appointment;
    let resolution: 'server-wins' | 'local-wins';

    if (localTimestamp > serverTimestamp) {
      // Local changes are newer - apply local changes
      console.log('[AppointmentService] Local changes are newer, applying local data');
      resolution = 'local-wins';
      
      // Update server with local changes
      const response = await this.http.put<Appointment>(`${this.apiUrl}/${appointmentId}`, {
        ...serverData,
        ...localData,
        version: serverData.version + 1,
      }).toPromise();
      
      resolvedData = response!;
    } else {
      // Server changes are newer - keep server data
      console.log('[AppointmentService] Server changes are newer, keeping server data');
      resolution = 'server-wins';
      resolvedData = serverData;
    }

    // Update cache with resolved data
    await this.cacheAppointment(resolvedData);

    // Notify user of conflict resolution
    this.notifyConflictResolution(appointmentId, resolution);
  }

  /**
   * Notify user of conflict resolution
   */
  private notifyConflictResolution(appointmentId: string, resolution: 'server-wins' | 'local-wins'): void {
    console.log('[AppointmentService] Conflict resolved:', appointmentId, resolution);
    
    // This would typically show a toast notification or dialog
    // For now, we'll just log it
    const message = resolution === 'server-wins'
      ? 'Appointment was modified on the server. Server changes have been applied.'
      : 'Your local changes were newer and have been applied to the server.';
    
    console.log('[AppointmentService] Conflict notification:', message);
    
    // TODO: Implement actual user notification
    // this.toastService.show(message, 'warning');
  }

  /**
   * Get sync queue status
   */
  getSyncQueueStatus(): Observable<{ pendingOperations: number; lastSync?: Date }> {
    return from(this.cacheRepo.getQueueCount()).pipe(
      map(count => ({
        pendingOperations: count,
        lastSync: undefined, // Would track last successful sync
      }))
    );
  }

  /**
   * Clear sync queue (for testing/debugging)
   */
  clearSyncQueue(): Observable<void> {
    console.log('[AppointmentService] Clearing sync queue');
    return from(this.cacheRepo.clearQueue());
  }

  /**
   * Sync cache with server (refresh all cached appointments)
   */
  syncCache(): Observable<void> {
    console.log('[AppointmentService] Syncing cache with server');

    if (!this.networkService.isOnline()) {
      console.warn('[AppointmentService] Cannot sync cache while offline');
      return of(undefined);
    }

    // First process any queued operations
    return this.processQueuedOperations().pipe(
      switchMap(() => {
        // Then refresh cache
        return this.refreshCache();
      })
    );
  }
}
