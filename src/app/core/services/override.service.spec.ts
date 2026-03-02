import { TestBed } from '@angular/core/testing';
import { OverrideService } from './override.service';
import { OverrideRepository, OverrideCode } from '../repositories/override.repository';
import { ConfigRepository } from '../repositories/config.repository';
import { EmergencyTokenRepository } from '../repositories/emergency-token.repository';
import { CryptoService } from './crypto.service';

describe('OverrideService', () => {
  let service: OverrideService;
  let overrideRepository: OverrideRepository;
  let configRepository: ConfigRepository;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        OverrideService, 
        OverrideRepository, 
        ConfigRepository,
        EmergencyTokenRepository,
        CryptoService
      ]
    });

    service = TestBed.inject(OverrideService);
    overrideRepository = TestBed.inject(OverrideRepository);
    configRepository = TestBed.inject(ConfigRepository);

    // Clear any existing data
    await overrideRepository.clearOverrideCache();
  });

  afterEach(async () => {
    await overrideRepository.clearOverrideCache();
  });

  describe('3-override limit edge case', () => {
    it('should require online auth after exactly 3 overrides', async () => {
      // Setup: Cache some override codes
      const codes: OverrideCode[] = [
        {
          code: 'OVERRIDE1',
          validFrom: new Date(Date.now() - 1000),
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          managerID: 'MGR001'
        },
        {
          code: 'OVERRIDE2',
          validFrom: new Date(Date.now() - 1000),
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          managerID: 'MGR001'
        },
        {
          code: 'OVERRIDE3',
          validFrom: new Date(Date.now() - 1000),
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
          managerID: 'MGR001'
        }
      ];

      await service.cacheOverrideCodes(codes);

      // Initially should have 3 overrides remaining
      let remaining = await service.getRemainingOverrides();
      expect(remaining).toBe(3);
      expect(await service.isOverrideLimitReached()).toBe(false);

      // Use first override
      await service.recordOverrideUsage('MGR001', 'EMP001', 'OVERRIDE1');
      remaining = await service.getRemainingOverrides();
      expect(remaining).toBe(2);
      expect(await service.isOverrideLimitReached()).toBe(false);

      // Use second override
      await service.recordOverrideUsage('MGR001', 'EMP001', 'OVERRIDE2');
      remaining = await service.getRemainingOverrides();
      expect(remaining).toBe(1);
      expect(await service.isOverrideLimitReached()).toBe(false);

      // Use third override
      await service.recordOverrideUsage('MGR001', 'EMP001', 'OVERRIDE3');
      remaining = await service.getRemainingOverrides();
      expect(remaining).toBe(0);
      
      // After exactly 3 overrides, limit should be reached
      expect(await service.isOverrideLimitReached()).toBe(true);
    });

    it('should verify override codes correctly', async () => {
      const validCode: OverrideCode = {
        code: 'VALID123',
        validFrom: new Date(Date.now() - 1000),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        managerID: 'MGR001'
      };

      const expiredCode: OverrideCode = {
        code: 'EXPIRED123',
        validFrom: new Date(Date.now() - 48 * 60 * 60 * 1000),
        validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000),
        managerID: 'MGR001'
      };

      await service.cacheOverrideCodes([validCode, expiredCode]);

      // Valid code should verify
      expect(await service.verifyOverrideCode('VALID123')).toBe(true);

      // Expired code should not verify
      expect(await service.verifyOverrideCode('EXPIRED123')).toBe(false);

      // Non-existent code should not verify
      expect(await service.verifyOverrideCode('NONEXISTENT')).toBe(false);
    });

    it('should get manager ID for valid code', async () => {
      const code: OverrideCode = {
        code: 'TEST123',
        validFrom: new Date(Date.now() - 1000),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        managerID: 'MGR999'
      };

      await service.cacheOverrideCodes([code]);

      const managerID = await service.getManagerIDForCode('TEST123');
      expect(managerID).toBe('MGR999');

      const nonExistent = await service.getManagerIDForCode('INVALID');
      expect(nonExistent).toBeNull();
    });
  });
});
