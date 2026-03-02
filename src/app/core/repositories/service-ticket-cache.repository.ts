import { Injectable } from '@angular/core';
import { IndexedDBRepository } from './indexeddb.repository';
import {
  ServiceTicket,
  TicketSearchCriteria,
  TicketSummary,
  TicketStatus,
  CachedServiceTicket,
  QueuedTicketOperation,
  CacheStats,
} from '../models/service-ticket.model';

/**
 * Service Ticket Cache Repository
 * Extends IndexedDBRepository for ticket-specific caching with LRU eviction
 * Implements Least Recently Used eviction strategy to manage storage limits
 */
@Injectable({
  providedIn: 'root',
})
export class ServiceTicketCacheRepository extends IndexedDBRepository {
  private readonly TICKET_STORE = 'service-tickets';
  private readonly QUEUE_STORE = 'ticket-queue';
  private readonly CAPACITY_TRIGGER = 0.8; // 80% capacity triggers eviction
  private readonly CAPACITY_TARGET = 0.7; // Evict until 70% capacity

  constructor() {
    super();
  }

  /**
   * Save ticket to cache with access tracking
   */
  async save(ticket: ServiceTicket): Promise<void> {
    console.log('[ServiceTicketCacheRepository] Saving ticket:', ticket.id);

    // Check if eviction needed
    await this.checkAndEvictIfNeeded();

    const cachedTicket: CachedServiceTicket = {
      ...ticket,
      cachedAt: new Date(),
      lastAccessedAt: new Date(),
      syncStatus: 'synced',
      accessCount: 0,
    };

    await this.put(this.TICKET_STORE, cachedTicket);
    console.log('[ServiceTicketCacheRepository] Ticket saved to cache');
  }

  /**
   * Get ticket by ID and update access time
   */
  async getById(ticketId: string): Promise<ServiceTicket | null> {
    console.log('[ServiceTicketCacheRepository] Getting ticket:', ticketId);

    const cachedTicket = await this.get<CachedServiceTicket>(
      this.TICKET_STORE,
      ticketId
    );

    if (cachedTicket) {
      // Update access time for LRU
      await this.updateAccessTime(ticketId);

      // Return ticket without cache metadata
      const { cachedAt, lastAccessedAt, syncStatus, accessCount, ...ticket } =
        cachedTicket;
      return ticket as ServiceTicket;
    }

    return null;
  }

  /**
   * Update ticket in cache
   */
  async update(
    ticketId: string,
    updates: Partial<ServiceTicket>
  ): Promise<void> {
    console.log('[ServiceTicketCacheRepository] Updating ticket:', ticketId);

    const existing = await this.get<CachedServiceTicket>(
      this.TICKET_STORE,
      ticketId
    );

    if (existing) {
      const updated: CachedServiceTicket = {
        ...existing,
        ...updates,
        id: ticketId, // Ensure ID doesn't change
        lastAccessedAt: new Date(),
        syncStatus: 'pending',
      };

      await this.put(this.TICKET_STORE, updated);
      console.log('[ServiceTicketCacheRepository] Ticket updated in cache');
    } else {
      console.warn('[ServiceTicketCacheRepository] Ticket not found in cache:', ticketId);
    }
  }

  /**
   * Delete ticket from cache
   */
  async deleteTicket(ticketId: string): Promise<void> {
    console.log('[ServiceTicketCacheRepository] Deleting ticket:', ticketId);
    await this.delete(this.TICKET_STORE, ticketId);
  }

