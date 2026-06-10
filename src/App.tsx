import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  MessageSquare, 
  Heart, 
  Home, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Copy, 
  FileText, 
  Send, 
  Activity, 
  X,
  BookMarked,
  Crown,
  BookOpenCheck,
  Globe,
  Settings,
  HelpCircle,
  Eye,
  Repeat
} from 'lucide-react';
import { Verse, Book as BibleBook, StrongEntry, FavoriteVerse, ReadingHistory, VerseNote } from './types/bible';
import { 
  BOOKS, 
  STRONG_ENTRIES, 
  getDailyVerseForToday, 
  searchLocalVerses,
  isSqliteInitialized,
  initializeSqliteDatabase,
  querySqliteChapter,
  resetSqliteDatabase
} from './data/bibleData';

// Premium custom design system components
import { VerseItem } from './components/VerseItem';
import { VerseQuote } from './components/VerseQuote';
import { AnalysisCard } from './components/AnalysisCard';
import { ContextSection } from './components/ContextSection';
import { TopBar } from './components/TopBar';
import { RevelationBadge } from './components/RevelationBadge';
import { ReadingChallenges } from './components/ReadingChallenges';
import { DailyReminder } from './components/DailyReminder';
import { StudyStatsChart } from './components/StudyStatsChart';
import { StrongLexicon } from './components/StrongLexicon';
import { MAPPED_STRONG_ENTRIES_DIC } from './data/strongLexiconData';

const categoryTitles: Record<string, string> = {
  pentateuque: "LE PENTATEUQUE",
  historique: "LIVRES HISTORIQUES",
  poetique: "SAGESSE & POÉSIE",
  prophetique: "LIVRES PROPHÉTIQUES",
  evangile: "LES ÉVANGILES",
  epitre: "LES ÉPÎTRES",
  apocalypse: "LA RÉVÉLATION"
};

