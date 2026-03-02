import { Injectable } from '@angular/core';
import { IndexedDBRepository } from './indexeddb.repository';
import { Customer, CustomerSearchCriteria, CustomerSummary, CachedCustomer, CacheStats } from '../models/customer.model';

/**
 * Customer Cache Repository
 * Extends IndexedDBRepository for customer-specific caching with LRU eviction
 * Max capacity: 500 customers
 */
@Injectable({
  providedIn: 'root',
})
export class CustomerCacheRepository extends IndexedDBRepository {
  private readonly STORE_NAME = 'customer-cache';
  private readonly MAX_CUSTOMERS = 500;

  constructor() {
    super();
  }

  /**
   * Save customer to cache
   */
  async save(customer: Customer): Promise<void> {
    console.log('[CustomerCacheRepository] Saving customer:', customer.id);

    // Check if we need to evict old entries
    const count = await this.count(this.STORE_NAME);
    if (count >= this.MAX_CUSTOMERS) {
      await this.evictOldest();
    }

    const cachedCustomer: CachedCustomer = {
      ...customer,
      cachedAt: new Date(),
      syncStatus: 'synced'
    };

    await this.put(this.STORE_NAME, cachedCustomer);
    console.log('[CustomerCacheRepository] Customer saved to cache');
  }

  /**
   * Get customer by ID
   */
  async getById(customerId: string): Promise<Customer | null> {
    console.log('[CustomerCacheRepository] Getting customer:', customerId);
    
    const cachedCustomer = await this.get<CachedCustomer>(this.STORE_NAME, customerId);
    
    if (cachedCustomer) {
      // Update access time for LRU
      cachedCustomer.cachedAt = new Date();
      await this.put(this.STORE_NAME, cachedCustomer);
      
      // Return customer without cache metadata
      const { cachedAt, syncStatus, ...customer } = cachedCustomer;
      return customer as Customer;
    }
    
    return null;
  }

  /**
   * Update customer in cache
   */
  async update(customerId: string, updates: Partial<Customer>): Promise<void> {
    console.log('[CustomerCacheRepository] Updating customer:', customerId);
    
    const existing = await this.get<CachedCustomer>(this.STORE_NAME, customerId);
    
    if (existing) {
      const updated: CachedCustomer = {
        ...existing,
        ...updates,
        id: customerId, // Ensure ID doesn't change
        cachedAt: new Date(),
        syncStatus: 'pending'
      };
      
      await this.put(this.STORE_NAME, updated);
      console.log('[CustomerCacheRepository] Customer updated in cache');
    } else {
      console.warn('[CustomerCacheRepository] Customer not found in cache:', customerId);
    }
  }

  /**
   * Delete customer from cache
   */
  async deleteCustomer(customerId: string): Promise<void> {
    console.log('[CustomerCacheRepository] Deleting customer:', customerId);
    await this.delete(this.STORE_NAME, customerId);
  }

