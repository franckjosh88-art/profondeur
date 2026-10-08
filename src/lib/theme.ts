export type ThemeMode = 'auto' | 'light' | 'dark';
export type DayColor = 'white' | 'cream' | 'pale_green' | 'pale_rose';
export type NightColor = 'sanctuary' | 'charcoal' | 'deep_violet' | 'navy';
export type ReaderFont = 'serif' | 'sans';

export interface ThemeSettings {
  mode: ThemeMode;
  dayColor: DayColor;
  nightColor: NightColor;
  fontFamily: ReaderFont;
  textSize: number;
  lineHeight: number;
}

export interface ColorPreset {
  id: string;
  name: string;
  hex: string;
  tokens: {
    bg: string;
    surface: string;
    surfaceHover: string;
    text: string;
    textMuted: string;
    accent: string;
    border: string;
    verseNum: string;
  };
}

export const DAY_COLORS: Record<DayColor, ColorPreset> = {
  white: {
    id: 'white',
    name: 'Blanc',
    hex: '#ffffff',
    tokens: {
      bg: '#ffffff',
      surface: '#f4f4f5',
      surfaceHover: '#e4e4e7',
      text: '#18181b',
      textMuted: '#71717a',
      accent: '#2563eb',
      border: '#e4e4e7',
      verseNum: '#9ca3af'
    }
  },
  cream: {
    id: 'cream',
    name: 'Crème (sépia)',
    hex: '#fbf0d9',
    tokens: {
      bg: '#fbf0d9',
      surface: '#f4e5c3',
      surfaceHover: '#ebd8ad',
      text: '#3d2f1f',
      textMuted: '#7c6a53',
      accent: '#9a6111',
      border: '#e3cfab',
      verseNum: '#9e8568'
    }
  },
  pale_green: {
    id: 'pale_green',
    name: 'Vert très pâle',
    hex: '#eaf4eb',
    tokens: {
      bg: '#eaf4eb',
      surface: '#dbeade',
      surfaceHover: '#cfe0d3',
      text: '#1a331e',
      textMuted: '#516f55',
      accent: '#2e7d32',
      border: '#cadccf',
      verseNum: '#719276'
    }
  },
  pale_rose: {
    id: 'pale_rose',
    name: 'Rose très pâle',
    hex: '#fbe9eb',
    tokens: {
      bg: '#fbe9eb',
      surface: '#f6d9dc',
      surfaceHover: '#efcad0',
      text: '#3b1820',
      textMuted: '#7c4d57',
      accent: '#ad1457',
      border: '#e4b6bf',
      verseNum: '#9b6c75'
    }
  }
};

export const NIGHT_COLORS: Record<NightColor, ColorPreset> = {
  sanctuary: {
    id: 'sanctuary',
    name: 'Sanctuaire (Noir & Or)',
    hex: '#050403',
    tokens: {
      bg: '#050403',
      surface: '#12100c',
      surfaceHover: '#1c1913',
      text: '#f4efe2',
      textMuted: '#8c8270',
      accent: '#c9a84c',
      border: '#2e2a1e',
      verseNum: '#6e6555'
    }
  },
  charcoal: {
    id: 'charcoal',
    name: 'Gris anthracite',
    hex: '#18181b',
    tokens: {
      bg: '#18181b',
      surface: '#27272a',
      surfaceHover: '#3f3f46',
      text: '#f4f4f5',
      textMuted: '#a1a1aa',
      accent: '#60a5fa',
      border: '#3f3f46',
      verseNum: '#71717a'
    }
  },
  deep_violet: {
    id: 'deep_violet',
    name: 'Violet sombre',
    hex: '#140c1f',
    tokens: {
      bg: '#140c1f',
      surface: '#1f1330',
      surfaceHover: '#2b1b42',
      text: '#f3e8ff',
      textMuted: '#9d87b3',
      accent: '#c084fc',
      border: '#362154',
      verseNum: '#775e8f'
    }
  },
  navy: {
    id: 'navy',
    name: 'Bleu nuit',
    hex: '#080f1e',
    tokens: {
      bg: '#080f1e',
      surface: '#101c36',
      surfaceHover: '#17274a',
      text: '#e0f2fe',
      textMuted: '#7ba0c0',
      accent: '#38bdf8',
      border: '#1f3459',
      verseNum: '#54769a'
    }
  }
};

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: 'dark',
  dayColor: 'white',
  nightColor: 'sanctuary',
  fontFamily: 'serif',
  textSize: 18,
  lineHeight: 1.8
};

export function loadThemeSettings(): ThemeSettings {
  try {
    const raw = localStorage.getItem('bible_theme_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_THEME_SETTINGS,
        ...parsed
      };
    }
  } catch (_) {}
  return DEFAULT_THEME_SETTINGS;
}

export function saveThemeSettings(settings: ThemeSettings): void {
  try {
    localStorage.setItem('bible_theme_settings', JSON.stringify(settings));
  } catch (_) {}
}

export function isSystemDark(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveActiveColorPreset(settings: ThemeSettings): ColorPreset {
  let isDark = true;
  if (settings.mode === 'auto') {
    isDark = isSystemDark();
  } else if (settings.mode === 'light') {
    isDark = false;
  } else {
    isDark = true;
  }

  if (isDark) {
    return NIGHT_COLORS[settings.nightColor] || NIGHT_COLORS.sanctuary;
  }
  return DAY_COLORS[settings.dayColor] || DAY_COLORS.white;
}

export function applyThemeTokensToDOM(settings: ThemeSettings): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const activePreset = resolveActiveColorPreset(settings);
  const { tokens } = activePreset;

  root.style.setProperty('--bg', tokens.bg);
  root.style.setProperty('--surface', tokens.surface);
  root.style.setProperty('--surface-hover', tokens.surfaceHover);
  root.style.setProperty('--text', tokens.text);
  root.style.setProperty('--text-muted', tokens.textMuted);
  root.style.setProperty('--accent', tokens.accent);
  root.style.setProperty('--border', tokens.border);
  root.style.setProperty('--verse-num', tokens.verseNum);

  // Reader typography
  const fontFam = settings.fontFamily === 'serif' 
    ? "'Lora', 'Playfair Display', Georgia, serif"
    : "'Inter', system-ui, -apple-system, sans-serif";

  root.style.setProperty('--font-reading', fontFam);
  root.style.setProperty('--line-height', String(settings.lineHeight));
  root.style.setProperty('--text-size', `${settings.textSize}px`);

  // Also keep backward-compatible Tailwind classes in root dataset
  root.dataset.themeMode = settings.mode;
  root.dataset.presetId = activePreset.id;
}
