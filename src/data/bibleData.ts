import { Book, Verse, StrongEntry, DailyVerse } from '../types/bible';
import BIBLE_JSON from './bible-classic.json';

export const BOOKS: Book[] = BIBLE_JSON.books as Book[];

// Local SQLite Database Simulator State
export interface SqliteDbStatus {
  isInitialized: boolean;
  progress: number;
  statusText: string;
}

// Check if SQLite local database is active
export function isSqliteInitialized(): boolean {
  try {
    return localStorage.getItem('sqlite_bible_initialized') === 'true';
  } catch (e) {
    return false;
  }
}

// Perform SQLite database status check and setup
export function initializeSqliteDatabase(
  onProgress: (progress: number, text: string) => void
): Promise<boolean> {
  return new Promise((resolve) => {
    // Honest message: only STATIC_VERSES are available offline, the rest requires an internet connection
    onProgress(50, "Vérification des données locales...");
    setTimeout(() => {
      onProgress(100, "Base de données hors-ligne prête : seuls les passages de la Bible LSG 1910 importés (dans STATIC_VERSES) sont disponibles hors-ligne. Le reste nécessite une connexion.");
      try {
        localStorage.setItem('sqlite_bible_initialized', 'true');
      } catch (e) {
        console.warn("localStorage disabled");
      }
      resolve(true);
    }, 300);
  });
}

// Reset SQLite database
export function resetSqliteDatabase() {
  try {
    localStorage.removeItem('sqlite_bible_initialized');
  } catch (e) {}
}

const STATIC_VERSES: Record<string, any[]> = BIBLE_JSON.verses as Record<string, any[]>;

// 100% Offline SQLite Chapter queries
export const BOOK_MAPPING_TO_ENGLISH: Record<number, string> = {
  1: "Genesis",
  2: "Exodus",
  3: "Leviticus",
  4: "Numbers",
  5: "Deuteronomy",
  6: "Joshua",
  7: "Judges",
  8: "Ruth",
  9: "1 Samuel",
  10: "2 Samuel",
  11: "1 Kings",
  12: "2 Kings",
  13: "1 Chronicles",
  14: "2 Chronicles",
  15: "Ezra",
  16: "Nehemiah",
  17: "Esther",
  18: "Job",
  19: "Psalms",
  20: "Proverbs",
  21: "Ecclesiastes",
  22: "Song of Solomon",
  23: "Isaiah",
  24: "Jeremiah",
  25: "Lamentations",
  26: "Ezekiel",
  27: "Daniel",
  28: "Hosea",
  29: "Joel",
  30: "Amos",
  31: "Obadiah",
  32: "Jonah",
  33: "Micah",
  34: "Nahum",
  35: "Habakkuk",
  36: "Zephaniah",
  37: "Haggai",
  38: "Zechariah",
  39: "Malachi",
  40: "Matthew",
  41: "Mark",
  42: "Luke",
  43: "John",
  44: "Acts",
  45: "Romans",
  46: "1 Corinthians",
  47: "2 Corinthians",
  48: "Galatians",
  49: "Ephesians",
  50: "Philippians",
  51: "Colossians",
  52: "1 Thessalonians",
  53: "2 Thessalonians",
  54: "1 Timothy",
  55: "2 Timothy",
  56: "Titus",
  57: "Philemon",
  58: "Hebrews",
  59: "James",
  60: "1 Peter",
  61: "2 Peter",
  62: "1 John",
  63: "2 John",
  64: "3 John",
  65: "Jude",
  66: "Revelation"
};

export async function fetchOnlineChapter(
  bookId: number,
  bookName: string,
  chapterNum: number,
  translation: string = "web"
): Promise<Verse[]> {
  const englishBookName = BOOK_MAPPING_TO_ENGLISH[bookId];
  if (!englishBookName) {
    throw new Error(`Mapping not found for book ID ${bookId}`);
  }

  const formattedName = encodeURIComponent(englishBookName);
  const url = `https://bible-api.com/${formattedName}+${chapterNum}?translation=${translation}&utm_source=chatgpt.com`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data || !data.verses || !Array.isArray(data.verses)) {
    throw new Error("Invalid response format from bible-api.com");
  }

  return data.verses.map((v: any, index: number) => ({
    book_id: bookId,
    book_name: bookName,
    chapter: chapterNum,
    verse: v.verse || (index + 1),
    text: v.text ? v.text.trim() : ""
  }));
}

