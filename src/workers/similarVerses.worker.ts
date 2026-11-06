import { PRECOMPUTED_CROSS_REFERENCES, getLocalThematicMatches } from '../data/biblicalCrossReferences';
import { SimilarVerse } from '../types/bible';

interface WorkerRequest {
  id: string;
  bookId: number;
  bookName: string;
  chapter: number;
  verse: number;
  verseText: string;
  limit?: number;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  results: SimilarVerse[];
  source: 'precomputed' | 'thematic';
  error?: string;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, bookId, bookName, chapter, verse, verseText, limit = 6 } = event.data;

  try {
    const key = `${bookId}_${chapter}_${verse}`;
    const precomputed = PRECOMPUTED_CROSS_REFERENCES[key];

    if (precomputed && precomputed.length > 0) {
      const results = precomputed.slice(0, Math.min(limit, 10));
      const response: WorkerResponse = {
        id,
        success: true,
        results,
        source: 'precomputed'
      };
      self.postMessage(response);
      return;
    }

    // Calcul thématique hors-thread principal
    const thematic = getLocalThematicMatches(verseText, bookId, chapter, verse, limit);
    const response: WorkerResponse = {
      id,
      success: true,
      results: thematic.slice(0, Math.min(limit, 10)),
      source: 'thematic'
    };
    self.postMessage(response);
  } catch (err: any) {
    self.postMessage({
      id,
      success: false,
      results: [],
      error: err?.message || 'Erreur worker similar-verses'
    });
  }
};
