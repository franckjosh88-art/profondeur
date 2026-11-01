import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BookOpen,
  Play,
  Pause,
  Menu,
  Search,
  ChevronDown,
  Home,
  MessageSquare,
  Bookmark,
  Sun,
  Leaf,
  Mountain,
  Flame
} from 'lucide-react';
import { Book, ReadingHistory } from '../types/bible';
import { BOOKS } from '../data/bibleData';
import { getChapterMaxVerses } from '../data/bibleChapterVerseCounts';
import prayerBgSanctuary from '../assets/images/prayer_bg_sanctuary_1790148027998.jpg';
import prayerBgValley from '../assets/images/prayer_bg_valley_1790148041309.jpg';
import prayerBgBible from '../assets/images/prayer_bg_bible_1790148055006.jpg';

export const PRAYER_BG_SANCTUARY = prayerBgSanctuary;
export const PRAYER_BG_VALLEY = prayerBgValley;
export const PRAYER_BG_BIBLE = prayerBgBible;

export const CONTEMPLATIVE_ATMOSPHERES = [
  {
    id: 'auto' as const,
    name: 'Auto (Verset)',
    label: 'Harmonisé',
    icon: Sun,
    description: 'Arrière-plan adapté automatiquement au verset'
  },
  {
    id: 'sanctuary' as const,
    name: 'Sanctuaire',
    label: 'Nuance / Bokeh',
    icon: Leaf,
    url: PRAYER_BG_SANCTUARY,
    description: 'Lumière dorée douce en clair-obscur, bokeh intime et sacré'
  },
  {
    id: 'valley' as const,
    name: 'Psaume 23',
    label: 'Vallée Dorée',
    icon: Mountain,
    url: PRAYER_BG_VALLEY,
    description: "Vallée brumeuse au crépuscule et rayons d'or célestes"
  },
  {
    id: 'coffee_bible' as const,
    name: 'Bible & Boiserie',
    label: 'Méditation',
    icon: Flame,
    url: PRAYER_BG_BIBLE,
    description: 'Bible ouverte, boiserie sombre et lueur dorée tamisée'
  }
];

interface ContemplativeHomeProps {
  onNavigateToTab: (tab: 'home' | 'read' | 'challenges' | 'dictionary' | 'assistant' | 'encyclopedia' | 'memorize' | 'notes') => void;
  onOpenDrawer?: () => void;
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
  onOpenNavigator?: () => void;
  onOpenDailyVerse?: () => void;
  selectedBook?: Book;
  selectedChapter?: number;
  onSelectBookAndChapter?: (book: Book, chapterNum: number) => void;
  isSpeaking?: boolean;
  isPaused?: boolean;
  isZenMode?: boolean;
  notesCount?: number;
  goalPercent?: number;
  currentStreak?: number;
  readingHistory?: ReadingHistory[];
  onNavigateToChapter?: (bookId: number, chapterNum: number, verseNum?: number) => void;
  onPlayAudioCurrentChapter?: () => void;
  onSelectSanctuaryBg?: (bgUrl: string) => void;
  currentSanctuaryBg?: string;
  onOpenRandomMeditation?: () => void;
}

interface ContemplativeVerse {
  quote: string;
  reference: string;
  theme: string;
  defaultBg: string;
}

const CONTEMPLATIVE_VERSES: ContemplativeVerse[] = [
  {
    quote: "Quand je marche dans la vallée de l'ombre de la mort, Je ne crains aucun mal, car tu es avec moi: Ta houlette et ton bâton me rassurent.",
    reference: "Psaumes 23:4",
    theme: "Consolation Spirituelle",
    defaultBg: PRAYER_BG_VALLEY
  },
  {
    quote: "L'Éternel est mon berger: je ne manquerai de rien. Il me fait reposer dans de verts pâturages, Il me dirige près des eaux paisibles.",
    reference: "Psaumes 23:1-2",
    theme: "Paix & Providence",
    defaultBg: PRAYER_BG_VALLEY
  },
  {
    quote: "Je t'aime, ô Éternel, ma force ! L'Éternel est mon roc, ma forteresse, mon libérateur ! Mon Dieu, mon rocher, où je trouve un abri !",
    reference: "Psaumes 18:2-3",
    theme: "Force & Abri",
    defaultBg: PRAYER_BG_SANCTUARY
  },
  {
    quote: "Au commencement était la Parole, et la Parole était avec Dieu, et la Parole était Dieu. En elle était la vie, et la vie était la lumière des hommes.",
    reference: "Jean 1:1,4",
    theme: "La Parole Éternelle",
    defaultBg: PRAYER_BG_BIBLE
  },
  {
    quote: "Le sentier des justes est comme la lumière resplendissante, dont l'éclat va croissant jusqu'au milieu du jour.",
    reference: "Proverbes 4:18",
    theme: "Clarté de l'Âme",
    defaultBg: PRAYER_BG_SANCTUARY
  },
  {
    quote: "L'Éternel est ma lumière et mon salut: De qui aurais-je crainte ? L'Éternel est le soutien de ma vie: De qui aurais-je peur ?",
    reference: "Psaumes 27:1",
    theme: "Confiance & Courage",
    defaultBg: PRAYER_BG_BIBLE
  }
];

