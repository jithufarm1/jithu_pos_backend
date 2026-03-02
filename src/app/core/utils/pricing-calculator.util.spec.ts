import {
  calculateTicketTotals,
  calculateLineTotal,
  applyDiscount,
  removeDiscount,
  requiresManagerApproval,
  round,
  formatCurrency,
  calculateLaborHours,
} from './pricing-calculator.util';
import {
  ServiceTicket,
  TicketLineItem,
  Discount,
} from '../models/service-ticket.model';

describe('PricingCalculatorUtil', () => {
  describe('round', () => {
    it('should round to 2 decimal places by default', () => {
      expect(round(10.555)).toBe(10.56);
      expect(round(10.554)).toBe(10.55);
      expect(round(10.5)).toBe(10.5);
    });

    it('should round to specified decimal places', () => {
      expect(round(10.555, 1)).toBe(10.6);
      expect(round(10.555, 0)).toBe(11);
    });
  });

  describe('calculateLineTotal', () => {
    it('should calculate line total as price × quantity', () => {
      const lineItem: TicketLineItem = {
        id: '1',
        serviceId: 's1',
        serviceName: 'Oil Change',
        category: 'Oil_Change',
        quantity: 2,
        unitPrice: 49.99,
        lineTotal: 0,
        partsCost: 20,
        laborCost: 29.99,
        laborMinutes: 30,
      };

      const total = calculateLineTotal(lineItem);
      expect(total).toBe(99.98);
    });

    it('should round to 2 decimal places', () => {
      const lineItem: TicketLineItem = {
        id: '1',
        serviceId: 's1',
        serviceName: 'Service',
        category: 'Oil_Change',
        quantity: 3,
        unitPrice: 10.333,
        lineTotal: 0,
        partsCost: 5,
        laborCost: 5.333,
        laborMinutes: 15,
      };

      const total = calculateLineTotal(lineItem);
      expect(total).toBe(31.0);
    });
  });

  describe('calculateTicketTotals', () => {
    it('should calculate subtotal as sum of line totals', () => {
      const ticket: ServiceTicket = {
        id: 't1',
        ticketNumber: 'T-001',
        customerId: 'c1',
        customerName: 'John Doe',
        vehicleId: 'v1',
        vehicleInfo: {
          id: 'v1',
          vin: 'VIN123',
          year: 2020,
          make: 'Toyota',
          model: 'Camry',
        },
        status: 'Created',
        lineItems: [
          {
            id: '1',
            serviceId: 's1',
            serviceName: 'Oil Change',
            category: 'Oil_Change',
            quantity: 1,
            unitPrice: 49.99,
            lineTotal: 0,
            partsCost: 20,
            laborCost: 29.99,
            laborMinutes: 30,
          },
          {
            id: '2',
            serviceId: 's2',
            serviceName: 'Air Filter',
            category: 'Filters',
            quantity: 1,
            unitPrice: 25.0,
            lineTotal: 0,
            partsCost: 15,
            laborCost: 10,
            laborMinutes: 15,
          },
        ],
        subtotal: 0,
        tax: 0,
        taxRate: 0.08,
        discounts: [],
        total: 0,
        partsTotal: 0,
        laborTotal: 0,
        totalLaborMinutes: 0,
        createdBy: 'emp1',
        createdDate: '2024-01-01T10:00:00Z',
        currentMileage: 50000,
        statusHistory: [],
      };

      const totals = calculateTicketTotals(ticket);
      expect(totals.subtotal).toBe(74.99);
      expect(totals.partsTotal).toBe(35);
      expect(totals.laborTotal).toBe(39.99);
      expect(totals.totalLaborMinutes).toBe(45);
    });

    it('should calculate tax correctly', () => {
      const ticket: ServiceTicket = {
        id: 't1',
        ticketNumber: 'T-001',
        customerId: 'c1',
        customerName: 'John Doe',
        vehicleId: 'v1',
        vehicleInfo: {
          id: 'v1',
          vin: 'VIN123',
          year: 2020,
          make: 'Toyota',
          model: 'Camry',
        },
        status: 'Created',
        lineItems: [
          {
            id: '1',
            serviceId: 's1',
            serviceName: 'Oil Change',
            category: 'Oil_Change',
            quantity: 1,
            unitPrice: 100.0,
            lineTotal: 0,
            partsCost: 50,
            laborCost: 50,
            laborMinutes: 30,
          },
        ],
        subtotal: 0,
        tax: 0,
        taxRate: 0.08,
        discounts: [],
        total: 0,
        partsTotal: 0,
        laborTotal: 0,
        totalLaborMinutes: 0,
        createdBy: 'emp1',
        createdDate: '2024-01-01T10:00:00Z',
        currentMileage: 50000,
        statusHistory: [],
      };

      const totals = calculateTicketTotals(ticket);
      expect(totals.subtotal).toBe(100.0);
      expect(totals.tax).toBe(8.0);
      expect(totals.total).toBe(108.0);
    });

    it('should apply percentage discount correctly', () => {
      const ticket: ServiceTicket = {
        id: 't1',
        ticketNumber: 'T-001',
        customerId: 'c1',
        customerName: 'John Doe',
        vehicleId: 'v1',
        vehicleInfo: {
          id: 'v1',
          vin: 'VIN123',
          year: 2020,
          make: 'Toyota',
          model: 'Camry',
        },
        status: 'Created',
        lineItems: [
          {
            id: '1',
            serviceId: 's1',
            serviceName: 'Oil Change',
            category: 'Oil_Change',
            quantity: 1,
            unitPrice: 100.0,
            lineTotal: 0,
            partsCost: 50,
            laborCost: 50,
            laborMinutes: 30,
          },
        ],
        subtotal: 0,
        tax: 0,
        taxRate: 0.08,
        discounts: [
          {
            id: 'd1',
            type: 'percentage',
            value: 10,
            amount: 0,
            reason: 'Loyalty discount',
            appliedBy: 'emp1',
            appliedDate: '2024-01-01T10:00:00Z',
            requiresApproval: false,
          },
        ],
        total: 0,
        partsTotal: 0,
        laborTotal: 0,
        totalLaborMinutes: 0,
        createdBy: 'emp1',
        createdDate: '2024-01-01T10:00:00Z',
        currentMileage: 50000,
        statusHistory: [],
      };

      const totals = calculateTicketTotals(ticket);
      expect(totals.subtotal).toBe(100.0);
      expect(totals.discountTotal).toBe(10.0);
      expect(totals.tax).toBe(7.2); // (100 - 10) * 0.08
      expect(totals.total).toBe(97.2); // 100 - 10 + 7.2
    });

    it('should apply amount discount correctly', () => {
      const ticket: ServiceTicket = {
        id: 't1',
        ticketNumber: 'T-001',
        customerId: 'c1',
        customerName: 'John Doe',
        vehicleId: 'v1',
        vehicleInfo: {
          id: 'v1',
          vin: 'VIN123',
          year: 2020,
          make: 'Toyota',
          model: 'Camry',
        },
        status: 'Created',
        lineItems: [
          {
            id: '1',
            serviceId: 's1',
            serviceName: 'Oil Change',
            category: 'Oil_Change',
            quantity: 1,
            unitPrice: 100.0,
            lineTotal: 0,
            partsCost: 50,
            laborCost: 50,
            laborMinutes: 30,
          },
        ],
        subtotal: 0,
        tax: 0,
        taxRate: 0.08,
        discounts: [
          {
            id: 'd1',
            type: 'amount',
            value: 15.0,
            amount: 0,
            reason: 'Coupon',
            appliedBy: 'emp1',
            appliedDate: '2024-01-01T10:00:00Z',
            requiresApproval: false,
          },
        ],
        total: 0,
        partsTotal: 0,
        laborTotal: 0,
        totalLaborMinutes: 0,
        createdBy: 'emp1',
        createdDate: '2024-01-01T10:00:00Z',
        currentMileage: 50000,
        statusHistory: [],
      };

      const totals = calculateTicketTotals(ticket);
      expect(totals.subtotal).toBe(100.0);
      expect(totals.discountTotal).toBe(15.0);
      expect(totals.tax).toBe(6.8); // (100 - 15) * 0.08
      expect(totals.total).toBe(91.8); // 100 - 15 + 6.8
    });
  });

  describe('requiresManagerApproval', () => {
    it('should require approval for discount > 10%', () => {
      const discount: Discount = {
        id: 'd1',
        type: 'percentage',
        value: 15,
        amount: 0,
        reason: 'Large discount',
        appliedBy: 'emp1',
        appliedDate: '2024-01-01T10:00:00Z',
        requiresApproval: false,
      };

      expect(requiresManagerApproval(discount, 100)).toBe(true);
    });

    it('should not require approval for discount <= 10%', () => {
      const discount: Discount = {
        id: 'd1',
        type: 'percentage',
        value: 10,
        amount: 0,
        reason: 'Standard discount',
        appliedBy: 'emp1',
        appliedDate: '2024-01-01T10:00:00Z',
        requiresApproval: false,
      };

      expect(requiresManagerApproval(discount, 100)).toBe(false);
    });

    it('should require approval for amount discount > 10% of subtotal', () => {
      const discount: Discount = {
        id: 'd1',
        type: 'amount',
        value: 15,
        amount: 0,
        reason: 'Large discount',
        appliedBy: 'emp1',
        appliedDate: '2024-01-01T10:00:00Z',
        requiresApproval: false,
      };

      expect(requiresManagerApproval(discount, 100)).toBe(true);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency with $ and 2 decimals', () => {
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
    });
  });

  describe('calculateLaborHours', () => {
    it('should convert minutes to hours', () => {
      expect(calculateLaborHours(60)).toBe(1.0);
      expect(calculateLaborHours(90)).toBe(1.5);
      expect(calculateLaborHours(45)).toBe(0.75);
    });
  });
});
