/**
 * Service Types Data
 * 
 * Predefined service types with durations and descriptions
 * for the appointments management system.
 */

import { ServiceType, ServiceCategory } from '../models/appointment.model';

/**
 * Predefined service types available at Valvoline service centers
 */
export const SERVICE_TYPES: ServiceType[] = [
  // Oil Change Services
  {
    id: 'oil-change-conventional',
    name: 'Conventional Oil Change',
    category: 'Oil Change',
    duration: 30,
    description: 'Standard oil change with conventional motor oil',
    isActive: true,
  },
  {
    id: 'oil-change-synthetic-blend',
    name: 'Synthetic Blend Oil Change',
    category: 'Oil Change',
    duration: 30,
    description: 'Oil change with synthetic blend motor oil',
    isActive: true,
  },
  {
    id: 'oil-change-full-synthetic',
    name: 'Full Synthetic Oil Change',
    category: 'Oil Change',
    duration: 30,
    description: 'Premium oil change with full synthetic motor oil',
    isActive: true,
  },
  {
    id: 'oil-change-high-mileage',
    name: 'High Mileage Oil Change',
    category: 'Oil Change',
    duration: 30,
    description: 'Specialized oil change for vehicles with over 75,000 miles',
    isActive: true,
  },

  // Fluid Services
  {
    id: 'transmission-fluid',
    name: 'Transmission Fluid Service',
    category: 'Fluid Service',
    duration: 60,
    description: 'Complete transmission fluid exchange',
    isActive: true,
  },
  {
    id: 'coolant-flush',
    name: 'Coolant System Flush',
    category: 'Fluid Service',
    duration: 45,
    description: 'Complete coolant system flush and refill',
    isActive: true,
  },
  {
    id: 'brake-fluid',
    name: 'Brake Fluid Exchange',
    category: 'Fluid Service',
    duration: 30,
    description: 'Brake fluid replacement service',
    isActive: true,
  },
  {
    id: 'power-steering-fluid',
    name: 'Power Steering Fluid Service',
    category: 'Fluid Service',
    duration: 30,
    description: 'Power steering fluid exchange',
    isActive: true,
  },
  {
    id: 'differential-fluid',
    name: 'Differential Fluid Service',
    category: 'Fluid Service',
    duration: 45,
    description: 'Differential fluid replacement',
    isActive: true,
  },

  // Filter Services
  {
    id: 'air-filter',
    name: 'Engine Air Filter Replacement',
    category: 'Filter Service',
    duration: 15,
    description: 'Replace engine air filter',
    isActive: true,
  },
  {
    id: 'cabin-filter',
    name: 'Cabin Air Filter Replacement',
    category: 'Filter Service',
    duration: 15,
    description: 'Replace cabin air filter',
    isActive: true,
  },
  {
    id: 'fuel-filter',
    name: 'Fuel Filter Replacement',
    category: 'Filter Service',
    duration: 30,
    description: 'Replace fuel filter',
    isActive: true,
  },

  // Battery Services
  {
    id: 'battery-replacement',
    name: 'Battery Replacement',
    category: 'Battery',
    duration: 30,
    description: 'Replace vehicle battery',
    isActive: true,
  },
  {
    id: 'battery-test',
    name: 'Battery Test & Inspection',
    category: 'Battery',
    duration: 15,
    description: 'Test battery health and charging system',
    isActive: true,
  },

  // Wiper Services
  {
    id: 'wiper-blades',
    name: 'Wiper Blade Replacement',
    category: 'Wiper',
    duration: 15,
    description: 'Replace windshield wiper blades',
    isActive: true,
  },

  // Light Services
  {
    id: 'headlight-bulb',
    name: 'Headlight Bulb Replacement',
    category: 'Light',
    duration: 20,
    description: 'Replace headlight bulbs',
    isActive: true,
  },
  {
    id: 'taillight-bulb',
    name: 'Taillight Bulb Replacement',
    category: 'Light',
    duration: 15,
    description: 'Replace taillight bulbs',
    isActive: true,
  },

  // Tire Services
  {
    id: 'tire-rotation',
    name: 'Tire Rotation',
    category: 'Tire',
    duration: 30,
    description: 'Rotate tires for even wear',
    isActive: true,
  },
  {
    id: 'tire-pressure-check',
    name: 'Tire Pressure Check & Fill',
    category: 'Tire',
    duration: 15,
    description: 'Check and adjust tire pressure',
    isActive: true,
  },

  // Inspection Services
  {
    id: 'multi-point-inspection',
    name: 'Multi-Point Inspection',
    category: 'Inspection',
    duration: 30,
    description: 'Comprehensive vehicle inspection covering all major systems',
    isActive: true,
  },
  {
    id: 'pre-trip-inspection',
    name: 'Pre-Trip Inspection',
    category: 'Inspection',
    duration: 45,
    description: 'Thorough inspection before long trips',
    isActive: true,
  },
];

/**
 * Get service type by ID
 */
export function getServiceTypeById(id: string): ServiceType | undefined {
  return SERVICE_TYPES.find(st => st.id === id);
}

/**
 * Get service types by category
 */
export function getServiceTypesByCategory(category: ServiceCategory): ServiceType[] {
  return SERVICE_TYPES.filter(st => st.category === category && st.isActive);
}

/**
 * Get all active service types
 */
export function getActiveServiceTypes(): ServiceType[] {
  return SERVICE_TYPES.filter(st => st.isActive);
}

/**
 * Get service categories with counts
 */
export function getServiceCategories(): { category: ServiceCategory; count: number }[] {
  const categories = new Map<ServiceCategory, number>();
  
  SERVICE_TYPES.filter(st => st.isActive).forEach(st => {
    categories.set(st.category, (categories.get(st.category) || 0) + 1);
  });

  return Array.from(categories.entries()).map(([category, count]) => ({
    category,
    count,
  }));
}
