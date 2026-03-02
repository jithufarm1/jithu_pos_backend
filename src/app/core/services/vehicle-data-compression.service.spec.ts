import { TestBed } from '@angular/core/testing';
import { VehicleDataCompressionService } from './vehicle-data-compression.service';

describe('VehicleDataCompressionService', () => {
  let service: VehicleDataCompressionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VehicleDataCompressionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('compress and decompress', () => {
    it('should compress and decompress string data correctly', async () => {
      const originalData = 'This is test vehicle data that should be compressed';
      
      const compressed = await service.compress(originalData);
      expect(compressed).toBeInstanceOf(Blob);
      expect(compressed.size).toBeGreaterThan(0);
      
      const decompressed = await service.decompress(compressed);
      expect(decompressed).toBe(originalData);
    });

    it('should compress and decompress ArrayBuffer data correctly', async () => {
      const originalData = new TextEncoder().encode('Test ArrayBuffer data');
      const arrayBuffer = originalData.buffer;
      
      const compressed = await service.compress(arrayBuffer);
      expect(compressed).toBeInstanceOf(Blob);
      
      const decompressed = await service.decompress(compressed);
      const decodedData = new TextEncoder().encode(decompressed);
      expect(decodedData).toEqual(originalData);
    });

    it('should compress large JSON data', async () => {
      // Generate mock vehicle data similar to actual chunks
      const mockVehicleData = {
        chunkId: 'test-chunk-1',
        year: 2024,
        make: 'Toyota',
        vehicles: Array.from({ length: 100 }, (_, i) => ({
          vin: `VIN${i.toString().padStart(14, '0')}`,
          year: 2024,
          make: 'Toyota',
          model: `Model${i}`,
          engine: '2.5L 4-Cylinder',
          transmission: 'Automatic',
          drivetrain: 'FWD'
        }))
      };
      
      const jsonString = JSON.stringify(mockVehicleData);
      const originalSize = new TextEncoder().encode(jsonString).length;
      
      const compressed = await service.compress(jsonString);
      const compressedSize = compressed.size;
      
      // Verify compression reduces size
      expect(compressedSize).toBeLessThan(originalSize);
      
      // Verify data integrity
      const decompressed = await service.decompress(compressed);
      expect(JSON.parse(decompressed)).toEqual(mockVehicleData);
    });

    it('should handle empty string', async () => {
      const compressed = await service.compress('');
      const decompressed = await service.decompress(compressed);
      expect(decompressed).toBe('');
    });
  });

  describe('calculateCompressionRatio', () => {
    it('should calculate compression ratio correctly', () => {
      const ratio = service.calculateCompressionRatio(1000, 300);
      expect(ratio).toBe(70); // 70% reduction
    });

    it('should return 0 for zero original size', () => {
      const ratio = service.calculateCompressionRatio(0, 0);
      expect(ratio).toBe(0);
    });

    it('should handle no compression case', () => {
      const ratio = service.calculateCompressionRatio(1000, 1000);
      expect(ratio).toBe(0);
    });

    it('should handle expansion case (negative compression)', () => {
      const ratio = service.calculateCompressionRatio(100, 150);
      expect(ratio).toBe(-50); // Data expanded by 50%
    });
  });

  describe('getCompressedSize', () => {
    it('should return correct blob size', async () => {
      const data = 'Test data for size check';
      const compressed = await service.compress(data);
      const size = service.getCompressedSize(compressed);
      
      expect(size).toBe(compressed.size);
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('isNativeCompressionSupported', () => {
    it('should check for native compression support', () => {
      const isSupported = service.isNativeCompressionSupported();
      expect(typeof isSupported).toBe('boolean');
    });
  });

  describe('error handling', () => {
    it('should throw error on invalid compression input', async () => {
      try {
        await service.compress(null as any);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should throw error on invalid decompression input', async () => {
      // Create an invalid blob (not gzip compressed)
      const invalidBlob = new Blob(['not compressed data']);
      
      try {
        await service.decompress(invalidBlob);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('Decompression failed');
      }
    });
  });

  describe('compression performance', () => {
    it('should compress data within acceptable time', async () => {
      // Generate 600KB of mock data (typical chunk size)
      const mockData = JSON.stringify({
        vehicles: Array.from({ length: 1000 }, (_, i) => ({
          vin: `VIN${i.toString().padStart(14, '0')}`,
          year: 2024,
          make: 'TestMake',
          model: 'TestModel',
          engine: '2.5L 4-Cylinder Engine with Variable Valve Timing',
          transmission: 'Automatic CVT Transmission',
          drivetrain: 'Front-Wheel Drive'
        }))
      });
      
      const startTime = Date.now();
      const compressed = await service.compress(mockData);
      const compressionTime = Date.now() - startTime;
      
      // Should compress within 200ms (design requirement)
      expect(compressionTime).toBeLessThan(200);
      
      // Verify compression ratio is reasonable (target: 60-70%)
      const originalSize = new TextEncoder().encode(mockData).length;
      const ratio = service.calculateCompressionRatio(originalSize, compressed.size);
      expect(ratio).toBeGreaterThan(50); // At least 50% compression
    });

    it('should decompress data within acceptable time', async () => {
      const mockData = JSON.stringify({
        vehicles: Array.from({ length: 1000 }, (_, i) => ({
          vin: `VIN${i}`,
          make: 'Test',
          model: 'Model'
        }))
      });
      
      const compressed = await service.compress(mockData);
      
      const startTime = Date.now();
      await service.decompress(compressed);
      const decompressionTime = Date.now() - startTime;
      
      // Should decompress within 100ms (design requirement)
      expect(decompressionTime).toBeLessThan(100);
    });
  });
});
