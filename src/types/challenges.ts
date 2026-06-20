export interface ReadingPlan {
  id: string;
  title: string;
  description: string;
  durationDays: number;
  category: 'nt' | 'poetique' | 'pentateuque' | 'bible' | 'custom';
  targetCategoryName?: string;
  isCustom?: boolean;
  bookIds?: number[]; // list of included book IDs for custom plans
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
  isCompleted: boolean;
}
