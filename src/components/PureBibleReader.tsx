import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronDown, MoreVertical, ChevronLeft, ChevronRight, Volume2, 
  Pause, Check, Bookmark, Copy, Share2, FileText, 
  Search, Sparkles, X, Dices, ScrollText, Mic, Clock, 
  BookOpen, Home, Loader2
} from 'lucide-react';
import { Verse, Book, VerseNote, FavoriteVerse, ChapterMeditation, ChapterAudioMeditation } from '../types/bible';
import { VerseShareModal } from './VerseShareModal';
import { VerseStudyPanel } from './VerseStudyPanel';
import { ChapterNoteSection } from './ChapterNoteSection';

export interface PureBibleReaderProps {
  selectedBook: Book;
  selectedChapter: number;
  selectedTranslation: string;
  onSelectTranslation: (trans: string) => void;
  chapterVerses: Verse[];
  loadingVerses: boolean;
  loadingError: string | null;
  onOpenNavigator: () => void;
  onOpenSearch: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  onToggleAudio: () => void;
  onExplainVerse: (verse: Verse) => void;
  onSaveNote: (verse: Verse, text: string, audioBase64?: string) => Promise<void> | void;
  onDeleteNote?: (verse: Verse, noteId?: string) => Promise<void> | void;
  notes?: VerseNote[];
  favorites?: FavoriteVerse[];
  onToggleFavorite?: (verse: Verse) => void;
  onNavigateToScripture?: (bookId: number | string, chapter: number, verse: number) => void;
  onRandomVerse: () => void;
  onSummarizeChapter: () => void;
  isContinuousScroll: boolean;
  onToggleContinuousScroll: () => void;
  onDictate: () => void;
  onOpenConcordance: () => void;
  readingTimeToday: number;
  dailyTimeGoal: number;
  onAutoValidateChapter?: () => void;
  chapterSummaryText?: string | null;
  onClearChapterSummary?: () => void;
  loadingSummary?: boolean;
  onGoHome?: () => void;

  // Chapter notes & meditations
  chapterMeditations?: ChapterMeditation[];
  chapterAudios?: ChapterAudioMeditation[];
  onSaveChapterMeditation?: (bookId: number, bookName: string, chapter: number, text: string, noteId?: string) => Promise<boolean>;
  onDeleteChapterMeditation?: (bookId: number, chapter: number, noteId?: string) => Promise<void> | void;
  onSaveChapterAudio?: (
    bookId: number,
    bookName: string,
    chapter: number,
    title: string,
    durationSeconds: number,
    audioBlob: Blob,
    mimeType: string,
    writtenMeditationId?: string
  ) => Promise<boolean>;
  onDeleteChapterAudio?: (audioId: string) => Promise<void> | void;
}

