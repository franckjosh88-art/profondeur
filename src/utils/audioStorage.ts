/**
 * IndexedDB & Firebase Storage utility for Chapter Audio Meditations.
 * Stores audio binaries locally in IndexedDB for offline instant access,
 * and synchronizes them to Firebase Storage under `audios/{uid}/{audioId}`.
 * Only the owner can access their audio files.
 * Metadata and public/download URLs are recorded in Firestore under `users/{uid}/chapter_audio_meditations/{audioId}`.
 * Strictly NO base64 chunks stored in Firestore.
 */

import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth, storage, cleanFirestoreData } from '../lib/firebase';
import { ChapterAudioMeditation } from '../types/bible';

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
 * Save an audio blob to local IndexedDB
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
 * Retrieve an audio blob by id from IndexedDB
 */
export async function getAudioBlob(id: string): Promise<Blob | null> {
  try {
    const db = await getAudioDB();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const res = getRequest.result as AudioRecord | undefined;
          resolve(res ? res.blob : null);
        };

        getRequest.onerror = () => {
          resolve(null);
        };
      } catch (e) {
        resolve(null);
      }
    });
  } catch (_) {
    return null;
  }
}

// Memory cache of generated object URLs to avoid memory leaks
const objectUrlMap = new Map<string, string>();

/**
 * Upload an audio recording to Firebase Storage under `audios/{uid}/{audioId}`.
 * Only the logged-in user can access their folder.
 * Saves the download URL and metadata to Firestore.
 */
export async function uploadAudioToCloud(
  audioItem: ChapterAudioMeditation,
  audioBlob: Blob,
  userId: string
): Promise<{ success: boolean; audioUrl: string; mimeType: string; error?: string }> {
  try {
    const mimeType = audioBlob.type || audioItem.audio_mime_type || 'audio/mp4';
    const storagePath = `audios/${userId}/${audioItem.id}`;
    const fileRef = storageRef(storage, storagePath);

    // 1. Upload binary file to Firebase Storage
    const uploadResult = await uploadBytes(fileRef, audioBlob, {
      contentType: mimeType,
      customMetadata: {
        userId,
        audioId: audioItem.id,
        title: audioItem.title || '',
        bookId: String(audioItem.book_id || ''),
        chapter: String(audioItem.chapter || ''),
      }
    });

    // 2. Retrieve secure download URL
    const downloadUrl = await getDownloadURL(uploadResult.ref);

    // 3. Save metadata to Firestore under users/{userId}/chapter_audio_meditations/{audioId}
    // Strictly NO base64 string and NO chunks stored in Firestore!
    const parentDocRef = doc(db, 'users', userId, 'chapter_audio_meditations', audioItem.id);
    const updatedMeta: Partial<ChapterAudioMeditation> = {
      id: audioItem.id,
      title: audioItem.title,
      book_id: audioItem.book_id,
      book_name: audioItem.book_name,
      chapter: audioItem.chapter,
      duration_seconds: audioItem.duration_seconds,
      audio_mime_type: mimeType,
      audio_url: downloadUrl,
      storage_path: storagePath,
      file_size: audioBlob.size,
      is_cloud_synced: true,
      synced_at: new Date().toISOString(),
      created_at: audioItem.created_at || new Date().toISOString(),
    };

    await setDoc(parentDocRef, cleanFirestoreData(updatedMeta), { merge: true });

    return {
      success: true,
      audioUrl: downloadUrl,
      mimeType
    };
  } catch (err: any) {
    console.error("Error uploading audio to Firebase Storage:", err);
    return {
      success: false,
      audioUrl: '',
      mimeType: audioBlob.type || 'audio/mp4',
      error: err.message || "Erreur de téléversement vers Firebase Storage."
    };
  }
}

/**
 * Download audio recording from Firebase Storage
 */
export async function downloadAudioFromCloud(
  audioItem: ChapterAudioMeditation,
  userId: string
): Promise<Blob | null> {
  try {
    let downloadUrl = audioItem.audio_url;

    if (!downloadUrl && audioItem.storage_path) {
      try {
        const fileRef = storageRef(storage, audioItem.storage_path);
        downloadUrl = await getDownloadURL(fileRef);
      } catch (_) {}
    }

    if (!downloadUrl) {
      try {
        const fileRef = storageRef(storage, `audios/${userId}/${audioItem.id}`);
        downloadUrl = await getDownloadURL(fileRef);
      } catch (_) {}
    }

    if (downloadUrl) {
      const resp = await fetch(downloadUrl);
      if (resp.ok) {
        const blob = await resp.blob();
        if (blob && blob.size > 0) {
          await saveAudioBlob(
            audioItem.id,
            blob,
            blob.type || audioItem.audio_mime_type || 'audio/mp4',
            audioItem.duration_seconds,
            userId
          );
          return blob;
        }
      }
    }
  } catch (err) {
    console.error("Error downloading audio from Firebase Storage:", err);
  }
  return null;
}

/**
 * Get a playable URL for an audio ID.
 * Resolves local IndexedDB first, then direct Firebase Storage URL.
 */
