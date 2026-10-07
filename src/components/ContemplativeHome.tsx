import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Quote, Play,
  Sun, Leaf, Mountain, Flame
} from 'lucide-react';
import { ReadingHistory } from '../types/bible';
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
    label: 'Neutre / Bokeh',
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
    description: 'Vallée brumeuse au crépuscule et rayons d\'or célestes'
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
  onOpenSettings?: () => void;
  onOpenNavigator?: () => void;
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
  onOpenNavigator,
  readingHistory = [],
  onNavigateToChapter,
  onSelectSanctuaryBg
}) => {
  // Démarre sur Psaumes 23:4 conformément à la maquette
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAtmosphere, setSelectedAtmosphere] = useState<'auto' | 'sanctuary' | 'valley' | 'coffee_bible'>(() => {
    try {
      return (localStorage.getItem('bible_home_atmosphere') as any) || 'auto';
    } catch (_) {
      return 'auto';
    }
  });

  const latestReading = readingHistory && readingHistory.length > 0
    ? [...readingHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    : null;

  const validLatestVerse = latestReading
    ? Math.min(Math.max(1, latestReading.last_verse || 1), getChapterMaxVerses(latestReading.book_id, latestReading.chapter))
    : 1;

  // Récupère l'intitulé du dernier passage lu (ex. "Actes 3")
  const getDisplayLastPassage = (): string => {
    if (latestReading && latestReading.book_name && latestReading.chapter) {
      return `${latestReading.book_name} ${latestReading.chapter}`;
    }
    try {
      const saved = localStorage.getItem('bible_last_reading_position');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.book_name && parsed.chapter) {
          return `${parsed.book_name} ${parsed.chapter}`;
        }
      }
    } catch (_) {}
    return "Actes 3";
  };

  const handleResumeReading = () => {
    if (latestReading && onNavigateToChapter) {
      onNavigateToChapter(latestReading.book_id, latestReading.chapter, validLatestVerse);
      return;
    }
    try {
      const saved = localStorage.getItem('bible_last_reading_position');
      if (saved && onNavigateToChapter) {
        const parsed = JSON.parse(saved);
        if (parsed.book_id && parsed.chapter) {
          onNavigateToChapter(parsed.book_id, parsed.chapter, parsed.verse || 1);
          return;
        }
      }
    } catch (_) {}
    // Par défaut si pas d'historique : Actes 3 (Livre 44 Actes, chapitre 3)
    if (onNavigateToChapter) {
      onNavigateToChapter(44, 3, 1);
    } else {
      onNavigateToTab('read');
    }
  };

  const activeVerse = CONTEMPLATIVE_VERSES[currentIdx] || CONTEMPLATIVE_VERSES[0];

  const handleSelectAtmosphere = (atmoId: 'auto' | 'sanctuary' | 'valley' | 'coffee_bible') => {
    setSelectedAtmosphere(atmoId);
    try {
      localStorage.setItem('bible_home_atmosphere', atmoId);
    } catch (_) {}

    if (onSelectSanctuaryBg) {
      if (atmoId === 'sanctuary') onSelectSanctuaryBg(PRAYER_BG_SANCTUARY);
      else if (atmoId === 'valley') onSelectSanctuaryBg(PRAYER_BG_VALLEY);
      else if (atmoId === 'coffee_bible') onSelectSanctuaryBg(PRAYER_BG_BIBLE);
      else if (atmoId === 'auto') onSelectSanctuaryBg(activeVerse.defaultBg || PRAYER_BG_VALLEY);
    }
  };

  const displayPassageName = getDisplayLastPassage();

  return (
    <div className="w-full max-w-[900px] mx-auto text-left select-none space-y-4 sm:space-y-5 lg:space-y-6">

      {/* 1. CARTE « ALLER À UN VERSET » */}
      {/* Bouton Livre -> Chapitre -> Verset */}
      <button
        type="button"
        onClick={() => {
          if (onOpenNavigator) {
            onOpenNavigator();
          } else {
            onNavigateToTab('read');
          }
        }}
        className="w-full min-h-[70px] sm:min-h-[80px] p-5 sm:p-6 rounded-2xl bg-[#0c0a07]/80 hover:bg-[#12100c]/90 backdrop-blur-md border border-[#c9a84c]/40 hover:border-[#c9a84c]/80 text-[#e8e0d0] flex flex-col items-center justify-center group transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.6),0_0_15px_rgba(201,168,76,0.1)] hover:shadow-[0_4px_25px_rgba(201,168,76,0.2)] cursor-pointer active:scale-[0.99]"
        title="Choisir Livre, Chapitre et Verset"
      >
        <div className="flex items-center gap-2.5 text-[#c9a84c] group-hover:scale-105 transition-transform duration-300">
          <BookOpen className="w-5 h-5 stroke-[2]" />
          <h2 className="font-serif font-black text-sm sm:text-base uppercase tracking-[0.22em] text-[#c9a84c]">
            ALLER À UN VERSET
          </h2>
        </div>
        <span className="text-[11px] sm:text-xs font-mono text-[#8c8270] group-hover:text-[#e8e0d0] tracking-wider mt-1.5 transition-colors">
          Livre → Chapitre → Verset
        </span>
      </button>

      {/* 2. CARTE « REPRENDRE LA LECTURE » */}
      {/* Ordinateur : bandeau horizontal (passage à gauche, bouton à droite) */}
      {/* Mobile : passage en haut, bouton pleine largeur en dessous */}
      <div className="w-full rounded-2xl bg-[#0c0a07]/80 backdrop-blur-md border border-[#c9a84c]/40 hover:border-[#c9a84c]/70 transition-all duration-300 p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.6),0_0_15px_rgba(201,168,76,0.1)]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-left space-y-1">
            <span className="text-[9.5px] sm:text-[10px] font-mono uppercase text-[#8c8270] tracking-[0.24em] font-bold block">
              REPRENDRE LA LECTURE
            </span>
            <p className="font-serif font-extrabold text-xl sm:text-2xl text-[#f4efe2] tracking-wide">
              {displayPassageName}
            </p>
          </div>

          {/* Bouton doré de reprise */}
          {/* Mobile : w-full, min-h-[44px] | Desktop : auto pill */}
          <button
            type="button"
            onClick={handleResumeReading}
            className="w-full md:w-auto min-h-[44px] px-7 py-2.5 sm:py-3 rounded-full md:rounded-full bg-[#c9a84c] hover:bg-[#ebd092] active:scale-95 text-[#050403] font-serif font-black text-xs sm:text-sm tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 shadow-[0_2px_12px_rgba(201,168,76,0.35)] cursor-pointer"
            title={`Reprendre la lecture de ${displayPassageName}`}
          >
            <span>Reprendre</span>
            <span className="md:hidden">→</span>
          </button>
        </div>
      </div>

      {/* 3. CARTE « VERSET DU JOUR » */}
      {/* Verset centré en italique entre guillemets décoratifs, référence en doré en dessous */}
      <div className="w-full rounded-2xl bg-[#0c0a07]/80 backdrop-blur-md border border-[#c9a84c]/40 hover:border-[#c9a84c]/70 transition-all duration-300 p-6 sm:p-8 lg:p-10 text-center shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_18px_rgba(201,168,76,0.12)]">
        {/* Label discret haut */}
        <span className="text-[9px] sm:text-[10px] font-mono uppercase text-[#8c8270] tracking-[0.24em] font-bold block mb-4 sm:mb-5">
          VERSET DU JOUR
        </span>

        {/* Grand guillemet décoratif d'or au-dessus */}
        <div className="flex justify-center text-[#c9a84c]/60 mb-2 sm:mb-4">
          <Quote className="w-7 h-7 sm:w-9 sm:h-9 transform scale-y-[-1] -rotate-12 select-none" />
        </div>

        {/* Citation du verset en typographie serif élégante */}
        <div className="min-h-[90px] sm:min-h-[110px] flex items-center justify-center px-2 sm:px-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              className="font-serif italic text-lg sm:text-xl lg:text-2xl leading-relaxed sm:leading-relaxed lg:leading-relaxed text-[#f4efe2] select-text drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
            >
              « {activeVerse.quote} »
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Grand guillemet décoratif d'or en dessous */}
        <div className="flex justify-center text-[#c9a84c]/60 mt-2 sm:mt-4">
          <Quote className="w-7 h-7 sm:w-9 sm:h-9 rotate-12 select-none" />
        </div>

        {/* Référence biblique en doré */}
        <p className="font-serif font-black text-xs sm:text-sm uppercase tracking-[0.26em] text-[#c9a84c] mt-4 sm:mt-5 drop-shadow-sm">
          {activeVerse.reference.toUpperCase()}
        </p>
      </div>

      {/* 4. SECTION « AMBIANCE » */}
      {/* Ordinateur : les 4 choix d'ambiance sur UNE seule ligne, dans un cadre */}
      {/* Mobile : boutons d'ambiance en grille 2 x 2 */}
      <div className="w-full text-left space-y-2">
        <span className="text-[9.5px] sm:text-[10px] font-mono uppercase text-[#8c8270] tracking-[0.22em] font-bold block px-1">
          AMBIANCE
        </span>

        {/* Cadre avec les 4 choix d'ambiance */}
        <div className="p-2 sm:p-2.5 rounded-2xl bg-[#0c0a07]/80 backdrop-blur-md border border-[#c9a84c]/35 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          {/* Responsive grid : 2 colonnes sur mobile (<768px), 4 colonnes sur tablette/ordinateur (>=768px / 1024px) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5">
            {CONTEMPLATIVE_ATMOSPHERES.map((atmo) => {
              const IconComp = atmo.icon;
              const isSelected = selectedAtmosphere === atmo.id;

              return (
                <button
                  key={atmo.id}
                  type="button"
                  onClick={() => handleSelectAtmosphere(atmo.id)}
                  title={atmo.description}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-serif transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border ${
                    isSelected
                      ? 'bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c] font-bold shadow-[0_0_12px_rgba(201,168,76,0.22)]'
                      : 'bg-[#050403]/60 text-[#8c8270] hover:text-[#ebd092] hover:bg-[#12100c] border-[#2e2a1e] hover:border-[#c9a84c]/50'
                  }`}
                >
                  <IconComp 
                    className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#c9a84c]' : 'text-[#8c8270]'}`} 
                    strokeWidth={1.8} 
                  />
                  <span className="tracking-wide text-[11px] sm:text-xs truncate">{atmo.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
};
