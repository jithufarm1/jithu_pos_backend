/**
 * Service Ticket Management Data Models
 * 
 * Core data structures for service ticket operations including:
 * - Service tickets with line items and pricing
 * - Status workflow management
 * - Discount and tax calculations
 * - Cache and queue models for offline support
 */

/**
 * Ticket status workflow states
 * Created → In_Progress → Completed → Paid
 */
export type TicketStatus = 'Created' | 'In_Progress' | 'Completed' | 'Paid';

/**
 * Service categories for organization and filtering
 */
export type ServiceCategory = 
  | 'Oil_Change'
  | 'Fluid_Services'
  | 'Filters'
  | 'Battery'
  | 'Wipers'
  | 'Lights'
  | 'Tires'
  | 'Inspection';

/**
 * Vehicle information embedded in service tickets
 */
export interface VehicleInfo {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  licensePlate?: string;
}

/**
 * Individual service line item on a ticket
 */
export interface TicketLineItem {
  id: string;
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  partsCost: number;
  laborCost: number;
  laborMinutes: number;
  partNumbers?: string[];
  notes?: string;
}

/**
 * Discount applied to a ticket
 */
export interface Discount {
  id: string;
  type: 'percentage' | 'amount';
  value: number;
  amount: number;
  reason: string;
  appliedBy: string;
  appliedDate: string;
  approvedBy?: string;
  approvalDate?: string;
  requiresApproval: boolean;
}

/**
 * Status change history entry
 */
export interface StatusHistoryEntry {
  status: TicketStatus;
  timestamp: string;
  employeeId: string;
  employeeName: string;
}

/**
 * Complete service ticket
 */
export interface ServiceTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  vehicleId: string;
  vehicleInfo: VehicleInfo;
  status: TicketStatus;
  lineItems: TicketLineItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  discounts: Discount[];
  total: number;
  partsTotal: number;
  laborTotal: number;
  totalLaborMinutes: number;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  estimatedCompletionTime?: string;
  createdBy: string;
  createdDate: string;
  startedDate?: string;
  completedDate?: string;
  paidDate?: string;
  currentMileage: number;
  notes?: string;
  statusHistory: StatusHistoryEntry[];
}

/**
 * Calculated ticket totals
 */
export interface TicketTotals {
  subtotal: number;
  tax: number;
  discountTotal: number;
  total: number;
  partsTotal: number;
  laborTotal: number;
  totalLaborMinutes: number;
}

/**
 * Search criteria for ticket queries
 */
export interface TicketSearchCriteria {
  ticketNumber?: string;
  customerId?: string;
  customerName?: string;
  vehicleId?: string;
  vehicleVin?: string;
  status?: TicketStatus;
  technicianId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Ticket summary for list views
 */
export interface TicketSummary {
  id: string;
  ticketNumber: string;
  customerName: string;
  vehicleInfo: string;
  status: TicketStatus;
  total: number;
  assignedTechnician?: string;
  createdDate: string;
  serviceCount: number;
}

/**
 * Cached service ticket with metadata
 */
export interface CachedServiceTicket extends ServiceTicket {
  cachedAt: Date;
  lastAccessedAt: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
  accessCount: number;
}

/**
 * Queued ticket operation for offline sync
 */
export interface QueuedTicketOperation {
  id: string;
  operation: 'create' | 'update' | 'delete' | 'status_change';
  ticketId?: string;
  data?: Partial<ServiceTicket>;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalTickets: number;
  ticketsByStatus: Record<TicketStatus, number>;
  oldestTicket: Date;
  newestTicket: Date;
  totalSize: number;
  pendingSync: number;
}

/**
 * Synchronization result
 */
export interface SyncResult {
  successful: number;
  failed: number;
  conflicts: number;
}
