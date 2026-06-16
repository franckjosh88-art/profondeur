import React, { useState, useEffect, useRef } from 'react';
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
  Verse, Book, FavoriteVerse, VerseNote, ReadingHistory, DailyVerse 
} from './types/bible';
import { 
  BOOKS, getDailyVerseForToday, querySqliteChapter, searchLocalVerses, isSqliteInitialized, initializeSqliteDatabase, fetchOnlineChapter 
} from './data/bibleData';

import { 
  BookOpen, Search, User as UserIcon, LogOut, Settings, Eye, EyeOff, AlertCircle, ChevronUp, ChevronDown, Check, X, Bookmark, Copy, Sparkles, MessageSquare, Flame, HelpCircle, ArrowRight, Share2, Plus, Play, ChevronLeft, ChevronRight, Award, Bell, Pause, Square, SkipBack, SkipForward, Volume2, VolumeX, Compass, Library
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Subcomponents import
import { TopBar } from './components/TopBar';
import { VerseItem } from './components/VerseItem';
import { StrongLexicon } from './components/StrongLexicon';
import { ReadingChallenges } from './components/ReadingChallenges';
import { StudyStatsChart } from './components/StudyStatsChart';
import { DailyReminder } from './components/DailyReminder';
import { AnalysisCard } from './components/AnalysisCard';
import { ContextSection } from './components/ContextSection';
import { VerseQuote } from './components/VerseQuote';
import { RevelationBadge } from './components/RevelationBadge';
import { cleanBibleMarkdown } from './lib/bibleFormatter';
import { VerseComparison } from './components/VerseComparison';
import { BibleDictionary } from './components/BibleDictionary';

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

  // User Settings 
  const [textSize, setTextSize] = useState<number>(18);
  const [themeMode, setThemeMode] = useState<'dark' | 'sepia'>('dark');
  const [selectedTranslation, setSelectedTranslation] = useState<string>(() => {
    try {
      return localStorage.getItem('bible_translation') || 'local';
    } catch (_) {
      return 'local';
    }
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // App Navigation Tabs
  // 'read' -> Bible text with interactive verse items, 'challenges' -> Reading plans & Stats, 'dictionary' -> Strong lexicon concordance, 'assistant' -> Chatbot, 'encyclopedia' -> Bible Dictionary
  const [activeTab, setActiveTab] = useState<'read' | 'challenges' | 'dictionary' | 'assistant' | 'encyclopedia'>('read');

  // Local database initialization
  const [sqliteDbReady, setSqliteDbReady] = useState<boolean>(false);
  const [dbInitProgress, setDbInitProgress] = useState<number>(0);
  const [dbInitText, setDbInitText] = useState<string>('Préparation de la base de données...');

  // Reading Passage States
  const [selectedBook, setSelectedBook] = useState<Book>(BOOKS[0]); // Default to Genesis
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [chapterVerses, setChapterVerses] = useState<Verse[]>([]);
  const [loadingVerses, setLoadingVerses] = useState<boolean>(false);
  const [selectedVerseId, setSelectedVerseId] = useState<string | null>(null); // formatted as "bookId_chapter_verse"
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // AI Chapter Summary Cache state
  const [chapterSummary, setChapterSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);

  // AI Single Verse Explanation State
  const [activeExplainVerse, setActiveExplainVerse] = useState<Verse | null>(null);
  const [verseExplanation, setVerseExplanation] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState<boolean>(false);
  const [exegesisTab, setExegesisTab] = useState<'exegesis' | 'compare'>('exegesis');

  // Interactive dictionary linking state
  const [targetedStrongCode, setTargetedStrongCode] = useState<string | null>(null);

  // Chat conversation
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', content: string}[]>([
    { role: 'model', content: "Paix et joie ! Je suis votre guide théologique d'étude biblique. Comment puis-je vous accompagner dans les écritures sacrées aujourd'hui ?" }
  ]);
  const [loadingChat, setLoadingChat] = useState<boolean>(false);

  // Synced User Collections from Firestore
  const [favorites, setFavorites] = useState<FavoriteVerse[]>([]);
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

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      
      if (firebaseUser) {
        setAuthError(null);
        setupUserSnapshotListeners(firebaseUser.uid);
      } else {
        setFavorites([]);
        setNotes([]);
        setReadingHistory([]);
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

  // Load and cache chapter verses on Book or Chapter selector changes
  useEffect(() => {
    if (!sqliteDbReady) return;
    
    let active = true;
    setLoadingVerses(true);
    setSelectedVerseId(null);
    setChapterSummary(null); // Clear active summary cache

    const loadVerses = async () => {
      try {
        if (selectedTranslation === 'local') {
          const verses = querySqliteChapter(selectedBook.id, selectedBook.name, selectedChapter);
          if (active) setChapterVerses(verses);
        } else {
          const verses = await fetchOnlineChapter(selectedBook.id, selectedBook.name, selectedChapter, selectedTranslation);
          if (active) setChapterVerses(verses);
        }
      } catch (err) {
        console.warn("Failed to load online chapter scriptures, falling back to local:", err);
        // Fallback to local offline verses
        const verses = querySqliteChapter(selectedBook.id, selectedBook.name, selectedChapter);
        if (active) setChapterVerses(verses);
      } finally {
        if (active) setLoadingVerses(false);
      }
    };

    loadVerses();

    return () => {
      active = false;
    };
  }, [selectedBook, selectedChapter, sqliteDbReady, selectedTranslation]);

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
    setAuthError(null);
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
      console.error(err);
      setAuthError("Connexion avec l'authentification Google impossible ou annulée.");
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

  // Synchronize reading log state, marking current chapter as completed
  const markCurrentChapterRead = async () => {
    if (!user) return;
    
    // Check if already exist
    const isAlreadyRead = readingHistory.some(
      h => h.book_id === selectedBook.id && h.chapter === selectedChapter
    );
    if (isAlreadyRead) return;

    try {
      const historyItem: ReadingHistory = {
        book_id: selectedBook.id,
        book_name: selectedBook.name,
        chapter: selectedChapter,
        timestamp: new Date().toISOString()
      };
      
      const docId = `history_${selectedBook.id}_${selectedChapter}`;
      await setDoc(doc(db, 'users', user.uid, 'history', docId), historyItem);
    } catch (error) {
      console.error("Error saving reading progress record:", error);
    }
  };

  // Bookmark toggling helper
  const handleToggleFavorite = async (verse: Verse) => {
    if (!user) return;
    
    const docId = `${verse.book_id}_${verse.chapter}_${verse.verse}`;
    const favorited = favorites.some(
      f => f.book_id === verse.book_id && f.chapter === verse.chapter && f.verse === verse.verse
    );

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
      console.error("Could not toggle favorite status:", error);
    }
  };

  // Save Verse Note helper
  const handleSaveSpiritualNote = async (verse: Verse, textNote: string, audioBase64?: string) => {
    if (!user) return;

    const docId = `${verse.book_id}_${verse.chapter}_${verse.verse}`;
    const docRef = doc(db, 'users', user.uid, 'notes', docId);

    try {
      const existingNote = notes.find(n => n.book_id === verse.book_id && n.chapter === verse.chapter && n.verse === verse.verse);
      let targetAudio = existingNote?.audio;

      if (audioBase64 === '') {
        targetAudio = undefined;
      } else if (audioBase64) {
        targetAudio = audioBase64;
      }

      if (textNote.trim() === '' && !targetAudio) {
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
        await setDoc(docRef, noteItem);
      }
    } catch (error) {
      console.error("Could not save note:", error);
    }
  };

  // Single Verse Explain via AI exegesis endpoint
  const handleExplainVerse = async (verse: Verse, tab: 'exegesis' | 'compare' = 'exegesis') => {
    setActiveExplainVerse(verse);
    setExegesisTab(tab);
    setVerseExplanation(null);
    setLoadingExplanation(true);
    
    try {
      const response = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verseText: verse.text,
          reference: `${verse.book_name} ${verse.chapter}:${verse.verse}`,
          bookName: verse.book_name
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de joindre l'interlocuteur d'étude.");
      
      setVerseExplanation(data.explanation || "Exégèse non générée par le modèle théologique.");
    } catch (err: any) {
      console.error("Bible Explanation query fails:", err);
      setVerseExplanation(`Échec d'exégèse : ${err.message || 'Problème de connexion réseau.'}`);
    } finally {
      setLoadingExplanation(false);
    }
  };

  // Chapter Summary trigger via Gemini API
  const handleSummarizeChapter = async () => {
    setLoadingSummary(true);
    setChapterSummary(null);

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

      setChapterSummary(data.summary || "Aucun résumé n'a pu être structuré.");
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

  // Web Speech API Text-to-Speech (TTS) Integration
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentSpeakingVerseIndex, setCurrentSpeakingVerseIndex] = useState<number>(-1);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const currentVerseToSpeakRef = useRef<number>(-1);

  // Clean up speech synthesis when navigating away or selecting another chapter
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [selectedBook, selectedChapter, activeTab]);

  const speakVerse = (index: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (index < 0 || index >= chapterVerses.length) {
      stopSpeaking();
      return;
    }

    window.speechSynthesis.cancel();
    setCurrentSpeakingVerseIndex(index);
    currentVerseToSpeakRef.current = index;

    const verseObj = chapterVerses[index];
    // Remove Strong codes from the spoken reading
    const cleanText = verseObj.text.replace(/\[[HG]\d+\]/g, '').trim();
    const textToSpeak = `Verset ${verseObj.verse}. ${cleanText}`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'fr-FR';
    utterance.rate = playbackRate;

    // Dynamically look up French voice for Louis Segond French reading
    const voices = window.speechSynthesis.getVoices();
    const frenchVoice = voices.find(voice => voice.lang.startsWith('fr') || voice.lang.includes('FR')) || null;
    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }

    utterance.onend = () => {
      // Move consecutively to next verse if we are still active on index
      if (currentVerseToSpeakRef.current === index) {
        speakVerse(index + 1);
      }
    };

    utterance.onerror = (e) => {
      console.error("Speech Synthesis Utterance Error:", e);
      if (e.error !== 'interrupted' && currentVerseToSpeakRef.current === index) {
        stopSpeaking();
      }
    };

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const pauseSpeaking = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  const resumeSpeaking = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  };

  const stopSpeaking = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
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

  // Reading plans navigation integration helper
  const handleNavigateChallengeToReader = (bookId: number, chapterNum: number) => {
    const targetBook = BOOKS.find(b => b.id === bookId);
    if (targetBook) {
      setSelectedBook(targetBook);
      setSelectedChapter(chapterNum);
      setActiveTab('read');
    }
  };

  // Check if a specific verse ID matches notes and bookmarks
  const getVerseHasBookmark = (v: Verse) => {
    return favorites.some(f => f.book_id === v.book_id && f.chapter === v.chapter && f.verse === v.verse);
  };

  const getVerseHasNote = (v: Verse): { hasNote: boolean; text: string; audio?: string } => {
    const found = notes.find(n => n.book_id === v.book_id && n.chapter === v.chapter && n.verse === v.verse);
    return {
      hasNote: found !== undefined,
      text: found ? found.note : '',
      audio: found ? found.audio : undefined
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
            className="w-full py-3 bg-[#0d0b07] hover:bg-[#1a1712] text-[#e8e0d0] border border-[#2e2a1e] rounded-xl transition text-[10px] font-mono tracking-widest uppercase flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>Google Sign-In</span>
          </button>
        </div>
      </div>
    );
  }

  // Main Authenticated Layout
  return (
    <div className="min-h-screen bg-luxury-bg-deep text-[#e8e0d0] flex flex-col font-sans selection:bg-[#c9a84c]/20 pb-20 md:pb-6 text-left selection:text-[#c9a84c]">
      
      {/* Dynamic luxury TopBar header, syncing click navigations */}
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

      {/* Embedded Settings Box/Drawer */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full bg-[#12100c] border-b border-[#2e2a1e] py-5 px-4"
          >
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#2e2a1e]/60">
                <h4 className="font-serif text-[#c9a84c] text-sm font-bold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                  <Settings className="w-4 h-4 text-[#c9a84c]" />
                  <span>Ma Cabine d'Études & Préférences</span>
                </h4>
                <button onClick={() => setIsSettingsOpen(false)} className="text-[#6b6355] hover:text-white transition">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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
                  <span className="text-[8px] font-mono uppercase tracking-wider text-[#6b6355]">PASTAGE VISUEL</span>
                  
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
                        className={`flex-1 py-1.5 text-[9px] font-mono uppercase border rounded-lg transition ${
                          themeMode === 'dark' ? 'bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c]' : 'text-[#6b6355] border-[#2e2a1e]'
                        }`}
                      >
                        Nuit noire 
                      </button>
                      <button 
                        onClick={() => setThemeMode('sepia')}
                        className={`flex-1 py-1.5 text-[9px] font-mono uppercase border rounded-lg transition ${
                          themeMode === 'sepia' ? 'bg-[#8e6812]/20 text-[#8e6812] border-[#8e6812]' : 'text-[#6b6355] border-[#2e2a1e]'
                        }`}
                      >
                        Vieux parchemin
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Sync and database statistics */}
                <div className="bg-[#0f0e0b] border border-[#2e2a1e]/60 p-4 rounded-xl space-y-2 text-left">
                  <span className="text-[8px] font-mono uppercase tracking-wider text-[#6b6355]">SAISIE DE CONFIANCE</span>
                  <div className="space-y-1 text-xs">
                    <p className="text-[#6b6355]">Favoris / Signets : <span className="font-mono text-[#e8e0d0] font-bold">{favorites.length}</span></p>
                    <p className="text-[#6b6355]">Notes d'études : <span className="font-mono text-[#e8e0d0] font-bold">{notes.length}</span></p>
                    <p className="text-[#6b6355]">Chapitres lus : <span className="font-mono text-[#e8e0d0] font-bold">{readingHistory.length}</span></p>
                  </div>
                  <div className="text-[8.5px] text-[#6b6355] italic leading-relaxed pt-1.5 border-t border-[#2e2a1e]/40">
                    * Toutes vos données sont sauvegardées en temps réel sur Firestore cloud.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col md:flex-row gap-6">
        
        {/* SIDEBAR NAVIGATION TAB COLUMN FOR MEDIUM+ DISPLAY */}
        <aside className="w-full md:w-60 shrink-0 hidden md:flex flex-col gap-1.5 text-left font-serif py-1">
          <span className="text-[10px] font-mono font-black uppercase text-[#6b6355] tracking-[0.24em] px-3 mb-2">Sanctuaire</span>
          
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

          <div className="pt-4 border-t border-[#2e2a1e]/40 mt-2 px-3">
            <span className="text-[8.5px] font-mono uppercase text-[#6b6355] tracking-widest block">PASSAGE ACTUEL</span>
            <p className="text-xs font-serif italic text-[#c9a84c] font-bold mt-1">
              {selectedBook.name} · {selectedChapter}
            </p>
          </div>
        </aside>

        {/* CONTAINER SWITCH FOR THE POWERFUL ACTIVE TABS */}
        <div className="flex-1 flex flex-col min-h-[500px]">
          
          {/* A. STUDY AND READING MODULE TAB */}
          {activeTab === 'read' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Daily Verse of the day Hero banner */}
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

              {/* Dynamic Scripture Selector and Chapter Nav Box */}
              <div className="bg-[#12100c] border border-[#2e2a1e] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
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

              {/* Integrated offline concordance keyword search in the reader page */}
              <div className="bg-[#12100c] border border-[#2e2a1e] p-3 rounded-2xl flex items-center gap-2 select-none">
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

              {/* Display chapter summary if queried */}
              {chapterSummary && (
                <div className="bg-[#12100c] border border-[#c9a84c]/20 p-5 rounded-[2rem] text-left space-y-3 shadow-gold-glow animate-fade-slide-up select-text">
                  <div className="flex justify-between items-center pb-2 border-b border-[#2e2a1e]/60">
                    <span className="text-[9px] font-mono tracking-widest text-[#c9a84c] uppercase font-black flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#c9a84c] animate-pulse" />
                      <span>Sagesse & Synthèse IA du Chapitre {selectedChapter}</span>
                    </span>
                    <button 
                      onClick={() => setChapterSummary(null)}
                      className="p-1 hover:bg-[#1a1712] rounded text-[#6b6355] hover:text-white transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
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
                      <BookOpen className="w-4.5 h-4.5" />
                      <span>{selectedBook.name} · Chapitre {selectedChapter}</span>
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
                    <div className="bg-[#0f0d09] border border-[#2e2a1e] rounded-2xl p-4.5 flex flex-col md:flex-row items-center justify-between gap-4 select-none">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-[#1a1712] border border-[#c9a84c]/20 flex items-center justify-center text-[#c9a84c]">
                          {isSpeaking && !isPaused ? (
                            <Volume2 className="w-5 h-5 animate-pulse text-[#c9a84c]" />
                          ) : (
                            <VolumeX className="w-5 h-5 text-[#6b6355]" />
                          )}
                        </div>
                        <div className="text-left">
                          <span className="text-[8px] font-mono uppercase text-[#6b6355] tracking-widest block font-bold">SYNTHÈSE VOCALE</span>
                          <p className="text-xs font-serif text-[#e8e0d0] font-bold">
                            {isSpeaking 
                              ? `Lecture : Verset ${chapterVerses[currentSpeakingVerseIndex]?.verse || (currentSpeakingVerseIndex + 1)}` 
                              : "Écouter la parole divine"
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Skip Back */}
                        <button
                          onClick={() => {
                            if (currentSpeakingVerseIndex > 0) {
                              speakVerse(currentSpeakingVerseIndex - 1);
                            } else {
                              speakVerse(0);
                            }
                          }}
                          disabled={!isSpeaking}
                          className="p-2 rounded-xl bg-[#12100c] hover:bg-[#1a1712] border border-[#2e2a1e] text-[#c9a84c] disabled:opacity-40 disabled:text-[#6b6355] disabled:pointer-events-none transition cursor-pointer"
                          title="Verset précédent"
                        >
                          <SkipBack className="w-4 h-4" />
                        </button>

                        {/* Play / Pause Toggle */}
                        <button
                          onClick={handlePlayPause}
                          className="h-9 px-4 rounded-xl bg-gold-gradient text-[#0d0b07] font-mono text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 transition cursor-pointer hover:opacity-95 shadow-md"
                        >
                          {isSpeaking && !isPaused ? (
                            <>
                              <Pause className="w-4 h-4" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              <span>Lecture</span>
                            </>
                          )}
                        </button>

                        {/* Stop */}
                        <button
                          onClick={stopSpeaking}
                          disabled={!isSpeaking}
                          className="p-2 rounded-xl bg-[#12100c] hover:bg-[#1a1712] border border-[#2e2a1e] text-[#c9a84c] disabled:opacity-40 disabled:text-[#6b6355] disabled:pointer-events-none transition cursor-pointer"
                          title="Arrêter la lecture"
                        >
                          <Square className="w-4 h-4" />
                        </button>

                        {/* Skip Forward */}
                        <button
                          onClick={() => {
                            if (currentSpeakingVerseIndex < chapterVerses.length - 1) {
                              speakVerse(currentSpeakingVerseIndex + 1);
                            }
                          }}
                          disabled={!isSpeaking || currentSpeakingVerseIndex >= chapterVerses.length - 1}
                          className="p-2 rounded-xl bg-[#12100c] hover:bg-[#1a1712] border border-[#2e2a1e] text-[#c9a84c] disabled:opacity-40 disabled:text-[#6b6355] disabled:pointer-events-none transition cursor-pointer"
                          title="Verset suivant"
                        >
                          <SkipForward className="w-4 h-4" />
                        </button>

                        {/* Rate speed multipliers selection */}
                        <div className="flex bg-[#12100c] border border-[#2e2a1e] rounded-xl p-0.5 ml-1">
                          {[0.8, 1.0, 1.25, 1.5].map((rate) => (
                            <button
                              key={rate}
                              onClick={() => {
                                setPlaybackRate(rate);
                                if (isSpeaking && !isPaused) {
                                  // Speak using the new rate
                                  speakVerse(currentSpeakingVerseIndex);
                                }
                              }}
                              className={`px-2 py-1 text-[9px] font-mono font-bold rounded-lg transition-all ${
                                playbackRate === rate 
                                  ? 'bg-[#c9a84c] text-[#0d0b07]' 
                                  : 'text-[#6b6355] hover:text-[#e8e0d0]'
                              }`}
                            >
                              {rate}x
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {loadingVerses ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-3 select-none">
                    <div className="w-8 h-8 rounded-full border-t-2 border-[#c9a84c] animate-spin"></div>
                    <p className="text-xs font-mono text-[#6b6355] uppercase tracking-wider">Mise au jour du papyrus...</p>
                  </div>
                ) : (
                  <motion.div 
                    key={`${selectedBook.id}_${selectedChapter}_${selectedTranslation}`}
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
                          onSaveNote={handleSaveSpiritualNote}
                          isCurrentSpoken={currentSpeakingVerseIndex === idx}
                        />
                      );
                    })}
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
                      onClick={markCurrentChapterRead}
                      disabled={readingHistory.some(h => h.book_id === selectedBook.id && h.chapter === selectedChapter)}
                      className={`px-4 py-2 text-[10px] font-mono font-bold tracking-wider uppercase rounded-xl border cursor-pointer transition duration-150 flex items-center gap-1.5 ${
                        readingHistory.some(h => h.book_id === selectedBook.id && h.chapter === selectedChapter)
                          ? 'bg-[#1a1712] border-[#2e2a1e] text-emerald-500'
                          : 'bg-emerald-950/20 hover:bg-emerald-950/40 border-emerald-500/25 text-emerald-400'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
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

        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION SHELF */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#050403]/95 backdrop-blur-md border-t border-[#2e2a1e] py-1.5 px-1 flex justify-around md:hidden z-40 select-none shadow-gold-glow">
        <button
          onClick={() => setActiveTab('read')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all ${
            activeTab === 'read' ? 'text-[#c9a84c] font-black scale-105' : 'text-[#6b6355] hover:text-[#e8e0d0]'
          }`}
        >
          <BookOpen className="w-5 h-5 shrink-0" />
          <span className="text-[8.5px] font-medium font-mono uppercase tracking-widest">Étudier</span>
        </button>

        <button
          onClick={() => { setActiveTab('dictionary'); setTargetedStrongCode(null); }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all ${
            activeTab === 'dictionary' ? 'text-[#c9a84c] font-black scale-105' : 'text-[#6b6355] hover:text-[#e8e0d0]'
          }`}
        >
          <Search className="w-5 h-5 shrink-0" />
          <span className="text-[8.5px] font-medium font-mono uppercase tracking-widest">Lexique</span>
        </button>

        <button
          onClick={() => { setActiveTab('encyclopedia'); }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all ${
            activeTab === 'encyclopedia' ? 'text-[#c9a84c] font-black scale-105' : 'text-[#6b6355] hover:text-[#e8e0d0]'
          }`}
        >
          <Library className="w-5 h-5 shrink-0" />
          <span className="text-[8.5px] font-medium font-mono uppercase tracking-widest">Dict. IA</span>
        </button>

        <button
          onClick={() => setActiveTab('assistant')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all ${
            activeTab === 'assistant' ? 'text-[#c9a84c] font-black scale-105' : 'text-[#6b6355] hover:text-[#e8e0d0]'
          }`}
        >
          <MessageSquare className="w-5 h-5 shrink-0" />
          <span className="text-[8.5px] font-medium font-mono uppercase tracking-widest">Conseil</span>
        </button>

        <button
          onClick={() => setActiveTab('challenges')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all ${
            activeTab === 'challenges' ? 'text-[#c9a84c] font-black scale-105' : 'text-[#6b6355] hover:text-[#e8e0d0]'
          }`}
        >
          <Flame className="w-5 h-5 shrink-0" />
          <span className="text-[8.5px] font-medium font-mono uppercase tracking-widest">Défis</span>
        </button>
      </nav>

    </div>
  );
}