  /**
   * Search tickets by criteria
   */
  async search(criteria: TicketSearchCriteria): Promise<TicketSummary[]> {
    console.log('[ServiceTicketCacheRepository] Searching tickets:', criteria);

    const allTickets = await this.getAll<CachedServiceTicket>(this.TICKET_STORE);
    let results: CachedServiceTicket[] = [];

    // Apply search filters
    if (criteria.ticketNumber) {
      results = allTickets.filter(
        (t) => t.ticketNumber === criteria.ticketNumber
      );
    } else if (criteria.customerId) {
      results = allTickets.filter((t) => t.customerId === criteria.customerId);
    } else if (criteria.customerName) {
      const searchTerm = criteria.customerName.toLowerCase();
      results = allTickets.filter((t) =>
        t.customerName.toLowerCase().includes(searchTerm)
      );
    } else if (criteria.vehicleId) {
      results = allTickets.filter((t) => t.vehicleId === criteria.vehicleId);
    } else if (criteria.vehicleVin) {
      results = allTickets.filter(
        (t) => t.vehicleInfo.vin === criteria.vehicleVin
      );
    } else if (criteria.status) {
      results = allTickets.filter((t) => t.status === criteria.status);
    } else if (criteria.technicianId) {
      results = allTickets.filter(
        (t) => t.assignedTechnicianId === criteria.technicianId
      );
    } else if (criteria.startDate || criteria.endDate) {
      results = allTickets.filter((t) => {
        const ticketDate = new Date(t.createdDate);
        if (criteria.startDate && ticketDate < new Date(criteria.startDate)) {
          return false;
        }
        if (criteria.endDate && ticketDate > new Date(criteria.endDate)) {
          return false;
        }
        return true;
      });
    } else {
      results = allTickets;
    }

    // Convert to TicketSummary
    const summaries: TicketSummary[] = results.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      customerName: t.customerName,
      vehicleInfo: `${t.vehicleInfo.year} ${t.vehicleInfo.make} ${t.vehicleInfo.model}`,
      status: t.status,
      total: t.total,
      assignedTechnician: t.assignedTechnicianName,
      createdDate: t.createdDate,
      serviceCount: t.lineItems.length,
    }));

    // Sort by creation date descending
    summaries.sort(
      (a, b) =>
        new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );

    console.log('[ServiceTicketCacheRepository] Found tickets:', summaries.length);
    return summaries;
  }

  /**
   * Search ticket by ticket number (exact match)
   */
  async searchByTicketNumber(
    ticketNumber: string
  ): Promise<ServiceTicket | null> {
    console.log('[ServiceTicketCacheRepository] Searching by ticket number:', ticketNumber);

    const allTickets = await this.getAll<CachedServiceTicket>(this.TICKET_STORE);
    const result = allTickets.find((t) => t.ticketNumber === ticketNumber);

    if (result) {
      await this.updateAccessTime(result.id);
      const { cachedAt, lastAccessedAt, syncStatus, accessCount, ...ticket } =
        result;
      return ticket as ServiceTicket;
    }

    return null;
  }

  /**
   * Search tickets by customer ID
   */
  async searchByCustomer(customerId: string): Promise<ServiceTicket[]> {
    console.log('[ServiceTicketCacheRepository] Searching by customer:', customerId);

    const allTickets = await this.getAll<CachedServiceTicket>(this.TICKET_STORE);
    const results = allTickets.filter((t) => t.customerId === customerId);

    return results.map((t) => {
      const { cachedAt, lastAccessedAt, syncStatus, accessCount, ...ticket } = t;
      return ticket as ServiceTicket;
    });
  }

  /**
   * Search tickets by vehicle ID
   */
  async searchByVehicle(vehicleId: string): Promise<ServiceTicket[]> {
    console.log('[ServiceTicketCacheRepository] Searching by vehicle:', vehicleId);

    const allTickets = await this.getAll<CachedServiceTicket>(this.TICKET_STORE);
    const results = allTickets.filter((t) => t.vehicleId === vehicleId);

    return results.map((t) => {
      const { cachedAt, lastAccessedAt, syncStatus, accessCount, ...ticket } = t;
      return ticket as ServiceTicket;
    });
  }

  /**
   * Search tickets by status
   */
  async searchByStatus(status: TicketStatus): Promise<ServiceTicket[]> {
    console.log('[ServiceTicketCacheRepository] Searching by status:', status);

    const allTickets = await this.getAll<CachedServiceTicket>(this.TICKET_STORE);
    const results = allTickets.filter((t) => t.status === status);

    return results.map((t) => {
      const { cachedAt, lastAccessedAt, syncStatus, accessCount, ...ticket } = t;
      return ticket as ServiceTicket;
    });
  }

  /**
   * Search tickets by technician ID
   */
  async searchByTechnician(technicianId: string): Promise<ServiceTicket[]> {
    console.log('[ServiceTicketCacheRepository] Searching by technician:', technicianId);

    const allTickets = await this.getAll<CachedServiceTicket>(this.TICKET_STORE);
    const results = allTickets.filter(
      (t) => t.assignedTechnicianId === technicianId
    );

    return results.map((t) => {
      const { cachedAt, lastAccessedAt, syncStatus, accessCount, ...ticket } = t;
      return ticket as ServiceTicket;
    });
  }

  /**
   * Search tickets by date range
   */
  async searchByDateRange(
    startDate: string,
    endDate: string
  ): Promise<ServiceTicket[]> {
    console.log('[ServiceTicketCacheRepository] Searching by date range:', startDate, endDate);

    const allTickets = await this.getAll<CachedServiceTicket>(this.TICKET_STORE);
    const start = new Date(startDate);
    const end = new Date(endDate);

    const results = allTickets.filter((t) => {
      const ticketDate = new Date(t.createdDate);
      return ticketDate >= start && ticketDate <= end;
    });

    return results.map((t) => {
      const { cachedAt, lastAccessedAt, syncStatus, accessCount, ...ticket } = t;
      return ticket as ServiceTicket;
    });
  }

  /**
   * Update access time for LRU tracking
   */
  async updateAccessTime(ticketId: string): Promise<void> {
    const ticket = await this.get<CachedServiceTicket>(
      this.TICKET_STORE,
      ticketId
    );

    if (ticket) {
      ticket.lastAccessedAt = new Date();
      ticket.accessCount = (ticket.accessCount || 0) + 1;
      await this.put(this.TICKET_STORE, ticket);
    }
  }

  /**
   * Check storage capacity and trigger eviction if needed
   */
  private async checkAndEvictIfNeeded(): Promise<void> {
    // For now, use count-based eviction (can be enhanced with actual storage size)
    const count = await this.count(this.TICKET_STORE);
    const maxCapacity = 1000; // Maximum tickets in cache

    const percentUsed = count / maxCapacity;

    if (percentUsed >= this.CAPACITY_TRIGGER) {
      console.log('[ServiceTicketCacheRepository] Capacity trigger reached, starting eviction');
      await this.evictUntilThreshold();
    }
  }

  /**
   * Evict tickets until storage is below target threshold
   */
  private async evictUntilThreshold(): Promise<void> {
    const maxCapacity = 1000;
    const targetCount = Math.floor(maxCapacity * this.CAPACITY_TARGET);

    let currentCount = await this.count(this.TICKET_STORE);

    while (currentCount > targetCount) {
      const evicted = await this.evictOldest();
      if (!evicted) {
        // No more evictable tickets
        console.warn('[ServiceTicketCacheRepository] No more evictable tickets found');
        break;
      }
      currentCount = await this.count(this.TICKET_STORE);
    }

    console.log('[ServiceTicketCacheRepository] Eviction complete, current count:', currentCount);
  }

  /**
   * Evict oldest ticket (LRU strategy)
   * Protects tickets in queue and Created/In_Progress status
   */
  async evictOldest(): Promise<boolean> {
    console.log('[ServiceTicketCacheRepository] Evicting oldest ticket');

    const allTickets = await this.getAll<CachedServiceTicket>(this.TICKET_STORE);

    if (allTickets.length === 0) {
      return false;
    }

    // Get tickets in queue (protected from eviction)
    const queuedTicketIds = await this.getTicketsInQueue();

    // Filter evictable tickets (not in queue, prefer Completed/Paid over Created/In_Progress)
    const evictableTickets = allTickets.filter(
      (t) => !queuedTicketIds.includes(t.id)
    );

    if (evictableTickets.length === 0) {
      return false;
    }

    // Prioritize eviction: Paid > Completed > Created > In_Progress
    const priorityOrder: Record<TicketStatus, number> = {
      Paid: 1,
      Completed: 2,
      Created: 3,
      In_Progress: 4,
    };

    // Sort by priority, then by last accessed time
    evictableTickets.sort((a, b) => {
      const priorityDiff = priorityOrder[a.status] - priorityOrder[b.status];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      return (
        new Date(a.lastAccessedAt).getTime() -
        new Date(b.lastAccessedAt).getTime()
      );
    });

    const candidate = evictableTickets[0];

    // Log eviction for audit
    console.log('[ServiceTicketCacheRepository] Evicting ticket:', {
      id: candidate.id,
      ticketNumber: candidate.ticketNumber,
      status: candidate.status,
      lastAccessedAt: candidate.lastAccessedAt,
    });

    await this.delete(this.TICKET_STORE, candidate.id);
    return true;
  }

  /**
   * Get ticket IDs in sync queue (protected from eviction)
   */
  async getTicketsInQueue(): Promise<string[]> {
    const queuedOps = await this.getAll<QueuedTicketOperation>(this.QUEUE_STORE);
    return queuedOps
      .filter((op) => op.ticketId)
      .map((op) => op.ticketId as string);
  }

  /**
   * Check if ticket is in sync queue
   */
  async isTicketInQueue(ticketId: string): Promise<boolean> {
    const queuedIds = await this.getTicketsInQueue();
    return queuedIds.includes(ticketId);
  }

  /**
   * Clear all cached tickets
   */
  async clearCache(): Promise<void> {
    console.log('[ServiceTicketCacheRepository] Clearing all cached tickets');
    await this.clear(this.TICKET_STORE);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const allTickets = await this.getAll<CachedServiceTicket>(this.TICKET_STORE);

    if (allTickets.length === 0) {
      return {
        totalTickets: 0,
        ticketsByStatus: {
          Created: 0,
          In_Progress: 0,
          Completed: 0,
          Paid: 0,
        },
        oldestTicket: new Date(),
        newestTicket: new Date(),
        totalSize: 0,
        pendingSync: 0,
      };
    }

    const ticketsByStatus: Record<TicketStatus, number> = {
      Created: 0,
      In_Progress: 0,
      Completed: 0,
      Paid: 0,
    };

    allTickets.forEach((t) => {
      ticketsByStatus[t.status]++;
    });

    const timestamps = allTickets.map((t) =>
      new Date(t.cachedAt).getTime()
    );
    const pendingSync = allTickets.filter(
      (t) => t.syncStatus === 'pending'
    ).length;

    return {
      totalTickets: allTickets.length,
      ticketsByStatus,
      oldestTicket: new Date(Math.min(...timestamps)),
      newestTicket: new Date(Math.max(...timestamps)),
      totalSize: allTickets.length, // Simplified size calculation
      pendingSync,
    };
  }
}