  /**
   * Search customers by criteria
   */
  async search(criteria: CustomerSearchCriteria): Promise<CustomerSummary[]> {
    console.log('[CustomerCacheRepository] Searching customers:', criteria);
    
    const allCustomers = await this.getAll<CachedCustomer>(this.STORE_NAME);
    let results: CachedCustomer[] = [];

    // Apply search filters
    if (criteria.phone) {
      results = allCustomers.filter(c => c.phone === criteria.phone);
    } else if (criteria.email) {
      results = allCustomers.filter(c => c.email === criteria.email);
    } else if (criteria.lastName) {
      const searchTerm = criteria.lastName.toLowerCase();
      results = allCustomers.filter(c => 
        c.lastName.toLowerCase().includes(searchTerm)
      );
    } else if (criteria.vehicleVin) {
      results = allCustomers.filter(c => 
        c.vehicles.some(v => v.vin === criteria.vehicleVin)
      );
    } else if (criteria.licensePlate) {
      results = allCustomers.filter(c => 
        c.vehicles.some(v => v.licensePlate === criteria.licensePlate)
      );
    } else if (criteria.searchTerm) {
      const searchTerm = criteria.searchTerm.toLowerCase();
      results = allCustomers.filter(c => 
        c.firstName.toLowerCase().includes(searchTerm) ||
        c.lastName.toLowerCase().includes(searchTerm) ||
        c.phone.includes(searchTerm) ||
        c.email.toLowerCase().includes(searchTerm)
      );
    } else {
      results = allCustomers;
    }

    // Convert to CustomerSummary and sort by last visit date
    const summaries: CustomerSummary[] = results.map(c => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      phone: c.phone,
      email: c.email,
      lastVisit: c.lastVisitDate,
      totalVisits: c.totalVisits,
      primaryVehicle: c.vehicles.find(v => v.isPrimary)?.make + ' ' + 
                      c.vehicles.find(v => v.isPrimary)?.model || undefined,
      loyaltyTier: c.loyaltyProgram?.tier
    }));

    // Sort by last visit date descending
    summaries.sort((a, b) => {
      if (!a.lastVisit) return 1;
      if (!b.lastVisit) return -1;
      return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
    });

    console.log('[CustomerCacheRepository] Found customers:', summaries.length);
    return summaries;
  }

  /**
   * Search customers by phone number
   */
  async searchByPhone(phone: string): Promise<Customer[]> {
    console.log('[CustomerCacheRepository] Searching by phone:', phone);
    
    const allCustomers = await this.getAll<CachedCustomer>(this.STORE_NAME);
    const results = allCustomers.filter(c => c.phone === phone);
    
    return results.map(c => {
      const { cachedAt, syncStatus, ...customer } = c;
      return customer as Customer;
    });
  }

  /**
   * Search customers by email address
   */
  async searchByEmail(email: string): Promise<Customer[]> {
    console.log('[CustomerCacheRepository] Searching by email:', email);
    
    const allCustomers = await this.getAll<CachedCustomer>(this.STORE_NAME);
    const results = allCustomers.filter(c => c.email === email);
    
    return results.map(c => {
      const { cachedAt, syncStatus, ...customer } = c;
      return customer as Customer;
    });
  }

  /**
   * Search customers by last name
   */
  async searchByLastName(lastName: string): Promise<Customer[]> {
    console.log('[CustomerCacheRepository] Searching by last name:', lastName);
    
    const allCustomers = await this.getAll<CachedCustomer>(this.STORE_NAME);
    const searchTerm = lastName.toLowerCase();
    const results = allCustomers.filter(c => 
      c.lastName.toLowerCase().includes(searchTerm)
    );
    
    return results.map(c => {
      const { cachedAt, syncStatus, ...customer } = c;
      return customer as Customer;
    });
  }

  /**
   * Search customer by VIN
   */
  async searchByVin(vin: string): Promise<Customer | null> {
    console.log('[CustomerCacheRepository] Searching by VIN:', vin);
    
    const allCustomers = await this.getAll<CachedCustomer>(this.STORE_NAME);
    const result = allCustomers.find(c => 
      c.vehicles.some(v => v.vin === vin)
    );
    
    if (result) {
      const { cachedAt, syncStatus, ...customer } = result;
      return customer as Customer;
    }
    
    return null;
  }

  /**
   * Search customer by license plate
   */
  async searchByLicensePlate(plate: string): Promise<Customer | null> {
    console.log('[CustomerCacheRepository] Searching by license plate:', plate);
    
    const allCustomers = await this.getAll<CachedCustomer>(this.STORE_NAME);
    const result = allCustomers.find(c => 
      c.vehicles.some(v => v.licensePlate === plate)
    );
    
    if (result) {
      const { cachedAt, syncStatus, ...customer } = result;
      return customer as Customer;
    }
    
    return null;
  }

  /**
   * Evict oldest cached customer (LRU strategy)
   */
  async evictOldest(): Promise<void> {
    console.log('[CustomerCacheRepository] Evicting oldest customer');
    
    const allCustomers = await this.getAll<CachedCustomer>(this.STORE_NAME);
    
    if (allCustomers.length === 0) {
      return;
    }

    // Find oldest by cachedAt timestamp
    const oldest = allCustomers.reduce((prev, current) => 
      new Date(prev.cachedAt).getTime() < new Date(current.cachedAt).getTime() ? prev : current
    );

    await this.delete(this.STORE_NAME, oldest.id);
    console.log('[CustomerCacheRepository] Evicted customer:', oldest.id);
  }

  /**
   * Clear all cached customers
   */
  async clearCache(): Promise<void> {
    console.log('[CustomerCacheRepository] Clearing all cached customers');
    await this.clear(this.STORE_NAME);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const allCustomers = await this.getAll<CachedCustomer>(this.STORE_NAME);
    
    if (allCustomers.length === 0) {
      return {
        totalCustomers: 0,
        cacheSize: 0
      };
    }

    const timestamps = allCustomers.map(c => new Date(c.cachedAt).getTime());
    
    return {
      totalCustomers: allCustomers.length,
      cacheSize: allCustomers.length,
      oldestEntry: new Date(Math.min(...timestamps)),
      newestEntry: new Date(Math.max(...timestamps))
    };
  }
}
