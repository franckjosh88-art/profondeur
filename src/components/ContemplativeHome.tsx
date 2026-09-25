import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, Bell, ChevronLeft, ChevronRight, Home, FolderClosed, 
  Sparkles, X, Heart, HelpCircle, Settings, Quote, BookOpen, Flame, Play, Volume2,
  Sun, Leaf, Mountain
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
    id: 'auto',
    name: 'Auto (Verset)',
    label: 'Harmonisé',
    icon: Sun,
    description: 'Arrière-plan adapté automatiquement au verset'
  },
  {
    id: 'sanctuary',
    name: 'Sanctuaire',
    label: 'Neutre / Bokeh',
    icon: Leaf,
    url: PRAYER_BG_SANCTUARY,
    description: 'Lumière dorée douce en clair-obscur, bokeh intime et sacré'
  },
  {
    id: 'valley',
    name: 'Psaume 23',
    label: 'Vallée Dorée',
    icon: Mountain,
    url: PRAYER_BG_VALLEY,
    description: 'Vallée brumeuse au crépuscule et rayons d\'or célestes'
  },
  {
    id: 'coffee_bible',
    name: 'Bible & Boiserie',
    label: 'Méditation',
    icon: Flame,
    url: PRAYER_BG_BIBLE,
    description: 'Bible ouverte, boiserie sombre et lueur dorée tamisée'
  }
];

const REAL_SPIRITUAL_PHOTOS = [
  PRAYER_BG_SANCTUARY,
  PRAYER_BG_VALLEY,
  PRAYER_BG_BIBLE,
  'https://images.pexels.com/photos/8468580/pexels-photo-8468580.jpeg', // Homme en prière dans la lumière
  'https://images.pexels.com/photos/13101383/pexels-photo-13101383.jpeg', // Mains en prière sur livre ouvert
  'https://images.pexels.com/photos/6860496/pexels-photo-6860496.jpeg'  // Femme en prière et sérénité
];

interface ContemplativeHomeProps {
  onNavigateToTab: (tab: 'home' | 'read' | 'challenges' | 'dictionary' | 'assistant' | 'encyclopedia' | 'memorize' | 'notes') => void;
  onOpenSettings?: () => void;
  notesCount?: number;
  goalPercent?: number;
  currentStreak?: number;
  readingHistory?: ReadingHistory[];
  onNavigateToChapter?: (bookId: number, chapterNum: number, verseNum?: number) => void;
  onPlayAudioCurrentChapter?: () => void;
  onSelectSanctuaryBg?: (bgUrl: string) => void;
  currentSanctuaryBg?: string;
}

interface ContemplativeVerse {
  quote: string;
  reference: string;
  theme: string;
  defaultBg: string;
}

const CONTEMPLATIVE_VERSES: ContemplativeVerse[] = [
  {
    quote: "Je t'aime, ô Éternel, ma force ! L'Éternel est mon roc, ma forteresse, mon libérateur ! Mon Dieu, mon rocher, où je trouve un abri !",
    reference: "Psaumes 18:2-3",
    theme: "Force & Abri",
    defaultBg: PRAYER_BG_SANCTUARY
  },
  {
    quote: "L'Éternel est mon berger: je ne manquerai de rien. Il me fait reposer dans de ruds pâturages, Il me dirige près des eaux paisibles.",
    reference: "Psaumes 23:1-2",
    theme: "Paix & Providence",
    defaultBg: PRAYER_BG_VALLEY
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
    quote: "Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux.",
    reference: "Matthieu 18:20",
    theme: "Présence Divine",
    defaultBg: PRAYER_BG_SANCTUARY
  },
  {
    quote: "L'Éternel est ma lumière et mon salut: De qui aurais-je crainte ? L'Éternel est le soutien de ma vie: De qui aurais-je peur ?",
    reference: "Psaumes 27:1",
    theme: "Confiance & Courage",
    defaultBg: PRAYER_BG_BIBLE
  },
  {
    quote: "Quand je marche dans la vallée de l'ombre de la mort, Je ne crains aucun mal, car tu es avec moi: Ta houlette et ton bâton me rassurent.",
    reference: "Psaumes 23:4",
    theme: "Consolation Spirituelle",
    defaultBg: PRAYER_BG_VALLEY
  }
];

