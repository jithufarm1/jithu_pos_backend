import { Injectable } from '@angular/core';
import { Observable, of, forkJoin, map, catchError } from 'rxjs';
import {
  ServiceRecommendation,
  MileageThreshold,
  TimeThreshold,
  ServiceItem
} from '../../../core/models/service-catalog.model';
import { ServiceTicket, ServiceCategory } from '../../../core/models/service-ticket.model';

/**
 * Service recommendation engine
 * Provides mileage-based, time-based, and upsell recommendations
 */
@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  
  // Mileage-based service thresholds (in miles)
  private readonly mileageThresholds: MileageThreshold[] = [
    { serviceId: 'OIL-CHANGE-CONV', intervalMiles: 3000, description: 'Conventional Oil Change' },
    { serviceId: 'OIL-CHANGE-SYNTH', intervalMiles: 7500, description: 'Synthetic Oil Change' },
    { serviceId: 'OIL-CHANGE-FULL-SYNTH', intervalMiles: 10000, description: 'Full Synthetic Oil Change' },
    { serviceId: 'AIR-FILTER', intervalMiles: 15000, description: 'Engine Air Filter Replacement' },
    { serviceId: 'CABIN-FILTER', intervalMiles: 15000, description: 'Cabin Air Filter Replacement' },
    { serviceId: 'TIRE-ROTATION', intervalMiles: 5000, description: 'Tire Rotation' },
    { serviceId: 'TRANSMISSION-FLUID', intervalMiles: 30000, description: 'Transmission Fluid Service' },
    { serviceId: 'COOLANT-FLUSH', intervalMiles: 30000, description: 'Coolant System Flush' },
    { serviceId: 'BRAKE-FLUID', intervalMiles: 30000, description: 'Brake Fluid Exchange' },
    { serviceId: 'DIFFERENTIAL-FLUID', intervalMiles: 40000, description: 'Differential Fluid Service' }
  ];

  // Time-based service thresholds (in months)
  private readonly timeThresholds: TimeThreshold[] = [
    { serviceId: 'OIL-CHANGE-CONV', intervalMonths: 3, description: 'Conventional Oil Change' },
    { serviceId: 'OIL-CHANGE-SYNTH', intervalMonths: 6, description: 'Synthetic Oil Change' },
    { serviceId: 'OIL-CHANGE-FULL-SYNTH', intervalMonths: 12, description: 'Full Synthetic Oil Change' },
    { serviceId: 'BATTERY-TEST', intervalMonths: 12, description: 'Battery Test and Inspection' },
    { serviceId: 'WIPER-BLADES', intervalMonths: 6, description: 'Wiper Blade Replacement' },
    { serviceId: 'TIRE-ROTATION', intervalMonths: 6, description: 'Tire Rotation' },
    { serviceId: 'MULTI-POINT-INSPECTION', intervalMonths: 6, description: 'Multi-Point Inspection' }
  ];

  // Upsell rules: service ID → recommended service IDs
  private readonly upsellRules: Map<string, string[]> = new Map([
    ['OIL-CHANGE-CONV', ['AIR-FILTER', 'CABIN-FILTER', 'WIPER-BLADES', 'TIRE-ROTATION']],
    ['OIL-CHANGE-SYNTH', ['AIR-FILTER', 'CABIN-FILTER', 'WIPER-BLADES', 'TIRE-ROTATION']],
    ['OIL-CHANGE-FULL-SYNTH', ['AIR-FILTER', 'CABIN-FILTER', 'WIPER-BLADES', 'TIRE-ROTATION']],
    ['BATTERY-TEST', ['BATTERY-REPLACEMENT', 'TERMINAL-CLEANING']],
    ['BATTERY-REPLACEMENT', ['TERMINAL-CLEANING']],
    ['TIRE-ROTATION', ['TIRE-BALANCE', 'WHEEL-ALIGNMENT']],
    ['BRAKE-INSPECTION', ['BRAKE-PAD-REPLACEMENT', 'BRAKE-FLUID']],
    ['TRANSMISSION-FLUID', ['TRANSMISSION-FILTER']]
  ]);

  constructor() {}

  /**
   * Get service recommendations based on mileage and service history
   * @param vehicleId Vehicle ID
   * @param currentMileage Current vehicle mileage
   * @param serviceHistory Array of previous service tickets for this vehicle
   * @param serviceCatalog Complete service catalog
   * @returns Observable of service recommendations
   */
  getServiceRecommendations(
    vehicleId: string,
    currentMileage: number,
    serviceHistory: ServiceTicket[],
    serviceCatalog: ServiceItem[]
  ): Observable<ServiceRecommendation[]> {
    const recommendations: ServiceRecommendation[] = [];

    // Get mileage-based recommendations
    const mileageRecs = this.getMileageBasedRecommendations(
      currentMileage,
      serviceHistory,
      serviceCatalog
    );
    recommendations.push(...mileageRecs);

    // Get time-based recommendations
    const timeRecs = this.getTimeBasedRecommendations(
      serviceHistory,
      serviceCatalog
    );
    recommendations.push(...timeRecs);

    // Remove duplicates (prefer mileage-based over time-based)
    const uniqueRecs = this.deduplicateRecommendations(recommendations);

    // Sort by priority (High → Medium → Low)
    const sortedRecs = this.sortByPriority(uniqueRecs);

    return of(sortedRecs);
  }

  /**
   * Get upsell recommendations based on current ticket services
   * @param ticket Current service ticket
   * @param serviceHistory Previous service history
   * @param serviceCatalog Complete service catalog
   * @returns Observable of upsell recommendations
   */
  getUpsellRecommendations(
    ticket: ServiceTicket,
    serviceHistory: ServiceTicket[],
    serviceCatalog: ServiceItem[]
  ): Observable<ServiceRecommendation[]> {
    const recommendations: ServiceRecommendation[] = [];
    const servicesOnTicket = new Set(ticket.lineItems.map(item => item.serviceId));

    // For each service on the ticket, check upsell rules
    ticket.lineItems.forEach(lineItem => {
      const upsells = this.upsellRules.get(lineItem.serviceId) || [];
      
      upsells.forEach(upsellServiceId => {
        // Skip if already on ticket
        if (servicesOnTicket.has(upsellServiceId)) {
          return;
        }

        // Skip if recently performed (within last 30 days or 3000 miles)
        if (this.isRecentlyPerformed(upsellServiceId, serviceHistory, 30, 3000)) {
          return;
        }

        // Find service in catalog
        const service = serviceCatalog.find(s => s.id === upsellServiceId);
        if (!service) {
          return;
        }

        // Determine priority based on service type
        const priority = this.determineUpsellPriority(service.category);

        recommendations.push({
          serviceId: service.id,
          serviceName: service.name,
          category: service.category,
          reason: 'Related_Service',
          priority,
          estimatedPrice: service.basePrice
        });
      });
    });

    // Sort by priority
    const sortedRecs = this.sortByPriority(recommendations);

    return of(sortedRecs);
  }

  /**
   * Get mileage-based recommendations
   */
  private getMileageBasedRecommendations(
    currentMileage: number,
    serviceHistory: ServiceTicket[],
    serviceCatalog: ServiceItem[]
  ): ServiceRecommendation[] {
    const recommendations: ServiceRecommendation[] = [];

    this.mileageThresholds.forEach(threshold => {
      // Find last time this service was performed
      const lastService = this.findLastServicePerformance(threshold.serviceId, serviceHistory);
      
      let dueAtMileage: number;
      let lastPerformedMileage: number | undefined;
      let lastPerformedDate: string | undefined;

      if (lastService) {
        lastPerformedMileage = lastService.currentMileage;
        lastPerformedDate = lastService.createdDate;
        dueAtMileage = lastPerformedMileage + threshold.intervalMiles;
      } else {
        // Never performed, due now
        dueAtMileage = currentMileage;
      }

      // Check if service is due (within 500 miles of due mileage or overdue)
      const mileageUntilDue = dueAtMileage - currentMileage;
      if (mileageUntilDue <= 500) {
        // Find service in catalog
        const service = serviceCatalog.find(s => s.id === threshold.serviceId);
        if (!service) {
          return;
        }

        // Determine priority based on how overdue
        let priority: 'High' | 'Medium' | 'Low';
        if (mileageUntilDue < -1000) {
          priority = 'High'; // More than 1000 miles overdue
        } else if (mileageUntilDue < 0) {
          priority = 'Medium'; // Overdue but less than 1000 miles
        } else {
          priority = 'Low'; // Due soon (within 500 miles)
        }

        recommendations.push({
          serviceId: service.id,
          serviceName: service.name,
          category: service.category,
          reason: 'Mileage_Due',
          priority,
          estimatedPrice: service.basePrice,
          lastPerformedDate,
          lastPerformedMileage,
          dueAtMileage
        });
      }
    });

    return recommendations;
  }

  /**
   * Get time-based recommendations
   */
  private getTimeBasedRecommendations(
    serviceHistory: ServiceTicket[],
    serviceCatalog: ServiceItem[]
  ): ServiceRecommendation[] {
    const recommendations: ServiceRecommendation[] = [];
    const now = new Date();

    this.timeThresholds.forEach(threshold => {
      // Find last time this service was performed
      const lastService = this.findLastServicePerformance(threshold.serviceId, serviceHistory);
      
      let dueByDate: Date;
      let lastPerformedDate: string | undefined;
      let lastPerformedMileage: number | undefined;

      if (lastService) {
        lastPerformedDate = lastService.createdDate;
        lastPerformedMileage = lastService.currentMileage;
        const lastDate = new Date(lastPerformedDate);
        dueByDate = new Date(lastDate);
        dueByDate.setMonth(dueByDate.getMonth() + threshold.intervalMonths);
      } else {
        // Never performed, due now
        dueByDate = now;
      }

      // Check if service is due (within 30 days or overdue)
      const daysUntilDue = Math.floor((dueByDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 30) {
        // Find service in catalog
        const service = serviceCatalog.find(s => s.id === threshold.serviceId);
        if (!service) {
          return;
        }

        // Determine priority based on how overdue
        let priority: 'High' | 'Medium' | 'Low';
        if (daysUntilDue < -30) {
          priority = 'High'; // More than 30 days overdue
        } else if (daysUntilDue < 0) {
          priority = 'Medium'; // Overdue but less than 30 days
        } else {
          priority = 'Low'; // Due soon (within 30 days)
        }

        recommendations.push({
          serviceId: service.id,
          serviceName: service.name,
          category: service.category,
          reason: 'Time_Due',
          priority,
          estimatedPrice: service.basePrice,
          lastPerformedDate,
          lastPerformedMileage,
          dueByDate: dueByDate.toISOString().split('T')[0]
        });
      }
    });

    return recommendations;
  }

  /**
   * Find the last time a service was performed
   */
  private findLastServicePerformance(
    serviceId: string,
    serviceHistory: ServiceTicket[]
  ): ServiceTicket | null {
    // Filter tickets that contain this service and are completed
    const ticketsWithService = serviceHistory.filter(ticket => 
      (ticket.status === 'Completed' || ticket.status === 'Paid') &&
      ticket.lineItems.some(item => item.serviceId === serviceId)
    );

    if (ticketsWithService.length === 0) {
      return null;
    }

    // Sort by creation date descending and return most recent
    ticketsWithService.sort((a, b) => 
      new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );

    return ticketsWithService[0];
  }

  /**
   * Check if a service was recently performed
   */
  private isRecentlyPerformed(
    serviceId: string,
    serviceHistory: ServiceTicket[],
    daysThreshold: number,
    milesThreshold: number
  ): boolean {
    const lastService = this.findLastServicePerformance(serviceId, serviceHistory);
    
    if (!lastService) {
      return false;
    }

    const now = new Date();
    const lastDate = new Date(lastService.createdDate);
    const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    // Consider recently performed if within threshold
    return daysSince <= daysThreshold;
  }

  /**
   * Remove duplicate recommendations (prefer mileage-based over time-based)
   */
  private deduplicateRecommendations(
    recommendations: ServiceRecommendation[]
  ): ServiceRecommendation[] {
    const seen = new Map<string, ServiceRecommendation>();

    recommendations.forEach(rec => {
      const existing = seen.get(rec.serviceId);
      
      if (!existing) {
        seen.set(rec.serviceId, rec);
      } else {
        // Prefer mileage-based over time-based
        if (rec.reason === 'Mileage_Due' && existing.reason === 'Time_Due') {
          seen.set(rec.serviceId, rec);
        }
        // Prefer higher priority
        else if (this.getPriorityValue(rec.priority) > this.getPriorityValue(existing.priority)) {
          seen.set(rec.serviceId, rec);
        }
      }
    });

    return Array.from(seen.values());
  }

  /**
   * Sort recommendations by priority
   */
  private sortByPriority(recommendations: ServiceRecommendation[]): ServiceRecommendation[] {
    return recommendations.sort((a, b) => {
      const priorityDiff = this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      // Secondary sort by price (higher price first for revenue optimization)
      return b.estimatedPrice - a.estimatedPrice;
    });
  }

  /**
   * Get numeric value for priority (for sorting)
   */
  private getPriorityValue(priority: 'High' | 'Medium' | 'Low'): number {
    switch (priority) {
      case 'High': return 3;
      case 'Medium': return 2;
      case 'Low': return 1;
      default: return 0;
    }
  }

  /**
   * Determine upsell priority based on service category
   */
  private determineUpsellPriority(category: ServiceCategory): 'High' | 'Medium' | 'Low' {
    // High priority for safety-related services
    if (category === 'Battery' || category === 'Lights' || category === 'Wipers') {
      return 'High';
    }
    // Medium priority for maintenance services
    if (category === 'Filters' || category === 'Fluid_Services') {
      return 'Medium';
    }
    // Low priority for other services
    return 'Low';
  }
}
