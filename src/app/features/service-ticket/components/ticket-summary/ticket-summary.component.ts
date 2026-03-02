import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketLineItem, Discount } from '../../../../core/models/service-ticket.model';

@Component({
  selector: 'app-ticket-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-summary.component.html',
  styleUrls: ['./ticket-summary.component.css']
})
export class TicketSummaryComponent {
  @Input() lineItems: TicketLineItem[] = [];
  @Input() subtotal: number = 0;
  @Input() tax: number = 0;
  @Input() taxRate: number = 0;
  @Input() discounts: Discount[] = [];
  @Input() total: number = 0;
  @Input() partsTotal: number = 0;
  @Input() laborTotal: number = 0;
  @Input() totalLaborMinutes: number = 0;

  get discountTotal(): number {
    return this.discounts.reduce((sum, d) => sum + d.amount, 0);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatLaborTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  }
}
