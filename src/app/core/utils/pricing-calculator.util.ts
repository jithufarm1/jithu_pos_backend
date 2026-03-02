import {
  ServiceTicket,
  TicketLineItem,
  TicketTotals,
  Discount,
} from '../models/service-ticket.model';

/**
 * Pricing Calculator Utility
 * Provides functions for calculating ticket totals, taxes, and discounts
 * All currency values are rounded to 2 decimal places
 */

/**
 * Round a number to specified decimal places
 */
export function round(value: number, decimals: number = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Calculate line item total
 * Line Total = Unit Price × Quantity
 */
export function calculateLineTotal(lineItem: TicketLineItem): number {
  return round(lineItem.unitPrice * lineItem.quantity);
}

/**
 * Calculate complete ticket totals
 * Includes subtotal, parts/labor separation, tax, discounts, and final total
 */
export function calculateTicketTotals(ticket: ServiceTicket): TicketTotals {
  // Step 1: Calculate line item totals
  let subtotal = 0;
  let partsTotal = 0;
  let laborTotal = 0;
  let totalLaborMinutes = 0;

  for (const lineItem of ticket.lineItems) {
    // Calculate line total
    lineItem.lineTotal = calculateLineTotal(lineItem);
    subtotal += lineItem.lineTotal;

    // Separate parts and labor
    partsTotal += lineItem.partsCost * lineItem.quantity;
    laborTotal += lineItem.laborCost * lineItem.quantity;
    totalLaborMinutes += lineItem.laborMinutes * lineItem.quantity;
  }

  // Step 2: Calculate discount total
  let discountTotal = 0;
  for (const discount of ticket.discounts) {
    if (discount.type === 'percentage') {
      discount.amount = round(subtotal * (discount.value / 100));
    } else {
      discount.amount = discount.value;
    }
    discountTotal += discount.amount;
  }

  // Step 3: Calculate tax
  const taxableAmount = subtotal - discountTotal;
  const tax = round(taxableAmount * ticket.taxRate);

  // Step 4: Calculate total
  const total = subtotal - discountTotal + tax;

  return {
    subtotal: round(subtotal),
    tax: round(tax),
    discountTotal: round(discountTotal),
    total: round(total),
    partsTotal: round(partsTotal),
    laborTotal: round(laborTotal),
    totalLaborMinutes,
  };
}

/**
 * Apply discount to ticket and recalculate totals
 */
export function applyDiscount(
  ticket: ServiceTicket,
  discount: Discount
): ServiceTicket {
  // Add discount to ticket
  ticket.discounts.push(discount);

  // Recalculate totals
  const totals = calculateTicketTotals(ticket);
  ticket.subtotal = totals.subtotal;
  ticket.tax = totals.tax;
  ticket.total = totals.total;
  ticket.partsTotal = totals.partsTotal;
  ticket.laborTotal = totals.laborTotal;
  ticket.totalLaborMinutes = totals.totalLaborMinutes;

  return ticket;
}

/**
 * Remove discount from ticket and recalculate totals
 */
export function removeDiscount(
  ticket: ServiceTicket,
  discountId: string
): ServiceTicket {
  // Remove discount from ticket
  ticket.discounts = ticket.discounts.filter((d) => d.id !== discountId);

  // Recalculate totals
  const totals = calculateTicketTotals(ticket);
  ticket.subtotal = totals.subtotal;
  ticket.tax = totals.tax;
  ticket.total = totals.total;
  ticket.partsTotal = totals.partsTotal;
  ticket.laborTotal = totals.laborTotal;
  ticket.totalLaborMinutes = totals.totalLaborMinutes;

  return ticket;
}

/**
 * Calculate discount amount based on type
 */
export function calculateDiscountAmount(
  discount: Discount,
  subtotal: number
): number {
  if (discount.type === 'percentage') {
    return round(subtotal * (discount.value / 100));
  } else {
    return round(discount.value);
  }
}

/**
 * Check if discount requires manager approval (>10% of subtotal)
 */
export function requiresManagerApproval(
  discount: Discount,
  subtotal: number
): boolean {
  const discountAmount = calculateDiscountAmount(discount, subtotal);
  const discountPercentage = (discountAmount / subtotal) * 100;
  return discountPercentage > 10;
}

/**
 * Format currency value for display
 */
export function formatCurrency(value: number): string {
  return `$${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/**
 * Calculate total labor hours from minutes
 */
export function calculateLaborHours(totalLaborMinutes: number): number {
  return round(totalLaborMinutes / 60, 2);
}
