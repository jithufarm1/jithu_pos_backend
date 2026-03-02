import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  ServiceTicket,
  TicketSearchCriteria,
  TicketSummary,
  TicketStatus,
  TicketLineItem,
  Discount,
  TicketTotals,
  StatusHistoryEntry,
  ServiceCategory
} from '../../../core/models/service-ticket.model';
import {
  ServiceCatalog,
  ServiceItem,
  ServiceRecommendation
} from '../../../core/models/service-catalog.model';
import { environment } from '../../../../environments/environment';
import { ServiceTicketCacheRepository } from '../../../core/repositories/service-ticket-cache.repository';
import { ServiceCatalogCacheRepository } from '../../../core/repositories/service-catalog-cache.repository';
import { RequestQueueRepository } from '../../../core/repositories/request-queue.repository';
import { NetworkDetectionService } from '../../../core/services/network-detection.service';
import { calculateTicketTotals } from '../../../core/utils/pricing-calculator.util';
import { RecommendationService } from './recommendation.service';
import { WorkOrderGeneratorService } from './work-order.service';
import { WorkOrder } from '../../../core/models/service-catalog.model';

/**
 * Service Ticket Service
 * Handles all service ticket operations with network-first strategy
 */
@Injectable({
  providedIn: 'root',
})
export class ServiceTicketService {
  private readonly apiUrl = `${environment.apiBaseUrl}/tickets`;
  private readonly catalogApiUrl = `${environment.apiBaseUrl}/service-catalog`;

  constructor(
    private http: HttpClient,
    private ticketCacheRepo: ServiceTicketCacheRepository,
    private catalogCacheRepo: ServiceCatalogCacheRepository,
    private queueRepo: RequestQueueRepository,
    private networkService: NetworkDetectionService,
    private recommendationService: RecommendationService,
    private workOrderGeneratorService: WorkOrderGeneratorService
  ) {}

  // ============================================================================
  // TICKET CRUD OPERATIONS
  // ============================================================================

  /**
   * Create new service ticket
   * Generates unique ticket number in format: T-YYYYMMDD-XXXX
   */
  createTicket(ticket: Partial<ServiceTicket>): Observable<ServiceTicket | null> {
    console.log('[ServiceTicketService] Creating ticket for customer:', ticket.customerId);

    // Generate ticket number
    const ticketNumber = this.generateTicketNumber();
    
    // Initialize ticket with defaults
    const newTicket: Partial<ServiceTicket> = {
      ...ticket,
      ticketNumber,
      status: 'Created',
      lineItems: ticket.lineItems || [],
      discounts: ticket.discounts || [],
      subtotal: 0,
      tax: 0,
      taxRate: ticket.taxRate || 0.08, // Default 8% tax rate
      total: 0,
      partsTotal: 0,
      laborTotal: 0,
      totalLaborMinutes: 0,
      createdDate: new Date().toISOString(),
      statusHistory: [
        {
          status: 'Created',
          timestamp: new Date().toISOString(),
          employeeId: ticket.createdBy || 'unknown',
          employeeName: ticket.createdBy || 'Unknown'
        }
      ]
    };

    // Calculate totals
    const totals = calculateTicketTotals(newTicket as ServiceTicket);
    Object.assign(newTicket, totals);

    if (this.networkService.isOnline()) {
      return this.http.post<ServiceTicket>(this.apiUrl, newTicket).pipe(
        switchMap(async (createdTicket) => {
          console.log('[ServiceTicketService] Ticket created:', createdTicket.id);
          // Cache the new ticket
          await this.ticketCacheRepo.save(createdTicket);
          return createdTicket;
        }),
        catchError((error) => {
          console.error('[ServiceTicketService] Create ticket error:', error);
          return of(null);
        })
      );
    } else {
      // Offline: save to cache and queue for sync
      const tempId = this.generateOperationId();
      const offlineTicket: ServiceTicket = {
        ...newTicket,
        id: tempId
      } as ServiceTicket;

      return from(this.createTicketOffline(offlineTicket));
    }
  }

  /**
   * Get ticket by ID (network-first with cache fallback)
   */
  getTicketById(ticketId: string): Observable<ServiceTicket | null> {
    console.log('[ServiceTicketService] Getting ticket:', ticketId);

    return this.http.get<ServiceTicket>(`${this.apiUrl}/${ticketId}`).pipe(
      switchMap(async (ticket) => {
        console.log('[ServiceTicketService] Ticket found from API:', ticket.ticketNumber);
        // Cache the result and update access time
        await this.ticketCacheRepo.save(ticket);
        await this.ticketCacheRepo.updateAccessTime(ticketId);
        return ticket;
      }),
      catchError((error) => {
        console.warn('[ServiceTicketService] API get failed, falling back to cache:', error.message);
        // Fallback to cache
        return from(this.ticketCacheRepo.getById(ticketId));
      })
    );
  }

