import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, Bell, ChevronLeft, ChevronRight, Home, FolderClosed, 
  Sparkles, X, Heart, HelpCircle, Settings, Quote, BookOpen
} from 'lucide-react';

interface ContemplativeHomeProps {
  onNavigateToTab: (tab: 'home' | 'read' | 'challenges' | 'dictionary' | 'assistant' | 'encyclopedia' | 'memorize' | 'notes') => void;
  onOpenSettings?: () => void;
  notesCount?: number;
  goalPercent?: number;
}

interface ContemplativeVerse {
  quote: string;
  reference: string;
  theme: string;
}

const CONTEMPLATIVE_VERSES: ContemplativeVerse[] = [
  {
    quote: "Je t'aime, ô Éternel, ma force ! L'Éternel est mon roc, ma forteresse, mon libérateur ! Mon Dieu, mon rocher, où je trouve un abri !",
    reference: "Psaumes 18:2-3",
    theme: "Force & Abri"
  },
  {
    quote: "L'Éternel est mon berger: je ne manquerai de rien. Il me fait reposer dans de ruds pâturages, Il me dirige près des eaux paisibles.",
    reference: "Psaumes 23:1-2",
    theme: "Paix & Providence"
  },
  {
    quote: "Au commencement était la Parole, et la Parole était avec Dieu, et la Parole était Dieu. En elle était la vie, et la vie était la lumière des hommes.",
    reference: "Jean 1:1,4",
    theme: "La Parole Éternelle"
  },
  {
    quote: "Le sentier des justes est comme la lumière resplendissante, dont l'éclat va croissant jusqu'au milieu du jour.",
    reference: "Proverbes 4:18",
    theme: "Clarté de l'Âme"
  },
  {
    quote: "Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux.",
    reference: "Matthieu 18:20",
    theme: "Présence Divine"
  },
  {
    quote: "L'Éternel est ma lumière et mon salut: De qui aurais-je crainte ? L'Éternel est le soutien de ma vie: De qui aurais-je peur ?",
    reference: "Psaumes 27:1",
    theme: "Confiance & Courage"
  },
  {
    quote: "Quand je marche dans la vallée de l'ombre de la mort, Je ne crains aucun mal, car tu es avec moi: Ta houlette et ton bâton me rassurent.",
    reference: "Psaumes 23:4",
    theme: "Consolation Spirituelle"
  }
];

