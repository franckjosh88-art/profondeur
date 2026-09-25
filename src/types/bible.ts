export interface Verse {
  book_id: number;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface Chapter {
  book_id: number;
  chapter: number;
  verses: Verse[];
}

export interface Book {
  id: number;
  name: string;
  slug: string;
  testament: 'AT' | 'NT';
  category: 'pentateuque' | 'historique' | 'poetique' | 'prophetique' | 'evangile' | 'epitre' | 'apocalypse';
  chapters_count: number;
}

export type TranslationCode = 'LSG' | 'KJV';

export interface StrongEntry {
  code: string;
  language: 'greek' | 'hebrew';
  word: string;
  transliteration: string;
  definition: string;
  usage?: string;
}

export interface DailyVerse {
  verse: Verse;
  book: Book;
  explanation: string;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  color?: string; // 'gold' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'cyan' | 'purple'
  icon?: string; // 'sparkles' | 'shield' | 'heart' | 'star' | 'book' | 'flame' | 'feather' | 'cross'
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface FavoriteVerse {
  book_id: number;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
  added_at: string;
  folder_id?: string | null;
  folder_name?: string | null;
  tags?: string[];
}

export interface ReadingHistory {
  book_id: number;
  book_name: string;
  chapter: number;
  timestamp: string;
  last_verse?: number;
  total_verses?: number;
  time_spent_seconds?: number;
  status?: 'non_commence' | 'en_cours' | 'complete';
}

export interface ReadingPosition {
  book_id: number;
  book_name: string;
  chapter: number;
  verse: number;
  timestamp: string;
}

export interface EmotionAnalysisResult {
  detectedEmotion: string;
  emotionalSummary: string;
  pastoralEncouragement: string;
  suggestedVerses: {
    reference: string;
    text: string;
    reason: string;
  }[];
}

export interface VerseNote {
  book_id: number;
  book_name: string;
  chapter: number;
  verse: number;
  note: string;
  audio?: string;
  updated_at: string;
  emotion_analysis?: EmotionAnalysisResult;
}

export type LinkType = 'Parallèle' | 'Accomplissement' | 'Éclairage' | 'Contraste' | 'Illustration';

export interface SimilarVerse {
  reference: string;
  book_id: number;
  book_name: string;
  chapter: number;
  verse: number;
  verse_end?: number;
  type_lien: LinkType;
  explication: string;
  text: string;
}

export interface SimilarVersesResponse {
  verset_source: string;
  versets_similaires: SimilarVerse[];
}

