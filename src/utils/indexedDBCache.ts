// Offline local caching database for AI Scripture Exegesis and Explanations using IndexedDB
// Highly durable, works perfectly when offline, tracks popular (frequently accessed) explanations.

export interface CachedExplanation {
  key: string;       // Unique ID, e.g. "verse:Jean:3:16:exegesis" or "chapter:Jean:3"
  type: 'verse' | 'chapter';
  reference: string; // Formatting readable French string (e.g. "Jean 3:16")
  content: string;   // HTML or Markdown returned by Gemini
  timestamp: number; // For clean eviction or sorting
  viewCount: number; // View counter to track "most popular / les plus consultées"
  metadata?: any;
}

const DB_NAME = 'scripture_study_cache';
const DB_VERSION = 1;
const STORE_NAME = 'explanations_cache';

class IndexedExplainCache {
  private db: IDBDatabase | null = null;

  /**
   * Safe initialization of IndexedDB structure
   */
  public async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            store.createIndex('viewCount', 'viewCount', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('type', 'type', { unique: false });
          }
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve(request.result);
        };

        request.onerror = (e) => {
          console.error("IndexedDB failed to open:", e);
          reject(request.error);
        };
      } catch (err) {
        console.error("IndexedDB open exception:", err);
        reject(err);
      }
    });
  }

  /**
   * Retrieves a cached explanation by key, and increments its local view count
   */
  public async get(key: string): Promise<CachedExplanation | null> {
    const db = await this.init();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getReq = store.get(key);

        getReq.onsuccess = () => {
          const result = getReq.result as CachedExplanation | undefined;
          if (result) {
            // Update view counter & timestamp for popularity metric
            result.viewCount = (result.viewCount || 0) + 1;
            result.timestamp = Date.now();
            store.put(result);
            resolve(result);
          } else {
            resolve(null);
          }
        };

        getReq.onerror = () => {
          resolve(null);
        };
      } catch (err) {
        console.error("IndexedDB get failure:", err);
        resolve(null);
      }
    });
  }

  /**
   * Saves or updates a cached entry in IndexedDB
   */
  public async set(
    key: string,
    type: 'verse' | 'chapter',
    reference: string,
    content: string,
    metadata?: any
  ): Promise<void> {
    const db = await this.init();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getReq = store.get(key);

        getReq.onsuccess = () => {
          const existing = getReq.result as CachedExplanation | undefined;
          const entry: CachedExplanation = {
            key,
            type,
            reference,
            content,
            timestamp: Date.now(),
            viewCount: existing ? existing.viewCount + 1 : 1,
            metadata: metadata || existing?.metadata || {}
          };
          
          store.put(entry);
          resolve();
        };

        getReq.onerror = () => {
          // Put clean fallback
          const entry: CachedExplanation = {
            key,
            type,
            reference,
            content,
            timestamp: Date.now(),
            viewCount: 1,
            metadata: metadata || {}
          };
          store.put(entry);
          resolve();
        };
      } catch (err) {
        console.error("IndexedDB set failure:", err);
        resolve();
      }
    });
  }

  /**
   * Returns explanations ordered by view count (most popular first)
   */
  public async getMostPopular(limit = 10): Promise<CachedExplanation[]> {
    const db = await this.init();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const cursorReq = store.openCursor();
        const results: CachedExplanation[] = [];

        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            // Sort by popularity, then slice
            const sorted = results
              .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
              .slice(0, limit);
            resolve(sorted);
          }
        };

        cursorReq.onerror = () => {
          resolve([]);
        };
      } catch (err) {
        console.error("IndexedDB popular retrieval failure:", err);
        resolve([]);
      }
    });
  }

  /**
   * Returns all keys currently cached offline for quick lookups
   */
  public async getCachedKeys(): Promise<string[]> {
    const db = await this.init();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAllKeys();

        request.onsuccess = () => {
          resolve((request.result as string[]) || []);
        };

        request.onerror = () => {
          resolve([]);
        };
      } catch (err) {
        console.error("IndexedDB keys fetch failure:", err);
        resolve([]);
      }
    });
  }

  /**
   * Deletes a specific explanation from cache
   */
  public async remove(key: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch (err) {
        resolve();
      }
    });
  }

  /**
   * Clears the entire offline cache
   */
  public async clearAll(): Promise<void> {
    const db = await this.init();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch (err) {
        resolve();
      }
    });
  }
}

export const explainCache = new IndexedExplainCache();
