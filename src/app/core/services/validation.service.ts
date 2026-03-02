import { Injectable } from '@angular/core';
import { ValidationResult, Customer, CustomerVehicle } from '../models/customer.model';
import { ServiceTicket, TicketLineItem, Discount, TicketStatus } from '../models/service-ticket.model';

/**
 * Validation Service
 * Provides reusable validation logic for customer and vehicle data
 */
@Injectable({
  providedIn: 'root',
})
export class ValidationService {
  // US State codes
  private readonly US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  constructor() {}

  /**
   * Validate phone number (10-digit US format)
   */
  validatePhone(phone: string): ValidationResult {
    const errors: string[] = [];
    
    if (!phone) {
      errors.push('Phone number is required');
      return { isValid: false, errors };
    }

    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.length !== 10) {
      errors.push('Phone number must be 10 digits');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate email address
   */
  validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    
    if (!email) {
      errors.push('Email address is required');
      return { isValid: false, errors };
    }

    // Standard email regex pattern
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailPattern.test(email)) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate ZIP code (5-digit or 9-digit US format)
   */
  validateZipCode(zip: string): ValidationResult {
    const errors: string[] = [];
    
    if (!zip) {
      errors.push('ZIP code is required');
      return { isValid: false, errors };
    }

    // 5-digit format: 12345 or 9-digit format: 12345-6789
    const zipPattern = /^\d{5}(-\d{4})?$/;
    
    if (!zipPattern.test(zip)) {
      errors.push('ZIP code must be 5 digits (12345) or 9 digits (12345-6789)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate state code (US state abbreviations)
   */
  validateState(state: string): ValidationResult {
    const errors: string[] = [];
    
    if (!state) {
      errors.push('State is required');
      return { isValid: false, errors };
    }

    const stateUpper = state.toUpperCase();
    
    if (!this.US_STATES.includes(stateUpper)) {
      errors.push('Invalid US state code');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate VIN (17 alphanumeric characters excluding I, O, Q)
   */
  validateVin(vin: string): ValidationResult {
    const errors: string[] = [];
    
    if (!vin) {
      errors.push('VIN is required');
      return { isValid: false, errors };
    }

    if (vin.length !== 17) {
      errors.push('VIN must be exactly 17 characters');
    }

    // VIN cannot contain I, O, or Q
    const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/i;
    
    if (!vinPattern.test(vin)) {
      errors.push('VIN must be 17 alphanumeric characters (excluding I, O, Q)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate vehicle year (1900 to current year + 1)
   */
  validateYear(year: number): ValidationResult {
    const errors: string[] = [];
    
    if (!year) {
      errors.push('Year is required');
      return { isValid: false, errors };
    }

    const currentYear = new Date().getFullYear();
    const minYear = 1900;
    const maxYear = currentYear + 1;

    if (year < minYear || year > maxYear) {
      errors.push(`Year must be between ${minYear} and ${maxYear}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate complete customer object
   */
  validateCustomer(customer: Partial<Customer>): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!customer.firstName || customer.firstName.trim() === '') {
      errors.push('First name is required');
    }

    if (!customer.lastName || customer.lastName.trim() === '') {
      errors.push('Last name is required');
    }

    if (!customer.phone) {
      errors.push('Phone number is required');
    } else {
      const phoneResult = this.validatePhone(customer.phone);
      if (!phoneResult.isValid) {
        errors.push(...phoneResult.errors);
      }
    }

    // Optional email validation
    if (customer.email) {
      const emailResult = this.validateEmail(customer.email);
      if (!emailResult.isValid) {
        errors.push(...emailResult.errors);
      }
    }

    // Address validation
    if (customer.address) {
      if (customer.address.zipCode) {
        const zipResult = this.validateZipCode(customer.address.zipCode);
        if (!zipResult.isValid) {
          errors.push(...zipResult.errors);
        }
      }

      if (customer.address.state) {
        const stateResult = this.validateState(customer.address.state);
        if (!stateResult.isValid) {
          errors.push(...stateResult.errors);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate complete vehicle object
   */
  validateVehicle(vehicle: Partial<CustomerVehicle>): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!vehicle.vin) {
      errors.push('VIN is required');
    } else {
      const vinResult = this.validateVin(vehicle.vin);
      if (!vinResult.isValid) {
        errors.push(...vinResult.errors);
      }
    }

    if (!vehicle.year) {
      errors.push('Year is required');
    } else {
      const yearResult = this.validateYear(vehicle.year);
      if (!yearResult.isValid) {
        errors.push(...yearResult.errors);
      }
    }

    if (!vehicle.make || vehicle.make.trim() === '') {
      errors.push('Make is required');
    }

    if (!vehicle.model || vehicle.model.trim() === '') {
      errors.push('Model is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for duplicate phone number
   * Note: This is a placeholder - actual implementation would query the backend/cache
   */
  async checkDuplicatePhone(phone: string, excludeCustomerId?: string): Promise<boolean> {
    // TODO: Implement actual duplicate check against backend/cache
    console.log('[ValidationService] Checking duplicate phone:', phone, 'excluding:', excludeCustomerId);
    return false;
  }

  /**
   * Check for duplicate email address
   * Note: This is a placeholder - actual implementation would query the backend/cache
   */
  async checkDuplicateEmail(email: string, excludeCustomerId?: string): Promise<boolean> {
    // TODO: Implement actual duplicate check against backend/cache
    console.log('[ValidationService] Checking duplicate email:', email, 'excluding:', excludeCustomerId);
    return false;
  }

  /**
   * Check for duplicate VIN
   * Note: This is a placeholder - actual implementation would query the backend/cache
   */
  async checkDuplicateVin(vin: string, excludeCustomerId?: string): Promise<boolean> {
    // TODO: Implement actual duplicate check against backend/cache
    console.log('[ValidationService] Checking duplicate VIN:', vin, 'excluding:', excludeCustomerId);
    return false;
  }

  // ==================== Service Ticket Validation Methods ====================

  /**
   * Validate mileage (must be positive integer)
   */
  validateMileage(mileage: number): ValidationResult {
    const errors: string[] = [];
    
    if (mileage === undefined || mileage === null) {
      errors.push('Mileage is required');
      return { isValid: false, errors };
    }

    if (mileage < 0) {
      errors.push('Mileage must be a positive number');
    }

    if (!Number.isInteger(mileage)) {
      errors.push('Mileage must be a whole number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate quantity (must be positive integer)
   */
  validateQuantity(quantity: number): ValidationResult {
    const errors: string[] = [];
    
    if (quantity === undefined || quantity === null) {
      errors.push('Quantity is required');
      return { isValid: false, errors };
    }

    if (quantity <= 0) {
      errors.push('Quantity must be greater than zero');
    }

    if (!Number.isInteger(quantity)) {
      errors.push('Quantity must be a whole number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate price (must be non-negative with max 2 decimal places)
   */
  validatePrice(price: number): ValidationResult {
    const errors: string[] = [];
    
    if (price === undefined || price === null) {
      errors.push('Price is required');
      return { isValid: false, errors };
    }

    if (price < 0) {
      errors.push('Price must be non-negative');
    }

    // Check decimal places
    const decimalPlaces = (price.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      errors.push('Price must have maximum 2 decimal places');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate tax rate (must be between 0 and 1)
   */
  validateTaxRate(taxRate: number): ValidationResult {
    const errors: string[] = [];
    
    if (taxRate === undefined || taxRate === null) {
      errors.push('Tax rate is required');
      return { isValid: false, errors };
    }

    if (taxRate < 0 || taxRate > 1) {
      errors.push('Tax rate must be between 0 and 1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate discount percentage (must be between 0 and 100)
   */
  validateDiscountPercentage(percentage: number): ValidationResult {
    const errors: string[] = [];
    
    if (percentage === undefined || percentage === null) {
      errors.push('Discount percentage is required');
      return { isValid: false, errors };
    }

    if (percentage < 0 || percentage > 100) {
      errors.push('Discount percentage must be between 0 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate discount amount (must not exceed subtotal)
   */
  validateDiscountAmount(amount: number, subtotal: number): ValidationResult {
    const errors: string[] = [];
    
    if (amount === undefined || amount === null) {
      errors.push('Discount amount is required');
      return { isValid: false, errors };
    }

    if (amount < 0) {
      errors.push('Discount amount must be non-negative');
    }

    if (amount > subtotal) {
      errors.push('Discount amount cannot exceed subtotal');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate ticket line item
   */
  validateLineItem(lineItem: Partial<TicketLineItem>): ValidationResult {
    const errors: string[] = [];

    if (!lineItem.serviceId || lineItem.serviceId.trim() === '') {
      errors.push('Service ID is required');
    }

    if (!lineItem.serviceName || lineItem.serviceName.trim() === '') {
      errors.push('Service name is required');
    }

    if (lineItem.quantity !== undefined) {
      const quantityResult = this.validateQuantity(lineItem.quantity);
      if (!quantityResult.isValid) {
        errors.push(...quantityResult.errors);
      }
    }

    if (lineItem.unitPrice !== undefined) {
      const priceResult = this.validatePrice(lineItem.unitPrice);
      if (!priceResult.isValid) {
        errors.push(...priceResult.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate discount
   */
  validateDiscount(discount: Discount, subtotal: number): ValidationResult {
    const errors: string[] = [];

    if (!discount.type || (discount.type !== 'percentage' && discount.type !== 'amount')) {
      errors.push('Discount type must be "percentage" or "amount"');
    }

    if (discount.type === 'percentage') {
      const percentageResult = this.validateDiscountPercentage(discount.value);
      if (!percentageResult.isValid) {
        errors.push(...percentageResult.errors);
      }
    } else if (discount.type === 'amount') {
      const amountResult = this.validateDiscountAmount(discount.value, subtotal);
      if (!amountResult.isValid) {
        errors.push(...amountResult.errors);
      }
    }

    if (!discount.reason || discount.reason.trim() === '') {
      errors.push('Discount reason is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate service ticket
   */
  validateTicket(ticket: Partial<ServiceTicket>): ValidationResult {
    const errors: string[] = [];

    // Customer validation
    if (!ticket.customerId || ticket.customerId.trim() === '') {
      errors.push('Customer ID is required');
    }

    // Vehicle validation
    if (!ticket.vehicleId || ticket.vehicleId.trim() === '') {
      errors.push('Vehicle ID is required');
    }

    // Line items validation
    if (!ticket.lineItems || ticket.lineItems.length === 0) {
      errors.push('At least one service must be added to the ticket');
    } else {
      ticket.lineItems.forEach((lineItem, index) => {
        const lineItemResult = this.validateLineItem(lineItem);
        if (!lineItemResult.isValid) {
          errors.push(`Line item ${index + 1}: ${lineItemResult.errors.join(', ')}`);
        }
      });
    }

    // Mileage validation
    if (ticket.currentMileage !== undefined) {
      const mileageResult = this.validateMileage(ticket.currentMileage);
      if (!mileageResult.isValid) {
        errors.push(...mileageResult.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate status transition
   */
  validateStatusTransition(currentStatus: TicketStatus, newStatus: TicketStatus, userRole?: string): ValidationResult {
    const errors: string[] = [];

    // Define valid transitions
    const validTransitions: Record<TicketStatus, TicketStatus[]> = {
      'Created': ['In_Progress'],
      'In_Progress': ['Completed', 'Created'],
      'Completed': ['Paid'],
      'Paid': []
    };

    // Check if transition is valid
    if (!validTransitions[currentStatus].includes(newStatus)) {
      errors.push(`Cannot transition from ${currentStatus} to ${newStatus}`);
      return { isValid: false, errors };
    }

    // Check manager permission for reverting
    if (currentStatus === 'In_Progress' && newStatus === 'Created') {
      if (userRole !== 'Manager') {
        errors.push('Manager permission required to revert ticket status');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if discount requires manager approval (>10% of subtotal)
   */
  requiresManagerApproval(discount: Discount, subtotal: number): boolean {
    let discountAmount = 0;
    
    if (discount.type === 'percentage') {
      discountAmount = subtotal * (discount.value / 100);
    } else {
      discountAmount = discount.value;
    }
    
    const discountPercentage = (discountAmount / subtotal) * 100;
    
    return discountPercentage > 10;
  }

  /**
   * Check if ticket can be edited based on status
   */
  canEditTicket(status: TicketStatus): boolean {
    return status === 'Created' || status === 'In_Progress';
  }

  /**
   * Check if ticket can be deleted based on status
   */
  canDeleteTicket(status: TicketStatus): boolean {
    return status === 'Created';
  }
}
