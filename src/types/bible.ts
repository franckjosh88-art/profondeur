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
  id?: string;
  book_id: number;
  book_name: string;
  chapter: number;
  verse: number;
  reference?: string;
  titre?: string;
  contenu?: string;
  note: string;
  audio?: string;
  created_at?: string;
  updated_at: string;
  createdAt?: string;
  updatedAt?: string;
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

export interface ChapterMeditation {
  id: string; // e.g. `${book_id}_${chapter}`
  key: string; // e.g. `${book_name}-${chapter}` (ex: "Jean-3")
  book_id: number;
  book_name: string;
  chapter: number;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface ChapterAudioMeditation {
  id: string; // unique audio recording id (e.g. `audio_${book_id}_${chapter}_${timestamp}`)
  title: string; // e.g. "Jean 3 – 7 octobre 2026"
  book_id: number;
  book_name: string;
  chapter: number;
  created_at: string;
  duration_seconds: number;
  audio_mime_type?: string;
  written_meditation_id?: string;
  audio_url?: string; // transient Object URL for playback
}

export type HighlightColor = 'jaune' | 'vert' | 'rose';

export interface VerseHighlight {
  id?: string; // `${book_id}_${chapter}_${verse}`
  book_id: number;
  book_name?: string;
  chapter: number;
  verse: number;
  color: string; // CSS background color, e.g. "rgba(250, 204, 21, 0.35)"
  color_name: HighlightColor;
  updated_at: string;
}

export interface HighlightColorDef {
  id: HighlightColor;
  name: string;
  hex: string;
  bgRgba: string;
  borderHex: string;
  label: string;
}

export const HIGHLIGHT_PALETTE: HighlightColorDef[] = [
  {
    id: 'jaune',
    name: 'Jaune',
    label: 'Jaune lumière',
    hex: '#FACC15',
    bgRgba: 'rgba(250, 204, 21, 0.35)',
    borderHex: '#EAB308'
  },
  {
    id: 'vert',
    name: 'Vert',
    label: 'Vert espérance',
    hex: '#4ADE80',
    bgRgba: 'rgba(74, 222, 128, 0.32)',
    borderHex: '#22C55E'
  },
  {
    id: 'rose',
    name: 'Rose',
    label: 'Rose grâce',
    hex: '#F472B6',
    bgRgba: 'rgba(244, 114, 182, 0.34)',
    borderHex: '#EC4899'
  }
];

export const getHighlightColorDef = (colorNameOrId?: string): HighlightColorDef | undefined => {
  if (!colorNameOrId) return undefined;
  const lower = colorNameOrId.toLowerCase();
  return HIGHLIGHT_PALETTE.find(
    p => p.id === lower || p.hex.toLowerCase() === lower || p.bgRgba.toLowerCase() === lower
  );
};

