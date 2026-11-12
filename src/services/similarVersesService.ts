import { SimilarVerse, SimilarVersesResponse } from '../types/bible';
import { PRECOMPUTED_CROSS_REFERENCES } from '../data/biblicalCrossReferences';
import { authenticatedFetch } from '../lib/apiClient';

export type AnalysisType = 'similaires' | 'analyser' | 'comparer' | 'mediter';

// Cache en mémoire vive (RAM) partitionné par type d'analyse et référence
const memoryCache = new Map<string, SimilarVerse[]>();

export interface VerseSourceIdentifier {
  book_id: number;
  book_name: string;
  chapter: number;
  verse: number;
  text?: string;
}

/**
 * Génère des clés de cache intégrant systématiquement le type d'analyse
 * ET la référence exacte ou identifiant du verset.
 * Ex : "bible_analysis_cache_similaires_40_25_9" ou "bible_analysis_cache_similaires_matthieu_25_9"
 */
export function getAnalysisCacheKey(
  type: AnalysisType,
  source: VerseSourceIdentifier,
  extra?: string
): string[] {
  const numKey = `bible_analysis_cache_${type}_${source.book_id}_${source.chapter}_${source.verse}${extra ? '_' + extra.trim().toLowerCase() : ''}`;
  const cleanRef = `${source.book_name.trim()} ${source.chapter}:${source.verse}`;
  const normRef = cleanRef.toLowerCase().replace(/[\s:]+/g, '_');
  const refKey = `bible_analysis_cache_${type}_${normRef}${extra ? '_' + extra.trim().toLowerCase() : ''}`;
  return [numKey, refKey];
}

/**
 * Alias pour compatibilité avec le code existant et les tests unitaires.
 */
export function getVerseCacheKeys(source: VerseSourceIdentifier): string[] {
  const numKey = `${source.book_id}_${source.chapter}_${source.verse}`;
  const cleanRef = `${source.book_name.trim()} ${source.chapter}:${source.verse}`;
  const normRef = cleanRef.toLowerCase().replace(/[\s:]+/g, '_');
  const typeKeys = getAnalysisCacheKey('similaires', source);
  return [...typeKeys, numKey, cleanRef, normRef];
}

/**
 * Efface le cache pour une analyse donnée (RAM et LocalStorage) pour permettre
 * un rechargement forcé ("Régénérer").
 */
export function clearAnalysisCache(
  type: AnalysisType,
  source: VerseSourceIdentifier,
  extra?: string
): void {
  const keys = getAnalysisCacheKey(type, source, extra);
  for (const k of keys) {
    memoryCache.delete(k);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(k);
        localStorage.removeItem(`bible_similar_cache_v2_${k}`);
      } catch (_) {}
    }
  }
}

/**
 * Récupère les versets similaires depuis le cache mémoire ou localStorage.
 */
export function getFromCache(
  source: VerseSourceIdentifier,
  type: AnalysisType = 'similaires'
): SimilarVerse[] | null {
  const keys = getAnalysisCacheKey(type, source);

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
        const stored = localStorage.getItem(k);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const rk of keys) memoryCache.set(rk, parsed);
            return parsed;
          }
        }
      } catch (_) {}
    }
  }

  // 3. Index Précalculé Statique pour passages majeurs (ex: Jérémie 31:3, Jean 3:16)
  if (type === 'similaires') {
    const numKey = `${source.book_id}_${source.chapter}_${source.verse}`;
    if (PRECOMPUTED_CROSS_REFERENCES[numKey] && PRECOMPUTED_CROSS_REFERENCES[numKey].length > 0) {
      const precomputed = PRECOMPUTED_CROSS_REFERENCES[numKey];
      for (const k of keys) memoryCache.set(k, precomputed);
      return precomputed;
    }
  }

  return null;
}

/**
 * Sauvegarde les résultats dans le cache RAM et LocalStorage sous la clé typée.
 */
export function saveToCache(
  source: VerseSourceIdentifier,
  results: SimilarVerse[],
  type: AnalysisType = 'similaires'
): void {
  if (!results || results.length === 0) return;
  const keys = getAnalysisCacheKey(type, source);

  for (const k of keys) {
    memoryCache.set(k, results);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(k, JSON.stringify(results));
      } catch (_) {}
    }
  }
}

export interface FetchSimilarOptions {
  source: VerseSourceIdentifier;
  limit?: number;
  timeoutMs?: number; // Par défaut 10 000 ms (10 secondes)
  forceRefresh?: boolean;
  onProgressiveResult?: (results: SimilarVerse[], isInitial: boolean) => void;
  signal?: AbortSignal;
}

export interface FetchSimilarResult {
  results: SimilarVerse[];
  themeSource?: string;
  source: 'cache' | 'precomputed' | 'network';
}

/**
 * Recherche de passages parallèles spécifiques et fidèles :
 * 1. Vérification du cache typé par verset et analyse (si pas forceRefresh)
 * 2. Appel serveur vers le modèle Gemini avec le contexte complet (2 versets avant/après)
 * 3. Validation théologique et vérification des références dans le corpus LSG
 * 4. Timeout strict de 10 secondes
 * 5. En cas d'erreur ou d'échec : aucun texte de secours codé en dur, affiche "Analyse indisponible, réessaie".
 */
export async function fetchSimilarVerses(options: FetchSimilarOptions): Promise<FetchSimilarResult> {
  const { source, limit = 6, timeoutMs = 10000, forceRefresh = false, onProgressiveResult } = options;

  // Si rechargement forcé demandé, effacer le cache
  if (forceRefresh) {
    clearAnalysisCache('similaires', source);
  } else {
    // 1. Vérification du cache local instantané
    const cached = getFromCache(source, 'similaires');
    if (cached && cached.length > 0) {
      const sliced = cached.slice(0, Math.min(limit, 10));
      if (onProgressiveResult) {
        onProgressiveResult(sliced, true);
      }
      return { results: sliced, source: 'cache' };
    }
  }

  // 2. Requête réseau vers le serveur avec timeout strict de 10s via AbortController
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
        forceRefresh: !!forceRefresh,
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (resp.ok) {
      const data: SimilarVersesResponse = await resp.json();
      const serverVerses = data?.versets_similaires || [];
      if (serverVerses.length > 0) {
        const finalResults = serverVerses.slice(0, Math.min(limit, 10));
        saveToCache(source, finalResults, 'similaires');
        if (onProgressiveResult) {
          onProgressiveResult(finalResults, false);
        }
        return { 
          results: finalResults, 
          themeSource: data.theme_source, 
          source: 'network' 
        };
      }
    } else {
      const errorData = await resp.json().catch(() => null);
      const errMsg = errorData?.error || "Analyse indisponible, réessaie";
      throw new Error(errMsg);
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error("fetchSimilarVerses error:", err);
    // Règle 6 : Supprimer tout texte de secours codé en dur. En cas d'erreur, afficher "Analyse indisponible, réessaie"
    throw new Error("Analyse indisponible, réessaie");
  }

  throw new Error("Analyse indisponible, réessaie");
}

/**
 * Préchargement (prefetch) silencieux d'un verset dès qu'il est sélectionné.
 */
export function prefetchSimilarVerses(source: VerseSourceIdentifier): void {
  if (getFromCache(source, 'similaires')) return;

  setTimeout(() => {
    fetchSimilarVerses({
      source,
      limit: 6,
      timeoutMs: 8000
    }).catch(() => {});
  }, 150);
}
