import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  WorkOrder,
  WorkOrderService as WorkOrderServiceItem,
  WorkOrderPart,
  LaborSummary,
  PricingSummary,
  CustomerInfo,
  TechnicianInfo
} from '../../../core/models/service-catalog.model';
import { ServiceTicket, VehicleInfo } from '../../../core/models/service-ticket.model';

/**
 * Work Order Generator Service
 * Handles work order generation and printing
 */
@Injectable({
  providedIn: 'root'
})
export class WorkOrderGeneratorService {
  
  constructor() {}

  /**
   * Generate work order from service ticket
   * @param ticket Service ticket
   * @param customerName Customer name
   * @param customerPhone Customer phone
   * @param customerEmail Customer email (optional)
   * @returns Work order object
   */
  generateWorkOrder(
    ticket: ServiceTicket,
    customerName: string,
    customerPhone: string,
    customerEmail?: string
  ): WorkOrder {
    // Build customer info
    const customer: CustomerInfo = {
      name: customerName,
      phone: customerPhone,
      email: customerEmail
    };

    // Build vehicle info - extend with current mileage
    const vehicle: VehicleInfo & { currentMileage: number } = {
      ...ticket.vehicleInfo,
      currentMileage: ticket.currentMileage
    };

    // Build services list
    const services: WorkOrderServiceItem[] = ticket.lineItems.map(item => ({
      name: item.serviceName,
      description: item.notes || '',
      laborMinutes: item.laborMinutes || 0,
      completed: false
    }));

    // Build parts list from part numbers
    const parts: WorkOrderPart[] = [];
    ticket.lineItems.forEach(item => {
      if (item.partNumbers && item.partNumbers.length > 0) {
        item.partNumbers.forEach((partNumber, index) => {
          parts.push({
            partNumber,
            description: `${item.serviceName} - Part ${index + 1}`,
            quantity: item.quantity
          });
        });
      }
    });

    // Build labor summary
    const totalMinutes = ticket.totalLaborMinutes || 0;
    const totalHours = Math.ceil(totalMinutes / 60 * 10) / 10; // Round to 1 decimal
    const estimatedCompletionTime = this.calculateEstimatedCompletionTime(totalMinutes);
    
    const laborSummary: LaborSummary = {
      totalMinutes,
      totalHours,
      estimatedCompletionTime
    };

    // Build pricing summary
    const pricingSummary: PricingSummary = {
      subtotal: ticket.subtotal,
      tax: ticket.tax,
      discounts: ticket.discounts.reduce((sum, d) => sum + d.amount, 0),
      total: ticket.total
    };

    // Build technician info
    let technician: TechnicianInfo | undefined;
    if (ticket.assignedTechnicianId && ticket.assignedTechnicianName) {
      technician = {
        id: ticket.assignedTechnicianId,
        name: ticket.assignedTechnicianName
      };
    }

    // Build barcode data (ticket number)
    const barcodeData = ticket.ticketNumber;

    // Build work order
    const workOrder: WorkOrder = {
      ticketNumber: ticket.ticketNumber,
      generatedDate: new Date().toISOString(),
      customer,
      vehicle: vehicle as any, // Extended with currentMileage
      services,
      parts,
      laborSummary,
      pricingSummary,
      technician,
      instructions: ticket.notes,
      barcodeData
    };

    return workOrder;
  }

  /**
   * Calculate estimated completion time from labor minutes
   * @param totalMinutes Total labor minutes
   * @returns Formatted time string (e.g., "1.5 hours", "45 minutes")
   */
  private calculateEstimatedCompletionTime(totalMinutes: number): string {
    if (totalMinutes === 0) {
      return 'Not specified';
    }

    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (minutes === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }

    return `${hours}.${Math.round(minutes / 6)} hours`;
  }

