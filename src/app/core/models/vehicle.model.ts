/**
 * Vehicle data model representing complete vehicle static data
 * Used for both API responses and IndexedDB storage
 */
export interface Vehicle {
  vin: string;
  year: number;
  make: string;
  model: string;
  engine: string;
  oilType: string;
  oilCapacity: string;
  recommendedServices: string[];
  serviceInterval: number;
  cachedAt?: Date;
}

/**
 * Search criteria for vehicle lookup by year, make, and model
 */
export interface SearchCriteria {
  year?: number;
  make?: string;
  model?: string;
}

/**
 * Reference data containing all available makes, models, engines, and service types
 * Cached locally for offline access
 */
export interface ReferenceData {
  makes: Make[];
  engines: string[];
  serviceTypes: string[];
  lastUpdated: Date;
}

/**
 * Make (manufacturer) with associated models
 */
export interface Make {
  id: string;
  name: string;
  models: Model[];
}

/**
 * Model with available years
 */
export interface Model {
  id: string;
  name: string;
  years: number[];
}

/**
 * Queued API request for retry when network is restored
 */
export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

/**
 * Network status information
 */
export interface NetworkStatus {
  isOnline: boolean;
  lastOnline?: Date;
  lastSync?: Date;
}
