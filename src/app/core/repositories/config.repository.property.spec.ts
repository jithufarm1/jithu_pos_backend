import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { ConfigRepository, ExpirationConfig } from './config.repository';

/**
 * Property-Based Tests for ConfigRepository
 * Feature: offline-authentication
 */
describe('ConfigRepository - Property Tests', () => {
  let repository: ConfigRepository;

  beforeEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000; // 30 seconds for property tests
    TestBed.configureTestingModule({
      providers: [ConfigRepository]
    });
    repository = TestBed.inject(ConfigRepository);
  });

  afterEach(async () => {
    // Clean up IndexedDB after each test
    const dbName = 'vehicle-pos-db';
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete database'));
      request.onblocked = () => {
        console.warn('Database deletion blocked');
        resolve();
      };
    });
  });

  /**
   * Property 29: Configuration round-trip
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7**
   * 
   * For any valid configuration object, storing it and then retrieving it
   * should return an equivalent configuration with all fields preserved
   */
  it('Property 29: Configuration round-trip - storing and retrieving preserves all fields', async () => {
    // Generator for valid configuration values
    const configArbitrary = fc.record({
      normalPeriodDays: fc.integer({ min: 1, max: 365 }),
      warningStartDays: fc.integer({ min: 1, max: 365 }),
      gracePeriodDays: fc.integer({ min: 1, max: 365 }),
      overrideRequiredDays: fc.integer({ min: 1, max: 365 }),
      emergencyTokenValidityDays: fc.integer({ min: 1, max: 365 }),
      overrideExtensionDays: fc.integer({ min: 1, max: 365 }),
      maxOverrideCount: fc.integer({ min: 1, max: 10 })
    });

    await fc.assert(
      fc.asyncProperty(configArbitrary, async (config) => {
        // Store the configuration
        await repository.storeConfig(config);

        // Retrieve the configuration
        const retrieved = await repository.getConfig();

        // Verify all fields are preserved
        expect(retrieved.normalPeriodDays).toBe(config.normalPeriodDays);
        expect(retrieved.warningStartDays).toBe(config.warningStartDays);
        expect(retrieved.gracePeriodDays).toBe(config.gracePeriodDays);
        expect(retrieved.overrideRequiredDays).toBe(config.overrideRequiredDays);
        expect(retrieved.emergencyTokenValidityDays).toBe(config.emergencyTokenValidityDays);
        expect(retrieved.overrideExtensionDays).toBe(config.overrideExtensionDays);
        expect(retrieved.maxOverrideCount).toBe(config.maxOverrideCount);

        // Verify metadata fields exist
        expect(retrieved.id).toBe('expiration-config');
        expect(retrieved.lastUpdated).toBeInstanceOf(Date);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property test: Partial configuration updates preserve unmodified fields
   * 
   * When updating only some fields, other fields should remain unchanged
   */
  it('Property: Partial configuration updates preserve unmodified fields', async () => {
    const fullConfigArbitrary = fc.record({
      normalPeriodDays: fc.integer({ min: 1, max: 365 }),
      warningStartDays: fc.integer({ min: 1, max: 365 }),
      gracePeriodDays: fc.integer({ min: 1, max: 365 }),
      overrideRequiredDays: fc.integer({ min: 1, max: 365 }),
      emergencyTokenValidityDays: fc.integer({ min: 1, max: 365 }),
      overrideExtensionDays: fc.integer({ min: 1, max: 365 }),
      maxOverrideCount: fc.integer({ min: 1, max: 10 })
    });

    const partialConfigArbitrary = fc.record({
      normalPeriodDays: fc.integer({ min: 1, max: 365 })
    });

    await fc.assert(
      fc.asyncProperty(
        fullConfigArbitrary,
        partialConfigArbitrary,
        async (initialConfig, partialUpdate) => {
          // Store initial configuration
          await repository.storeConfig(initialConfig);

          // Update with partial configuration
          await repository.storeConfig(partialUpdate);

          // Retrieve the configuration
          const retrieved = await repository.getConfig();

          // Verify the updated field
          expect(retrieved.normalPeriodDays).toBe(partialUpdate.normalPeriodDays);

          // Verify other fields are preserved from initial config
          expect(retrieved.warningStartDays).toBe(initialConfig.warningStartDays);
          expect(retrieved.gracePeriodDays).toBe(initialConfig.gracePeriodDays);
          expect(retrieved.overrideRequiredDays).toBe(initialConfig.overrideRequiredDays);
          expect(retrieved.emergencyTokenValidityDays).toBe(initialConfig.emergencyTokenValidityDays);
          expect(retrieved.overrideExtensionDays).toBe(initialConfig.overrideExtensionDays);
          expect(retrieved.maxOverrideCount).toBe(initialConfig.maxOverrideCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test: Default configuration is always available
   * 
   * When no configuration has been stored, getConfig should return default values
   */
  it('Property: Default configuration is always available on first access', async () => {
    // Get configuration without storing anything first
    const config = await repository.getConfig();

    // Verify default values are returned
    expect(config.normalPeriodDays).toBe(7);
    expect(config.warningStartDays).toBe(7);
    expect(config.gracePeriodDays).toBe(14);
    expect(config.overrideRequiredDays).toBe(14);
    expect(config.emergencyTokenValidityDays).toBe(30);
    expect(config.overrideExtensionDays).toBe(7);
    expect(config.maxOverrideCount).toBe(3);
    expect(config.id).toBe('expiration-config');
    expect(config.lastUpdated).toBeInstanceOf(Date);
  });

  /**
   * Property test: lastUpdated is always updated on store
   * 
   * Every time configuration is stored, lastUpdated should be set to current time
   */
  it('Property: lastUpdated is always updated on store', async () => {
    const configArbitrary = fc.record({
      normalPeriodDays: fc.integer({ min: 1, max: 365 })
    });

    await fc.assert(
      fc.asyncProperty(configArbitrary, async (config) => {
        const beforeStore = new Date();
        
        // Small delay to ensure time difference
        await new Promise(resolve => setTimeout(resolve, 10));
        
        await repository.storeConfig(config);
        
        const afterStore = new Date();
        const retrieved = await repository.getConfig();

        // lastUpdated should be between beforeStore and afterStore
        expect(retrieved.lastUpdated.getTime()).toBeGreaterThanOrEqual(beforeStore.getTime());
        expect(retrieved.lastUpdated.getTime()).toBeLessThanOrEqual(afterStore.getTime());
      }),
      { numRuns: 50 } // Fewer runs due to setTimeout
    );
  });
});
