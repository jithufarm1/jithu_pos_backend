/**
 * Base IndexedDB Repository
 * Provides core database initialization and CRUD operations
 * All specific repositories extend this base class
 */
export class IndexedDBRepository {
  protected dbName = 'vehicle-pos-db';
  protected dbVersion = 7; // Incremented for device-keys store
  protected db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB with required object stores
   * Creates three stores: reference-data, vehicle-cache, request-queue
   */
  protected async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Reference Data Store
        if (!db.objectStoreNames.contains('reference-data')) {
          db.createObjectStore('reference-data', { keyPath: 'id' });
        }

        // Vehicle Cache Store with indexes
        if (!db.objectStoreNames.contains('vehicle-cache')) {
          const vehicleStore = db.createObjectStore('vehicle-cache', {
            keyPath: 'vin',
          });
          vehicleStore.createIndex('year', 'year', { unique: false });
          vehicleStore.createIndex('make', 'make', { unique: false });
          vehicleStore.createIndex('model', 'model', { unique: false });
          vehicleStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        // Request Queue Store
        if (!db.objectStoreNames.contains('request-queue')) {
          const queueStore = db.createObjectStore('request-queue', {
            keyPath: 'id',
          });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Customer Cache Store with indexes
        if (!db.objectStoreNames.contains('customer-cache')) {
          const customerStore = db.createObjectStore('customer-cache', {
            keyPath: 'id',
          });
          customerStore.createIndex('phone', 'phone', { unique: false });
          customerStore.createIndex('email', 'email', { unique: false });
          customerStore.createIndex('lastName', 'lastName', { unique: false });
          customerStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        // Service Catalog Store with indexes
        if (!db.objectStoreNames.contains('service-catalog')) {
          const catalogStore = db.createObjectStore('service-catalog', {
            keyPath: 'id',
          });
          catalogStore.createIndex('category', 'category', { unique: false });
          catalogStore.createIndex('code', 'code', { unique: false });
          catalogStore.createIndex('name', 'name', { unique: false });
        }

        // Catalog Metadata Store
        if (!db.objectStoreNames.contains('catalog-metadata')) {
          db.createObjectStore('catalog-metadata', {
            keyPath: 'id',
          });
        }

        // Service Tickets Store with indexes
        if (!db.objectStoreNames.contains('service-tickets')) {
          const ticketStore = db.createObjectStore('service-tickets', {
            keyPath: 'id',
          });
          ticketStore.createIndex('ticketNumber', 'ticketNumber', { unique: false });
          ticketStore.createIndex('customerId', 'customerId', { unique: false });
          ticketStore.createIndex('vehicleId', 'vehicleId', { unique: false });
          ticketStore.createIndex('status', 'status', { unique: false });
          ticketStore.createIndex('assignedTechnicianId', 'assignedTechnicianId', { unique: false });
          ticketStore.createIndex('createdDate', 'createdDate', { unique: false });
          ticketStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        }

        // Ticket Queue Store for offline operations
        if (!db.objectStoreNames.contains('ticket-queue')) {
          const queueStore = db.createObjectStore('ticket-queue', {
            keyPath: 'id',
          });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('ticketId', 'ticketId', { unique: false });
        }

        // Appointments Store with indexes
        if (!db.objectStoreNames.contains('appointments')) {
          const appointmentStore = db.createObjectStore('appointments', {
            keyPath: 'id',
          });
          appointmentStore.createIndex('scheduledDateTime', 'scheduledDateTime', { unique: false });
          appointmentStore.createIndex('customerId', 'customerId', { unique: false });
          appointmentStore.createIndex('vehicleId', 'vehicleId', { unique: false });
          appointmentStore.createIndex('technicianId', 'technicianId', { unique: false });
          appointmentStore.createIndex('status', 'status', { unique: false });
          appointmentStore.createIndex('serviceBay', 'serviceBay', { unique: false });
          appointmentStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        // Appointment Queue Store for offline operations
        if (!db.objectStoreNames.contains('appointment-queue')) {
          const queueStore = db.createObjectStore('appointment-queue', {
            keyPath: 'id',
          });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
          queueStore.createIndex('appointmentId', 'appointmentId', { unique: false });
        }

        // Service Types Store
        if (!db.objectStoreNames.contains('service-types')) {
          const serviceTypeStore = db.createObjectStore('service-types', {
            keyPath: 'id',
          });
          serviceTypeStore.createIndex('category', 'category', { unique: false });
          serviceTypeStore.createIndex('name', 'name', { unique: false });
        }

        // Vehicle Data Chunks Store with indexes
        if (!db.objectStoreNames.contains('vehicle-data-chunks')) {
          const chunksStore = db.createObjectStore('vehicle-data-chunks', {
            keyPath: 'chunkId',
          });
          chunksStore.createIndex('year', 'year', { unique: false });
          chunksStore.createIndex('make', 'make', { unique: false });
          chunksStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          chunksStore.createIndex('priority', 'priority', { unique: false });
        }

        // Vehicle Data Catalog Store
        if (!db.objectStoreNames.contains('vehicle-data-catalog')) {
          db.createObjectStore('vehicle-data-catalog', {
            keyPath: 'id',
          });
        }

        // Vehicle Data Index Store
        if (!db.objectStoreNames.contains('vehicle-data-index')) {
          const indexStore = db.createObjectStore('vehicle-data-index', {
            keyPath: 'searchKey',
          });
          indexStore.createIndex('chunkId', 'chunkId', { unique: false });
        }

        // Vehicle Cache Settings Store
        if (!db.objectStoreNames.contains('vehicle-cache-settings')) {
          db.createObjectStore('vehicle-cache-settings', {
            keyPath: 'id',
          });
        }

        // Vehicle Cache Metrics Store
        if (!db.objectStoreNames.contains('vehicle-cache-metrics')) {
          db.createObjectStore('vehicle-cache-metrics', {
            keyPath: 'id',
          });
        }

        // PIN Storage Store for offline authentication
        if (!db.objectStoreNames.contains('pin-storage')) {
          db.createObjectStore('pin-storage', {
            keyPath: 'id',
          });
        }

        // Config Storage Store for offline authentication configuration
        if (!db.objectStoreNames.contains('config-storage')) {
          db.createObjectStore('config-storage', {
            keyPath: 'id',
          });
        }

        // Offline Auth Store for override codes and emergency tokens
        if (!db.objectStoreNames.contains('offline_auth')) {
          db.createObjectStore('offline_auth', {
            keyPath: 'key',
          });
        }

        // Audit Logs Store for authentication events
        if (!db.objectStoreNames.contains('audit_logs')) {
          const auditStore = db.createObjectStore('audit_logs', {
            keyPath: 'id',
          });
          auditStore.createIndex('userID', 'userID', { unique: false });
          auditStore.createIndex('deviceID', 'deviceID', { unique: false });
          auditStore.createIndex('eventType', 'eventType', { unique: false });
          auditStore.createIndex('timestamp', 'timestamp', { unique: false });
          auditStore.createIndex('synced', 'synced', { unique: false });
        }

        // Device Keys Store for cryptographic keys
        if (!db.objectStoreNames.contains('device-keys')) {
          db.createObjectStore('device-keys', {
            keyPath: 'id',
          });
        }
      };
    });
  }

  /**
   * Generic get operation from object store
   */
  protected async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get item from ${storeName}`));
      };
    });
  }

  /**
   * Generic put operation to object store
   */
  protected async put<T>(storeName: string, value: T): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to put item in ${storeName}`));
      };
    });
  }

  /**
   * Generic delete operation from object store
   */
  protected async delete(storeName: string, key: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete item from ${storeName}`));
      };
    });
  }

  /**
   * Get all items from object store
   */
  protected async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get all items from ${storeName}`));
      };
    });
  }

  /**
   * Count items in object store
   */
  protected async count(storeName: string): Promise<number> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error(`Failed to count items in ${storeName}`));
      };
    });
  }

  /**
   * Clear all items from object store
   */
  protected async clear(storeName: string): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to clear ${storeName}`));
      };
    });
  }
}
