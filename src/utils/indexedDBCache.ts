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
const DB_VERSION = 2; // Bump version to 2 for the new verses store
const STORE_NAME = 'explanations_cache';
const VERSES_STORE_NAME = 'verses_cache';

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
          if (!db.objectStoreNames.contains(VERSES_STORE_NAME)) {
            const store = db.createObjectStore(VERSES_STORE_NAME, { keyPath: 'key' });
            store.createIndex('bookId', 'bookId', { unique: false });
            store.createIndex('translation', 'translation', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
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
        const transaction1 = db.transaction(STORE_NAME, 'readwrite');
        const store1 = transaction1.objectStore(STORE_NAME);
        store1.clear();

        const transaction2 = db.transaction(VERSES_STORE_NAME, 'readwrite');
        const store2 = transaction2.objectStore(VERSES_STORE_NAME);
        store2.clear();

        resolve();
      } catch (err) {
        resolve();
      }
    });
  }

  /**
   * Retrieves cached Bible verses for a chapter
   */
  public async getVerses(key: string): Promise<any[] | null> {
    const db = await this.init();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(VERSES_STORE_NAME, 'readonly');
        const store = transaction.objectStore(VERSES_STORE_NAME);
        const req = store.get(key);

        req.onsuccess = () => {
          const result = req.result;
          if (result && result.verses) {
            resolve(result.verses);
          } else {
            resolve(null);
          }
        };

        req.onerror = () => {
          resolve(null);
        };
      } catch (err) {
        console.error("IndexedDB getVerses failure:", err);
        resolve(null);
      }
    });
  }

  /**
   * Saves a chapter's verses to the IndexedDB local cache
   */
  public async setVerses(
    key: string,
    bookId: number,
    chapter: number,
    translation: string,
    verses: any[]
  ): Promise<void> {
    const db = await this.init();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(VERSES_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(VERSES_STORE_NAME);
        const entry = {
          key,
          bookId,
          chapter,
          translation,
          verses,
          timestamp: Date.now()
        };
        store.put(entry);
        resolve();
      } catch (err) {
        console.error("IndexedDB setVerses failure:", err);
        resolve();
      }
    });
  }

  /**
   * Returns statistics about cached chapters for display in the UI
   */
  public async getVersesCacheStats(): Promise<{ count: number; keys: string[] }> {
    const db = await this.init();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(VERSES_STORE_NAME, 'readonly');
        const store = transaction.objectStore(VERSES_STORE_NAME);
        const req = store.getAllKeys();

        req.onsuccess = () => {
          const keys = (req.result as string[]) || [];
          resolve({ count: keys.length, keys });
        };

        req.onerror = () => {
          resolve({ count: 0, keys: [] });
        };
      } catch (err) {
        resolve({ count: 0, keys: [] });
      }
    });
  }

  /**
   * Clears the entire offline verses cache
   */
  public async clearVersesCache(): Promise<void> {
    const db = await this.init();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(VERSES_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(VERSES_STORE_NAME);
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