export default function App() {
  // SQLite Database setup states
  const [sqliteDbReady, setSqliteDbReady] = useState<boolean>(isSqliteInitialized());
  const [sqliteProgress, setSqliteProgress] = useState<number>(0);
  const [sqliteStatusText, setSqliteStatusText] = useState<string>("");

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'home' | 'read' | 'search' | 'ai' | 'favorites' | 'lexicon'>('home');
  
  // 3-Step sacred Bible Navigation states
  const [isNavigating, setIsNavigating] = useState<boolean>(true);
  const [navTestament, setNavTestament] = useState<'AT' | 'NT'>('AT');
  const [navBook, setNavBook] = useState<BibleBook | null>(BOOKS[18]); // Pre-selected to Psaumes (id: 19, index: 18)
  const [navChapter, setNavChapter] = useState<number | null>(23); // Pre-selected Psaumes 23
  
  // Reading Mode State
  const [selectedBook, setSelectedBook] = useState<BibleBook>(BOOKS[18]); // Default to Psaumes (id: 19, index: 18)
  const [selectedChapter, setSelectedChapter] = useState<number>(23); // Default Psaumes 23
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');
  const [selectedVerseNum, setSelectedVerseNum] = useState<number | null>(null); // For elegant tap to reveal verse action bar
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loadingVerses, setLoadingVerses] = useState<boolean>(false);
  const [verseError, setVerseError] = useState<string | null>(null);

  // Settings State
  const [textSize, setTextSize] = useState<number>(17); // font-size in pixels

  // Focus Mode State to read scriptures distraction-free
  const [isFocusMode, setIsFocusMode] = useState<boolean>(() => {
    try {
      const savedFocus = localStorage.getItem('bible_focus_mode');
      return savedFocus === 'true';
    } catch (e) {}
    return false;
  });

  const toggleFocusMode = () => {
    const nextMode = !isFocusMode;
    setIsFocusMode(nextMode);
    localStorage.setItem('bible_focus_mode', String(nextMode));
  };

  // Derived state to determine if actual Focus Mode layout should be presented (only in Lecture)
  const isActualFocusMode = isFocusMode && activeTab === 'read';

  // Theme state: 'auto' | 'sepia' | 'night'
  const [themeMode, setThemeMode] = useState<'auto' | 'sepia' | 'night'>(() => {
    try {
      const savedTheme = localStorage.getItem('bible_theme_mode');
      if (savedTheme === 'sepia' || savedTheme === 'night' || savedTheme === 'auto') {
        return savedTheme;
      }
    } catch (e) {}
    return 'auto';
  });

  // Derived state to determine if active theme should be 'sepia' or 'night'
  const [resolvedTheme, setResolvedTheme] = useState<'sepia' | 'night'>('night');

  useEffect(() => {
    const evaluateTheme = () => {
      if (themeMode === 'sepia') {
        setResolvedTheme('sepia');
      } else if (themeMode === 'night') {
        setResolvedTheme('night');
      } else {
        // Auto mode: check prefers-color-scheme & local hour
        const hour = new Date().getHours();
        const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        let isDay = true;
        if (prefersDark) {
          isDay = false;
        } else if (prefersLight) {
          isDay = true;
        } else {
          // Standard day time: 7 AM to 7 PM (7h to 19h)
          isDay = hour >= 7 && hour < 19;
        }
        setResolvedTheme(isDay ? 'sepia' : 'night');
      }
    };

    evaluateTheme();

    // Listeners for system changes & hour intervals
    const mediaQueryLight = window.matchMedia('(prefers-color-scheme: light)');
    const mediaQueryDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    const onChange = () => evaluateTheme();
    
    mediaQueryLight.addEventListener('change', onChange);
    mediaQueryDark.addEventListener('change', onChange);

    // Ticker every 10 seconds to keep track of evening/day transitions
    const interval = setInterval(evaluateTheme, 10000);

    return () => {
      mediaQueryLight.removeEventListener('change', onChange);
      mediaQueryDark.removeEventListener('change', onChange);
      clearInterval(interval);
    };
  }, [themeMode]);

  // Apply resolvedTheme class to body element
  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'sepia') {
      root.classList.add('theme-sepia');
      root.classList.remove('theme-night');
    } else {
      root.classList.remove('theme-sepia');
      root.classList.add('theme-night');
    }
  }, [resolvedTheme]);

  // Favorites & History (Persisted in localStorage)
  const [favorites, setFavorites] = useState<FavoriteVerse[]>([]);
  const [readingHistory, setReadingHistory] = useState<ReadingHistory[]>([]);
  const [notes, setNotes] = useState<VerseNote[]>([]);
  const [favSubTab, setFavSubTab] = useState<'favs' | 'notes'>('favs');

  // Explain Verse Context (AI Theological Desk)
  const [selectedVerseForExplain, setSelectedVerseForExplain] = useState<Verse | null>(null);
  const [explanationText, setExplanationText] = useState<string>("");
  const [explainLoading, setExplainLoading] = useState<boolean>(false);

  // Chapter Summary Context
  const [chapterSummary, setChapterSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);

  // Strong Lexicon
  const [selectedStrong, setSelectedStrong] = useState<StrongEntry | null>(null);

  // Search Screen State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Verse[]>([]);
  
  // Daily Verse
  const dailyVerseData = getDailyVerseForToday();

  // AI Chat Bot Screen State
  const [chatMessage, setChatMessage] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'model'; content: string }>>([
    { role: 'model', content: "Que la paix soit avec vous ! Je suis votre compagnon exégétique propulsé par Gemini. L'esthétique de mon sanctuaire a été revêtue d'un habit noir et d'accents dorés sacrés. Posez-moi vos questions de traduction, d'histoire ou de doctrine." }
  ]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Audio TTS State
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isContinuousAudio, setIsContinuousAudio] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bible_continuous_audio');
      return saved === null ? true : saved === 'true'; // Default to true as requested
    } catch (e) {
      return true;
    }
  });
  const [shouldAutoPlayNext, setShouldAutoPlayNext] = useState<boolean>(false);
  const [ttsRate, setTtsRate] = useState<number>(0.95);
  const [currentlySpeakingVerseIndex, setCurrentlySpeakingVerseIndex] = useState<number>(-1);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load favorites & reading history from localStorage on mounting
  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem('bible_favorites');
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }

      const storedHistory = localStorage.getItem('bible_reading_history');
      if (storedHistory) {
        setReadingHistory(JSON.parse(storedHistory));
      }

      const storedNotes = localStorage.getItem('bible_notes');
      if (storedNotes) {
        setNotes(JSON.parse(storedNotes));
      }

      const savedTextSize = localStorage.getItem('bible_text_size');
      if (savedTextSize) {
        setTextSize(Number(savedTextSize));
      }
    } catch (e) {
      console.warn("Could not load from localStorage:", e);
    }
  }, []);

  // Fetch the active book and chapter verses
  useEffect(() => {
    if (sqliteDbReady) {
      loadChapterVerses(selectedBook, selectedChapter);
    }
  }, [selectedBook, selectedChapter, sqliteDbReady]);

  // First launch SQLite import orchestrator
  useEffect(() => {
    if (!sqliteDbReady) {
      initializeSqliteDatabase((progress, text) => {
        setSqliteProgress(progress);
        setSqliteStatusText(text);
      }).then(() => {
        setSqliteDbReady(true);
      });
    }
  }, [sqliteDbReady]);

  // Handle auto scrolling down for chatbot messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Continuous audio automatic playback triggers on verse load completion
  useEffect(() => {
    if (shouldAutoPlayNext && verses.length > 0) {
      setShouldAutoPlayNext(false);
      setIsPlayingAudio(true);
      const timer = setTimeout(() => {
        speakSequential(0);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [verses, shouldAutoPlayNext]);

  // Clean speech synthesis if component unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Load verses from 100% offline Local SQLite Simulator
  const loadChapterVerses = async (book: BibleBook, chapterNum: number) => {
    setLoadingVerses(true);
    setVerseError(null);
    setSelectedVerseNum(null);
    window.speechSynthesis?.cancel();
    setIsPlayingAudio(false);
    setCurrentlySpeakingVerseIndex(-1);

    try {
      // Query SQLite database simulated on-device index
      const dbVerses = querySqliteChapter(book.id, book.name, chapterNum);
      if (dbVerses && dbVerses.length > 0) {
        setVerses(dbVerses);
        addToHistory(book, chapterNum);
      } else {
        throw new Error("Aucun verset retourné par le moteur SQLite.");
      }
    } catch (err: any) {
      console.error(err);
      setVerseError(err.message || "Erreur de lecture locale SQL.");
    } finally {
      setLoadingVerses(false);
    }
  };

  const addToHistory = (book: BibleBook, chapterNum: number) => {
    const newHistoryEntry: ReadingHistory = {
      book_id: book.id,
      book_name: book.name,
      chapter: chapterNum,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    
    setReadingHistory(prev => {
      const filtered = prev.filter(h => !(h.book_id === book.id && h.chapter === chapterNum));
      const updated = [newHistoryEntry, ...filtered].slice(0, 8); // Keep last 8
      localStorage.setItem('bible_reading_history', JSON.stringify(updated));
      return updated;
    });
  };

  // Toggle favorite state
  const handleToggleFavorite = (verse: Verse) => {
    const exists = favorites.find(f => f.book_id === verse.book_id && f.chapter === verse.chapter && f.verse === verse.verse);
    let updated: FavoriteVerse[] = [];
    
    if (exists) {
      updated = favorites.filter(f => !(f.book_id === verse.book_id && f.chapter === verse.chapter && f.verse === verse.verse));
    } else {
      const fav: FavoriteVerse = {
        book_id: verse.book_id,
        book_name: verse.book_name,
        chapter: verse.chapter,
        verse: verse.verse,
        text: verse.text,
        added_at: new Date().toLocaleDateString('fr-FR')
      };
      updated = [fav, ...favorites];
    }
    
    setFavorites(updated);
    localStorage.setItem('bible_favorites', JSON.stringify(updated));
  };

  // Save or delete notes for a verse
  const handleSaveNote = (verse: Verse, noteText: string) => {
    let updated: VerseNote[] = [];
    const index = notes.findIndex(n => n.book_id === verse.book_id && n.chapter === verse.chapter && n.verse === verse.verse);
    
    if (noteText.trim() === "") {
      // Delete the note
      updated = notes.filter(n => !(n.book_id === verse.book_id && n.chapter === verse.chapter && n.verse === verse.verse));
    } else {
      if (index >= 0) {
        // Update existing note
        updated = [...notes];
        updated[index] = {
          ...updated[index],
          note: noteText,
          updated_at: new Date().toLocaleDateString('fr-FR')
        };
      } else {
        // Add new note
        const newNote: VerseNote = {
          book_id: verse.book_id,
          book_name: verse.book_name,
          chapter: verse.chapter,
          verse: verse.verse,
          note: noteText,
          updated_at: new Date().toLocaleDateString('fr-FR')
        };
        updated = [newNote, ...notes];
      }
    }
    
    setNotes(updated);
    localStorage.setItem('bible_notes', JSON.stringify(updated));
  };

  // Trigger Gemini Verse Explainer
  const handleExplainVerse = async (verse: Verse) => {
    setSelectedVerseForExplain(verse);
    setExplanationText("");
    setExplainLoading(true);
    
    try {
      const res = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          verseText: verse.text, 
          reference: `${verse.book_name} ${verse.chapter}:${verse.verse}`,
          bookName: verse.book_name
        })
      });

      if (!res.ok) {
        throw new Error("Erreur serveur.");
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setExplanationText(data.explanation);
    } catch (error: any) {
      setExplanationText(`⚠️ Erreur : ${error.message || "Impossible de générer l'analyse."}`);
    } finally {
      setExplainLoading(false);
    }
  };

  // Trigger Gemini Chapter Summarizer
  const handleChapterSummarize = async () => {
    if (verses.length === 0) return;
    setChapterSummary("");
    setSummaryLoading(true);

    try {
      const res = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookName: selectedBook.name,
          chapterNum: selectedChapter,
          verses: verses
        })
      });

      if (!res.ok) {
        throw new Error("Erreur de connexion.");
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setChapterSummary(data.summary);
    } catch (error: any) {
      setChapterSummary(`⚠️ Erreur : ${error.message || "Impossible d'obtenir la synthèse."}`);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Handle Strong Lexicon code lookup
  const handleStrongLookup = (code: string) => {
    const entry = MAPPED_STRONG_ENTRIES_DIC[code] || STRONG_ENTRIES[code];
    if (entry) {
      setSelectedStrong(entry);
    } else {
      setSelectedStrong({
        code: code,
        language: code.startsWith('H') ? 'hebrew' : 'greek',
        word: code.startsWith('H') ? 'דָּבָר' : 'λόγος',
        transliteration: "recherche...",
        definition: `Dictionnaire Strong dictionnaire pour le code [${code}]. Demandez à l'assistant Gemini d'effectuer une analyse étymologique complète en cliquant sur le bouton ci-dessous.`,
        usage: "Utilisé dans de nombreuses bénédictions théologiques pour refléter la volonté divine."
      });
    }
    setActiveTab('lexicon');
  };

  // Standard Voice Speaking Player using HTML5 SpeechSynthesis
  const handlePlayTTS = () => {
    if (verses.length === 0) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      setCurrentlySpeakingVerseIndex(-1);
      return;
    }

    setIsPlayingAudio(true);
    speakSequential(0);
  };

  const speakSequential = (index: number) => {
    if (index >= verses.length) {
      if (isContinuousAudio) {
        setSlideDirection('forward'); // Continuous reading always advances forward
        if (selectedChapter < selectedBook.chapters_count) {
          const nextChap = selectedChapter + 1;
          setSelectedChapter(nextChap);
          setNavChapter(nextChap);
          setShouldAutoPlayNext(true);
        } else {
          const currentIndex = BOOKS.findIndex(b => b.id === selectedBook.id);
          if (currentIndex < BOOKS.length - 1) {
            const nextBook = BOOKS[currentIndex + 1];
            setSelectedBook(nextBook);
            setSelectedChapter(1);
            setNavBook(nextBook);
            setNavChapter(1);
            setNavTestament(nextBook.testament);
            setShouldAutoPlayNext(true);
          } else {
            setIsPlayingAudio(false);
            setCurrentlySpeakingVerseIndex(-1);
          }
        }
      } else {
        setIsPlayingAudio(false);
        setCurrentlySpeakingVerseIndex(-1);
      }
      return;
    }

    setCurrentlySpeakingVerseIndex(index);
    const textToRead = `Verset ${verses[index].verse}. ${verses[index].text.replace(/\[[HG]\d+\]/g, '')}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'fr-FR';
    
    // Set a calm, slow rate (0.95) for a majestic and solemn lecture
    utterance.rate = ttsRate;
    
    // Select French male voice according to exclusive preference criteria
    const voices = window.speechSynthesis.getVoices();
    const frVoices = voices.filter(v => {
      const languageCode = v.lang.toLowerCase();
      return languageCode === 'fr-fr' || languageCode === 'fr' || languageCode.startsWith('fr-') || languageCode.startsWith('fr_');
    });

    let selectedVoice = null;
    let isExplicitlyMale = false;

    if (frVoices.length > 0) {
      // 1. Exclusive Priority: Select known male voices/names or male-gendered system vocalizers
      selectedVoice = frVoices.find(v => {
        const nameLower = v.name.toLowerCase();
        const isMaleGender = (v as any).gender === 'male' || (v as any).gender === 'MALE' || (v as any).gender === 'Male';
        if (isMaleGender) return true;

        const matchesMaleKeywords = 
          nameLower.includes('male') || 
          nameLower.includes('homme') || 
          nameLower.includes('thomas') || 
          nameLower.includes('nicolas') ||
          nameLower.includes('paul') ||
          nameLower.includes('henri') ||
          nameLower.includes('claude') ||
          nameLower.includes('daniel') ||
          nameLower.includes('yannick') ||
          nameLower.includes('julien') ||
          nameLower.includes('gilles') ||
          nameLower.includes('gérard') ||
          nameLower.includes('bernard') ||
          nameLower.includes('alain') ||
          nameLower.includes('pierre') ||
          nameLower.includes('jean') ||
          nameLower.includes('marc') ||
          nameLower.includes('luc') ||
          nameLower.includes('michel') ||
          nameLower.includes('françois') ||
          nameLower.includes('francois') ||
          nameLower.includes('jacques') ||
          nameLower.includes('antoine') ||
          nameLower.includes('guy') ||
          nameLower.includes('charles') ||
          nameLower.includes('robert') ||
          nameLower.includes('louis') ||
          nameLower.includes('gabriel') ||
          nameLower.includes('olivier') ||
          nameLower.includes('philippe') ||
          nameLower.includes('yab') || // Google local male
          nameLower.includes('frg') || // Google local male
          nameLower.includes('frd') || // Google local male
          nameLower.includes('fio') || // Google local male
          nameLower.includes('-b') ||  // Wavenet-B / Standard-B
          nameLower.includes('-d');   // Wavenet-D / Standard-D
          
        return matchesMaleKeywords;
      });

      if (selectedVoice) {
        isExplicitlyMale = true;
      }

      // 2. Strict Filter: If no named male voice is found, filter out and ban any explicitly female vocals
      if (!selectedVoice) {
        selectedVoice = frVoices.find(v => {
          const nameLower = v.name.toLowerCase();
          const matchesFemaleKeywords = 
            nameLower.includes('female') ||
            nameLower.includes('femme') ||
            nameLower.includes('girl') ||
            nameLower.includes('woman') ||
            nameLower.includes('hortense') ||
            nameLower.includes('julie') ||
            nameLower.includes('celine') ||
            nameLower.includes('céline') ||
            nameLower.includes('lea') ||
            nameLower.includes('léa') ||
            nameLower.includes('berenice') ||
            nameLower.includes('bérénice') ||
            nameLower.includes('harmonie') ||
            nameLower.includes('chantal') ||
            nameLower.includes('gwen') ||
            nameLower.includes('caroline') ||
            nameLower.includes('audrey') ||
            nameLower.includes('aurelie') ||
            nameLower.includes('aurélie') ||
            nameLower.includes('charlotte') ||
            nameLower.includes('marianne') ||
            nameLower.includes('sarah') ||
            nameLower.includes('lucie') ||
            nameLower.includes('marie') ||
            nameLower.includes('valérie') ||
            nameLower.includes('valerie') ||
            nameLower.includes('sandrine') ||
            nameLower.includes('isabelle') ||
            nameLower.includes('virginie') ||
            nameLower.includes('corinne') ||
            nameLower.includes('sylvie') ||
            nameLower.includes('nathalie') ||
            nameLower.includes('amelie') ||
            nameLower.includes('amélie') ||
            nameLower.includes('claudine') ||
            nameLower.includes('françoise') ||
            nameLower.includes('francoise') ||
            nameLower.includes('michele') ||
            nameLower.includes('michèle') ||
            nameLower.includes('zira') ||
            nameLower.includes('susan') ||
            nameLower.includes('karen') ||
            nameLower.includes('hazel') ||
            nameLower.includes('moira') ||
            nameLower.includes('tessa') ||
            nameLower.includes('veena') ||
            nameLower.includes('samantha') ||
            nameLower.includes('vsk') || // Google local female
            nameLower.includes('vsp') || // Google local female
            nameLower.includes('vsc') || // Google local female
            nameLower.includes('vsd') || // Google local female
            nameLower.includes('google français') || // default Google female
            nameLower.includes('google francais'); // default Google female
          return !matchesFemaleKeywords;
        });
      }

      // 3. Fallback: If only a generic voice is installed, use it with a very low pitch (0.58) to force standard 
      // vocal cords frequencies to align with a very grave, resonant baritone/masculine lectoral voice.
      if (!selectedVoice) {
        selectedVoice = frVoices[0];
      }
    }

    // Adapt pitch strictly based on voice nature:
    if (isExplicitlyMale) {
      utterance.pitch = 0.84; // Dignified solemn male pitch
      console.log(`[TTS] Voix d'homme explicite sélectionnée : "${selectedVoice?.name}". Pitch appliqué : 0.84 (Grave liturgique).`);
    } else {
      utterance.pitch = 0.58; // Radical transformation to voice of a deep male reader
      console.log(`[TTS] Aucune voix masculine explicite détectée. Voix de contournement utilisée : "${selectedVoice?.name}". Pitch appliqué : 0.58 (Baritonisation forcée).`);
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      speakSequential(index + 1);
    };

    utterance.onerror = () => {
      setIsPlayingAudio(false);
      setCurrentlySpeakingVerseIndex(-1);
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleStopTTS = () => {
    window.speechSynthesis.cancel();
    setIsPlayingAudio(false);
    setCurrentlySpeakingVerseIndex(-1);
  };

  // Send message in GPT chat
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatMessage.trim()) return;

    const userMsg = chatMessage.trim();
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatMessage("");
    setChatLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: chatHistory.slice(-8)
        })
      });

      if (!res.ok) {
        throw new Error("L'assistant est momentanément injoignable.");
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setChatHistory(prev => [...prev, { role: 'model', content: data.reply }]);
    } catch (error: any) {
      setChatHistory(prev => [...prev, { role: 'model', content: `⚠️ Erreur : ${error.message || "Impossible de dialoguer avec l'assistant."}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Search verses locally
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const results = searchLocalVerses(query);
    setSearchResults(results);
  };

  // Navigate to read a specific verse
  const navigateToVerse = (bookId: number, chapterNum: number) => {
    const book = BOOKS.find(b => b.id === bookId);
    if (book) {
      setSelectedBook(book);
      setSelectedChapter(chapterNum);
      setNavBook(book);
      setNavChapter(chapterNum);
      setNavTestament(book.testament);
      setIsNavigating(false);
      setActiveTab('read');
    }
  };

  const getCategoryLabel = (category: BibleBook['category']) => {
    switch (category) {
      case 'pentateuque': return 'Pentateuque';
      case 'historique': return 'Histoire';
      case 'poetique': return 'Sagesse & Poésie';
      case 'prophetique': return 'Prophétie';
      case 'evangile': return 'Évangile';
      case 'epitre': return 'Épître';
      case 'apocalypse': return 'Révélation';
    }
  };

  const getCategoryColor = (category: BibleBook['category']) => {
    switch (category) {
      case 'pentateuque': return 'bg-luxury-button-bg text-amber-500 border-luxury-border';
      case 'historique': return 'bg-luxury-button-bg text-yellow-500 border-luxury-border';
      case 'poetique': return 'bg-luxury-button-bg text-luxury-gold border-luxury-gold/30 shadow-gold-glow';
      case 'prophetique': return 'bg-luxury-button-bg text-orange-500 border-luxury-border';
      case 'evangile': return 'bg-luxury-button-bg text-teal-400 border-luxury-border';
      case 'epitre': return 'bg-luxury-button-bg text-sky-400 border-luxury-border';
      case 'apocalypse': return 'bg-luxury-button-bg text-rose-500 border-luxury-border';
    }
  };

  // Map strong word extractors for helper words
  const extractStrongWords = () => {
    if (!selectedVerseForExplain) return [];
    const rx = /\[(H\d+|G\d+)\]/g;
    const words: { word: string; code: string }[] = [];
    let match;
    while ((match = rx.exec(selectedVerseForExplain.text)) !== null) {
      const code = match[1];
      const entry = STRONG_ENTRIES[code];
      const word = entry ? entry.word : (code.startsWith('H') ? 'דָּבָר' : 'λόγος');
      if (!words.some(w => w.code === code)) {
        words.push({ word, code });
      }
    }
    return words;
  };

  if (!sqliteDbReady) {
    return (
      <div className="min-h-screen bg-[#050403] text-luxury-text-primary flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-[#12100c] border border-luxury-gold/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center space-y-6 shadow-gold-glow">
          {/* Decorative sacred lines */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-luxury-gold to-transparent"></div>
          
          <div className="inline-flex p-3.5 bg-luxury-surface rounded-2xl border border-luxury-gold/20 text-luxury-gold">
            <BookMarked className="w-8 h-8 animate-pulse text-luxury-gold" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif italic text-2xl text-luxury-text-verse tracking-wide">
              Initialisation du Sanctuaire
            </h2>
            <p className="text-xs text-luxury-text-muted font-mono uppercase tracking-[0.15em]">
              BIBLE PROFONDE · SQLITE DATABASE
            </p>
          </div>

          {/* SQLite Progress Visualization */}
          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center text-[10px] font-mono text-luxury-text-muted">
              <span>IMPORTATION DU BUNDLE JSON...</span>
              <span className="text-luxury-gold font-extrabold">{sqliteProgress}%</span>
            </div>
            
            {/* Elegant luxury progress bar */}
            <div className="h-2.5 bg-[#050403] border border-luxury-border rounded-full overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-luxury-gold to-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${sqliteProgress}%` }}
              ></div>
            </div>

            <p className="text-[11px] font-serif italic text-luxury-gold-light min-h-[36px] pt-1 leading-relaxed">
              {sqliteStatusText || "Préparation du moteur relationnel SQLite..."}
            </p>
          </div>

          <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-luxury-gold/40 to-transparent mx-auto"></div>
          
          <p className="text-[10px] text-luxury-text-muted font-sans leading-relaxed">
            Note : Cette opération charge les 66 livres et l'index de concordance de Louis Segond dans la table SQLite de l'appareil. Le mode de lecture fonctionnera à 100% hors ligne.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-bg-deep text-luxury-text-primary py-4 px-2 sm:px-6 md:py-8 font-sans transition-colors duration-300">
      
      {/* Premium Dark Luxury Header Banner - Hidden in Focus Mode */}
      {!isActualFocusMode && (
        <header className="max-w-7xl mx-auto mb-8 text-center space-y-2 animate-fade-in">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-luxury-button-bg rounded-lg border border-luxury-gold/20">
            <span className="w-1.5 h-1.5 rounded-full bg-luxury-gold animate-ping"></span>
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-luxury-gold font-extrabold">STUDIUM SACRUM</span>
          </div>
          <h1 className="font-serif italic text-4xl sm:text-5xl lg:text-6xl text-luxury-text-verse tracking-wide text-shadow-gold">
            Bible Profonde
          </h1>
          <p className="text-luxury-text-muted text-xs sm:text-sm font-sans tracking-[0.05em] max-w-xl mx-auto">
            Dictionnaire Strong annoté, synthèses exégétiques par l'intelligence artificielle Gemini & Cabinet d'études théologiques
          </p>
          <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-luxury-gold/50 to-transparent mx-auto mt-4"></div>
        </header>
      )}

      {/* Dynamic Alert Banner if API Key is not loaded - Hidden in Focus Mode */}
      {!isActualFocusMode && !process.env.GEMINI_API_KEY && (
        <div className="max-w-7xl mx-auto mb-6 bg-luxury-surface border border-luxury-border text-luxury-text-primary px-5 py-4 rounded-xl flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-luxury-gold rounded-full animate-ping"></span>
            <span>
              <strong>Mode Écrivain :</strong> L'analyse de l'IA utilise l'accès cloud d'émulation. Ajoutez la variable <code>GEMINI_API_KEY</code> dans vos secrets pour débloquer la réactivité maximale.
            </span>
          </div>
          <span className="font-mono text-[10px] text-luxury-gold-light bg-luxury-button-bg px-2.5 py-1 rounded border border-luxury-gold/20">
            CONNECTÉ AU CLOUD
          </span>
        </div>
      )}

      {/* Main Responsive Grid layout (Left: Mobile interface / Right: Desktop Large Interactive Assistant Desk) */}
      <div className={`max-w-7xl mx-auto grid grid-cols-1 ${isActualFocusMode ? 'grid-cols-1' : 'lg:grid-cols-12'} gap-8 items-start`}>
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: THE PHONE EMULATOR (VIBRANT MODEL VIEW)       */}
        {/* ========================================================= */}
        <div className={`${isActualFocusMode ? 'col-span-12 flex justify-center w-full' : 'lg:col-span-5 xl:col-span-5 flex justify-center'}`}>
          <div className={`w-full transition-all duration-300 flex flex-col overflow-hidden shadow-gold-glow ${
            isActualFocusMode 
              ? 'max-w-[760px] h-[820px] bg-luxury-bg rounded-2xl border border-luxury-border p-1' 
              : 'max-w-[390px] h-[780px] bg-luxury-bg rounded-[3.2rem] p-3 border-[10px] border-simulator-border relative'
          }`}>
            
            {/* Phone Speaker & Notch - Hidden in Focus Mode */}
            {!isActualFocusMode && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-simulator-border rounded-b-2xl z-50 flex items-center justify-center transition-colors duration-300">
                <div className="w-12 h-1 bg-luxury-bg rounded-full mb-1 transition-colors duration-300"></div>
              </div>
            )}

            {/* Simulated Phone Screen Canvas - STRICTLY DARK LUXURY BG */}
            <div className={`flex-1 bg-luxury-bg flex flex-col overflow-hidden relative text-luxury-text-primary transition-all duration-300 ${
              isActualFocusMode ? 'rounded-2xl pt-2' : 'rounded-[2.5rem] pt-6'
            }`}>
              
              {/* Header Status Bar - Hidden in Focus Mode */}
              {!isActualFocusMode && (
                <div className="px-6 pt-1.5 pb-2.5 flex justify-between items-center text-[10px] font-semibold text-luxury-text-muted select-none">
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-luxury-gold" />
                    <span>LOUIS SEGOND 1910</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="uppercase tracking-widest text-[#9ca3af] text-[8px] font-bold">MODE SÉCURISÉ</span>
                  </div>
                </div>
              )}

              {/* Main Navigation Tab view container */}
              <div className="flex-1 overflow-hidden flex flex-col">
                
                {/* --------------------------------------------------- */}
                {/* 1. HOME TAB ACCUEIL                                 */}
                {/* --------------------------------------------------- */}
                {activeTab === 'home' && (
                  <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-6 scrollbar-thin">
                    
                    {/* TopBar custom component */}
                    <TopBar 
                      onSearchPress={() => setActiveTab('search')}
                      onStudyPress={() => setActiveTab('read')}
                      onProfilePress={() => alert("Profil Écritures de Franck — Bible Profonde")}
                    />

                    {/* Revelation badge component */}
                    <RevelationBadge 
                      onClick={() => handleExplainVerse(dailyVerseData.verse)}
                      text="RÉVÉLATION DU JOUR"
                    />

                    {/* Beautiful VerseQuote Centerpiece */}
                    <VerseQuote 
                      text={dailyVerseData.verse.text}
                      book={dailyVerseData.book.name}
                      chapter={dailyVerseData.verse.chapter}
                      verse={dailyVerseData.verse.verse}
                      onExplainPress={() => handleExplainVerse(dailyVerseData.verse)}
                    />

                    {/* Quick navigation modules */}
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setActiveTab('read')}
                        className="bg-luxury-surface border border-luxury-border hover:border-luxury-gold/50 p-4 rounded-xl flex items-center gap-3 transition"
                      >
                        <div className="w-9 h-9 rounded-lg bg-luxury-button-bg flex items-center justify-center text-luxury-gold">
                          <BookOpen className="w-4.5 h-4.5" />
                        </div>
                        <div className="text-left">
                          <p className="font-serif font-bold text-xs text-luxury-text-primary">Lire la Bible</p>
                          <p className="text-[9px] text-[#9ca3af]">66 Livres sacrés</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => setActiveTab('ai')}
                        className="bg-luxury-surface border border-luxury-border hover:border-luxury-gold/50 p-4 rounded-xl flex items-center gap-3 transition shadow-gold-glow"
                      >
                        <div className="w-9 h-9 rounded-lg bg-luxury-button-bg flex items-center justify-center text-luxury-gold-light">
                          <Sparkles className="w-4.5 h-4.5" />
                        </div>
                        <div className="text-left">
                          <p className="font-serif font-bold text-xs text-luxury-text-primary">Assistant IA</p>
                          <p className="text-[9px] text-[#9ca3af]">Dialogue & Dogme</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => setActiveTab('lexicon')}
                        className="col-span-2 bg-gradient-to-r from-[#1c1811] to-[#282218] border border-luxury-gold/20 hover:border-luxury-gold/50 p-4 rounded-xl flex items-center gap-3 transition shadow-sm relative overflow-hidden"
                      >
                        <div className="absolute right-0 bottom-0 select-none opacity-5 text-luxury-gold">
                          <BookOpenCheck className="w-24 h-24 translate-x-4 translate-y-4" />
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-luxury-button-bg/80 border border-luxury-gold/30 flex items-center justify-center text-luxury-gold shrink-0">
                          <BookOpenCheck className="w-4.5 h-4.5" />
                        </div>
                        <div className="text-left col-span-2">
                          <p className="font-serif font-bold text-xs text-luxury-text-primary flex items-center gap-1.5">
                            <span>Lexique Strong Biblique</span>
                            <span className="text-[7.5px] font-mono bg-luxury-gold/15 text-[#c9a84c] border border-luxury-gold/30 px-1 py-0.2 rounded font-bold uppercase tracking-wider">H & G</span>
                          </p>
                          <p className="text-[9.5px] text-[#9ca3af] leading-relaxed">Racines grecques, hébraïques & concordance d'occurrences intégrale des textes.</p>
                        </div>
                      </button>
                    </div>

                    {/* Mode de Lecture (Sépia / Nuit) Dynamic Controller Card */}
                    <div className="bg-luxury-surface border border-luxury-border p-4 rounded-2xl space-y-3 shadow-sm transition-all duration-300">
                      <div className="flex justify-between items-center border-b border-luxury-border/40 pb-2">
                        <div className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-luxury-gold" />
                          <span className="text-[10px] font-mono tracking-wider text-luxury-text-primary uppercase font-bold">Thémographe & Vision</span>
                        </div>
                        <span className="text-[8.5px] font-mono text-luxury-text-muted bg-luxury-button-bg px-1.5 py-0.5 rounded uppercase">
                          {resolvedTheme === 'sepia' ? 'Sépia (Jour)' : 'Nuit (Soir)'}
                        </span>
                      </div>
                      
                      <p className="text-[10.5px] text-luxury-text-muted leading-relaxed font-sans">
                        Basculez entre le mode d'étude <strong className="text-luxury-text-primary text-luxury-gold">Sépia</strong> pour préserver vos yeux le jour et l'ambiance sacrée <strong className="text-luxury-text-primary text-luxury-gold">Nuit</strong> pour le soir.
                      </p>

                      <div className="grid grid-cols-3 gap-1.5 p-0.5 bg-luxury-bg rounded-xl border border-luxury-border/60">
                        <button
                          onClick={() => {
                            setThemeMode('auto');
                            localStorage.setItem('bible_theme_mode', 'auto');
                          }}
                          className={`py-2 px-1 rounded-lg text-[9px] font-mono uppercase font-bold tracking-wider transition cursor-pointer ${
                            themeMode === 'auto'
                              ? 'bg-luxury-gold text-luxury-bg shadow-sm font-extrabold'
                              : 'text-luxury-text-muted hover:text-luxury-text-primary'
                          }`}
                          title="Bascule automatique intelligente selon l'heure ou le système"
                        >
                          Auto ⚙️
                        </button>
                        <button
                          onClick={() => {
                            setThemeMode('sepia');
                            localStorage.setItem('bible_theme_mode', 'sepia');
                          }}
                          className={`py-2 px-1 rounded-lg text-[9px] font-mono uppercase font-bold tracking-wider transition cursor-pointer ${
                            themeMode === 'sepia'
                              ? 'bg-luxury-gold text-luxury-bg shadow-sm font-extrabold'
                              : 'text-luxury-text-muted hover:text-luxury-text-primary'
                          }`}
                          title="Forcer le thème de lecture Sépia (crème relaxant)"
                        >
                          Sépia ☀️
                        </button>
                        <button
                          onClick={() => {
                            setThemeMode('night');
                            localStorage.setItem('bible_theme_mode', 'night');
                          }}
                          className={`py-2 px-1 rounded-lg text-[9px] font-mono uppercase font-bold tracking-wider transition cursor-pointer ${
                            themeMode === 'night'
                              ? 'bg-luxury-gold text-luxury-bg shadow-sm font-extrabold'
                              : 'text-luxury-text-muted hover:text-luxury-text-primary'
                          }`}
                          title="Forcer le thème obscur Nuit (noir profond)"
                        >
                          Nuit 🌙
                        </button>
                      </div>
                    </div>

                    {/* Mode d'Écoute Sacré (Voix Masculine Seule Permanente) */}
                    <div className="bg-luxury-surface border border-luxury-border/60 p-4 rounded-2xl space-y-3 shadow-sm transition-all duration-300">
                      <div className="flex justify-between items-center border-b border-luxury-border/40 pb-2">
                        <div className="flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-luxury-gold" />
                          <span className="text-[10px] font-mono tracking-wider text-luxury-text-primary uppercase font-bold">Configuration Écoute</span>
                        </div>
                        <span className="text-[8px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                          🔒 Voix Masculine Unie
                        </span>
                      </div>
                      
                      <p className="text-[10.5px] text-luxury-text-muted leading-relaxed font-sans">
                        La lecture audio est configurée de manière <strong className="text-luxury-gold">stricte et permanente</strong> sur une voix d'homme française (<strong className="text-luxury-text-primary">Timbre Lectoral Profond</strong>), ralentie à <strong className="text-[#e8c97a]">0.95x</strong> pour une prononciation majestueuse et solennelle adaptée à l'étude.
                      </p>

                      <div className="bg-luxury-bg border border-luxury-border/40 rounded-xl p-2.5 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-luxury-text-muted">Canal d'Écoute :</span>
                          <span className="text-luxury-gold font-extrabold">VOIX HOMME SEULEMENT</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-luxury-text-muted">Hauteur (Pitch) :</span>
                          <span className="text-luxury-text-primary">Grave (Timbre Solennel)</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-luxury-text-muted">Enchaînement :</span>
                          <span className={isContinuousAudio ? "text-emerald-400 font-bold flex items-center gap-1" : "text-luxury-text-muted"}>
                            {isContinuousAudio ? "Liaison de chapitres active 🔂" : "Arrêt au chapitre"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-luxury-text-muted">Statut des options :</span>
                          <span className="text-rose-400/80 font-bold">Autres genres révoqués 🚫</span>
                        </div>
                      </div>
                    </div>

                    {/* Reading Challenges Plan Section */}
                    <div className="space-y-3 bg-[#110e0a]/40 p-2.5 rounded-2xl border border-[#2e2a1e]/30">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-mono tracking-[0.12em] text-[#c9a84c] font-bold uppercase">📖 Défis de Lecture</span>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] animate-pulse"></span>
                        </div>
                      </div>
                      <ReadingChallenges 
                        readingHistory={readingHistory}
                        onNavigateToChapter={(bookId, chapterNum) => {
                          const bk = BOOKS.find(b => b.id === bookId);
                          if (bk) {
                            setSelectedBook(bk);
                            setSelectedChapter(chapterNum);
                            setNavBook(bk);
                            setNavChapter(chapterNum);
                            setNavTestament(bk.testament);
                            setIsNavigating(false);
                            setActiveTab('read');
                          }
                        }}
                      />
                    </div>

                    {/* Daily Reminders Scheduler Section */}
                    <DailyReminder />

                    {/* Recharts Study Performance Graph Section */}
                    <StudyStatsChart readingHistory={readingHistory} />

                    {/* Historic / Recent Readings */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono tracking-[0.15em] text-luxury-text-muted uppercase">LECTURES RÉCENTES</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-luxury-gold"></span>
                      </div>
                      
                      {readingHistory.length === 0 ? (
                        <div className="bg-luxury-surface/50 border border-luxury-border border-dashed p-4 rounded-xl text-center">
                          <p className="text-[11px] text-luxury-text-muted">Aucun chapitre lu récemment.</p>
                        </div>
                      ) : (
                        <div className="flex gap-2.5 overflow-x-auto pb-1.5">
                          {readingHistory.map((hist, index) => {
                            const b = BOOKS.find(bk => bk.id === hist.book_id);
                            return (
                              <button
                                key={index}
                                onClick={() => navigateToVerse(hist.book_id, hist.chapter)}
                                className="min-w-[110px] max-w-[110px] bg-luxury-surface p-3 rounded-lg border border-luxury-border text-left hover:border-luxury-gold/30 transition shrink-0"
                              >
                                <span className={`inline-block text-[8px] font-bold uppercase rounded px-1 mb-1.5 border ${b ? getCategoryColor(b.category) : ''}`}>
                                  {b ? getCategoryLabel(b.category) : 'Texte'}
                                </span>
                                <p className="text-[11px] font-serif font-bold text-luxury-text-primary truncate">{hist.book_name}</p>
                                <p className="text-[9px] text-luxury-text-muted">Chapitre {hist.chapter}</p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Spiritual guidance advice footer */}
                    <div className="p-4 bg-luxury-surface border border-luxury-border rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-4 h-4 text-luxury-gold" />
                        <span className="font-mono text-[9px] tracking-wider text-luxury-gold font-bold">CONSEIL DE MÉDITATION</span>
                      </div>
                      <p className="text-xs text-luxury-text-primary leading-relaxed font-serif italic text-left">
                        {getDailyVerseForToday().explanation}
                      </p>
                    </div>

                  </div>
                )}

                {/* --------------------------------------------------- */}
                {/* 2. READ BIBLE TAB                                   */}
                {/* --------------------------------------------------- */}
                {activeTab === 'read' && (
                  <div className="flex-1 overflow-hidden flex flex-col bg-[#0d0b07] text-[#e8e0d0]">
                    
                    {isNavigating ? (
                      /* --- THE 3-STEP SACRED BIBLE NAVIGATOR --- */
                      <div className="flex-1 overflow-hidden flex flex-col select-none">
                        
                        {/* BARRE DE STATUT EN HAUT (fixe) */}
                        <div className="bg-[#0b0a08] px-5 py-3 flex justify-between items-center border-b border-[#2e2a1e] shrink-0">
                          <span className="text-[#c9a84c] text-[11px] font-mono tracking-[0.15em] font-extrabold uppercase">
                            LSG 1910
                          </span>
                          <span className="text-[#6b6355] text-[10px] font-mono font-medium">
                            {navBook 
                              ? `${getCategoryLabel(navBook.category).toUpperCase()} · ${navBook.testament}`
                              : `SÉLECTION · ${navTestament}`}
                          </span>
                        </div>

                        {/* Navigation Scrolling Steps Container */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin">
                          
                          {/* ÉTAPE 1 — Sélection du Testament */}
                          <div className="space-y-2">
                            <span className="block text-[9px] font-mono tracking-[0.12em] text-[#6b6355] uppercase font-bold text-left">
                              Étape 1 · Alliance du Testament
                            </span>
                            <div className="flex gap-2.5">
                              <button
                                onClick={() => {
                                  setNavTestament('AT');
                                  setNavBook(null);
                                  setNavChapter(null);
                                }}
                                className="flex-1 py-2.5 rounded-xl text-center text-xs font-semibold tracking-wide border transition-all duration-300 cursor-pointer"
                                style={{
                                  backgroundColor: navTestament === 'AT' ? '#c9a84c' : 'transparent',
                                  color: navTestament === 'AT' ? '#0d0b07' : '#6b6355',
                                  borderColor: navTestament === 'AT' ? '#c9a84c' : '#2e2a1e'
                                }}
                              >
                                Ancien Testament
                              </button>
                              <button
                                onClick={() => {
                                  setNavTestament('NT');
                                  setNavBook(null);
                                  setNavChapter(null);
                                }}
                                className="flex-1 py-2.5 rounded-xl text-center text-xs font-semibold tracking-wide border transition-all duration-300 cursor-pointer"
                                style={{
                                  backgroundColor: navTestament === 'NT' ? '#c9a84c' : 'transparent',
                                  color: navTestament === 'NT' ? '#0d0b07' : '#6b6355',
                                  borderColor: navTestament === 'NT' ? '#c9a84c' : '#2e2a1e'
                                }}
                              >
                                Nouveau Testament
                              </button>
                            </div>
                          </div>

                          {/* ÉTAPE 2 — Sélection du Livre */}
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-mono tracking-[0.12em] text-[#6b6355] uppercase font-bold">
                                Étape 2 · Livre Sacré
                              </span>
                              {selectedBook && (
                                <button
                                  onClick={() => {
                                    setNavBook(selectedBook);
                                    setNavChapter(selectedChapter);
                                    setNavTestament(selectedBook.testament);
                                    setIsNavigating(false);
                                  }}
                                  className="text-[9px] font-mono text-[#c9a84c] hover:underline uppercase tracking-wide cursor-pointer"
                                >
                                  Fermer &times;
                                </button>
                              )}
                            </div>

                            {/* Grouped books by categories */}
                            <div className="space-y-4 text-left">
                              {(() => {
                                const filteredBooks = BOOKS.filter(b => b.testament === navTestament);
                                const catsForTestament = navTestament === 'AT' 
                                  ? ['pentateuque', 'historique', 'poetique', 'prophetique'] 
                                  : ['evangile', 'epitre', 'apocalypse'];
                                  
                                return catsForTestament.map(cat => {
                                  const booksInCat = filteredBooks.filter(b => b.category === cat);
                                  if (booksInCat.length === 0) return null;
                                  
                                  return (
                                    <div key={cat} className="space-y-2">
                                      {/* Catégories de livre en uppercase */}
                                      <div className="text-[9px] font-mono tracking-[0.15em] text-[#6b6355] uppercase border-b border-[#2e2a1e]/50 pb-1.5 pt-1">
                                        {categoryTitles[cat] || cat.toUpperCase()}
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-2">
                                        {booksInCat.map(b => {
                                          const isSelected = navBook?.id === b.id;
                                          return (
                                            <button
                                              key={b.id}
                                              onClick={() => {
                                                setNavBook(b);
                                                setNavChapter(null); // Reset chapter selection
                                              }}
                                              className="bg-[#1a1712] p-2.5 rounded-lg text-left transition-all duration-200 cursor-pointer overflow-hidden"
                                              style={{
                                                border: isSelected ? '1px solid #c9a84c' : '1px solid #2e2a1e'
                                              }}
                                            >
                                              <p 
                                                className="font-serif text-xs font-bold truncate transition-colors duration-150"
                                                style={{
                                                  color: isSelected ? '#c9a84c' : '#e8e0d0'
                                                }}
                                              >
                                                {b.name}
                                              </p>
                                              <p className="text-[9px] font-mono text-[#6b6355] mt-0.5">
                                                {b.chapters_count} cap.
                                              </p>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>

                          {/* ÉTAPE 3 — Sélection du Chapitre */}
                          {navBook && (
                            <div className="space-y-3 pt-2 animate-fade-slide-up text-left">
                              <span className="block text-[9px] font-mono tracking-[0.12em] text-[#6b6355] uppercase font-bold">
                                Étape 3 · Numéro du Chapitre
                              </span>
                              
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {Array.from({ length: navBook.chapters_count }, (_, i) => i + 1).map(ch => {
                                  const isSelected = navChapter === ch;
                                  return (
                                    <button
                                      key={ch}
                                      onClick={() => setNavChapter(ch)}
                                      className="w-9 h-9 rounded-md flex items-center justify-center text-xs font-mono font-bold border transition-all duration-200 cursor-pointer"
                                      style={{
                                        backgroundColor: isSelected ? '#c9a84c' : '#1a1712',
                                        borderColor: isSelected ? '#c9a84c' : '#2e2a1e',
                                        color: isSelected ? '#0d0b07' : '#6b6355'
                                      }}
                                    >
                                      {ch}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                        </div>

                        {/* Confirmation Confirm Call-to-action button */}
                        {navBook && navChapter && (
                          <div className="p-4 bg-[#12100c] border-t border-[#221e16] shrink-0">
                            <button
                              onClick={() => {
                                const currentBookIndex = BOOKS.findIndex(b => b.id === selectedBook.id);
                                const targetBookIndex = BOOKS.findIndex(b => b.id === navBook.id);
                                let dir: 'forward' | 'backward' = 'forward';
                                if (targetBookIndex < currentBookIndex) {
                                  dir = 'backward';
                                } else if (targetBookIndex === currentBookIndex && navChapter < selectedChapter) {
                                  dir = 'backward';
                                }
                                setSlideDirection(dir);
                                setSelectedBook(navBook);
                                setSelectedChapter(navChapter);
                                setIsNavigating(false);
                              }}
                              className="w-full h-12 bg-[#c9a84c] text-[#0d0b07] rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-[#dfba5a] transition active:scale-[0.98] duration-150 flex items-center justify-center gap-1.5 shadow-gold-glow cursor-pointer"
                            >
                              <BookOpenCheck className="w-4 h-4" />
                              <span>Lire {navBook.name} — Chapitre {navChapter}</span>
                            </button>
                          </div>
                        )}

                      </div>
                    ) : (
                      /* --- THE COMPREHENSIVE TEXT SCRIPTURE READER PANEL --- */
                      <div className="flex-1 overflow-hidden flex flex-col">
                        
                        {/* Chapter Header Selection with dark theme arrows */}
                        <div className="bg-[#1a1712] p-3 border-b border-[#2e2a1e] flex items-center justify-between gap-3 z-10 shrink-0">
                          
                          <button 
                            onClick={() => {
                              setSlideDirection('backward'); // Sets left-to-right page slide direction
                              if (selectedChapter > 1) {
                                setSelectedChapter(prev => prev - 1);
                                setNavChapter(selectedChapter - 1);
                              } else {
                                const currentIndex = BOOKS.findIndex(b => b.id === selectedBook.id);
                                if (currentIndex > 0) {
                                  const prevBook = BOOKS[currentIndex - 1];
                                  setSelectedBook(prevBook);
                                  setSelectedChapter(prevBook.chapters_count);
                                  setNavBook(prevBook);
                                  setNavChapter(prevBook.chapters_count);
                                  setNavTestament(prevBook.testament);
                                }
                              }
                            }}
                            className="p-1 px-2.5 bg-[#0d0b07] hover:bg-luxury-button-bg rounded-lg border border-[#2e2a1e] text-[#c9a84c] transition duration-200 cursor-pointer"
                            title="Chapitre précédent"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          {/* Unified Selection Button - opens the 3-Step Navigator */}
                          <button
                            onClick={() => {
                              setNavBook(selectedBook);
                              setNavChapter(selectedChapter);
                              setNavTestament(selectedBook.testament);
                              setIsNavigating(true);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#0d0b07] hover:bg-[#1a1712] rounded-lg border border-[#2e2a1e] hover:border-[#c9a84c]/50 transition duration-200 cursor-pointer shadow-soft group text-ellipsis overflow-hidden animate-none"
                            title="Ouvrir le sélécteur 3 étapes"
                          >
                            <span className="font-serif font-extrabold text-[#c9a84c] text-xs transition-colors group-hover:text-[#e8c97a]">
                              {selectedBook.name} {selectedChapter}
                            </span>
                            <span className="text-[10px] text-[#6b6355] font-mono group-hover:text-[#c9a84c] transition-colors">
                              ⌥ Navigation
                            </span>
                          </button>

                          <button 
                            onClick={() => {
                              setSlideDirection('forward'); // Sets right-to-left page slide direction
                              if (selectedChapter < selectedBook.chapters_count) {
                                setSelectedChapter(prev => prev + 1);
                                setNavChapter(selectedChapter + 1);
                              } else {
                                const currentIndex = BOOKS.findIndex(b => b.id === selectedBook.id);
                                if (currentIndex < BOOKS.length - 1) {
                                  const nextBook = BOOKS[currentIndex + 1];
                                  setSelectedBook(nextBook);
                                  setSelectedChapter(1);
                                  setNavBook(nextBook);
                                  setNavChapter(1);
                                  setNavTestament(nextBook.testament);
                                }
                              }
                            }}
                            className="p-1 px-2.5 bg-[#0d0b07] hover:bg-luxury-button-bg rounded-lg border border-[#2e2a1e] text-[#c9a84c] transition duration-200 cursor-pointer"
                            title="Chapitre suivant"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>

                        </div>

                        {/* Ribbon Category Banner - Hidden in Focus Mode for absolute distraction-free reading */}
                        {!isActualFocusMode && (
                          <div className="px-4 py-2 bg-[#1a1712]/40 flex items-center justify-between border-b border-[#2e2a1e] text-[10px] font-semibold text-[#6b6355] shrink-0">
                            <span className={`px-2 py-0.5 rounded border ${getCategoryColor(selectedBook.category)}`}>
                              {getCategoryLabel(selectedBook.category)} · {selectedBook.testament}
                            </span>
                            
                            <button 
                              onClick={handleChapterSummarize}
                              className="flex items-center gap-1.5 text-[#c9a84c] hover:text-[#e8c97a] hover:underline cursor-pointer"
                              title="Résumer ce chapitre avec l'IA"
                            >
                              <FileText className="w-3 h-3" />
                              <span>SYNTHÈSE IA</span>
                            </button>
                          </div>
                        )}

                        {/* Verses Scroll List - Expanded with premium spacing in Focus Mode with page sliding transition */}
                        <div 
                          onClick={() => setSelectedVerseNum(null)}
                          className={`flex-1 overflow-y-auto scrollbar-thin text-left cursor-default select-none transition-all duration-300 ${
                            isActualFocusMode 
                              ? 'px-6 py-6 md:px-14 md:py-10 space-y-4' 
                              : 'px-4 py-2 space-y-1'
                          }`}
                        >
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                              key={`${selectedBook.id}-${selectedChapter}`}
                              custom={slideDirection}
                              variants={{
                                enter: (dir: 'forward' | 'backward') => ({
                                  x: dir === 'forward' ? '40px' : '-40px',
                                  opacity: 0
                                }),
                                center: {
                                  x: 0,
                                  opacity: 1
                                },
                                exit: (dir: 'forward' | 'backward') => ({
                                  x: dir === 'forward' ? '-40px' : '40px',
                                  opacity: 0
                                })
                              }}
                              initial="enter"
                              animate="center"
                              exit="exit"
                              transition={{
                                type: 'spring',
                                stiffness: 350,
                                damping: 32
                              }}
                              className="w-full"
                            >
                              {loadingVerses ? (
                                <div className="py-24 text-center space-y-4">
                                  <div className="w-8 h-8 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin mx-auto"></div>
                                  <p className="text-[11px] text-[#6b6355] tracking-widest font-mono">
                                    CHARGEMENT DES SAINTES ÉCRITURES...
                                  </p>
                                </div>
                              ) : verseError ? (
                                <div className="my-10 text-center p-5 bg-[#1a1712] border border-[#2e2a1e] rounded-xl space-y-3">
                                  <p className="text-xs text-rose-400 font-bold">{verseError}</p>
                                  <button
                                    onClick={() => loadChapterVerses(selectedBook, selectedChapter)}
                                    className="text-xs px-4 py-2 bg-[#c9a84c] text-[#0d0b07] font-serif font-bold rounded-lg hover:bg-opacity-80 cursor-pointer"
                                  >
                                    Réessayer
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {verses.map((verse, index) => {
                                    const isFav = !!favorites.find(f => f.book_id === verse.book_id && f.chapter === verse.chapter && f.verse === verse.verse);
                                    const noteEntry = notes.find(n => n.book_id === verse.book_id && n.chapter === verse.chapter && n.verse === verse.verse);
                                    const hasNote = !!noteEntry;
                                    const noteText = noteEntry ? noteEntry.note : "";

                                    return (
                                      <div key={verse.verse} className={currentlySpeakingVerseIndex === index ? "bg-[#1a1712]/60 rounded-lg shadow-gold-glow" : ""}>
                                        <VerseItem
                                          verse={verse}
                                          isFavorite={isFav}
                                          onToggleFavorite={handleToggleFavorite}
                                          onExplain={handleExplainVerse}
                                          onStrongClick={handleStrongLookup}
                                          textSize={textSize}
                                          lineHeight={textSize + 8}
                                          isSelected={selectedVerseNum === verse.verse}
                                          onTap={() => {
                                            setSelectedVerseNum(prev => prev === verse.verse ? null : verse.verse);
                                          }}
                                          hasNote={hasNote}
                                          noteText={noteText}
                                          onSaveNote={handleSaveNote}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </motion.div>
                          </AnimatePresence>
                        </div>

                        {/* Audio Player and Settings bottom navigation */}
                        <div className="bg-luxury-surface border-t border-luxury-border p-3 flex items-center justify-between gap-2 shrink-0 transition-colors duration-300">
                          <div className="flex items-center gap-1.5 flex-1 justify-between">
                            <div className="flex items-center gap-1.5 bg-luxury-bg/30 p-0.5 rounded-lg border border-luxury-border/40">
                              <button 
                                onClick={() => {
                                  const size = Math.max(14, textSize - 1);
                                  setTextSize(size);
                                  localStorage.setItem('bible_text_size', String(size));
                                }}
                                className="w-7 h-7 bg-luxury-bg hover:bg-luxury-surface text-luxury-text-primary rounded border border-luxury-border flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all duration-200"
                                title="Réduire"
                              >
                                A-
                              </button>
                              <span className="text-[10px] font-mono text-luxury-text-muted px-1 min-w-[32px] text-center">{textSize}px</span>
                              <button 
                                onClick={() => {
                                  const size = Math.min(24, textSize + 1);
                                  setTextSize(size);
                                  localStorage.setItem('bible_text_size', String(size));
                                }}
                                className="w-7 h-7 bg-luxury-bg hover:bg-luxury-surface text-luxury-text-primary rounded border border-luxury-border flex items-center justify-center text-xs font-bold cursor-pointer transition-all duration-200"
                                title="Agrandir"
                              >
                                A+
                              </button>

                              <div className="w-[1px] h-4 bg-luxury-border/60 mx-1"></div>

                              <button
                                onClick={toggleFocusMode}
                                className={`w-7 h-7 rounded flex items-center justify-center transition-all duration-300 border cursor-pointer ${
                                  isFocusMode 
                                    ? 'bg-luxury-gold border-luxury-gold text-luxury-bg shadow-gold-glow animate-pulse' 
                                    : 'bg-luxury-bg border-luxury-border hover:bg-luxury-surface text-luxury-text-primary'
                                }`}
                                title={isFocusMode ? "Désactiver le Mode Focus (lecture immersive)" : "Activer le Mode Focus (lecture sans distraction)"}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  const nextVal = !isContinuousAudio;
                                  setIsContinuousAudio(nextVal);
                                  localStorage.setItem('bible_continuous_audio', String(nextVal));
                                }}
                                className={`w-7 h-7 rounded flex items-center justify-center transition-all duration-300 border cursor-pointer ${
                                  isContinuousAudio 
                                    ? 'bg-luxury-gold border-luxury-gold text-luxury-bg shadow-gold-glow' 
                                    : 'bg-luxury-bg border-luxury-border hover:bg-[#252018]/50 text-luxury-text-muted hover:text-luxury-text-primary'
                                }`}
                                title={isContinuousAudio ? "Lecture continue activée (passe automatiquement au chapitre suivant)" : "Lecture continue désactivée"}
                              >
                                <Repeat className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Mini Theme Switcher */}
                            <div className="flex bg-luxury-bg p-0.5 rounded-lg border border-luxury-border text-[9px] font-mono transition-colors duration-300">
                              <button
                                onClick={() => {
                                  setThemeMode('auto');
                                  localStorage.setItem('bible_theme_mode', 'auto');
                                }}
                                className={`px-1.5 py-0.5 rounded transition font-bold cursor-pointer whitespace-nowrap ${
                                  themeMode === 'auto' ? 'bg-luxury-gold text-luxury-bg font-extrabold' : 'text-luxury-text-muted hover:text-luxury-text-primary'
                                }`}
                                title="Automatique"
                              >
                                Auto
                              </button>
                              <button
                                onClick={() => {
                                  setThemeMode('sepia');
                                  localStorage.setItem('bible_theme_mode', 'sepia');
                                }}
                                className={`px-1.5 py-0.5 rounded transition font-bold cursor-pointer ${
                                  themeMode === 'sepia' ? 'bg-luxury-gold text-luxury-bg font-extrabold' : 'text-luxury-text-muted hover:text-luxury-text-primary'
                                }`}
                                title="Thème Sépia"
                              >
                                Sép
                              </button>
                              <button
                                onClick={() => {
                                  setThemeMode('night');
                                  localStorage.setItem('bible_theme_mode', 'night');
                                }}
                                className={`px-1.5 py-0.5 rounded transition font-bold cursor-pointer ${
                                  themeMode === 'night' ? 'bg-luxury-gold text-luxury-bg font-extrabold' : 'text-luxury-text-muted hover:text-luxury-text-primary'
                                }`}
                                title="Thème Nuit"
                              >
                                Nuit
                              </button>
                            </div>

                            {/* TTS Play controls */}
                            <div className="flex items-center gap-1">
                              {isPlayingAudio ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-mono text-[#c9a84c] animate-pulse">
                                    {isContinuousAudio ? 'LECTURE CONTINUE' : 'LECTURE AUDIO'}
                                  </span>
                                  <button
                                    onClick={handleStopTTS}
                                    className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-900/30 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <VolumeX className="w-3 h-3" />
                                    <span>ARRÊTER</span>
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={handlePlayTTS}
                                  disabled={verses.length === 0 || loadingVerses}
                                  className="px-3 py-1.5 bg-[#c9a84c]/10 border border-[#c9a84c]/40 hover:border-[#c9a84c] text-[#c9a84c] rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Volume2 className="w-3 h-3 text-[#c9a84c]" />
                                  <span>ÉCOUTER</span>
                                </button>
                              )}
                            </div>
                          </div>

                        </div>

                      </div>
                    )}

                  </div>
                )}

                {/* --------------------------------------------------- */}
                {/* 3. SEARCH TAB                                       */}
                {/* --------------------------------------------------- */}
                {activeTab === 'search' && (
                  <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
                    <h2 className="text-lg font-serif font-extrabold text-luxury-text-verse">Concordance Sacrée</h2>
                    
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Rechercher (ex: 'berger', 'alliance', 'amour')..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full bg-luxury-surface border border-luxury-border rounded-lg py-2 px-3 pl-9 text-xs focus:border-luxury-gold focus:outline-none text-luxury-text-primary font-serif italic"
                      />
                      <Search className="w-3.5 h-3.5 text-luxury-text-muted absolute left-3 top-3" />
                      {searchQuery && (
                        <button 
                          onClick={() => handleSearch("")}
                          className="absolute right-3 top-2.5 text-luxury-text-muted hover:text-luxury-text-primary"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pb-2">
                      {searchResults.length === 0 ? (
                        <div className="py-24 text-center space-y-2 text-luxury-text-muted">
                          <p className="text-xs">
                            {searchQuery ? "Aucune concordance scripturale locale trouvée." : "Recherchez un terme pour parcourir les chapitres d'études."}
                          </p>
                          <p className="text-[9px] max-w-[260px] mx-auto italic opacity-80">
                            (Indexation locale: Genèse 1-2, Psaumes 23, 91, Matthieu 5, Jean 1, 3, Apocalypse 21)
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-[9px] font-mono tracking-[0.1em] text-luxury-gold uppercase mb-1">
                            {searchResults.length} OCCURRENCES TROUVÉES
                          </div>
                          {searchResults.map((verse) => (
                            <div 
                              key={`${verse.book_id}_${verse.chapter}_${verse.verse}`} 
                              className="p-3.5 bg-luxury-surface rounded-lg border border-luxury-border hover:border-luxury-gold/40 transition text-left cursor-pointer"
                              onClick={() => navigateToVerse(verse.book_id, verse.chapter)}
                            >
                              <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-luxury-gold">
                                <span>{verse.book_name} {verse.chapter}:{verse.verse}</span>
                                <span className="text-[8px] bg-luxury-button-bg px-1.5 py-0.5 rounded uppercase font-mono tracking-wider">
                                  OUVRIR (cap. {verse.chapter})
                                </span>
                              </div>
                              <p className="font-serif italic text-xs leading-relaxed text-luxury-text-primary">
                                "{verse.text.replace(/\[\w+\]/g, '')}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --------------------------------------------------- */}
                {/* 4. AI CHAT BOT TAB                                  */}
                {/* --------------------------------------------------- */}
                {activeTab === 'ai' && (
                  <div className="flex-1 overflow-hidden flex flex-col pt-3">
                    <div className="px-4 pb-2 border-b border-luxury-border flex items-center justify-between">
                      <div>
                        <h2 className="text-xs font-serif font-extrabold text-luxury-text-verse flex items-center gap-1.5 uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 text-luxury-gold" />
                          <span>Sanctuaire Dogmatique</span>
                        </h2>
                        <span className="text-[8px] text-emerald-500 flex items-center gap-1 font-mono tracking-widest mt-0.5">
                          <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping"></span>
                          <span>COMPAGNON EXÉGÉTIQUE GEMINI ACTIVÉ</span>
                        </span>
                      </div>
                      <button 
                        onClick={() => setChatHistory([{ role: 'model', content: 'Historique effacé. De quoi souhaiteriez-vous vous entretenir mon frère ?' }])}
                        className="text-[9px] text-luxury-text-muted hover:text-rose-400 hover:underline"
                      >
                        EFFACER
                      </button>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                      {chatHistory.map((item, index) => (
                        <div 
                          key={index} 
                          className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed border ${
                            item.role === 'user' 
                              ? 'bg-luxury-surface text-luxury-text-primary border-luxury-gold/20 rounded-tr-none font-serif italic' 
                              : 'bg-luxury-surface/50 text-luxury-text-primary border-luxury-border rounded-tl-none font-sans'
                          }`}>
                            {item.content}
                          </div>
                        </div>
                      ))}

                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-luxury-surface rounded-lg p-3 border border-luxury-border flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-luxury-gold rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-luxury-gold rounded-full animate-bounce delay-75"></span>
                            <span className="w-1.5 h-1.5 bg-luxury-gold rounded-full animate-bounce delay-150"></span>
                          </div>
                        </div>
                      )}
                      
                      <div ref={chatBottomRef}></div>
                    </div>

                    {/* Quick helper triggers */}
                    <div className="px-3 py-1 flex gap-1.5 overflow-x-auto bg-luxury-surface/50 border-t border-luxury-border pb-2 class pt-2">
                      <button 
                        onClick={() => setChatMessage("Qui a inspiré la rédaction de la Genèse et du Pentateuque ?")}
                        className="bg-luxury-bg hover:bg-luxury-button-bg text-[9px] px-2.5 py-1 rounded-full border border-luxury-border text-luxury-text-primary shrink-0"
                      >
                        Auteurs du Pentateuque ?
                      </button>
                      <button 
                        onClick={() => setChatMessage("Quel est le rapport d'étymologie entre la Parole divine et le code Strong [G3056] Logos ?")}
                        className="bg-luxury-bg hover:bg-luxury-button-bg text-[9px] px-2.5 py-1 rounded-full border border-luxury-border text-luxury-text-primary shrink-0"
                      >
                        Signification de Logos [G3056] ?
                      </button>
                      <button 
                        onClick={() => setChatMessage("Explique la formule prophétique du Psaume 23 'L'Éternel est mon berger' ?")}
                        className="bg-luxury-bg hover:bg-luxury-button-bg text-[9px] px-2.5 py-1 rounded-full border border-luxury-border text-luxury-text-primary shrink-0"
                      >
                        Psaume 23 : Berger ?
                      </button>
                    </div>

                    {/* Send message form */}
                    <form onSubmit={handleSendChatMessage} className="p-3 bg-luxury-surface border-t border-luxury-border flex gap-2">
                      <input 
                        type="text"
                        placeholder="Poser un dilemme théologique ou historique..."
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        className="flex-1 bg-luxury-bg border border-luxury-border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-luxury-gold focus:outline-none text-luxury-text-primary font-serif italic"
                      />
                      <button
                        type="submit"
                        disabled={chatLoading || !chatMessage.trim()}
                        className="w-10 h-10 bg-luxury-button-bg border border-[#c9a84c]/50 text-[#c9a84c] hover:border-[#c9a84c] rounded-lg flex items-center justify-center transition cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                )}

                {/* --------------------------------------------------- */}
                {/* 5. FAVORITES & NOTES TAB                            */}
                {/* --------------------------------------------------- */}
                {activeTab === 'favorites' && (
                  <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
                    {/* Switcher between Favorites and Notes */}
                    <div className="flex border-b border-luxury-border">
                      <button
                        onClick={() => setFavSubTab('favs')}
                        className={`flex-1 pb-2.5 text-xs font-serif font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          favSubTab === 'favs' ? 'text-luxury-gold border-b-2 border-luxury-gold' : 'text-luxury-text-muted hover:text-luxury-text-primary'
                        }`}
                      >
                        <Heart className="w-3.5 h-3.5" fill={favSubTab === 'favs' ? 'currentColor' : 'none'} />
                        <span>Favoris ({favorites.length})</span>
                      </button>
                      <button
                        onClick={() => setFavSubTab('notes')}
                        className={`flex-1 pb-2.5 text-xs font-serif font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          favSubTab === 'notes' ? 'text-luxury-gold border-b-2 border-luxury-gold' : 'text-luxury-text-muted hover:text-luxury-text-primary'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Mes Notes ({notes.length})</span>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 scrollbar-thin">
                      {favSubTab === 'favs' ? (
                        favorites.length === 0 ? (
                          <div className="py-24 text-center space-y-2 text-luxury-text-muted">
                            <p className="text-xs">Aucun verset mémorisé dans vos favoris d'études.</p>
                            <p className="text-[10px] max-w-[220px] mx-auto italic">
                              Appuyez sur le bouton "Sauver" sous un verset lors de vos séances de lecture.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3 pb-2">
                            {favorites.map((fav) => (
                              <div 
                                key={`${fav.book_id}_${fav.chapter}_${fav.verse}`}
                                className="bg-luxury-surface p-4 rounded-xl border border-luxury-border shadow-soft relative group"
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <span 
                                    onClick={() => navigateToVerse(fav.book_id, fav.chapter)}
                                    className="text-xs font-serif font-bold text-luxury-gold hover:underline cursor-pointer"
                                  >
                                    {fav.book_name} {fav.chapter}:{fav.verse}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const v: Verse = {
                                        book_id: fav.book_id,
                                        book_name: fav.book_name,
                                        chapter: fav.chapter,
                                        verse: fav.verse,
                                        text: fav.text
                                      };
                                      handleToggleFavorite(v);
                                    }}
                                    className="text-luxury-text-muted hover:text-rose-400 transition cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <p className="font-serif italic text-xs leading-relaxed text-luxury-text-primary">
                                  " {fav.text.replace(/\[\w+\]/g, '')} "
                                </p>

                                <div className="mt-3.5 flex justify-end gap-2.5">
                                  <button
                                    onClick={() => {
                                      const v: Verse = {
                                        book_id: fav.book_id,
                                        book_name: fav.book_name,
                                        chapter: fav.chapter,
                                        verse: fav.verse,
                                        text: fav.text
                                      };
                                      handleExplainVerse(v);
                                    }}
                                    className="px-3 py-1 bg-luxury-button-bg border border-luxury-gold/20 hover:border-luxury-gold/50 text-luxury-gold rounded text-[9px] font-bold flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Sparkles className="w-3 h-3 text-luxury-gold" />
                                    <span>LIRE L'EXÉGÈSE</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      ) : (
                        notes.length === 0 ? (
                          <div className="py-24 text-center space-y-2 text-luxury-text-muted">
                            <p className="text-xs">Aucune note ou méditation enregistrée.</p>
                            <p className="text-[10px] max-w-[220px] mx-auto italic font-sans">
                              Sélectionnez un verset dans le lecteur et rédigez votre réflexion personnelle dans la boîte de note.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3 pb-2">
                            {notes.map((note) => (
                              <div 
                                key={`${note.book_id}_${note.chapter}_${note.verse}`}
                                className="bg-luxury-surface p-4 rounded-xl border border-luxury-border shadow-soft relative"
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <span 
                                    onClick={() => navigateToVerse(note.book_id, note.chapter)}
                                    className="text-xs font-serif font-bold text-luxury-gold hover:underline cursor-pointer"
                                  >
                                    {note.book_name} {note.chapter}:{note.verse}
                                  </span>
                                  <span className="text-[9px] font-mono text-luxury-text-muted">
                                    Modifié le {note.updated_at}
                                  </span>
                                </div>

                                <p className="font-serif italic text-xs leading-relaxed text-luxury-text-primary px-3 bg-[#12100c] border border-luxury-border/30 rounded-xl p-3 mb-3">
                                  {note.note}
                                </p>

                                <div className="flex justify-between items-center">
                                  <button
                                    onClick={() => navigateToVerse(note.book_id, note.chapter)}
                                    className="px-2.5 py-1 text-[9px] text-[#c9a84c] border border-[#c9a84c]/20 hover:border-[#c9a84c]/50 rounded font-bold font-mono transition cursor-pointer"
                                  >
                                    LIRE LE PASSAGE ➔
                                  </button>
                                  <button
                                    onClick={() => {
                                      const v: Verse = {
                                        book_id: note.book_id,
                                        book_name: note.book_name,
                                        chapter: note.chapter,
                                        verse: note.verse,
                                        text: ""
                                      };
                                      handleSaveNote(v, "");
                                    }}
                                    className="text-[10px] text-rose-400 hover:text-rose-300 font-mono cursor-pointer"
                                  >
                                    Effacer
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'lexicon' && (
                  <div className="flex-1 overflow-hidden flex flex-col bg-[#0d0b07]">
                    <StrongLexicon 
                      highlightedCode={selectedStrong?.code}
                      onClearHighlight={() => setSelectedStrong(null)}
                      onNavigateToChapter={(bookId, chapterNum) => {
                        const bk = BOOKS.find(b => b.id === bookId);
                        if (bk) {
                          setSelectedBook(bk);
                          setSelectedChapter(chapterNum);
                          setNavBook(bk);
                          setNavChapter(chapterNum);
                          setNavTestament(bk.testament);
                          setIsNavigating(false);
                          setActiveTab('read');
                        }
                      }}
                      onExplainVerse={(verse) => handleExplainVerse(verse)}
                    />
                  </div>
                )}

              </div>

              {/* Bottom Main Tab Bar - LUXURY CARVED BACKGROUND - Hidden in Focus Mode */}
              {!isActualFocusMode && (
                <div className="h-[74px] bg-[#12100c] border-t border-[#221e16] flex justify-around items-center px-2 rounded-b-[2.5rem] relative z-20">
                  <button 
                    onClick={() => setActiveTab('home')}
                    className={`flex flex-col items-center gap-1.5 px-1 py-1 rounded-lg transition ${
                      activeTab === 'home' ? 'text-luxury-gold font-bold scale-105' : 'text-luxury-text-muted hover:text-luxury-text-primary'
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    <span className="text-[8.5px]">Accueil</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('read')}
                    className={`flex flex-col items-center gap-1.5 px-1 py-1 rounded-lg transition ${
                      activeTab === 'read' ? 'text-luxury-gold font-bold scale-105' : 'text-luxury-text-muted hover:text-luxury-text-primary'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span className="text-[8.5px]">Lecture</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('lexicon')}
                    className={`flex flex-col items-center gap-1.5 px-1 py-1 rounded-lg transition ${
                      activeTab === 'lexicon' ? 'text-luxury-gold font-bold scale-105' : 'text-luxury-text-muted hover:text-luxury-text-primary'
                    }`}
                  >
                    <BookOpenCheck className="w-4 h-4" />
                    <span className="text-[8.5px]">Lexique</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('search')}
                    className={`flex flex-col items-center gap-1.5 px-1 py-1 rounded-lg transition ${
                      activeTab === 'search' ? 'text-luxury-gold font-bold scale-105' : 'text-luxury-text-muted hover:text-luxury-text-primary'
                    }`}
                  >
                    <Search className="w-4 h-4" />
                    <span className="text-[8.5px]">Occurrences</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('ai')}
                    className={`flex flex-col items-center gap-1.5 px-1 py-1 rounded-lg transition ${
                      activeTab === 'ai' ? 'text-luxury-gold font-bold scale-105' : 'text-luxury-text-muted hover:text-luxury-text-primary'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-[8.5px]">Exégèse IA</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('favorites')}
                    className={`flex flex-col items-center gap-1.5 px-1 py-1 rounded-lg transition ${
                      activeTab === 'favorites' ? 'text-luxury-gold font-bold scale-105' : 'text-luxury-text-muted hover:text-luxury-text-primary'
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                    <span className="text-[8.5px]">Mes Notes</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: THE AI THEOLOGICAL DESK (DESKTOP EXTENSION)  */}
        {/* ========================================================= */}
        {!isActualFocusMode && (
          <div className="lg:col-span-7 xl:col-span-7 space-y-6">
          
          {/* Main Workspace Headbanner */}
          <div className="bg-luxury-surface border border-luxury-border p-6 rounded-2xl shadow-soft">
            <h2 className="text-xl font-serif font-extrabold text-luxury-text-verse flex items-center gap-2.5">
              <BookOpenCheck className="w-6 h-6 text-luxury-gold" />
              <span>Pupitre d'Études Exégétiques & Philologiques</span>
            </h2>
            <p className="text-xs text-luxury-text-primary/75 mt-2.5 leading-relaxed">
              Activez le simulateur mobile à gauche pour charger les analyses. 
              Cliquez sur les annotations Strong de la version Louis Segond (p.ex. <span className="text-luxury-text-accent font-bold">[H7225]</span> ou <span className="text-luxury-text-accent font-bold">[G3056]</span>) pour explorer la racine des mots d'origine en grec hébreu, ou commandez l'élucidation de n'importe quel verset par l'IA.
            </p>
          </div>

          {/* Active Workstation context displays */}
          
          {/* A. Strong Hebrew/Greek lookup result popup */}
          {selectedStrong && (
            <div className="bg-luxury-surface border-2 border-luxury-gold/50 p-6 rounded-2xl shadow-gold-glow space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-luxury-gold animate-ping"></span>
                  <span className="font-mono text-[10px] tracking-widest font-extrabold text-luxury-gold uppercase">
                    LEXIQUE DE TRANSLITÉRATION STRONG [{selectedStrong.code}]
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedStrong(null)}
                  className="p-1 text-luxury-text-muted hover:text-luxury-text-primary rounded-full transition"
                  title="Fermer le lexique"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 py-1">
                <div className="w-14 h-14 bg-luxury-bg border border-luxury-border rounded-xl flex items-center justify-center font-serif text-3xl font-extrabold text-luxury-text-verse shadow-soft">
                  {selectedStrong.word}
                </div>
                <div>
                  <h3 className="font-serif italic font-extrabold text-xl text-luxury-gold-light">
                    {selectedStrong.transliteration}
                  </h3>
                  <span className="font-mono text-[9px] tracking-widest text-[#9ca3af] uppercase">
                    Langue source : {selectedStrong.language === 'greek' ? 'Grec antique' : 'Hébreu biblique'}
                  </span>
                </div>
              </div>

              <div className="space-y-4 text-xs font-serif leading-relaxed text-luxury-text-primary">
                <div className="bg-luxury-bg p-4 rounded-xl border border-luxury-border">
                  <span className="block font-mono text-[9px] text-[#9ca3af] tracking-wider uppercase mb-1.5">Définition & Explication théologique</span>
                  <p className="italic text-sm">
                    {selectedStrong.definition}
                  </p>
                </div>

                {selectedStrong.usage && (
                  <div className="p-3 bg-luxury-button-bg/40 rounded-xl border border-luxury-border/50">
                    <span className="block font-mono text-[8px] text-luxury-gold tracking-wider uppercase mb-1">Occurrences et occurrences classiques</span>
                    <p className="text-xs text-luxury-text-primary/90 italic font-mono">
                      {selectedStrong.usage}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setChatMessage(`Fais-moi un exposé théologique profond sur le code Strong ${selectedStrong.code} (${selectedStrong.word}), sa translitération "${selectedStrong.transliteration}" et sa dimension symbolique dans les saintes écritures.`);
                    setActiveTab('ai');
                  }}
                  className="px-4 py-2 bg-luxury-bg hover:bg-luxury-button-bg border border-luxury-gold/50 hover:border-luxury-gold text-luxury-gold rounded-lg text-xs font-bold font-serif tracking-wide transition flex items-center gap-1.5 shadow-gold-glow"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  <span>Demander une étude doctrinale à Gemini</span>
                </button>
              </div>
            </div>
          )}

          {/* B. Synthesis of active chapter */}
          {chapterSummary && (
            <div className="bg-luxury-surface border border-luxury-border p-6 rounded-2xl shadow-soft relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <button 
                  onClick={() => setChapterSummary("")}
                  className="p-1 text-luxury-text-muted hover:text-luxury-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-luxury-gold" />
                <h3 className="font-serif italic font-extrabold text-luxury-text-verse text-md">
                  Synthèse thématique : {selectedBook.name} {selectedChapter}
                </h3>
              </div>

              <div className="bg-luxury-bg p-5 rounded-xl border border-luxury-border whitespace-pre-line text-sm leading-relaxed text-luxury-text-primary font-serif">
                {chapterSummary}
              </div>
            </div>
          )}

          {summaryLoading && (
            <div className="bg-luxury-surface border border-luxury-gold/30 p-8 rounded-2xl text-center space-y-4 shadow-gold-glow">
              <div className="w-8 h-8 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs tracking-widest font-mono text-luxury-gold">GEMINI CONSTRUCTURE DE LA SYNTHÈSE DOCTRINALE DE {selectedBook.name.toUpperCase()} {selectedChapter}...</p>
            </div>
          )}

          {/* C. Verse Analysis Window */}
          <div className="bg-luxury-surface rounded-2xl border border-luxury-border shadow-soft overflow-hidden">
            
            <div className="p-4 bg-[#12100c] border-b border-luxury-border flex justify-between items-center px-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-luxury-gold animate-pulse" />
                <h3 className="font-serif italic font-extrabold text-luxury-text-verse text-sm">Exégèse de passage herméneutique</h3>
              </div>
              
              {selectedVerseForExplain && (
                <button 
                  onClick={() => setSelectedVerseForExplain(null)}
                  className="text-xs text-luxury-text-muted hover:text-luxury-gold underline"
                >
                  Fermer l'étude
                </button>
              )}
            </div>

            <div className="p-6 space-y-4 text-left">
              {explainLoading ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-8 h-8 border-2 border-luxury-gold border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-mono text-luxury-gold tracking-widest">
                    RECHERCHE EXÉGÉTIQUE DE {selectedVerseForExplain?.book_name.toUpperCase()} {selectedVerseForExplain?.chapter}:{selectedVerseForExplain?.verse}...
                  </p>
                  <p className="text-[10px] text-luxury-text-muted max-w-[340px] mx-auto italic">
                    (Traduction de l'hébreu araméen/grec de la version Louis Segond, étude historique du temple et applications spirituelles doctrinales)
                  </p>
                </div>
              ) : selectedVerseForExplain ? (
                <div className="space-y-6">
                  
                  {/* Scripture focus display */}
                  <div className="p-4 bg-luxury-bg border-l-4 border-luxury-gold rounded-r-lg">
                    <span className="font-serif text-[10px] uppercase font-bold tracking-[0.2em] text-luxury-text-verse filter drop-shadow">
                      {selectedVerseForExplain.book_name} {selectedVerseForExplain.chapter}:{selectedVerseForExplain.verse}
                    </span>
                    <p className="font-serif italic text-base sm:text-lg leading-relaxed text-luxury-text-primary mt-1.5">
                      " {selectedVerseForExplain.text.replace(/\[\w+\]/g, '')} "
                    </p>
                  </div>

                  {/* Extract words component if loaded */}
                  <AnalysisCard 
                    type="linguistic"
                    title="Racines étymologiques & philologiques"
                    content="Recherche des racines hébraïques ou grecques correspondant aux codes dictionnaire Strong associés à ce verset."
                    strongWords={extractStrongWords()}
                    onStrongPress={handleStrongLookup}
                  />

                  {/* Herméneutique text section */}
                  <ContextSection 
                    label={`EXÉGÈSE DÉTAILLÉE : ${selectedVerseForExplain.book_name.toUpperCase()} ${selectedVerseForExplain.chapter}:${selectedVerseForExplain.verse}`}
                    content={explanationText || "Analyse en attente."}
                  />

                  <div className="flex gap-2.5 justify-end">
                    <button
                      onClick={() => {
                        const copyTxt = `Exégèse de ${selectedVerseForExplain.book_name} ${selectedVerseForExplain.chapter}:${selectedVerseForExplain.verse}\n\n${explanationText}`;
                        navigator.clipboard.writeText(copyTxt);
                        alert("Analyse de l'assistant IA copiée dans le presse-papiers!");
                      }}
                      className="px-3 py-1.5 bg-luxury-bg hover:bg-luxury-button-bg text-luxury-text-primary rounded border border-luxury-border text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copier l'exégèse</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setChatMessage(`Continuons d'analyser le verset ${selectedVerseForExplain.book_name} ${selectedVerseForExplain.chapter}:${selectedVerseForExplain.verse}. Pourriez-vous éduquer mon esprit sur la symbolique mystique de ce passage ?`);
                        setActiveTab('ai');
                      }}
                      className="px-3.5 py-1.5 bg-luxury-button-bg border border-luxury-gold hover:border-luxury-gold-light text-luxury-gold rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-gold-glow"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>S'entretenir avec l'IA</span>
                    </button>
                  </div>

                </div>
              ) : (
                <div className="py-24 text-center space-y-4">
                  <div className="w-12 h-12 bg-luxury-button-bg text-luxury-gold rounded-full flex items-center justify-center mx-auto border border-luxury-gold/20 shadow-gold-glow">
                    <BookMarked className="w-5.5 h-5.5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-luxury-text-verse font-serif font-extrabold text-sm uppercase tracking-wide">PUPITRE D'EXÉGÈSE EN ATTENTE</p>
                    <p className="text-xs text-luxury-text-muted max-w-[320px] mx-auto italic">
                      Dans le simulateur mobile à gauche, appuyez sur <strong className="text-luxury-gold font-bold">Expliquer</strong> sous le verset de votre choix pour charger l'analyse.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Quick Informational footer box */}
          <div className="bg-luxury-surface border border-luxury-border p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-luxury-gold/5 rounded-full blur-2xl"></div>
            <h3 className="font-serif italic font-extrabold text-base text-luxury-text-verse mb-2 flex items-center gap-1.5">
              <Activity className="w-5 h-5 text-luxury-gold" />
              <span>Anatomie du Dictionnaire Strong Louis Segond</span>
            </h3>
            <p className="text-xs text-luxury-text-primary/70 font-serif leading-relaxed mb-4">
              La traduction de 1910 de Louis Segond contient les codes grammaticaux universels indexés par James Strong en 1890. Notre dictionnaire analyse ces références directement du grec ancien (Nouveau Testament) et de l'hébreu ancien (Ancien Testament) en relation constante avec les explications érudites de Gemini pour préserver la vérité doctrinale originelle.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-luxury-border/30 pt-4 mt-4">
              <div className="flex flex-wrap gap-2">
                <span className="bg-[#12100c] border border-luxury-border px-2.5 py-1 rounded text-[10px] text-luxury-gold font-bold uppercase">LOUIS SEGOND 1910</span>
                <span className="bg-[#12100c] border border-luxury-border px-2.5 py-1 rounded text-[10px] text-luxury-gold font-bold uppercase">ASSISTANCE EXÉGÉTIQUE IA</span>
                <span className="bg-[#12100c] border border-luxury-border px-2.5 py-1 rounded text-[10px] text-luxury-gold font-bold uppercase">SQLITE LOCAL OFFLINE</span>
              </div>
              <button
                onClick={() => {
                  resetSqliteDatabase();
                  setSqliteDbReady(false);
                  setSqliteProgress(0);
                  setSqliteStatusText("Réinitialisation de la base...");
                }}
                className="text-[10px] text-luxury-text-muted hover:text-luxury-gold transition font-mono uppercase tracking-wider flex items-center justify-center gap-1 bg-[#12100c] hover:bg-luxury-button-bg border border-luxury-border hover:border-luxury-gold/40 px-2.5 py-1.5 rounded-lg self-start sm:self-auto"
                title="Rejouer l'onboarding d'import SQLite lors du premier lancement"
              >
                <Settings className="w-3 h-3 text-luxury-gold" />
                <span>Réinitialiser SQLite</span>
              </button>
            </div>
          </div>

        </div>
        )}

      </div>

    </div>
  );
}
