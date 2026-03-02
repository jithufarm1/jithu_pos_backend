/**
 * Production environment configuration
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.example.com/api',
  storeId: 'STORE-001',
  cacheMaxAge: 86400000, // 24 hours in milliseconds
  maxCachedVehicles: 100,
  maxQueuedRequests: 100,
};