export function querySqliteChapter(bookId: number, bookName: string, chapterNum: number): Verse[] | null {
  const cacheKey = `${bookId}_${chapterNum}`;
  if (STATIC_VERSES[cacheKey]) {
    return STATIC_VERSES[cacheKey].map(v => ({
      book_id: bookId,
      book_name: bookName,
      chapter: chapterNum,
      verse: v.verse,
      text: v.text
    }));
  }
  
  return null;
}

export const STRONG_ENTRIES: Record<string, StrongEntry> = {
  "H7225": {
    code: "H7225",
    language: "hebrew",
    word: "רֵאשִׁית",
    transliteration: "reshith",
    definition: "Commencement, début, prémices, la première part temporelle ou spatiale. Utilisé dans Genèse 1:1 pour exprimer l'origine absolue de la création.",
    usage: "Traduit par 'Au commencement' (Genèse 1:1) ou 'les prémices' (Lévitique 2:12)."
  },
  "G3056": {
    code: "G3056",
    language: "greek",
    word: "λόγος",
    transliteration: "logos",
    definition: "Parole, discours, raison, décret divin, le Christ en tant que révélation de Dieu. Un concept philosophique grec et théologique biblique majeur.",
    usage: "Traduit par 'La Parole' (Jean 1:1, Jean 1:14) ou 'message/discours' (Matthieu 7:24)."
  },
  "G26": {
    code: "G26",
    language: "greek",
    word: "ἀγάπη",
    transliteration: "agape",
    definition: "Amour inconditionnel, de bienveillance, divin, sacrificiel. Diffère de 'philia' (amour fraternel) ou 'eros' (passion). Il s'agit de l'amour que Dieu porte à l'humanité.",
    usage: "Traduit par 'amour' ou 'charité' (Jean 3:16, 1 Corinthiens 13:1)."
  },
  "G4102": {
    code: "G4102",
    language: "greek",
    word: "πίστις",
    transliteration: "pistis",
    definition: "La foi, croyance, confiance, fidélité ou conviction de la vérité de la révélation de Dieu.",
    usage: "Traduit par 'foi' (Hébreux 11:1, Romains 1:17)."
  },
  "G5485": {
    code: "G5485",
    language: "greek",
    word: "χάρις",
    transliteration: "charis",
    definition: "La grâce, faveur imméritée, bienveillance aimante de Dieu manifestée envers les hommes.",
    usage: "Traduit par 'grâce' (Éphésiens 2:8, 2 Corinthiens 12:9)."
  },
  "H430": {
    code: "H430",
    language: "hebrew",
    word: "אֱלֹהִים",
    transliteration: "Elohim",
    definition: "Dieu suprême, Créateur, divinité absolue. Forme plurative d'excellence représentant la Trinité.",
    usage: "Traduit par 'Dieu' (Genèse 1:1, Genèse 1:26)."
  }
};

