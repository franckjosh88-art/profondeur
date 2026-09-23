export interface ReadingPlanDay {
  day: number;
  title: string;
  bookId: number;
  bookName: string;
  chapter: number;
  verseRange?: string;
  keyVerse?: string;
  meditationPrompt?: string;
}

export interface ReadingPlan {
  id: string;
  title: string;
  description: string;
  durationDays: number;
  category: 'nt' | 'poetique' | 'pentateuque' | 'bible' | 'custom' | 'ai_generated';
  targetCategoryName?: string;
  isCustom?: boolean;
  bookIds?: number[]; // list of included book IDs for custom plans
  theme?: string;
  days?: ReadingPlanDay[]; // Structured 30-day itinerary
  createdAt?: string;
}

export interface ReadingHistoryItem {
  book_id: number;
  chapter: number;
  date: string;
}

export interface PlanUserProgress {
  planId: string;
  joinedAt: string;
  completedChapters: string[]; // List of "bookId:chapterNum"
  completedDays?: number[]; // List of completed day numbers (1 to 30) for AI plans
  isCompleted: boolean;
}
