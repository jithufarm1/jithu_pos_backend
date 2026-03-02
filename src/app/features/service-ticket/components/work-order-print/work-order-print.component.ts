import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { WorkOrder } from '../../../../core/models/service-catalog.model';
import { WorkOrderGeneratorService } from '../../services/work-order.service';

@Component({
  selector: 'app-work-order-print',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './work-order-print.component.html',
  styleUrls: ['./work-order-print.component.css']
})
export class WorkOrderPrintComponent {
  @Input() workOrder: WorkOrder | null = null;

  constructor(
    private workOrderService: WorkOrderGeneratorService,
    private sanitizer: DomSanitizer
  ) {}

  get workOrderHTML(): SafeHtml {
    if (!this.workOrder) {
      return '';
    }
    const html = this.workOrderService.generatePrintableHTML(this.workOrder);
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  print(): void {
    if (this.workOrder) {
      this.workOrderService.printWorkOrder(this.workOrder);
    }
  }
}
