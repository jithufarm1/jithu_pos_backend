import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketLineItem } from '../../../../core/models/service-ticket.model';

@Component({
  selector: 'app-service-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service-selector.component.html',
  styleUrls: ['./service-selector.component.css']
})
export class ServiceSelectorComponent {
  @Input() lineItems: TicketLineItem[] = [];
  @Output() quantityChanged = new EventEmitter<{ lineItemId: string; quantity: number }>();
  @Output() lineItemRemoved = new EventEmitter<string>();

  increaseQuantity(lineItem: TicketLineItem): void {
    this.quantityChanged.emit({
      lineItemId: lineItem.id,
      quantity: lineItem.quantity + 1
    });
  }

  decreaseQuantity(lineItem: TicketLineItem): void {
    if (lineItem.quantity > 1) {
      this.quantityChanged.emit({
        lineItemId: lineItem.id,
        quantity: lineItem.quantity - 1
      });
    }
  }

  removeLineItem(lineItemId: string): void {
    this.lineItemRemoved.emit(lineItemId);
  }

  getCategoryLabel(category: string): string {
    return category.replace(/_/g, ' ');
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