export const ContemplativeHome: React.FC<ContemplativeHomeProps> = ({
  onNavigateToTab,
  onOpenSettings,
  notesCount = 0,
  goalPercent = 0,
  currentStreak = 0,
  readingHistory = [],
  onNavigateToChapter,
  onPlayAudioCurrentChapter,
  onSelectSanctuaryBg
}) => {
  // Démarre sur Psaume 23:4 (index 6) conformément à la maquette
  const [currentIdx, setCurrentIdx] = useState<number>(6);
  const [direction, setDirection] = useState<number>(0); // -1 for left, 1 for right
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [showNotifPanel, setShowNotifPanel] = useState<boolean>(false);
  const [likedVerses, setLikedVerses] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'contemplation' | 'dashboard'>('contemplation');
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

  const handleResumeReading = () => {
    if (latestReading && onNavigateToChapter) {
      onNavigateToChapter(latestReading.book_id, latestReading.chapter, validLatestVerse);
    } else {
      onNavigateToTab('read');
    }
  };

  const activeVerse = CONTEMPLATIVE_VERSES[currentIdx];

  // Calcul du fond d'écran actif selon l'ambiance choisie
  const getActiveBackground = (): string => {
    if (selectedAtmosphere === 'sanctuary') return PRAYER_BG_SANCTUARY;
    if (selectedAtmosphere === 'valley') return PRAYER_BG_VALLEY;
    if (selectedAtmosphere === 'coffee_bible') return PRAYER_BG_BIBLE;
    // Mode Auto : lié au verset affiché
    return activeVerse.defaultBg || PRAYER_BG_SANCTUARY;
  };

  const currentBgImage = getActiveBackground();

  const handleSelectAtmosphere = (atmoId: 'auto' | 'sanctuary' | 'valley' | 'coffee_bible') => {
    setSelectedAtmosphere(atmoId);
    try {
      localStorage.setItem('bible_home_atmosphere', atmoId);
    } catch (_) {}

    // Optionnel : synchronise aussi le fond global de l'app si sélection explicite
    if (onSelectSanctuaryBg) {
      if (atmoId === 'sanctuary') onSelectSanctuaryBg(PRAYER_BG_SANCTUARY);
      else if (atmoId === 'valley') onSelectSanctuaryBg(PRAYER_BG_VALLEY);
      else if (atmoId === 'coffee_bible') onSelectSanctuaryBg(PRAYER_BG_BIBLE);
    }
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIdx((prev) => (prev === 0 ? CONTEMPLATIVE_VERSES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setDirection(1);
    setCurrentIdx((prev) => (prev === CONTEMPLATIVE_VERSES.length - 1 ? 0 : prev + 1));
  };

  const toggleLike = (idx: number) => {
    if (likedVerses.includes(idx)) {
      setLikedVerses(likedVerses.filter(i => i !== idx));
    } else {
      setLikedVerses([...likedVerses, idx]);
    }
  };

  // Pre-configured notification data
  const NOTIFICATIONS_LIST = [
    { id: 1, title: "Méditation Matinale", text: "Prenez 3 minutes de respiration sacrée avant votre lecture quotidienne.", time: "Aujourd'hui, 8h00" },
    { id: 2, title: "Plan de Lecture", text: "Félicitations pour votre fidélité sur votre plan d'étude spirituel.", time: "Hier" },
    { id: 3, title: "Sagesse d'en Haut", text: "La Parole de Dieu est une lampe à vos pieds, et une lumière sur votre sentier.", time: "Il y a 2 jours" }
  ];

  return (
    <div className="w-full relative min-h-[660px] bg-[#050403] rounded-[12px] border border-[#D9B26A]/45 hover:border-[#D9B26A]/70 overflow-hidden flex flex-col justify-between font-sans shadow-[0_4px_30px_rgba(0,0,0,0.7),0_0_20px_rgba(217,178,106,0.12)] select-none text-left transition-all duration-300">
      
      {/* PHOTOGRAPHIC HERO & GLOW BACKGROUND EFFECT */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Real spiritual meditation background image with dark vignette overlay */}
        <motion.img
          key={currentBgImage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ duration: 0.6 }}
          src={currentBgImage}
          alt="Méditation biblique et sérénité spirituelle"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover filter contrast-105 brightness-95 scale-105"
        />
        {/* Voile sombre pour un contraste doux et optimal avec le texte doré */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050403]/80 via-[#050403]/60 to-[#050403]/90 backdrop-blur-[0.5px]" />
        
        {/* Animated Twinkling Constellation Stars */}
        <div className="absolute top-[12%] left-[15%] w-1 h-1 bg-[#D9B26A] rounded-full animate-pulse opacity-70" />
        <div className="absolute top-[28%] left-[78%] w-1.5 h-1.5 bg-[#ebd092] rounded-full animate-pulse opacity-60 duration-1000" />
        <div className="absolute top-[45%] left-[25%] w-1 h-1 bg-white rounded-full animate-ping opacity-30 duration-3000" />
        <div className="absolute top-[65%] left-[10%] w-1.5 h-1.5 bg-[#D9B26A] rounded-full animate-pulse opacity-80 duration-700" />
        <div className="absolute top-[75%] left-[85%] w-1 h-1 bg-white rounded-full animate-pulse opacity-50 duration-1500" />
      </div>

      {/* HEADER SECTION */}
      <header className="relative z-10 w-full px-4 h-14 flex items-center justify-between border-b border-[#D9B26A]/25 bg-[#050403]/75 backdrop-blur-md">
        {/* Menu Hamburger gauche */}
        <button 
          onClick={() => setShowDrawer(true)}
          className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[#8c8270] hover:text-[#D9B26A] active:bg-[#0c0a07]/50 transition cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Titre centre or élégant */}
        <div className="text-center">
          <h1 className="font-serif font-black text-xs uppercase tracking-[0.22em] text-[#D9B26A] filter drop-shadow-[0_2px_4px_rgba(217,178,106,0.25)]">
            Bible Profonde
          </h1>
          <span className="text-[7.5px] font-mono uppercase text-[#8c8270] tracking-widest font-extrabold block">
            {viewMode === 'contemplation' ? 'Mode Sacré' : 'Tableau de Bord'}
          </span>
        </div>

        {/* Bouton de bascule de mode de vue à droite */}
        <button 
          onClick={() => setViewMode(prev => prev === 'contemplation' ? 'dashboard' : 'contemplation')}
          className="px-2.5 py-1 rounded-[12px] border border-[#D9B26A]/35 hover:border-[#D9B26A] text-[#8c8270] hover:text-[#D9B26A] active:bg-[#0c0a07]/50 transition cursor-pointer text-[9px] font-mono uppercase tracking-widest"
          title={viewMode === 'contemplation' ? "Voir Tableau de Bord" : "Voir Mode Contemplatif"}
        >
          {viewMode === 'contemplation' ? 'Tableau' : 'Sacré'}
        </button>
      </header>

      {/* NAVIGATION INDICATOR BAR */}
      <section className="relative z-10 w-full px-5 py-2.5 flex items-center justify-between border-b border-[#D9B26A]/20 bg-[#050403]/40">
        <button 
          onClick={handlePrev}
          className="w-8 h-8 rounded-[10px] border border-[#D9B26A]/30 hover:border-[#D9B26A] flex items-center justify-center text-[#8c8270] hover:text-[#D9B26A] active:scale-95 transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Indicateur Verset X/Y */}
        <div className="flex flex-col items-center font-serif">
          <span className="text-[9px] font-serif font-bold text-[#D9B26A] uppercase tracking-widest">
            Verset {currentIdx + 1} / {CONTEMPLATIVE_VERSES.length}
          </span>
          <span className="text-[7.5px] font-mono text-[#8c8270] uppercase tracking-wide">
            {activeVerse.theme}
          </span>
        </div>

        <button 
          onClick={handleNext}
          className="w-8 h-8 rounded-[10px] border border-[#D9B26A]/30 hover:border-[#D9B26A] flex items-center justify-center text-[#8c8270] hover:text-[#D9B26A] active:scale-95 transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </section>

      {/* SÉLECTEUR D'AMBIANCE VISUELLE DU FOND (ICÔNES VECTORIELLES FINES IOS / MATERIAL) */}
      <section className="relative z-10 w-full px-3 py-2 flex items-center justify-center gap-1.5 border-b border-[#D9B26A]/15 bg-[#050403]/75 backdrop-blur-md overflow-x-auto no-scrollbar">
        <span className="text-[8px] font-serif uppercase tracking-widest text-[#8c8270] mr-1 shrink-0">
          Ambiance :
        </span>
        {CONTEMPLATIVE_ATMOSPHERES.map((atmo) => {
          const IconComponent = atmo.icon;
          const isSelected = selectedAtmosphere === atmo.id;
          return (
            <button
              key={atmo.id}
              onClick={() => handleSelectAtmosphere(atmo.id as any)}
              title={atmo.description}
              className={`px-2.5 py-1 rounded-[8px] text-[9px] font-serif transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-[#D9B26A]/20 text-[#D9B26A] border-[#D9B26A] font-bold shadow-[0_0_10px_rgba(217,178,106,0.22)]'
                  : 'bg-[#050403]/80 text-[#8c8270] hover:text-[#ebd092] border-[#D9B26A]/20 hover:border-[#D9B26A]/45'
              }`}
            >
              <IconComponent 
                className={`w-3 h-3 transition-colors ${
                  isSelected ? 'text-[#D9B26A]' : 'text-[#8c8270]'
                }`} 
                strokeWidth={1.75} 
              />
              <span className="tracking-wide">{atmo.label}</span>
            </button>
          );
        })}
      </section>

      {/* MAIN VIEW CONTENT */}
      {viewMode === 'contemplation' ? (
        <main className="relative z-10 flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-6 text-center select-text">
          <div className="w-full max-w-sm flex flex-col items-center space-y-4">
            
            {/* CARTE CONTEMPLATIVE DU VERSET SACRÉ AVEC COINS ARRONDIS 12PX, BORDURE DORÉE #D9B26A ET FOND SOMBRE PROFOND #050403 */}
            <div className="w-full bg-[#050403]/90 backdrop-blur-md border border-[#D9B26A]/45 hover:border-[#D9B26A]/75 rounded-[12px] p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_18px_rgba(217,178,106,0.12)] flex flex-col items-center space-y-4 transition-all duration-300">
              {/* Grand guillemet d'or stylisé au-dessus */}
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.35 }}
                transition={{ duration: 0.6 }}
                className="text-[#D9B26A] font-serif"
              >
                <Quote className="w-8 h-8 transform scale-y-[-1] flip-x -rotate-12 select-none" />
              </motion.div>

              {/* Verset biblique en typographie calligraphique & serif élégante */}
              <div className="min-h-[120px] flex items-center justify-center w-full px-1">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentIdx}
                    initial={{ opacity: 0, filter: 'blur(5px)', y: direction * 10 }}
                    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                    exit={{ opacity: 0, filter: 'blur(5px)', y: -direction * 10 }}
                    transition={{ duration: 0.45, ease: "easeInOut" }}
                    className="font-['Alex_Brush'] text-[24px] sm:text-[26px] leading-[1.38] text-[#f4efe2] italic select-text filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                    style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                  >
                    « {activeVerse.quote} »
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Grand guillemet d'or stylisé en dessous */}
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.35 }}
                transition={{ duration: 0.6 }}
                className="text-[#D9B26A] font-serif select-none"
              >
                <Quote className="w-8 h-8 rotate-12" />
              </motion.div>

              {/* Référence biblique or, typographie serif élégante */}
              <div className="pt-1 text-center select-none w-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentIdx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3"
                  >
                    <p className="font-serif font-black text-[11px] uppercase tracking-[0.24em] text-[#D9B26A]">
                      {activeVerse.reference}
                    </p>
                    <div className="flex justify-center items-center gap-3 pt-1">
                      <button 
                        onClick={() => toggleLike(currentIdx)}
                        className={`w-8 h-8 rounded-[10px] flex items-center justify-center transition cursor-pointer border ${
                          likedVerses.includes(currentIdx)
                            ? 'bg-[#D9B26A]/20 border-[#D9B26A] text-[#D9B26A]'
                            : 'border-[#D9B26A]/35 text-[#8c8270] hover:text-[#e8e0d0] hover:border-[#D9B26A]/70'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${likedVerses.includes(currentIdx) ? 'fill-current' : ''}`} />
                      </button>
                      <button 
                        onClick={() => onNavigateToTab('read')}
                        className="text-[8px] font-serif tracking-widest uppercase border border-[#D9B26A]/40 text-[#ebd092] hover:text-[#e8e0d0] hover:border-[#D9B26A] px-3.5 py-1 rounded-[12px] transition cursor-pointer"
                      >
                        Étudier ce livre
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Cartes Reprendre la Lecture & Lecture Audio avec coins 12px, fond #050403 et bordures dorées #D9B26A */}
            <div className="w-full space-y-2.5">
              <button
                onClick={handleResumeReading}
                className="w-full px-4 py-3 rounded-[12px] bg-[#050403]/90 border border-[#D9B26A]/45 hover:border-[#D9B26A] text-[#e8e0d0] flex items-center justify-between group transition-all duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.5),0_0_12px_rgba(217,178,106,0.1)] cursor-pointer text-left backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[10px] bg-[#D9B26A]/10 border border-[#D9B26A]/35 flex items-center justify-center text-[#D9B26A] group-hover:bg-[#D9B26A] group-hover:text-[#050403] transition duration-300">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                  <div>
                    <span className="text-[8px] font-mono uppercase text-[#8c8270] tracking-wider block font-bold">Reprendre la lecture</span>
                    <span className="text-[11px] font-serif font-extrabold text-[#e8e0d0] group-hover:text-[#D9B26A] transition">
                      {latestReading ? `${latestReading.book_name} ${latestReading.chapter} · Verset ${validLatestVerse}` : 'Ouvrir la Sainte Bible'}
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-mono uppercase font-bold text-[#D9B26A] px-2.5 py-1 rounded-[8px] bg-[#D9B26A]/10 border border-[#D9B26A]/25 group-hover:bg-[#D9B26A] group-hover:text-[#050403] transition">
                  Reprendre →
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onPlayAudioCurrentChapter) {
                    onPlayAudioCurrentChapter();
                  }
                }}
                className="w-full px-4 py-3 rounded-[12px] bg-[#050403]/90 border border-[#D9B26A]/55 hover:border-[#D9B26A] text-[#e8e0d0] flex items-center justify-between group transition-all duration-300 shadow-[0_2px_10px_rgba(0,0,0,0.5),0_0_15px_rgba(217,178,106,0.14)] cursor-pointer text-left backdrop-blur-sm"
                title="Lancer la lecture audio du chapitre courant sans ouvrir le lecteur manuel"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[10px] bg-[#D9B26A] text-[#050403] flex items-center justify-center font-bold shadow-md group-hover:scale-105 transition">
                    <Volume2 className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <span className="text-[8px] font-mono uppercase text-[#D9B26A] tracking-wider block font-bold">Écoute Vocale Directe</span>
                    <span className="text-[11px] font-serif font-extrabold text-[#e8e0d0] group-hover:text-[#D9B26A] transition">
                      Lecture Audio
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-mono uppercase font-bold text-[#050403] px-2.5 py-1 rounded-[8px] bg-[#D9B26A] group-hover:bg-[#ebd092] transition shadow-sm">
                  Écouter ▶
                </span>
              </button>
            </div>

          </div>
        </main>
      ) : (
        /* SECONDARY RETRO/BRONZE GRID DASHBOARD (PRESERVING FUNCTIONAL OUTCOMES) */
        <main className="relative z-10 flex-1 p-5 md:p-6 space-y-4 md:space-y-5 overflow-y-auto no-scrollbar animate-fade-slide-up">
          {/* Card Verset en lumière avec coins 12px, fond #050403 et fine bordure dorée */}
          <div className="bg-[#050403]/90 border border-[#D9B26A]/50 hover:border-[#D9B26A] p-5 md:p-6 rounded-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.6),0_0_15px_rgba(217,178,106,0.12)] flex flex-col space-y-2.5 backdrop-blur-sm transition-all duration-300">
            <span className="text-[8px] font-mono tracking-[0.15em] text-[#D9B26A]/80 uppercase font-bold">Verset en lumière</span>
            <p className="font-serif italic text-xs leading-relaxed text-[#D9B26A]">
              « {activeVerse.quote} »
            </p>
            <span className="font-serif text-[9px] text-[#8c8270] tracking-widest uppercase font-bold">{activeVerse.reference}</span>
          </div>

          {/* Cartes d'action rapide avec coins 12px, fond #050403 et fines bordures dorées */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => onNavigateToTab('read')}
              className="bg-[#050403]/90 hover:bg-[#0c0a07] border border-[#D9B26A]/40 hover:border-[#D9B26A] rounded-[12px] p-3 flex flex-col justify-between items-start text-left h-[80px] shadow-[0_2px_8px_rgba(0,0,0,0.5),0_0_10px_rgba(217,178,106,0.08)] transition cursor-pointer backdrop-blur-sm"
            >
              <BookOpen className="w-4 h-4 text-[#D9B26A]" />
              <span className="text-[9px] font-serif uppercase tracking-wider text-[#ebd092]">Lecture</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onPlayAudioCurrentChapter) {
                  onPlayAudioCurrentChapter();
                }
              }}
              className="bg-[#050403]/90 hover:bg-[#0c0a07] border border-[#D9B26A]/60 hover:border-[#D9B26A] rounded-[12px] p-3 flex flex-col justify-between items-start text-left h-[80px] shadow-[0_2px_8px_rgba(0,0,0,0.5),0_0_12px_rgba(217,178,106,0.14)] transition cursor-pointer backdrop-blur-sm"
              title="Lecture Audio Directe"
            >
              <Volume2 className="w-4 h-4 text-[#D9B26A]" />
              <span className="text-[9px] font-serif uppercase tracking-wider text-[#D9B26A] font-bold">Audio ▶</span>
            </button>
            <button
              onClick={() => onNavigateToTab('assistant')}
              className="bg-[#050403]/90 hover:bg-[#0c0a07] border border-[#D9B26A]/40 hover:border-[#D9B26A] rounded-[12px] p-3 flex flex-col justify-between items-start text-left h-[80px] shadow-[0_2px_8px_rgba(0,0,0,0.5),0_0_10px_rgba(217,178,106,0.08)] transition cursor-pointer backdrop-blur-sm"
            >
              <HelpCircle className="w-4 h-4 text-[#D9B26A]" />
              <span className="text-[9px] font-serif uppercase tracking-wider text-[#ebd092]">Assistant</span>
            </button>
          </div>

          {/* STREAK - CARTE FIDÉLITÉ AVEC COINS 12PX ET BORDURE DORÉE */}
          <div className="bg-[#050403]/90 border border-[#D9B26A]/45 hover:border-[#D9B26A] rounded-[12px] p-4 sm:p-5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.5),0_0_12px_rgba(217,178,106,0.1)] backdrop-blur-sm transition-all duration-300">
            <div>
              <span className="text-[8px] font-mono text-[#8c8270] uppercase tracking-wider">Fidélité spirituelle</span>
              <span className="text-xs font-serif font-black text-[#e8e0d0] block">
                Série de {currentStreak} {currentStreak > 1 ? 'jours' : 'jour'}
              </span>
            </div>
            <div className="text-[10px] font-mono font-bold text-[#D9B26A] bg-[#D9B26A]/10 border border-[#D9B26A]/30 px-2.5 py-1 rounded-[8px] flex items-center gap-1.5">
              <Flame className={`w-3.5 h-3.5 ${currentStreak > 0 ? 'text-[#D9B26A] animate-pulse' : 'text-[#8c8270]'}`} fill={currentStreak > 0 ? '#D9B26A' : 'none'} />
              <span>{currentStreak}</span>
            </div>
          </div>

          {/* OBJECTIF LECTURE - CARTE OBJECTIF AVEC COINS 12PX ET BORDURE DORÉE */}
          <div className="bg-[#050403]/90 border border-[#D9B26A]/45 hover:border-[#D9B26A] rounded-[12px] p-4 sm:p-5 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.5),0_0_12px_rgba(217,178,106,0.1)] backdrop-blur-sm transition-all duration-300">
            <div>
              <span className="text-[8px] font-mono text-[#8c8270] uppercase tracking-wider">Objectif quotidien</span>
              <span className="text-xs font-serif font-black text-[#e8e0d0] block">Complété à {goalPercent}%</span>
            </div>
            <div className="text-[10px] font-mono font-bold text-[#D9B26A] bg-[#D9B26A]/10 border border-[#D9B26A]/30 px-2.5 py-1 rounded-[8px]">
              {goalPercent}%
            </div>
          </div>
        </main>
      )}

      {/* FULL HAMBURGER DRAWER MODAL */}
      <AnimatePresence>
        {showDrawer && (
          <div className="fixed inset-0 z-50 flex">
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />

            {/* Content panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 150 }}
              className="absolute top-0 bottom-0 left-0 w-[240px] bg-[#050403] border-r border-[#D9B26A]/30 p-5 flex flex-col justify-between shadow-[4px_0_24px_rgba(0,0,0,0.8)]"
            >
              <div className="space-y-6">
                {/* Drawer header */}
                <div className="flex items-center justify-between border-b border-[#D9B26A]/20 pb-3">
                  <div className="flex flex-col">
                    <span className="font-serif font-black text-[11px] text-[#D9B26A] uppercase tracking-widest">Bible Profonde</span>
                    <span className="text-[8px] font-mono text-[#8c8270] uppercase font-bold tracking-wider">Menu Sacré</span>
                  </div>
                  <button 
                    onClick={() => setShowDrawer(false)}
                    className="p-1 rounded-[8px] text-[#8c8270] hover:text-[#e8e0d0]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Navigation items */}
                <div className="space-y-1 font-serif text-[12px]">
                  <button 
                    onClick={() => { onNavigateToTab('home'); setViewMode('contemplation'); setShowDrawer(false); }}
                    className="w-full text-left p-2.5 rounded-[10px] text-[#e8e0d0] hover:bg-[#0c0a07] flex items-center gap-2.5 transition"
                  >
                    <Home className="w-4 h-4 text-[#D9B26A]" />
                    <span>Mode Comtemplatif</span>
                  </button>
                  <button 
                    onClick={() => { onNavigateToTab('read'); setShowDrawer(false); }}
                    className="w-full text-left p-2.5 rounded-[10px] text-[#8c8270] hover:text-[#e8e0d0] hover:bg-[#0c0a07] flex items-center gap-2.5 transition"
                  >
                    <BookOpen className="w-4 h-4 text-[#8c8270]" />
                    <span>Texte Sacré (Louis Segond)</span>
                  </button>
                  <button 
                    onClick={() => { onNavigateToTab('notes'); setShowDrawer(false); }}
                    className="w-full text-left p-2.5 rounded-[10px] text-[#8c8270] hover:text-[#e8e0d0] hover:bg-[#0c0a07] flex items-center gap-2.5 transition"
                  >
                    <FolderClosed className="w-4 h-4 text-[#8c8270]" />
                    <span>Journal d'Harmonie ({notesCount})</span>
                  </button>
                  <button 
                    onClick={() => { onNavigateToTab('challenges'); setShowDrawer(false); }}
                    className="w-full text-left p-2.5 rounded-[10px] text-[#8c8270] hover:text-[#e8e0d0] hover:bg-[#0c0a07] flex items-center gap-2.5 transition"
                  >
                    <Sparkles className="w-4 h-4 text-[#8c8270]" />
                    <span>Programmes de Lecture</span>
                  </button>
                  <button 
                    onClick={() => { onNavigateToTab('assistant'); setShowDrawer(false); }}
                    className="w-full text-left p-2.5 rounded-[10px] text-[#8c8270] hover:text-[#e8e0d0] hover:bg-[#0c0a07] flex items-center gap-2.5 transition"
                  >
                    <HelpCircle className="w-4 h-4 text-[#8c8270]" />
                    <span>Assistant Spirituel (Conseil)</span>
                  </button>
                  <button 
                    onClick={() => { onNavigateToTab('memorize'); setShowDrawer(false); }}
                    className="w-full text-left p-2.5 rounded-[10px] text-[#8c8270] hover:text-[#e8e0d0] hover:bg-[#0c0a07] flex items-center gap-2.5 transition"
                  >
                    <Quote className="w-4 h-4 text-[#8c8270]" />
                    <span>Exercices de Récitation</span>
                  </button>
                </div>
              </div>

              {/* Settings Action Button */}
              <div className="pt-4 border-t border-[#D9B26A]/20">
                <button
                  onClick={() => {
                    setShowDrawer(false);
                    if (onOpenSettings) onOpenSettings();
                  }}
                  className="w-full py-2 bg-[#050403] border border-[#D9B26A]/35 text-[10px] font-mono uppercase tracking-widest text-[#8c8270] hover:text-[#D9B26A] rounded-[12px] transition"
                >
                  <Settings className="w-3.5 h-3.5 inline mr-1.5 align-text-bottom" />
                  Paramètres
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NOTIFICATIONS PANEL BOTTOM DRAWER */}
      <AnimatePresence>
        {showNotifPanel && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifPanel(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative bg-[#050403] border-t border-[#D9B26A]/30 rounded-t-[12px] p-5 space-y-4 max-h-[80%] overflow-y-auto no-scrollbar shadow-[0_-4px_25px_rgba(217,178,106,0.12)]"
            >
              <div className="flex items-center justify-between border-b border-[#D9B26A]/20 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-4.5 h-4.5 text-[#D9B26A] animate-bounce" />
                  <span className="font-serif font-black text-xs text-[#D9B26A] uppercase tracking-wider">Messages de Grâce</span>
                </div>
                <button 
                  onClick={() => setShowNotifPanel(false)}
                  className="w-6 h-6 rounded-[8px] bg-[#050403] border border-[#D9B26A]/25 flex items-center justify-center text-[#8c8270] hover:text-[#D9B26A]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Notification list layout */}
              <div className="space-y-2.5">
                {NOTIFICATIONS_LIST.map(item => (
                  <div 
                    key={item.id} 
                    className="p-3 bg-[#050403]/95 border border-[#D9B26A]/40 hover:border-[#D9B26A]/75 rounded-[12px] space-y-1 shadow-[0_2px_8px_rgba(0,0,0,0.5),0_0_8px_rgba(217,178,106,0.08)] transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-serif font-extrabold text-[11px] text-[#e8e0d0]">{item.title}</h4>
                      <span className="text-[8px] font-mono text-[#D9B26A]/70">{item.time}</span>
                    </div>
                    <p className="text-[10px] text-[#8c8270] leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowNotifPanel(false)}
                className="w-full py-2 bg-[#D9B26A]/15 text-xs font-serif uppercase tracking-wider text-[#D9B26A] border border-[#D9B26A]/35 rounded-[12px] hover:bg-[#D9B26A]/25 transition"
              >
                Fermer le sanctuaire
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
