import { Book } from '../types/bible';
import { BOOKS } from '../data/bibleData';

export interface ChapterTarget {
  book: Book;
  chapter: number;
}

/**
 * Retourne le chapitre suivant dans l'ordre canonique des livres bibliques.
 * Exemple : Jérémie 32 -> Jérémie 33 ; Jérémie 52 -> Lamentations 1 ; Apocalypse 22 -> null.
 */
export function getNextChapter(
  book: Book,
  chapter: number,
  books: Book[] = BOOKS
): ChapterTarget | null {
  if (!book || !Array.isArray(books) || books.length === 0) {
    return null;
  }

  const maxChapters = Math.max(1, book.chapters_count || 1);
  if (chapter < maxChapters) {
    return {
      book,
      chapter: chapter + 1,
    };
  }

  const currentIdx = books.findIndex((b) => b.id === book.id);
  if (currentIdx !== -1 && currentIdx < books.length - 1) {
    return {
      book: books[currentIdx + 1],
      chapter: 1,
    };
  }

  return null;
}

/**
 * Retourne le chapitre précédent dans l'ordre canonique des livres bibliques.
 * Exemple : Lamentations 1 -> Jérémie 52 ; Genèse 1 -> null.
 */
export function getPreviousChapter(
  book: Book,
  chapter: number,
  books: Book[] = BOOKS
): ChapterTarget | null {
  if (!book || !Array.isArray(books) || books.length === 0) {
    return null;
  }

  if (chapter > 1) {
    return {
      book,
      chapter: chapter - 1,
    };
  }

  const currentIdx = books.findIndex((b) => b.id === book.id);
  if (currentIdx > 0) {
    const prevBook = books[currentIdx - 1];
    return {
      book: prevBook,
      chapter: Math.max(1, prevBook.chapters_count || 1),
    };
  }

  return null;
}

/**
 * Indique si la lecture audio doit continuer après un changement manuel de chapitre (flèches gauche/droite).
 */
export function shouldContinueOnChapterChange(
  isSpeaking: boolean,
  isPaused: boolean,
  isPlayingContinuous: boolean
): boolean {
  if (isPaused) return false;
  return isSpeaking || isPlayingContinuous;
}

/**
 * Décide comment réagir à une erreur d'énonciation Web Speech API :
 * - 'ignore' pour les interruptions normales (cancel/interrupted/canceled)
 * - 'skip' pour passer au segment suivant sans couper tout le chapitre
 * - 'stop' si trop d'erreurs consécutives se produisent
 */
export function shouldAdvanceOnSpeechError(
  errorCode: string | undefined,
  consecutiveErrors: number,
  maxConsecutiveErrors: number = 5
): 'ignore' | 'skip' | 'stop' {
  const ignorableErrors = ['interrupted', 'canceled', 'agent-rejected'];
  if (!errorCode || ignorableErrors.includes(errorCode)) {
    return 'ignore';
  }
  if (consecutiveErrors + 1 >= maxConsecutiveErrors) {
    return 'stop';
  }
  return 'skip';
}

/**
 * Formate un compte à rebours en secondes au format mm:ss pour la minuterie de sommeil.
 */
export function formatSleepCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