  /**
   * Update existing ticket
   */
  updateTicket(ticketId: string, updates: Partial<ServiceTicket>): Observable<ServiceTicket | null> {
    console.log('[ServiceTicketService] Updating ticket:', ticketId);

    // Recalculate totals if line items or discounts changed
    if (updates.lineItems || updates.discounts) {
      return from(this.ticketCacheRepo.getById(ticketId)).pipe(
        switchMap((existingTicket) => {
          if (!existingTicket) {
            return of(null);
          }

          const updatedTicket = { ...existingTicket, ...updates };
          const totals = calculateTicketTotals(updatedTicket);
          Object.assign(updatedTicket, totals);

          return this.performUpdate(ticketId, updatedTicket);
        })
      );
    }

    return this.performUpdate(ticketId, updates);
  }

  /**
   * Delete ticket (only allowed for Created status)
   */
  deleteTicket(ticketId: string): Observable<boolean> {
    console.log('[ServiceTicketService] Deleting ticket:', ticketId);

    if (this.networkService.isOnline()) {
      return this.http.delete(`${this.apiUrl}/${ticketId}`).pipe(
        switchMap(async () => {
          console.log('[ServiceTicketService] Ticket deleted:', ticketId);
          // Remove from cache
          await this.ticketCacheRepo.deleteTicket(ticketId);
          return true;
        }),
        catchError((error) => {
          console.error('[ServiceTicketService] Delete ticket error:', error);
          return of(false);
        })
      );
    } else {
      // Offline: queue for sync
      return from(this.deleteTicketOffline(ticketId));
    }
  }

  // ============================================================================
  // TICKET SEARCH AND LISTING OPERATIONS
  // ============================================================================

  /**
   * Search tickets by various criteria (network-first with cache fallback)
   */
  searchTickets(criteria: TicketSearchCriteria): Observable<TicketSummary[]> {
    console.log('[ServiceTicketService] Searching tickets:', criteria);

    const params: any = {};
    if (criteria.ticketNumber) params.ticketNumber = criteria.ticketNumber;
    if (criteria.customerId) params.customerId = criteria.customerId;
    if (criteria.customerName) params.customerName = criteria.customerName;
    if (criteria.vehicleId) params.vehicleId = criteria.vehicleId;
    if (criteria.vehicleVin) params.vehicleVin = criteria.vehicleVin;
    if (criteria.status) params.status = criteria.status;
    if (criteria.technicianId) params.technicianId = criteria.technicianId;
    if (criteria.startDate) params.startDate = criteria.startDate;
    if (criteria.endDate) params.endDate = criteria.endDate;

    // Network-first strategy
    return this.http.get<TicketSummary[]>(this.apiUrl, { params }).pipe(
      map((tickets) => {
        console.log('[ServiceTicketService] Found tickets from API:', tickets.length);
        return this.sortTicketsByDate(tickets);
      }),
      catchError((error) => {
        console.warn('[ServiceTicketService] API search failed, falling back to cache:', error.message);
        // Fallback to cache
        return from(this.ticketCacheRepo.search(criteria));
      })
    );
  }

  /**
   * Get tickets by status
   */
  getTicketsByStatus(status: TicketStatus): Observable<TicketSummary[]> {
    console.log('[ServiceTicketService] Getting tickets by status:', status);
    return this.searchTickets({ status });
  }

  /**
   * Get tickets by date range
   */
  getTicketsByDateRange(startDate: string, endDate: string): Observable<TicketSummary[]> {
    console.log('[ServiceTicketService] Getting tickets by date range:', startDate, endDate);
    return this.searchTickets({ startDate, endDate });
  }

  // ============================================================================
  // DISCOUNT MANAGEMENT
  // ============================================================================

