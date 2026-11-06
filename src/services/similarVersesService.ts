import { SimilarVerse, SimilarVersesResponse } from '../types/bible';
import { PRECOMPUTED_CROSS_REFERENCES, getLocalThematicMatches } from '../data/biblicalCrossReferences';
import { authenticatedFetch } from '../lib/apiClient';

// Niveau 1 : Cache en mémoire vive (RAM) pour des accès répétés en 0 ms
const memoryCache = new Map<string, SimilarVerse[]>();

// Référence vers le Web Worker
let similarWorker: Worker | null = null;
let workerAvailable = typeof window !== 'undefined' && typeof Worker !== 'undefined';

function getWorker(): Worker | null {
  if (!workerAvailable || typeof window === 'undefined') return null;
  if (!similarWorker) {
    try {
      similarWorker = new Worker(
        new URL('../workers/similarVerses.worker.ts', import.meta.url),
        { type: 'module' }
      );
    } catch (e) {
      console.warn("Web Worker non supporté dans cet environnement, utilisation du fallback direct.", e);
      workerAvailable = false;
      similarWorker = null;
    }
  }
  return similarWorker;
}

export interface VerseSourceIdentifier {
  book_id: number;
  book_name: string;
  chapter: number;
  verse: number;
  text?: string;
}

/**
 * Normalise la référence pour servir de clé de cache universelle.
 * Ex : "Jérémie 31:3" ou id "24_31_3"
 */
export function getVerseCacheKeys(source: VerseSourceIdentifier): string[] {
  const numKey = `${source.book_id}_${source.chapter}_${source.verse}`;
  const cleanRef = `${source.book_name.trim()} ${source.chapter}:${source.verse}`;
  const normRef = cleanRef.toLowerCase().replace(/[\s:]+/g, '_');
  return [numKey, cleanRef, normRef];
}

/**
 * Récupère les versets similaires depuis le cache mémoire ou localStorage.
 */
