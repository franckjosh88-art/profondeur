export type ReaderColorId = 'sanctuaire' | 'blanc' | 'rose' | 'bronze' | 'rouge' | 'noir' | 'bleu';
export type ReaderColorSetting = ReaderColorId | 'sanctuary' | string;

export interface ReaderColorTokens {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  border: string;
  verseNum: string;
}

export interface ReaderColorPreset {
  id: ReaderColorId;
  name: string;
  hex: string; // for the circle swatch
  tokens: ReaderColorTokens;
  hasBackgroundArtwork?: boolean;
}

export const READER_COLORS: Record<ReaderColorId, ReaderColorPreset> = {
  sanctuaire: {
    id: 'sanctuaire',
    name: 'Sanctuaire',
    hex: '#0E0B07',
    tokens: {
      bg: '#0E0B07',
      surface: '#1A1510',
      text: '#F2E9D8',
      textMuted: '#A89B84',
      accent: '#C9A84C',
      border: '#2E251A',
      verseNum: '#8A7B68'
    },
    hasBackgroundArtwork: true
  },
  blanc: {
    id: 'blanc',
    name: 'Blanc',
    hex: '#FFFFFF',
    tokens: {
      bg: '#FFFFFF',
      surface: '#F4F4F2',
      text: '#1C1C1C',
      textMuted: '#6B6B6B',
      accent: '#8A6D1F',
      border: '#E2E2DC',
      verseNum: '#82827D'
    },
    hasBackgroundArtwork: false
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    hex: '#FCE9E6',
    tokens: {
      bg: '#FCE9E6',
      surface: '#F7D9D4',
      text: '#3A1F24',
      textMuted: '#7C5A60',
      accent: '#B03A5B',
      border: '#E8C5BF',
      verseNum: '#8F666D'
    },
    hasBackgroundArtwork: false
  },
  bronze: {
    id: 'bronze',
    name: 'Bronze',
    hex: '#2A1D12',
    tokens: {
      bg: '#2A1D12',
      surface: '#38281A',
      text: '#F1E2CC',
      textMuted: '#B79B7A',
      accent: '#CD7F32',
      border: '#463321',
      verseNum: '#B79B7A'
    },
    hasBackgroundArtwork: false
  },
  rouge: {
    id: 'rouge',
    name: 'Rouge',
    hex: '#2B0D10',
    tokens: {
      bg: '#2B0D10',
      surface: '#3A1418',
      text: '#F8E6E4',
      textMuted: '#C49A9C',
      accent: '#E0525B',
      border: '#4D1D23',
      verseNum: '#A8797D'
    },
    hasBackgroundArtwork: false
  },
  noir: {
    id: 'noir',
    name: 'Noir',
    hex: '#000000',
    tokens: {
      bg: '#000000',
      surface: '#121212',
      text: '#EDEDED',
      textMuted: '#9A9A9A',
      accent: '#C9A84C',
      border: '#262626',
      verseNum: '#787878'
    },
    hasBackgroundArtwork: false
  },
  bleu: {
    id: 'bleu',
    name: 'Bleu',
    hex: '#0B1A2E',
    tokens: {
      bg: '#0B1A2E',
      surface: '#13273F',
      text: '#E6EEF8',
      textMuted: '#8FA6C2',
      accent: '#5B9BFF',
      border: '#1E3654',
      verseNum: '#718EAE'
    },
    hasBackgroundArtwork: false
  }
};

export const DEFAULT_READER_COLOR: ReaderColorId = 'sanctuaire';

export const ORDERED_READER_COLORS: ReaderColorPreset[] = [
  READER_COLORS.sanctuaire,
  READER_COLORS.blanc,
  READER_COLORS.rose,
  READER_COLORS.bronze,
  READER_COLORS.rouge,
  READER_COLORS.noir,
  READER_COLORS.bleu
];

export function normalizeReaderColorId(id?: string | null): ReaderColorId {
  if (!id) return DEFAULT_READER_COLOR;
  if (id === 'sanctuary' || id === 'sanctuaire') return 'sanctuaire';
  if (id in READER_COLORS) return id as ReaderColorId;
  return DEFAULT_READER_COLOR;
}

export function getReaderPreset(id?: string | null): ReaderColorPreset {
  if (id === 'sanctuary' || id === 'sanctuaire' || !id) {
    return READER_COLORS.sanctuaire;
  }
  if (id in READER_COLORS) {
    return READER_COLORS[id as ReaderColorId];
  }
  return READER_COLORS.sanctuaire;
}

export function loadSavedReaderColor(): ReaderColorId {
  try {
    const saved = localStorage.getItem('readerColor') || localStorage.getItem('bible_reader_color');
    if (saved) {
      if (saved === 'sanctuary' || saved === 'sanctuaire') {
        return 'sanctuaire';
      }
      if (saved in READER_COLORS) {
        return saved as ReaderColorId;
      }
    }
  } catch (_) {}
  return DEFAULT_READER_COLOR;
}

export function saveReaderColorLocally(colorId: ReaderColorId | string): void {
  try {
    const normalized = normalizeReaderColorId(colorId);
    localStorage.setItem('readerColor', normalized);
    localStorage.setItem('bible_reader_color', normalized);
    applyReaderThemeCssVars(normalized);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('reader-color-changed', { detail: normalized }));
    }
  } catch (_) {}
}

/**
 * Met à jour directement et immédiatement les variables CSS --r-* sur tous les conteneurs .reader
 * ainsi que sur le documentElement si nécessaire, sans rechargement de page.
 */
export function applyReaderThemeCssVars(colorId?: ReaderColorId | string): void {
  if (typeof document === 'undefined') return;
  const normalized = normalizeReaderColorId(colorId);
  const preset = getReaderPreset(normalized);
  const { tokens } = preset;

  // 1. Appliquer sur tous les conteneurs portant la classe .reader ou .reader-container dans le DOM
  const readerContainers = document.querySelectorAll<HTMLElement>('.reader, .reader-container, [data-reader-theme]');
  readerContainers.forEach((el) => {
    el.style.setProperty('--r-bg', tokens.bg);
    el.style.setProperty('--r-surface', tokens.surface);
    el.style.setProperty('--r-text', tokens.text);
    el.style.setProperty('--r-text-secondary', tokens.textMuted);
    el.style.setProperty('--r-text-muted', tokens.textMuted);
    el.style.setProperty('--r-accent', tokens.accent);
    el.style.setProperty('--r-border', tokens.border);
    el.style.setProperty('--r-verse-num', tokens.verseNum);
    el.setAttribute('data-theme', preset.id);
    el.setAttribute('data-reader-theme', preset.id);
  });

  // 2. Mettre à jour au niveau root documentElement pour les variables de repli
  document.documentElement.style.setProperty('--r-bg', tokens.bg);
  document.documentElement.style.setProperty('--r-surface', tokens.surface);
  document.documentElement.style.setProperty('--r-text', tokens.text);
  document.documentElement.style.setProperty('--r-text-secondary', tokens.textMuted);
  document.documentElement.style.setProperty('--r-text-muted', tokens.textMuted);
  document.documentElement.style.setProperty('--r-accent', tokens.accent);
  document.documentElement.style.setProperty('--r-border', tokens.border);
  document.documentElement.style.setProperty('--r-verse-num', tokens.verseNum);
}
