import { Injectable } from '@angular/core';
import * as pako from 'pako';

/**
 * Vehicle Data Compression Service
 * Handles compression and decompression of vehicle data chunks
 * Uses native CompressionStream API with pako fallback
 */
@Injectable({
  providedIn: 'root'
})
export class VehicleDataCompressionService {

  constructor() {}

  /**
   * Compress data using gzip compression
   * @param data - String or ArrayBuffer to compress
   * @returns Compressed data as Blob
   */
  async compress(data: string | ArrayBuffer): Promise<Blob> {
    try {
      // Convert string to Uint8Array if needed
      const input = typeof data === 'string' 
        ? new TextEncoder().encode(data)
        : new Uint8Array(data);
      
      // Use native CompressionStream if available (modern browsers)
      if ('CompressionStream' in window) {
        const stream = new Blob([input]).stream();
        const compressedStream = stream.pipeThrough(
          new CompressionStream('gzip')
        );
        return await new Response(compressedStream).blob();
      }
      
      // Fallback to pako library for older browsers
      const compressed = pako.gzip(input);
      return new Blob([compressed]);
    } catch (error) {
      throw new Error(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decompress gzip-compressed data
   * @param blob - Compressed data as Blob
   * @returns Decompressed data as string
   */
  async decompress(blob: Blob): Promise<string> {
    try {
      // Use native DecompressionStream if available (modern browsers)
      if ('DecompressionStream' in window) {
        const stream = blob.stream();
        const decompressedStream = stream.pipeThrough(
          new DecompressionStream('gzip')
        );
        const decompressed = await new Response(decompressedStream).arrayBuffer();
        return new TextDecoder().decode(decompressed);
      }
      
      // Fallback to pako library for older browsers
      const arrayBuffer = await blob.arrayBuffer();
      const decompressed = pako.ungzip(new Uint8Array(arrayBuffer));
      return new TextDecoder().decode(decompressed);
    } catch (error) {
      throw new Error(`Decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate compression ratio
   * @param originalSize - Original data size in bytes
   * @param compressedSize - Compressed data size in bytes
   * @returns Compression ratio as percentage (0-100)
   */
  calculateCompressionRatio(originalSize: number, compressedSize: number): number {
    if (originalSize === 0) {
      return 0;
    }
    return ((originalSize - compressedSize) / originalSize) * 100;
  }

  /**
   * Get compressed size from blob
   * @param blob - Compressed data blob
   * @returns Size in bytes
   */
  getCompressedSize(blob: Blob): number {
    return blob.size;
  }

  /**
   * Check if native compression is supported
   * @returns True if CompressionStream is available
   */
  isNativeCompressionSupported(): boolean {
    return 'CompressionStream' in window && 'DecompressionStream' in window;
  }
}