export async function getAudioPlayableUrl(
  id: string,
  audioItem?: ChapterAudioMeditation,
  userId?: string | null
): Promise<string | null> {
  // 1. Check in-memory object URL cache
  if (objectUrlMap.has(id)) {
    return objectUrlMap.get(id)!;
  }

  // 2. Check local IndexedDB storage
  const localBlob = await getAudioBlob(id);
  if (localBlob && localBlob.size > 0) {
    const url = URL.createObjectURL(localBlob);
    objectUrlMap.set(id, url);
    return url;
  }

  // 3. Direct remote URL from Firebase Storage
  if (audioItem?.audio_url && audioItem.audio_url.startsWith('http')) {
    return audioItem.audio_url;
  }

  // 4. Resolve download URL from Firebase Storage path
  const effectiveUserId = userId || auth.currentUser?.uid;
  if (effectiveUserId) {
    try {
      const path = audioItem?.storage_path || `audios/${effectiveUserId}/${id}`;
      const fileRef = storageRef(storage, path);
      const downloadUrl = await getDownloadURL(fileRef);
      if (downloadUrl) {
        return downloadUrl;
      }
    } catch (_) {}
  }

  // 5. Try downloading to local cache as fallback
  if (effectiveUserId && audioItem) {
    const cloudBlob = await downloadAudioFromCloud(audioItem, effectiveUserId);
    if (cloudBlob && cloudBlob.size > 0) {
      const url = URL.createObjectURL(cloudBlob);
      objectUrlMap.set(id, url);
      return url;
    }
  }

  return null;
}

/**
 * Delete an audio blob from local IndexedDB, Firebase Storage, and Firestore metadata
 */
export async function deleteAudioBlob(id: string, userId?: string | null): Promise<void> {
  if (objectUrlMap.has(id)) {
    try {
      URL.revokeObjectURL(objectUrlMap.get(id)!);
    } catch (_) {}
    objectUrlMap.delete(id);
  }

  // 1. Delete from IndexedDB
  try {
    const db = await getAudioDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const delRequest = store.delete(id);
      delRequest.onsuccess = () => resolve();
      delRequest.onerror = () => reject(new Error("Erreur suppression locale"));
    });
  } catch (e) {
    console.warn("IndexedDB delete warning:", e);
  }

  const effectiveUserId = userId || auth.currentUser?.uid;
  if (effectiveUserId) {
    // 2. Delete from Firebase Storage (audios/{uid}/{id})
    try {
      const fileRef = storageRef(storage, `audios/${effectiveUserId}/${id}`);
      await deleteObject(fileRef);
    } catch (e) {
      // Ignored if file does not exist in Storage
    }

    // 3. Delete metadata document from Firestore
    try {
      const parentDocRef = doc(db, 'users', effectiveUserId, 'chapter_audio_meditations', id);
      await deleteDoc(parentDocRef);
    } catch (e) {
      console.warn("Firestore audio delete warning:", e);
    }
  }
}

export interface DownloadResult {
  success: boolean;
  missing?: boolean;
  error?: string;
}

/**
 * Download audio file to user's device
 */
export async function downloadAudioFile(
  id: string,
  defaultFilename: string,
  audioItem?: ChapterAudioMeditation,
  userId?: string | null
): Promise<DownloadResult> {
  try {
    let blob = await getAudioBlob(id);
    const effectiveUserId = userId || auth.currentUser?.uid;

    if (!blob && audioItem && effectiveUserId) {
      blob = await downloadAudioFromCloud(audioItem, effectiveUserId);
    }

    if (!blob) {
      return {
        success: false,
        missing: true,
        error: "Fichier audio introuvable."
      };
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    let ext = '.mp4';
    if (blob.type.includes('mpeg') || blob.type.includes('mp3')) {
      ext = '.mp3';
    } else if (blob.type.includes('webm')) {
      ext = '.webm';
    }

    const cleanName = defaultFilename.endsWith('.mp3') || defaultFilename.endsWith('.mp4') || defaultFilename.endsWith('.webm')
      ? defaultFilename
      : `${defaultFilename.replace(/[^a-zA-Z0-9_\- \u00C0-\u017F]/g, '_')}${ext}`;

    a.download = cleanName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { success: true };
  } catch (err: any) {
    console.error("Audio download error:", err);
    return {
      success: false,
      error: err?.message || "Erreur de téléchargement"
    };
  }
}

/**
 * Migration helper: Synchronize all local-only audios to Cloud Firebase Storage
 */
export async function syncAllLocalAudiosToCloud(
  audios: ChapterAudioMeditation[],
  userId: string,
  onProgress?: (current: number, total: number, audioTitle: string) => void
): Promise<{ syncedCount: number; errorsCount: number; syncedIds: string[] }> {
  let syncedCount = 0;
  let errorsCount = 0;
  const syncedIds: string[] = [];

  const unsyncedList: ChapterAudioMeditation[] = [];
  for (const a of audios) {
    if (!a.is_cloud_synced) {
      unsyncedList.push(a);
    }
  }

  const total = unsyncedList.length;
  for (let i = 0; i < total; i++) {
    const item = unsyncedList[i];
    if (onProgress) {
      onProgress(i + 1, total, item.title);
    }

    const blob = await getAudioBlob(item.id);
    if (blob) {
      const res = await uploadAudioToCloud(item, blob, userId);
      if (res.success) {
        syncedCount++;
        syncedIds.push(item.id);
      } else {
        errorsCount++;
      }
    } else {
      errorsCount++;
    }
  }

  return { syncedCount, errorsCount, syncedIds };
}

/**
 * Helper to get best supported audio mime type (prioritizing Safari iOS compatible formats)
 */
export function getSupportedAudioMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'audio/mp4';
  }

  const types = [
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/aac',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg'
  ];

  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }

  return '';
}
