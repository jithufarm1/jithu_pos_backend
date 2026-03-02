/**
 * Service Catalog Data Models
 * 
 * Data structures for service catalog, recommendations, and work orders
 */

import { ServiceCategory } from './service-ticket.model';

/**
 * Pricing tier for different vehicle types
 */
export interface PricingTier {
  vehicleType: 'Standard' | 'European' | 'Diesel' | 'Synthetic';
  price: number;
  partsCost: number;
  laborCost: number;
}

/**
 * Part information for a service
 */
export interface PartInfo {
  partNumber: string;
  description: string;
  quantity: number;
  unitCost: number;
}

/**
 * Individual service item in the catalog
 */
export interface ServiceItem {
  id: string;
  code: string;
  name: string;
  category: ServiceCategory;
  description: string;
  basePrice: number;
  partsCost: number;
  laborCost: number;
  laborMinutes: number;
  pricingTiers?: PricingTier[];
  requiredParts?: PartInfo[];
  tags: string[];
  isActive: boolean;
}

/**
 * Service category group for organization
 */
export interface ServiceCategoryGroup {
  category: ServiceCategory;
  displayName: string;
  description: string;
  icon: string;
  sortOrder: number;
}

/**
 * Complete service catalog
 */
export interface ServiceCatalog {
  version: string;
  lastUpdated: string;
  categories: ServiceCategoryGroup[];
  services: ServiceItem[];
}

/**
 * Catalog metadata for version tracking
 */
export interface CatalogMetadata {
  version: string;
  lastUpdated: string;
  serviceCount: number;
  categoryCount: number;
}

/**
 * Recommendation reason types
 */
export type RecommendationReason = 
  | 'Mileage_Due'
  | 'Time_Due'
  | 'Never_Performed'
  | 'Related_Service'
  | 'Seasonal'
  | 'Manufacturer_Recommended';

/**
 * Service recommendation
 */
export interface ServiceRecommendation {
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  reason: RecommendationReason;
  priority: 'High' | 'Medium' | 'Low';
  estimatedPrice: number;
  lastPerformedDate?: string;
  lastPerformedMileage?: number;
  dueAtMileage?: number;
  dueByDate?: string;
}

/**
 * Mileage-based service threshold
 */
export interface MileageThreshold {
  serviceId: string;
  intervalMiles: number;
  description: string;
}

/**
 * Time-based service threshold
 */
export interface TimeThreshold {
  serviceId: string;
  intervalMonths: number;
  description: string;
}

/**
 * Customer information for work orders
 */
export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
}

/**
 * Work order service item
 */
export interface WorkOrderService {
  name: string;
  description: string;
  laborMinutes: number;
  completed: boolean;
}

/**
 * Work order part item
 */
export interface WorkOrderPart {
  partNumber: string;
  description: string;
  quantity: number;
}

/**
 * Labor summary for work orders
 */
export interface LaborSummary {
  totalMinutes: number;
  totalHours: number;
  estimatedCompletionTime: string;
}

/**
 * Pricing summary for work orders
 */
export interface PricingSummary {
  subtotal: number;
  tax: number;
  discounts: number;
  total: number;
}

/**
 * Technician information
 */
export interface TechnicianInfo {
  id: string;
  name: string;
  certifications?: string[];
}

/**
 * Complete work order
 */
export interface WorkOrder {
  ticketNumber: string;
  generatedDate: string;
  customer: CustomerInfo;
  vehicle: import('./service-ticket.model').VehicleInfo;
  services: WorkOrderService[];
  parts: WorkOrderPart[];
  laborSummary: LaborSummary;
  pricingSummary: PricingSummary;
  technician?: TechnicianInfo;
  instructions?: string;
  barcodeData: string;
}
