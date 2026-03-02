/**
 * Appointment Cache Repository
 * 
 * Manages appointment caching in IndexedDB with support for:
 * - CRUD operations
 * - Search and filtering
 * - Date-based queries
 * - Cache eviction
 * - Preloaded customer and vehicle data
 */

import { Injectable } from '@angular/core';
import { IndexedDBRepository } from './indexeddb.repository';
import { CachedAppointment, QueuedAppointmentOperation } from '../models/appointment-cache.model';
import { Appointment, AppointmentSearchCriteria, AppointmentStatus, CacheStats } from '../models/appointment.model';

@Injectable({
  providedIn: 'root',
})
export class AppointmentCacheRepository extends IndexedDBRepository {
  private readonly STORE_NAME = 'appointments';
  private readonly QUEUE_STORE_NAME = 'appointment-queue';

  /**
   * Save appointment to cache
   */
  async save(appointment: CachedAppointment): Promise<void> {
    await this.put(this.STORE_NAME, appointment);
  }

  /**
   * Get appointment by ID
   */
  async getById(appointmentId: string): Promise<CachedAppointment | null> {
    return await this.get<CachedAppointment>(this.STORE_NAME, appointmentId);
  }

  /**
   * Get all appointments for a specific date
   * Returns appointments sorted by start time
   */
  async getByDate(date: Date): Promise<CachedAppointment[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.getByDateRange(startOfDay, endOfDay);
  }

  /**
   * Get all appointments within a date range
   * Returns appointments sorted by start time, then by service bay
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<CachedAppointment[]> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('scheduledDateTime');
      
      const range = IDBKeyRange.bound(
        startDate.toISOString(),
        endDate.toISOString()
      );
      
      const request = index.getAll(range);

      request.onsuccess = () => {
        const appointments = request.result || [];
        
        // Sort by scheduledDateTime, then by serviceBay
        appointments.sort((a, b) => {
          const timeCompare = a.scheduledDateTime.localeCompare(b.scheduledDateTime);
          if (timeCompare !== 0) return timeCompare;
          return a.serviceBay - b.serviceBay;
        });
        
        resolve(appointments);
      };

      request.onerror = () => {
        reject(new Error('Failed to get appointments by date range'));
      };
    });
  }

  /**
   * Update appointment in cache
   */
  async update(appointmentId: string, updates: Partial<CachedAppointment>): Promise<void> {
    const existing = await this.getById(appointmentId);
    if (!existing) {
      throw new Error(`Appointment ${appointmentId} not found in cache`);
    }

    const updated: CachedAppointment = {
      ...existing,
      ...updates,
      id: appointmentId, // Ensure ID doesn't change
    };

    await this.save(updated);
  }

  /**
   * Delete appointment from cache
   */
  async deleteAppointment(appointmentId: string): Promise<void> {
    await this.delete(this.STORE_NAME, appointmentId);
  }

  /**
   * Search appointments by criteria
   */
  async search(criteria: AppointmentSearchCriteria): Promise<CachedAppointment[]> {
    let appointments = await this.getAll<CachedAppointment>(this.STORE_NAME);

    // Apply filters
    if (criteria.customerId) {
      appointments = appointments.filter(apt => apt.customerId === criteria.customerId);
    }

    if (criteria.vehicleId) {
      appointments = appointments.filter(apt => apt.vehicleId === criteria.vehicleId);
    }

    if (criteria.status) {
      appointments = appointments.filter(apt => apt.status === criteria.status);
    }

    if (criteria.serviceType) {
      appointments = appointments.filter(apt => 
        apt.serviceTypes.includes(criteria.serviceType!)
      );
    }

    if (criteria.technicianId) {
      appointments = appointments.filter(apt => apt.technicianId === criteria.technicianId);
    }

    if (criteria.startDate && criteria.endDate) {
      const start = criteria.startDate.toISOString();
      const end = criteria.endDate.toISOString();
      appointments = appointments.filter(apt => 
        apt.scheduledDateTime >= start && apt.scheduledDateTime <= end
      );
    }

    if (criteria.searchTerm) {
      const term = criteria.searchTerm.toLowerCase();
      appointments = appointments.filter(apt => {
        // Search in customer name
        if (apt.customerData?.name.toLowerCase().includes(term)) return true;
        
        // Search in vehicle info
        if (apt.vehicleData) {
          const vehicleStr = `${apt.vehicleData.year} ${apt.vehicleData.make} ${apt.vehicleData.model}`.toLowerCase();
          if (vehicleStr.includes(term)) return true;
          
          if (apt.vehicleData.vin.toLowerCase().includes(term)) return true;
          if (apt.vehicleData.licensePlate?.toLowerCase().includes(term)) return true;
        }
        
        return false;
      });
    }

    // Sort by scheduled date/time
    appointments.sort((a, b) => a.scheduledDateTime.localeCompare(b.scheduledDateTime));

    return appointments;
  }

