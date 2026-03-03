/**
 * Development environment configuration
 */
export const environment = {
  production: false,
  apiBaseUrl: 'https://pos-backend-oth6.onrender.com/api',
  storeId: 'STORE-001',
  cacheMaxAge: 86400000, // 24 hours in milliseconds
  maxCachedVehicles: 100,
  maxQueuedRequests: 100,
};