  /**
   * Generate printable HTML for work order
   * @param workOrder Work order object
   * @returns HTML string
   */
  generatePrintableHTML(workOrder: WorkOrder): string {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Work Order - ${workOrder.ticketNumber}</title>
  <style>
    @page {
      size: letter;
      margin: 0.5in;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
    }
    
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    
    .header h1 {
      margin: 0;
      font-size: 24pt;
      color: #c8102e;
    }
    
    .header .subtitle {
      font-size: 10pt;
      color: #666;
    }
    
    .section {
      margin-bottom: 15px;
    }
    
    .section-title {
      font-weight: bold;
      font-size: 12pt;
      border-bottom: 1px solid #ccc;
      padding-bottom: 3px;
      margin-bottom: 8px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    
    .info-item {
      margin-bottom: 5px;
    }
    
    .info-label {
      font-weight: bold;
      display: inline-block;
      width: 120px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    th {
      background-color: #f0f0f0;
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
      font-weight: bold;
    }
    
    td {
      border: 1px solid #ccc;
      padding: 8px;
    }
    
    .checkbox {
      width: 20px;
      height: 20px;
      border: 2px solid #000;
      display: inline-block;
      vertical-align: middle;
    }
    
    .pricing-table {
      width: 50%;
      margin-left: auto;
      margin-top: 15px;
    }
    
    .pricing-table td {
      border: none;
      padding: 5px 10px;
    }
    
    .pricing-table .total-row {
      font-weight: bold;
      font-size: 13pt;
      border-top: 2px solid #000;
    }
    
    .signature-section {
      margin-top: 30px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    
    .signature-line {
      border-top: 1px solid #000;
      margin-top: 40px;
      padding-top: 5px;
      text-align: center;
    }
    
    .barcode {
      text-align: center;
      margin-top: 20px;
      font-family: 'Courier New', monospace;
      font-size: 14pt;
      letter-spacing: 2px;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛢️ VALVOLINE INSTANT OIL CHANGE</h1>
    <div class="subtitle">Service Work Order</div>
    <div class="subtitle">Ticket #: ${workOrder.ticketNumber}</div>
    <div class="subtitle">Date: ${new Date(workOrder.generatedDate).toLocaleDateString()}</div>
  </div>

  <div class="section">
    <div class="section-title">Customer Information</div>
    <div class="info-item">
      <span class="info-label">Name:</span> ${workOrder.customer.name}
    </div>
    <div class="info-item">
      <span class="info-label">Phone:</span> ${workOrder.customer.phone}
    </div>
    ${workOrder.customer.email ? `
    <div class="info-item">
      <span class="info-label">Email:</span> ${workOrder.customer.email}
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">Vehicle Information</div>
    <div class="info-grid">
      <div>
        <div class="info-item">
          <span class="info-label">Year/Make/Model:</span> ${workOrder.vehicle.year} ${workOrder.vehicle.make} ${workOrder.vehicle.model}
        </div>
        <div class="info-item">
          <span class="info-label">VIN:</span> ${workOrder.vehicle.vin}
        </div>
      </div>
      <div>
        <div class="info-item">
          <span class="info-label">License Plate:</span> ${workOrder.vehicle.licensePlate || 'N/A'}
        </div>
        <div class="info-item">
          <span class="info-label">Current Mileage:</span> ${(workOrder.vehicle as any).currentMileage.toLocaleString()} miles
        </div>
      </div>
    </div>
  </div>

  ${workOrder.technician ? `
  <div class="section">
    <div class="section-title">Assigned Technician</div>
    <div class="info-item">
      <span class="info-label">Name:</span> ${workOrder.technician.name}
    </div>
    <div class="info-item">
      <span class="info-label">ID:</span> ${workOrder.technician.id}
    </div>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Services to be Performed</div>
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">Done</th>
          <th>Service</th>
          <th>Description</th>
          <th style="width: 100px;">Labor Time</th>
        </tr>
      </thead>
      <tbody>
        ${workOrder.services.map(service => `
        <tr>
          <td style="text-align: center;"><span class="checkbox"></span></td>
          <td>${service.name}</td>
          <td>${service.description}</td>
          <td>${service.laborMinutes} min</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  ${workOrder.parts.length > 0 ? `
  <div class="section">
    <div class="section-title">Parts Required</div>
    <table>
      <thead>
        <tr>
          <th>Part Number</th>
          <th>Description</th>
          <th style="width: 80px;">Quantity</th>
        </tr>
      </thead>
      <tbody>
        ${workOrder.parts.map(part => `
        <tr>
          <td>${part.partNumber}</td>
          <td>${part.description}</td>
          <td style="text-align: center;">${part.quantity}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Labor Summary</div>
    <div class="info-item">
      <span class="info-label">Total Labor Time:</span> ${workOrder.laborSummary.totalHours} hours (${workOrder.laborSummary.totalMinutes} minutes)
    </div>
    <div class="info-item">
      <span class="info-label">Estimated Completion:</span> ${workOrder.laborSummary.estimatedCompletionTime}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Pricing Summary</div>
    <table class="pricing-table">
      <tr>
        <td>Subtotal:</td>
        <td style="text-align: right;">$${workOrder.pricingSummary.subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td>Tax:</td>
        <td style="text-align: right;">$${workOrder.pricingSummary.tax.toFixed(2)}</td>
      </tr>
      ${workOrder.pricingSummary.discounts > 0 ? `
      <tr>
        <td>Discounts:</td>
        <td style="text-align: right;">-$${workOrder.pricingSummary.discounts.toFixed(2)}</td>
      </tr>
      ` : ''}
      <tr class="total-row">
        <td>Total:</td>
        <td style="text-align: right;">$${workOrder.pricingSummary.total.toFixed(2)}</td>
      </tr>
    </table>
  </div>

  ${workOrder.instructions ? `
  <div class="section">
    <div class="section-title">Special Instructions</div>
    <p>${workOrder.instructions}</p>
  </div>
  ` : ''}

  <div class="signature-section">
    <div>
      <div class="signature-line">
        Customer Signature
      </div>
    </div>
    <div>
      <div class="signature-line">
        Technician Signature
      </div>
    </div>
  </div>

  <div class="barcode">
    ${workOrder.barcodeData}
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Print work order
   * Opens browser print dialog with work order HTML
   * @param workOrder Work order object
   */
  printWorkOrder(workOrder: WorkOrder): void {
    const html = this.generatePrintableHTML(workOrder);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } else {
      console.error('[WorkOrderService] Failed to open print window');
      alert('Please allow popups to print work orders');
    }
  }
}
