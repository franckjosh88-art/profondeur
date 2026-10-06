/**
 * Spiritual Note Utilities: Parsing, Migration, Date Formatting & Grouping
 */

export interface SpiritualMeditationNote {
  id: string;
  reference: string;
  titre: string;
  contenu: string;
  createdAt: string;
  updatedAt: string;
  book_id?: number;
  book_name?: string;
  chapter?: number;
  verse?: number;
  audio?: string;
  emotion_analysis?: any;
}

export interface ParsedNoteContent {
  title?: string;
  category?: string;
  text: string;
}

/**
 * Safely parse note content:
 * If the string contains a raw JSON object (e.g. from an exegesis/dictionary/event study),
 * parse and extract clean human-readable fields instead of showing raw JSON.
 */
export function parseNoteContent(rawContent: string): ParsedNoteContent {
  if (!rawContent) return { text: "" };
  const trimmed = rawContent.trim();

  // Test if it might be JSON
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        const title = parsed.titre || parsed.title || parsed.term || parsed.reference || parsed.name;
        const category = parsed.category || parsed.categorie || parsed.type || parsed.theme;
        const text = parsed.contenu || parsed.content || parsed.note || parsed.definition || parsed.summary || parsed.description || parsed.explication || parsed.text || '';
        
        if (text || title) {
          return {
            title: title ? String(title) : undefined,
            category: category ? String(category) : undefined,
            text: text ? String(text) : (title ? String(title) : trimmed)
          };
        }
      }
    } catch (_) {
      // Fallback to plain text
    }
  }

  return { text: trimmed };
}

/**
 * Format date in French according to user spec:
 * « Lundi 5 octobre 2026 · 09:16 »
 */
export function formatFullFrenchDate(isoString?: string): string {
  if (!isoString) return "Date indéterminée";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Date indéterminée";

  const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(date);
  const day = date.getDate();
  const month = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(date);
  const year = date.getFullYear();
  const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);

  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalizedWeekday} ${day} ${month} ${year} · ${time}`;
}

/**
 * Format relative dates in French for recent notes:
 * « Aujourd'hui », « Hier », « Il y a 3 jours »
 */
export function formatRelativeFrenchDate(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const noteDayTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - noteDayTime) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Aujourd'hui";
  } else if (diffDays === 1) {
    return "Hier";
  } else if (diffDays > 1 && diffDays <= 7) {
    return `Il y a ${diffDays} jours`;
  }

  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date);
}

/**
 * Format Month Group: « Octobre 2026 », « Septembre 2026 »
 */
export function formatMonthGroup(isoString?: string): string {
  if (!isoString) return "Notes antérieures";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Notes antérieures";

  const monthStr = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date);
  return monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
}

/**
 * Check if note was modified later (more than 1 minute after creation)
 */
export function wasNoteModifiedLater(createdAt?: string, updatedAt?: string): boolean {
  if (!createdAt || !updatedAt) return false;
  const c = new Date(createdAt).getTime();
  const u = new Date(updatedAt).getTime();
  if (isNaN(c) || isNaN(u)) return false;
  return (u - c) > 60000;
}

/**
 * Normalizes and migrates old/raw notes to the complete structured object:
 * {
 *   id: string,
 *   reference: string,
 *   titre: string,
 *   contenu: string,
 *   createdAt: string,
 *   updatedAt: string
 * }
 */
export function normalizeAndMigrateNote(raw: any, defaultMigrationDate: string = new Date().toISOString()): SpiritualMeditationNote {
  const rawText = raw.contenu || raw.note || raw.text || '';
  const parsed = parseNoteContent(rawText);

  // Derive reference
  let reference = raw.reference;
  if (!reference && raw.book_name && raw.chapter && raw.verse) {
    reference = `${raw.book_name} ${raw.chapter}:${raw.verse}`;
  } else if (!reference && raw.bookId && raw.chapter && raw.verse) {
    reference = `Livre ${raw.bookId} ${raw.chapter}:${raw.verse}`;
  }
  if (!reference) {
    reference = parsed.title || "Méditation Spirituelle";
  }

  // Derive title
  const titre = raw.titre || raw.title || parsed.title || (raw.emotion_analysis?.detectedEmotion ? `Méditation · ${raw.emotion_analysis.detectedEmotion}` : 'Méditation personnelle');
  const contenu = parsed.text || raw.note || raw.contenu || '';

  // Handle migration of dates
  const createdAt = raw.createdAt || raw.created_at || raw.updatedAt || raw.updated_at || defaultMigrationDate;
  const updatedAt = raw.updatedAt || raw.updated_at || createdAt;

  const id = String(
    raw.id || 
    (raw.book_id && raw.chapter && raw.verse ? `${raw.book_id}_${raw.chapter}_${raw.verse}` : `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`)
  );

  return {
    id,
    reference,
    titre,
    contenu,
    createdAt,
    updatedAt,
    book_id: raw.book_id || raw.bookId,
    book_name: raw.book_name || raw.bookName,
    chapter: raw.chapter,
    verse: raw.verse,
    audio: raw.audio,
    emotion_analysis: raw.emotion_analysis,
  };
}

export type NoteDateFilter = 'all' | 'today' | 'week' | 'month';

/**
 * Filter notes by date interval
 */
export function filterNotesByDate(notes: SpiritualMeditationNote[], dateFilter: NoteDateFilter): SpiritualMeditationNote[] {
  if (dateFilter === 'all') return notes;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = startOfToday - (6 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  return notes.filter(n => {
    const targetDate = new Date(n.updatedAt || n.createdAt).getTime();
    if (isNaN(targetDate)) return false;

    if (dateFilter === 'today') {
      return targetDate >= startOfToday;
    } else if (dateFilter === 'week') {
      return targetDate >= sevenDaysAgo;
    } else if (dateFilter === 'month') {
      return targetDate >= startOfMonth;
    }
    return true;
  });
}

/**
 * Group notes by month (« Octobre 2026 », « Septembre 2026 »), most recent first
 */
export function groupNotesByMonth(notes: SpiritualMeditationNote[]): { month: string; notes: SpiritualMeditationNote[] }[] {
  // 1. Sort descending (newest first)
  const sorted = [...notes].sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt).getTime() || 0;
    const timeB = new Date(b.updatedAt || b.createdAt).getTime() || 0;
    return timeB - timeA;
  });

  const groups: { month: string; notes: SpiritualMeditationNote[] }[] = [];
  const map = new Map<string, SpiritualMeditationNote[]>();

  for (const note of sorted) {
    const monthKey = formatMonthGroup(note.createdAt || note.updatedAt);
    if (!map.has(monthKey)) {
      map.set(monthKey, []);
      groups.push({ month: monthKey, notes: map.get(monthKey)! });
    }
    map.get(monthKey)!.push(note);
  }

  return groups;
}