export const PureBibleReader: React.FC<PureBibleReaderProps> = ({
  selectedBook,
  selectedChapter,
  selectedTranslation,
  onSelectTranslation,
  chapterVerses,
  loadingVerses,
  loadingError,
  onOpenNavigator,
  onOpenSearch,
  onPrevChapter,
  onNextChapter,
  isSpeaking,
  isPaused,
  onToggleAudio,
  onExplainVerse,
  onSaveNote,
  onDeleteNote,
  notes = [],
  favorites = [],
  onToggleFavorite,
  onNavigateToScripture,
  onRandomVerse,
  onSummarizeChapter,
  isContinuousScroll,
  onToggleContinuousScroll,
  onDictate,
  onOpenConcordance,
  readingTimeToday,
  dailyTimeGoal,
  onAutoValidateChapter,
  chapterSummaryText,
  onClearChapterSummary,
  loadingSummary = false,
  onGoHome,
  chapterMeditations = [],
  chapterAudios = [],
  onSaveChapterMeditation,
  onDeleteChapterMeditation,
  onSaveChapterAudio,
  onDeleteChapterAudio,
}) => {
  // Selected verse unique ID for active study panel (e.g. "1_1_1")
  const [selectedVerseId, setSelectedVerseId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [showVersionDropdown, setShowVersionDropdown] = useState<boolean>(false);
  const [shareModalVerse, setShareModalVerse] = useState<Verse | null>(null);
  const [showGoalToast, setShowGoalToast] = useState<boolean>(false);
  const [showReadingTimeToast, setShowReadingTimeToast] = useState<boolean>(false);
  
  // Summary card copy state & appending to note
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [textToAppend, setTextToAppend] = useState<string | null>(null);

  // Limites de navigation par chapitre (désactivation des flèches)
  const isFirstChapter = selectedChapter <= 1;
  const isLastChapter = selectedChapter >= (selectedBook.chapters_count || 1);

  // Calcul dynamique de la hauteur de la barre de navigation du bas
  const [bottomNavHeight, setBottomNavHeight] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return 56;
    }
    return 0;
  });

  useEffect(() => {
    const updateNavHeight = () => {
      const navEl = document.getElementById('global-bottom-nav');
      let targetHeight = 0;
      if (navEl && navEl.offsetParent !== null) {
        const height = navEl.getBoundingClientRect().height;
        if (height > 0) {
          targetHeight = height;
        }
      } else if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        targetHeight = 56;
      }
      setBottomNavHeight(prev => (prev === targetHeight ? prev : targetHeight));
    };

    updateNavHeight();
    const ro = new ResizeObserver(() => updateNavHeight());
    const navEl = document.getElementById('global-bottom-nav');
    if (navEl) ro.observe(navEl);

    window.addEventListener('resize', updateNavHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateNavHeight);
    };
  }, []);

  // Mode discret pour les boutons flottants : 60% d'opacité après 3s d'inactivité
  const [isControlsIdle, setIsControlsIdle] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsIdle = useCallback(() => {
    setIsControlsIdle(false);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      setIsControlsIdle(true);
    }, 3000);
  }, []);

  useEffect(() => {
    resetControlsIdle();
    const events = ['touchstart', 'touchmove', 'scroll', 'mousemove', 'mousedown', 'keydown'];
    const onActivity = () => resetControlsIdle();

    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach(e => window.removeEventListener(e, onActivity));
    };
  }, [resetControlsIdle]);

  const hasTriggeredGoalToastRef = useRef<boolean>(false);
  const endSentinelRef = useRef<HTMLDivElement | null>(null);
  const validatedThisChapterRef = useRef<string | null>(null);

  // Verses highlights persisted in localStorage
  const [highlights, setHighlights] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('bible_verse_highlights');
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  });

  // Selected verse object from ID
  const selectedVerse = React.useMemo(() => {
    if (!selectedVerseId) return null;
    return chapterVerses.find(
      v => `${v.book_id}_${v.chapter}_${v.verse}` === selectedVerseId
    ) || null;
  }, [selectedVerseId, chapterVerses]);

  // Clean raw verse text
  const cleanVerseText = (raw: string) => {
    return raw
      .replace(/<[^>]*>/g, '')
      .replace(/\[\d+\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Check if daily goal is reached and trigger 2-second toast
  useEffect(() => {
    if (readingTimeToday >= dailyTimeGoal && !hasTriggeredGoalToastRef.current && dailyTimeGoal > 0) {
      hasTriggeredGoalToastRef.current = true;
      setShowGoalToast(true);
      const timer = setTimeout(() => {
        setShowGoalToast(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [readingTimeToday, dailyTimeGoal]);

  const onAutoValidateChapterRef = useRef(onAutoValidateChapter);
  useEffect(() => {
    onAutoValidateChapterRef.current = onAutoValidateChapter;
  });

  // Auto-validate chapter when user reaches the end sentinel
  useEffect(() => {
    const sentinel = endSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          const chapKey = `${selectedBook.id}_${selectedChapter}`;
          if (validatedThisChapterRef.current !== chapKey) {
            validatedThisChapterRef.current = chapKey;
            if (onAutoValidateChapterRef.current) {
              onAutoValidateChapterRef.current();
            }
          }
        }
      },
      { root: null, rootMargin: '0px', threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [selectedBook.id, selectedChapter]);

  // Reset selected verse when chapter changes
  useEffect(() => {
    setSelectedVerseId(null);
  }, [selectedBook.id, selectedChapter]);

  // Copy summary handler
  const handleCopySummary = async () => {
    if (!chapterSummaryText) return;
    try {
      await navigator.clipboard.writeText(chapterSummaryText);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch (_) {}
  };

  const handleClearTextToAppend = useCallback(() => {
    setTextToAppend(null);
  }, []);

  // Translations list
  const TRANSLATIONS = [
    { id: 'lsg', code: 'LSG', label: 'Louis Segond (1910)' },
    { id: 'darby', code: 'DRB', label: 'Darby' },
    { id: 'martin', code: 'MRT', label: 'David Martin (1744)' },
    { id: 'ostervald', code: 'OST', label: 'Ostervald' },
    { id: 'kjv', code: 'KJV', label: 'King James (Anglais)' },
    { id: 'local', code: 'LSG', label: 'Hors ligne (LSG)' },
  ];

  const getTranslationCode = (id: string) => {
    const match = TRANSLATIONS.find(t => t.id.toLowerCase() === id.toLowerCase());
    return match ? match.code : id.toUpperCase().slice(0, 3);
  };

  // Filter notes for selected verse
  const getNotesForVerse = (v: Verse) => {
    return notes
      .filter(n => n.book_id === v.book_id && n.chapter === v.chapter && n.verse === v.verse)
      .map(n => ({
        id: n.id || `${n.book_id}_${n.chapter}_${n.verse}`,
        text: n.note || n.contenu || '',
        audio_url: n.audio,
        created_at: n.created_at || n.createdAt,
        updated_at: n.updated_at || n.updatedAt,
      }));
  };

  // Check if verse has note or favorite or highlight
  const hasVerseNote = (bId: number, ch: number, vNum: number) => {
    return notes.some(n => n.book_id === bId && n.chapter === ch && n.verse === vNum);
  };

  const isVerseFav = (bId: number, ch: number, vNum: number) => {
    return favorites.some(f => f.book_id === bId && f.chapter === ch && f.verse === vNum);
  };

  // Check if chapter has any note/meditation recorded
  const hasChapterNote = 
    chapterMeditations.some(m => m.book_id === selectedBook.id && m.chapter === selectedChapter) ||
    chapterAudios.some(a => a.book_id === selectedBook.id && a.chapter === selectedChapter);

  return (
    <div className="relative min-h-screen w-full bg-[#0a0907] text-[#ded7c8] select-text">

      {/* 1. BARRE DU HAUT TRÈS FINE, FIXE */}
      <header className="fixed top-0 inset-x-0 h-13 z-40 bg-[#0a0907]/90 backdrop-blur-md border-b border-[#242018] flex items-center justify-between px-4 sm:px-6 select-none">
        
        {/* Gauche : Bouton Livre + Chapitre (arrondi, doré) & Bouton Version */}
        <div className="flex items-center gap-2">
          {/* Bouton Livre + Chapitre */}
          <button
            type="button"
            onClick={onOpenNavigator}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#181510] hover:bg-[#221e16] border border-[#c9a84c]/50 text-[#c9a84c] text-xs font-serif font-bold tracking-wide transition cursor-pointer shadow-xs active:scale-95"
            title="Choisir le livre et le chapitre"
          >
            <span>{selectedBook.name} {selectedChapter}</span>
            {hasChapterNote && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] shrink-0" title="Note enregistrée pour ce chapitre" />
            )}
            <ChevronDown className="w-3.5 h-3.5 text-[#c9a84c]/80" />
          </button>

          {/* Bouton Version (ex: LSG) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowVersionDropdown(!showVersionDropdown);
                setShowMenu(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#14120e] hover:bg-[#1c1913] border border-[#2e2a1e] text-[#a0947f] hover:text-[#e8e0d0] text-[11px] font-sans font-medium transition cursor-pointer active:scale-95"
              title="Choisir la version de Bible"
            >
              <span>{getTranslationCode(selectedTranslation)}</span>
              <ChevronDown className="w-3 h-3 text-[#736a59]" />
            </button>

            {/* Menu déroulant de versions */}
            {showVersionDropdown && (
              <div className="absolute left-0 mt-2 w-64 bg-[#14120e] border border-[#2e2a1e] rounded-2xl p-1.5 shadow-2xl z-50 animate-fade-in text-left">
                <div className="px-3 py-1.5 text-[10px] uppercase font-sans font-bold tracking-wider text-[#736a59]">
                  Versions disponibles
                </div>
                {TRANSLATIONS.map(t => {
                  const isCurrent = selectedTranslation.toLowerCase() === t.id.toLowerCase() ||
                    (t.id === 'local' && selectedTranslation === 'LSG');
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        onSelectTranslation(t.id);
                        setShowVersionDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans text-left transition cursor-pointer ${
                        isCurrent 
                          ? 'bg-[#c9a84c]/15 text-[#c9a84c] font-bold' 
                          : 'text-[#ded7c8] hover:bg-[#1f1b14]'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{t.label}</span>
                        <span className="text-[10px] text-[#736a59] font-mono">{t.code}</span>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-[#c9a84c]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Droite : Icône recherche & Icône menu (⋮) */}
        <div className="flex items-center gap-1.5">
          {/* Recherche */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="p-2 rounded-full text-[#8c8270] hover:text-[#e8e0d0] hover:bg-[#181510] transition cursor-pointer"
            title="Rechercher dans la Bible"
            aria-label="Recherche"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Menu ⋮ */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowMenu(!showMenu);
                setShowVersionDropdown(false);
              }}
              className="p-2 rounded-full text-[#8c8270] hover:text-[#e8e0d0] hover:bg-[#181510] transition cursor-pointer"
              title="Menu Lecteur"
              aria-label="Menu"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Menu contextuel ⋮ */}
            {showMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-[#14120e] border border-[#2e2a1e] rounded-2xl p-1.5 shadow-2xl z-50 animate-fade-in text-left">
                
                {/* Verset au hasard */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onRandomVerse();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-sans text-[#ded7c8] hover:bg-[#1f1b14] transition cursor-pointer"
                >
                  <Dices className="w-4 h-4 text-[#c9a84c]" />
                  <span>Verset au hasard</span>
                </button>

                {/* Résumer le chapitre */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onSummarizeChapter();
                  }}
                  disabled={loadingSummary}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-sans text-[#ded7c8] hover:bg-[#1f1b14] transition cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-[#c9a84c]" />
                  <span>{loadingSummary ? 'Résumé en cours...' : 'Résumer le chapitre'}</span>
                </button>

                {/* Périmètre (chapitre / continu) */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onToggleContinuousScroll();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans text-[#ded7c8] hover:bg-[#1f1b14] transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ScrollText className="w-4 h-4 text-[#c9a84c]" />
                    <span>Périmètre de lecture</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#8c8270] bg-[#221e16] px-1.5 py-0.5 rounded">
                    {isContinuousScroll ? 'Continu' : 'Chapitre'}
                  </span>
                </button>

                {/* Dicter */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onDictate();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-sans text-[#ded7c8] hover:bg-[#1f1b14] transition cursor-pointer"
                >
                  <Mic className="w-4 h-4 text-[#c9a84c]" />
                  <span>Dicter un passage</span>
                </button>

                {/* Concordance */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenConcordance();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-sans text-[#ded7c8] hover:bg-[#1f1b14] transition cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-[#c9a84c]" />
                  <span>Dictionnaire & Concordance</span>
                </button>

                <div className="my-1 border-t border-[#242018]" />

                {/* Temps de lecture du jour */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    setShowReadingTimeToast(true);
                    setTimeout(() => setShowReadingTimeToast(false), 3000);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-sans text-[#a0947f] hover:bg-[#1f1b14] transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-[#c9a84c]" />
                    <span>Temps de lecture du jour</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#c9a84c]">
                    {readingTimeToday}m / {dailyTimeGoal}m
                  </span>
                </button>

                {/* Retour Accueil */}
                {onGoHome && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onGoHome();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-sans text-[#a0947f] hover:bg-[#1f1b14] transition cursor-pointer"
                  >
                    <Home className="w-4 h-4 text-[#736a59]" />
                    <span>Accueil</span>
                  </button>
                )}

              </div>
            )}
          </div>
        </div>
      </header>

      {/* Toast temps de lecture */}
      {showReadingTimeToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-[#14120e] border border-[#c9a84c]/40 text-[#c9a84c] text-xs font-sans shadow-xl animate-fade-in flex items-center gap-2 select-none">
          <Clock className="w-3.5 h-3.5" />
          <span>Temps aujourd'hui : <strong>{readingTimeToday} min</strong> sur l'objectif de {dailyTimeGoal} min</span>
        </div>
      )}

      {/* 2. ZONE DE LECTURE (Tout le reste de l'écran) */}
      <main 
        className="w-full max-w-2xl sm:max-w-3xl mx-auto px-5 sm:px-8 pt-20 pb-[calc(140px+env(safe-area-inset-bottom,0px))] text-left"
        onClick={() => {
          // Fermer les dropdowns ouverts si clic dans le fond
          if (showMenu) setShowMenu(false);
          if (showVersionDropdown) setShowVersionDropdown(false);
        }}
      >
        {loadingVerses ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-6 h-6 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin" />
            <p className="text-xs text-[#8c8270] font-sans">Chargement des Écritures...</p>
          </div>
        ) : loadingError ? (
          <div className="py-20 text-center space-y-2">
            <p className="text-sm text-rose-400 font-sans">{loadingError}</p>
          </div>
        ) : chapterVerses.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-[#8c8270] font-sans">Aucun verset disponible.</p>
          </div>
        ) : (
          /* Paragraphe continu comme dans un vrai livre */
          <div 
            className="font-serif text-[#ded7c8] text-lg sm:text-[19px] leading-[1.85] tracking-normal select-text text-justify"
            style={{ textRendering: 'optimizeLegibility' }}
          >
            {chapterVerses.map((item, idx) => {
              const verseUniqueId = `${item.book_id}_${item.chapter}_${item.verse}`;
              const isSelected = selectedVerseId === verseUniqueId;
              const highlightColor = highlights[verseUniqueId];
              const cleanText = cleanVerseText(item.text);

              const hasNote = hasVerseNote(item.book_id, item.chapter, item.verse);
              const hasFav = isVerseFav(item.book_id, item.chapter, item.verse);

              const isFirstOfNewChapter = idx > 0 && item.chapter !== chapterVerses[idx - 1].chapter;

              return (
                <React.Fragment key={verseUniqueId}>
                  {isFirstOfNewChapter && (
                    <span className="block my-8 pt-6 border-t border-[#221e16] text-center font-sans">
                      <span className="text-xs font-medium text-[#c9a84c]">
                        {item.book_name} — Chapitre {item.chapter}
                      </span>
                    </span>
                  )}

                  <span
                    id={`verse-${item.book_id}-${item.chapter}-${item.verse}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Appui sur un verset : bascule la sélection
                      setSelectedVerseId(isSelected ? null : verseUniqueId);
                    }}
                    className={`inline cursor-pointer transition-colors duration-150 rounded px-1 py-0.5 ${
                      isSelected 
                        ? 'bg-[#c9a84c]/20 ring-1 ring-[#c9a84c]/40 text-[#fff8e7]' 
                        : 'hover:bg-white/5'
                    }`}
                    style={{
                      backgroundColor: highlightColor ? highlightColor : undefined,
                    }}
                  >
                    {/* Numéros de versets petits, gris, intégrés dans le flux du texte */}
                    <sup 
                      className={`text-[11px] font-sans mr-1 select-none font-normal ${
                        isSelected ? 'text-[#c9a84c] font-bold' : 'text-[#736a59]'
                      }`}
                    >
                      {item.verse}
                    </sup>
                    <span className="align-baseline">{cleanText}</span>
                    
                    {/* Petit indicateur discret (point) à côté du verset s'il a une note ou un favori */}
                    {(hasNote || hasFav) && (
                      <span 
                        className={`inline-block w-1.5 h-1.5 rounded-full mx-1 align-middle ${
                          hasFav ? 'bg-[#c9a84c]' : 'bg-[#60a5fa]'
                        }`} 
                        title={hasFav ? 'Favori' : 'Note enregistrée'}
                      />
                    )}
                    {' '}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* BOUTON DISCRET « RÉSUMER LE CHAPITRE » (Même langage doré que l'en-tête) */}
        <div className="mt-12 mb-6 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={onSummarizeChapter}
            disabled={loadingSummary}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#181510] hover:bg-[#221e16] border border-[#c9a84c]/50 hover:border-[#c9a84c] text-[#c9a84c] text-xs font-serif font-bold tracking-wide transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            title="Générer un résumé du chapitre avec l'IA"
          >
            {loadingSummary ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c9a84c]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]/80" />
            )}
            <span>{loadingSummary ? 'Résumé en cours...' : 'Résumer le chapitre'}</span>
          </button>
        </div>

        {/* CARTE ÉPURÉE AFFICHANT LE RÉSULTAT DU RÉSUMÉ IA */}
        {(loadingSummary || chapterSummaryText) && (
          <div className="mb-8 w-full bg-[#12100c] border border-[#2e2a1e] rounded-2xl p-4 sm:p-5 text-left space-y-3 shadow-lg animate-fade-in font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-[#242018]">
              <div className="flex items-center gap-1.5 text-xs text-[#c9a84c] font-serif font-bold">
                <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />
                <span>Résumé de {selectedBook.name} {selectedChapter}</span>
              </div>
              <div className="flex items-center gap-2">
                {chapterSummaryText && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopySummary}
                      className="text-xs text-[#8c8270] hover:text-[#ded7c8] flex items-center gap-1 px-2 py-1 rounded hover:bg-[#181510] transition cursor-pointer"
                      title="Copier le résumé"
                    >
                      {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSummary ? 'Copié' : 'Copier'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextToAppend(chapterSummaryText)}
                      className="text-xs text-[#c9a84c] hover:text-[#e8d89e] flex items-center gap-1 px-2 py-1 rounded hover:bg-[#181510] transition cursor-pointer"
                      title="Ajouter ce résumé à ma note"
                    >
                      <span>Ajouter à ma note</span>
                    </button>
                  </>
                )}
                {onClearChapterSummary && (
                  <button
                    type="button"
                    onClick={onClearChapterSummary}
                    className="p-1 rounded text-[#8c8270] hover:text-[#ded7c8] hover:bg-[#181510] transition cursor-pointer"
                    title="Fermer le résumé"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {loadingSummary ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#c9a84c]" />
                <p className="text-xs text-[#8c8270] font-sans">Génération du résumé par l'IA...</p>
              </div>
            ) : (
              <div className="text-xs sm:text-sm text-[#ded7c8] font-sans leading-relaxed whitespace-pre-line">
                {chapterSummaryText}
              </div>
            )}
          </div>
        )}

        {/* SECTION « CE QUE J'AI RETENU DE CE CHAPITRE » */}
        <ChapterNoteSection
          bookId={selectedBook.id}
          bookName={selectedBook.name}
          chapter={selectedChapter}
          chapterMeditations={chapterMeditations}
          chapterAudios={chapterAudios}
          onSaveMeditation={onSaveChapterMeditation}
          onDeleteMeditation={onDeleteChapterMeditation}
          onSaveAudioMeditation={onSaveChapterAudio}
          onDeleteAudioMeditation={onDeleteChapterAudio}
          onAutoValidateChapter={onAutoValidateChapter}
          onNextChapter={onNextChapter}
          textToAppend={textToAppend}
          onClearTextToAppend={handleClearTextToAppend}
        />

        {/* Sentinelle de fin de texte pour la validation automatique du chapitre */}
        <div ref={endSentinelRef} className="h-6 w-full" />
      </main>

      {/* 3. PANNEAU D'ÉTUDE FLOTTANT / BOTTOM SHEET QUAND UN VERSET EST SÉLECTIONNÉ */}
      {selectedVerse && (
        <VerseStudyPanel
          verse={selectedVerse}
          isOpen={!!selectedVerse}
          onClose={() => setSelectedVerseId(null)}
          isFavorite={isVerseFav(selectedVerse.book_id, selectedVerse.chapter, selectedVerse.verse)}
          onToggleFavorite={(v) => {
            if (onToggleFavorite) onToggleFavorite(v);
          }}
          onOpenImageShare={(v) => setShareModalVerse(v)}
          onNavigateToScripture={(bookId, chapter, verseNum) => {
            if (onNavigateToScripture) {
              onNavigateToScripture(bookId, chapter, verseNum);
            }
          }}
          onSaveNote={async (v, text, audioBase64) => {
            await onSaveNote(v, text, audioBase64);
          }}
          existingNotes={getNotesForVerse(selectedVerse)}
          onDeleteNote={onDeleteNote}
        />
      )}

      {/* 4. ÉLÉMENTS FLOTTANTS DISCRETS & ACCESSIBLES */}
      <div 
        className={`fixed inset-x-0 pointer-events-none z-50 transition-opacity duration-300 ${
          isControlsIdle ? 'opacity-60' : 'opacity-100'
        }`}
        style={{
          bottom: `calc(${bottomNavHeight}px + 16px + env(safe-area-inset-bottom, 0px))`
        }}
      >
        <div className="w-full px-4 flex items-center justify-between pointer-events-none relative max-w-full">
          
          {/* Flèche précédent : à gauche, à 16px du bord */}
          <button
            type="button"
            onClick={onPrevChapter}
            disabled={isFirstChapter}
            className={`pointer-events-auto w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-150 shadow-[0_4px_16px_rgba(0,0,0,0.55)] select-none ${
              isFirstChapter
                ? 'bg-[#181510]/80 border border-[#2a2419] text-[#635a4a] opacity-35 cursor-not-allowed'
                : 'bg-[#1c1812]/92 hover:bg-[#252018] border border-[#3e3423] hover:border-[#c9a84c]/60 text-[#f5efe6] active:scale-95 cursor-pointer'
            }`}
            title={isFirstChapter ? 'Premier chapitre' : 'Chapitre précédent'}
            aria-label="Chapitre précédent"
          >
            <ChevronLeft className="w-5 h-5 text-current" />
          </button>

          {/* Bouton audio flottant : centré */}
          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
            <button
              type="button"
              onClick={onToggleAudio}
              className={`pointer-events-auto w-14 h-14 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-150 shadow-[0_6px_20px_rgba(0,0,0,0.6)] cursor-pointer select-none active:scale-95 ${
                isSpeaking && !isPaused
                  ? 'bg-[#c9a84c] text-[#0c0a07] border border-[#f0dfa8] shadow-[0_0_24px_rgba(201,168,76,0.4)] animate-pulse'
                  : 'bg-[#1e1a13]/92 hover:bg-[#282218] text-[#c9a84c] border border-[#c9a84c]/60 hover:border-[#c9a84c]'
              }`}
              title={isSpeaking && !isPaused ? 'Pause de la lecture audio' : 'Écouter'}
              aria-label={isSpeaking && !isPaused ? 'Pause de la lecture audio' : 'Écouter'}
            >
              {isSpeaking && !isPaused ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Volume2 className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Flèche suivant : à droite, à 16px du bord */}
          <button
            type="button"
            onClick={onNextChapter}
            disabled={isLastChapter}
            className={`pointer-events-auto w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-150 shadow-[0_4px_16px_rgba(0,0,0,0.55)] select-none ${
              isLastChapter
                ? 'bg-[#181510]/80 border border-[#2a2419] text-[#635a4a] opacity-35 cursor-not-allowed'
                : 'bg-[#1c1812]/92 hover:bg-[#252018] border border-[#3e3423] hover:border-[#c9a84c]/60 text-[#f5efe6] active:scale-95 cursor-pointer'
            }`}
            title={isLastChapter ? 'Dernier chapitre' : 'Chapitre suivant'}
            aria-label="Chapitre suivant"
          >
            <ChevronRight className="w-5 h-5 text-current" />
          </button>
        </div>
      </div>

      {/* Pastille discrète « Objectif atteint » (affichée 2 secondes) AU-DESSUS des boutons */}
      {showGoalToast && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 z-[60] px-4 py-1.5 rounded-full bg-[#181510] border border-[#c9a84c]/60 text-[#f5efe6] text-xs font-sans shadow-xl animate-fade-in flex items-center gap-1.5 select-none pointer-events-none"
          style={{
            bottom: `calc(${bottomNavHeight}px + 16px + 56px + 16px + env(safe-area-inset-bottom, 0px))`
          }}
        >
          <span className="w-2 h-2 rounded-full bg-[#c9a84c] shrink-0" />
          <span className="font-medium text-[#c9a84c]">Objectif atteint</span>
        </div>
      )}

      {/* Modale de partage d'image */}
      {shareModalVerse && (
        <VerseShareModal
          verse={shareModalVerse}
          onClose={() => setShareModalVerse(null)}
        />
      )}

    </div>
  );
};
