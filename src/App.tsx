import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  doc, setDoc, getDoc, onSnapshot, collection, deleteDoc, updateDoc, writeBatch
} from 'firebase/firestore';
import { 
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, signInWithPopup, User 
} from 'firebase/auth';
import { 
  auth, db, googleProvider, handleFirestoreError, OperationType 
} from './lib/firebase';
import { 
  Verse, Book, FavoriteVerse, VerseNote, ReadingHistory, DailyVerse, EmotionAnalysisResult 
} from './types/bible';
import { 
  BOOKS, getDailyVerseForToday, querySqliteChapter, searchLocalVerses, isSqliteInitialized, initializeSqliteDatabase, fetchOnlineChapter 
} from './data/bibleData';

import { 
  BookOpen, Search, User as UserIcon, LogOut, Settings, Eye, EyeOff, AlertCircle, ChevronUp, ChevronDown, Check, X, Bookmark, Copy, Sparkles, MessageSquare, Flame, HelpCircle, ArrowRight, Share2, Plus, Play, ChevronLeft, ChevronRight, Award, Bell, Pause, Square, SkipBack, SkipForward, Volume2, VolumeX, Compass, Library, ScrollText, Music, Brain, Home, Database, Moon, Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Subcomponents import
import { TopBar } from './components/TopBar';
import { VerseItem } from './components/VerseItem';
import { StrongLexicon } from './components/StrongLexicon';
import { ReadingChallenges } from './components/ReadingChallenges';
import { StudyStatsChart } from './components/StudyStatsChart';
import { DailyReminder } from './components/DailyReminder';
import { DailyReadingGoal } from './components/DailyReadingGoal';
import { RecentlyReadChapters } from './components/RecentlyReadChapters';
import { AnalysisCard } from './components/AnalysisCard';
import { ContextSection } from './components/ContextSection';
import { VerseQuote } from './components/VerseQuote';
import { RevelationBadge } from './components/RevelationBadge';
import { cleanBibleMarkdown } from './lib/bibleFormatter';
import { SpiritualNotesManager } from './components/SpiritualNotesManager';
import { VerseComparison } from './components/VerseComparison';
import { BibleDictionary } from './components/BibleDictionary';
import { ambientMelody, MELODY_STYLES, MelodyStyle } from './utils/ambientSynth';
import { natureSounds, NATURE_SOUNDS, NatureSoundType } from './utils/natureSounds';
import { MemorizeModule } from './components/MemorizeModule';
import { ContemplativeHome } from './components/ContemplativeHome';
import { audioPurifier } from './utils/audioProcessor';
import { explainCache, CachedExplanation } from './utils/indexedDBCache';
import { playCompletionChime, triggerGoldenSparks } from './utils/soundEffects';

const LOWER_MALE_NAMES = [
  'paul', 'thomas', 'nicolas', 'daniel', 'guy', 'julien', 'bernard', 'male', 'homme', 'microsoft paul', 
  'nils', 'sébastien', 'sebastien', 'alain', 'pierre', 'michel', 'jean', 'jacques', 'philippe', 'henri', 'microsoft henri',
  'olivier', 'christophe', 'gilles', 'yves', 'luc', 'gérard', 'gerard', 'rene', 'rené', 'claude', 'andre', 'andré',
  'x-frd', 'x-frb', 'x-fri', 'vcb', 'vcd', 'vch', 'vci', 'vcj', 'vck', 'male', 'man', 'boy', 'guy'
];

const LOWER_FEMALE_NAMES = [
  'hortense', 'julie', 'aurelie', 'aurélie', 'celeste', 'céleste', 'virginie', 'helene', 'hélène', 
  'chloe', 'chloé', 'female', 'femme', 'amelie', 'amélie', 'marie', 'audrey', 'clara', 'alice', 
  'laura', 'renee', 'renée', 'lucie', 'mathilde', 'valerie', 'valérie', 'celine', 'céline', 'elise', 
  'élise', 'lea', 'léa', 'emma', 'manon', 'camille', 'zoe', 'zoé', 'sarah', 'louise', 'microsoft hortense', 
  'zira', 'google français', 'harmonie', 'samantha', 'siri', 'vca', 'vcc', 'vce', 'vcf', 'vcg'
];

export default function App() {
  // Authentication states
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState<boolean>(false);

  // User Settings 
  const [textSize, setTextSize] = useState<number>(18);
  const [themeMode, setThemeMode] = useState<'dark' | 'sepia'>('dark');
  const [autoTheme, setAutoTheme] = useState<boolean>(() => {
    try {
      return localStorage.getItem('auto_theme_enabled') === 'true';
    } catch (_) {
      return false;
    }
  });
  const [selectedTranslation, setSelectedTranslation] = useState<string>(() => {
    try {
      return localStorage.getItem('bible_translation') || 'local';
    } catch (_) {
      return 'local';
    }
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isGlobalNotifOpen, setIsGlobalNotifOpen] = useState<boolean>(false);

  // Cache stats and pre-downloading states
  const [cachedChaptersCount, setCachedChaptersCount] = useState<number>(0);
  const [preDownloadProgress, setPreDownloadProgress] = useState<{ bookName: string, chapter: number, total: number, active: boolean } | null>(null);

  // App Navigation Tabs
  // 'home' -> Dashboard, 'read' -> Bible text with interactive verse items, 'challenges' -> Reading plans & Stats, 'dictionary' -> Strong lexicon concordance, 'assistant' -> Chatbot, 'encyclopedia' -> Bible Dictionary, 'memorize' -> Memorization of verses, 'notes' -> Spiritual notes card list
  const [activeTab, setActiveTab] = useState<'home' | 'read' | 'challenges' | 'dictionary' | 'assistant' | 'encyclopedia' | 'memorize' | 'notes'>('home');

  // Local database initialization
  const [sqliteDbReady, setSqliteDbReady] = useState<boolean>(false);
  const [dbInitProgress, setDbInitProgress] = useState<number>(0);
  const [dbInitText, setDbInitText] = useState<string>('Préparation de la base de données...');

  // Reading Passage States
  const [selectedBook, setSelectedBook] = useState<Book>(BOOKS[0]); // Default to Genesis
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [chapterVerses, setChapterVerses] = useState<Verse[]>([]);
  const [loadingVerses, setLoadingVerses] = useState<boolean>(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [selectedVerseId, setSelectedVerseId] = useState<string | null>(null); // formatted as "bookId_chapter_verse"
  const [targetResumeVerseNum, setTargetResumeVerseNum] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  
  // Continuous scroll states
  const [isContinuousScroll, setIsContinuousScroll] = useState<boolean>(false);
  const [loadedChapters, setLoadedChapters] = useState<number[]>([1]);

  // AI Chapter Summary Cache state
  const [chapterSummary, setChapterSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  // AI Single Verse Explanation State
  const [activeExplainVerse, setActiveExplainVerse] = useState<Verse | null>(null);
  const [verseExplanation, setVerseExplanation] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState<boolean>(false);
  const [exegesisTab, setExegesisTab] = useState<'exegesis' | 'compare'>('exegesis');
  const [isExplanationCached, setIsExplanationCached] = useState<boolean>(false);
  const [popularExplanations, setPopularExplanations] = useState<CachedExplanation[]>([]);

  // Interactive dictionary linking state
  const [targetedStrongCode, setTargetedStrongCode] = useState<string | null>(null);

  // Chat conversation
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', content: string}[]>([
    { role: 'model', content: "Paix et joie ! Je suis votre guide théologique d'étude biblique. Comment puis-je vous accompagner dans les écritures sacrées aujourd'hui ?" }
  ]);
  const [loadingChat, setLoadingChat] = useState<boolean>(false);

  // Synced User Collections from Firestore
  const [favorites, setFavorites] = useState<FavoriteVerse[]>(() => {
    try {
      const offlineFavs = localStorage.getItem('offline_bookmarks');
      return offlineFavs ? JSON.parse(offlineFavs) : [];
    } catch (_) {
      return [];
    }
  });
  const [notes, setNotes] = useState<VerseNote[]>([]);
  const [readingHistory, setReadingHistory] = useState<ReadingHistory[]>([]);

  // Daily Verse of the Day
  const dailyVerseForCurrentDay: DailyVerse = getDailyVerseForToday();

  // Handle local database initialization on mount
  useEffect(() => {
    if (isSqliteInitialized()) {
      setSqliteDbReady(true);
    } else {
      initializeSqliteDatabase((progress, text) => {
        setDbInitProgress(progress);
        setDbInitText(text);
      }).then(() => {
        setSqliteDbReady(true);
      });
    }
  }, []);

  const refreshPopularExplanations = async () => {
    try {
      const popular = await explainCache.getMostPopular(8);
      setPopularExplanations(popular);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshCacheStats = async () => {
    try {
      const stats = await explainCache.getVersesCacheStats();
      setCachedChaptersCount(stats.count);
    } catch (e) {
      console.error("Error refreshing cache stats:", e);
    }
  };

  const handlePreDownloadBooks = async (bookIds: number[]) => {
    if (preDownloadProgress?.active) return;
    
    // We want to fetch all chapters for selected books
    const booksToDownload = BOOKS.filter(b => bookIds.includes(b.id));
    if (booksToDownload.length === 0) return;

    // Calculate total chapters
    let totalChapters = 0;
    booksToDownload.forEach(b => {
      totalChapters += b.chapters_count;
    });

    setPreDownloadProgress({
      bookName: "Début...",
      chapter: 0,
      total: totalChapters,
      active: true
    });

    let downloadedCount = 0;

    for (const bk of booksToDownload) {
      for (let ch = 1; ch <= bk.chapters_count; ch++) {
        // Update progress status
        setPreDownloadProgress({
          bookName: bk.name,
          chapter: ch,
          total: totalChapters,
          active: true
        });

        const cacheKey = `${selectedTranslation}_${bk.id}_${ch}`;
        
        try {
          // Check if already in IndexedDB to avoid unnecessary queries
          const cached = await explainCache.getVerses(cacheKey);
          if (!cached || cached.length === 0) {
            let verses: Verse[] = [];
            if (selectedTranslation === 'local') {
              const isPreloaded = (bk.id === 1 && (ch === 1 || ch === 2)) || 
                                  (bk.id === 19 && ch === 23);
              if (isPreloaded) {
                verses = querySqliteChapter(bk.id, bk.name, ch) || [];
              } else {
                try {
                  const response = await fetch('/api/gemini/fetch-verses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bookName: bk.name, chapterNum: ch })
                  });
                  if (response.ok) {
                    const data = await response.json();
                    if (data && data.verses && Array.isArray(data.verses)) {
                      verses = data.verses.map((v: any) => ({
                        book_id: bk.id,
                        book_name: bk.name,
                        chapter: ch,
                        verse: v.verse,
                        text: v.text
                      }));
                    }
                  }
                } catch (e) {
                  console.warn(e);
                }
              }
            } else {
              try {
                verses = await fetchOnlineChapter(bk.id, bk.name, ch, selectedTranslation);
              } catch (e) {
                console.warn(e);
              }
            }

            if (verses && verses.length > 0) {
              await explainCache.setVerses(cacheKey, bk.id, ch, selectedTranslation, verses);
            }
          }
        } catch (err) {
          console.warn(`Pre-download failed for ${bk.name} ${ch}:`, err);
        }

        downloadedCount++;
        // Smooth UI update
        await new Promise(resolve => setTimeout(resolve, 80)); 
      }
    }

    setPreDownloadProgress(null);
    refreshCacheStats();

    try {
      audioPurifier.playTestChime();
    } catch (e) {}
  };

  useEffect(() => {
    if (isSettingsOpen) {
      refreshCacheStats();
    }
  }, [isSettingsOpen]);

  const [localDailyGoal, setLocalDailyGoal] = useState<number>(3);
  const [dailyTimeGoal, setDailyTimeGoal] = useState<number>(15); // in minutes
  const [goalType, setGoalType] = useState<'chapters' | 'time'>('chapters');
  const [readingTimeToday, setReadingTimeToday] = useState<number>(0); // in seconds

  useEffect(() => {
    const savedGoal = localStorage.getItem('bible_daily_goal');
    if (savedGoal) {
      setLocalDailyGoal(parseInt(savedGoal, 10) || 3);
    }
    const savedTimeGoal = localStorage.getItem('bible_daily_goal_time');
    if (savedTimeGoal) {
      setDailyTimeGoal(parseInt(savedTimeGoal, 10) || 15);
    }
    const savedGoalType = localStorage.getItem('bible_daily_goal_type') as 'chapters' | 'time' | null;
    if (savedGoalType) {
      setGoalType(savedGoalType);
    }
  }, [readingHistory, activeTab]);

  // Load reading durations on mount & tab switches
  useEffect(() => {
    const todayStr = new Date().toDateString();
    const savedDurations = localStorage.getItem('bible_reading_durations_by_day');
    if (savedDurations) {
      try {
        const durations = JSON.parse(savedDurations);
        if (durations[todayStr]) {
          setReadingTimeToday(durations[todayStr]);
        }
      } catch (e) {}
    }
  }, [activeTab]);

  // Timer effect to automatically track seconds spent on reading tab
  useEffect(() => {
    if (activeTab !== 'read') return;

    const interval = setInterval(() => {
      setReadingTimeToday((prev) => {
        const nextTime = prev + 1;
        
        // Save to localStorage
        const todayStr = new Date().toDateString();
        let durations: Record<string, number> = {};
        const savedDurations = localStorage.getItem('bible_reading_durations_by_day');
        if (savedDurations) {
          try {
            durations = JSON.parse(savedDurations);
          } catch (e) {}
        }
        durations[todayStr] = nextTime;
        localStorage.setItem('bible_reading_durations_by_day', JSON.stringify(durations));

        return nextTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const todayStrStr = new Date().toDateString();
  const todayReadingsCount = readingHistory.filter(h => {
    if (!h.timestamp) return false;
    try {
      return new Date(h.timestamp).toDateString() === todayStrStr;
    } catch (e) {
      return false;
    }
  }).length;

  const goalPercent = goalType === 'chapters'
    ? Math.min(100, Math.round((todayReadingsCount / localDailyGoal) * 100))
    : Math.min(100, Math.round(((readingTimeToday / 60) / dailyTimeGoal) * 100));

  // Computed last read verse ID from reading history
  const latestHistoryRecord = useMemo(() => {
    if (!readingHistory || readingHistory.length === 0) return null;
    return [...readingHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  }, [readingHistory]);

  const currentChapterHistoryRecord = useMemo(() => {
    if (!readingHistory || !selectedBook) return null;
    return readingHistory.find(h => h.book_id === selectedBook.id && h.chapter === selectedChapter);
  }, [readingHistory, selectedBook, selectedChapter]);

  const lastReadVerseId = latestHistoryRecord && latestHistoryRecord.last_verse
    ? `${latestHistoryRecord.book_id}_${latestHistoryRecord.chapter}_${latestHistoryRecord.last_verse}`
    : null;

  // Computed streak for ContemplativeHome and others
  const currentStreak = useMemo(() => {
    let streak = 0;
    const readsByDate: Record<string, boolean> = {};
    
    readingHistory.forEach(item => {
      try {
        const dateObj = new Date(item.timestamp);
        if (!isNaN(dateObj.getTime())) {
          const dateStr = dateObj.toLocaleDateString('fr-FR');
          readsByDate[dateStr] = true;
        }
      } catch (e) {}
    });

    const d = new Date();
    // Check back daily starting today
    while (true) {
      const dateStr = d.toLocaleDateString('fr-FR');
      if (readsByDate[dateStr]) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        // If streak is 0, let's also check yesterday just in case they didn't read today yet
        if (streak === 0) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toLocaleDateString('fr-FR');
          if (readsByDate[yesterdayStr]) {
            streak++;
            yesterday.setDate(yesterday.getDate() - 1);
            let checkD = yesterday;
            while (true) {
              const checkStr = checkD.toLocaleDateString('fr-FR');
              if (readsByDate[checkStr]) {
                streak++;
                checkD.setDate(checkD.getDate() - 1);
              } else {
                break;
              }
            }
          }
        }
        break;
      }
    }
    return streak;
  }, [readingHistory]);

  useEffect(() => {
    refreshPopularExplanations();
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      
      if (firebaseUser) {
        setAuthError(null);
        try {
          const offlineFavs = localStorage.getItem('offline_bookmarks');
          if (offlineFavs) {
            setFavorites(JSON.parse(offlineFavs));
          }
        } catch (_) {}
        setupUserSnapshotListeners(firebaseUser.uid);
      } else {
        try {
          const offlineFavs = localStorage.getItem('offline_bookmarks');
          setFavorites(offlineFavs ? JSON.parse(offlineFavs) : []);
        } catch (e) {
          setFavorites([]);
        }

        try {
          const offlineNotes = localStorage.getItem('offline_notes');
          setNotes(offlineNotes ? JSON.parse(offlineNotes) : []);
        } catch (e) {
          setNotes([]);
        }

        try {
          const offlineHistory = localStorage.getItem('offline_reading_history');
          if (offlineHistory) {
            setReadingHistory(JSON.parse(offlineHistory));
          } else {
            setReadingHistory([]);
          }
        } catch (e) {
          setReadingHistory([]);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync state variables with current theme preference
  useEffect(() => {
    if (themeMode === 'sepia') {
      document.documentElement.classList.add('theme-sepia');
      document.body.classList.add('theme-sepia');
    } else {
      document.documentElement.classList.remove('theme-sepia');
      document.body.classList.remove('theme-sepia');
    }
  }, [themeMode]);

  // Automatic theme switching based on local time
  useEffect(() => {
    if (!autoTheme) return;

    const checkAndApplyTheme = () => {
      const hour = new Date().getHours();
      // Day (7h00 to 18h59) -> sepia, Night (19h00 to 6h59) -> dark
      const targetTheme = (hour >= 7 && hour < 19) ? 'sepia' : 'dark';
      if (themeMode !== targetTheme) {
        setThemeMode(targetTheme);
      }
    };

    // Check immediately
    checkAndApplyTheme();

    // Check periodically (every minute)
    const interval = setInterval(checkAndApplyTheme, 60000);
    return () => clearInterval(interval);
  }, [autoTheme, themeMode]);

  // In-memory cache to store fetched chapters and speed up navigation/continuous scroll massively
  const versesCache = useRef<Record<string, Promise<Verse[]> | Verse[]>>({});

  // Helper to load a single chapter with in-memory cache
  const loadSingleChapterVerses = (chapterNum: number): Promise<Verse[]> => {
    const cacheKey = `${selectedTranslation}_${selectedBook.id}_${chapterNum}`;
    
    // If we have a cached value (promise or array), return it
    if (versesCache.current[cacheKey]) {
      const cached = versesCache.current[cacheKey];
      if (Array.isArray(cached)) {
        return Promise.resolve(cached);
      }
      return cached;
    }

    const fetchPromise = (async (): Promise<Verse[]> => {
      try {
        setLoadingError(null);
        // --- CHECK INDEXEDDB OFFLINE VERSES CACHE FIRST ---
        const dbCached = await explainCache.getVerses(cacheKey);
        if (dbCached && Array.isArray(dbCached) && dbCached.length > 0) {
          return dbCached;
        }

        let verses: Verse[] = [];
        if (selectedTranslation === 'local') {
          const res = querySqliteChapter(selectedBook.id, selectedBook.name, chapterNum);
          if (res !== null) {
            verses = res;
          } else {
            try {
              const response = await fetch('/api/gemini/fetch-verses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookName: selectedBook.name, chapterNum: chapterNum })
              });
              if (!response.ok) {
                throw new Error("HTTP error " + response.status);
              }
              const data = await response.json();
              if (data && data.verses && Array.isArray(data.verses) && data.verses.length > 0) {
                verses = data.verses.map((v: any) => ({
                  book_id: selectedBook.id,
                  book_name: selectedBook.name,
                  chapter: chapterNum,
                  verse: v.verse,
                  text: v.text
                }));
              } else {
                throw new Error("Format de réponse invalide.");
              }
            } catch (err) {
              console.warn("API dynamic verses fetch failed, trying online backup API:", err);
              const fallbackRes = querySqliteChapter(selectedBook.id, selectedBook.name, chapterNum);
              if (fallbackRes !== null) {
                verses = fallbackRes;
              } else {
                try {
                  verses = await fetchOnlineChapter(selectedBook.id, selectedBook.name, chapterNum, 'web');
                } catch (onlineErr) {
                  console.error("All verse retrieval attempts failed:", onlineErr);
                  setLoadingError("Texte indisponible");
                  return [];
                }
              }
            }
          }
        } else {
          verses = await fetchOnlineChapter(selectedBook.id, selectedBook.name, chapterNum, selectedTranslation);
        }

        // --- SAVE TO INDEXEDDB OFFLINE CACHE FOR DURABLE OFFLINE RETRIEVAL ---
        if (verses && verses.length > 0) {
          await explainCache.setVerses(cacheKey, selectedBook.id, chapterNum, selectedTranslation, verses);
        }
        return verses;
      } catch (err) {
        console.warn("Failed to load scriptures, using offline fallback:", err);
        const fallbackRes = querySqliteChapter(selectedBook.id, selectedBook.name, chapterNum);
        if (fallbackRes !== null) {
          return fallbackRes;
        } else {
          setLoadingError("Texte indisponible");
          return [];
        }
      }
    })();

    // Store the promise in cache
    versesCache.current[cacheKey] = fetchPromise;

    // Replace with resolved array once done
    fetchPromise.then(v => {
      versesCache.current[cacheKey] = v;
    }).catch(() => {
      delete versesCache.current[cacheKey];
    });

    return fetchPromise;
  };

  // Synchronize loadedChapters state on book or chapter transitions
  useEffect(() => {
    setLoadedChapters([selectedChapter]);
  }, [selectedBook, selectedChapter]);

  // Load and cache chapter verses on Book, Chapter, Mode, or scroll page changes
  useEffect(() => {
    if (!sqliteDbReady) return;
    
    let active = true;
    setLoadingVerses(true);
    setSelectedVerseId(null);
    setChapterSummary(null); // Clear active summary cache
    
    // Quick synchronous check to see if everything in loadedChapters is already fully loaded in cache
    const allCachedAndArray = loadedChapters.every(ch => {
      const key = `${selectedTranslation}_${selectedBook.id}_${ch}`;
      return Array.isArray(versesCache.current[key]);
    });

    // If completely cached in memory as resolved arrays, skip showing active loading spinners
    if (allCachedAndArray) {
      const allVerses: Verse[] = [];
      loadedChapters.forEach(ch => {
        const key = `${selectedTranslation}_${selectedBook.id}_ch_${ch}`;
        const keyAlt = `${selectedTranslation}_${selectedBook.id}_${ch}`;
        const cached = (versesCache.current[keyAlt] || versesCache.current[key]) as Verse[];
        if (cached) {
          allVerses.push(...cached);
        }
      });
      if (allVerses.length > 0) {
        setChapterVerses(allVerses);
        setLoadingVerses(false);
      }
    }

    const loadVerses = async () => {
      try {
        if (isContinuousScroll) {
          // Load all chapters currently in loadedChapters list
          const allVersesPromises = loadedChapters.map(ch => loadSingleChapterVerses(ch));
          const allChaptersVersesArrays = await Promise.all(allVersesPromises);
          
          // Concatenate them all in original numeric order
          const merged = allChaptersVersesArrays.flat();
          if (active) {
            setChapterVerses(merged);
          }
        } else {
          // Standard single chapter load
          const verses = await loadSingleChapterVerses(selectedChapter);
          if (active) {
            setChapterVerses(verses);
          }
        }
      } catch (err) {
        console.error("Critical loader issue:", err);
      } finally {
        if (active) setLoadingVerses(false);
      }
    };

    loadVerses();

    return () => {
      active = false;
    };
  }, [selectedBook, selectedChapter, sqliteDbReady, selectedTranslation, isContinuousScroll, loadedChapters]);

  // Background Prefetching: predictively loads the next 2 chapters to make scrolling and clicking completely instant
  useEffect(() => {
    if (!sqliteDbReady) return;

    const prefetchAhead = async () => {
      const currentHighest = isContinuousScroll ? Math.max(...loadedChapters) : selectedChapter;
      
      // Prefetch the next 2 chapters silently in the background
      for (let offset = 1; offset <= 2; offset++) {
        const targetChapter = currentHighest + offset;
        if (targetChapter <= selectedBook.chapters_count) {
          loadSingleChapterVerses(targetChapter).catch(() => {});
        }
      }
    };

    // Delay background activity slightly to let key UI rendering finish first
    const timer = setTimeout(() => {
      prefetchAhead();
    }, 800);

    return () => clearTimeout(timer);
  }, [selectedBook, selectedChapter, loadedChapters, isContinuousScroll, sqliteDbReady, selectedTranslation]);

  // Infinite Scroll Trigger via IntersectionObserver
  useEffect(() => {
    if (!isContinuousScroll) return;
    
    const trigger = document.getElementById('continuous-scroll-trigger');
    if (!trigger) return;

    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting) {
        const maxCh = Math.max(...loadedChapters);
        if (maxCh < selectedBook.chapters_count) {
          setLoadedChapters(prev => {
            if (prev.includes(maxCh + 1)) return prev;
            return [...prev, maxCh + 1];
          });
        }
      }
    }, {
      rootMargin: '250px', // trigger 250px before screen bottom
    });

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [isContinuousScroll, loadedChapters, selectedBook]);

  // Read subcollections reactively from Firestore
  const setupUserSnapshotListeners = (uid: string) => {
    // 1. Favorite Bookmarks
    const bookmarksRef = collection(db, 'users', uid, 'bookmarks');
    const unsubscribeBookmarks = onSnapshot(bookmarksRef, (snapshot) => {
      const favList: FavoriteVerse[] = [];
      snapshot.forEach((docSnap) => {
        favList.push(docSnap.data() as FavoriteVerse);
      });
      setFavorites(favList);
      try {
        localStorage.setItem('offline_bookmarks', JSON.stringify(favList));
      } catch (e) {
        console.error("Error backing up online bookmarks to localStorage:", e);
      }
    }, (error) => {
      console.error("Bookmarks sync error:", error);
    });

    // 2. Spiritual Verse Study Notes
    const notesRef = collection(db, 'users', uid, 'notes');
    const unsubscribeNotes = onSnapshot(notesRef, (snapshot) => {
      const notesList: VerseNote[] = [];
      snapshot.forEach((docSnap) => {
        notesList.push(docSnap.data() as VerseNote);
      });
      setNotes(notesList);
    }, (error) => {
      console.error("Notes sync error:", error);
    });

    // 3. User Chapter Reading History Logs
    const historyRef = collection(db, 'users', uid, 'history');
    const unsubscribeHistory = onSnapshot(historyRef, (snapshot) => {
      const historyList: ReadingHistory[] = [];
      snapshot.forEach((docSnap) => {
        historyList.push(docSnap.data() as ReadingHistory);
      });
      setReadingHistory(historyList);
    }, (error) => {
      console.error("Reading history sync:", error);
    });

    return () => {
      unsubscribeBookmarks();
      unsubscribeNotes();
      unsubscribeHistory();
    };
  };

  // Auth Submit Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!email || !password) {
      setAuthError("S'il vous plaît, fournissez un email et un mot de passe.");
      return;
    }

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: displayName || "Pèlerin de Foi"
        });
        
        // Setup default user profile document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: email,
          displayName: displayName || "Pèlerin de Foi",
          createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error(err);
      let errorFriendly = "Une erreur s'est produite lors de l'authentification.";
      if (err.code === 'auth/user-not-found') errorFriendly = "Aucun compte trouvé avec cet email.";
      else if (err.code === 'auth/wrong-password') errorFriendly = "Mot de passe de compte incorrect.";
      else if (err.code === 'auth/email-already-in-use') errorFriendly = "Cet email est déjà lié à un compte existant.";
      else if (err.code === 'auth/weak-password') errorFriendly = "Votre mot de passe doit faire au moins 6 caractères.";
      setAuthError(errorFriendly);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isGoogleSigningIn) return;
    setAuthError(null);
    setIsGoogleSigningIn(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        // Init profile document if not existing
        const userDocRef = doc(db, 'users', result.user.uid);
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
          await setDoc(userDocRef, {
            uid: result.user.uid,
            email: result.user.email || '',
            displayName: result.user.displayName || "Pèlerin de Foi",
            createdAt: new Date().toISOString()
          });
        }
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/cancelled-popup-request' ||
        err?.code === 'auth/popup-closed-by-user'
      ) {
        console.warn("Google sign-in popup cancelled or closed by user:", err?.code);
        // User closed or cancelled the popup - do not set an aggressive error message
      } else if (err?.code === 'auth/popup-blocked') {
        setAuthError("La fenêtre surgissante Google a été bloquée par votre navigateur. Veuillez autoriser les popups.");
      } else {
        console.error("Google Sign-In Error:", err);
        setAuthError("Connexion avec l'authentification Google impossible. Veuillez réessayer.");
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Signout error:", err);
    }
  };

  // Navigating chapter index helpers
  const handleNextChapter = () => {
    if (selectedChapter < selectedBook.chapters_count) {
      setSelectedChapter(selectedChapter + 1);
    } else {
      // Go to next book
      const currentIdx = BOOKS.findIndex(b => b.id === selectedBook.id);
      if (currentIdx < BOOKS.length - 1) {
        setSelectedBook(BOOKS[currentIdx + 1]);
        setSelectedChapter(1);
      }
    }
  };

  const handlePreviousChapter = () => {
    if (selectedChapter > 1) {
      setSelectedChapter(selectedChapter - 1);
    } else {
      // Go to prev book
      const currentIdx = BOOKS.findIndex(b => b.id === selectedBook.id);
      if (currentIdx > 0) {
        const prevBook = BOOKS[currentIdx - 1];
        setSelectedBook(prevBook);
        setSelectedChapter(prevBook.chapters_count);
      }
    }
  };

  // Synchronize reading log state, marking current chapter as completed or toggling status
  const markCurrentChapterRead = async (onlyMarkRead: boolean = false, targetEl?: HTMLElement | null) => {
    const existing = readingHistory.find(
      h => h.book_id === selectedBook.id && h.chapter === selectedChapter
    );
    const isAlreadyCompleted = existing?.status === 'complete' || (existing && existing.last_verse && existing.total_verses && existing.last_verse >= existing.total_verses);

    if (onlyMarkRead && isAlreadyCompleted) {
      return;
    }

    const totalVerses = chapterVerses.length || existing?.total_verses || 1;

    if (isAlreadyCompleted) {
      updateChapterProgress(selectedBook.id, selectedBook.name, selectedChapter, existing?.last_verse || 1, totalVerses, 'en_cours');
    } else {
      updateChapterProgress(selectedBook.id, selectedBook.name, selectedChapter, totalVerses, totalVerses, 'complete');
      playCompletionChime();
      triggerGoldenSparks(targetEl);
    }
  };

  // Bookmark toggling helper
  const handleToggleFavorite = async (verse: Verse) => {
    const favorited = favorites.some(
      f => f.book_id === verse.book_id && f.chapter === verse.chapter && f.verse === verse.verse
    );

    // Compute and persist to local state/storage first for blazing-fast and reliable offline performance
    let nextFavs: FavoriteVerse[];
    if (favorited) {
      nextFavs = favorites.filter(
        f => !(f.book_id === verse.book_id && f.chapter === verse.chapter && f.verse === verse.verse)
      );
    } else {
      const favoriteItem: FavoriteVerse = {
        book_id: verse.book_id,
        book_name: verse.book_name,
        chapter: verse.chapter,
        verse: verse.verse,
        text: verse.text,
        added_at: new Date().toISOString()
      };
      nextFavs = [...favorites, favoriteItem];
    }

    setFavorites(nextFavs);
    try {
      localStorage.setItem('offline_bookmarks', JSON.stringify(nextFavs));
    } catch (e) {
      console.error("Could not write offline bookmarks:", e);
    }

    // Synchronize to Firestore for authenticated users when connection is available
    if (user) {
      const docId = `${verse.book_id}_${verse.chapter}_${verse.verse}`;
      try {
        const docRef = doc(db, 'users', user.uid, 'bookmarks', docId);
        if (favorited) {
          await deleteDoc(docRef);
        } else {
          const favoriteItem: FavoriteVerse = {
            book_id: verse.book_id,
            book_name: verse.book_name,
            chapter: verse.chapter,
            verse: verse.verse,
            text: verse.text,
            added_at: new Date().toISOString()
          };
          await setDoc(docRef, favoriteItem);
        }
      } catch (error) {
        console.error("Could not sync favorite status to Cloud Firestore:", error);
        handleFirestoreError(error, favorited ? OperationType.DELETE : OperationType.WRITE, `users/${user.uid}/bookmarks/${docId}`);
      }
    }
  };

  // Save Verse Note helper
  const handleSaveSpiritualNote = async (verse: Verse, textNote: string, audioBase64?: string, emotionAnalysis?: EmotionAnalysisResult) => {
    const existingNote = notes.find(n => n.book_id === verse.book_id && n.chapter === verse.chapter && n.verse === verse.verse);
    let targetAudio = existingNote?.audio;

    if (audioBase64 === '') {
      targetAudio = undefined;
    } else if (audioBase64) {
      targetAudio = audioBase64;
    }

    const isDelete = textNote.trim() === '' && !targetAudio;

    if (user) {
      const docId = `${verse.book_id}_${verse.chapter}_${verse.verse}`;
      const docRef = doc(db, 'users', user.uid, 'notes', docId);

      try {
        if (isDelete) {
          await deleteDoc(docRef);
        } else {
          const noteItem: VerseNote = {
            book_id: verse.book_id,
            book_name: verse.book_name,
            chapter: verse.chapter,
            verse: verse.verse,
            note: textNote,
            updated_at: new Date().toISOString()
          };
          if (targetAudio) {
            noteItem.audio = targetAudio;
          }
          if (emotionAnalysis) {
            noteItem.emotion_analysis = emotionAnalysis;
          } else if (existingNote?.emotion_analysis) {
            noteItem.emotion_analysis = existingNote.emotion_analysis;
          }
          await setDoc(docRef, noteItem);
        }
      } catch (error) {
        console.error("Could not save note:", error);
      }
    } else {
      // Offline mode
      let nextNotes;
      if (isDelete) {
        nextNotes = notes.filter(n => !(n.book_id === verse.book_id && n.chapter === verse.chapter && n.verse === verse.verse));
      } else {
        const noteItem: VerseNote = {
          book_id: verse.book_id,
          book_name: verse.book_name,
          chapter: verse.chapter,
          verse: verse.verse,
          note: textNote,
          updated_at: new Date().toISOString()
        };
        if (targetAudio) {
          noteItem.audio = targetAudio;
        }
        if (emotionAnalysis) {
          noteItem.emotion_analysis = emotionAnalysis;
        } else if (existingNote?.emotion_analysis) {
          noteItem.emotion_analysis = existingNote.emotion_analysis;
        }
        
        if (existingNote) {
          nextNotes = notes.map(n => (n.book_id === verse.book_id && n.chapter === verse.chapter && n.verse === verse.verse) ? noteItem : n);
        } else {
          nextNotes = [...notes, noteItem];
        }
      }
      setNotes(nextNotes);
      localStorage.setItem('offline_notes', JSON.stringify(nextNotes));
    }
  };

  // Single Verse Explain via AI exegesis endpoint
  const handleExplainVerse = async (verse: Verse, tab: 'exegesis' | 'compare' = 'exegesis') => {
    setActiveExplainVerse(verse);
    setExegesisTab(tab);
    setVerseExplanation(null);
    setLoadingExplanation(true);
    setIsExplanationCached(false);
    
    const cacheKey = `verse:${verse.book_name}:${verse.chapter}:${verse.verse}:${tab}`;
    const referenceStr = `${verse.book_name} ${verse.chapter}:${verse.verse}`;
    
    // Check IndexedDB cache first
    try {
      const cached = await explainCache.get(cacheKey);
      if (cached) {
        setVerseExplanation(cached.content);
        setIsExplanationCached(true);
        setLoadingExplanation(false);
        refreshPopularExplanations();
        return;
      }
    } catch (cacheErr) {
      console.warn("Error looking up explanation cache:", cacheErr);
    }
    
    try {
      const response = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verseText: verse.text,
          reference: referenceStr,
          bookName: verse.book_name
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de joindre l'interlocuteur d'étude.");
      
      const explanationResult = data.explanation || "Exégèse non générée par le modèle théologique.";
      setVerseExplanation(explanationResult);

      // Save to IndexedDB Cache
      try {
        await explainCache.set(cacheKey, 'verse', referenceStr, explanationResult, { tab });
        refreshPopularExplanations();
      } catch (saveErr) {
        console.warn("Failed to save explanation cache:", saveErr);
      }
    } catch (err: any) {
      console.error("Bible Explanation query fails:", err);
      // Try to fallback to alternate cached view if any
      try {
        const altTab = tab === 'exegesis' ? 'compare' : 'exegesis';
        const altCacheKey = `verse:${verse.book_name}:${verse.chapter}:${verse.verse}:${altTab}`;
        const altCached = await explainCache.get(altCacheKey);
        if (altCached) {
          setVerseExplanation(altCached.content + "\n\n*(Note : Affiché depuis le cache local car la connexion réseau a échoué)*");
          setIsExplanationCached(true);
          return;
        }
      } catch (_) {}
      
      setVerseExplanation(`Échec d'exégèse : ${err.message || 'Problème de connexion réseau.'}\n\n*Conseil : l'étude en ligne requiert une connexion internet active.*`);
    } finally {
      setLoadingExplanation(false);
    }
  };

  // Chapter Summary trigger via Gemini API
  const handleSummarizeChapter = async () => {
    setLoadingSummary(true);
    setChapterSummary(null);

    const cacheKey = `chapter:${selectedBook.name}:${selectedChapter}`;
    const referenceStr = `${selectedBook.name} ${selectedChapter}`;

    // Check IndexedDB Cache first
    try {
      const cached = await explainCache.get(cacheKey);
      if (cached) {
        setChapterSummary(cached.content);
        setLoadingSummary(false);
        refreshPopularExplanations();
        markCurrentChapterRead();
        return;
      }
    } catch (cacheErr) {
      console.warn("Error looking up chapter summary cache:", cacheErr);
    }

    try {
      // Format current chapter payload
      const formattedVerses = chapterVerses.map(v => ({
        verse: v.verse,
        text: v.text
      }));

      const response = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookName: selectedBook.name,
          chapterNum: selectedChapter,
          verses: formattedVerses
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur réseau.");

      const summaryResult = data.summary || "Aucun résumé n'a pu être structuré.";
      setChapterSummary(summaryResult);

      // Save to IndexedDB Cache
      try {
        await explainCache.set(cacheKey, 'chapter', referenceStr, summaryResult);
        refreshPopularExplanations();
      } catch (saveErr) {
        console.warn("Failed to write chapter summary cache:", saveErr);
      }

      // Auto log progress of study when summarized
      markCurrentChapterRead();
    } catch (err: any) {
      console.error("Summary failed:", err);
      setChapterSummary(`Impossible de résumer le chapitre de ${selectedBook.name}: ` + (err.message || "Problème d'API."));
    } finally {
      setLoadingSummary(false);
    }
  };

  // Strong code interactive selection callback
  const handleStrongSelectionCode = (code: string) => {
    setTargetedStrongCode(code);
    setActiveTab('dictionary'); // Quick redirect to Lexicon Lookup Tab
  };

  // Loads offline cached explanation into active UI views
  const handleLoadCachedExplanation = (cacheItem: CachedExplanation) => {
    const parts = cacheItem.key.split(':');
    const isVerse = cacheItem.type === 'verse';

    if (isVerse) {
      const bookName = parts[1] || cacheItem.reference.split(' ')[0];
      const chapter = parseInt(parts[2]) || 1;
      const verseNum = parseInt(parts[3]) || 1;
      const tab = (parts[4] as 'exegesis' | 'compare') || 'exegesis';

      const reconstitutedVerse: any = {
        book_id: cacheItem.metadata?.book_id || 1,
        book_name: bookName,
        chapter: chapter,
        verse: verseNum,
        text: cacheItem.metadata?.verseText || `Étude sauvegardée de ${cacheItem.reference}`
      };

      // Set book and chapter safely so background is synced
      const foundBook = BOOKS.find(b => b.name === bookName);
      if (foundBook) {
        setSelectedBook(foundBook);
        setSelectedChapter(chapter);
        setSelectedVerseId(`${foundBook.id}_${chapter}_${verseNum}`);
      }

      setActiveExplainVerse(reconstitutedVerse);
      setExegesisTab(tab);
      setVerseExplanation(cacheItem.content);
      setIsExplanationCached(true);
      setActiveTab('read'); // assure they are in the reader
    } else {
      // It's a chapter summary!
      const bookName = parts[1] || '';
      const chapterNum = parseInt(parts[2]) || 1;

      const foundBook = BOOKS.find(b => b.name === bookName);
      if (foundBook) {
        setSelectedBook(foundBook);
        setSelectedChapter(chapterNum);
        setActiveTab('read');
        setChapterSummary(cacheItem.content);
        
        // Open summary section or scroll to summary
        setTimeout(() => {
          const summaryElement = document.getElementById('chapter-summary-panel');
          if (summaryElement) {
            summaryElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 300);
      }
    }
    
    // Update popularity counters locally
    refreshPopularExplanations();
  };

  // Web Speech API Text-to-Speech (TTS) Integration
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentSpeakingVerseIndex, setCurrentSpeakingVerseIndex] = useState<number>(-1);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [ttsLogs, setTtsLogs] = useState<string[]>([]);

  const logTts = (msg: string, type: 'log' | 'warn' | 'error' = 'log') => {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] ${msg}`;
    if (type === 'error') {
      console.error(msg);
    } else if (type === 'warn') {
      console.warn(msg);
    } else {
      console.log(msg);
    }
    setTtsLogs(prev => {
      // Keep at most 80 logs to avoid memory bloat
      const next = [formatted, ...prev];
      if (next.length > 80) {
        return next.slice(0, 80);
      }
      return next;
    });
  };
  const [ttsEngineState, setTtsEngineState] = useState<{
    speaking: boolean;
    paused: boolean;
    pending: boolean;
    wakeLockActive: boolean;
    activeUtteranceCount: number;
  }>({
    speaking: false,
    paused: false,
    pending: false,
    wakeLockActive: false,
    activeUtteranceCount: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateTtsState = () => {
      const synth = window.speechSynthesis;
      if (synth) {
        setTtsEngineState({
          speaking: synth.speaking,
          paused: synth.paused,
          pending: synth.pending,
          wakeLockActive: !!wakeLockRef.current,
          activeUtteranceCount: (window as any)._activeUtterances ? (window as any)._activeUtterances.length : 0,
        });
      }
    };

    updateTtsState();
    const interval = setInterval(updateTtsState, 500);

    return () => clearInterval(interval);
  }, []);
  const [voicePitch, setVoicePitch] = useState<number>(() => {
    try {
      const p = localStorage.getItem('bible_voice_pitch');
      return p ? Number(p) : 1.0;
    } catch (_) {
      return 1.0;
    }
  });
  const [voiceVolume, setVoiceVolume] = useState<number>(() => {
    try {
      const v = localStorage.getItem('bible_voice_volume');
      return v ? Number(v) : 1.0;
    } catch (_) {
      return 1.0;
    }
  });
  const [voiceGender, setVoiceGender] = useState<'auto' | 'male' | 'female'>(() => {
    try {
      const g = localStorage.getItem('bible_voice_gender');
      return (g as 'auto' | 'male' | 'female') || 'auto';
    } catch (_) {
      return 'auto';
    }
  });
  const [autoAdvanceChapterSpeech, setAutoAdvanceChapterSpeech] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bible_auto_advance_speech') !== 'false';
    } catch (_) {
      return true;
    }
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => {
    try {
      return localStorage.getItem('bible_preferred_voice_uri') || '';
    } catch (_) {
      return '';
    }
  });

  const [isZenMode, setIsZenMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bible_zen_mode') === 'true';
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bible_zen_mode', String(isZenMode));
    } catch (_) {}
  }, [isZenMode]);

  const [isRawReading, setIsRawReading] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bible_raw_reading') === 'true';
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('bible_raw_reading', String(isRawReading));
    } catch (_) {}
  }, [isRawReading]);

  // Load and listen to the exhaustive list of French voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      
      if (isRawReading) {
        // Raw Reading bypasses all filtering and sorting: return everything natively
        setAvailableVoices(voices);
        return;
      }

      // Filter voices for French lang
      const frVoices = voices.filter(v => v.lang.startsWith('fr') || v.lang.includes('FR'));
      
      const priorityMaleKeywords = ['male', 'homme', 'paul', 'nicolas'];
      
      // Sort French voices: prioritize explicit masculine, then general male, then premium/high quality
      const sortedFrVoices = [...frVoices].sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        // 1. Explicitly marked masculine voices
        const aHasPriorityMale = priorityMaleKeywords.some(keyword => aName.includes(keyword));
        const bHasPriorityMale = priorityMaleKeywords.some(keyword => bName.includes(keyword));
        
        if (aHasPriorityMale && !bHasPriorityMale) return -1;
        if (!aHasPriorityMale && bHasPriorityMale) return 1;
        
        // 2. Other male voices
        const aIsMale = LOWER_MALE_NAMES.some(name => aName.includes(name));
        const bIsMale = LOWER_MALE_NAMES.some(name => bName.includes(name));
        
        if (aIsMale && !bIsMale) return -1;
        if (!aIsMale && bIsMale) return 1;
        
        // 3. Premium/High fidelity voices
        const aIsPremium = aName.includes('google') || aName.includes('natural') || aName.includes('neural') || aName.includes('premium') || aName.includes('high');
        const bIsPremium = bName.includes('google') || bName.includes('natural') || bName.includes('neural') || bName.includes('premium') || bName.includes('high');
        
        if (aIsPremium && !bIsPremium) return -1;
        if (!aIsPremium && bIsPremium) return 1;
        
        // 4. Local service preferences
        if (a.localService === false && b.localService === true) return -1;
        if (a.localService === true && b.localService === false) return 1;
        
        return 0;
      });

      setAvailableVoices(sortedFrVoices);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    
    // Periodically poll just in case onvoiceschanged does not fire initially in some browsers
    const interval = setInterval(updateVoices, 1000);
    return () => {
      clearInterval(interval);
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isRawReading]);

  const currentVerseToSpeakRef = useRef<number>(-1);
  const autoPlayNextChapterAudioRef = useRef<boolean>(false);
  const speechPauseResumeIntervalRef = useRef<any>(null);
  const wakeLockRef = useRef<any>(null);

  // Auto-scrolling state variables
  const [isAutoScrollWithSpeech, setIsAutoScrollWithSpeech] = useState<boolean>(true);
  const [isFluidAutoScrolling, setIsFluidAutoScrolling] = useState<boolean>(false);
  const [fluidScrollSpeed, setFluidScrollSpeed] = useState<number>(15); // pixels per second (speed variable)

  // Background Ambient Melody States
  const [isMelodyEnabled, setIsMelodyEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bible_melody_enabled') === 'true';
    } catch (_) {
      return false; // dynamic default off to preserve energy
    }
  });
  const [melodyVolume, setMelodyVolume] = useState<number>(() => {
    try {
      const vol = localStorage.getItem('bible_melody_volume');
      return vol ? Number(vol) : 0.15;
    } catch (_) {
      return 0.15;
    }
  });
  const [melodyStyle, setMelodyStyle] = useState<MelodyStyle>(() => {
    try {
      const stored = localStorage.getItem('bible_melody_style');
      return (stored as MelodyStyle) || 'warm_pad';
    } catch (_) {
      return 'warm_pad';
    }
  });

  // Expandable audio options menu
  const [isAudioSettingsExpanded, setIsAudioSettingsExpanded] = useState<boolean>(false);

  // Background Nature Sounds States
  const [isNatureEnabled, setIsNatureEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bible_nature_enabled') === 'true';
    } catch (_) {
      return false;
    }
  });
  const [natureSoundVolume, setNatureSoundVolume] = useState<number>(() => {
    try {
      const vol = localStorage.getItem('bible_nature_volume');
      return vol ? Number(vol) : 0.45;
    } catch (_) {
      return 0.45;
    }
  });
  const [natureSoundType, setNatureSoundType] = useState<NatureSoundType>(() => {
    try {
      const stored = localStorage.getItem('bible_nature_type');
      return (stored as NatureSoundType) || 'rain';
    } catch (_) {
      return 'rain';
    }
  });

  // "Veille spirituelle" (Bedtime Sleep/Vigil Timer) states
  const [isVigilActive, setIsVigilActive] = useState<boolean>(false);
  const [vigilDuration, setVigilDuration] = useState<number>(20); // default 20 minutes
  const [vigilTimeRemaining, setVigilTimeRemaining] = useState<number>(0);
  const [vigilInitialVolume, setVigilInitialVolume] = useState<number>(0.15);
  const [vigilInitialNatureVolume, setVigilInitialNatureVolume] = useState<number>(0.15);

  // Vigil mode sleep timer logic
  useEffect(() => {
    if (!isVigilActive) return;

    setVigilInitialVolume(melodyVolume);
    setVigilInitialNatureVolume(natureSoundVolume);
    setVigilTimeRemaining(vigilDuration * 60);

    const intervalId = setInterval(() => {
      setVigilTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          setIsVigilActive(false);
          // End session: stop speaking, melody, and nature sounds to sleep peacefully
          if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
          ambientMelody.stop();
          natureSounds.stop();
          return 0;
        }

        const nextTime = prev - 1;
        const totalSecs = vigilDuration * 60;
        const ratio = nextTime / totalSecs;

        // Proportional volume reduction (fading down to 0)
        const nextVolume = Math.max(0, vigilInitialVolume * ratio);
        setMelodyVolume(nextVolume);

        const nextNatureVolume = Math.max(0, vigilInitialNatureVolume * ratio);
        setNatureSoundVolume(nextNatureVolume);

        return nextTime;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isVigilActive, vigilDuration]);

  const toggleVigilMode = () => {
    if (isVigilActive) {
      setIsVigilActive(false);
      setMelodyVolume(vigilInitialVolume);
      setNatureSoundVolume(vigilInitialNatureVolume);
      try {
        localStorage.setItem('bible_melody_volume', String(vigilInitialVolume));
        localStorage.setItem('bible_nature_volume', String(vigilInitialNatureVolume));
      } catch (_) {}
    } else {
      setVigilInitialVolume(melodyVolume);
      setVigilInitialNatureVolume(natureSoundVolume);
      setIsVigilActive(true);
    }
  };

  // Synchronize background ambient melody with TTS reading states
  useEffect(() => {
    if (isMelodyEnabled && isSpeaking && !isPaused) {
      ambientMelody.setStyle(melodyStyle);
      ambientMelody.start();
      ambientMelody.setVolume(melodyVolume);
    } else {
      ambientMelody.stop();
    }
  }, [isMelodyEnabled, isSpeaking, isPaused, melodyVolume, melodyStyle]);

  // Synchronize background nature sounds (can play continuously when enabled for deep immersive reading)
  useEffect(() => {
    if (isNatureEnabled && activeTab === 'reader') {
      natureSounds.start(natureSoundType);
      natureSounds.setVolume(natureSoundVolume);
    } else {
      natureSounds.stop();
    }
  }, [isNatureEnabled, natureSoundType, natureSoundVolume, activeTab]);

  // Clean up speech synthesis when navigating away or selecting another chapter
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (speechPauseResumeIntervalRef.current) {
        clearInterval(speechPauseResumeIntervalRef.current);
        speechPauseResumeIntervalRef.current = null;
      }
      try {
        if (wakeLockRef.current) {
          wakeLockRef.current.release();
          wakeLockRef.current = null;
        }
      } catch (_) {}
      ambientMelody.stop();
    };
  }, [selectedBook, selectedChapter, activeTab]);

  const requestWakeLock = async () => {
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !wakeLockRef.current) {
        const lock = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current = lock;
        lock.addEventListener('release', () => {
          console.log('Wake Lock was released by the system or browser');
          if (wakeLockRef.current === lock) {
            wakeLockRef.current = null;
          }
        });
      }
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
    }
  };

  const releaseWakeLock = () => {
    try {
      if (wakeLockRef.current) {
        const lock = wakeLockRef.current;
        wakeLockRef.current = null;
        lock.release().catch((err: any) => {
          console.warn('Wake Lock release error:', err);
        });
      }
    } catch (err) {
      console.warn('Wake Lock release failed:', err);
    }
  };

  // Keep Screen Wake Lock active throughout the entire active text-to-speech session
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let heartbeatInterval: any = null;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isSpeaking && !isPaused) {
        await requestWakeLock();
      }
    };

    if (isSpeaking && !isPaused) {
      // Promptly request wake lock when audio session becomes active
      requestWakeLock();

      // Re-request lock if the tab becomes visible again
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Heartbeat renewal check every 60 seconds to ensure lock is held
      heartbeatInterval = setInterval(async () => {
        if (isSpeaking && !isPaused && !wakeLockRef.current) {
          console.log('Wake Lock Heartbeat: Wake lock expired or released by browser. Re-acquiring...');
          await requestWakeLock();
        }
      }, 60000);
    } else {
      // Release wake lock when paused or speaking stops
      releaseWakeLock();
    }

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSpeaking, isPaused]);

  const speakVerse = (index: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (index < 0 || index >= chapterVerses.length) {
      if (index >= chapterVerses.length && autoAdvanceChapterSpeech) {
        // Look up if a subsequent chapter exists in the Bible
        const nextChapterExists = selectedChapter < selectedBook.chapters_count || 
                                  BOOKS.findIndex(b => b.id === selectedBook.id) < BOOKS.length - 1;
        if (nextChapterExists) {
          autoPlayNextChapterAudioRef.current = true;
          handleNextChapter();
          return;
        }
      }
      stopSpeaking();
      return;
    }

    // Request wake lock to keep mobile screen awake and keep audio running in background
    requestWakeLock();

    // Setup periodic pause-resume wakeup hack to prevent TTS from cutting off after 15 seconds on Chrome/iOS
    if (!speechPauseResumeIntervalRef.current) {
      logTts("[TTS Debug] Setting up periodic 10-second pause-resume heartbeat hack.");
      speechPauseResumeIntervalRef.current = setInterval(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          const speakingState = window.speechSynthesis.speaking;
          const pausedState = window.speechSynthesis.paused;
          logTts(`[TTS Debug Heartbeat] speaking: ${speakingState}, paused: ${pausedState}`);
          if (speakingState && !pausedState) {
            logTts("[TTS Debug Heartbeat] Triggering pause-resume hack to maintain active audio session.");
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }
      }, 10000);
    }

    logTts(`[TTS Debug] cancel() called. Starting speakVerse for index: ${index}`);
    window.speechSynthesis.cancel();
    setCurrentSpeakingVerseIndex(index);
    currentVerseToSpeakRef.current = index;

    const verseObj = chapterVerses[index];
    // Remove Strong codes from the spoken reading
    const cleanText = verseObj.text.replace(/\[[HG]\d+\]/g, '').trim();
    const textToSpeak = `Verset ${verseObj.verse}. ${cleanText}`;

    logTts(`[TTS Debug] Creating new SpeechSynthesisUtterance for verse ${index}. Text length: ${textToSpeak.length}`);
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'fr-FR';
    utterance.rate = playbackRate;

    // Prevent garbage collection on mobile browsers (e.g. Chrome/iOS/Android)
    if (!(window as any)._activeUtterances) {
      (window as any)._activeUtterances = [];
    }
    (window as any)._activeUtterances.push(utterance);
    logTts(`[TTS Debug] Utterance stored in active array. Total active reference count: ${(window as any)._activeUtterances.length}`);

    const cleanUtterance = () => {
      if ((window as any)._activeUtterances) {
        const initialLen = (window as any)._activeUtterances.length;
        (window as any)._activeUtterances = (window as any)._activeUtterances.filter((u: any) => u !== utterance);
        logTts(`[TTS Debug] cleanUtterance for verse ${index}. Filtered from ${initialLen} to ${(window as any)._activeUtterances.length} references.`);
      }
    };

    // Dynamically look up French voice for Louis Segond French reading with gender support
    const voices = window.speechSynthesis.getVoices();
    logTts(`[TTS Debug Selector] Total voices available in browser: ${voices.length}`);
    logTts(`[TTS Debug Selector] User configuration -> voiceGender: "${voiceGender}", selectedVoiceURI: "${selectedVoiceURI || 'none'}", isRawReading: ${isRawReading}`);
    
    let selectedVoice: SpeechSynthesisVoice | null = null;

    if (isRawReading) {
      logTts(`[TTS Debug Selector] isRawReading is TRUE. Trying manual selection first...`);
      if (selectedVoiceURI) {
        selectedVoice = voices.find(voice => voice.voiceURI === selectedVoiceURI) || null;
        logTts(`[TTS Debug Selector] Manual selection search with URI "${selectedVoiceURI}" returned: ${selectedVoice ? selectedVoice.name : 'null'}`);
      }
      if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices[0];
        logTts(`[TTS Debug Selector] Fallback to first available voice as raw reading: ${selectedVoice.name}`);
      }
    } else {
      const frenchVoices = voices.filter(voice => voice.lang.startsWith('fr') || voice.lang.includes('FR'));
      logTts(`[TTS Debug Selector] Found ${frenchVoices.length} French voices overall.`);
      frenchVoices.forEach((v, idx) => {
        const isMaleMatched = LOWER_MALE_NAMES.some(name => v.name.toLowerCase().includes(name));
        const isFemaleMatched = LOWER_FEMALE_NAMES.some(name => v.name.toLowerCase().includes(name));
        logTts(`[TTS Debug Voice List] Voice #${idx}: "${v.name}" | URI: "${v.voiceURI}" | lang: "${v.lang}" | isMaleMatched: ${isMaleMatched} | isFemaleMatched: ${isFemaleMatched} | localService: ${v.localService}`);
      });
      
      // Sort French voices: prioritize explicit masculine first, then general male, then higher fidelity/cloud-based voices (Google, Natural, Neural, Premium, High, etc.)
      const sortedFrenchVoices = [...frenchVoices].sort((a, b) => {
        const aLower = a.name.toLowerCase();
        const bLower = b.name.toLowerCase();
        
        const priorityMaleKeywords = ['male', 'homme', 'paul', 'nicolas'];
        const aHasPriorityMale = priorityMaleKeywords.some(keyword => aLower.includes(keyword));
        const bHasPriorityMale = priorityMaleKeywords.some(keyword => bLower.includes(keyword));
        
        if (aHasPriorityMale && !bHasPriorityMale) return -1;
        if (!aHasPriorityMale && bHasPriorityMale) return 1;
        
        const aIsMale = LOWER_MALE_NAMES.some(name => aLower.includes(name));
        const bIsMale = LOWER_MALE_NAMES.some(name => bLower.includes(name));
        
        if (aIsMale && !bIsMale) return -1;
        if (!aIsMale && bIsMale) return 1;
        
        const aIsPremium = aLower.includes('google') || aLower.includes('natural') || aLower.includes('neural') || aLower.includes('premium') || aLower.includes('high');
        const bIsPremium = bLower.includes('google') || bLower.includes('natural') || bLower.includes('neural') || bLower.includes('premium') || bLower.includes('high');
        
        if (aIsPremium && !bIsPremium) return -1;
        if (!aIsPremium && bIsPremium) return 1;
        
        // Also prefer voices that are not localService when available on some platforms (though browser-dependent)
        if (a.localService === false && b.localService === true) return -1;
        if (a.localService === true && b.localService === false) return 1;
        
        return 0;
      });
      
      // 1. Use manual voice choice if authorized and present
      if (selectedVoiceURI) {
        selectedVoice = sortedFrenchVoices.find(voice => voice.voiceURI === selectedVoiceURI) || null;
        logTts(`[TTS Debug Selector] Tried manual voiceURI match for "${selectedVoiceURI}". Found: ${selectedVoice ? selectedVoice.name : 'null'}`);
      }

      // 2. Fall back on automatic gender-matching lists or defaults if no manual voice is chosen
      if (!selectedVoice) {
        logTts(`[TTS Debug Selector] No manual voice matched. Resolving voice for gender: "${voiceGender}"`);
        if (voiceGender === 'male') {
          // 1. Try exact male names from sorted high quality voices first
          selectedVoice = sortedFrenchVoices.find(voice => 
            LOWER_MALE_NAMES.some(name => voice.name.toLowerCase().includes(name))
          ) || null;
          logTts(`[TTS Debug Selector] Male matching - Step 1 (exact names): ${selectedVoice ? selectedVoice.name : 'none found'}`);
          
          // 2. Try excluding female named voices
          if (!selectedVoice) {
            selectedVoice = sortedFrenchVoices.find(voice => 
              !LOWER_FEMALE_NAMES.some(name => voice.name.toLowerCase().includes(name))
            ) || null;
            logTts(`[TTS Debug Selector] Male matching - Step 2 (not female names): ${selectedVoice ? selectedVoice.name : 'none found'}`);
          }
        } else if (voiceGender === 'female') {
          // 1. Try exact female names from sorted high quality voices first
          selectedVoice = sortedFrenchVoices.find(voice => 
            LOWER_FEMALE_NAMES.some(name => voice.name.toLowerCase().includes(name))
          ) || null;
          logTts(`[TTS Debug Selector] Female matching - Step 1 (exact names): ${selectedVoice ? selectedVoice.name : 'none found'}`);
          
          // 2. Try excluding male named voices
          if (!selectedVoice) {
            selectedVoice = sortedFrenchVoices.find(voice => 
              !LOWER_MALE_NAMES.some(name => voice.name.toLowerCase().includes(name))
            ) || null;
            logTts(`[TTS Debug Selector] Female matching - Step 2 (not male names): ${selectedVoice ? selectedVoice.name : 'none found'}`);
          }
        } else {
          // 'auto' mode - Prioritize explicit masculine voices ('male', 'homme', 'paul', 'nicolas')
          // to guarantee a deep and solemn spiritual reading experience by default!
          const priorityMaleKeywords = ['male', 'homme', 'paul', 'nicolas'];
          selectedVoice = sortedFrenchVoices.find(voice => 
            priorityMaleKeywords.some(keyword => voice.name.toLowerCase().includes(keyword))
          ) || null;
          logTts(`[TTS Debug Selector] Auto matching - Step 1 (priority keywords): ${selectedVoice ? selectedVoice.name : 'none found'}`);
          
          // Secondary fallback for auto mode: any general male voice
          if (!selectedVoice) {
            selectedVoice = sortedFrenchVoices.find(voice => 
              LOWER_MALE_NAMES.some(name => voice.name.toLowerCase().includes(name))
            ) || null;
            logTts(`[TTS Debug Selector] Auto matching - Step 2 (general male names): ${selectedVoice ? selectedVoice.name : 'none found'}`);
          }
        }
      }

      // Fallback if no specific voice was determined
      if (!selectedVoice && sortedFrenchVoices.length > 0) {
        selectedVoice = sortedFrenchVoices[0];
        logTts(`[TTS Debug Selector] Gender fallback matching failed. Picking first sorted French voice: ${selectedVoice.name}`);
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      logTts(`[TTS Debug] FINAL Selected Voice object: "${selectedVoice.name}" (${selectedVoice.lang}) | URI: "${selectedVoice.voiceURI}" | LocalService: ${selectedVoice.localService}`);
    } else {
      logTts("[TTS Debug] FINAL Selected Voice: None. Browser default will be used.");
    }

    // Force pitch = 1.0 in raw reading mode, otherwise keep adjusted voicePitch
    utterance.pitch = isRawReading ? 1.0 : voicePitch;
    utterance.volume = voiceVolume;

    // Detailed debug logs for all event listeners
    const logState = (eventName: string, details?: any) => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        logTts(
          `[TTS Debug Event] ${eventName} triggered for verse ${index}. ` +
          `State -> speaking: ${window.speechSynthesis.speaking}, ` +
          `paused: ${window.speechSynthesis.paused}, ` +
          `pending: ${window.speechSynthesis.pending}.` +
          (details ? ` Details: ${JSON.stringify(details)}` : '')
        );
      }
    };

    utterance.onstart = () => {
      logState('onstart');
    };

    utterance.onpause = () => {
      logState('onpause');
    };

    utterance.onresume = () => {
      logState('onresume');
    };

    utterance.onboundary = (e) => {
      logState('onboundary', { charIndex: e.charIndex, name: e.name, elapsedTime: e.elapsedTime });
    };

    utterance.onmark = (e) => {
      logState('onmark', { name: e.name, elapsedTime: e.elapsedTime });
    };

    utterance.onend = () => {
      logState('onend');
      cleanUtterance();
      // Move consecutively to next verse if we are still active on index
      if (currentVerseToSpeakRef.current === index) {
        logTts(`[TTS Debug] Moving consecutively from verse ${index} to ${index + 1}`);
        speakVerse(index + 1);
      } else {
        logTts(`[TTS Debug] currentVerseToSpeakRef.current (${currentVerseToSpeakRef.current}) differs from index (${index}). Next verse skipped.`);
      }
    };

    utterance.onerror = (e) => {
      const errCode = e.error || (e as any).type || 'unknown';
      logState('onerror', { error: errCode, message: (e as any).message });
      logTts(`[TTS Debug Event Details] Error for verse ${index}: error='${errCode}', type='${e.type}'`, 'warn');
      cleanUtterance();
      
      const ignorableErrors = ['interrupted', 'canceled', 'agent-rejected'];
      const isIgnorable = !errCode || ignorableErrors.includes(errCode);
      if (!isIgnorable && currentVerseToSpeakRef.current === index) {
        logTts(`[TTS Debug] Hard speech synthesis error '${errCode}'. Stopping speaking.`, 'error');
        stopSpeaking();
      }
    };

    logTts(`[TTS Debug] Queueing speak() invocation for verse ${index} in 60ms to let cancel() settle.`);
    setTimeout(() => {
      if (currentVerseToSpeakRef.current === index) {
        logTts(`[TTS Debug] Invoking window.speechSynthesis.speak() for verse ${index}`);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
        setIsPaused(false);

        // Synchronisation : Débute chaque verset par un carillon ou pincement de harpe céleste en harmonie
        if (isMelodyEnabled) {
          ambientMelody.triggerTransitPluck();
        }
      } else {
        logTts(`[TTS Debug] Skipped speak() invocation for verse ${index} because active verse changed during settle timeout.`);
      }
    }, 60);
  };

  const pauseSpeaking = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    logTts("[TTS Debug Action] pauseSpeaking() invoked.");
    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  const resumeSpeaking = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    logTts("[TTS Debug Action] resumeSpeaking() invoked.");
    window.speechSynthesis.resume();
    setIsPaused(false);
  };

  const stopSpeaking = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    logTts("[TTS Debug Action] stopSpeaking() invoked. Calling cancel().");
    window.speechSynthesis.cancel();

    // Clear active utterances to release memory
    logTts("[TTS Debug Action] Resetting active utterances array.");
    (window as any)._activeUtterances = [];

    // Clear periodic pause-resume interval
    if (speechPauseResumeIntervalRef.current) {
      logTts("[TTS Debug Action] Clearing periodic pause-resume interval.");
      clearInterval(speechPauseResumeIntervalRef.current);
      speechPauseResumeIntervalRef.current = null;
    }

    // Release screen wake lock
    releaseWakeLock();

    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentSpeakingVerseIndex(-1);
    currentVerseToSpeakRef.current = -1;
  };

  const handlePlayPause = () => {
    if (isSpeaking) {
      if (isPaused) {
        resumeSpeaking();
      } else {
        pauseSpeaking();
      }
    } else {
      let startIndex = 0;
      if (selectedVerseId) {
        const parts = selectedVerseId.split('_');
        if (parts.length === 3) {
          const verseNum = Number(parts[2]);
          const foundIdx = chapterVerses.findIndex(v => v.verse === verseNum);
          if (foundIdx !== -1) {
            startIndex = foundIdx;
          }
        }
      }
      speakVerse(startIndex);
    }
  };

  // 1. Follow / scroll-into-view during active TTS audio reading
  useEffect(() => {
    if (!isAutoScrollWithSpeech || currentSpeakingVerseIndex === -1) return;
    const currentVerse = chapterVerses[currentSpeakingVerseIndex];
    if (!currentVerse) return;
    const element = document.getElementById(`verse-${currentVerse.book_id}-${currentVerse.chapter}-${currentVerse.verse}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentSpeakingVerseIndex, isAutoScrollWithSpeech, chapterVerses]);

  // Smooth scroll to target resume verse when loaded
  useEffect(() => {
    if (targetResumeVerseNum && !loadingVerses && chapterVerses.length > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`verse-${selectedBook.id}-${selectedChapter}-${targetResumeVerseNum}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [targetResumeVerseNum, loadingVerses, chapterVerses, selectedBook.id, selectedChapter]);

  // Helper to update progress per chapter in history state
  const updateChapterProgress = (
    bookId: number,
    bookName: string,
    chapterNum: number,
    verseNum: number,
    totalVersesNum: number,
    forceStatus?: 'en_cours' | 'complete'
  ) => {
    setReadingHistory((prev) => {
      const existingIndex = prev.findIndex(h => h.book_id === bookId && h.chapter === chapterNum);
      const existing = existingIndex !== -1 ? prev[existingIndex] : null;

      const currentLastVerse = Math.max(existing?.last_verse || 1, verseNum);
      const currentTotalVerses = Math.max(existing?.total_verses || 1, totalVersesNum);
      
      let computedStatus: 'non_commence' | 'en_cours' | 'complete';
      if (forceStatus) {
        computedStatus = forceStatus;
      } else if (existing?.status === 'complete' || currentLastVerse >= currentTotalVerses) {
        computedStatus = 'complete';
      } else {
        computedStatus = 'en_cours';
      }

      const timeSpent = existing?.time_spent_seconds || 0;

      const updatedItem: ReadingHistory = {
        book_id: bookId,
        book_name: bookName,
        chapter: chapterNum,
        timestamp: new Date().toISOString(),
        last_verse: currentLastVerse,
        total_verses: currentTotalVerses,
        time_spent_seconds: timeSpent,
        status: computedStatus
      };

      let nextHistory: ReadingHistory[];
      if (existingIndex !== -1) {
        nextHistory = [...prev];
        nextHistory[existingIndex] = updatedItem;
      } else {
        nextHistory = [updatedItem, ...prev];
      }

      try {
        localStorage.setItem('offline_reading_history', JSON.stringify(nextHistory));
      } catch (_) {}

      if (user) {
        const docId = `history_${bookId}_${chapterNum}`;
        setDoc(doc(db, 'users', user.uid, 'history', docId), updatedItem).catch(() => {});
      }

      return nextHistory;
    });
  };

  // IntersectionObserver to auto-track active verse progress while scrolling
  useEffect(() => {
    if (activeTab !== 'read' || chapterVerses.length === 0 || !selectedBook) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const verseAttr = entry.target.getAttribute('data-verse-num');
            if (verseAttr) {
              const vNum = parseInt(verseAttr, 10);
              if (!isNaN(vNum) && vNum > 0) {
                updateChapterProgress(selectedBook.id, selectedBook.name, selectedChapter, vNum, chapterVerses.length);
              }
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    const verseEls = document.querySelectorAll('.verse-container-item');
    verseEls.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [activeTab, chapterVerses, selectedBook, selectedChapter]);

  // Timer effect to accumulate seconds spent on current active chapter
  useEffect(() => {
    if (activeTab !== 'read' || !selectedBook || !selectedChapter) return;

    const timer = setInterval(() => {
      setReadingHistory(prev => {
        const existingIndex = prev.findIndex(h => h.book_id === selectedBook.id && h.chapter === selectedChapter);
        if (existingIndex === -1) return prev;

        const existing = prev[existingIndex];
        const nextTime = (existing.time_spent_seconds || 0) + 1;

        const updatedItem: ReadingHistory = {
          ...existing,
          time_spent_seconds: nextTime,
          timestamp: new Date().toISOString()
        };

        const nextHistory = [...prev];
        nextHistory[existingIndex] = updatedItem;
        try {
          localStorage.setItem('offline_reading_history', JSON.stringify(nextHistory));
        } catch (_) {}

        if (user) {
          const docId = `history_${selectedBook.id}_${selectedChapter}`;
          setDoc(doc(db, 'users', user.uid, 'history', docId), updatedItem).catch(() => {});
        }

        return nextHistory;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTab, selectedBook, selectedChapter, user]);

  // Auto-play the next chapter immediately after its verses are fully fetched
  useEffect(() => {
    if (!loadingVerses && chapterVerses.length > 0 && autoPlayNextChapterAudioRef.current) {
      autoPlayNextChapterAudioRef.current = false;
      const timer = setTimeout(() => {
        speakVerse(0);
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [chapterVerses, loadingVerses]);

  // 2. Continuous fluid automatic scrolling loop using high precision delta time
  useEffect(() => {
    if (!isFluidAutoScrolling) return;

    let lastTime = performance.now();
    let animationFrameId: number;

    const scrollStep = (time: number) => {
      const delta = (time - lastTime) / 1000; // in seconds
      lastTime = time;

      // Scroll amount is pixels per second
      const scrollAmount = fluidScrollSpeed * delta;
      window.scrollBy(0, scrollAmount);

      animationFrameId = requestAnimationFrame(scrollStep);
    };

    animationFrameId = requestAnimationFrame(scrollStep);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isFluidAutoScrolling, fluidScrollSpeed]);

  // Conversational Assistant Handler
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setLoadingChat(true);

    const updatedHistory = [...chatMessages];
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
      // Prepare history formatted array for the backend
      const formattedHistory = updatedHistory.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: formattedHistory
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Échec d'assistant.");

      setChatMessages(prev => [...prev, { role: 'model', content: data.reply || "Je n'ai pas pu répondre à cette requête spirituelle." }]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setChatMessages(prev => [...prev, { role: 'model', content: `Désolé, j'ai rencontré un obstacle céleste lors du traitement de votre question : ${err.message || 'Instabilité réseau.'}` }]);
    } finally {
      setLoadingChat(false);
    }
  };

  // Reading plans & chapter history navigation helper with exact verse resume
  const handleNavigateChallengeToReader = (bookId: number, chapterNum: number, verseNum?: number) => {
    const targetBook = BOOKS.find(b => b.id === bookId);
    if (targetBook) {
      setSelectedBook(targetBook);
      setSelectedChapter(chapterNum);

      let verseToJump = verseNum;
      if (!verseToJump) {
        const existing = readingHistory.find(h => h.book_id === bookId && h.chapter === chapterNum);
        if (existing && existing.last_verse) {
          verseToJump = existing.last_verse;
        }
      }

      if (verseToJump) {
        setTargetResumeVerseNum(verseToJump);
        setSelectedVerseId(`${bookId}_${chapterNum}_${verseToJump}`);
      } else {
        setTargetResumeVerseNum(null);
      }
      setActiveTab('read');
    }
  };

  const handleNavigateVerseToReader = (bookId: number, chapterNum: number, verseNum: number) => {
    const targetBook = BOOKS.find(b => b.id === bookId);
    if (targetBook) {
      setSelectedBook(targetBook);
      setSelectedChapter(chapterNum);
      setSelectedVerseId(`${bookId}_${chapterNum}_${verseNum}`);
      setActiveTab('read');
    }
  };

  // Check if a specific verse ID matches notes and bookmarks
  const getVerseHasBookmark = (v: Verse) => {
    return favorites.some(f => f.book_id === v.book_id && f.chapter === v.chapter && f.verse === v.verse);
  };

  const getVerseHasNote = (v: Verse): { hasNote: boolean; text: string; audio?: string; emotionAnalysis?: EmotionAnalysisResult } => {
    const found = notes.find(n => n.book_id === v.book_id && n.chapter === v.chapter && n.verse === v.verse);
    return {
      hasNote: found !== undefined,
      text: found ? found.note : '',
      audio: found ? found.audio : undefined,
      emotionAnalysis: found ? found.emotion_analysis : undefined
    };
  };

  // Splash Loading database initialization interface
  if (!sqliteDbReady) {
    return (
      <div className="min-h-screen bg-[#050403] flex flex-col items-center justify-center p-6 text-center select-none text-[#e8e0d0]">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-[#c9a84c] animate-spin"></div>
          <BookOpen className="w-8 h-8 text-[#c9a84c] absolute inset-0 m-auto animate-pulse" />
        </div>
        <h2 className="text-xl font-serif tracking-[0.12em] text-[#c9a84c] uppercase font-extrabold">BIBLE MOBILE</h2>
        <p className="text-xs text-[#6b6355] mt-2 tracking-wider font-mono max-w-sm leading-relaxed">
          {dbInitText}
        </p>
        <div className="w-48 h-1 bg-[#1a1712] border border-[#2e2a1e] rounded-full overflow-hidden mt-4">
          <div 
            className="h-full bg-gradient-to-r from-[#c9a84c] to-[#e8c97a] transition-all duration-300"
            style={{ width: `${dbInitProgress}%` }}
          ></div>
        </div>
      </div>
    );
  }

  // Auth Loading state splash screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050403] flex flex-col items-center justify-center p-6 text-center select-none text-[#e8e0d0]">
        <div className="w-8 h-8 rounded-full border-b border-r border-[#c9a84c] animate-spin mb-4"></div>
        <p className="text-xs text-[#6b6355] tracking-widest font-mono uppercase">Vérification de l'alliance...</p>
      </div>
    );
  }

  // Non-authenticated luxury portal screen
  if (!user) {
    return (
      <div className="min-h-screen bg-[#050403] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#12100c] border border-[#2e2a1e] p-8 rounded-[2rem] shadow-gold-glow relative overflow-hidden text-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#c9a84c]/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-[#c9a84c]/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* Majestic Icon Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-luxury-button-bg border border-[#c9a84c]/25 text-[#c9a84c] rounded-full flex items-center justify-center shadow-inner mb-3.5">
              <BookOpen className="w-7 h-7 text-[#c9a84c]" />
            </div>
            <h1 className="text-2xl font-serif tracking-[0.1em] text-[#c9a84c] font-black uppercase">Bible Mobile</h1>
            <p className="text-xs text-[#6b6355] mt-2 font-serif leading-relaxed max-w-xs">
              Exégèse érudite de la Bible Louis Segond 1910 par intelligence artificielle théologique
            </p>
          </div>

          {/* In-tab Auth Segment Panel */}
          <div className="flex bg-[#0d0b07] border border-[#2e2a1e]/85 p-1 rounded-xl mb-6">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(null); }}
              className={`flex-1 py-2 text-[10px] font-mono tracking-widest uppercase rounded-lg transition-all cursor-pointer ${
                authMode === 'login' ? 'bg-[#c9a84c] text-[#0d0b07] font-bold shadow-soft' : 'text-[#6b6355] hover:text-[#e8e0d0]'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => { setAuthMode('signup'); setAuthError(null); }}
              className={`flex-1 py-1.5 text-[10px] font-mono tracking-widest uppercase rounded-lg transition-all cursor-pointer ${
                authMode === 'signup' ? 'bg-[#c9a84c] text-[#0d0b07] font-bold shadow-soft' : 'text-[#6b6355] hover:text-[#e8e0d0]'
              }`}
            >
              Inscription
            </button>
          </div>

          {authError && (
            <motion.div 
              initial={{ opacity: 0, y: -4 }} 
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-950/20 border border-red-900/35 text-red-300 p-3.5 rounded-xl text-xs mb-5 flex items-start gap-2 text-left"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span className="font-sans leading-relaxed">{authError}</span>
            </motion.div>
          )}

          {/* Form Entries block */}
          <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
            {authMode === 'signup' && (
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase tracking-widest text-[#6b6355]">Nom d'Étudiant ou Pseudo</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#6b6355] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Grand Voyageur"
                    className="w-full bg-[#0d0b07] border border-[#2e2a1e] hover:border-[#c9a84c]/20 focus:border-[#c9a84c] text-[#e8e0d0] text-xs pl-10 pr-4 py-3 rounded-xl transition outline-none"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase tracking-widest text-[#6b6355]">Adresse Email</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#6b6355] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full bg-[#0d0b07] border border-[#2e2a1e] hover:border-[#c9a84c]/20 focus:border-[#c9a84c] text-[#e8e0d0] text-xs pl-10 pr-4 py-3 rounded-xl transition outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase tracking-widest text-[#6b6355]">Mot de passe</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#6b6355] absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0d0b07] border border-[#2e2a1e] hover:border-[#c9a84c]/20 focus:border-[#c9a84c] text-[#e8e0d0] text-xs pl-10 pr-10 py-3 rounded-xl transition outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 hover:text-[#c9a84c] text-[#6b6355] absolute right-3.5 top-3 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gold-gradient text-[#0d0b07] font-bold font-serif text-xs uppercase tracking-widest rounded-xl transition shadow-gold-glow cursor-pointer mt-6 flex items-center justify-center gap-1 hover:opacity-95"
            >
              <span>{authMode === 'login' ? 'Accéder au Sanctuaire' : 'S\'engager dans la Foi'}</span>
              <ArrowRight className="w-4 h-4 text-[#0d0b07]" />
            </button>
          </form>

          {/* Social Sign-In option divider */}
          <div className="relative flex py-4 items-center select-none">
            <div className="flex-grow border-t border-[#2e2a1e]/40"></div>
            <span className="flex-shrink mx-4 text-[9px] font-mono uppercase text-[#6b6355] tracking-[0.18em]">Ou s'assembler par</span>
            <div className="flex-grow border-t border-[#2e2a1e]/40"></div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={isGoogleSigningIn}
            className="w-full py-3 bg-[#0d0b07] hover:bg-[#1a1712] text-[#e8e0d0] border border-[#2e2a1e] rounded-xl transition text-[10px] font-mono tracking-widest uppercase flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGoogleSigningIn ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
                Connexion en cours...
              </span>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                <span>Google Sign-In</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Main Authenticated Layout
  return (
    <div className={`min-h-screen bg-luxury-bg-deep text-[#e8e0d0] flex flex-col font-sans selection:bg-[#c9a84c]/20 ${isZenMode ? 'pb-6' : 'pb-20 md:pb-6'} text-left selection:text-[#c9a84c]`}>
      
      {/* Veille spirituelle overlays (Sunset eye protection + physical screen dimmer) */}
      {isVigilActive && (
        <>
          {/* Sunset warm orange light blocker filter */}
          <div 
            className="fixed inset-0 pointer-events-none z-[9998] transition-opacity duration-1000"
            style={{
              backgroundColor: '#cc5a01',
              opacity: Math.min(0.20, (1 - vigilTimeRemaining / (vigilDuration * 60)) * 0.20),
              mixBlendMode: 'color-burn'
            }}
          />
          {/* Pitch-black dimmer filter */}
          <div 
            className="fixed inset-0 pointer-events-none z-[9999] transition-opacity duration-1000"
            style={{
              backgroundColor: '#050403',
              opacity: Math.min(0.85, (1 - vigilTimeRemaining / (vigilDuration * 60)) * 0.85)
            }}
          />
        </>
      )}

      {/* Dynamic luxury TopBar header, syncing click navigations */}
      {!isZenMode && (
        <TopBar 
          onSearchPress={() => {
            setActiveTab('read');
            // focus input if available
            setTimeout(() => {
              const inputEl = document.getElementById('bible-search-input');
              if (inputEl) inputEl.focus();
            }, 100);
          }}
          onStudyPress={() => setActiveTab('read')}
          onProfilePress={() => setIsSettingsOpen(!isSettingsOpen)}
        />
      )}

      {/* Embedded Settings Box/Drawer */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full bg-[#12100c] border-b border-[#2e2a1e] py-5 px-4"
          >
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#2e2a1e]/60">
                <h4 className="font-serif text-[#c9a84c] text-sm font-bold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                  <Settings className="w-4 h-4 text-[#c9a84c]" />
                  <span>Ma Cabine d'Études & Préférences</span>
                </h4>
                <button onClick={() => setIsSettingsOpen(false)} className="text-[#6b6355] hover:text-white transition cursor-pointer">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Profile information */}
                <div className="bg-[#0f0e0b] border border-[#2e2a1e]/60 p-4 rounded-xl flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[8px] font-mono uppercase tracking-wider text-[#6b6355]">COMPTE ACTIF</span>
                    <h5 className="font-serif font-bold text-[#e8e0d0] text-sm truncate">
                      {displayName || user.displayName || user.email?.split('@')[0]}
                    </h5>
                    <p className="text-[10px] font-mono text-[#6b6355] truncate">{user.email}</p>
                  </div>
                  <button 
                    onClick={handleSignOut}
                    className="mt-4 w-full py-1.5 border border-red-500/20 hover:border-red-500 hover:bg-red-500/10 text-red-400 font-mono text-[9px] tracking-widest uppercase rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Se Déconnecter</span>
                  </button>
                </div>

                {/* 2. Style Adjustments (textSize & Theme) */}
                <div className="bg-[#0f0e0b] border border-[#2e2a1e]/60 p-4 rounded-xl space-y-3 text-left">
                  <span className="text-[8px] font-mono uppercase tracking-wider text-[#6b6355]">PARTAGE VISUEL</span>
                  
                  {/* Slider size font */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-[#6b6355]">Taille du texte</span>
                      <span className="text-[#c9a84c] font-bold">{textSize}px</span>
                    </div>
                    <input 
                      type="range" 
                      min="14" 
                      max="24" 
                      value={textSize}
                      onChange={(e) => setTextSize(Number(e.target.value))}
                      className="w-full accent-[#c9a84c] bg-[#1a1712] rounded-lg h-1.5 appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Theme toggler */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono text-[#6b6355] uppercase block">Palette d'ambiance</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setThemeMode('dark')}
                        className={`flex-1 py-1.5 text-[9px] font-mono uppercase border rounded-lg transition cursor-pointer ${
                          themeMode === 'dark' ? 'bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c]' : 'text-[#6b6355] border-[#2e2a1e]'
                        }`}
                      >
                        Nuit noire 
                      </button>
                      <button 
                        onClick={() => setThemeMode('sepia')}
                        className={`flex-1 py-1.5 text-[9px] font-mono uppercase border rounded-lg transition cursor-pointer ${
                          themeMode === 'sepia' ? 'bg-[#8e6812]/20 text-[#8e6812] border-[#8e6812]' : 'text-[#6b6355] border-[#2e2a1e]'
                        }`}
                      >
                        Vieux parchemin
                      </button>
                    </div>
                  </div>

                  {/* Automatic theme toggle option based on local time */}
                  <div className="pt-2 border-t border-[#2e2a1e]/45 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[9.5px] font-mono text-[#c9a84c] uppercase font-bold tracking-wider">Mode Automatique</span>
                      <span className="text-[8px] text-[#6b6355]">Sépia (Jour 7h-19h) / Sombre (Nuit)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !autoTheme;
                        setAutoTheme(nextVal);
                        localStorage.setItem('auto_theme_enabled', String(nextVal));
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoTheme ? 'bg-[#c9a84c]' : 'bg-[#1a1712] border-[#2e2a1e]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#050403] shadow ring-0 transition duration-200 ease-in-out ${
                          autoTheme ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 3. Sync, database statistics & Local Cache Optimizer */}
                <div className="bg-[#0f0e0b] border border-[#2e2a1e]/60 p-4 rounded-xl space-y-3 text-left flex flex-col justify-between">
                  <div className="space-y-3">
                    <div>
                      <span className="text-[8px] font-mono uppercase tracking-wider text-[#6b6355]">STATISTIQUES SACRÉES</span>
                      <div className="space-y-1 text-xs mt-1">
                        <p className="text-[#6b6355]">Favoris / Signets : <span className="font-mono text-[#e8e0d0] font-bold">{favorites.length}</span></p>
                        <button
                          onClick={() => {
                            setActiveTab('notes');
                            setIsSettingsOpen(false);
                          }}
                          className="text-[#6b6355] hover:text-[#c9a84c] transition text-left flex items-center justify-between w-full cursor-pointer group"
                        >
                          <span>Notes d'études :</span>
                          <span className="font-mono text-[#e8e0d0] group-hover:text-[#c9a84c] font-bold underline decoration-dashed decoration-[#c9a84c]/50 transition">{notes.length} 📓</span>
                        </button>
                        <p className="text-[#6b6355]">Chapitres lus : <span className="font-mono text-[#e8e0d0] font-bold">{readingHistory.length}</span></p>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[#2e2a1e]/40 space-y-2">
                      <span className="text-[8px] font-mono uppercase tracking-wider text-[#c9a84c] block flex items-center gap-1">
                        <Database className="w-3.5 h-3.5 text-[#c9a84c]" />
                        OPTIMISATION CACHE HORS-LIGNE
                      </span>
                      <p className="text-[10px] text-[#807664] leading-normal font-sans">
                        Fini les chargements. Vos chapitres consultés sont sauvegardés automatiquement sur votre appareil.
                      </p>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#6b6355]">Chapitres mis en cache :</span>
                        <span className="font-mono text-[#e8e0d0] font-bold">{cachedChaptersCount}</span>
                      </div>

                      {/* Download progress UI */}
                      {preDownloadProgress && preDownloadProgress.active ? (
                        <div className="p-2 bg-[#c9a84c]/5 border border-[#c9a84c]/20 rounded-lg space-y-1 bg-[#14120e]">
                          <div className="flex justify-between text-[8px] font-mono text-[#c9a84c]">
                            <span className="truncate">TÉLÉCHARGEMENT: {preDownloadProgress.bookName} ch {preDownloadProgress.chapter}</span>
                            <span className="shrink-0">{preDownloadProgress.chapter} ch.</span>
                          </div>
                          <div className="w-full bg-[#1a1712] h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-[#c9a84c] h-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.round((preDownloadProgress.chapter / preDownloadProgress.total) * 100))}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 pt-1">
                          <button
                            onClick={() => handlePreDownloadBooks([43])} // Jean
                            className="w-full py-1.5 text-[8.5px] font-mono uppercase bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/25 rounded hover:bg-[#c9a84c]/25 cursor-pointer text-center font-bold transition duration-200"
                          >
                            ⬇️ Sauvegarder l'Évangile de Jean (Offline)
                          </button>
                          <button
                            onClick={() => handlePreDownloadBooks([40, 41, 42, 43])} // Les 4 Évangiles
                            className="w-full py-1.5 text-[8.5px] font-mono uppercase bg-[#c9a84c]/5 text-[#c9a84c]/80 border border-[#c9a84c]/15 rounded hover:bg-[#c9a84c]/15 cursor-pointer text-center transition duration-200"
                          >
                            🔒 Pré-charger les 4 Évangiles
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm("Voulez-vous vider tous les chapitres mis en cache localement ?")) {
                                await explainCache.clearAll();
                                refreshCacheStats();
                              }
                            }}
                            className="w-full py-0.5 text-[8px] font-mono text-center text-red-400/70 hover:text-red-300 hover:underline transition cursor-pointer"
                          >
                            Vider les caches hors-ligne
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-[8.5px] text-[#6b6355] italic leading-relaxed pt-1.5 border-t border-[#2e2a1e]/40">
                    * Sauvegardé sur Firestore & IndexedDB local.
                  </div>
                </div>

                {/* 4. System Settings (Paramètres Système) */}
                <div className="bg-[#0f0e0b] border border-[#2e2a1e]/60 p-4 rounded-xl space-y-3 text-left">
                  <span className="text-[8px] font-mono uppercase tracking-wider text-[#6b6355]">PARAMÈTRES SYSTÈME</span>
                  
                  {/* Voice Gender selection */}
                  <div className="space-y-1.5">
                    <span className="text-[8.5px] font-mono text-[#6b6355] uppercase block">Mode de la voix</span>
                    <div className="grid grid-cols-3 gap-1">
                      {(['auto', 'male', 'female'] as const).map((genderVal) => (
                        <button
                          key={genderVal}
                          onClick={() => {
                            setVoiceGender(genderVal);
                            try {
                              localStorage.setItem('bible_voice_gender', genderVal);
                            } catch (_) {}
                            // Clear precise voice selection to let automatic gender-matching take effect
                            setSelectedVoiceURI('');
                            try {
                              localStorage.removeItem('bible_preferred_voice_uri');
                            } catch (_) {}

                            // Invalidate/clear active utterances queue & cancel synthesis to avoid old voice cache playing
                            if (typeof window !== 'undefined' && window.speechSynthesis) {
                              window.speechSynthesis.cancel();
                              (window as any)._activeUtterances = [];
                            }

                            if (isSpeaking && currentSpeakingVerseIndex !== -1) {
                              speakVerse(currentSpeakingVerseIndex);
                            }
                          }}
                          className={`py-1 text-[8px] font-mono uppercase border rounded transition cursor-pointer ${
                            voiceGender === genderVal 
                              ? 'bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c]' 
                              : 'text-[#6b6355] border-[#2e2a1e]/60'
                          }`}
                        >
                          {genderVal === 'auto' ? 'Auto' : genderVal === 'male' ? 'Homme' : 'Femme'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Exhaustive voice selector list */}
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-mono text-[#6b6355] uppercase block">Choix précis de la voix</span>
                    <div className="flex gap-1.5 items-stretch">
                      <select
                        value={selectedVoiceURI}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedVoiceURI(val);
                          try {
                            localStorage.setItem('bible_preferred_voice_uri', val);
                          } catch (_) {}

                          // Invalidate/clear active utterances queue & cancel synthesis to avoid old voice cache playing
                          if (typeof window !== 'undefined' && window.speechSynthesis) {
                            window.speechSynthesis.cancel();
                            (window as any)._activeUtterances = [];
                          }

                          if (isSpeaking && currentSpeakingVerseIndex !== -1) {
                            speakVerse(currentSpeakingVerseIndex);
                          }
                        }}
                        className="flex-1 text-[9px] bg-[#14120e] border border-[#2e2a1e]/80 text-[#e8e0d0] rounded p-1 focus:outline-none focus:border-[#c9a84c] min-w-0"
                      >
                        <option value="">-- Mode Automatique --</option>
                        {availableVoices.map((voice) => {
                          const isPremium = voice.name.toLowerCase().includes('google') || voice.name.toLowerCase().includes('natural') || voice.name.toLowerCase().includes('premium') || voice.name.toLowerCase().includes('high');
                          return (
                            <option key={voice.voiceURI} value={voice.voiceURI}>
                              {isPremium ? '💎 ' : ''}{voice.name}
                            </option>
                          );
                        })}
                      </select>
                      
                      {selectedVoiceURI && (
                        <button
                          onClick={() => {
                            if (typeof window !== 'undefined' && window.speechSynthesis) {
                              window.speechSynthesis.cancel();
                              // Play the purifier test chime
                              audioPurifier.playTestChime();

                              // Speak sample
                              const utterance = new SpeechSynthesisUtterance("Que la paix soit avec vous.");
                              utterance.lang = 'fr-FR';
                              utterance.rate = playbackRate * 0.9;
                              
                              const targetVoic = availableVoices.find(v => v.voiceURI === selectedVoiceURI);
                              if (targetVoic) {
                                utterance.voice = targetVoic;
                              }

                              // Keep clear native voice pitch or force 1.0 in raw reading to prevent robotic/distorted sounds
                              utterance.pitch = isRawReading ? 1.0 : voicePitch;
                              utterance.volume = voiceVolume;
                              window.speechSynthesis.speak(utterance);
                            }
                          }}
                          className="px-1.5 bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/35 rounded text-[8px] hover:bg-[#c9a84c]/20 cursor-pointer flex items-center justify-center font-mono uppercase font-bold"
                          title="Tester la voix"
                        >
                          Test
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Playback rate speed */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className="text-[#6b6355]">Vitesse de parole</span>
                      <span className="text-[#c9a84c] font-bold">{playbackRate}x</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.7" 
                      max="1.5" 
                      step="0.1"
                      value={playbackRate}
                      onChange={(e) => setPlaybackRate(Number(e.target.value))}
                      className="w-full accent-[#c9a84c] bg-[#1a1712] rounded-lg h-1.5 appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Volume de la voix TTS */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className="text-[#6b6355]">Volume de la voix (TTS)</span>
                      <span className="text-[#c9a84c] font-bold">{Math.round(voiceVolume * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.0" 
                      max="1.0" 
                      step="0.05"
                      value={voiceVolume}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setVoiceVolume(val);
                        try {
                          localStorage.setItem('bible_voice_volume', String(val));
                        } catch (_) {}
                      }}
                      className="w-full accent-[#c9a84c] bg-[#1a1712] rounded-lg h-1.5 appearance-none cursor-pointer"
                      title="Ajuste le volume de la synthèse vocale indépendamment du volume système"
                    />
                  </div>

                  {/* Playback pitch tone to let user remove or adjust robotic resampler noise */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className="text-[#6b6355]">Hauteur (Pitch)</span>
                      <span className="text-[#c9a84c] font-bold">{voicePitch === 1.0 ? 'Naturel (Clair)' : `${voicePitch}x`}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.8" 
                      max="1.2" 
                      step="0.05"
                      value={voicePitch}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setVoicePitch(val);
                        try {
                          localStorage.setItem('bible_voice_pitch', String(val));
                        } catch (_) {}
                      }}
                      className="w-full accent-[#c9a84c] bg-[#1a1712] rounded-lg h-1 appearance-none cursor-pointer"
                      title="Réglez à 1.0 pour une clarté optimale sans grésillements numériques additionnels"
                    />
                  </div>

                  {/* Melody Toggle */}
                  <div className="flex items-center justify-between text-[9px] font-mono pt-1.5 border-t border-[#2e2a1e]/40">
                    <span className="text-[#6b6355]">Mélodie Ambiante</span>
                    <button
                      onClick={() => {
                        const nextVal = !isMelodyEnabled;
                        setIsMelodyEnabled(nextVal);
                        try {
                          localStorage.setItem('bible_melody_enabled', String(nextVal));
                        } catch (_) {}
                      }}
                      className={`px-2 py-0.5 text-[8px] font-semibold uppercase rounded border cursor-pointer transition ${
                        isMelodyEnabled 
                          ? 'bg-[#c9a84c]/10 text-[#c9a84c] border-[#c9a84c]/30' 
                          : 'text-[#6b6355] border-[#2e2a1e]/40 hover:text-white'
                      }`}
                    >
                      {isMelodyEnabled ? 'Oui' : 'Non'}
                    </button>
                  </div>

                  {/* Lecture Continue Toggle */}
                  <div className="flex items-center justify-between text-[9px] font-mono pt-1.5 border-t border-[#2e2a1e]/40">
                    <span className="text-[#6b6355]" title="Passer automatiquement au chapitre suivant à la fin du chapitre actuel">Lecture Continue</span>
                    <button
                      onClick={() => {
                        const nextVal = !autoAdvanceChapterSpeech;
                        setAutoAdvanceChapterSpeech(nextVal);
                        try {
                          localStorage.setItem('bible_auto_advance_speech', String(nextVal));
                        } catch (_) {}
                      }}
                      className={`px-2 py-0.5 text-[8px] font-semibold uppercase rounded border cursor-pointer transition ${
                        autoAdvanceChapterSpeech 
                          ? 'bg-[#c9a84c]/10 text-[#c9a84c] border-[#c9a84c]/30' 
                          : 'text-[#6b6355] border-[#2e2a1e]/40 hover:text-white'
                      }`}
                    >
                      {autoAdvanceChapterSpeech ? 'Oui (Auto)' : 'Non'}
                    </button>
                  </div>

                  {/* Lecture Brute Toggle */}
                  <div className="flex items-center justify-between text-[9px] font-mono pt-1.5 border-t border-[#2e2a1e]/40">
                    <span className="text-[#6b6355]" title="Désactive toute modification de pitch (pitch = 1.0) et contourne le filtrage des voix de synthèse pour résoudre les distorsions sur certains téléphones">Lecture Brute</span>
                    <button
                      onClick={() => {
                        const nextVal = !isRawReading;
                        setIsRawReading(nextVal);
                      }}
                      className={`px-2 py-0.5 text-[8px] font-semibold uppercase rounded border cursor-pointer transition ${
                        isRawReading 
                          ? 'bg-[#c9a84c]/10 text-[#c9a84c] border-[#c9a84c]/30' 
                          : 'text-[#6b6355] border-[#2e2a1e]/40 hover:text-white'
                      }`}
                    >
                      {isRawReading ? 'Oui (Brut)' : 'Non'}
                    </button>
                  </div>

                  {/* Purifier Status with Test Chime button */}
                  <div className="flex items-center justify-between text-[9px] font-mono pt-1.5 border-t border-[#2e2a1e]/40">
                    <span className="text-[#6b6355] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Anti-Bruit Actif (HD)
                    </span>
                    <button
                      onClick={() => {
                        audioPurifier.playTestChime();
                      }}
                      className="px-1.5 py-0.5 bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/40 rounded hover:bg-[#c9a84c]/20 transition cursor-pointer text-[8px] uppercase font-bold"
                    >
                      Calibrer 🎵
                    </button>
                  </div>

                  {/* Vider les logs de débogage stockés temporairement */}
                  <div className="flex items-center justify-between text-[9px] font-mono pt-1.5 border-t border-[#2e2a1e]/40">
                    <span className="text-[#6b6355]" title="Vider manuellement les journaux de débogage stockés pour éviter la saturation">Logs de Débogage TTS</span>
                    <button
                      onClick={() => {
                        setTtsLogs([]);
                        logTts("[TTS Debug] Journaux effacés manuellement.");
                      }}
                      className="px-1.5 py-0.5 bg-red-950/20 text-red-400 border border-red-500/35 rounded hover:bg-red-900/20 transition cursor-pointer text-[8px] uppercase font-bold"
                    >
                      Vider 🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-7xl w-full mx-auto px-5 sm:px-6 md:px-8 pt-4 pb-28 sm:pb-32 flex flex-col md:flex-row gap-8">
        
        {/* SIDEBAR NAVIGATION TAB COLUMN FOR MEDIUM+ DISPLAY */}
        <aside className={`w-full md:w-60 shrink-0 ${isZenMode ? 'hidden' : 'hidden md:flex'} flex-col gap-1.5 text-left font-serif py-1`}>
          <span className="text-[10px] font-mono font-black uppercase text-[#6b6355] tracking-[0.24em] px-3 mb-2">Sanctuaire</span>
          
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs tracking-wider transition cursor-pointer font-serif uppercase ${
              activeTab === 'home' ? 'bg-[#1a1712] text-[#c9a84c] border border-[#c9a84c]/20 shadow-soft font-bold' : 'text-[#6b6355] hover:text-[#e8e0d0] hover:bg-[#12100c]'
            }`}
          >
            <Home className="w-4.5 h-4.5 text-[#c9a84c]" />
            <span>Accueil</span>
          </button>

          <button
            onClick={() => setActiveTab('read')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs tracking-wider transition cursor-pointer font-serif uppercase ${
              activeTab === 'read' ? 'bg-[#1a1712] text-[#c9a84c] border border-[#c9a84c]/20 shadow-soft font-bold' : 'text-[#6b6355] hover:text-[#e8e0d0] hover:bg-[#12100c]'
            }`}
          >
            <BookOpen className="w-4.5 h-4.5 text-[#c9a84c]" />
            <span>Étude & Lecteur</span>
          </button>

          <button
            onClick={() => { setActiveTab('dictionary'); setTargetedStrongCode(null); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs tracking-wider transition cursor-pointer font-serif uppercase ${
              activeTab === 'dictionary' ? 'bg-[#1a1712] text-[#c9a84c] border border-[#c9a84c]/20 shadow-soft font-bold' : 'text-[#6b6355] hover:text-[#e8e0d0] hover:bg-[#12100c]'
            }`}
          >
            <Search className="w-4.5 h-4.5 text-[#c9a84c]" />
            <span>Concordance Strong</span>
          </button>

          <button
            onClick={() => setActiveTab('encyclopedia')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs tracking-wider transition cursor-pointer font-serif uppercase ${
              activeTab === 'encyclopedia' ? 'bg-[#1a1712] text-[#c9a84c] border border-[#c9a84c]/20 shadow-soft font-bold' : 'text-[#6b6355] hover:text-[#e8e0d0] hover:bg-[#12100c]'
            }`}
          >
            <Library className="w-4.5 h-4.5 text-[#c9a84c]" />
            <span>Dictionnaire IA</span>
          </button>

          <button
            onClick={() => setActiveTab('assistant')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs tracking-wider transition cursor-pointer font-serif uppercase ${
              activeTab === 'assistant' ? 'bg-[#1a1712] text-[#c9a84c] border border-[#c9a84c]/20 shadow-soft font-bold' : 'text-[#6b6355] hover:text-[#e8e0d0] hover:bg-[#12100c]'
            }`}
          >
            <MessageSquare className="w-4.5 h-4.5 text-[#c9a84c] animate-pulse" />
            <span>Assistant Biblique</span>
          </button>

          <button
            onClick={() => setActiveTab('challenges')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs tracking-wider transition cursor-pointer font-serif uppercase ${
              activeTab === 'challenges' ? 'bg-[#1a1712] text-[#c9a84c] border border-[#c9a84c]/20 shadow-soft font-bold' : 'text-[#6b6355] hover:text-[#e8e0d0] hover:bg-[#12100c]'
            }`}
          >
            <Flame className="w-4.5 h-4.5 text-[#c9a84c]" />
            <span>Défis & Fidélité</span>
          </button>

          <button
            onClick={() => setActiveTab('memorize')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs tracking-wider transition cursor-pointer font-serif uppercase ${
              activeTab === 'memorize' ? 'bg-[#1a1712] text-[#c9a84c] border border-[#c9a84c]/20 shadow-soft font-bold' : 'text-[#6b6355] hover:text-[#e8e0d0] hover:bg-[#12100c]'
            }`}
          >
            <Brain className="w-4.5 h-4.5 text-[#c9a84c]" />
            <span>Mémorisation</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs tracking-wider transition cursor-pointer font-serif uppercase ${
              activeTab === 'notes' ? 'bg-[#1a1712] text-[#c9a84c] border border-[#c9a84c]/20 shadow-soft font-bold' : 'text-[#6b6355] hover:text-[#e8e0d0] hover:bg-[#12100c]'
            }`}
          >
            <ScrollText className="w-4.5 h-4.5 text-[#c9a84c]" />
            <span>Notes Spirituelles</span>
          </button>

          <div className="pt-4 border-t border-[#2e2a1e]/40 mt-2 px-3">
            <span className="text-[8.5px] font-mono uppercase text-[#6b6355] tracking-widest block">PASSAGE ACTUEL</span>
            <p className="text-xs font-serif italic text-[#c9a84c] font-bold mt-1">
              {selectedBook.name} · {selectedChapter}
            </p>
          </div>

          {popularExplanations.length > 0 && (
            <div className="pt-4 border-t border-[#2e2a1e]/40 mt-3 px-3 space-y-2">
              <span className="text-[8.5px] font-mono uppercase text-[#6b6355] tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] animate-pulse"></span>
                Études Hors-ligne ({popularExplanations.length})
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scroller-thin">
                {popularExplanations.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleLoadCachedExplanation(item)}
                    className="w-full text-[#e8e0d0]/90 text-left p-1.5 bg-[#12100c]/80 hover:bg-[#1a1712] border border-[#2e2a1e]/40 hover:border-[#c9a84c]/40 rounded-lg transition duration-150 cursor-pointer text-[10px] space-y-0.5 group block select-none"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-serif font-bold text-[#c9a84c] group-hover:text-white transition">
                        {item.reference}
                      </span>
                      <span className="text-[8px] font-mono text-[#6b6355]">
                        👁️ {item.viewCount}
                      </span>
                    </div>
                    <p className="text-[9px] text-[#6b6355] font-serif truncate">
                      {item.content.replace(/[#*`_[\]]/g, '').slice(0, 45)}...
                    </p>
                  </button>
                ))}
              </div>
              <button
                onClick={async () => {
                  if (confirm("Voulez-vous vider tout le cache d'étude hors-ligne ?")) {
                    await explainCache.clearAll();
                    refreshPopularExplanations();
                  }
                }}
                className="w-full text-center text-[8px] font-mono uppercase text-[#6b6355]/60 hover:text-red-400/90 transition cursor-pointer font-bold"
              >
                Vider le cache hors-ligne
              </button>
            </div>
          )}
        </aside>

        {/* CONTAINER SWITCH FOR THE POWERFUL ACTIVE TABS */}
        <div className="flex-1 flex flex-col min-h-[500px]">
          
          {/* HOME / DASHBOARD GRAPHICAL HUB - BREATHTAKING CONTEMPLATIVE APP HUB */}
          {activeTab === 'home' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm mx-auto p-1 text-left shrink-0"
            >
              <ContemplativeHome 
                onNavigateToTab={(tab) => setActiveTab(tab)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                notesCount={notes.length}
                goalPercent={goalPercent}
                currentStreak={currentStreak}
                readingHistory={readingHistory}
                onNavigateToChapter={handleNavigateChallengeToReader}
                onPlayAudioCurrentChapter={() => speakVerse(0)}
              />
            </motion.div>
          )}

          {/* A. STUDY AND READING MODULE TAB */}
          {activeTab === 'read' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Daily Verse of the day Hero banner */}
              {!isZenMode && (
                <div className="bg-[#12100c] border border-[#2e2a1e] p-6 rounded-[2rem] shadow-soft text-center space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-24 h-24 bg-[#c9a84c]/5 rounded-full blur-2xl"></div>
                  <div className="text-center">
                    <RevelationBadge text="RÉVÉLATION DU JOUR" isCrown={true} />
                  </div>
                  
                  <p className="font-serif italic text-lg leading-relaxed text-[#c9a84c] max-w-2xl mx-auto px-2">
                    « {dailyVerseForCurrentDay.verse.text} »
                  </p>
                  <div className="text-center font-mono text-[10px] tracking-widest text-[#6b6355] uppercase font-bold">
                    {dailyVerseForCurrentDay.verse.book_name} {dailyVerseForCurrentDay.verse.chapter}:{dailyVerseForCurrentDay.verse.verse}
                  </div>
                  
                  <p className="text-xs text-[#a0947f] max-w-xl mx-auto font-sans leading-relaxed">
                    {dailyVerseForCurrentDay.explanation}
                  </p>

                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => {
                        setSelectedBook(BOOKS.find(b => b.id === dailyVerseForCurrentDay.verse.book_id) || BOOKS[0]);
                        setSelectedChapter(dailyVerseForCurrentDay.verse.chapter);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-luxury-button-bg hover:bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/30 rounded-xl text-[10px] font-bold tracking-widest uppercase transition duration-150"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Rejoindre la Lecture</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Daily Chapter Reading Goal & Progress Bar widget */}
              {!isZenMode && (
                <DailyReadingGoal 
                  readingHistory={readingHistory} 
                  readingTimeToday={readingTimeToday}
                  setReadingTimeToday={setReadingTimeToday}
                  dailyTimeGoal={dailyTimeGoal}
                  setDailyTimeGoal={setDailyTimeGoal}
                  goalType={goalType}
                  setGoalType={setGoalType}
                />
              )}

              {/* Dynamic Scripture Selector and Chapter Nav Box */}
              {!isZenMode && (
                <div className="bg-[#12100c] border border-[#2e2a1e] p-5 md:p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    {/* Book dropdown selector */}
                    <div className="flex flex-col text-left">
                      <label className="text-[8px] font-mono uppercase text-[#6b6355] mb-1">Livre Saint</label>
                      <select
                        value={selectedBook.id}
                        onChange={(e) => {
                          const nextBook = BOOKS.find(b => b.id === Number(e.target.value)) || BOOKS[0];
                          setSelectedBook(nextBook);
                          setSelectedChapter(1);
                        }}
                        className="bg-[#0d0b07] border border-[#2e2a1e] text-xs font-serif font-bold text-[#e8e0d0] rounded-xl px-3.5 py-2 outline-none focus:border-[#c9a84c] select-none text-left"
                      >
                        {BOOKS.map((b) => (
                          <option key={b.id} value={b.id} className="font-serif text-[#0d0b07] bg-[#e8e0d0]">
                            {b.name} ({b.testament})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Chapter picker dropdown */}
                    <div className="flex flex-col text-left">
                      <label className="text-[8px] font-mono uppercase text-[#6b6355] mb-1">Chapitre</label>
                      <select
                        value={selectedChapter}
                        onChange={(e) => setSelectedChapter(Number(e.target.value))}
                        className="bg-[#0d0b07] border border-[#2e2a1e] text-xs font-mono font-bold text-[#e8e0d0] rounded-xl px-4 py-2 outline-none focus:border-[#c9a84c] select-none"
                      >
                        {Array.from({ length: selectedBook.chapters_count }, (_, index) => index + 1).map((n) => (
                          <option key={n} value={n} className="font-mono text-[#0d0b07] bg-[#e8e0d0]">
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Mode Selector Pill Swapper */}
                    <div className="flex flex-col text-left">
                      <label className="text-[8px] font-mono uppercase text-[#6b6355] mb-1">Périmètre de lecture</label>
                      <div className="flex bg-[#0d0b07] border border-[#2e2a1e] rounded-xl p-0.5 h-9 items-center">
                        <button
                          onClick={() => setIsContinuousScroll(false)}
                          className={`h-full px-3.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                            !isContinuousScroll 
                              ? 'bg-[#c9a84c] text-[#0d0b07]' 
                              : 'text-[#6b6355] hover:text-[#e8e0d0]'
                          }`}
                          title="Lire chapitre par chapitre"
                        >
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          <span>Chapitre</span>
                        </button>
                        <button
                          onClick={() => setIsContinuousScroll(true)}
                          className={`h-full px-3.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                            isContinuousScroll 
                              ? 'bg-[#c9a84c] text-[#0d0b07]' 
                              : 'text-[#6b6355] hover:text-[#e8e0d0]'
                          }`}
                          title="Défilement continu de tout le livre"
                        >
                          <ScrollText className="w-3.5 h-3.5 shrink-0" />
                          <span>Livre Entier</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Chapter back and forward paging buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handlePreviousChapter}
                      className="p-2 bg-[#0d0b07] hover:bg-luxury-button-bg text-[#c9a84c] border border-[#2e2a1e] rounded-xl transition cursor-pointer"
                      title="Chapitre précédent"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      onClick={handleSummarizeChapter}
                      disabled={loadingSummary}
                      className="h-8 px-3 bg-gradient-to-r from-[#8a6f2e]/10 to-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 rounded-xl text-[10px] font-mono font-bold tracking-wider uppercase transition flex items-center justify-center gap-1 cursor-pointer hover:border-[#c9a84c]/40"
                    >
                      {loadingSummary ? (
                        <div className="w-3.5 h-3.5 rounded-full border border-t-transparent border-[#c9a84c] animate-spin"></div>
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>Résumer le Chapitre</span>
                    </button>

                    <button
                      onClick={handleNextChapter}
                      className="p-2 bg-[#0d0b07] hover:bg-luxury-button-bg text-[#c9a84c] border border-[#2e2a1e] rounded-xl transition cursor-pointer"
                      title="Chapitre suivant"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Integrated offline concordance keyword search in the reader page */}
              {!isZenMode && (
                <>
                  <div className="bg-[#12100c] border border-[#2e2a1e] p-4 sm:p-5 rounded-2xl flex items-center gap-2.5 select-none">
                    <Search className="w-4.5 h-4.5 text-[#6b6355] shrink-0 ml-1" />
                    <input 
                      id="bible-search-input"
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      placeholder="Rechercher localement un verset (ex: berger, paix, foi)..."
                      className="bg-transparent text-xs text-[#e8e0d0] outline-none border-none flex-1 placeholder:text-[#6b6355]"
                    />
                    {searchKeyword ? (
                      <button 
                        onClick={() => setSearchKeyword('')}
                        className="p-1 hover:bg-[#1a1712] rounded-full text-[#6b6355] hover:text-white transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-[8px] font-mono bg-[#1a1712] text-[#6b6355] border border-[#2e2a1e] px-1.5 py-0.5 rounded uppercase">Concinnance</span>
                    )}
                  </div>

                  {/* Secondary results placeholder for localized keywords lookups */}
                  {searchKeyword.trim() !== "" && (
                    <div className="bg-[#12100c] border border-[#2e2a1e] p-4 rounded-2xl space-y-3">
                      <span className="text-[8px] font-mono uppercase tracking-widest text-[#c9a84c] font-black block">Occurrences trouvées pour "{searchKeyword}" :</span>
                      <div className="max-h-60 overflow-y-auto space-y-2 scroller-thin pr-1">
                        {searchLocalVerses(searchKeyword).length === 0 ? (
                          <p className="text-xs text-[#6b6355] italic">Aucune concordance locale trouvée. Essayez un autre mot clé.</p>
                        ) : (
                          searchLocalVerses(searchKeyword).map((v, i) => (
                            <div 
                              key={i}
                              onClick={() => {
                                const target = BOOKS.find(b => b.id === v.book_id);
                                if (target) {
                                  setSelectedBook(target);
                                  setSelectedChapter(v.chapter);
                                  setSearchKeyword('');
                                }
                              }}
                              className="bg-[#0d0b07] hover:bg-[#14120e] p-2.5 rounded-xl border border-[#2e2a1e]/40 transition text-left cursor-pointer space-y-1"
                            >
                              <p className="text-xs text-[#e8e0d0] leading-relaxed font-serif truncate">« {v.text.replace(/\[[HG]\d+\]/g, '')} »</p>
                              <span className="text-[9px] font-mono text-[#c9a84c] block uppercase">{v.book_name} {v.chapter}:{v.verse}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Display chapter summary if queried */}
              {chapterSummary && (
                <div className="bg-[#12100c] border border-[#c9a84c]/20 p-5 rounded-[2rem] text-left space-y-3 shadow-gold-glow animate-fade-slide-up select-text">
                  <div className="flex flex-wrap gap-2 justify-between items-center pb-2 border-b border-[#2e2a1e]/60">
                    <span className="text-[9px] font-mono tracking-widest text-[#c9a84c] uppercase font-black flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#c9a84c] animate-pulse" />
                      <span>Sagesse & Synthèse IA du Chapitre {selectedChapter}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-widest text-[#c9a84c] bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-full select-none">
                        Analyse générée par IA — à vérifier
                      </span>
                      <button 
                        onClick={() => setChapterSummary(null)}
                        className="p-1 hover:bg-[#1a1712] rounded text-[#6b6355] hover:text-white transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="font-sans text-[13.5px] leading-relaxed text-[#c9a84c] whitespace-pre-line prose max-w-none">
                    {cleanBibleMarkdown(chapterSummary)}
                  </div>
                </div>
              )}

              {/* Main Scriptures container */}
              <div className="bg-[#12100c] border border-[#2e2a1e] p-5 rounded-[2.5rem] shadow-soft">
                <div className="flex flex-col gap-4 pb-3 border-b border-[#2e2a1e]/50 mb-4">
                  <div className="flex items-center justify-between select-none">
                    <h3 className="font-serif font-extrabold text-[#c9a84c] text-sm uppercase flex items-center gap-1.5">
                      {isContinuousScroll ? (
                        <>
                          <ScrollText className="w-4.5 h-4.5 text-[#c9a84c]" />
                          <span>{selectedBook.name} · Livre Entier</span>
                          <span className="text-[8px] font-mono px-1.5 py-0.5 bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 uppercase rounded leading-none ml-1">Continu</span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-4.5 h-4.5" />
                          <span>{selectedBook.name} · Chapitre {selectedChapter}</span>
                        </>
                      )}
                    </h3>
                    
                    <div className="flex items-center gap-1.5">
                      <select
                        value={selectedTranslation}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedTranslation(val);
                          try {
                            localStorage.setItem('bible_translation', val);
                          } catch (_) {}
                        }}
                        className="text-[9.5px] font-mono text-[#c9a84c] uppercase tracking-wider bg-[#0d0b07] border border-[#2e2a1e] hover:border-[#c9a84c]/50 px-2.5 py-1 rounded-lg cursor-pointer focus:outline-none focus:border-[#c9a84c] transition"
                      >
                        <option value="local">Louis Segond (Offline)</option>
                        <option value="web">WEB English (Online)</option>
                        <option value="rvr09">RVR09 Spanish (Online)</option>
                        <option value="almeida">Almeida Portuguese (Online)</option>
                        <option value="clementine">Clementine Latin (Online)</option>
                      </select>
                    </div>
                  </div>

                  {/* High-Fidelity Audio Reader Controls */}
                  {!loadingVerses && chapterVerses.length > 0 && (
                    <div className="bg-[#0b0a08] border border-[#2e2a1e]/40 shadow-xl rounded-3xl p-5 md:p-6 flex flex-col gap-5 select-none transition-all duration-300">
                      
                      {/* Top Header Row of Player (Modern and Simplified) */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[#12100c] border border-[#2e2a1e] shadow-inner shrink-0">
                            {isSpeaking && !isPaused ? (
                              <>
                                <span className="absolute inset-0 rounded-full bg-[#c9a84c]/10 animate-ping"></span>
                                <Volume2 className="w-4 h-4 text-[#c9a84c] animate-pulse" />
                              </>
                            ) : (
                              <VolumeX className="w-4 h-4 text-[#6b6355]" />
                            )}
                          </div>
                          <div className="text-left">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#6b6355] block">
                              {isSpeaking && !isPaused ? 'Lecture active' : 'Audio'}
                            </span>
                            <span className="text-xs font-sans font-bold text-[#e8e0d0] block">
                              {isSpeaking 
                                ? `Verset ${chapterVerses[currentSpeakingVerseIndex]?.verse || (currentSpeakingVerseIndex + 1)}` 
                                : "Écouter le chapitre"
                              }
                            </span>
                          </div>
                        </div>

                        {/* Collapsible toggle button */}
                        <button
                          onClick={() => setIsAudioSettingsExpanded(!isAudioSettingsExpanded)}
                          className={`px-3 py-1.5 rounded-xl border text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                            isAudioSettingsExpanded 
                              ? 'bg-[#c9a84c]/10 border-[#c9a84c]/30 text-[#c9a84c]' 
                              : 'bg-[#12100c] border-[#2e2a1e]/60 text-[#a0947f] hover:text-[#e8e0d0]'
                          }`}
                        >
                          <Settings className={`w-3.5 h-3.5 transition-transform duration-300 ${isAudioSettingsExpanded ? 'rotate-45' : ''}`} />
                          <span>{isAudioSettingsExpanded ? "Masquer" : "Réglages"}</span>
                          {isAudioSettingsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Main Transport Control Row (Hero playback controls) */}
                      <div className="flex items-center justify-center gap-5 py-2">
                        {/* Skip Back Button */}
                        <button
                          onClick={() => {
                            if (currentSpeakingVerseIndex > 0) {
                              speakVerse(currentSpeakingVerseIndex - 1);
                            } else {
                              speakVerse(0);
                            }
                          }}
                          disabled={!isSpeaking}
                          className="w-10 h-10 rounded-full bg-[#12100c] hover:bg-[#1a1712]/80 border border-[#2e2a1e] text-[#a0947f] hover:text-[#e8e0d0] disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
                          title="Verset précédent"
                        >
                          <SkipBack className="w-4 h-4" />
                        </button>

                        {/* Unified Play / Pause Golden Hero Trigger */}
                        <button
                          onClick={handlePlayPause}
                          className="w-14 h-14 rounded-full bg-[#c9a84c] text-[#0d0b07] flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-[#c9a84c]/15 hover:shadow-[#c9a84c]/25 border border-white/10"
                          title={isSpeaking && !isPaused ? "Pause" : "Lecture"}
                        >
                          {isSpeaking && !isPaused ? (
                            <Pause className="w-5 h-5 fill-[#0d0b07]" />
                          ) : (
                            <Play className="w-5 h-5 fill-[#0d0b07] ml-0.5" />
                          )}
                        </button>

                        {/* Stop Button */}
                        <button
                          onClick={stopSpeaking}
                          disabled={!isSpeaking}
                          className="w-10 h-10 rounded-full bg-[#12100c] hover:bg-[#1a1712]/80 border border-[#2e2a1e] text-[#a0947f] hover:text-[#e8e0d0] disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
                          title="Arrêter"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                        </button>

                        {/* Skip Forward Button */}
                        <button
                          onClick={() => {
                            if (currentSpeakingVerseIndex < chapterVerses.length - 1) {
                              speakVerse(currentSpeakingVerseIndex + 1);
                            }
                          }}
                          disabled={!isSpeaking || currentSpeakingVerseIndex >= chapterVerses.length - 1}
                          className="w-10 h-10 rounded-full bg-[#12100c] hover:bg-[#1a1712]/80 border border-[#2e2a1e] text-[#a0947f] hover:text-[#e8e0d0] disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
                          title="Verset suivant"
                        >
                          <SkipForward className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Side-by-side Ambient Toggles (Compact switches) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Melody Card */}
                        <div className="bg-[#12100c] border border-[#2e2a1e]/40 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-[#1a1712] border border-[#2e2a1e]/60 text-[#a0947f]">
                              <Music className={`w-4 h-4 ${isMelodyEnabled ? 'text-[#c9a84c]' : ''}`} />
                            </div>
                            <div className="text-left">
                              <span className="text-xs font-sans font-bold text-[#e8e0d0] block">Mélodie Céleste</span>
                              <span className="text-[10px] text-[#6b6355] block">
                                {isMelodyEnabled ? (MELODY_STYLES.find(s => s.id === melodyStyle)?.name || 'Active') : 'Désactivée'}
                              </span>
                            </div>
                          </div>
                          {/* Elegant Apple Switch Toggle */}
                          <button
                            onClick={() => {
                              const nextVal = !isMelodyEnabled;
                              setIsMelodyEnabled(nextVal);
                              try {
                                localStorage.setItem('bible_melody_enabled', String(nextVal));
                              } catch (_) {}
                            }}
                            className={`w-9 h-5.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 focus:outline-none ${
                              isMelodyEnabled ? 'bg-[#c9a84c]' : 'bg-[#1a1712] border border-[#2e2a1e]'
                            }`}
                          >
                            <div className={`w-4.5 h-4.5 rounded-full shadow transition-transform duration-200 ${
                              isMelodyEnabled ? 'translate-x-3.5 bg-[#0d0b07]' : 'translate-x-0 bg-[#6b6355]'
                            }`} />
                          </button>
                        </div>

                        {/* Nature Sounds Card */}
                        <div className="bg-[#12100c] border border-[#2e2a1e]/40 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-[#1a1712] border border-[#2e2a1e]/60 text-[#a0947f]">
                              <span className={`text-sm ${isNatureEnabled ? 'opacity-100' : 'opacity-60'}`}>🌲</span>
                            </div>
                            <div className="text-left">
                              <span className="text-xs font-sans font-bold text-[#e8e0d0] block">Sons de la Nature</span>
                              <span className="text-[10px] text-[#6b6355] block">
                                {isNatureEnabled ? (NATURE_SOUNDS.find(s => s.id === natureSoundType)?.name || 'Actifs') : 'Désactivés'}
                              </span>
                            </div>
                          </div>
                          {/* Elegant Apple Switch Toggle */}
                          <button
                            onClick={() => {
                              const nextVal = !isNatureEnabled;
                              setIsNatureEnabled(nextVal);
                              try {
                                localStorage.setItem('bible_nature_enabled', String(nextVal));
                              } catch (_) {}
                            }}
                            className={`w-9 h-5.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 focus:outline-none ${
                              isNatureEnabled ? 'bg-[#c9a84c]' : 'bg-[#1a1712] border border-[#2e2a1e]'
                            }`}
                          >
                            <div className={`w-4.5 h-4.5 rounded-full shadow transition-transform duration-200 ${
                              isNatureEnabled ? 'translate-x-3.5 bg-[#0d0b07]' : 'translate-x-0 bg-[#6b6355]'
                            }`} />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Secondary Settings Panel */}
                      {isAudioSettingsExpanded && (
                        <div className="pt-4 border-t border-[#2e2a1e]/40 space-y-7 md:space-y-9 animate-fade-in text-left">
                          
                          {/* Voix & Vitesse Group */}
                          <div className="bg-[#12100c]/50 rounded-2xl p-5 md:p-6 border border-[#2e2a1e]/30 space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs">🎙️</span>
                              <h5 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#a0947f]">Voix & Vitesse</h5>
                            </div>

                            {/* playbackRate Selector */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <span className="text-xs text-[#6b6355] font-sans font-medium">Vitesse de lecture</span>
                              <div className="flex bg-[#12100c] border border-[#2e2a1e] rounded-xl p-0.5 self-start sm:self-auto">
                                {[0.8, 1.0, 1.25, 1.5].map((rate) => (
                                  <button
                                    key={rate}
                                    onClick={() => {
                                      setPlaybackRate(rate);
                                      if (isSpeaking && !isPaused) {
                                        speakVerse(currentSpeakingVerseIndex);
                                      }
                                    }}
                                    className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                                      playbackRate === rate 
                                        ? 'bg-[#c9a84c] text-[#0d0b07] shadow-sm font-black' 
                                        : 'text-[#6b6355] hover:text-[#e8e0d0] hover:bg-[#1a1712]/30'
                                    }`}
                                  >
                                    {rate}x
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* voiceGender Selector */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <span className="text-xs text-[#6b6355] font-sans font-medium">Timbre du lecteur</span>
                              <div className="flex bg-[#12100c] border border-[#2e2a1e] rounded-xl p-0.5 self-start sm:self-auto">
                                {[
                                  { label: 'Auto', value: 'auto' },
                                  { label: 'Homme ♂', value: 'male' },
                                  { label: 'Femme ♀', value: 'female' }
                                ].map((genderOption) => (
                                  <button
                                    key={genderOption.value}
                                    onClick={() => {
                                      setVoiceGender(genderOption.value as 'auto' | 'male' | 'female');
                                      try {
                                        localStorage.setItem('bible_voice_gender', genderOption.value);
                                      } catch (_) {}
                                      // Clear precise voice selection to let automatic gender-matching take effect
                                      setSelectedVoiceURI('');
                                      try {
                                        localStorage.removeItem('bible_preferred_voice_uri');
                                      } catch (_) {}

                                      // Invalidate/clear active utterances queue & cancel synthesis to avoid old voice cache playing
                                      if (typeof window !== 'undefined' && window.speechSynthesis) {
                                        window.speechSynthesis.cancel();
                                        (window as any)._activeUtterances = [];
                                      }

                                      if (isSpeaking && currentSpeakingVerseIndex !== -1) {
                                        speakVerse(currentSpeakingVerseIndex);
                                      }
                                    }}
                                    className={`px-3 py-1 text-[10px] font-sans font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                                      voiceGender === genderOption.value 
                                        ? 'bg-[#c9a84c] text-[#0d0b07] shadow-sm font-black' 
                                        : 'text-[#6b6355] hover:text-[#e8e0d0] hover:bg-[#1a1712]/30'
                                    }`}
                                  >
                                    {genderOption.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* rawReading Switch Toggle */}
                            <div className="flex items-center justify-between py-1.5 border-t border-[#2e2a1e]/20">
                              <div className="text-left space-y-0.5">
                                <span className="text-xs font-sans font-bold text-[#e8e0d0] block">Lecture Directe (Anti-bruit)</span>
                                <p className="text-[10px] text-[#6b6355] leading-relaxed">Bypasse le pitch-shifter pour éviter les micro-saccades vocales</p>
                              </div>
                              <button
                                onClick={() => {
                                  const nextVal = !isRawReading;
                                  setIsRawReading(nextVal);
                                }}
                                className={`w-9 h-5.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 focus:outline-none ${
                                  isRawReading ? 'bg-[#c9a84c]' : 'bg-[#1a1712] border border-[#2e2a1e]'
                                }`}
                              >
                                <div className={`w-4.5 h-4.5 rounded-full shadow transition-transform duration-200 ${
                                  isRawReading ? 'translate-x-3.5 bg-[#0d0b07]' : 'translate-x-0 bg-[#6b6355]'
                                }`} />
                              </button>
                            </div>
                          </div>

                          {/* Melody Style & Volume Config (Only visible when melody is enabled) */}
                          {isMelodyEnabled && (
                            <div className="bg-[#12100c]/50 rounded-2xl p-5 md:p-6 border border-[#2e2a1e]/30 space-y-4 animate-fade-in">
                              <div className="flex items-center gap-2 mb-1">
                                <Music className="w-3.5 h-3.5 text-[#a0947f]" />
                                <h5 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#a0947f]">Réglages Mélodie</h5>
                              </div>

                              {/* Style Choices */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-mono text-[#6b6355] uppercase tracking-wider block">Style céleste</span>
                                <div className="flex flex-wrap bg-[#12100c] border border-[#2e2a1e] rounded-xl p-1.5 gap-2 sm:gap-2.5">
                                  {MELODY_STYLES.map((styleOption) => (
                                    <button
                                      key={styleOption.id}
                                      onClick={() => {
                                        setMelodyStyle(styleOption.id);
                                        try {
                                          localStorage.setItem('bible_melody_style', styleOption.id);
                                        } catch (_) {}
                                      }}
                                      className={`px-2.5 py-1 text-[10px] font-sans font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                                        melodyStyle === styleOption.id
                                          ? 'bg-[#c9a84c]/20 text-[#c9a84c] font-black'
                                          : 'text-[#6b6355] hover:text-[#e8e0d0] hover:bg-[#1a1712]/20'
                                      }`}
                                      title={styleOption.description}
                                    >
                                      <span className="text-xs shrink-0">{styleOption.icon}</span>
                                      <span>{styleOption.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Volume range slider */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono text-[#6b6355] uppercase tracking-wider">Volume de l'ambiance</span>
                                  <span className="text-[10px] font-mono text-[#c9a84c] font-bold">
                                    {Math.round(melodyVolume * 250)}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-[#6b6355]">🔈</span>
                                  <input
                                    type="range"
                                    min="0"
                                    max="0.4"
                                    step="0.02"
                                    value={melodyVolume}
                                    onChange={(e) => {
                                      const vol = Number(e.target.value);
                                      setMelodyVolume(vol);
                                      try {
                                        localStorage.setItem('bible_melody_volume', String(vol));
                                      } catch (_) {}
                                    }}
                                    className="flex-1 accent-[#c9a84c] bg-[#12100c] border border-[#2e2a1e] rounded-lg appearance-none h-1 cursor-pointer"
                                  />
                                  <span className="text-xs text-[#6b6355]">🔊</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Nature Style & Volume Config (Only visible when nature is enabled) */}
                          {isNatureEnabled && (
                            <div className="bg-[#12100c]/50 rounded-2xl p-5 md:p-6 border border-[#2e2a1e]/30 space-y-4 animate-fade-in">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs">🌲</span>
                                <h5 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#a0947f]">Réglages Nature</h5>
                              </div>

                              {/* Style Choices */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-mono text-[#6b6355] uppercase tracking-wider block">Ambiance naturelle</span>
                                <div className="flex flex-wrap bg-[#12100c] border border-[#2e2a1e] rounded-xl p-1.5 gap-2 sm:gap-2.5">
                                  {NATURE_SOUNDS.filter(s => s.id !== 'none').map((soundOption) => (
                                    <button
                                      key={soundOption.id}
                                      onClick={() => {
                                        setNatureSoundType(soundOption.id);
                                        try {
                                          localStorage.setItem('bible_nature_type', soundOption.id);
                                        } catch (_) {}
                                      }}
                                      className={`px-2.5 py-1 text-[10px] font-sans font-bold rounded-lg transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                                        natureSoundType === soundOption.id
                                          ? 'bg-[#c9a84c]/20 text-[#c9a84c] font-black'
                                          : 'text-[#6b6355] hover:text-[#e8e0d0] hover:bg-[#1a1712]/20'
                                      }`}
                                      title={soundOption.description}
                                    >
                                      <span className="text-xs shrink-0">{soundOption.icon}</span>
                                      <span>{soundOption.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Volume range slider */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-mono text-[#6b6355] uppercase tracking-wider">Volume de la nature</span>
                                  <span className="text-[10px] font-mono text-[#c9a84c] font-bold">
                                    {Math.round(natureSoundVolume * 100)}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-[#6b6355]">🔈</span>
                                  <input
                                    type="range"
                                    min="0"
                                    max="1.0"
                                    step="0.05"
                                    value={natureSoundVolume}
                                    onChange={(e) => {
                                      const vol = Number(e.target.value);
                                      setNatureSoundVolume(vol);
                                      try {
                                        localStorage.setItem('bible_nature_volume', String(vol));
                                      } catch (_) {}
                                    }}
                                    className="flex-1 accent-[#c9a84c] bg-[#12100c] border border-[#2e2a1e] rounded-lg appearance-none h-1 cursor-pointer"
                                  />
                                  <span className="text-xs text-[#6b6355]">🔊</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Sleep Timer (Veille Spirituelle) Group */}
                          <div className="bg-[#12100c]/50 rounded-2xl p-5 md:p-6 border border-[#2e2a1e]/30 space-y-4">
                            <div className="flex items-center justify-between py-1">
                              <div className="flex items-center gap-2">
                                <Moon className="w-3.5 h-3.5 text-[#a0947f]" />
                                <div className="text-left space-y-0.5">
                                  <span className="text-xs font-sans font-bold text-[#e8e0d0] block">Minuteur de Sommeil</span>
                                  <p className="text-[10px] text-[#6b6355] leading-relaxed">Atténue progressivement les volumes pour le coucher</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5">
                                {isVigilActive && (
                                  <div className="flex items-center gap-1.5 bg-[#c9a84c]/10 border border-[#c9a84c]/30 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold text-[#c9a84c]">
                                    <Timer className="w-3 h-3 animate-spin" />
                                    <span>{Math.floor(vigilTimeRemaining / 60)}:{(vigilTimeRemaining % 60).toString().padStart(2, '0')}</span>
                                  </div>
                                )}
                                <button
                                  onClick={toggleVigilMode}
                                  className={`w-9 h-5.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 focus:outline-none ${
                                    isVigilActive ? 'bg-[#c9a84c]' : 'bg-[#1a1712] border border-[#2e2a1e]'
                                  }`}
                                >
                                  <div className={`w-4.5 h-4.5 rounded-full shadow transition-transform duration-200 ${
                                    isVigilActive ? 'translate-x-3.5 bg-[#0d0b07]' : 'translate-x-0 bg-[#6b6355]'
                                  }`} />
                                </button>
                              </div>
                            </div>

                            {/* Duration selectors if not active */}
                            {!isVigilActive && (
                              <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-[#2e2a1e]/20">
                                <span className="text-[10px] font-mono text-[#6b6355] uppercase tracking-wider">Durée de veille</span>
                                <div className="flex bg-[#12100c] border border-[#2e2a1e] rounded-xl p-0.5">
                                  {[
                                    { label: '20m', val: 20 },
                                    { label: '10m', val: 10 },
                                    { label: '5m', val: 5 },
                                    { label: '1m (Test)', val: 1 }
                                  ].map((opt) => (
                                    <button
                                      key={opt.val}
                                      onClick={() => setVigilDuration(opt.val)}
                                      className={`px-2 py-1 text-[9px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                                        vigilDuration === opt.val 
                                          ? 'bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/20' 
                                          : 'text-[#6b6355] hover:text-[#e8e0d0]'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Navigation & Layout Options (Subtle switches list) */}
                          <div className="bg-[#12100c]/50 rounded-2xl p-5 md:p-6 border border-[#2e2a1e]/30 space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                              <Eye className="w-3.5 h-3.5 text-[#a0947f]" />
                              <h5 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#a0947f]">Affichage & Défilement</h5>
                            </div>

                            {/* Suivi vocal actif switch */}
                            <div className="flex items-center justify-between py-1">
                              <div className="text-left space-y-0.5">
                                <span className="text-xs font-sans font-bold text-[#e8e0d0] block">Suivi vocal automatique</span>
                                <p className="text-[10px] text-[#6b6355] leading-relaxed">Centre l'écran sur le verset prononcé en temps réel</p>
                              </div>
                              <button
                                onClick={() => setIsAutoScrollWithSpeech(prev => !prev)}
                                className={`w-9 h-5.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 focus:outline-none ${
                                  isAutoScrollWithSpeech ? 'bg-[#c9a84c]' : 'bg-[#1a1712] border border-[#2e2a1e]'
                                }`}
                              >
                                <div className={`w-4.5 h-4.5 rounded-full shadow transition-transform duration-200 ${
                                  isAutoScrollWithSpeech ? 'translate-x-3.5 bg-[#0d0b07]' : 'translate-x-0 bg-[#6b6355]'
                                }`} />
                              </button>
                            </div>

                            {/* Défilement continu switch */}
                            <div className="flex items-center justify-between py-1 border-t border-[#2e2a1e]/20 pt-2.5">
                              <div className="text-left space-y-0.5">
                                <span className="text-xs font-sans font-bold text-[#e8e0d0] block">Défilement continu fluide</span>
                                <p className="text-[10px] text-[#6b6355] leading-relaxed">Fait descendre lentement le papyrus sans interruption</p>
                              </div>
                              <button
                                onClick={() => {
                                  const nextVal = !isFluidAutoScrolling;
                                  setIsFluidAutoScrolling(nextVal);
                                }}
                                className={`w-9 h-5.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 focus:outline-none ${
                                  isFluidAutoScrolling ? 'bg-[#c9a84c]' : 'bg-[#1a1712] border border-[#2e2a1e]'
                                }`}
                              >
                                <div className={`w-4.5 h-4.5 rounded-full shadow transition-transform duration-200 ${
                                  isFluidAutoScrolling ? 'translate-x-3.5 bg-[#0d0b07]' : 'translate-x-0 bg-[#6b6355]'
                                }`} />
                              </button>
                            </div>

                            {/* Scroll speed slider if enabled */}
                            {isFluidAutoScrolling && (
                              <div className="pl-4 pt-1 flex items-center justify-between gap-4 animate-fade-in">
                                <span className="text-[10px] font-mono text-[#6b6355] uppercase tracking-wider">Vitesse</span>
                                <div className="flex items-center gap-3 flex-1 justify-end max-w-xs">
                                  <input
                                    type="range"
                                    min="5"
                                    max="60"
                                    step="5"
                                    value={fluidScrollSpeed}
                                    onChange={(e) => {
                                      setFluidScrollSpeed(Number(e.target.value));
                                    }}
                                    className="flex-1 accent-[#c9a84c] bg-[#12100c] border border-[#2e2a1e] rounded-lg appearance-none h-1 cursor-pointer"
                                  />
                                  <span className="text-[10px] font-mono text-[#c9a84c] font-bold w-12 text-right shrink-0">
                                    {fluidScrollSpeed} px/s
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Lecture continue switch */}
                            <div className="flex items-center justify-between py-1 border-t border-[#2e2a1e]/20 pt-2.5">
                              <div className="text-left space-y-0.5">
                                <span className="text-xs font-sans font-bold text-[#e8e0d0] block">Lecture en continu (Chapitres)</span>
                                <p className="text-[10px] text-[#6b6355]">Passe automatiquement au chapitre suivant à la fin</p>
                              </div>
                              <button
                                onClick={() => {
                                  const nextVal = !autoAdvanceChapterSpeech;
                                  setAutoAdvanceChapterSpeech(nextVal);
                                  try {
                                    localStorage.setItem('bible_auto_advance_speech', String(nextVal));
                                  } catch (_) {}
                                }}
                                className={`w-9 h-5.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 focus:outline-none ${
                                  autoAdvanceChapterSpeech ? 'bg-[#c9a84c]' : 'bg-[#1a1712] border border-[#2e2a1e]'
                                }`}
                              >
                                <div className={`w-4.5 h-4.5 rounded-full shadow transition-transform duration-200 ${
                                  autoAdvanceChapterSpeech ? 'translate-x-3.5 bg-[#0d0b07]' : 'translate-x-0 bg-[#6b6355]'
                                }`} />
                              </button>
                            </div>

                            {/* Mode Zen switch */}
                            <div className="flex items-center justify-between py-1 border-t border-[#2e2a1e]/20 pt-2.5">
                              <div className="text-left space-y-0.5">
                                <span className="text-xs font-sans font-bold text-[#e8e0d0] block">Mode Zen</span>
                                <p className="text-[10px] text-[#6b6355]">Masque toute la navigation pour une concentration totale</p>
                              </div>
                              <button
                                onClick={() => setIsZenMode(prev => !prev)}
                                className={`w-9 h-5.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 focus:outline-none ${
                                  isZenMode ? 'bg-[#c9a84c]' : 'bg-[#1a1712] border border-[#2e2a1e]'
                                }`}
                              >
                                <div className={`w-4.5 h-4.5 rounded-full shadow transition-transform duration-200 ${
                                  isZenMode ? 'translate-x-3.5 bg-[#0d0b07]' : 'translate-x-0 bg-[#6b6355]'
                                }`} />
                              </button>
                            </div>
                          </div>

                          {/* Diagnostic du Flux Vocal (TTS) */}
                          <div className="bg-[#12100c]/50 rounded-2xl p-5 md:p-6 border border-[#2e2a1e]/30 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs">🛠️</span>
                                <h5 className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#a0947f]">Diagnostic du Flux Vocal (TTS)</h5>
                              </div>
                              <span className="text-[9px] font-mono bg-[#2e2a1e]/40 px-2 py-0.5 rounded-full text-[#6b6355]">Temps réel</span>
                            </div>

                            {/* Status Indicators Row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {/* Indicator: Play State */}
                              <div className="bg-[#12100c] border border-[#2e2a1e]/40 rounded-xl p-3 flex flex-col gap-1 items-start">
                                <span className="text-[9px] font-mono text-[#6b6355] uppercase tracking-wider">Lecture</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`w-2 h-2 rounded-full ${ttsEngineState.speaking && !ttsEngineState.paused ? 'bg-green-500 animate-pulse' : 'bg-[#6b6355]/40'}`} />
                                  <span className="text-xs font-sans font-bold text-[#e8e0d0]">
                                    {ttsEngineState.speaking && !ttsEngineState.paused ? 'Actif' : 'Inactif'}
                                  </span>
                                </div>
                              </div>

                              {/* Indicator: Pause State */}
                              <div className="bg-[#12100c] border border-[#2e2a1e]/40 rounded-xl p-3 flex flex-col gap-1 items-start">
                                <span className="text-[9px] font-mono text-[#6b6355] uppercase tracking-wider">Pause</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`w-2 h-2 rounded-full ${ttsEngineState.paused ? 'bg-amber-500 animate-pulse' : 'bg-[#6b6355]/40'}`} />
                                  <span className="text-xs font-sans font-bold text-[#e8e0d0]">
                                    {ttsEngineState.paused ? 'En Pause' : 'Non'}
                                  </span>
                                </div>
                              </div>

                              {/* Indicator: Pending State */}
                              <div className="bg-[#12100c] border border-[#2e2a1e]/40 rounded-xl p-3 flex flex-col gap-1 items-start">
                                <span className="text-[9px] font-mono text-[#6b6355] uppercase tracking-wider">En Attente</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`w-2 h-2 rounded-full ${ttsEngineState.pending ? 'bg-blue-500 animate-pulse' : 'bg-[#6b6355]/40'}`} />
                                  <span className="text-xs font-sans font-bold text-[#e8e0d0]">
                                    {ttsEngineState.pending ? 'Oui' : 'Non'}
                                  </span>
                                </div>
                              </div>

                              {/* Indicator: Wake Lock */}
                              <div className="bg-[#12100c] border border-[#2e2a1e]/40 rounded-xl p-3 flex flex-col gap-1 items-start">
                                <span className="text-[9px] font-mono text-[#6b6355] uppercase tracking-wider">Wake Lock</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`w-2 h-2 rounded-full ${ttsEngineState.wakeLockActive ? 'bg-[#c9a84c] animate-pulse' : 'bg-[#6b6355]/40'}`} />
                                  <span className="text-xs font-sans font-bold text-[#e8e0d0]">
                                    {ttsEngineState.wakeLockActive ? 'Maintenu' : 'Inactif'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Queue progression details */}
                            <div className="bg-[#12100c]/80 rounded-xl p-4 border border-[#2e2a1e]/30 space-y-3.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[#6b6355]">Progression du chapitre :</span>
                                <span className="font-mono font-bold text-[#e8e0d0]">
                                  {currentSpeakingVerseIndex !== -1 ? `${currentSpeakingVerseIndex + 1} / ${chapterVerses.length}` : `0 / ${chapterVerses.length}`} versets
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full bg-[#1a1712] rounded-full h-1.5 overflow-hidden border border-[#2e2a1e]/30">
                                <div 
                                  className="bg-gradient-to-r from-[#a0947f] to-[#c9a84c] h-full transition-all duration-300"
                                  style={{ 
                                    width: chapterVerses.length > 0 
                                      ? `${Math.max(0, Math.min(100, ((currentSpeakingVerseIndex + 1) / chapterVerses.length) * 100))}%` 
                                      : '0%' 
                                  }}
                                />
                              </div>

                              {/* Cache & Engine internals info */}
                              <div className="grid grid-cols-2 gap-4 pt-1.5 text-[11px] font-mono text-[#6b6355]">
                                <div>
                                  <span className="block">Mémoire Utterances :</span>
                                  <span className="font-bold text-[#e8e0d0]">{ttsEngineState.activeUtteranceCount} active(s)</span>
                                </div>
                                <div className="text-right">
                                  <span className="block">Statut global :</span>
                                  <span className={`font-bold uppercase ${isSpeaking ? 'text-[#c9a84c]' : 'text-[#6b6355]'}`}>
                                    {isSpeaking ? (isPaused ? 'En Pause' : 'Lecture en cours') : 'En attente de démarrage'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Queue of upcoming verses */}
                            {isSpeaking && currentSpeakingVerseIndex !== -1 && (
                              <div className="space-y-2 text-left">
                                <span className="text-[10px] font-mono text-[#6b6355] uppercase tracking-wider block">Prochaines lectures en file :</span>
                                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                  {chapterVerses.slice(currentSpeakingVerseIndex, currentSpeakingVerseIndex + 3).map((v, i) => {
                                    const realIndex = currentSpeakingVerseIndex + i;
                                    const isCurrent = realIndex === currentSpeakingVerseIndex;
                                    return (
                                      <div 
                                        key={v.id || realIndex}
                                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-left transition-all duration-200 ${
                                          isCurrent 
                                            ? 'bg-[#c9a84c]/5 border-[#c9a84c]/20 text-[#e8e0d0]' 
                                            : 'bg-[#12100c]/30 border-transparent text-[#6b6355]'
                                        }`}
                                      >
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                                          isCurrent 
                                            ? 'bg-[#c9a84c] text-[#0d0b07]' 
                                            : 'bg-[#2e2a1e]/50 text-[#6b6355]'
                                        }`}>
                                          {v.verse}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[11px] font-sans truncate">
                                            {v.text.replace(/\[[HG]\d+\]/g, '').trim()}
                                          </p>
                                          {isCurrent && (
                                            <span className="text-[9px] font-mono text-[#c9a84c] font-semibold animate-pulse block mt-0.5">
                                              🔈 En cours de lecture...
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {chapterVerses.length - 1 - currentSpeakingVerseIndex > 3 && (
                                    <div className="text-center py-1">
                                      <span className="text-[9px] font-mono text-[#6b6355]">
                                        + {chapterVerses.length - 1 - currentSpeakingVerseIndex - 3} autre(s) verset(s) dans le chapitre
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Journaux en Temps Réel du Déroulement Vocal */}
                            <div className="bg-[#12100c]/80 rounded-xl p-3 border border-[#2e2a1e]/30 space-y-2 mt-2">
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                <span className="text-[#a0947f] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] animate-pulse"></span>
                                  Journaux de Diagnostic
                                </span>
                                <button 
                                  onClick={() => {
                                    setTtsLogs([]);
                                    logTts("[TTS Debug] Journaux effacés.");
                                  }}
                                  className="text-[9px] text-[#c9a84c] hover:underline cursor-pointer font-bold flex items-center gap-1"
                                >
                                  Effacer 🗑️
                                </button>
                              </div>
                              <div className="space-y-1 max-h-[110px] overflow-y-auto text-[9.5px] font-mono text-left pr-1 scrollbar-thin scrollbar-thumb-[#2e2a1e] scrollbar-track-transparent">
                                {ttsLogs.length === 0 ? (
                                  <span className="text-[#6b6355] italic block py-1.5 text-center">Aucun événement enregistré. Lancez l'écoute pour générer des diagnostics.</span>
                                ) : (
                                  ttsLogs.map((logStr, idx) => {
                                    const isError = logStr.toLowerCase().includes('error') || logStr.toLowerCase().includes('onerror') || logStr.toLowerCase().includes('failed');
                                    const isAction = logStr.includes('Action') || logStr.includes('cancel');
                                    const isEvent = logStr.includes('Event');
                                    return (
                                      <div 
                                        key={idx} 
                                        className={`py-0.5 border-b border-[#2e2a1e]/15 break-all last:border-0 leading-relaxed ${
                                          isError ? 'text-red-400 font-bold' : isAction ? 'text-blue-400' : isEvent ? 'text-[#c9a84c]' : 'text-[#a0947f]'
                                        }`}
                                      >
                                        {logStr}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  )}
                </div>

                {loadingVerses ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-3 select-none">
                    <div className="w-8 h-8 rounded-full border-t-2 border-[#c9a84c] animate-spin"></div>
                    <p className="text-xs font-mono text-[#6b6355] uppercase tracking-wider">Mise au jour du papyrus...</p>
                  </div>
                ) : loadingError ? (
                  <div className="py-16 px-6 rounded-2xl bg-rose-950/10 border border-rose-900/20 text-center space-y-3 select-none animate-fade-in">
                    <AlertCircle className="w-8 h-8 text-rose-500 mx-auto opacity-80" />
                    <h4 className="text-sm font-bold text-rose-400 font-sans">Texte indisponible</h4>
                    <p className="text-xs text-rose-300 max-w-md mx-auto leading-relaxed">{loadingError}</p>
                  </div>
                ) : chapterVerses.length === 0 ? (
                  <div className="py-20 text-center space-y-2 select-none animate-fade-in">
                    <p className="text-xs font-mono text-[#6b6355] uppercase tracking-wider">Aucun verset disponible</p>
                  </div>
                ) : (
                  <motion.div 
                    key={`${selectedBook.id}_${selectedChapter}_${selectedTranslation}_${isContinuousScroll}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-1"
                  >
                    {chapterVerses.map((item, idx) => {
                      const noteInfo = getVerseHasNote(item);
                      const verseUniqueId = `${item.book_id}_${item.chapter}_${item.verse}`;
                      
                      return (
                        <VerseItem 
                          key={verseUniqueId}
                          verse={item}
                          isFavorite={getVerseHasBookmark(item)}
                          onToggleFavorite={handleToggleFavorite}
                          onExplain={handleExplainVerse}
                          onStrongClick={handleStrongSelectionCode}
                          textSize={textSize}
                          lineHeight={textSize * 1.62}
                          isSelected={selectedVerseId === verseUniqueId}
                          onTap={() => {
                            setSelectedVerseId(selectedVerseId === verseUniqueId ? null : verseUniqueId);
                          }}
                          hasNote={noteInfo.hasNote}
                          noteText={noteInfo.text}
                          noteAudio={noteInfo.audio}
                          emotionAnalysis={noteInfo.emotionAnalysis}
                          onSaveNote={handleSaveSpiritualNote}
                          isCurrentSpoken={currentSpeakingVerseIndex === idx}
                          isLastReadTarget={targetResumeVerseNum === item.verse}
                          isLastRead={lastReadVerseId === verseUniqueId || (!!currentChapterHistoryRecord?.last_verse && currentChapterHistoryRecord.last_verse === item.verse)}
                          index={idx}
                        />
                      );
                    })}

                    {isContinuousScroll && (
                      <div className="mt-6 p-5 rounded-2xl bg-[#0d0b07] border border-[#2e2a1e] text-center space-y-3 shadow-inner select-none animate-fade-in">
                        {Math.max(...loadedChapters) < selectedBook.chapters_count ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-3.5 h-3.5 rounded-full border-t-2 border-[#c9a84c] animate-spin"></div>
                              <span className="text-[10px] font-mono font-medium text-[#c9a84c] uppercase tracking-wider">Défilement continu · Chapitre {Math.max(...loadedChapters) + 1} se prépare...</span>
                            </div>
                            <button
                              onClick={() => {
                                const maxCh = Math.max(...loadedChapters);
                                if (maxCh < selectedBook.chapters_count) {
                                  setLoadedChapters(prev => [...prev, maxCh + 1]);
                                }
                              }}
                              className="px-4 py-2 bg-[#1a1712] hover:bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 hover:border-[#c9a84c]/40 rounded-xl text-[10px] font-bold tracking-widest uppercase transition duration-150 cursor-pointer"
                            >
                              📖 Charger le Chapitre {Math.max(...loadedChapters) + 1} manuellement
                            </button>
                          </div>
                        ) : (
                          <div className="py-2">
                            <Sparkles className="w-5 h-5 text-[#c9a84c]/60 mx-auto mb-1 animate-pulse" />
                            <p className="font-serif italic text-xs text-[#c9a84c]/80 font-bold">« Fin du Livre Saint de {selectedBook.name} »</p>
                            <p className="text-[8px] font-mono text-[#6b6355] uppercase mt-1">Tous les {selectedBook.chapters_count} chapitres ont été chargés dans ce défilement continu.</p>
                          </div>
                        )}
                        <div id="continuous-scroll-trigger" className="h-[2px] w-full mt-2"></div>
                      </div>
                    )}
                  </motion.div>
                )}
                
                {/* Chapter study validation */}
                {!loadingVerses && (
                  <div className="mt-8 pt-5 border-t border-[#2e2a1e]/55 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
                    <div className="text-left">
                      <p className="text-[10px] font-serif font-bold text-[#c9a84c]">Avez-vous complété cette lecture ?</p>
                      <p className="text-[9px] font-mono text-[#6b6355] uppercase">Marquer comme lu enregistre votre fidelité et vos streaks</p>
                    </div>
                    
                    <button
                      onClick={(e) => markCurrentChapterRead(false, e.currentTarget)}
                      className={`px-4 py-2 text-[10px] font-mono font-bold tracking-wider uppercase rounded-xl border cursor-pointer transition-all duration-200 flex items-center gap-1.5 ${
                        readingHistory.some(h => h.book_id === selectedBook.id && h.chapter === selectedChapter)
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                          : 'bg-emerald-950/15 hover:bg-emerald-950/35 border-emerald-500/25 text-emerald-400/80 hover:text-emerald-400'
                      }`}
                      title={readingHistory.some(h => h.book_id === selectedBook.id && h.chapter === selectedChapter) ? "Lecture déjà complétée et enregistrée. Cliquez pour retirer." : "Marquer ce chapitre comme lu et enregistrer la progression."}
                    >
                      <Check className={`w-3.5 h-3.5 transition-transform duration-200 ${readingHistory.some(h => h.book_id === selectedBook.id && h.chapter === selectedChapter) ? 'scale-110' : ''}`} />
                      <span>{readingHistory.some(h => h.book_id === selectedBook.id && h.chapter === selectedChapter) ? 'COMPLÉTÉ ET ENREGISTRÉ' : 'MARQUER LECTURE FAITE'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Interactive Slide-Up panel / bottom tray for Single Verse Exegesis detailed exploration */}
              <AnimatePresence>
                {activeExplainVerse && (
                  <div className="fixed inset-0 bg-black/85 flex items-center justify-center px-4 py-8 z-50 select-none animate-fade-in">
                    <motion.div
                      initial={{ scale: 0.94, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.94, opacity: 0 }}
                      className="w-full max-w-3xl bg-[#12100c] border border-[#2e2a1e] p-6 rounded-[2.2rem] text-left space-y-4 shadow-gold-intense overflow-hidden max-h-[88vh] flex flex-col"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-[#2e2a1e] shrink-0">
                        <div className="space-y-0.5">
                          <span className="text-[8.5px] font-mono text-[#6b6355] uppercase tracking-widest font-black flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#c9a84c] animate-pulse" />
                            Espace d'étude et d'Analyse
                          </span>
                          <h4 className="font-serif font-extrabold text-[#c9a84c] text-sm truncate uppercase pr-4">
                            {activeExplainVerse.book_name} {activeExplainVerse.chapter}:{activeExplainVerse.verse}
                          </h4>
                        </div>
                        <button 
                          onClick={() => setActiveExplainVerse(null)}
                          className="p-1.5 bg-[#1a1712] hover:bg-[#2e2a1e] border border-[#2e2a1e] hover:text-white rounded-lg transition text-[#6b6355] cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Studio Tab selectors */}
                      <div className="flex border-b border-[#2e2a1e]/30 py-0.5 gap-2 shrink-0">
                        <button
                          onClick={() => setExegesisTab('exegesis')}
                          className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-mono font-bold uppercase transition duration-150 cursor-pointer ${
                            exegesisTab === 'exegesis'
                              ? 'border-[#c9a84c] text-[#c9a84c]'
                              : 'border-transparent text-[#6b3a1a]/60 text-[#6b6355] hover:text-[#e8e0d0]'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Exégèse IA</span>
                        </button>
                        <button
                          onClick={() => setExegesisTab('compare')}
                          className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-mono font-bold uppercase transition duration-150 cursor-pointer ${
                            exegesisTab === 'compare'
                              ? 'border-[#c9a84c] text-[#c9a84c]'
                              : 'border-transparent text-[#6b6355] hover:text-[#e8e0d0]'
                          }`}
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Étude Comparative</span>
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-1 scroller-thin space-y-4 select-text selection:bg-[#c9a84c]/20">
                        {exegesisTab === 'exegesis' ? (
                          <>
                            <div className="bg-[#0f0d09] border border-[#2e2a1e] p-4.5 rounded-2xl italic font-reading text-[15.5px] text-luxury-text-primary leading-relaxed px-5">
                              « {activeExplainVerse.text.replace(/\[[HG]\d+\]/g, '')} »
                            </div>

                            {isExplanationCached && !loadingExplanation && (
                              <div className="flex items-center gap-2 px-3.5 py-2 bg-[#0c2415]/75 border border-emerald-500/30 text-emerald-400 rounded-xl text-[10px] font-mono animate-fade-in-down">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>Disponible hors-ligne • Cette étude est sécurisée localement dans votre cache d'explications IndexedDB.</span>
                              </div>
                            )}

                            {loadingExplanation ? (
                              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                                <div className="w-7 h-7 rounded-full border-t-2 border-[#c9a84c] animate-spin"></div>
                                <p className="text-[10px] font-mono text-[#6b6355] uppercase tracking-wider animate-pulse">Déchiffrement herméneutique...</p>
                              </div>
                            ) : (
                              <div className="space-y-4 animate-fade-slide-up">
                                {/* Analysis card container */}
                                <AnalysisCard 
                                  type="linguistic"
                                  title="Analyse Exégétique IA"
                                  content={verseExplanation || "Détails non fournis par Gemini."}
                                  // Parse some strong codes from original text for interaction
                                  strongWords={
                                    activeExplainVerse.text.includes('[H') || activeExplainVerse.text.includes('[G')
                                      ? (activeExplainVerse.text.match(/\[[HG]\d+\]/g) || []).map(code => {
                                          const cleaned = code.replace('[', '').replace(']', '');
                                          return { word: cleaned.startsWith('H') ? 'Racine Hébraïque' : 'Grec Originel', code: cleaned };
                                        })
                                      : []
                                  }
                                  onStrongPress={handleStrongSelectionCode}
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <VerseComparison verse={activeExplainVerse} />
                        )}
                      </div>

                      <div className="border-t border-[#2e2a1e]/60 pt-3 flex justify-end shrink-0">
                        <button
                          onClick={() => setActiveExplainVerse(null)}
                          className="px-5 py-2 bg-[#0d0b07] border border-[#2e2a1e] text-[10px] uppercase tracking-wider font-mono font-bold hover:text-white rounded-lg transition cursor-pointer"
                        >
                          Fermer
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* B. CONCORDANCE AND STRONG LEXICON DICTIONARY TAB */}
          {activeTab === 'dictionary' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <StrongLexicon 
                onNavigateToChapter={handleNavigateChallengeToReader}
                onExplainVerse={(verse) => {
                  setSelectedBook(BOOKS.find(b => b.id === verse.book_id) || BOOKS[0]);
                  setSelectedChapter(verse.chapter);
                  setActiveTab('read');
                  setSelectedVerseId(`${verse.book_id}_${verse.chapter}_${verse.verse}`);
                }}
                highlightedCode={targetedStrongCode}
                onClearHighlight={() => setTargetedStrongCode(null)}
              />
            </motion.div>
          )}

          {/* DYNAMIC BIBLE DICTIONARY / ENCYCLOPEDIA TAB */}
          {activeTab === 'encyclopedia' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <BibleDictionary 
                onSearchReference={(reference) => {
                  // Reference looks like: "Exode 2:10" or "Genèse 15:1"
                  const parts = reference.trim().split(' ');
                  if (parts.length >= 2) {
                    const lastPart = parts[parts.length - 1];
                    const bookName = parts.slice(0, parts.length - 1).join(' ');
                    
                    const subParts = lastPart.split(':');
                    const chapterNum = parseInt(subParts[0], 10) || 1;
                    const verseNum = subParts[1] ? parseInt(subParts[1], 10) : null;

                    const foundBook = BOOKS.find(b => b.name.toLowerCase() === bookName.toLowerCase() || b.slug.toLowerCase() === bookName.toLowerCase());
                    if (foundBook) {
                      setSelectedBook(foundBook);
                      setSelectedChapter(chapterNum);
                      setActiveTab('read');
                      if (verseNum) {
                        setSelectedVerseId(`${foundBook.id}_${chapterNum}_${verseNum}`);
                      }
                    } else {
                      // Fallback try simple matching
                      const partialBook = BOOKS.find(b => b.name.toLowerCase().includes(bookName.toLowerCase()));
                      if (partialBook) {
                        setSelectedBook(partialBook);
                        setSelectedChapter(chapterNum);
                        setActiveTab('read');
                        if (verseNum) {
                          setSelectedVerseId(`${partialBook.id}_${chapterNum}_${verseNum}`);
                        }
                      }
                    }
                  }
                }}
              />
            </motion.div>
          )}

          {/* C. INTERACTIVE CONVERSATIONAL BIBLICAL CHATBOT COMPANION */}
          {activeTab === 'assistant' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col bg-[#12100c] border border-[#2e2a1e] rounded-[2.5rem] shadow-soft overflow-hidden h-[600px]"
            >
              <div className="bg-[#1a1712] border-b border-[#2e2a1e]/80 py-3.5 px-5 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2.5">
                  <div className="w-8.5 h-8.5 rounded-full bg-luxury-button-bg border border-[#c9a84c]/20 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-[#c9a84c]" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-serif font-extrabold text-sm text-[#e8e0d0] tracking-wide">Assistant Érudit</h3>
                    <p className="text-[9.5px] font-mono text-[#c9a84c] uppercase font-bold tracking-wider">Guidage Théologique & Pastoral</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (window.confirm("Voulez-vous réinitialiser votre session d'étude chrétienne active ?")) {
                      setChatMessages([
                        { role: 'model', content: "Paix! Une nouvelle halte commence. Comment désirez-vous consolider votre théologie aujourd'hui ?" }
                      ]);
                    }
                  }}
                  className="px-2.5 py-1 hover:bg-red-500/10 hover:text-red-400 border border-[#2e2a1e] rounded-lg text-[10px] font-mono tracking-wider uppercase transition cursor-pointer text-[#6b6355]"
                >
                  Effacer
                </button>
              </div>

              {/* Chat screen lists */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 scroller-thin text-left selection:bg-[#c9a84c]/20 select-text">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-start gap-3.5 max-w-[85%] ${
                      msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                    }`}
                  >
                    {/* Tiny avatar mark */}
                    <div className={`w-7 h-7 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold border ${
                      msg.role === 'user' 
                        ? 'bg-[#1a1712] border-[#2e2a1e] text-[#6b6355]' 
                        : 'bg-luxury-button-bg border-[#c9a84c]/20 text-[#c9a84c]'
                    }`}>
                      {msg.role === 'user' ? 'P' : 'IA'}
                    </div>

                    <div className={`p-4 rounded-3xl text-[14.5px] leading-[23px] whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-[#1a1712] text-luxury-text-primary border border-[#2e2a1e] font-sans'
                        : 'bg-[#0d0b07] text-luxury-text-primary/95 border border-[#2e2a1e]/45 rounded-tl-none font-reading'
                    }`}>
                      {msg.role === 'user' ? msg.content : cleanBibleMarkdown(msg.content)}
                    </div>
                  </div>
                ))}
                
                {loadingChat && (
                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 rounded-xl bg-luxury-button-bg border border-[#c9a84c]/20 flex items-center justify-center text-xs font-bold shrink-0">
                      IA
                    </div>
                    <div className="bg-[#000]/20 p-3 rounded-2xl flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-[#c9a84c] rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-[#c9a84c] rounded-full animate-bounce delay-100"></div>
                      <div className="w-1.5 h-1.5 bg-[#c9a84c] rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions block helper */}
              <div className="px-4 py-2 border-t border-[#2e2a1e]/30 bg-[#0f0e0b] overflow-x-auto flex gap-2 select-none scroller-none shrink-0">
                {[
                  "Explique le concept d'Alliance",
                  "Conseille de la force contre l'anxiété",
                  "Qui est l'auteur de l'Évangile de Jean ?",
                  "Psaumes de reconnaissance"
                ].map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setChatInput(s);
                    }}
                    className="shrink-0 px-3 py-1 bg-[#1a1712] hover:bg-[#c9a84c]/10 text-[#6b6355] hover:text-[#c9a84c] border border-[#2e2a1e] rounded-full text-[10px] font-sans transition cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Chat Input form shelf */}
              <form onSubmit={handleSendChatMessage} className="bg-[#1a1712] border-t border-[#2e2a1e] p-3 flex gap-2.5 shrink-0 select-none">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Écrivez votre question théologique ou spirituelle..."
                  className="bg-[#0d0b07] border border-[#2e2a1e] focus:border-[#c9a84c] text-xs text-[#e8e0d0] rounded-xl px-4 py-3 outline-none flex-1 placeholder:text-[#6b6355]"
                />
                
                <button
                  type="submit"
                  disabled={loadingChat || !chatInput.trim()}
                  className="px-5 py-3 bg-gold-gradient disabled:opacity-50 text-[#0d0b07] hover:opacity-95 font-serif font-extrabold text-[11px] tracking-widest uppercase rounded-xl transition duration-150 cursor-pointer shadow-md shrink-0 flex items-center justify-center gap-1"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-[#0d0b07]" />
                  <span>Poser</span>
                </button>
              </form>
            </motion.div>
          )}

          {/* D. DISCOVER, READING PLANS, STATS AND REMINDERS TABS */}
          {activeTab === 'challenges' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Daily Chapter Reading Goal & Progress Bar widget */}
              <DailyReadingGoal 
                readingHistory={readingHistory} 
                readingTimeToday={readingTimeToday}
                setReadingTimeToday={setReadingTimeToday}
                dailyTimeGoal={dailyTimeGoal}
                setDailyTimeGoal={setDailyTimeGoal}
                goalType={goalType}
                setGoalType={setGoalType}
              />

              {/* Recently Read Chapters chronological history list */}
              <RecentlyReadChapters 
                readingHistory={readingHistory} 
                onNavigateToChapter={handleNavigateChallengeToReader} 
              />

              {/* Daily Reminder Scheduler widget */}
              <DailyReminder />

              {/* Weekly Study Activity AreaChart */}
              <StudyStatsChart readingHistory={readingHistory} />

              {/* Reading Plans Core challenges mapping module */}
              <ReadingChallenges 
                readingHistory={readingHistory} 
                onNavigateToChapter={handleNavigateChallengeToReader}
              />
            </motion.div>
          )}

          {/* E. MEMORIZATION SACRED MODULE TAB */}
          {activeTab === 'memorize' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <MemorizeModule 
                favorites={favorites}
                onNavigateToVerse={handleNavigateVerseToReader}
              />
            </motion.div>
          )}

          {/* F. SPIRITUAL NOTES JOURNAL & MANAGEMENT TAB */}
          {activeTab === 'notes' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <SpiritualNotesManager 
                notes={notes}
                onNavigateToVerse={handleNavigateVerseToReader}
                onSaveNote={handleSaveSpiritualNote}
              />
            </motion.div>
          )}

        </div>
      </main>

      {/* GLOBAL FIXED BOTTOM NAVIGATION BAR */}
      {/* "Il ne doit y avoir qu'une seule barre de navigation en bas, fixe (sticky/fixed), avec ces éléments : [Accueil, Étudier, Bibliothèque, Notifications]" */}
      {!isZenMode && (
        <nav className="fixed bottom-0 inset-x-0 bg-[#050403]/95 backdrop-blur-md border-t border-[#2e2a1e] py-1.5 px-2 flex justify-around z-40 select-none shadow-gold-glow">
          <button
            onClick={() => {
              setActiveTab('home');
              setIsGlobalNotifOpen(false);
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'home' && !isGlobalNotifOpen ? 'text-[#c9a84c] font-black scale-105' : 'text-[#6b6355] hover:text-[#e8e0d0]'
            }`}
          >
            <Home className="w-5 h-5 shrink-0" />
            <span className="text-[8.5px] font-medium font-mono uppercase tracking-widest">Accueil</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('read');
              setIsGlobalNotifOpen(false);
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'read' && !isGlobalNotifOpen ? 'text-[#c9a84c] font-black scale-105' : 'text-[#6b6355] hover:text-[#e8e0d0]'
            }`}
          >
            <BookOpen className="w-5 h-5 shrink-0" />
            <span className="text-[8.5px] font-medium font-mono uppercase tracking-widest">Étudier</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('notes');
              setIsGlobalNotifOpen(false);
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'notes' && !isGlobalNotifOpen ? 'text-[#c9a84c] font-black scale-105' : 'text-[#6b6355] hover:text-[#e8e0d0]'
            }`}
          >
            <Library className="w-5 h-5 shrink-0" />
            <span className="text-[8.5px] font-medium font-mono uppercase tracking-widest">Bibliothèque</span>
          </button>

          <button
            onClick={() => setIsGlobalNotifOpen(prev => !prev)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all cursor-pointer ${
              isGlobalNotifOpen ? 'text-[#c9a84c] font-black scale-105' : 'text-[#6b6355] hover:text-[#e8e0d0]'
            }`}
          >
            <div className="relative">
              <Bell className="w-5 h-5 shrink-0" />
              <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#c9a84c] rounded-full animate-pulse" />
            </div>
            <span className="text-[8.5px] font-medium font-mono uppercase tracking-widest">Notifs</span>
          </button>
        </nav>
      )}

      {/* GLOBAL NOTIFICATIONS PANEL BOTTOM DRAWER */}
      <AnimatePresence>
        {isGlobalNotifOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGlobalNotifOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-xs pointer-events-auto cursor-pointer"
            />
            
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative bg-[#0d0b07] border-t border-[#c9a84c]/30 rounded-t-2xl p-5 pb-24 space-y-4 max-h-[80%] overflow-y-auto no-scrollbar pointer-events-auto max-w-xl mx-auto w-full shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#2e2a1e] pb-2.5">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-5 h-5 text-[#c9a84c] animate-bounce" />
                  <span className="font-serif font-black text-xs text-[#c9a84c] uppercase tracking-wider">Messages de Grâce & Rappels</span>
                </div>
                <button 
                  onClick={() => setIsGlobalNotifOpen(false)}
                  className="w-7 h-7 rounded-full bg-[#12100c] flex items-center justify-center text-[#6b6355] hover:text-[#e8e0d0] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Notification list layout */}
              <div className="space-y-2.5">
                {[
                  { id: 1, title: "Méditation Matinale", text: "Prenez 3 minutes de respiration sacrée avant votre lecture quotidienne.", time: "Aujourd'hui, 8h00" },
                  { id: 2, title: "Plan de Lecture", text: "Félicitations pour votre fidélité sur votre plan d'étude spirituel.", time: "Hier" },
                  { id: 3, title: "Sagesse d'en Haut", text: "La Parole de Dieu est une lampe à vos pieds, et une lumière sur votre sentier.", time: "Il y a 2 jours" }
                ].map(item => (
                  <div 
                    key={item.id} 
                    className="p-3.5 bg-[#12100c]/80 border border-[#2e2a1e]/60 rounded-xl space-y-1 text-left"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-serif font-extrabold text-[11px] text-[#e8e0d0]">{item.title}</h4>
                      <span className="text-[8px] font-mono text-[#6b6355]">{item.time}</span>
                    </div>
                    <p className="text-[10.5px] text-[#807664] leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setIsGlobalNotifOpen(false)}
                className="w-full py-2.5 bg-[#c9a84c]/10 text-xs font-mono uppercase text-[#c9a84c] border border-[#c9a84c]/20 rounded-xl hover:bg-[#c9a84c]/20 cursor-pointer"
              >
                Fermer le sanctuaire
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Zen Mode controls when active */}
      {isZenMode && (
        <div id="zen-mode-controls" className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 bg-[#050403]/90 backdrop-blur-md border border-[#c9a84c]/40 p-2 rounded-2xl shadow-gold-glow animate-fade-in select-none">
          <button
            onClick={handlePreviousChapter}
            className="p-1.5 hover:bg-[#1a1712] text-[#c9a84c] rounded-xl transition cursor-pointer"
            title="Chapitre précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-[10px] font-mono font-bold text-[#c9a84c] px-2 font-serif text-center min-w-[100px] truncate">
            {selectedBook.name} · {selectedChapter}
          </span>

          <button
            onClick={handleNextChapter}
            className="p-1.5 hover:bg-[#1a1712] text-[#c9a84c] rounded-xl transition cursor-pointer"
            title="Chapitre suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-[#2e2a1e] mx-1"></div>

          <button
            onClick={() => setIsZenMode(false)}
            className="px-3 py-1.5 bg-[#c9a84c] hover:bg-[#b0913b] text-black text-[9px] font-mono font-bold uppercase tracking-wider rounded-xl transition duration-150 flex items-center gap-1.5 cursor-pointer"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Quitter</span>
          </button>
        </div>
      )}

    </div>
  );
}