  /**
   * Filter appointments by status
   */
  async filterByStatus(status: AppointmentStatus): Promise<CachedAppointment[]> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('status');
      
      const request = index.getAll(status);

      request.onsuccess = () => {
        const appointments = request.result || [];
        appointments.sort((a, b) => a.scheduledDateTime.localeCompare(b.scheduledDateTime));
        resolve(appointments);
      };

      request.onerror = () => {
        reject(new Error('Failed to filter appointments by status'));
      };
    });
  }

  /**
   * Filter appointments by technician
   */
  async filterByTechnician(technicianId: string): Promise<CachedAppointment[]> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('technicianId');
      
      const request = index.getAll(technicianId);

      request.onsuccess = () => {
        const appointments = request.result || [];
        appointments.sort((a, b) => a.scheduledDateTime.localeCompare(b.scheduledDateTime));
        resolve(appointments);
      };

      request.onerror = () => {
        reject(new Error('Failed to filter appointments by technician'));
      };
    });
  }

  /**
   * Filter appointments by service type
   */
  async filterByServiceType(serviceType: string): Promise<CachedAppointment[]> {
    const appointments = await this.getAll<CachedAppointment>(this.STORE_NAME);
    
    return appointments
      .filter(apt => apt.serviceTypes.includes(serviceType))
      .sort((a, b) => a.scheduledDateTime.localeCompare(b.scheduledDateTime));
  }

  /**
   * Evict old appointments (before current date)
   */
  async evictOldAppointments(): Promise<void> {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('scheduledDateTime');
      
      const range = IDBKeyRange.upperBound(now.toISOString(), true);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to evict old appointments'));
      };
    });
  }

  /**
   * Clear all appointments from cache
   */
  async clearCache(): Promise<void> {
    await this.clear(this.STORE_NAME);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const appointments = await this.getAll<CachedAppointment>(this.STORE_NAME);
    
    if (appointments.length === 0) {
      return {
        totalAppointments: 0,
        dateRange: {
          start: new Date(),
          end: new Date(),
        },
        cacheSize: 0,
        lastRefresh: new Date(),
      };
    }

    // Find date range
    const dates = appointments.map(apt => new Date(apt.scheduledDateTime));
    const start = new Date(Math.min(...dates.map(d => d.getTime())));
    const end = new Date(Math.max(...dates.map(d => d.getTime())));

    // Estimate cache size (rough approximation)
    const jsonSize = JSON.stringify(appointments).length;

    // Find most recent cache timestamp
    const cacheTimes = appointments.map(apt => apt.cachedAt.getTime());
    const lastRefresh = new Date(Math.max(...cacheTimes));

    return {
      totalAppointments: appointments.length,
      dateRange: { start, end },
      cacheSize: jsonSize,
      lastRefresh,
    };
  }

  /**
   * Preload related customer and vehicle data for appointments
   * This is called after fetching appointments from the API
   */
  async preloadRelatedData(appointments: CachedAppointment[]): Promise<void> {
    // This method is a placeholder - the actual preloading is done
    // by the AppointmentService when fetching from the API
    // The service will fetch customer and vehicle data and attach it
    // to the CachedAppointment objects before saving to cache
    
    for (const appointment of appointments) {
      await this.save(appointment);
    }
  }

  /**
   * Queue operations
   */

  /**
   * Add operation to sync queue
   */
  async queueOperation(operation: QueuedAppointmentOperation): Promise<void> {
    await this.put(this.QUEUE_STORE_NAME, operation);
  }

  /**
   * Get all queued operations sorted by timestamp
   */
  async getQueuedOperations(): Promise<QueuedAppointmentOperation[]> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.QUEUE_STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.QUEUE_STORE_NAME);
      const index = store.index('timestamp');
      
      const request = index.getAll();

      request.onsuccess = () => {
        const operations = request.result || [];
        // Sort by timestamp (chronological order)
        operations.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        resolve(operations);
      };

      request.onerror = () => {
        reject(new Error('Failed to get queued operations'));
      };
    });
  }

  /**
   * Remove operation from queue
   */
  async removeQueuedOperation(operationId: string): Promise<void> {
    await this.delete(this.QUEUE_STORE_NAME, operationId);
  }

  /**
   * Clear all queued operations
   */
  async clearQueue(): Promise<void> {
    await this.clear(this.QUEUE_STORE_NAME);
  }

  /**
   * Get count of pending operations
   */
  async getQueueCount(): Promise<number> {
    return await this.count(this.QUEUE_STORE_NAME);
  }
}
