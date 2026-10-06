/**
 * Spiritual Notes & Offline Study Manager Utilities
 * Handles formatting, JSON sanitization, date processing (fr-FR), and persistence.
 */

export interface SpiritualNote {
  id: string;
  reference: string;
  titre: string;
  contenu: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  // Backward compatibility / Bible link attributes
  book_id?: number;
  book_name?: string;
  chapter?: number;
  verse?: number;
  categorie?: string;
  audio?: string;
  note?: string; // legacy alias for contenu
  emotion_analysis?: any;
}

export const STORAGE_KEY_NOTES = 'offline_notes';

/**
 * Safely parses string content in case it was stored as raw JSON
 * (e.g. from dictionary or offline study modules)
 */
export function parseNoteContent(raw: string | undefined): { 
  titre?: string; 
  categorie?: string; 
  contenu: string 
} {
  if (!raw) return { contenu: "" };
  const trimmed = raw.trim();

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        const titre = parsed.titre || parsed.term || parsed.title || parsed.theme || parsed.sujet;
        const categorie = parsed.categorie || parsed.category || parsed.type;
        const contenu = 
          parsed.contenu || 
          parsed.definition || 
          parsed.meaning || 
          parsed.text || 
          parsed.explication || 
          parsed.description || 
          parsed.notes || 
          "";

        return {
          titre: titre ? String(titre) : undefined,
          categorie: categorie ? String(categorie) : undefined,
          contenu: contenu ? String(contenu) : Object.entries(parsed)
            .filter(([k]) => !['titre', 'term', 'title', 'category', 'categorie'].includes(k))
            .map(([k, v]) => `${k} : ${typeof v === 'object' ? JSON.stringify(v) : v}`)
            .join('\n')
        };
      }
    } catch (_) {
      // Fallback to raw string if parsing fails
    }
  }

  return { contenu: raw };
}

/**
 * Migrates any legacy or malformed note into a pristine SpiritualNote object
 */
export function migrateNote(rawNote: any, fallbackDate = new Date().toISOString()): SpiritualNote {
  const rawText = rawNote.contenu || rawNote.note || "";
  const parsed = parseNoteContent(rawText);

  // Derive unique ID
  const id = rawNote.id || 
    (rawNote.book_id && rawNote.chapter && rawNote.verse 
      ? `note_${rawNote.book_id}_${rawNote.chapter}_${rawNote.verse}`
      : `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

  // Derive human-readable reference
  let reference = rawNote.reference;
  if (!reference && rawNote.book_name) {
    reference = `${rawNote.book_name} ${rawNote.chapter || 1}:${rawNote.verse || 1}`;
  }
  if (!reference) {
    reference = parsed.titre || "Méditation spirituelle";
  }

  // Derive title
  const titre = rawNote.titre || parsed.titre || (rawNote.book_name 
    ? `Méditation sur ${reference}`
    : "Pensée sacrée");

  const contenu = parsed.contenu || rawNote.contenu || rawNote.note || "";

  // Handle dates with migration fallback
  const createdAt = rawNote.createdAt || rawNote.created_at || rawNote.updatedAt || rawNote.updated_at || fallbackDate;
  const updatedAt = rawNote.updatedAt || rawNote.updated_at || rawNote.createdAt || rawNote.created_at || fallbackDate;

  return {
    id,
    reference,
    titre,
    contenu,
    createdAt,
    updatedAt,
    book_id: rawNote.book_id,
    book_name: rawNote.book_name,
    chapter: rawNote.chapter,
    verse: rawNote.verse,
    categorie: rawNote.categorie || parsed.categorie,
    audio: rawNote.audio,
    emotion_analysis: rawNote.emotion_analysis,
    note: contenu
  };
}

/**
 * Loads all notes from localStorage, migrating legacy records automatically
 */
export function loadSpiritualNotesFromStorage(): SpiritualNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => migrateNote(item));
  } catch (e) {
    console.error("Error loading spiritual notes from storage:", e);
    return [];
  }
}

/**
 * Saves notes to localStorage
 */
export function saveSpiritualNotesToStorage(notes: SpiritualNote[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
  } catch (e) {
    console.error("Error saving spiritual notes to storage:", e);
  }
}

/**
 * Formats a date using French locale: « Lundi 5 octobre 2026 · 09:16 »
 */
export function formatFullFrenchDate(isoString: string | undefined): string {
  if (!isoString) return "Date indéterminée";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Date indéterminée";

    const datePart = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);

    // Capitalize first letter (e.g. "lundi" -> "Lundi")
    const capitalizedDate = datePart.charAt(0).toUpperCase() + datePart.slice(1);

    const timePart = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);

    return `${capitalizedDate} · ${timePart}`;
  } catch (_) {
    return "Date indéterminée";
  }
}

/**
 * Formats a relative date in French:
 * « Aujourd'hui », « Hier », « Il y a 3 jours », or full date with time
 */
export function formatRelativeDate(isoString: string | undefined): string {
  if (!isoString) return "Date indéterminée";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Date indéterminée";

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffTime = today.getTime() - targetDay.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const timePart = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);

    if (diffDays === 0) {
      return `Aujourd'hui · ${timePart}`;
    }
    if (diffDays === 1) {
      return `Hier · ${timePart}`;
    }
    if (diffDays > 1 && diffDays <= 7) {
      return `Il y a ${diffDays} jours · ${timePart}`;
    }

    return formatFullFrenchDate(isoString);
  } catch (_) {
    return "Date indéterminée";
  }
}

/**
 * Computes a "Modifié le …" label if the note was updated later than its creation
 */
export function getModifiedLabel(createdAtIso?: string, updatedAtIso?: string): string | null {
  if (!createdAtIso || !updatedAtIso) return null;
  try {
    const created = new Date(createdAtIso).getTime();
    const updated = new Date(updatedAtIso).getTime();
    // If difference is greater than 60 seconds (1 minute), display modification date
    if (updated - created > 60 * 1000) {
      return `Modifié le ${formatFullFrenchDate(updatedAtIso)}`;
    }
  } catch (_) {}
  return null;
}

/**
 * Returns month grouping metadata for a date:
 * Key: "2026-10", Label: "Octobre 2026", Timestamp: 1st of month for sorting
 */
export function getMonthGroupKey(isoString: string | undefined): { 
  key: string; 
  label: string; 
  timestamp: number 
} {
  if (!isoString) {
    return { key: 'inconnue', label: 'Antérieures ou sans date', timestamp: 0 };
  }
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return { key: 'inconnue', label: 'Antérieures ou sans date', timestamp: 0 };
    }

    const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(date);
    const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const year = date.getFullYear();

    const key = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const timestamp = new Date(year, date.getMonth(), 1).getTime();

    return {
      key,
      label: `${capitalized} ${year}`,
      timestamp
    };
  } catch (_) {
    return { key: 'inconnue', label: 'Antérieures ou sans date', timestamp: 0 };
  }
}

export type DateFilterType = 'all' | 'today' | 'week' | 'month';

/**
 * Filters notes according to a date scope
 */
export function matchesDateFilter(note: SpiritualNote, filter: DateFilterType): boolean {
  if (filter === 'all') return true;
  const iso = note.updatedAt || note.createdAt;
  if (!iso) return false;

  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return false;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (filter === 'today') {
      return date.getTime() >= startOfToday;
    }

    if (filter === 'week') {
      const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;
      return date.getTime() >= sevenDaysAgo;
    }

    if (filter === 'month') {
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }
  } catch (_) {
    return false;
  }

  return true;
}