export const ContemplativeHome: React.FC<ContemplativeHomeProps> = ({
  onNavigateToTab,
  onOpenDrawer,
  onOpenSearch,
  onOpenDailyVerse,
  selectedBook,
  selectedChapter,
  onSelectBookAndChapter,
  isSpeaking = false,
  isPaused = false,
  isZenMode = false,
  readingHistory = [],
  onNavigateToChapter,
  onPlayAudioCurrentChapter
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [pickerMode, setPickerMode] = useState<'chapter' | 'book'>('chapter');
  const [bookTestament, setBookTestament] = useState<'AT' | 'NT'>(selectedBook?.testament || 'NT');
  const pickerRef = useRef<HTMLDivElement>(null);

  const defaultRomains = BOOKS.find(b => b.id === 45) || BOOKS[0];
  const activeBook = selectedBook || defaultRomains;
  const activeChapter = selectedChapter || 1;

  useEffect(() => {
    setBookTestament(activeBook.testament);
  }, [activeBook]);

  // Fermer le sélecteur au clic extérieur ou touche Échap
  useEffect(() => {
    if (!isPickerOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPickerOpen]);

  const matchingHistory = readingHistory.find(
    h => h.book_id === activeBook.id && h.chapter === activeChapter
  );
  const resumeVerse = matchingHistory?.last_verse
    ? Math.min(Math.max(1, matchingHistory.last_verse), getChapterMaxVerses(activeBook.id, activeChapter))
    : 1;

  const handleReadClick = () => {
    if (onNavigateToChapter) {
      onNavigateToChapter(activeBook.id, activeChapter, resumeVerse);
    } else {
      onNavigateToTab('read');
    }
  };

  const handleListenClick = () => {
    if (onPlayAudioCurrentChapter) {
      onPlayAudioCurrentChapter();
    } else {
      handleReadClick();
    }
  };

  const activeVerse = CONTEMPLATIVE_VERSES[0];
  const bookDisplayName = activeBook.name.toUpperCase();
  const isLongBookName = bookDisplayName.length > 11;
  const isAudioPlaying = isSpeaking && !isPaused;

  const filteredBooks = BOOKS.filter(b => b.testament === bookTestament);

  return (
    <div className="flex-1 w-full flex flex-col justify-between select-none">
      {/* 1. EN-TÊTE : Menu (☰) à gauche, BIBLE PROFONDE au centre, Recherche à droite */}
      {!isZenMode && (
        <header className="w-full max-w-[560px] mx-auto px-5 pt-5 sm:pt-7 flex items-center justify-between z-30">
          <button
            type="button"
            onClick={onOpenDrawer}
            aria-label="Ouvrir le menu"
            title="Menu"
            className="w-11 h-11 rounded-[14px] border border-[#c9a84c]/25 bg-[#0a0805]/45 hover:bg-[#14110b]/75 hover:border-[#c9a84c]/60 text-[#c9a84c] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Menu className="w-[18px] h-[18px] stroke-[1.75]" />
          </button>

          <h1 className="font-serif text-[13px] sm:text-[15px] uppercase tracking-[0.28em] text-[#c9a84c] font-medium text-center">
            BIBLE PROFONDE
          </h1>

          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Rechercher un verset"
            title="Rechercher"
            className="w-11 h-11 rounded-[14px] border border-[#c9a84c]/25 bg-[#0a0805]/45 hover:bg-[#14110b]/75 hover:border-[#c9a84c]/60 text-[#c9a84c] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Search className="w-[18px] h-[18px] stroke-[1.75]" />
          </button>
        </header>
      )}

      {/* 2. CENTRE DE L'ÉCRAN : Lecture en cours épurée, sans cartes ni bordures */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[560px] mx-auto px-5 py-8 pb-28 sm:pb-32 text-center">
        <span className="text-xs sm:text-[13px] font-sans text-[#b5ab99] tracking-[0.02em] mb-3 sm:mb-4">
          Reprendre la lecture
        </span>

        {/* Nom du livre en cours en très grand, en majuscules */}
        <button
          type="button"
          onClick={() => {
            setPickerMode('book');
            setIsPickerOpen(prev => (pickerMode === 'book' ? !prev : true));
          }}
          aria-label={`Livre en cours : ${activeBook.name}. Cliquer pour changer de livre`}
          title="Changer de livre"
          className={`font-serif font-normal uppercase text-[#f4efe2] hover:text-[#ebd092] tracking-[0.06em] leading-[1.08] transition-colors cursor-pointer px-2 ${
            isLongBookName
              ? 'text-[30px] sm:text-[44px] md:text-[52px]'
              : 'text-[44px] sm:text-[60px] md:text-[68px]'
          }`}
        >
          {bookDisplayName}
        </button>

        {/* Sélecteur de chapitre discret en forme de pilule */}
        <div ref={pickerRef} className="relative mt-5 sm:mt-6">
          <button
            type="button"
            onClick={() => {
              setPickerMode('chapter');
              setIsPickerOpen(prev => (pickerMode === 'chapter' ? !prev : true));
            }}
            aria-expanded={isPickerOpen}
            aria-label={`Chapitre ${activeChapter}. Cliquer pour choisir un chapitre`}
            className="min-h-[44px] px-5 py-2 rounded-full bg-[#0c0a07]/55 hover:bg-[#14110b]/85 border border-[#c9a84c]/30 hover:border-[#c9a84c]/65 text-[#f4efe2] text-[13px] sm:text-sm font-sans flex items-center justify-center gap-2.5 transition-all cursor-pointer"
          >
            <span>Chapitre {activeChapter}</span>
            <ChevronDown
              className={`w-4 h-4 text-[#c9a84c] transition-transform duration-200 ${
                isPickerOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Menu déroulant discret pour choisir le chapitre ou le livre */}
          <AnimatePresence>
            {isPickerOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.16 }}
                className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 z-50 w-[280px] sm:w-[320px] rounded-2xl bg-[#0e0c08]/95 backdrop-blur-xl border border-[#c9a84c]/35 p-3.5 shadow-[0_18px_45px_rgba(0,0,0,0.88)] text-left"
              >
                {pickerMode === 'chapter' ? (
                  <>
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#2e2a1e]">
                      <span className="font-serif text-xs uppercase tracking-wider text-[#c9a84c] font-semibold truncate pr-2">
                        {activeBook.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPickerMode('book')}
                        className="text-xs font-sans text-[#b5ab99] hover:text-[#ebd092] underline underline-offset-2 cursor-pointer px-1"
                      >
                        Changer de livre
                      </button>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 max-h-[210px] overflow-y-auto pr-0.5 scroller-thin">
                      {Array.from({ length: activeBook.chapters_count }, (_, i) => i + 1).map((chNum) => {
                        const isSelected = chNum === activeChapter;
                        return (
                          <button
                            key={chNum}
                            type="button"
                            onClick={() => {
                              if (onSelectBookAndChapter) {
                                onSelectBookAndChapter(activeBook, chNum);
                              }
                              setIsPickerOpen(false);
                            }}
                            aria-label={`Chapitre ${chNum}`}
                            className={`min-h-[44px] rounded-xl text-xs font-sans font-medium flex items-center justify-center border transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#d4b257] text-[#0c0a07] border-[#d4b257] font-bold'
                                : 'bg-[#14110b] text-[#e8e0d0] border-[#2e2a1e] hover:border-[#c9a84c]/60 hover:text-[#c9a84c]'
                            }`}
                          >
                            {chNum}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 pb-2.5 mb-2.5 border-b border-[#2e2a1e]">
                      <button
                        type="button"
                        onClick={() => setBookTestament('AT')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-medium transition cursor-pointer ${
                          bookTestament === 'AT'
                            ? 'bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/50'
                            : 'text-[#8c8270] hover:text-[#e8e0d0]'
                        }`}
                      >
                        Ancien (39)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookTestament('NT')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-sans font-medium transition cursor-pointer ${
                          bookTestament === 'NT'
                            ? 'bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/50'
                            : 'text-[#8c8270] hover:text-[#e8e0d0]'
                        }`}
                      >
                        Nouveau (27)
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto pr-0.5 scroller-thin">
                      {filteredBooks.map((bk) => {
                        const isCurrentBook = bk.id === activeBook.id;
                        return (
                          <button
                            key={bk.id}
                            type="button"
                            onClick={() => {
                              if (onSelectBookAndChapter) {
                                onSelectBookAndChapter(bk, 1);
                              }
                              setPickerMode('chapter');
                            }}
                            className={`px-3 py-2 rounded-xl text-left text-xs font-serif border transition cursor-pointer truncate ${
                              isCurrentBook
                                ? 'bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c]/60 font-bold'
                                : 'bg-[#14110b] text-[#e8e0d0] border-[#2e2a1e] hover:border-[#c9a84c]/50'
                            }`}
                          >
                            {bk.name}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Deux boutons côte à côte : « LIRE » (plein, doré) et « ÉCOUTER » (contour doré) */}
        <div className="mt-6 sm:mt-7 flex items-center justify-center gap-3 sm:gap-4 w-full">
          <button
            type="button"
            onClick={handleReadClick}
            className="min-h-[48px] px-7 sm:px-8 py-3 rounded-full bg-[#d4b257] hover:bg-[#dfc06b] active:scale-[0.98] text-[#0c0a07] font-sans font-semibold text-xs sm:text-[13px] uppercase tracking-[0.16em] flex items-center justify-center gap-2.5 shadow-[0_4px_20px_rgba(201,168,76,0.22)] transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4 stroke-[1.9] text-[#0c0a07] shrink-0" />
            <span>LIRE</span>
          </button>

          <button
            type="button"
            onClick={handleListenClick}
            className="min-h-[48px] px-6 sm:px-8 py-3 rounded-full bg-[#0c0a07]/35 hover:bg-[#c9a84c]/12 active:scale-[0.98] border border-[#c9a84c]/45 hover:border-[#c9a84c] text-[#c9a84c] font-sans font-semibold text-xs sm:text-[13px] uppercase tracking-[0.16em] flex items-center justify-center gap-2.5 transition-all cursor-pointer"
          >
            {isAudioPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 stroke-[2] text-[#c9a84c] shrink-0" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 stroke-[2] text-[#c9a84c] shrink-0" />
                <span>ÉCOUTER</span>
              </>
            )}
          </button>
        </div>

        {/* Verset du jour en petit, en italique, sans grands guillemets décoratifs */}
        <div
          onClick={onOpenDailyVerse}
          role={onOpenDailyVerse ? 'button' : undefined}
          tabIndex={onOpenDailyVerse ? 0 : undefined}
          onKeyDown={(e) => {
            if (onOpenDailyVerse && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onOpenDailyVerse();
            }
          }}
          aria-label={`Verset du jour : ${activeVerse.reference}`}
          className={`mt-8 sm:mt-10 max-w-[420px] mx-auto text-center group ${
            onOpenDailyVerse ? 'cursor-pointer' : ''
          }`}
        >
          <p className="font-serif italic text-[14px] sm:text-[15px] leading-[1.65] text-[#bdb4a2] group-hover:text-[#e8e0d0] transition-colors select-text">
            « {activeVerse.quote} »
          </p>
          <span className="block mt-2 text-xs font-sans font-medium tracking-[0.04em] text-[#c9a84c]/90">
            {activeVerse.reference}
          </span>
        </div>
      </div>

      {/* 3. BARRE DE NAVIGATION FLOTTANTE ARRONDIE (Accueil, Étude, Assistant, Notes) */}
      {!isZenMode && (
        <nav
          aria-label="Navigation principale"
          className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2.5rem)] max-w-[380px] sm:max-w-[410px] rounded-full bg-[#0c0a07]/75 backdrop-blur-md border border-[#c9a84c]/25 px-4 sm:px-6 py-2 shadow-[0_10px_35px_rgba(0,0,0,0.75)] flex items-center justify-between"
        >
          <button
            type="button"
            onClick={() => onNavigateToTab('home')}
            aria-label="Accueil"
            title="Accueil"
            className="w-12 h-11 rounded-2xl bg-[#c9a84c]/18 text-[#c9a84c] flex items-center justify-center transition-all cursor-pointer"
          >
            <Home className="w-[19px] h-[19px] stroke-[1.75]" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab('read')}
            aria-label="Étude"
            title="Étude"
            className="w-12 h-11 rounded-2xl text-[#a89f8c] hover:text-[#f4efe2] hover:bg-white/5 flex items-center justify-center transition-all cursor-pointer"
          >
            <BookOpen className="w-[19px] h-[19px] stroke-[1.75]" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab('assistant')}
            aria-label="Assistant"
            title="Assistant"
            className="w-12 h-11 rounded-2xl text-[#a89f8c] hover:text-[#f4efe2] hover:bg-white/5 flex items-center justify-center transition-all cursor-pointer"
          >
            <MessageSquare className="w-[19px] h-[19px] stroke-[1.75]" />
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab('notes')}
            aria-label="Notes"
            title="Notes"
            className="w-12 h-11 rounded-2xl text-[#a89f8c] hover:text-[#f4efe2] hover:bg-white/5 flex items-center justify-center transition-all cursor-pointer"
          >
            <Bookmark className="w-[19px] h-[19px] stroke-[1.75]" />
          </button>
        </nav>
      )}
    </div>
  );
};
