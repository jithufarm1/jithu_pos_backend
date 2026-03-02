import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

/**
 * VIN Decoder Service
 * Decodes VINs using NHTSA's free VIN decoder API
 * https://vpic.nhtsa.dot.gov/api/
 */

export interface VinDecodeResult {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  fuelType?: string;
  bodyClass?: string;
  manufacturer?: string;
  plantCountry?: string;
  valid: boolean;
  errorMessage?: string;
}

interface NHTSAVariable {
  Variable: string;
  Value: string | null;
  ValueId: string | null;
}

interface NHTSAResponse {
  Count: number;
  Message: string;
  SearchCriteria: string;
  Results: NHTSAVariable[];
}

@Injectable({
  providedIn: 'root'
})
export class VinDecoderService {
  private readonly NHTSA_API_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin';
  private vinCache = new Map<string, VinDecodeResult>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  constructor(private http: HttpClient) {}

  /**
   * Decode a VIN using NHTSA API
   */
  decodeVin(vin: string): Observable<VinDecodeResult> {
    // Validate VIN format
    if (!this.isValidVinFormat(vin)) {
      return throwError(() => ({
        message: 'Invalid VIN format. VIN must be 17 alphanumeric characters.',
        category: 'VALIDATION'
      }));
    }

    const normalizedVin = vin.toUpperCase().trim();

    // Check cache first
    const cached = this.vinCache.get(normalizedVin);
    if (cached) {
      console.log(`[VinDecoder] Cache hit for VIN: ${normalizedVin}`);
      return of(cached);
    }

    // Call NHTSA API
    const url = `${this.NHTSA_API_URL}/${normalizedVin}?format=json`;
    
    return this.http.get<NHTSAResponse>(url).pipe(
      map(response => this.parseNHTSAResponse(normalizedVin, response)),
      tap(result => {
        // Cache successful decode
        if (result.valid) {
          this.vinCache.set(normalizedVin, result);
          console.log(`[VinDecoder] Cached VIN decode: ${normalizedVin}`);
        }
      }),
      catchError(error => {
        console.error('[VinDecoder] NHTSA API error:', error);
        return throwError(() => ({
          message: 'Failed to decode VIN. Please try again.',
          category: 'NETWORK_ERROR'
        }));
      })
    );
  }

  /**
   * Validate VIN format (17 alphanumeric characters, no I, O, Q)
   */
  isValidVinFormat(vin: string): boolean {
    if (!vin || vin.length !== 17) {
      return false;
    }

    // VIN regex: 17 characters, alphanumeric, excluding I, O, Q
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i;
    return vinRegex.test(vin);
  }

  /**
   * Parse NHTSA API response into VinDecodeResult
   */
  private parseNHTSAResponse(vin: string, response: NHTSAResponse): VinDecodeResult {
    const results = response.Results;
    
    // Helper to get value by variable name
    const getValue = (variableName: string): string | null => {
      const variable = results.find(v => v.Variable === variableName);
      return variable?.Value || null;
    };

    // Extract key fields
    const errorCode = getValue('Error Code');
    const errorText = getValue('Error Text');
    const year = getValue('Model Year');
    const make = getValue('Make');
    const model = getValue('Model');
    const trim = getValue('Trim');
    const engine = getValue('Engine Model') || getValue('Engine Configuration');
    const transmission = getValue('Transmission Style');
    const drivetrain = getValue('Drive Type');
    const fuelType = getValue('Fuel Type - Primary');
    const bodyClass = getValue('Body Class');
    const manufacturer = getValue('Manufacturer Name');
    const plantCountry = getValue('Plant Country');

    // Check if VIN is valid
    const valid = errorCode === '0' || errorCode === null;

    return {
      vin,
      year: year ? parseInt(year) : 0,
      make: make || '',
      model: model || '',
      trim: trim || undefined,
      engine: engine || undefined,
      transmission: transmission || undefined,
      drivetrain: drivetrain || undefined,
      fuelType: fuelType || undefined,
      bodyClass: bodyClass || undefined,
      manufacturer: manufacturer || undefined,
      plantCountry: plantCountry || undefined,
      valid,
      errorMessage: valid ? undefined : errorText || 'Invalid VIN'
    };
  }

  /**
   * Clear VIN cache
   */
  clearCache(): void {
    this.vinCache.clear();
    console.log('[VinDecoder] Cache cleared');
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.vinCache.size;
  }
}
