import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { ExpirationService, ExpirationTier } from './expiration.service';
import { ConfigRepository } from '../repositories/config.repository';
import { TokenService } from './token.service';
import { TokenRepository } from '../repositories/token.repository';

/**
 * Property-Based Tests for ExpirationService
 * Feature: offline-authentication
 */
describe('ExpirationService - Property Tests', () => {
  let service: ExpirationService;
  let tokenService: TokenService;
  let configRepository: ConfigRepository;

  beforeEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000; // 30 seconds for property tests
    TestBed.configureTestingModule({
      providers: [
        ExpirationService,
        ConfigRepository,
        TokenService,
        TokenRepository
      ]
    });
    service = TestBed.inject(ExpirationService);
    tokenService = TestBed.inject(TokenService);
    configRepository = TestBed.inject(ConfigRepository);
  });

  afterEach(async () => {
    // Clean up IndexedDB and localStorage after each test
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
    localStorage.clear();
  });

  /**
   * Helper function to set last sync time
   */
  async function setLastSyncTime(daysAgo: number): Promise<void> {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    // Store a token with the specified last sync time
    await tokenService.storeToken('EMP001', 'test-token', false);
    
    // Manually update the metadata with the desired last sync time
    const metadata = {
      locked: false,
      lastSyncTime: date.toISOString(),
      deviceID: 'test-device'
    };
    localStorage.setItem('auth_token_metadata', JSON.stringify(metadata));
  }

  /**
   * Helper function to get tier order value
   */
  function getTierOrder(tier: ExpirationTier): number {
    const order = {
      [ExpirationTier.NORMAL]: 0,
      [ExpirationTier.WARNING]: 1,
      [ExpirationTier.GRACE]: 2,
      [ExpirationTier.OVERRIDE_REQUIRED]: 3
    };
    return order[tier];
  }

  /**
   * Property 13: Expiration tier calculation is monotonic
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
   * 
   * For any two timestamps t1 and t2 where t1 < t2, if the expiration tier at t1 is X,
   * then the tier at t2 should be X or a more restrictive tier
   * (normal → warning → grace → override_required)
   */
  it('Property 13: Expiration tier calculation is monotonic', async () => {
    // Generator for two days values where days1 < days2
    const daysArbitrary = fc.tuple(
      fc.integer({ min: 0, max: 30 }),
      fc.integer({ min: 0, max: 30 })
    ).filter(([d1, d2]) => d1 < d2);

    await fc.assert(
      fc.asyncProperty(daysArbitrary, async ([days1, days2]) => {
        // Set up default configuration
        await configRepository.storeConfig({
          normalPeriodDays: 7,
          warningStartDays: 7,
          gracePeriodDays: 14,
          overrideRequiredDays: 14
        });

        // Get tier at t1 (days1 ago)
        await setLastSyncTime(days1);
        const tier1 = await service.getCurrentTier();
        const order1 = getTierOrder(tier1);

        // Get tier at t2 (days2 ago)
        await setLastSyncTime(days2);
        const tier2 = await service.getCurrentTier();
        const order2 = getTierOrder(tier2);

        // Tier at t2 should be >= tier at t1 (more restrictive or same)
        expect(order2).toBeGreaterThanOrEqual(order1);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property test: Tier transitions are deterministic
   * 
   * For the same days since last sync, the tier should always be the same
   */
  it('Property: Tier transitions are deterministic', async () => {
    const daysArbitrary = fc.integer({ min: 0, max: 30 });

    await fc.assert(
      fc.asyncProperty(daysArbitrary, async (days) => {
        // Set up default configuration
        await configRepository.storeConfig({
          normalPeriodDays: 7,
          warningStartDays: 7,
          gracePeriodDays: 14,
          overrideRequiredDays: 14
        });

        // Get tier twice for the same days value
        await setLastSyncTime(days);
        const tier1 = await service.getCurrentTier();

        await setLastSyncTime(days);
        const tier2 = await service.getCurrentTier();

        // Should be the same
        expect(tier1).toBe(tier2);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property test: Days since last sync is always non-negative
   * 
   * The calculated days since last sync should never be negative
   */
  it('Property: Days since last sync is always non-negative', async () => {
    const daysArbitrary = fc.integer({ min: 0, max: 365 });

    await fc.assert(
      fc.asyncProperty(daysArbitrary, async (days) => {
        await setLastSyncTime(days);
        const daysSinceSync = await service.getDaysSinceLastSync();

        expect(daysSinceSync).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property test: Days until next tier is non-negative
   * 
   * The calculated days until next tier should never be negative
   */
  it('Property: Days until next tier is non-negative', async () => {
    const daysArbitrary = fc.integer({ min: 0, max: 30 });

    await fc.assert(
      fc.asyncProperty(daysArbitrary, async (days) => {
        await configRepository.storeConfig({
          normalPeriodDays: 7,
          warningStartDays: 7,
          gracePeriodDays: 14,
          overrideRequiredDays: 14
        });

        await setLastSyncTime(days);
        const daysUntilNext = await service.getDaysUntilNextTier();

        expect(daysUntilNext).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property test: Configuration changes affect tier calculation
   * 
   * Changing configuration thresholds should affect the calculated tier
   */
  it('Property: Configuration changes affect tier calculation', async () => {
    const configArbitrary = fc.record({
      normalPeriodDays: fc.integer({ min: 1, max: 10 }),
      gracePeriodDays: fc.integer({ min: 11, max: 20 }),
      overrideRequiredDays: fc.integer({ min: 21, max: 30 })
    });

    await fc.assert(
      fc.asyncProperty(configArbitrary, async (config) => {
        // Set a fixed days value
        const testDays = 15;
        await setLastSyncTime(testDays);

        // Update configuration
        await configRepository.storeConfig({
          normalPeriodDays: config.normalPeriodDays,
          warningStartDays: config.normalPeriodDays,
          gracePeriodDays: config.gracePeriodDays,
          overrideRequiredDays: config.overrideRequiredDays
        });

        const tier = await service.getCurrentTier();

        // Verify tier matches the configuration
        if (testDays < config.normalPeriodDays) {
          expect(tier).toBe(ExpirationTier.NORMAL);
        } else if (testDays < config.gracePeriodDays) {
          expect(tier).toBe(ExpirationTier.WARNING);
        } else if (testDays < config.overrideRequiredDays) {
          expect(tier).toBe(ExpirationTier.GRACE);
        } else {
          expect(tier).toBe(ExpirationTier.OVERRIDE_REQUIRED);
        }
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property 14: Normal period allows unrestricted PIN auth
   * **Validates: Requirements 4.1**
   * 
   * For any authentication attempt where days since last sync is less than
   * the Normal_Period threshold, PIN authentication should be allowed without
   * requiring override or emergency tokens
   */
  it('Property 14: Normal period allows unrestricted PIN auth', async () => {
    const normalPeriodArbitrary = fc.integer({ min: 1, max: 30 });
    const daysArbitrary = fc.integer({ min: 0, max: 30 });

    await fc.assert(
      fc.asyncProperty(
        normalPeriodArbitrary,
        daysArbitrary,
        async (normalPeriod, days) => {
          // Set up configuration with the generated normal period
          await configRepository.storeConfig({
            normalPeriodDays: normalPeriod,
            warningStartDays: normalPeriod,
            gracePeriodDays: normalPeriod + 7,
            overrideRequiredDays: normalPeriod + 14
          });

          await setLastSyncTime(days);
          const tier = await service.getCurrentTier();
          const isPINAllowed = await service.isPINAuthAllowed();

          // If days < normalPeriod, should be in NORMAL tier and PIN allowed
          if (days < normalPeriod) {
            expect(tier).toBe(ExpirationTier.NORMAL);
            expect(isPINAllowed).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15: Override required period blocks standard PIN auth
   * **Validates: Requirements 4.4**
   * 
   * For any authentication attempt where days since last sync exceeds
   * the Override_Required_Period threshold, standard PIN authentication
   * should be rejected and require override or emergency authentication
   */
  it('Property 15: Override required period blocks standard PIN auth', async () => {
    const overrideRequiredArbitrary = fc.integer({ min: 1, max: 30 });
    const excessDaysArbitrary = fc.integer({ min: 0, max: 30 });

    await fc.assert(
      fc.asyncProperty(
        overrideRequiredArbitrary,
        excessDaysArbitrary,
        async (overrideRequired, excessDays) => {
          // Set up configuration
          await configRepository.storeConfig({
            normalPeriodDays: Math.max(1, overrideRequired - 7),
            warningStartDays: Math.max(1, overrideRequired - 7),
            gracePeriodDays: overrideRequired,
            overrideRequiredDays: overrideRequired
          });

          // Set days to be >= overrideRequired
          const days = overrideRequired + excessDays;
          await setLastSyncTime(days);

          const tier = await service.getCurrentTier();
          const isPINAllowed = await service.isPINAuthAllowed();

          // Should be in OVERRIDE_REQUIRED tier and PIN not allowed
          expect(tier).toBe(ExpirationTier.OVERRIDE_REQUIRED);
          expect(isPINAllowed).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16: Days remaining calculation accuracy
   * **Validates: Requirements 4.5**
   * 
   * For any current time and last sync time, the calculated days until next tier
   * should equal the tier threshold minus days since last sync
   */
  it('Property 16: Days remaining calculation accuracy', async () => {
    const daysArbitrary = fc.integer({ min: 0, max: 30 });

    await fc.assert(
      fc.asyncProperty(daysArbitrary, async (days) => {
        // Set up default configuration
        const config = {
          normalPeriodDays: 7,
          warningStartDays: 7,
          gracePeriodDays: 14,
          overrideRequiredDays: 14
        };
        await configRepository.storeConfig(config);

        await setLastSyncTime(days);
        const daysSinceSync = await service.getDaysSinceLastSync();
        const daysUntilNext = await service.getDaysUntilNextTier();
        const tier = await service.getCurrentTier();

        // Calculate expected days until next tier based on current tier
        let expectedDaysUntilNext: number;
        if (tier === ExpirationTier.NORMAL) {
          expectedDaysUntilNext = config.normalPeriodDays - daysSinceSync;
        } else if (tier === ExpirationTier.WARNING) {
          expectedDaysUntilNext = config.gracePeriodDays - daysSinceSync;
        } else if (tier === ExpirationTier.GRACE) {
          expectedDaysUntilNext = config.overrideRequiredDays - daysSinceSync;
        } else {
          expectedDaysUntilNext = 0;
        }

        // Verify the calculation
        expect(daysUntilNext).toBe(Math.max(0, expectedDaysUntilNext));
      }),
      { numRuns: 100 }
    );
  });
});