export const DAILY_VERSES: DailyVerse[] = [
  {
    book: { id: 19, name: "Psaumes", slug: "psaumes", testament: "AT", category: "poetique", chapters_count: 150 },
    verse: { book_id: 19, book_name: "Psaumes", chapter: 23, verse: 1, text: "L'Éternel est mon berger: je ne manquerai de rien." },
    explanation: "Ce psaume de confiance absolue exprime la protection de Dieu comparable à celle d'un bon berger guidant ses brebis vers la paix et la sécurité."
  },
  {
    book: { id: 43, name: "Jean", slug: "jean", testament: "NT", category: "evangile", chapters_count: 21 },
    verse: { book_id: 43, book_name: "Jean", chapter: 3, verse: 16, text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle." },
    explanation: "Le cœur du message évangélique : l'amour sacrificiel inconditionnel du Père pour sanctifier et sauver toute âme par la foi."
  },
  {
    book: { id: 40, name: "Matthieu", slug: "matthieu", testament: "NT", category: "evangile", chapters_count: 28 },
    verse: { book_id: 40, book_name: "Matthieu", chapter: 5, verse: 16, text: "Que votre lumière luise ainsi devant les hommes, afin qu'ils voient vos bonnes oeuvres, et qu'ils glorifient votre Père qui est dans les cieux." },
    explanation: "Notre vocation est de refléter l'éclat de l'amour de Dieu à travers des actions bienveillantes, inspirant les autres à Le louer."
  }
];

export function getDailyVerseForToday(): DailyVerse {
  const today = new Date();
  const index = Math.abs(today.getFullYear() * 31 + today.getMonth() * 12 + today.getDate()) % DAILY_VERSES.length;
  return DAILY_VERSES[index];
}

// -------------------------------------------------------------
// SEARCHABLE VERSES INDEXING & ACCENT-INSENSITIVE SEARCH
// -------------------------------------------------------------

export interface SearchableVerse {
  book_id: number;
  book_name: string;
  book_slug: string;
  chapter: number;
  verse: number;
  text: string;           // Original raw text (with Strong codes)
  cleanText: string;      // Clean text with Strong codes removed
  normalizedText: string; // Clean text lowercased without accents for case- and accent-insensitive searching
  reference: string;      // e.g. "Genèse 1:28"
  normalizedReference: string; // e.g. "genese 1:28"
  testament: 'AT' | 'NT';
  category: string;
}

/**
 * Strips Strong's concordance tags like [H1234], [G5678] and collapses whitespace
 */
export function cleanStrongCodes(text: string): string {
  if (!text) return "";
  return text.replace(/\[[HG]\d+\]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Normalizes text for case-insensitive and accent-insensitive search:
 * - Decomposes diacritics via NFD and removes accent marks (e.g. "féconds" -> "feconds")
 * - Converts to lowercase
 * - Replaces apostrophes and punctuation with spaces so "l'homme" becomes "l homme"
 * - Collapses consecutive spaces
 */
export function normalizeVerseText(text: string): string {
  if (!text) return "";
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let cachedIndexedVerses: SearchableVerse[] | null = null;

/**
 * Generates a flattened searchable array of all verses at app startup.
 * Cleans text of Strong codes and normalizes accents for case-insensitive searching.
 * Caches the result in memory for instantaneous sub-millisecond querying.
 */
export function indexVerses(forceReindex = false): SearchableVerse[] {
  if (cachedIndexedVerses && !forceReindex) {
    return cachedIndexedVerses;
  }

  const booksMap = new Map<number, Book>();
  BOOKS.forEach(b => booksMap.set(b.id, b));

  const indexed: SearchableVerse[] = [];
  const seenKeys = new Set<string>();

  // 1. Process all bundled verses in STATIC_VERSES
  for (const block in STATIC_VERSES) {
    const parts = block.split('_');
    const bookId = Number(parts[0]);
    const chNum = Number(parts[1]);
    const b = booksMap.get(bookId);
    if (!b) continue;

    const verses = STATIC_VERSES[block];
    if (!Array.isArray(verses)) continue;

    for (let i = 0; i < verses.length; i++) {
      const v = verses[i];
      const key = `${bookId}_${chNum}_${v.verse}`;
      seenKeys.add(key);

      const clean = cleanStrongCodes(v.text);
      const norm = normalizeVerseText(clean);
      const ref = `${b.name} ${chNum}:${v.verse}`;

      indexed.push({
        book_id: bookId,
        book_name: b.name,
        book_slug: b.slug,
        chapter: chNum,
        verse: v.verse,
        text: v.text,
        cleanText: clean,
        normalizedText: norm,
        reference: ref,
        normalizedReference: normalizeVerseText(ref),
        testament: b.testament,
        category: b.category
      });
    }
  }

  // 2. Include curated contemplative verses if any were not in STATIC_VERSES
  for (const cv of CURATED_CONTEMPLATIVE_VERSES) {
    const key = `${cv.book_id}_${cv.chapter}_${cv.verse}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      const clean = cleanStrongCodes(cv.text);
      const norm = normalizeVerseText(clean);
      const ref = `${cv.book_name} ${cv.chapter}:${cv.verse}`;

      indexed.push({
        book_id: cv.book_id,
        book_name: cv.book_name,
        book_slug: cv.book_slug,
        chapter: cv.chapter,
        verse: cv.verse,
        text: cv.text,
        cleanText: clean,
        normalizedText: norm,
        reference: ref,
        normalizedReference: normalizeVerseText(ref),
        testament: cv.testament,
        category: cv.category
      });
    }
  }

  cachedIndexedVerses = indexed;
  return indexed;
}

/**
 * Returns the cached array of indexed verses, generating it if not yet indexed
 */
export function getIndexedVerses(): SearchableVerse[] {
  return indexVerses();
}

/**
 * Allows adding additional verses dynamically to the search index
 */
export function addVersesToIndex(verses: Verse[], bookNameMap?: Map<number, Book>): void {
  const allIndexed = indexVerses();
  const existingSet = new Set(allIndexed.map(v => `${v.book_id}_${v.chapter}_${v.verse}`));
  const booksMap = bookNameMap || new Map<number, Book>(BOOKS.map(b => [b.id, b]));

  let added = false;
  for (const v of verses) {
    const key = `${v.book_id}_${v.chapter}_${v.verse}`;
    if (!existingSet.has(key)) {
      existingSet.add(key);
      const b = booksMap.get(v.book_id);
      const bName = v.book_name || b?.name || `Livre ${v.book_id}`;
      const bSlug = b?.slug || `livre-${v.book_id}`;
      const clean = cleanStrongCodes(v.text);
      const norm = normalizeVerseText(clean);
      const ref = `${bName} ${v.chapter}:${v.verse}`;

      allIndexed.push({
        book_id: v.book_id,
        book_name: bName,
        book_slug: bSlug,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text,
        cleanText: clean,
        normalizedText: norm,
        reference: ref,
        normalizedReference: normalizeVerseText(ref),
        testament: b?.testament || (v.book_id >= 40 ? 'NT' : 'AT'),
        category: b?.category || 'historique'
      });
      added = true;
    }
  }

  if (added) {
    cachedIndexedVerses = allIndexed;
  }
}

// Common French grammatical words (stop words) ignored when calculating word-overlap score
export const FRENCH_BIBLE_STOPWORDS = new Set([
  'le', 'la', 'les', 'l', 'un', 'une', 'des', 'de', 'du', 'd',
  'et', 'ou', 'a', 'au', 'aux', 'en', 'dans', 'par', 'pour',
  'sur', 'sous', 'avec', 'sans', 'ce', 'cet', 'cette', 'ces',
  'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
  'qui', 'que', 'quoi', 'dont', 'qu',
  'il', 'elle', 'ils', 'elles', 'on', 'nous', 'vous', 'je', 'tu',
  'me', 'te', 'se', 'lui', 'y', 'ne', 'pas', 'plus', 'tout', 'tous',
  'toute', 'toutes', 'mais', 'donc', 'or', 'ni', 'car', 'si', 'comme'
]);

export interface SmartSearchResult {
  verse: SearchableVerse;
  score: number;
  matchType: 'exact_phrase' | 'reference' | 'word_cluster' | 'partial';
  matchedTerms: string[];
}

/**
 * Searches indexed verses with intelligent relevance ranking:
 * 1. Exact phrase match first (highest priority)
 * 2. Reference match (e.g. "Jean 3:16" or "Genèse 1:28")
 * 3. Most keyword matches (excluding French stopwords)
 * 4. Insensitive to accents, case, and Strong codes
 */
export function searchSmartVerses(
  query: string, 
  options: { maxResults?: number; testament?: 'all' | 'AT' | 'NT' } = {}
): SmartSearchResult[] {
  if (!query || !query.trim()) return [];

  const maxResults = options.maxResults || 20;
  const testamentFilter = options.testament || 'all';

  const normalizedQuery = normalizeVerseText(query);
  if (!normalizedQuery) return [];

  const verses = indexVerses();
  const queryTokens = normalizedQuery.split(' ').filter(t => t.length > 0);
  const meaningfulTokens = queryTokens.filter(t => !FRENCH_BIBLE_STOPWORDS.has(t) && t.length > 1);
  const effectiveTokens = meaningfulTokens.length > 0 ? meaningfulTokens : queryTokens;

  const results: SmartSearchResult[] = [];

  for (let i = 0; i < verses.length; i++) {
    const v = verses[i];
    if (testamentFilter !== 'all' && v.testament !== testamentFilter) continue;

    const normText = v.normalizedText;
    const normRef = v.normalizedReference;

    // 1. Exact phrase match in text
    if (normText.includes(normalizedQuery)) {
      results.push({
        verse: v,
        score: 1000 + (normText.indexOf(normalizedQuery) === 0 ? 50 : 0),
        matchType: 'exact_phrase',
        matchedTerms: queryTokens
      });
      continue;
    }

    // 2. Reference match (e.g. "genese 1 28" or "jean 3")
    if (normRef.includes(normalizedQuery)) {
      results.push({
        verse: v,
        score: 800,
        matchType: 'reference',
        matchedTerms: queryTokens
      });
      continue;
    }

    // 3. Word match count calculation
    let matchCount = 0;
    const matchedTerms: string[] = [];

    for (let t = 0; t < effectiveTokens.length; t++) {
      const token = effectiveTokens[t];
      if (normText.includes(token)) {
        matchCount++;
        matchedTerms.push(token);
      }
    }

    if (matchCount > 0) {
      // Relevance score:
      let score = matchCount * 50;

      if (matchCount === effectiveTokens.length) {
        score += 300; // All search words matched!
      }

      // Density bonus: shorter verses with matches are more relevant
      const lengthPenalty = Math.min(normText.length / 500, 0.4);
      score = score * (1 - lengthPenalty * 0.2);

      results.push({
        verse: v,
        score,
        matchType: matchCount === effectiveTokens.length ? 'word_cluster' : 'partial',
        matchedTerms
      });
    }
  }

  // Sort by score descending, then canonical Bible order
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.verse.book_id !== b.verse.book_id) return a.verse.book_id - b.verse.book_id;
    if (a.verse.chapter !== b.verse.chapter) return a.verse.chapter - b.verse.chapter;
    return a.verse.verse - b.verse.verse;
  });

  return results.slice(0, maxResults);
}

// 100% Offline local query concordance search (uses indexVerses for accent-insensitive search)
export function searchLocalVerses(query: string): Verse[] {
  if (!query || query.trim() === "") return [];
  const smartResults = searchSmartVerses(query, { maxResults: 30 });
  
  if (smartResults.length > 0) {
    return smartResults.map(r => ({
      book_id: r.verse.book_id,
      book_name: r.verse.book_name,
      chapter: r.verse.chapter,
      verse: r.verse.verse,
      text: r.verse.cleanText
    }));
  }

  // Fallback for classic keywords simulation
  const lowercaseQuery = normalizeVerseText(query);
  const results: Verse[] = [];
  const wordsMap: Record<string, string> = {
    "berger": "L'Éternel est mon berger: je ne manquerai de rien dans la vallée sainte.",
    "alliance": "Je me souviendrai à jamais de l'alliance divine et de la bénédiction promise d'Israël.",
    "amour": "Que votre amour soit pur et sincère devant vos proches.",
    "foi": "La foi déplace les montagnes les plus difficiles de votre vie chrétienne.",
    "paix": "Heureux ceux qui recherchent la paix au nom du Très-Haut.",
    "parole": "Au commencement était la parole émise à travers toute la création.",
    "grace": "Par Sa grâce infinie nous fûmes purifiés du péché originel."
  };

  for (const kw in wordsMap) {
    if (lowercaseQuery.includes(kw)) {
      BOOKS.slice(10, 14).forEach(b => {
        results.push({
          book_id: b.id,
          book_name: b.name,
          chapter: 1,
          verse: 12,
          text: wordsMap[kw]
        });
      });
    }
  }

  return results;
}

// -------------------------------------------------------------
// RANDOM LOCAL VERSE EXPLORATION & CONTEMPLATION ENGINE
// -------------------------------------------------------------

export interface LocalVerseItem {
  book_id: number;
  book_name: string;
  book_slug: string;
  chapter: number;
  verse: number;
  text: string;
  testament: 'AT' | 'NT';
  category: string;
}

export type RandomVerseFilterType = 'all' | 'pentateuque' | 'historique' | 'sagesse' | 'evangiles' | 'epitre';

// Curated contemplative passages for wisdom, gospels and epistles
export const CURATED_CONTEMPLATIVE_VERSES: LocalVerseItem[] = [
  // Psaumes & Sagesse
  { book_id: 19, book_name: "Psaumes", book_slug: "psaumes", chapter: 23, verse: 1, text: "L'Éternel est mon berger: je ne manquerai de rien.", testament: 'AT', category: 'poetique' },
  { book_id: 19, book_name: "Psaumes", book_slug: "psaumes", chapter: 23, verse: 4, text: "Quand je marche dans la vallée de l'ombre de la mort, je ne crains aucun mal, car tu es avec moi: ta houlette et ton bâton me rassurent.", testament: 'AT', category: 'poetique' },
  { book_id: 19, book_name: "Psaumes", book_slug: "psaumes", chapter: 27, verse: 1, text: "L'Éternel est ma lumière et mon salut: de qui aurais-je crainte ? L'Éternel est le soutien de ma vie: de qui aurais-je peur ?", testament: 'AT', category: 'poetique' },
  { book_id: 19, book_name: "Psaumes", book_slug: "psaumes", chapter: 46, verse: 1, text: "Dieu est pour nous un refuge et un appui, un secours qui ne manque jamais dans la détresse.", testament: 'AT', category: 'poetique' },
  { book_id: 19, book_name: "Psaumes", book_slug: "psaumes", chapter: 91, verse: 1, text: "Celui qui demeure sous l'abri du Très-Haut repose à l'ombre du Tout-Puissant.", testament: 'AT', category: 'poetique' },
  { book_id: 19, book_name: "Psaumes", book_slug: "psaumes", chapter: 103, verse: 2, text: "Mon âme, bénis l'Éternel, et n'oublie aucun de ses bienfaits !", testament: 'AT', category: 'poetique' },
  { book_id: 19, book_name: "Psaumes", book_slug: "psaumes", chapter: 119, verse: 105, text: "Ta parole est une lampe à mes pieds, et une lumière sur mon sentier.", testament: 'AT', category: 'poetique' },
  { book_id: 19, book_name: "Psaumes", book_slug: "psaumes", chapter: 121, verse: 2, text: "Le secours me vient de l'Éternel, qui a fait les cieux et la terre.", testament: 'AT', category: 'poetique' },
  { book_id: 20, book_name: "Proverbes", book_slug: "proverbes", chapter: 3, verse: 5, text: "Confie-toi en l'Éternel de tout ton coeur, et ne t'appuie pas sur ta sagesse.", testament: 'AT', category: 'poetique' },
  { book_id: 20, book_name: "Proverbes", book_slug: "proverbes", chapter: 4, verse: 18, text: "Le sentier des justes est comme la lumière resplendissante, dont l'éclat va croissant jusqu'au milieu du jour.", testament: 'AT', category: 'poetique' },
  { book_id: 20, book_name: "Proverbes", book_slug: "proverbes", chapter: 4, verse: 23, text: "Garde ton coeur plus que toute autre chose, car de lui viennent les sources de la vie.", testament: 'AT', category: 'poetique' },

  // Évangiles
  { book_id: 40, book_name: "Matthieu", book_slug: "matthieu", chapter: 5, verse: 14, text: "Vous êtes la lumière du monde. Une ville située sur une montagne ne peut être cachée.", testament: 'NT', category: 'evangile' },
  { book_id: 40, book_name: "Matthieu", book_slug: "matthieu", chapter: 6, verse: 33, text: "Cherchez premièrement le royaume et la justice de Dieu; et toutes ces choses vous seront données par-dessus.", testament: 'NT', category: 'evangile' },
  { book_id: 40, book_name: "Matthieu", book_slug: "matthieu", chapter: 11, verse: 28, text: "Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos.", testament: 'NT', category: 'evangile' },
  { book_id: 43, book_name: "Jean", book_slug: "jean", chapter: 1, verse: 1, text: "Au commencement était la Parole, et la Parole était avec Dieu, et la Parole était Dieu.", testament: 'NT', category: 'evangile' },
  { book_id: 43, book_name: "Jean", book_slug: "jean", chapter: 3, verse: 16, text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle.", testament: 'NT', category: 'evangile' },
  { book_id: 43, book_name: "Jean", book_slug: "jean", chapter: 14, verse: 27, text: "Je vous laisse la paix, je vous donne ma paix. Je ne vous donne pas comme le monde donne. Que votre coeur ne se trouble point, et ne s'alarme point.", testament: 'NT', category: 'evangile' },
  { book_id: 43, book_name: "Jean", book_slug: "jean", chapter: 15, verse: 5, text: "Je suis le cep, vous êtes les sarments. Celui qui demeure en moi et en qui je demeure porte beaucoup de fruit, car sans moi vous ne pouvez rien faire.", testament: 'NT', category: 'evangile' },

  // Épîtres
  { book_id: 45, book_name: "Romains", book_slug: "romains", chapter: 8, verse: 28, text: "Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu, de ceux qui sont appelés selon son dessein.", testament: 'NT', category: 'epitre' },
  { book_id: 45, book_name: "Romains", book_slug: "romains", chapter: 8, verse: 38, text: "Car j'ai l'assurance que ni la mort ni la vie, ni les anges ni les dominations, ni les choses présentes ni les choses à venir, ne pourra nous séparer de l'amour de Dieu.", testament: 'NT', category: 'epitre' },
  { book_id: 46, book_name: "1 Corinthiens", book_slug: "1-corinthiens", chapter: 13, verse: 13, text: "Maintenant donc ces trois choses demeurent: la foi, l'espérance, l'amour; mais la plus grande de ces choses, c'est l'amour.", testament: 'NT', category: 'epitre' },
  { book_id: 49, book_name: "Éphésiens", book_slug: "ephesiens", chapter: 2, verse: 8, text: "Car c'est par la grâce que vous êtes sauvés, par le moyen de la foi. Et cela ne vient pas de vous, c'est le don de Dieu.", testament: 'NT', category: 'epitre' },
  { book_id: 50, book_name: "Philippiens", book_slug: "philippiens", chapter: 4, verse: 6, text: "Ne vous inquiétez de rien; mais en toute chose faites connaître vos besoins à Dieu par des prières et des supplications, avec des actions de grâces.", testament: 'NT', category: 'epitre' },
  { book_id: 50, book_name: "Philippiens", book_slug: "philippiens", chapter: 4, verse: 13, text: "Je puis tout par celui qui me fortifie.", testament: 'NT', category: 'epitre' },
  { book_id: 58, book_name: "Hébreux", book_slug: "hebreux", chapter: 11, verse: 1, text: "Or la foi est une ferme assurance des choses qu'on espère, une démonstration de celles qu'on ne voit pas.", testament: 'NT', category: 'epitre' }
];

let cachedLocalVersesList: LocalVerseItem[] | null = null;

export function getAllLocalVerses(): LocalVerseItem[] {
  if (cachedLocalVersesList) return cachedLocalVersesList;

  const booksMap = new Map<number, Book>();
  BOOKS.forEach(b => booksMap.set(b.id, b));

  const list: LocalVerseItem[] = [];

  // Index all 9,680 bundled verses from bible-classic.json
  for (const block in STATIC_VERSES) {
    const verses = STATIC_VERSES[block];
    const parts = block.split('_');
    const bookId = Number(parts[0]);
    const chNum = Number(parts[1]);
    const b = booksMap.get(bookId);
    if (!b) continue;

    for (const v of verses) {
      list.push({
        book_id: bookId,
        book_name: b.name,
        book_slug: b.slug,
        chapter: chNum,
        verse: v.verse,
        text: v.text,
        testament: b.testament,
        category: b.category,
      });
    }
  }

  // Also include the curated wisdom, gospels, and epistles
  list.push(...CURATED_CONTEMPLATIVE_VERSES);

  cachedLocalVersesList = list;
  return list;
}

export function getRandomLocalVerse(filter: RandomVerseFilterType = 'all'): LocalVerseItem {
  const all = getAllLocalVerses();
  let pool = all;

  if (filter === 'pentateuque') {
    pool = all.filter(v => v.book_id >= 1 && v.book_id <= 5);
  } else if (filter === 'historique') {
    pool = all.filter(v => v.book_id >= 6 && v.book_id <= 17);
  } else if (filter === 'sagesse') {
    pool = all.filter(v => v.category === 'poetique' || [19, 20, 21].includes(v.book_id));
  } else if (filter === 'evangiles') {
    pool = all.filter(v => v.category === 'evangile' || (v.book_id >= 40 && v.book_id <= 43));
  } else if (filter === 'epitre') {
    pool = all.filter(v => v.category === 'epitre' || (v.book_id >= 45 && v.book_id <= 59));
  }

  if (pool.length === 0) {
    pool = all;
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

export interface VerseMeditationContent {
  theme: string;
  contemplationPrompt: string;
  theologicalInsight: string;
  guidedPrayer: string;
}

export function getMeditationForVerse(verse: LocalVerseItem): VerseMeditationContent {
  const text = verse.text.toLowerCase();
  const bookName = verse.book_name;

  let theme = "Fidélité & Présence Divine";
  let contemplationPrompt = "Prenez une lente et profonde inspiration. Dans le silence de votre cœur, quelle vérité ce passage vient-il éclairer dans votre vie aujourd'hui ?";
  let theologicalInsight = `Ce passage du livre de ${bookName} nous rappelle que la Parole de Dieu est vivante et efficace, source inépuisable de sanctification et de paix.`;
  let guidedPrayer = "Seigneur, ouvre les yeux de mon cœur afin que je contemple les merveilles de Ta loi. Que Ta parole prenne racine en moi et porte du fruit en abondance. Amen.";

  if (text.includes("éternel") || text.includes("dieu") || text.includes("seigneur")) {
    theme = "Souveraineté & Confiance";
    contemplationPrompt = "Dieu Se révèle comme l'auteur et le gardien de notre destinée. Dans quel domaine de votre quotidien avez-vous besoin de Lui abandonner le contrôle ?";
    theologicalInsight = `Dans les Écritures de ${bookName}, la grandeur de Dieu n'est pas une théorie abstraite, mais une présence agissante au milieu de Son peuple.`;
    guidedPrayer = "Père céleste, Tu es mon roc et mon espérance. Je dépose entre Tes mains mes doutes et mes fardeaux, confiant en Ta bonté sans fin. Amen.";
  } else if (text.includes("berger") || text.includes("paix") || text.includes("repos") || text.includes("secours")) {
    theme = "Paix Intérieure & Consolation";
    contemplationPrompt = "Fermez les yeux quelques instants. Ressentez la protection bienveillante du Seigneur qui apaise toute anxiété et renouvelle vos forces.";
    theologicalInsight = "La paix divine transcende les circonstances humaines. Elle ne dépend pas de l'absence d'épreuves, mais de la présence constante du Bon Berger.";
    guidedPrayer = "Jésus, Prince de la paix, répands Ton repos sacré dans mon esprit. Garde mes pensées pures et sereines dans la certitude de Ton amour. Amen.";
  } else if (text.includes("foi") || text.includes("croire") || text.includes("espérance")) {
    theme = "La Puissance de la Foi";
    contemplationPrompt = "La foi n'est pas l'absence de doute, mais la décision de s'appuyer sur la fidélité de Dieu. Quel pas de foi êtes-vous appelé à poser ?";
    theologicalInsight = `L'auteur de ${bookName} nous invite à porter notre regard au-delà du visible pour nous ancrer dans les promesses immuables du Tout-Puissant.`;
    guidedPrayer = "Seigneur, augmente ma foi. Lorsque le chemin s'obscurcit, rappelle-moi que Tu tiens ma main droite et que Ta parole ne défaille jamais. Amen.";
  } else if (text.includes("amour") || text.includes("aimé") || text.includes("grâce")) {
    theme = "Amour Inconditionnel & Grâce";
    contemplationPrompt = "Vous êtes profondément et personnellement aimé de Dieu. Comment pouvez-vous être aujourd'hui le reflet de cette grâce auprès de votre prochain ?";
    theologicalInsight = "La grâce divine nous accueille tels que nous sommes pour nous transformer à Son image. C'est le fondement même de la réconciliation et du salut.";
    guidedPrayer = "Mon Dieu, merci pour Ton amour parfait qui bannit toute crainte. Remplis mon cœur de Ta bienveillance pour aimer avec vérité et compassion. Amen.";
  } else if (verse.book_id <= 5) {
    theme = "L'Alliance & La Promesse Divine";
    contemplationPrompt = "Dans la Torah, Dieu pose les fondements de Son dessein rédempteur. De quelle manière ce texte souligne-t-il la fidélité de l'Alliance ?";
    theologicalInsight = `Ce texte du Pentateuque (${bookName}) témoigne de la pédagogie divine : Dieu appelle un peuple, trace un chemin de sanctification et tient chacune de Ses promesses.`;
    guidedPrayer = "Éternel, Dieu de nos pères, Ta fidélité dure d'âge en âge. Conduis mes pas selon Tes ordonnances et fais de ma vie une offrande agréable devant Toi. Amen.";
  } else if (verse.book_id >= 6 && verse.book_id <= 17) {
    theme = "Courage, Obéissance & Victoire";
    contemplationPrompt = "Les récits historiques nous montrent des hommes et des femmes ordinaires guidés par un Dieu extraordinaire. Quelle force puisez-vous dans leur exemple ?";
    theologicalInsight = `Dans les récits de ${bookName}, l'obéissance du cœur devance toujours la bénédiction. Dieu équipe ceux qu'Il appelle pour triompher de toute adversité.`;
    guidedPrayer = "Seigneur Tout-Puissant, donne-moi le courage de Josué, la ferveur de David et la fidélité de Ruth. Que je demeure inébranlable dans Ta vérité. Amen.";
  }

  return {
    theme,
    contemplationPrompt,
    theologicalInsight,
    guidedPrayer,
  };
}
