/**
 * Property-Based Tests for Appointment Model
 * 
 * Tests universal properties that should hold for all valid appointment data.
 * Uses fast-check library for property-based testing.
 */

import * as fc from 'fast-check';
import { Appointment, AppointmentStatus } from './appointment.model';

describe('Appointment Model Property Tests', () => {
  
  /**
   * Property 84: IndexedDB Serialization Round-Trip
   * 
   * For any valid Appointment object, serializing to JSON, storing in IndexedDB,
   * retrieving, and deserializing should produce an equivalent Appointment object
   * with all fields intact.
   * 
   * Validates: Requirements 8.1, 14.5
   * Feature: appointments-management
   */
  describe('Property 84: IndexedDB Serialization Round-Trip', () => {
    it('should preserve all appointment fields through JSON serialization round-trip', () => {
      fc.assert(
        fc.property(
          appointmentArbitrary(),
          (appointment) => {
            // Serialize to JSON (simulating IndexedDB storage)
            const serialized = JSON.stringify(appointment);
            
            // Deserialize from JSON (simulating IndexedDB retrieval)
            const deserialized: Appointment = JSON.parse(serialized);
            
            // Verify all required fields are preserved
            expect(deserialized.id).toBe(appointment.id);
            expect(deserialized.customerId).toBe(appointment.customerId);
            expect(deserialized.vehicleId).toBe(appointment.vehicleId);
            expect(deserialized.serviceTypes).toEqual(appointment.serviceTypes);
            expect(deserialized.scheduledDateTime).toBe(appointment.scheduledDateTime);
            expect(deserialized.endDateTime).toBe(appointment.endDateTime);
            expect(deserialized.duration).toBe(appointment.duration);
            expect(deserialized.bufferTime).toBe(appointment.bufferTime);
            expect(deserialized.serviceBay).toBe(appointment.serviceBay);
            expect(deserialized.technicianId).toBe(appointment.technicianId);
            expect(deserialized.status).toBe(appointment.status);
            expect(deserialized.createdBy).toBe(appointment.createdBy);
            expect(deserialized.createdDate).toBe(appointment.createdDate);
            expect(deserialized.version).toBe(appointment.version);
            
            // Verify optional fields are preserved
            if (appointment.checkInTime !== undefined) {
              expect(deserialized.checkInTime).toBe(appointment.checkInTime);
            }
            if (appointment.startTime !== undefined) {
              expect(deserialized.startTime).toBe(appointment.startTime);
            }
            if (appointment.completionTime !== undefined) {
              expect(deserialized.completionTime).toBe(appointment.completionTime);
            }
            if (appointment.cancellationTime !== undefined) {
              expect(deserialized.cancellationTime).toBe(appointment.cancellationTime);
            }
            if (appointment.cancellationReason !== undefined) {
              expect(deserialized.cancellationReason).toBe(appointment.cancellationReason);
            }
            if (appointment.notes !== undefined) {
              expect(deserialized.notes).toBe(appointment.notes);
            }
            if (appointment.lastModifiedBy !== undefined) {
              expect(deserialized.lastModifiedBy).toBe(appointment.lastModifiedBy);
            }
            if (appointment.lastModifiedDate !== undefined) {
              expect(deserialized.lastModifiedDate).toBe(appointment.lastModifiedDate);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle appointments with all optional fields populated', () => {
      fc.assert(
        fc.property(
          appointmentWithAllFieldsArbitrary(),
          (appointment) => {
            const serialized = JSON.stringify(appointment);
            const deserialized: Appointment = JSON.parse(serialized);
            
            // All fields should be preserved
            expect(deserialized).toEqual(appointment);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle appointments with minimal required fields only', () => {
      fc.assert(
        fc.property(
          minimalAppointmentArbitrary(),
          (appointment) => {
            const serialized = JSON.stringify(appointment);
            const deserialized: Appointment = JSON.parse(serialized);
            
            // Required fields should be preserved
            expect(deserialized.id).toBe(appointment.id);
            expect(deserialized.customerId).toBe(appointment.customerId);
            expect(deserialized.vehicleId).toBe(appointment.vehicleId);
            expect(deserialized.serviceTypes).toEqual(appointment.serviceTypes);
            expect(deserialized.status).toBe(appointment.status);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Arbitrary generator for valid Appointment objects
 */
function appointmentArbitrary(): fc.Arbitrary<Appointment> {
  const now = Date.now();
  const futureDate = now + 30 * 24 * 60 * 60 * 1000;
  
  return fc.record({
    id: fc.uuid(),
    customerId: fc.uuid(),
    vehicleId: fc.uuid(),
    serviceTypes: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
    scheduledDateTime: fc.integer({ min: now, max: futureDate })
      .map(timestamp => new Date(timestamp).toISOString()),
    endDateTime: fc.integer({ min: now, max: futureDate })
      .map(timestamp => new Date(timestamp).toISOString()),
    duration: fc.integer({ min: 15, max: 240 }),
    bufferTime: fc.constant(15),
    serviceBay: fc.integer({ min: 1, max: 4 }),
    technicianId: fc.uuid(),
    status: fc.constantFrom<AppointmentStatus>(
      'scheduled', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show'
    ),
    checkInTime: fc.option(
      fc.integer({ min: now - 7 * 24 * 60 * 60 * 1000, max: now })
        .map(timestamp => new Date(timestamp).toISOString()),
      { nil: undefined }
    ),
    startTime: fc.option(
      fc.integer({ min: now - 7 * 24 * 60 * 60 * 1000, max: now })
        .map(timestamp => new Date(timestamp).toISOString()),
      { nil: undefined }
    ),
    completionTime: fc.option(
      fc.integer({ min: now - 7 * 24 * 60 * 60 * 1000, max: now })
        .map(timestamp => new Date(timestamp).toISOString()),
      { nil: undefined }
    ),
    cancellationTime: fc.option(
      fc.integer({ min: now - 7 * 24 * 60 * 60 * 1000, max: now })
        .map(timestamp => new Date(timestamp).toISOString()),
      { nil: undefined }
    ),
    cancellationReason: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined }),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
    createdBy: fc.uuid(),
    createdDate: fc.integer({ min: now - 30 * 24 * 60 * 60 * 1000, max: now })
      .map(timestamp => new Date(timestamp).toISOString()),
    lastModifiedBy: fc.option(fc.uuid(), { nil: undefined }),
    lastModifiedDate: fc.option(
      fc.integer({ min: now - 30 * 24 * 60 * 60 * 1000, max: now })
        .map(timestamp => new Date(timestamp).toISOString()),
      { nil: undefined }
    ),
    version: fc.integer({ min: 1, max: 100 }),
  });
}

/**
 * Arbitrary generator for Appointment with all optional fields populated
 */
function appointmentWithAllFieldsArbitrary(): fc.Arbitrary<Appointment> {
  const now = Date.now();
  const futureDate = now + 30 * 24 * 60 * 60 * 1000;
  
  return fc.record({
    id: fc.uuid(),
    customerId: fc.uuid(),
    vehicleId: fc.uuid(),
    serviceTypes: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
    scheduledDateTime: fc.integer({ min: now, max: futureDate })
      .map(timestamp => new Date(timestamp).toISOString()),
    endDateTime: fc.integer({ min: now, max: futureDate })
      .map(timestamp => new Date(timestamp).toISOString()),
    duration: fc.integer({ min: 15, max: 240 }),
    bufferTime: fc.constant(15),
    serviceBay: fc.integer({ min: 1, max: 4 }),
    technicianId: fc.uuid(),
    status: fc.constantFrom<AppointmentStatus>(
      'scheduled', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show'
    ),
    checkInTime: fc.integer({ min: now - 7 * 24 * 60 * 60 * 1000, max: now })
      .map(timestamp => new Date(timestamp).toISOString()),
    startTime: fc.integer({ min: now - 7 * 24 * 60 * 60 * 1000, max: now })
      .map(timestamp => new Date(timestamp).toISOString()),
    completionTime: fc.integer({ min: now - 7 * 24 * 60 * 60 * 1000, max: now })
      .map(timestamp => new Date(timestamp).toISOString()),
    cancellationTime: fc.integer({ min: now - 7 * 24 * 60 * 60 * 1000, max: now })
      .map(timestamp => new Date(timestamp).toISOString()),
    cancellationReason: fc.string({ minLength: 10, maxLength: 200 }),
    notes: fc.string({ minLength: 0, maxLength: 500 }),
    createdBy: fc.uuid(),
    createdDate: fc.integer({ min: now - 30 * 24 * 60 * 60 * 1000, max: now })
      .map(timestamp => new Date(timestamp).toISOString()),
    lastModifiedBy: fc.uuid(),
    lastModifiedDate: fc.integer({ min: now - 30 * 24 * 60 * 60 * 1000, max: now })
      .map(timestamp => new Date(timestamp).toISOString()),
    version: fc.integer({ min: 1, max: 100 }),
  });
}

/**
 * Arbitrary generator for minimal Appointment with only required fields
 */
function minimalAppointmentArbitrary(): fc.Arbitrary<Appointment> {
  const now = Date.now();
  const futureDate = now + 30 * 24 * 60 * 60 * 1000;
  
  return fc.record({
    id: fc.uuid(),
    customerId: fc.uuid(),
    vehicleId: fc.uuid(),
    serviceTypes: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
    scheduledDateTime: fc.integer({ min: now, max: futureDate })
      .map(timestamp => new Date(timestamp).toISOString()),
    endDateTime: fc.integer({ min: now, max: futureDate })
      .map(timestamp => new Date(timestamp).toISOString()),
    duration: fc.integer({ min: 15, max: 240 }),
    bufferTime: fc.constant(15),
    serviceBay: fc.integer({ min: 1, max: 4 }),
    technicianId: fc.uuid(),
    status: fc.constantFrom<AppointmentStatus>(
      'scheduled', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show'
    ),
    createdBy: fc.uuid(),
    createdDate: fc.integer({ min: now - 30 * 24 * 60 * 60 * 1000, max: now })
      .map(timestamp => new Date(timestamp).toISOString()),
    version: fc.integer({ min: 1, max: 100 }),
  });
}