  /**
   * Apply discount to ticket
   * Checks for manager approval requirement (>10% threshold)
   */
  applyDiscount(
    ticketId: string,
    discount: Omit<Discount, 'id' | 'amount' | 'appliedDate' | 'requiresApproval'>,
    currentUserRole?: string
  ): Observable<ServiceTicket | null> {
    console.log('[ServiceTicketService] Applying discount to ticket:', ticketId, discount);

    return from(this.ticketCacheRepo.getById(ticketId)).pipe(
      switchMap((ticket) => {
        if (!ticket) {
          console.error('[ServiceTicketService] Ticket not found:', ticketId);
          return of(null);
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (discount.type === 'percentage') {
          discountAmount = Math.round(ticket.subtotal * (discount.value / 100) * 100) / 100;
        } else {
          discountAmount = discount.value;
        }

        // Check if manager approval required (>10% of subtotal)
        const discountPercentage = (discountAmount / ticket.subtotal) * 100;
        const requiresApproval = discountPercentage > 10;

        if (requiresApproval && currentUserRole !== 'Manager') {
          console.warn('[ServiceTicketService] Discount requires manager approval');
          // In a real app, this would trigger an approval workflow
          // For now, we'll just flag it
        }

        // Create discount object
        const newDiscount: Discount = {
          id: this.generateOperationId(),
          type: discount.type,
          value: discount.value,
          amount: discountAmount,
          reason: discount.reason,
          appliedBy: discount.appliedBy,
          appliedDate: new Date().toISOString(),
          approvedBy: currentUserRole === 'Manager' ? discount.appliedBy : discount.approvedBy,
          approvalDate: currentUserRole === 'Manager' ? new Date().toISOString() : discount.approvalDate,
          requiresApproval
        };

        // Add discount to ticket
        ticket.discounts.push(newDiscount);

        // Recalculate totals
        const totals = calculateTicketTotals(ticket);
        Object.assign(ticket, totals);

        // Update ticket
        return this.updateTicket(ticketId, ticket);
      })
    );
  }

  /**
   * Remove discount from ticket
   */
  removeDiscount(ticketId: string, discountId: string): Observable<ServiceTicket | null> {
    console.log('[ServiceTicketService] Removing discount:', ticketId, discountId);

    return from(this.ticketCacheRepo.getById(ticketId)).pipe(
      switchMap((ticket) => {
        if (!ticket) {
          console.error('[ServiceTicketService] Ticket not found:', ticketId);
          return of(null);
        }

        // Remove discount
        ticket.discounts = ticket.discounts.filter(d => d.id !== discountId);

        // Recalculate totals
        const totals = calculateTicketTotals(ticket);
        Object.assign(ticket, totals);

        // Update ticket
        return this.updateTicket(ticketId, ticket);
      })
    );
  }

  // ============================================================================
  // STATUS WORKFLOW MANAGEMENT
  // ============================================================================

  /**
   * Update ticket status with transition validation
   */
  updateTicketStatus(
    ticketId: string,
    newStatus: TicketStatus,
    employeeId: string,
    employeeName: string
  ): Observable<ServiceTicket | null> {
    console.log('[ServiceTicketService] Updating ticket status:', ticketId, newStatus);

    return from(this.ticketCacheRepo.getById(ticketId)).pipe(
      switchMap((ticket) => {
        if (!ticket) {
          console.error('[ServiceTicketService] Ticket not found:', ticketId);
          return of(null);
        }

        // Validate status transition
        if (!this.isValidStatusTransition(ticket.status, newStatus)) {
          console.error('[ServiceTicketService] Invalid status transition:', ticket.status, '->', newStatus);
          return of(null);
        }

        // Update status
        ticket.status = newStatus;

        // Record timestamp based on status
        const timestamp = new Date().toISOString();
        if (newStatus === 'In_Progress') {
          ticket.startedDate = timestamp;
        } else if (newStatus === 'Completed') {
          ticket.completedDate = timestamp;
        } else if (newStatus === 'Paid') {
          ticket.paidDate = timestamp;
        }

        // Add to status history
        const historyEntry: StatusHistoryEntry = {
          status: newStatus,
          timestamp,
          employeeId,
          employeeName
        };
        ticket.statusHistory.push(historyEntry);

        // Update ticket
        return this.updateTicket(ticketId, ticket);
      })
    );
  }

  /**
   * Start work on ticket (Created → In_Progress)
   */
  startWork(ticketId: string, employeeId: string, employeeName: string): Observable<ServiceTicket | null> {
    console.log('[ServiceTicketService] Starting work on ticket:', ticketId);
    return this.updateTicketStatus(ticketId, 'In_Progress', employeeId, employeeName);
  }

  /**
   * Complete work on ticket (In_Progress → Completed)
   */
  completeWork(ticketId: string, employeeId: string, employeeName: string): Observable<ServiceTicket | null> {
    console.log('[ServiceTicketService] Completing work on ticket:', ticketId);
    return this.updateTicketStatus(ticketId, 'Completed', employeeId, employeeName);
  }

  /**
   * Mark ticket as paid (Completed → Paid)
   */
  markPaid(ticketId: string, employeeId: string, employeeName: string): Observable<ServiceTicket | null> {
    console.log('[ServiceTicketService] Marking ticket as paid:', ticketId);
    return this.updateTicketStatus(ticketId, 'Paid', employeeId, employeeName);
  }

  /**
   * Validate status transition
   */
  private isValidStatusTransition(currentStatus: TicketStatus, newStatus: TicketStatus): boolean {
    const validTransitions: Record<TicketStatus, TicketStatus[]> = {
      'Created': ['In_Progress'],
      'In_Progress': ['Completed', 'Created'], // Can revert to Created (manager only)
      'Completed': ['Paid'],
      'Paid': [] // Final state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  // ============================================================================
  // TICKET LINE ITEM OPERATIONS
  // ============================================================================

  /**
   * Add line item to ticket
   * Automatically increments quantity if service already exists
   */
  addLineItem(ticketId: string, serviceId: string, quantity: number = 1): Observable<ServiceTicket | null> {
    console.log('[ServiceTicketService] Adding line item to ticket:', ticketId, serviceId);

    return from(this.getServiceById(serviceId)).pipe(
      switchMap((service) => {
        if (!service) {
          console.error('[ServiceTicketService] Service not found:', serviceId);
          return of(null);
        }

        return from(this.ticketCacheRepo.getById(ticketId)).pipe(
          switchMap((ticket) => {
            if (!ticket) {
              console.error('[ServiceTicketService] Ticket not found:', ticketId);
              return of(null);
            }

            // Check if service already exists in line items
            const existingItem = ticket.lineItems.find(item => item.serviceId === serviceId);

            if (existingItem) {
              // Increment quantity of existing item
              console.log('[ServiceTicketService] Service already on ticket, incrementing quantity');
              existingItem.quantity += quantity;
              existingItem.lineTotal = existingItem.unitPrice * existingItem.quantity;
            } else {
              // Add new line item
              const newLineItem: TicketLineItem = {
                id: this.generateOperationId(),
                serviceId: service.id,
                serviceName: service.name,
                category: service.category,
                quantity,
                unitPrice: service.basePrice,
                lineTotal: service.basePrice * quantity,
                partsCost: service.partsCost,
                laborCost: service.laborCost,
                laborMinutes: service.laborMinutes,
                partNumbers: service.requiredParts?.map(p => p.partNumber)
              };

              ticket.lineItems.push(newLineItem);
            }

            // Recalculate totals
            const totals = calculateTicketTotals(ticket);
            Object.assign(ticket, totals);

            // Update ticket
            return this.updateTicket(ticketId, ticket);
          })
        );
      })
    );
  }

  /**
   * Update line item
   */
  updateLineItem(
    ticketId: string,
    lineItemId: string,
    updates: Partial<TicketLineItem>
  ): Observable<ServiceTicket | null> {
    console.log('[ServiceTicketService] Updating line item:', ticketId, lineItemId);

    return from(this.ticketCacheRepo.getById(ticketId)).pipe(
      switchMap((ticket) => {
        if (!ticket) {
          console.error('[ServiceTicketService] Ticket not found:', ticketId);
          return of(null);
        }

        const lineItem = ticket.lineItems.find(item => item.id === lineItemId);
        if (!lineItem) {
          console.error('[ServiceTicketService] Line item not found:', lineItemId);
          return of(null);
        }

        // Apply updates
        Object.assign(lineItem, updates);

        // Recalculate line total if quantity or price changed
        if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
          lineItem.lineTotal = lineItem.unitPrice * lineItem.quantity;
        }

        // Recalculate ticket totals
        const totals = calculateTicketTotals(ticket);
        Object.assign(ticket, totals);

        // Update ticket
        return this.updateTicket(ticketId, ticket);
      })
    );
  }

  /**
   * Remove line item from ticket
   */
  removeLineItem(ticketId: string, lineItemId: string): Observable<ServiceTicket | null> {
    console.log('[ServiceTicketService] Removing line item:', ticketId, lineItemId);

    return from(this.ticketCacheRepo.getById(ticketId)).pipe(
      switchMap((ticket) => {
        if (!ticket) {
          console.error('[ServiceTicketService] Ticket not found:', ticketId);
          return of(null);
        }

        // Remove line item
        ticket.lineItems = ticket.lineItems.filter(item => item.id !== lineItemId);

        // Recalculate totals
        const totals = calculateTicketTotals(ticket);
        Object.assign(ticket, totals);

        // Update ticket
        return this.updateTicket(ticketId, ticket);
      })
    );
  }

  // ============================================================================
  // SERVICE CATALOG OPERATIONS
  // ============================================================================

  /**
   * Get service catalog (with caching and version checking)
   */
  getServiceCatalog(): Observable<ServiceCatalog> {
    console.log('[ServiceTicketService] Getting service catalog from:', this.catalogApiUrl);

    // Try to get from cache first
    return from(this.catalogCacheRepo.getCatalog()).pipe(
      switchMap((cachedCatalog) => {
        console.log('[ServiceTicketService] Cached catalog:', cachedCatalog ? 'found' : 'not found');
        
        if (cachedCatalog && !this.networkService.isOnline()) {
          // Offline: use cached catalog
          console.log('[ServiceTicketService] Using cached catalog (offline)');
          return of(cachedCatalog);
        }

        // Online: check for updates
        console.log('[ServiceTicketService] Fetching catalog from API...');
        return this.http.get<ServiceCatalog>(this.catalogApiUrl).pipe(
          switchMap(async (catalog) => {
            console.log('[ServiceTicketService] Catalog loaded from API:', {
              version: catalog.version,
              serviceCount: catalog.services?.length || 0,
              categoryCount: catalog.categories?.length || 0
            });
            
            // Check if version changed
            const cachedVersion = await this.catalogCacheRepo.getCatalogVersion();
            if (!cachedVersion || cachedVersion !== catalog.version) {
              console.log('[ServiceTicketService] Catalog version changed, updating cache');
              await this.catalogCacheRepo.saveCatalog(catalog);
            }
            
            return catalog;
          }),
          catchError((error) => {
            console.error('[ServiceTicketService] Catalog API failed:', {
              status: error.status,
              statusText: error.statusText,
              message: error.message,
              url: error.url
            });
            
            if (cachedCatalog) {
              console.warn('[ServiceTicketService] Using cached catalog as fallback');
              return of(cachedCatalog);
            }
            
            console.error('[ServiceTicketService] No cached catalog available, throwing error');
            throw error;
          })
        );
      })
    );
  }

  /**
   * Get services by category
   */
  getServicesByCategory(category: ServiceCategory): Observable<ServiceItem[]> {
    console.log('[ServiceTicketService] Getting services by category:', category);

    return from(this.catalogCacheRepo.getServicesByCategory(category)).pipe(
      switchMap((cachedServices) => {
        if (cachedServices.length > 0) {
          return of(cachedServices);
        }

        // If cache is empty, load full catalog first
        return this.getServiceCatalog().pipe(
          switchMap(() => this.catalogCacheRepo.getServicesByCategory(category)),
          map((services) => services)
        );
      })
    );
  }

  /**
   * Get service by ID
   */
  getServiceById(serviceId: string): Observable<ServiceItem | null> {
    console.log('[ServiceTicketService] Getting service by ID:', serviceId);

    return from(this.catalogCacheRepo.getServiceById(serviceId)).pipe(
      switchMap((cachedService) => {
        if (cachedService) {
          return of(cachedService);
        }

        // If not in cache, load full catalog first
        return this.getServiceCatalog().pipe(
          switchMap(() => this.catalogCacheRepo.getServiceById(serviceId))
        );
      })
    );
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Generate unique ticket number in format: T-YYYYMMDD-XXXX
   */
  private generateTicketNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `T-${year}${month}${day}-${random}`;
  }

  /**
   * Generate unique operation ID for idempotency
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sort tickets by creation date descending
   */
  private sortTicketsByDate(tickets: TicketSummary[]): TicketSummary[] {
    return tickets.sort((a, b) => {
      return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
    });
  }

  /**
   * Perform ticket update (online or offline)
   */
  private performUpdate(ticketId: string, updates: Partial<ServiceTicket>): Observable<ServiceTicket | null> {
    if (this.networkService.isOnline()) {
      return this.http.put<ServiceTicket>(`${this.apiUrl}/${ticketId}`, updates).pipe(
        switchMap(async (updatedTicket) => {
          console.log('[ServiceTicketService] Ticket updated:', updatedTicket.id);
          // Update cache
          await this.ticketCacheRepo.save(updatedTicket);
          return updatedTicket;
        }),
        catchError((error) => {
          console.error('[ServiceTicketService] Update ticket error:', error);
          return of(null);
        })
      );
    } else {
      // Offline: queue for sync
      return from(this.updateTicketOffline(ticketId, updates));
    }
  }

  // ============================================================================
  // OFFLINE OPERATIONS
  // ============================================================================

  /**
   * Create ticket offline with queueing
   */
  private async createTicketOffline(ticket: ServiceTicket): Promise<ServiceTicket | null> {
    try {
      // Save to cache
      await this.ticketCacheRepo.save(ticket);

      // Queue for sync
      await this.queueRepo.add({
        id: ticket.id,
        url: this.apiUrl,
        method: 'POST',
        body: ticket,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      });

      console.log('[ServiceTicketService] Ticket created offline and queued:', ticket.id);
      return ticket;
    } catch (error) {
      console.error('[ServiceTicketService] Offline create error:', error);
      return null;
    }
  }

  /**
   * Update ticket offline with queueing
   */
  private async updateTicketOffline(ticketId: string, updates: Partial<ServiceTicket>): Promise<ServiceTicket | null> {
    try {
      // Update cache
      await this.ticketCacheRepo.update(ticketId, updates);

      // Queue for sync
      await this.queueRepo.add({
        id: this.generateOperationId(),
        url: `${this.apiUrl}/${ticketId}`,
        method: 'PUT',
        body: updates,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      });

      console.log('[ServiceTicketService] Ticket updated offline and queued:', ticketId);
      
      // Return updated ticket from cache
      return await this.ticketCacheRepo.getById(ticketId);
    } catch (error) {
      console.error('[ServiceTicketService] Offline update error:', error);
      return null;
    }
  }

  /**
   * Delete ticket offline with queueing
   */
  private async deleteTicketOffline(ticketId: string): Promise<boolean> {
    try {
      // Remove from cache
      await this.ticketCacheRepo.deleteTicket(ticketId);

      // Queue for sync
      await this.queueRepo.add({
        id: this.generateOperationId(),
        url: `${this.apiUrl}/${ticketId}`,
        method: 'DELETE',
        body: null,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      });

      console.log('[ServiceTicketService] Ticket deleted offline and queued:', ticketId);
      return true;
    } catch (error) {
      console.error('[ServiceTicketService] Offline delete error:', error);
      return false;
    }
  }

  /**
   * Sync pending tickets
   */
  syncPendingTickets(): Observable<{ successful: number; failed: number }> {
    console.log('[ServiceTicketService] Syncing pending tickets');
    
    return from(this.queueRepo.getAllRequests()).pipe(
      switchMap(async (queue) => {
        let successful = 0;
        let failed = 0;

        for (const operation of queue) {
          try {
            // Process operation based on method
            if (operation.method === 'POST') {
              await this.http.post(operation.url, operation.body).toPromise();
            } else if (operation.method === 'PUT') {
              await this.http.put(operation.url, operation.body).toPromise();
            } else if (operation.method === 'DELETE') {
              await this.http.delete(operation.url).toPromise();
            }

            // Remove from queue on success
            await this.queueRepo.remove(operation.id);
            successful++;
          } catch (error) {
            console.error('[ServiceTicketService] Sync operation failed:', operation.id, error);
            failed++;
          }
        }

        console.log('[ServiceTicketService] Sync complete:', { successful, failed });
        return { successful, failed };
      })
    );
  }

  /**
   * Get pending ticket count
   */
  getPendingTicketCount(): Observable<number> {
    return from(this.queueRepo.getAllRequests()).pipe(
      map((queue) => queue.length)
    );
  }

  // ============================================================================
  // RECOMMENDATION OPERATIONS
  // ============================================================================

  /**
   * Get service recommendations based on mileage and service history
   * @param vehicleId Vehicle ID
   * @param currentMileage Current vehicle mileage
   * @returns Observable of service recommendations
   */
  getServiceRecommendations(
    vehicleId: string,
    currentMileage: number
  ): Observable<ServiceRecommendation[]> {
    console.log('[ServiceTicketService] Getting recommendations for vehicle:', vehicleId);

    // Get service history for this vehicle
    return this.searchTickets({ vehicleId }).pipe(
      switchMap((ticketSummaries) => {
        // Get full tickets for service history
        return from(
          Promise.all(
            ticketSummaries.map(summary => this.ticketCacheRepo.getById(summary.id))
          )
        ).pipe(
          map(tickets => tickets.filter(t => t !== null) as ServiceTicket[])
        );
      }),
      switchMap((serviceHistory) => {
        // Get service catalog
        return this.getServiceCatalog().pipe(
          map((catalog) => {
            // Use recommendation service to generate recommendations
            return this.recommendationService.getServiceRecommendations(
              vehicleId,
              currentMileage,
              serviceHistory,
              catalog.services
            );
          }),
          switchMap(recommendations => recommendations)
        );
      }),
      catchError((error) => {
        console.error('[ServiceTicketService] Get recommendations error:', error);
        return of([]);
      })
    );
  }

  /**
   * Get upsell recommendations based on current ticket services
   * @param ticketId Service ticket ID
   * @returns Observable of upsell recommendations
   */
  getUpsellRecommendations(ticketId: string): Observable<ServiceRecommendation[]> {
    console.log('[ServiceTicketService] Getting upsell recommendations for ticket:', ticketId);

    // Get the ticket
    return this.getTicketById(ticketId).pipe(
      switchMap((ticket) => {
        if (!ticket) {
          return of([]);
        }

        // Get service history for this vehicle
        return this.searchTickets({ vehicleId: ticket.vehicleId }).pipe(
          switchMap((ticketSummaries) => {
            // Get full tickets for service history
            return from(
              Promise.all(
                ticketSummaries.map(summary => this.ticketCacheRepo.getById(summary.id))
              )
            ).pipe(
              map(tickets => tickets.filter(t => t !== null) as ServiceTicket[])
            );
          }),
          switchMap((serviceHistory) => {
            // Get service catalog
            return this.getServiceCatalog().pipe(
              map((catalog) => {
                // Use recommendation service to generate upsell recommendations
                return this.recommendationService.getUpsellRecommendations(
                  ticket,
                  serviceHistory,
                  catalog.services
                );
              }),
              switchMap(recommendations => recommendations)
            );
          })
        );
      }),
      catchError((error) => {
        console.error('[ServiceTicketService] Get upsell recommendations error:', error);
        return of([]);
      })
    );
  }

  // ============================================================================
  // TECHNICIAN OPERATIONS
  // ============================================================================

  /**
   * Assign technician to a ticket
   * @param ticketId Service ticket ID
   * @param technicianId Technician employee ID
   * @param technicianName Technician name
   * @returns Observable of updated ticket
   */
  assignTechnician(
    ticketId: string,
    technicianId: string,
    technicianName: string
  ): Observable<ServiceTicket | null> {
    console.log('[ServiceTicketService] Assigning technician to ticket:', ticketId, technicianId);

    return this.getTicketById(ticketId).pipe(
      switchMap((ticket) => {
        if (!ticket) {
          console.error('[ServiceTicketService] Ticket not found:', ticketId);
          return of(null);
        }

        // Track technician change in status history if changing
        const statusHistory = [...ticket.statusHistory];
        if (ticket.assignedTechnicianId !== technicianId) {
          statusHistory.push({
            status: ticket.status,
            timestamp: new Date().toISOString(),
            employeeId: technicianId,
            employeeName: technicianName
          });
        }

        const updates: Partial<ServiceTicket> = {
          assignedTechnicianId: technicianId,
          assignedTechnicianName: technicianName,
          statusHistory
        };

        return this.updateTicket(ticketId, updates);
      }),
      catchError((error) => {
        console.error('[ServiceTicketService] Assign technician error:', error);
        return of(null);
      })
    );
  }

  /**
   * Get estimated completion time for a ticket based on total labor minutes
   * @param ticketId Service ticket ID
   * @returns Estimated completion time in minutes
   */
  getEstimatedCompletionTime(ticketId: string): Observable<number> {
    return this.getTicketById(ticketId).pipe(
      map((ticket) => {
        if (!ticket) {
          return 0;
        }
        // Return total labor minutes from the ticket
        return ticket.totalLaborMinutes || 0;
      }),
      catchError((error) => {
        console.error('[ServiceTicketService] Get estimated completion time error:', error);
        return of(0);
      })
    );
  }

  /**
   * Get tickets assigned to a specific technician
   * @param technicianId Technician employee ID
   * @returns Observable of ticket summaries
   */
  getTicketsByTechnician(technicianId: string): Observable<TicketSummary[]> {
    console.log('[ServiceTicketService] Getting tickets for technician:', technicianId);
    
    return this.searchTickets({ technicianId }).pipe(
      map((tickets) => {
        // Sort by creation date ascending (oldest first for work queue)
        return tickets.sort((a, b) => 
          new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()
        );
      }),
      catchError((error) => {
        console.error('[ServiceTicketService] Get tickets by technician error:', error);
        return of([]);
      })
    );
  }

  // ============================================================================
  // WORK ORDER OPERATIONS
  // ============================================================================

  /**
   * Generate work order for a ticket
   * @param ticketId Service ticket ID
   * @param customerName Customer name
   * @param customerPhone Customer phone
   * @param customerEmail Customer email (optional)
   * @returns Observable of work order
   */
  generateWorkOrder(
    ticketId: string,
    customerName: string,
    customerPhone: string,
    customerEmail?: string
  ): Observable<WorkOrder | null> {
    console.log('[ServiceTicketService] Generating work order for ticket:', ticketId);

    return this.getTicketById(ticketId).pipe(
      map((ticket) => {
        if (!ticket) {
          console.error('[ServiceTicketService] Ticket not found:', ticketId);
          return null;
        }

        return this.workOrderGeneratorService.generateWorkOrder(
          ticket,
          customerName,
          customerPhone,
          customerEmail
        );
      }),
      catchError((error) => {
        console.error('[ServiceTicketService] Generate work order error:', error);
        return of(null);
      })
    );
  }

  /**
   * Print work order for a ticket
   * @param ticketId Service ticket ID
   * @param customerName Customer name
   * @param customerPhone Customer phone
   * @param customerEmail Customer email (optional)
   */
  printWorkOrder(
    ticketId: string,
    customerName: string,
    customerPhone: string,
    customerEmail?: string
  ): Observable<boolean> {
    console.log('[ServiceTicketService] Printing work order for ticket:', ticketId);

    return this.generateWorkOrder(ticketId, customerName, customerPhone, customerEmail).pipe(
      map((workOrder) => {
        if (!workOrder) {
          return false;
        }

        this.workOrderGeneratorService.printWorkOrder(workOrder);
        return true;
      }),
      catchError((error) => {
        console.error('[ServiceTicketService] Print work order error:', error);
        return of(false);
      })
    );
  }

  // ============================================================================
  // SERVICE HISTORY OPERATIONS
  // ============================================================================

  /**
   * Get service history for a vehicle
   * Returns all completed/paid tickets for the vehicle
   * @param vehicleId Vehicle ID
   * @returns Observable of service tickets
   */
  getServiceHistoryForVehicle(vehicleId: string): Observable<ServiceTicket[]> {
    console.log('[ServiceTicketService] Getting service history for vehicle:', vehicleId);

    return this.searchTickets({ vehicleId }).pipe(
      switchMap((ticketSummaries) => {
        // Get full tickets
        return from(
          Promise.all(
            ticketSummaries.map(summary => this.ticketCacheRepo.getById(summary.id))
          )
        ).pipe(
          map(tickets => {
            // Filter to completed/paid tickets only
            const completedTickets = tickets.filter(
              t => t !== null && (t.status === 'Completed' || t.status === 'Paid')
            ) as ServiceTicket[];
            
            // Sort by creation date descending (most recent first)
            return completedTickets.sort((a, b) => 
              new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
            );
          })
        );
      }),
      catchError((error) => {
        console.error('[ServiceTicketService] Get service history error:', error);
        return of([]);
      })
    );
  }

  /**
   * Get last performed date and mileage for a specific service on a vehicle
   * @param vehicleId Vehicle ID
   * @param serviceId Service ID
   * @returns Observable with last performed info or null if never performed
   */
  getLastServicePerformance(
    vehicleId: string,
    serviceId: string
  ): Observable<{ date: string; mileage: number } | null> {
    return this.getServiceHistoryForVehicle(vehicleId).pipe(
      map((tickets) => {
        // Find tickets that contain this service
        const ticketsWithService = tickets.filter(ticket =>
          ticket.lineItems.some(item => item.serviceId === serviceId)
        );

        if (ticketsWithService.length === 0) {
          return null;
        }

        // Return most recent (already sorted by date descending)
        const mostRecent = ticketsWithService[0];
        return {
          date: mostRecent.createdDate,
          mileage: mostRecent.currentMileage
        };
      }),
      catchError((error) => {
        console.error('[ServiceTicketService] Get last service performance error:', error);
        return of(null);
      })
    );
  }

  /**
   * Check if a service is due based on service history
   * @param vehicleId Vehicle ID
   * @param serviceId Service ID
   * @param currentMileage Current vehicle mileage
   * @param mileageInterval Mileage interval for service (e.g., 3000 miles)
   * @param monthsInterval Time interval for service (e.g., 6 months)
   * @returns Observable boolean indicating if service is due
   */
  isServiceDue(
    vehicleId: string,
    serviceId: string,
    currentMileage: number,
    mileageInterval: number,
    monthsInterval: number
  ): Observable<boolean> {
    return this.getLastServicePerformance(vehicleId, serviceId).pipe(
      map((lastPerformance) => {
        if (!lastPerformance) {
          // Never performed, so it's due
          return true;
        }

        // Check mileage
        const mileageSinceLast = currentMileage - lastPerformance.mileage;
        if (mileageSinceLast >= mileageInterval) {
          return true;
        }

        // Check time
        const lastDate = new Date(lastPerformance.date);
        const now = new Date();
        const monthsSinceLast = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsSinceLast >= monthsInterval) {
          return true;
        }

        return false;
      }),
      catchError((error) => {
        console.error('[ServiceTicketService] Check service due error:', error);
        return of(false);
      })
    );
  }
}
