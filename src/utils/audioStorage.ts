/**
 * IndexedDB storage utility for Chapter Audio Meditations.
 * Stores audio binaries safely as Blobs in IndexedDB without overloading localStorage.
 */

const DB_NAME = 'BibleAudioMeditationsDB';
const DB_VERSION = 1;
const STORE_NAME = 'audios';

interface AudioRecord {
  id: string;
  userId?: string | null;
  blob: Blob;
  mimeType: string;
  duration: number;
  createdAt: string;
}

let dbInstance: IDBDatabase | null = null;

export async function getAudioDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error("IndexedDB n'est pas supporté par ce navigateur."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = (event: Event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event: Event) => {
      console.error("IndexedDB open error:", (event.target as IDBOpenDBRequest).error);
      reject(new Error("Impossible d'accéder au stockage audio local."));
    };
  });
}

/**
 * Save an audio blob to IndexedDB
 */
export async function saveAudioBlob(
  id: string,
  blob: Blob,
  mimeType: string,
  duration: number,
  userId?: string | null
): Promise<void> {
  const db = await getAudioDB();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const record: AudioRecord = {
        id,
        userId: userId || null,
        blob,
        mimeType,
        duration,
        createdAt: new Date().toISOString()
      };

      const putRequest = store.put(record);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = (err) => {
        const error = (err.target as IDBRequest).error;
        if (error && error.name === 'QuotaExceededError') {
          reject(new Error("L'espace de stockage de votre appareil est insuffisant pour enregistrer cet audio."));
        } else {
          reject(new Error("Erreur lors de l'enregistrement de l'audio dans le stockage local."));
        }
      };
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Retrieve an audio blob by id
 */
export async function getAudioBlob(id: string): Promise<Blob | null> {
  const db = await getAudioDB();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const res = getRequest.result as AudioRecord | undefined;
        resolve(res ? res.blob : null);
      };

      getRequest.onerror = () => {
        reject(new Error("Erreur lors de la lecture du fichier audio."));
      };
    } catch (e) {
      reject(e);
    }
  });
}

// Memory cache of generated object URLs to avoid memory leaks
const objectUrlMap = new Map<string, string>();

/**
 * Get a playable URL for an audio ID
 */
export async function getAudioPlayableUrl(id: string): Promise<string | null> {
  if (objectUrlMap.has(id)) {
    return objectUrlMap.get(id)!;
  }
  const blob = await getAudioBlob(id);
  if (!blob) return null;

  const url = URL.createObjectURL(blob);
  objectUrlMap.set(id, url);
  return url;
}

/**
 * Delete an audio blob from IndexedDB
 */
export async function deleteAudioBlob(id: string): Promise<void> {
  if (objectUrlMap.has(id)) {
    try {
      URL.revokeObjectURL(objectUrlMap.get(id)!);
    } catch (_) {}
    objectUrlMap.delete(id);
  }

  const db = await getAudioDB();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const delRequest = store.delete(id);

      delRequest.onsuccess = () => resolve();
      delRequest.onerror = () => {
        reject(new Error("Erreur lors de la suppression du fichier audio."));
      };
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Download audio file natively
 */
export async function downloadAudioFile(id: string, defaultFilename: string): Promise<boolean> {
  try {
    const blob = await getAudioBlob(id);
    if (!blob) return false;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // ensure file extension
    const ext = blob.type.includes('mp4') || blob.type.includes('m4a') ? '.mp4' : '.webm';
    const cleanName = defaultFilename.endsWith('.webm') || defaultFilename.endsWith('.mp4')
      ? defaultFilename
      : `${defaultFilename.replace(/[^a-zA-Z0-9_\- \u00C0-\u017F]/g, '_')}${ext}`;

    a.download = cleanName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (err) {
    console.error("Audio download error:", err);
    return false;
  }
}

/**
 * Helper to get best supported audio mime type
 */
export function getSupportedAudioMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'audio/webm';
  }

  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg'
  ];

  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }

  return '';
}
