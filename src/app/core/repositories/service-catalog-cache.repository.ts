import { Injectable } from '@angular/core';
import { IndexedDBRepository } from './indexeddb.repository';
import {
  ServiceCatalog,
  ServiceItem,
  CatalogMetadata,
} from '../models/service-catalog.model';
import { ServiceCategory } from '../models/service-ticket.model';

/**
 * Service Catalog Cache Repository
 * Manages caching of the service catalog for offline access
 * Extends IndexedDBRepository for catalog-specific operations
 */
@Injectable({
  providedIn: 'root',
})
export class ServiceCatalogCacheRepository extends IndexedDBRepository {
  private readonly CATALOG_STORE = 'service-catalog';
  private readonly METADATA_STORE = 'catalog-metadata';
  private readonly METADATA_KEY = 'catalog-metadata';

  constructor() {
    super();
  }

  /**
   * Save complete service catalog to cache
   */
  async saveCatalog(catalog: ServiceCatalog): Promise<void> {
    console.log('[ServiceCatalogCacheRepository] Saving catalog:', catalog.version);

    // Clear existing catalog
    await this.clear(this.CATALOG_STORE);

    // Save each service item
    for (const service of catalog.services) {
      await this.put(this.CATALOG_STORE, service);
    }

    // Save metadata
    const metadata: CatalogMetadata = {
      version: catalog.version,
      lastUpdated: catalog.lastUpdated,
      serviceCount: catalog.services.length,
      categoryCount: catalog.categories.length,
    };

    await this.put(this.METADATA_STORE, {
      id: this.METADATA_KEY,
      ...metadata,
    });

    console.log('[ServiceCatalogCacheRepository] Catalog saved successfully');
  }

  /**
   * Get complete service catalog from cache
   */
  async getCatalog(): Promise<ServiceCatalog | null> {
    console.log('[ServiceCatalogCacheRepository] Getting catalog from cache');

    const metadata = await this.getCatalogMetadata();
    if (!metadata) {
      console.log('[ServiceCatalogCacheRepository] No catalog metadata found');
      return null;
    }

    const services = await this.getAll<ServiceItem>(this.CATALOG_STORE);
    if (services.length === 0) {
      console.log('[ServiceCatalogCacheRepository] No services found in cache');
      return null;
    }

    // Build categories from services
    const categorySet = new Set<ServiceCategory>();
    services.forEach((service) => categorySet.add(service.category));

    const categories = Array.from(categorySet).map((category) => ({
      category,
      displayName: this.getCategoryDisplayName(category),
      description: this.getCategoryDescription(category),
      icon: this.getCategoryIcon(category),
      sortOrder: this.getCategorySortOrder(category),
    }));

    return {
      version: metadata.version,
      lastUpdated: metadata.lastUpdated,
      categories,
      services,
    };
  }

  /**
   * Get catalog version from cache
   */
  async getCatalogVersion(): Promise<string | null> {
    console.log('[ServiceCatalogCacheRepository] Getting catalog version');

    const metadata = await this.getCatalogMetadata();
    return metadata ? metadata.version : null;
  }

  /**
   * Get service by ID
   */
  async getServiceById(serviceId: string): Promise<ServiceItem | null> {
    console.log('[ServiceCatalogCacheRepository] Getting service:', serviceId);
    return await this.get<ServiceItem>(this.CATALOG_STORE, serviceId);
  }

  /**
   * Get services by category
   */
  async getServicesByCategory(
    category: ServiceCategory
  ): Promise<ServiceItem[]> {
    console.log('[ServiceCatalogCacheRepository] Getting services for category:', category);

    const allServices = await this.getAll<ServiceItem>(this.CATALOG_STORE);
    return allServices.filter((service) => service.category === category);
  }

  /**
   * Search services by query string
   */
  async searchServices(query: string): Promise<ServiceItem[]> {
    console.log('[ServiceCatalogCacheRepository] Searching services:', query);

    const allServices = await this.getAll<ServiceItem>(this.CATALOG_STORE);
    const searchTerm = query.toLowerCase();

    return allServices.filter(
      (service) =>
        service.name.toLowerCase().includes(searchTerm) ||
        service.description.toLowerCase().includes(searchTerm) ||
        service.code.toLowerCase().includes(searchTerm) ||
        service.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Clear all catalog data
   */
  async clearCatalog(): Promise<void> {
    console.log('[ServiceCatalogCacheRepository] Clearing catalog');
    await this.clear(this.CATALOG_STORE);
    await this.clear(this.METADATA_STORE);
  }

  /**
   * Get catalog metadata
   */
  async getCatalogMetadata(): Promise<CatalogMetadata | null> {
    const metadata = await this.get<any>(this.METADATA_STORE, this.METADATA_KEY);
    if (!metadata) {
      return null;
    }

    return {
      version: metadata.version,
      lastUpdated: metadata.lastUpdated,
      serviceCount: metadata.serviceCount,
      categoryCount: metadata.categoryCount,
    };
  }

  /**
   * Helper: Get category display name
   */
  private getCategoryDisplayName(category: ServiceCategory): string {
    const names: Record<ServiceCategory, string> = {
      Oil_Change: 'Oil Change',
      Fluid_Services: 'Fluid Services',
      Filters: 'Filters',
      Battery: 'Battery',
      Wipers: 'Wipers',
      Lights: 'Lights',
      Tires: 'Tires',
      Inspection: 'Inspection',
    };
    return names[category];
  }

  /**
   * Helper: Get category description
   */
  private getCategoryDescription(category: ServiceCategory): string {
    const descriptions: Record<ServiceCategory, string> = {
      Oil_Change: 'Oil change services for all vehicle types',
      Fluid_Services: 'Transmission, coolant, brake, and power steering fluids',
      Filters: 'Air, cabin, fuel, and oil filters',
      Battery: 'Battery testing, replacement, and maintenance',
      Wipers: 'Wiper blade replacement and maintenance',
      Lights: 'Headlight, taillight, and bulb replacement',
      Tires: 'Tire rotation, balancing, and pressure checks',
      Inspection: 'Multi-point inspections and diagnostics',
    };
    return descriptions[category];
  }

  /**
   * Helper: Get category icon
   */
  private getCategoryIcon(category: ServiceCategory): string {
    const icons: Record<ServiceCategory, string> = {
      Oil_Change: 'oil_barrel',
      Fluid_Services: 'water_drop',
      Filters: 'filter_alt',
      Battery: 'battery_charging_full',
      Wipers: 'wiper',
      Lights: 'lightbulb',
      Tires: 'tire_repair',
      Inspection: 'checklist',
    };
    return icons[category];
  }

  /**
   * Helper: Get category sort order
   */
  private getCategorySortOrder(category: ServiceCategory): number {
    const order: Record<ServiceCategory, number> = {
      Oil_Change: 1,
      Fluid_Services: 2,
      Filters: 3,
      Battery: 4,
      Wipers: 5,
      Lights: 6,
      Tires: 7,
      Inspection: 8,
    };
    return order[category];
  }
}
