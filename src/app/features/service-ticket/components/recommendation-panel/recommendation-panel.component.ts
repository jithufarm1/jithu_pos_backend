import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceRecommendation } from '../../../../core/models/service-catalog.model';

@Component({
  selector: 'app-recommendation-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recommendation-panel.component.html',
  styleUrls: ['./recommendation-panel.component.css']
})
export class RecommendationPanelComponent {
  @Input() recommendations: ServiceRecommendation[] = [];
  @Output() recommendationAccepted = new EventEmitter<ServiceRecommendation>();
  @Output() recommendationDismissed = new EventEmitter<ServiceRecommendation>();

  acceptRecommendation(recommendation: ServiceRecommendation): void {
    this.recommendationAccepted.emit(recommendation);
  }

  dismissRecommendation(recommendation: ServiceRecommendation): void {
    this.recommendationDismissed.emit(recommendation);
  }

  getPriorityClass(priority: string): string {
    const priorityClasses: Record<string, string> = {
      'High': 'priority-high',
      'Medium': 'priority-medium',
      'Low': 'priority-low'
    };
    return priorityClasses[priority] || '';
  }

  getReasonLabel(reason: string): string {
    const reasonLabels: Record<string, string> = {
      'Mileage_Due': 'Due by Mileage',
      'Time_Due': 'Due by Time',
      'Never_Performed': 'Never Performed',
      'Related_Service': 'Related Service',
      'Seasonal': 'Seasonal Recommendation',
      'Manufacturer_Recommended': 'Manufacturer Recommended'
    };
    return reasonLabels[reason] || reason.replace(/_/g, ' ');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  formatMileage(mileage: number | undefined): string {
    if (!mileage) return 'N/A';
    return new Intl.NumberFormat('en-US').format(mileage) + ' miles';
  }
}