export function getFromCache(source: VerseSourceIdentifier): SimilarVerse[] | null {
  const keys = getVerseCacheKeys(source);
  
  // 1. RAM Cache
  for (const k of keys) {
    if (memoryCache.has(k)) {
      const hit = memoryCache.get(k);
      if (hit && hit.length > 0) return hit;
    }
  }

  // 2. LocalStorage Cache
  if (typeof window !== 'undefined' && window.localStorage) {
    for (const k of keys) {
      try {
        const stored = localStorage.getItem(`bible_similar_cache_v2_${k}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Re-peuple le cache RAM
            for (const rk of keys) memoryCache.set(rk, parsed);
            return parsed;
          }
        }
      } catch (_) {}
    }
  }

  // 3. Index Précalculé Statique (0 ms)
  const numKey = `${source.book_id}_${source.chapter}_${source.verse}`;
  if (PRECOMPUTED_CROSS_REFERENCES[numKey] && PRECOMPUTED_CROSS_REFERENCES[numKey].length > 0) {
    const precomputed = PRECOMPUTED_CROSS_REFERENCES[numKey];
    for (const k of keys) memoryCache.set(k, precomputed);
    return precomputed;
  }

  return null;
}

/**
 * Sauvegarde les résultats dans les deux niveaux de cache (RAM + LocalStorage).
 */
export function saveToCache(source: VerseSourceIdentifier, results: SimilarVerse[]): void {
  if (!results || results.length === 0) return;
  const keys = getVerseCacheKeys(source);

  // Sauvegarde RAM
  for (const k of keys) {
    memoryCache.set(k, results);
  }

  // Sauvegarde LocalStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const payload = JSON.stringify(results);
      for (const k of keys) {
        localStorage.setItem(`bible_similar_cache_v2_${k}`, payload);
      }
    } catch (_) {}
  }
}

/**
 * Appel au Web Worker pour un calcul de similarités sans bloquer l'UI.
 */
function queryWorker(source: VerseSourceIdentifier, limit: number = 6): Promise<SimilarVerse[]> {
  return new Promise((resolve) => {
    const worker = getWorker();
    if (!worker) {
      // Fallback synchrone léger
      const fallback = getLocalThematicMatches(
        source.text || '',
        source.book_id,
        source.chapter,
        source.verse,
        limit
      );
      resolve(fallback);
      return;
    }

    const requestId = `req_${source.book_id}_${source.chapter}_${source.verse}_${Date.now()}`;
    const timeout = setTimeout(() => {
      // Timeout de sécurité du worker
      const fallback = getLocalThematicMatches(
        source.text || '',
        source.book_id,
        source.chapter,
        source.verse,
        limit
      );
      resolve(fallback);
    }, 2000);

    const handler = (event: MessageEvent) => {
      if (event.data?.id === requestId) {
        clearTimeout(timeout);
        worker.removeEventListener('message', handler);
        if (event.data.success && Array.isArray(event.data.results) && event.data.results.length > 0) {
          resolve(event.data.results);
        } else {
          resolve(getLocalThematicMatches(source.text || '', source.book_id, source.chapter, source.verse, limit));
        }
      }
    };

    worker.addEventListener('message', handler);
    worker.postMessage({
      id: requestId,
      bookId: source.book_id,
      bookName: source.book_name,
      chapter: source.chapter,
      verse: source.verse,
      verseText: source.text || '',
      limit
    });
  });
}

export interface FetchSimilarOptions {
  source: VerseSourceIdentifier;
  limit?: number;
  timeoutMs?: number; // Par défaut 10 000 ms (10 secondes)
  onProgressiveResult?: (results: SimilarVerse[], isInitial: boolean) => void;
  signal?: AbortSignal;
}

/**
 * Recherche haute performance de passages similaires avec :
 * 1. Cache instantané (0 ms)
 * 2. Affichage progressif
 * 3. Web Worker hors du thread principal
 * 4. Timeout strict de 10 secondes avec AbortController
 * 5. Fallback garanti pour ne JAMAIS laisser le spinner tourner ni renvoyer 0 résultats
 */
export async function fetchSimilarVerses(options: FetchSimilarOptions): Promise<{
  results: SimilarVerse[];
  source: 'cache' | 'precomputed' | 'worker' | 'network' | 'fallback';
}> {
  const { source, limit = 6, timeoutMs = 10000, onProgressiveResult } = options;

  // Étape 1 : Vérification immédiate du cache (0 ms)
  const cached = getFromCache(source);
  if (cached && cached.length > 0) {
    const sliced = cached.slice(0, Math.min(limit, 10));
    if (onProgressiveResult) {
      onProgressiveResult(sliced, true);
    }
    return { results: sliced, source: 'cache' };
  }

  // Étape 2 : Lancement immédiat du calcul local Web Worker pour affichage progressif
  let localFastResults: SimilarVerse[] = [];
  try {
    localFastResults = await queryWorker(source, limit);
    if (localFastResults && localFastResults.length > 0) {
      if (onProgressiveResult) {
        onProgressiveResult(localFastResults, true);
      }
    }
  } catch (_) {}

  // Étape 3 : Requête réseau vers le serveur avec timeout strict de 10s via AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const reference = `${source.book_name} ${source.chapter}:${source.verse}`;
    const resp = await authenticatedFetch('/api/gemini/similar-verses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verseText: source.text || '',
        reference,
        bookName: source.book_name,
        bookId: source.book_id,
        chapter: source.chapter,
        verse: source.verse,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (resp.ok) {
      const data: SimilarVersesResponse = await resp.json();
      const serverVerses = data?.versets_similaires || [];
      if (serverVerses.length > 0) {
        const finalResults = serverVerses.slice(0, Math.min(limit, 10));
        saveToCache(source, finalResults);
        if (onProgressiveResult) {
          onProgressiveResult(finalResults, false);
        }
        return { results: finalResults, source: 'network' };
      }
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    // Timeout ou erreur réseau : le contrôleur a avorté ou la requête a échoué
    const isTimeout = err?.name === 'AbortError' || controller.signal.aborted;
    if (isTimeout) {
      console.warn("Recherche de versets similaires interrompue après timeout de 10 secondes.");
    }
  }

  // Étape 4 : Fallback garanti
  // Si le serveur a échoué ou a mis plus de 10 secondes, on utilise les résultats du worker/index thématique
  const fallbackResults = localFastResults.length > 0 
    ? localFastResults 
    : getLocalThematicMatches(source.text || '', source.book_id, source.chapter, source.verse, limit);

  const safeResults = fallbackResults.slice(0, Math.min(limit, 10));
  saveToCache(source, safeResults);
  if (onProgressiveResult) {
    onProgressiveResult(safeResults, false);
  }
  return { results: safeResults, source: 'fallback' };
}

/**
 * Préchargement (prefetch) silencieux d'un verset dès qu'il est sélectionné.
 * S'exécute en tâche de fond pour que le clic sur « Similaires » soit instantané.
 */
export function prefetchSimilarVerses(source: VerseSourceIdentifier): void {
  // Si déjà en cache, rien à faire
  if (getFromCache(source)) return;

  // Lancement en arrière-plan sans bloquer l'UI
  setTimeout(() => {
    fetchSimilarVerses({
      source,
      limit: 6,
      timeoutMs: 8000
    }).catch(() => {});
  }, 100);
}