export const ContemplativeHome: React.FC<ContemplativeHomeProps> = ({
  onNavigateToTab,
  onOpenSettings,
  notesCount = 0,
  goalPercent = 0
}) => {
  const [currentIdx, setCurrentIdx] = useState<number>(4); // Default to "Verset 5/7" as requested
  const [direction, setDirection] = useState<number>(0); // -1 for left, 1 for right
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [showNotifPanel, setShowNotifPanel] = useState<boolean>(false);
  const [likedVerses, setLikedVerses] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'contemplation' | 'dashboard'>('contemplation');

  const activeVerse = CONTEMPLATIVE_VERSES[currentIdx];

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
    <div className="w-full relative min-h-[640px] bg-[#050403] rounded-3xl border border-[#221e16] overflow-hidden flex flex-col justify-between font-sans shadow-soft select-none text-left">
      
      {/* GLOW BACKGROUND EFFECT / SPARKLES AND STARS */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        {/* Subtle brown gold radial grid glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#120f0a] via-[#050403] to-[#120f0a] opacity-80" />
        
        {/* Animated Twinkling Constellation Stars */}
        <div className="absolute top-[12%] left-[15%] w-1 h-1 bg-[#c9a84c] rounded-full animate-pulse opacity-70" />
        <div className="absolute top-[28%] left-[78%] w-1.5 h-1.5 bg-[#e8c97a] rounded-full animate-pulse opacity-60 duration-1000" />
        <div className="absolute top-[45%] left-[25%] w-1 h-1 bg-white rounded-full animate-ping opacity-30 duration-3000" />
        <div className="absolute top-[65%] left-[10%] w-1.5 h-1.5 bg-[#c9a84c] rounded-full animate-pulse opacity-80 duration-700" />
        <div className="absolute top-[75%] left-[85%] w-1 h-1 bg-white rounded-full animate-pulse opacity-50 duration-1500" />
        <div className="absolute top-[50%] left-[80%] w-1 h-1 bg-[#c9a84c] rounded-full animate-pulse opacity-90 duration-500" />
        <div className="absolute top-[88%] left-[30%] w-1 h-1 bg-[#c9a84c] rounded-full animate-pulse opacity-40 duration-2000" />
        <div className="absolute top-[18%] left-[45%] w-1.5 h-1.5 bg-[#e8c97a] rounded-full animate-pulse opacity-70 duration-2000" />
        <div className="absolute top-[33%] left-[12%] w-1 h-1 bg-[#c9a84c] rounded-full animate-pulse opacity-55 duration-800" />
      </div>

      {/* HEADER SECTION */}
      <header className="relative z-10 w-full px-4 h-14 flex items-center justify-between border-b border-[#2e2a1e]/25 bg-[#050403]/70 backdrop-blur-sm">
        {/* Menu Hamburger gauche */}
        <button 
          onClick={() => setShowDrawer(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#6b6355] hover:text-[#c9a84c] active:bg-[#12100c]/40 transition cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Titre centre or élégant */}
        <div className="text-center">
          <h1 className="font-serif font-black text-xs uppercase tracking-[0.22em] text-[#c9a84c] filter drop-shadow-[0_2px_4px_rgba(201,168,76,0.2)]">
            Bible Profonde
          </h1>
          <span className="text-[7.5px] font-mono uppercase text-[#6b6355] tracking-widest font-extrabold block">
            {viewMode === 'contemplation' ? 'Mode Sacré' : 'Tableau de Bord'}
          </span>
        </div>

        {/* Bouton de bascule de mode de vue à droite */}
        <button 
          onClick={() => setViewMode(prev => prev === 'contemplation' ? 'dashboard' : 'contemplation')}
          className="px-2.5 py-1 rounded-full border border-[#2e2a1e] hover:border-[#c9a84c]/50 text-[#6b6355] hover:text-[#c9a84c] active:bg-[#12100c]/40 transition cursor-pointer text-[9px] font-mono uppercase tracking-widest"
          title={viewMode === 'contemplation' ? "Voir Tableau de Bord" : "Voir Mode Contemplatif"}
        >
          {viewMode === 'contemplation' ? 'Tableau' : 'Sacré'}
        </button>
      </header>

      {/* NAVIGATION INDICATOR BAR */}
      <section className="relative z-10 w-full px-5 py-2.5 flex items-center justify-between border-b border-[#2e2a1e]/15 bg-[#050403]/30">
        <button 
          onClick={handlePrev}
          className="w-8 h-8 rounded-full border border-[#2e2a1e]/50 hover:border-[#c9a84c]/40 flex items-center justify-center text-[#6b6355] hover:text-[#c9a84c] active:scale-95 transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Indicateur Verset X/Y */}
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-mono font-extrabold text-[#c9a84c] uppercase tracking-widest">
            Verset {currentIdx + 1} / {CONTEMPLATIVE_VERSES.length}
          </span>
          <span className="text-[7.5px] font-mono text-[#6b6355] uppercase tracking-wide">
            {activeVerse.theme}
          </span>
        </div>

        <button 
          onClick={handleNext}
          className="w-8 h-8 rounded-full border border-[#2e2a1e]/50 hover:border-[#c9a84c]/40 flex items-center justify-center text-[#6b6355] hover:text-[#c9a84c] active:scale-95 transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </section>

      {/* MAIN VIEW CONTENT */}
      {viewMode === 'contemplation' ? (
        <main className="relative z-10 flex-1 flex flex-col justify-center items-center px-6 py-8 text-center select-text">
          <div className="w-full max-w-sm flex flex-col items-center space-y-6">
            
            {/* Grand guillemet d'or stylisé au-dessus */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.25 }}
              transition={{ duration: 0.6 }}
              className="text-[#c9a84c] font-serif"
            >
              <Quote className="w-10 h-10 transform scale-y-[-1] flip-x -rotate-12 select-none" />
            </motion.div>

            {/* Verset biblique en police calligraphique style manuscrit élégant */}
            <div className="min-h-[140px] flex items-center justify-center w-full px-2">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentIdx}
                  initial={{ opacity: 0, filter: 'blur(5px)', y: direction * 10 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                  exit={{ opacity: 0, filter: 'blur(5px)', y: -direction * 10 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  className="font-['Alex_Brush'] text-[25px] sm:text-[27px] leading-[1.4] text-[#f4efe2] italic select-text filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                  style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                >
                  « {activeVerse.quote} »
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Grand guillemet d'or stylisé en dessous */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.25 }}
              transition={{ duration: 0.6 }}
              className="text-[#c9a84c] font-serif select-none"
            >
              <Quote className="w-10 h-10 rotate-12" />
            </motion.div>

            {/* Référence biblique or, plus petite */}
            <div className="pt-2 text-center select-none">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIdx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-1"
                >
                  <p className="font-serif font-black text-[11px] uppercase tracking-[0.24em] text-[#c9a84c]">
                    {activeVerse.reference}
                  </p>
                  <div className="flex justify-center items-center gap-3 pt-4">
                    <button 
                      onClick={() => toggleLike(currentIdx)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer border ${
                        likedVerses.includes(currentIdx)
                          ? 'bg-[#c9a84c]/20 border-[#c9a84c] text-[#c9a84c]'
                          : 'border-[#2e2a1e]/60 text-[#6b6355] hover:text-[#e8e0d0]'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${likedVerses.includes(currentIdx) ? 'fill-current' : ''}`} />
                    </button>
                    <button 
                      onClick={() => onNavigateToTab('read')}
                      className="text-[8px] font-mono tracking-widest uppercase border border-[#2e2a1e]/60 text-[#6b6355] hover:text-[#e8e0d0] hover:border-[#c9a84c]/30 px-3 py-1 rounded-full transition cursor-pointer"
                    >
                      Étudier ce livre
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

          </div>
        </main>
      ) : (
        /* SECONDARY RETRO/BRONZE GRID DASHBOARD (PRESERVING FUNCTIONAL OUTCOMES) */
        <main className="relative z-10 flex-1 p-5 md:p-6 space-y-5 md:space-y-6 overflow-y-auto no-scrollbar animate-fade-slide-up">
          <div className="bg-[#12100c]/90 border border-[#c9a84c]/15 p-5 md:p-6 rounded-xl flex flex-col space-y-2.5">
            <span className="text-[8px] font-mono tracking-[0.15em] text-[#6b6355] uppercase font-bold">Verset en lumière</span>
            <p className="font-serif italic text-xs leading-relaxed text-[#c9a84c]">
              « {activeVerse.quote} »
            </p>
            <span className="font-mono text-[8px] text-[#6b6355] tracking-widest uppercase font-black">{activeVerse.reference}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <button
              onClick={() => onNavigateToTab('read')}
              className="bg-[#12100c] hover:bg-[#15130f] border border-[#2e2a1e]/80 hover:border-[#c9a84c]/30 rounded-xl p-4 flex flex-col justify-between items-start text-left h-[80px] transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#c9a84c]" />
              <span className="text-[9px] font-mono uppercase tracking-wider text-[#6b6355]">Lecture</span>
            </button>
            <button
              onClick={() => onNavigateToTab('assistant')}
              className="bg-[#12100c] hover:bg-[#15130f] border border-[#2e2a1e]/80 hover:border-[#c9a84c]/30 rounded-xl p-4 flex flex-col justify-between items-start text-left h-[80px] transition cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-[#c9a84c]" />
              <span className="text-[9px] font-mono uppercase tracking-wider text-[#6b6355]">Assistant</span>
            </button>
          </div>

          {/* OBJECTIF LECTURE */}
          <div className="bg-[#12100c]/80 border border-[#2e2a1e]/80 rounded-xl p-4 sm:p-5 flex items-center justify-between">
            <div>
              <span className="text-[8px] font-mono text-[#6b6355] uppercase tracking-wider">Objectif quotidien</span>
              <span className="text-xs font-serif font-black text-[#e8e0d0] block">Complété à {goalPercent}%</span>
            </div>
            <div className="text-[10px] font-mono font-bold text-[#c9a84c] bg-[#c9a84c]/10 border border-[#c9a84c]/20 px-2.5 py-1 rounded-md">
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
              className="absolute top-0 bottom-0 left-0 w-[240px] bg-[#0d0b07] border-r border-[#2e2a1e] p-5 flex flex-col justify-between"
            >
              <div className="space-y-6">
                {/* Drawer header */}
                <div className="flex items-center justify-between border-b border-[#2e2a1e]/50 pb-3">
                  <div className="flex flex-col">
                    <span className="font-serif font-black text-[11px] text-[#c9a84c] uppercase tracking-widest">Bible Profonde</span>
                    <span className="text-[8px] font-mono text-[#6b6355] uppercase font-bold tracking-wider">Menu Sacré</span>
                  </div>
                  <button 
                    onClick={() => setShowDrawer(false)}
                    className="p-1 rounded-full text-[#6b6355] hover:text-[#e8e0d0]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Navigation items */}
                <div className="space-y-1 font-serif text-[12px]">
                  <button 
                    onClick={() => { onNavigateToTab('home'); setViewMode('contemplation'); setShowDrawer(false); }}
                    className="w-full text-left p-2.5 rounded-lg text-[#e8e0d0] hover:bg-[#12100c] flex items-center gap-2.5 transition"
                  >
                    <Home className="w-4 h-4 text-[#c9a84c]" />
                    <span>Mode Comtemplatif</span>
                  </button>
                  <button 
                    onClick={() => { onNavigateToTab('read'); setShowDrawer(false); }}
                    className="w-full text-left p-2.5 rounded-lg text-[#807664] hover:text-[#e8e0d0] hover:bg-[#12100c] flex items-center gap-2.5 transition"
                  >
                    <BookOpen className="w-4 h-4 text-[#807664]" />
                    <span>Texte Sacré (Louis Segond)</span>
                  </button>
                  <button 
                    onClick={() => { onNavigateToTab('notes'); setShowDrawer(false); }}
                    className="w-full text-left p-2.5 rounded-lg text-[#807664] hover:text-[#e8e0d0] hover:bg-[#12100c] flex items-center gap-2.5 transition"
                  >
                    <FolderClosed className="w-4 h-4 text-[#807664]" />
                    <span>Journal d'Harmonie ({notesCount})</span>
                  </button>
                  <button 
                    onClick={() => { onNavigateToTab('challenges'); setShowDrawer(false); }}
                    className="w-full text-left p-2.5 rounded-lg text-[#807664] hover:text-[#e8e0d0] hover:bg-[#12100c] flex items-center gap-2.5 transition"
                  >
                    <Sparkles className="w-4 h-4 text-[#807664]" />
                    <span>Programmes de Lecture</span>
                  </button>
                  <button 
                    onClick={() => { onNavigateToTab('assistant'); setShowDrawer(false); }}
                    className="w-full text-left p-2.5 rounded-lg text-[#807664] hover:text-[#e8e0d0] hover:bg-[#12100c] flex items-center gap-2.5 transition"
                  >
                    <HelpCircle className="w-4 h-4 text-[#807664]" />
                    <span>Assistant Spirituel (Conseil)</span>
                  </button>
                  <button 
                    onClick={() => { onNavigateToTab('memorize'); setShowDrawer(false); }}
                    className="w-full text-left p-2.5 rounded-lg text-[#807664] hover:text-[#e8e0d0] hover:bg-[#12100c] flex items-center gap-2.5 transition"
                  >
                    <Quote className="w-4 h-4 text-[#807664]" />
                    <span>Exercices de Récitation</span>
                  </button>
                </div>
              </div>

              {/* Settings Action Button */}
              <div className="pt-4 border-t border-[#2e2a1e]/40">
                <button
                  onClick={() => {
                    setShowDrawer(false);
                    if (onOpenSettings) onOpenSettings();
                  }}
                  className="w-full py-2 bg-[#12100c] border border-[#2e2a1e] text-[10px] font-mono uppercase tracking-widest text-[#6b6355] hover:text-[#c9a84c] rounded-lg transition"
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
              className="relative bg-[#0d0b07] border-t border-[#c9a84c]/20 rounded-t-2xl p-5 space-y-4 max-h-[80%] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-[#2e2a1e] pb-2.5">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-4.5 h-4.5 text-[#c9a84c] animate-bounce" />
                  <span className="font-serif font-black text-xs text-[#c9a84c] uppercase tracking-wider">Messages de Grâce</span>
                </div>
                <button 
                  onClick={() => setShowNotifPanel(false)}
                  className="w-6 h-6 rounded-full bg-[#12100c] flex items-center justify-center text-[#6b6355] hover:text-[#e8e0d0]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Notification list layout */}
              <div className="space-y-2.5">
                {NOTIFICATIONS_LIST.map(item => (
                  <div 
                    key={item.id} 
                    className="p-3 bg-[#12100c] border border-[#2e2a1e]/60 rounded-xl space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-serif font-extrabold text-[11px] text-[#e8e0d0]">{item.title}</h4>
                      <span className="text-[8px] font-mono text-[#6b6355]">{item.time}</span>
                    </div>
                    <p className="text-[10px] text-[#6b6355] leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowNotifPanel(false)}
                className="w-full py-2 bg-[#c9a84c]/10 text-xs font-mono uppercase text-[#c9a84c] border border-[#c9a84c]/20 rounded-xl hover:bg-[#c9a84c]/20"
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
