import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Customer, CustomerSearchCriteria, CustomerSummary } from '../../../core/models/customer.model';
import { environment } from '../../../../environments/environment';
import { CustomerCacheRepository } from '../../../core/repositories/customer-cache.repository';
import { NetworkDetectionService } from '../../../core/services/network-detection.service';

/**
 * Customer Service
 * Handles all customer-related operations with network-first strategy
 */
@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly apiUrl = `${environment.apiBaseUrl}/customers`;

  constructor(
    private http: HttpClient,
    private cacheRepo: CustomerCacheRepository,
    private networkService: NetworkDetectionService
  ) {}

  /**
   * Search customers by various criteria (network-first with cache fallback)
   */
  searchCustomers(criteria: CustomerSearchCriteria): Observable<CustomerSummary[]> {
    console.log('[CustomerService] Searching customers:', criteria);

    const params: any = {};
    if (criteria.searchTerm) params.q = criteria.searchTerm;
    if (criteria.phone) params.phone = criteria.phone;
    if (criteria.email) params.email = criteria.email;
    if (criteria.lastName) params.lastName = criteria.lastName;
    if (criteria.vehicleVin) params.vin = criteria.vehicleVin;
    if (criteria.licensePlate) params.plate = criteria.licensePlate;

    // Network-first strategy
    return this.http.get<CustomerSummary[]>(this.apiUrl, { params }).pipe(
      map((customers) => {
        console.log('[CustomerService] Found customers from API:', customers.length);
        return customers;
      }),
      catchError((error) => {
        console.warn('[CustomerService] API search failed, falling back to cache:', error.message);
        // Fallback to cache
        return from(this.cacheRepo.search(criteria));
      })
    );
  }

  /**
   * Get customer by ID (network-first with cache fallback)
   */
  getCustomerById(customerId: string): Observable<Customer | null> {
    console.log('[CustomerService] Getting customer:', customerId);

    return this.http.get<Customer>(`${this.apiUrl}/${customerId}`).pipe(
      switchMap(async (customer) => {
        console.log('[CustomerService] Customer found from API:', customer.firstName, customer.lastName);
        // Cache the result
        await this.cacheRepo.save(customer);
        return customer;
      }),
      catchError((error) => {
        console.warn('[CustomerService] API get failed, falling back to cache:', error.message);
        // Fallback to cache
        return from(this.cacheRepo.getById(customerId));
      })
    );
  }

  /**
   * Create new customer
   */
  createCustomer(customer: Partial<Customer>): Observable<Customer | null> {
    console.log('[CustomerService] Creating customer:', customer.firstName, customer.lastName);

    return this.http.post<Customer>(this.apiUrl, customer).pipe(
      switchMap(async (newCustomer) => {
        console.log('[CustomerService] Customer created:', newCustomer.id);
        // Cache the new customer
        await this.cacheRepo.save(newCustomer);
        return newCustomer;
      }),
      catchError((error) => {
        console.error('[CustomerService] Create customer error:', error);
        return of(null);
      })
    );
  }

  /**
   * Update existing customer
   */
  updateCustomer(customerId: string, updates: Partial<Customer>): Observable<Customer | null> {
    console.log('[CustomerService] Updating customer:', customerId);

    return this.http.put<Customer>(`${this.apiUrl}/${customerId}`, updates).pipe(
      switchMap(async (updatedCustomer) => {
        console.log('[CustomerService] Customer updated:', updatedCustomer.id);
        // Update cache
        await this.cacheRepo.save(updatedCustomer);
        return updatedCustomer;
      }),
      catchError((error) => {
        console.error('[CustomerService] Update customer error:', error);
        return of(null);
      })
    );
  }

  /**
   * Delete customer
   */
  deleteCustomer(customerId: string): Observable<boolean> {
    console.log('[CustomerService] Deleting customer:', customerId);

    return this.http.delete(`${this.apiUrl}/${customerId}`).pipe(
      switchMap(async () => {
        console.log('[CustomerService] Customer deleted:', customerId);
        // Remove from cache
        await this.cacheRepo.deleteCustomer(customerId);
        return true;
      }),
      catchError((error) => {
        console.error('[CustomerService] Delete customer error:', error);
        return of(false);
      })
    );
  }

  /**
   * Get customer service history
   */
  getServiceHistory(customerId: string): Observable<any[]> {
    console.log('[CustomerService] Getting service history:', customerId);

    return this.http.get<any[]>(`${this.apiUrl}/${customerId}/history`).pipe(
      map((history) => {
        console.log('[CustomerService] Service history found:', history.length);
        return history;
      }),
      catchError((error) => {
        console.error('[CustomerService] Get history error:', error);
        return of([]);
      })
    );
  }

  /**
   * Add vehicle to customer
   */
  addVehicle(customerId: string, vehicle: any): Observable<any> {
    console.log('[CustomerService] Adding vehicle to customer:', customerId);

    return this.http.post<any>(`${this.apiUrl}/${customerId}/vehicles`, vehicle).pipe(
      map((newVehicle) => {
        console.log('[CustomerService] Vehicle added:', newVehicle.id);
        return newVehicle;
      }),
      catchError((error) => {
        console.error('[CustomerService] Add vehicle error:', error);
        return of(null);
      })
    );
  }

  /**
   * Update loyalty points
   */
  updateLoyaltyPoints(customerId: string, points: number): Observable<any> {
    console.log('[CustomerService] Updating loyalty points:', customerId, points);

    return this.http.patch<any>(`${this.apiUrl}/${customerId}/loyalty`, { points }).pipe(
      map((result) => {
        console.log('[CustomerService] Loyalty points updated');
        return result;
      }),
      catchError((error) => {
        console.error('[CustomerService] Update loyalty error:', error);
        return of(null);
      })
    );
  }

  /**
   * Create customer with offline queueing support
   */
  createCustomerOffline(customer: Partial<Customer>): Observable<Customer | null> {
    console.log('[CustomerService] Creating customer (offline-aware):', customer.firstName, customer.lastName);

    if (this.networkService.isOnline()) {
      return this.createCustomer(customer);
    } else {
      // Queue for later sync
      const operationId = this.generateOperationId();
      const queuedOperation = {
        id: operationId,
        url: this.apiUrl,
        method: 'POST',
        body: customer,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      return from(this.queueOperation(queuedOperation)).pipe(
        map(() => {
          console.log('[CustomerService] Customer creation queued for sync');
          // Return optimistic response
          return {
            ...customer,
            id: operationId,
            createdDate: new Date().toISOString(),
            totalVisits: 0,
            totalSpent: 0,
            vehicles: []
          } as Customer;
        })
      );
    }
  }

  /**
   * Update customer with offline queueing support
   */
  updateCustomerOffline(customerId: string, updates: Partial<Customer>): Observable<Customer | null> {
    console.log('[CustomerService] Updating customer (offline-aware):', customerId);

    if (this.networkService.isOnline()) {
      return this.updateCustomer(customerId, updates);
    } else {
      // Queue for later sync
      const operationId = this.generateOperationId();
      const queuedOperation = {
        id: operationId,
        url: `${this.apiUrl}/${customerId}`,
        method: 'PUT',
        body: updates,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      return from(this.queueOperation(queuedOperation)).pipe(
        switchMap(async () => {
          console.log('[CustomerService] Customer update queued for sync');
          // Update cache optimistically
          await this.cacheRepo.update(customerId, updates);
          return await this.cacheRepo.getById(customerId);
        })
      );
    }
  }

  /**
   * Delete customer with offline queueing support
   */
  deleteCustomerOffline(customerId: string): Observable<boolean> {
    console.log('[CustomerService] Deleting customer (offline-aware):', customerId);

    if (this.networkService.isOnline()) {
      return this.deleteCustomer(customerId);
    } else {
      // Queue for later sync
      const operationId = this.generateOperationId();
      const queuedOperation = {
        id: operationId,
        url: `${this.apiUrl}/${customerId}`,
        method: 'DELETE',
        body: null,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      return from(this.queueOperation(queuedOperation)).pipe(
        switchMap(async () => {
          console.log('[CustomerService] Customer deletion queued for sync');
          // Remove from cache optimistically
          await this.cacheRepo.deleteCustomer(customerId);
          return true;
        })
      );
    }
  }

  /**
   * Generate unique operation ID for idempotency
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Queue operation for later sync
   */
  private async queueOperation(operation: any): Promise<void> {
    // This would use RequestQueueRepository
    console.log('[CustomerService] Queueing operation:', operation.id);
    // TODO: Implement actual queueing with RequestQueueRepository
  }
}
