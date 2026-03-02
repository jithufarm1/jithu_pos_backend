/**
 * Customer Management Models
 * Valvoline POS - Customer data structures
 */

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address: Address;
  preferences: CustomerPreferences;
  loyaltyProgram?: LoyaltyProgram;
  createdDate: string;
  lastVisitDate?: string;
  totalVisits: number;
  totalSpent: number;
  vehicles: CustomerVehicle[];
  notes?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface CustomerPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  preferredContactMethod: 'email' | 'phone' | 'sms';
  preferredLanguage: string;
}

export interface LoyaltyProgram {
  memberId: string;
  points: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  joinDate: string;
  expirationDate?: string;
}

export interface CustomerVehicle {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  engine: string;
  licensePlate?: string;
  color?: string;
  mileage: number;
  isPrimary: boolean;
  addedDate: string;
  lastServiceDate?: string;
  nextServiceDue?: string;
  serviceHistory: ServiceRecord[];
}

export interface ServiceRecord {
  id: string;
  date: string;
  storeId: string;
  storeName: string;
  services: ServiceItem[];
  totalAmount: number;
  mileage: number;
  technician: string;
  notes?: string;
  invoiceNumber: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  quantity: number;
  discount?: number;
}

export type ServiceCategory = 
  | 'Oil Change'
  | 'Fluid Service'
  | 'Filter Service'
  | 'Battery'
  | 'Wiper'
  | 'Light'
  | 'Tire'
  | 'Inspection'
  | 'Other';

export interface CustomerSearchCriteria {
  searchTerm?: string;
  phone?: string;
  email?: string;
  lastName?: string;
  vehicleVin?: string;
  licensePlate?: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  email: string;
  lastVisit?: string;
  totalVisits: number;
  primaryVehicle?: string;
  loyaltyTier?: string;
}

export interface ServiceHistoryFilters {
  startDate?: string;
  endDate?: string;
  serviceType?: ServiceCategory;
  vehicleId?: string;
}

export interface CustomerAnalytics {
  totalVisits: number;
  totalSpent: number;
  averageTicketValue: number;
  lastVisitDate?: string;
  preferredServices: ServiceFrequency[];
  vehicleCount: number;
}

export interface ServiceFrequency {
  serviceName: string;
  count: number;
  category: ServiceCategory;
}

export interface LoyaltyTransaction {
  id: string;
  date: string;
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
  points: number;
  description: string;
  relatedServiceId?: string;
}

export interface EmailTemplate {
  templateId: string;
  subject: string;
  body: string;
  variables: Record<string, string>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface CachedCustomer extends Customer {
  cachedAt: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

export interface QueuedCustomerOperation {
  id: string;
  operation: 'create' | 'update' | 'delete';
  customerId?: string;
  data?: Partial<Customer>;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

export interface CacheStats {
  totalCustomers: number;
  cacheSize: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}
