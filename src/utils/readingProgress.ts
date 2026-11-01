import { Book, ReadingHistory } from '../types/bible';
import { BOOKS } from '../data/bibleData';

export type PlanCategory = 'bible' | 'nt' | 'pentateuque' | 'poetique' | 'custom' | 'ai_generated';

/**
 * Détermine si un livre fait partie d'une catégorie ou d'une liste de sélection d'un plan de lecture.
 */
export function isBookInPlan(book: Book, planCategory: PlanCategory, planBookIds?: number[]): boolean {
  if (planCategory === 'custom' || planCategory === 'ai_generated') {
    return planBookIds ? planBookIds.includes(book.id) : false;
  }
  switch (planCategory) {
    case 'nt':
      return book.testament === 'NT';
    case 'poetique':
      return book.category === 'poetique';
    case 'pentateuque':
      return book.category === 'pentateuque';
    case 'bible':
      return true;
    default:
      return false;
  }
}

/**
 * Retourne la liste des livres de la Bible inclus dans un plan de lecture.
 */
export function getPlanBooks(planCategory: PlanCategory, planBookIds?: number[]): Book[] {
  return BOOKS.filter(b => isBookInPlan(b, planCategory, planBookIds));
}

/**
 * Calcule le nombre total de chapitres d'un plan de lecture.
 */
export function getPlanTotalChapters(planCategory: PlanCategory, planBookIds?: number[]): number {
  const matching = getPlanBooks(planCategory, planBookIds);
  return matching.reduce((sum, b) => sum + b.chapters_count, 0);
}

/**
 * Calcule le pourcentage et le statut d'avancement d'un plan de lecture.
 */
export function calculatePlanProgress(completedCount: number, totalChapters: number): {
  percentage: number;
  completed: number;
  total: number;
  remaining: number;
  isComplete: boolean;
} {
  const total = Math.max(1, totalChapters);
  const completed = Math.min(total, Math.max(0, completedCount));
  const percentage = Math.round((completed / total) * 100);
  const remaining = Math.max(0, total - completed);

  return {
    percentage,
    completed,
    total,
    remaining,
    isComplete: completed >= total
  };
}

/**
 * Calcule le nombre de jours consécutifs de lecture (streak) à partir de l'historique de lecture.
 */
export function calculateReadingStreak(readingHistory: ReadingHistory[]): number {
  if (!readingHistory || readingHistory.length === 0) return 0;

  // Extraire les dates uniques au format YYYY-MM-DD
  const dateSet = new Set<string>();
  for (const item of readingHistory) {
    if (item.timestamp) {
      const d = new Date(item.timestamp);
      if (!isNaN(d.getTime())) {
        dateSet.add(d.toISOString().slice(0, 10));
      }
    }
  }

  if (dateSet.size === 0) return 0;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Le streak est actif si l'utilisateur a lu aujourd'hui ou hier
  let currentCheck = dateSet.has(todayStr) ? today : (dateSet.has(yesterdayStr) ? yesterday : null);
  if (!currentCheck) return 0;

  let streak = 0;
  const runner = new Date(currentCheck);

  while (true) {
    const checkStr = runner.toISOString().slice(0, 10);
    if (dateSet.has(checkStr)) {
      streak += 1;
      runner.setDate(runner.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calcule le nombre total de chapitres distincts lus dans l'historique.
 */
export function calculateDistinctChaptersRead(readingHistory: ReadingHistory[]): number {
  if (!readingHistory) return 0;
  const set = new Set<string>();
  for (const h of readingHistory) {
    set.add(`${h.book_id}:${h.chapter}`);
  }
  return set.size;
}

/**
 * Formate une durée en secondes en chaîne lisible (ex: "1h 15m", "24 min", "45 s").
 */
export function formatReadingDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0 min';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes} min ${seconds} s` : `${minutes} min`;
  }
  return `${seconds} s`;
}
