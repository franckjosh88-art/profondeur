import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  BookMarked, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  Play, 
  Compass, 
  ArrowLeft, 
  Bookmark, 
  AlertCircle,
  Award,
  BookOpenCheck,
  Check,
  ChevronDown,
  X,
  Share2
} from 'lucide-react';
import { Book as BibleBook, ReadingHistory } from '../types/bible';
import { ReadingPlan, PlanUserProgress } from '../types/challenges';
import { BOOKS } from '../data/bibleData';
import { ChallengeShareModal } from './ChallengeShareModal';

interface ReadingChallengesProps {
  readingHistory: ReadingHistory[];
  onNavigateToChapter: (bookId: number, chapterNum: number) => void;
}

const DEFAULT_PLANS: ReadingPlan[] = [
  {
    id: 'nt-90',
    title: 'Nouveau Testament en 90 jours',
    description: 'Une immersion complète à travers les Évangiles, les Épîtres et l\'Apocalypse.',
    durationDays: 90,
    category: 'nt',
    targetCategoryName: 'Sainte Alliance : Nouveau Testament'
  },
  {
    id: 'poetique-30',
    title: 'Sagesse & Poésie en 30 jours',
    description: 'Une méditation divine à travers les Psaumes, les Proverbes et le Cantique des Cantiques.',
    durationDays: 30,
    category: 'poetique',
    targetCategoryName: 'Livres Poétiques & Sagesse'
  },
  {
    id: 'pentateuque-60',
    title: 'Le Pentateuque en 60 jours',
    description: 'Explorez la genèse du monde, l\'exode d\'Égypte et les fondements de la Loi.',
    durationDays: 60,
    category: 'pentateuque',
    targetCategoryName: 'Le Pentateuque (Torah)'
  },
  {
    id: 'bible-365',
    title: 'La Bible Complète en 1 an',
    description: 'Le voyage ultime d\'un croyant : lire l\'intégralité des Écritures saintes.',
    durationDays: 365,
    category: 'bible',
    targetCategoryName: 'Canon Biblique Intégral'
  }
];

// Helper to check if a book belongs to a challenge
const isBookInPlan = (book: BibleBook, planCategory: ReadingPlan['category']): boolean => {
  switch (planCategory) {
    case 'nt':
      return book.testament === 'NT';
    case 'poetique':
      return book.category === 'poetique';
    case 'pentateuque':
      return book.category === 'pentateuque';
    case 'bible':
      return true;
    default:
      return false;
  }
};

// Get list of matching books for a challenge category
const getPlanBooks = (planCategory: ReadingPlan['category']): BibleBook[] => {
  return BOOKS.filter(b => isBookInPlan(b, planCategory));
};

// Calculate total chapters in a challenge category
const getPlanTotalChapters = (planCategory: ReadingPlan['category']): number => {
  const matching = getPlanBooks(planCategory);
  return matching.reduce((sum, b) => sum + b.chapters_count, 0);
};

export const ReadingChallenges: React.FC<ReadingChallengesProps> = ({
  readingHistory,
  onNavigateToChapter
}) => {
  // Navigation tabs within Challenges component
  const [activeSegment, setActiveSegment] = useState<'joined' | 'discover'>('joined');
  
  // State for joined progress
  const [userProgresses, setUserProgresses] = useState<PlanUserProgress[]>([]);
  
  // Selected challenge for detail view
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  
  // Selected book folder in chapter checklist detail view (for collapsible navigation)
  const [expandedBookId, setExpandedBookId] = useState<number | null>(null);

  // Succesful tracking Toast/notification when a chapter is auto-completed
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // State to control visual challenge share modal
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const storedProgress = localStorage.getItem('bible_reading_challenges_progress');
      if (storedProgress) {
        setUserProgresses(JSON.parse(storedProgress));
      } else {
        // Build an empty array or pre-join 'nt-90' for immediate luxury discovery!
        const initialProgress: PlanUserProgress[] = [
          {
            planId: 'nt-90',
            joinedAt: new Date().toLocaleDateString('fr-FR'),
            completedChapters: ['19:23'], // Let's pre-complete Psaume 23 if user starts? Or keep it fully dynamic.
            isCompleted: false
          }
        ];
        // For premium default, let's start with empty so they join themselves
        setUserProgresses([]);
      }
    } catch (e) {
      console.warn("Could not load reading challenges progress", e);
    }
  }, []);

  // Save to localStorage
  const saveProgress = (updated: PlanUserProgress[]) => {
    setUserProgresses(updated);
    try {
      localStorage.setItem('bible_reading_challenges_progress', JSON.stringify(updated));
    } catch (e) {
      console.warn("Storage write failed", e);
    }
  };

  // Passive automatic tracking: Watch readingHistory.
  // When readingHistory newest item loads, auto-populate active challenges if eligible!
  useEffect(() => {
    if (readingHistory.length === 0) return;
    const latestReading = readingHistory[0]; // newest
    const key = `${latestReading.book_id}:${latestReading.chapter}`;

    let progressChanged = false;
    const updatedProgress = userProgresses.map(prog => {
      // Find corresponding plan config
      const plan = DEFAULT_PLANS.find(p => p.id === prog.planId);
      if (!plan) return prog;

      const book = BOOKS.find(b => b.id === latestReading.book_id);
      if (!book) return prog;

      // Check if book matches plan category
      if (isBookInPlan(book, plan.category)) {
        // If not already completed
        if (!prog.completedChapters.includes(key)) {
          const newCompleted = [...prog.completedChapters, key];
          const totalChaptersCount = getPlanTotalChapters(plan.category);
          const isNowCompleted = newCompleted.length >= totalChaptersCount;

          progressChanged = true;
          // Notify the user elegantly
          setToastMessage(`✓ Chapitre Validé : ${latestReading.book_name} ${latestReading.chapter} ajouté à votre plan ${plan.title} !`);
          
          return {
            ...prog,
            completedChapters: newCompleted,
            isCompleted: isNowCompleted
          };
        }
      }
      return prog;
    });

    if (progressChanged) {
      saveProgress(updatedProgress);
    }
  }, [readingHistory]);

  // Clean toast message after some time
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Toggle chapter completed manually
  const toggleChapterCompletion = (planId: string, bookId: number, chapterNum: number) => {
    const key = `${bookId}:${chapterNum}`;
    const updated = userProgresses.map(prog => {
      if (prog.planId !== planId) return prog;

      const plan = DEFAULT_PLANS.find(p => p.id === planId);
      const isAlreadyCompleted = prog.completedChapters.includes(key);
      const newCompleted = isAlreadyCompleted
        ? prog.completedChapters.filter(k => k !== key)
        : [...prog.completedChapters, key];

      const totalChaptersCount = plan ? getPlanTotalChapters(plan.category) : 0;
      const isNowCompleted = newCompleted.length >= totalChaptersCount;

      return {
        ...prog,
        completedChapters: newCompleted,
        isCompleted: isNowCompleted
      };
    });

    saveProgress(updated);
  };

  // Join a plan
  const joinPlan = (planId: string) => {
    if (userProgresses.some(p => p.planId === planId)) return;

    const newProg: PlanUserProgress = {
      planId,
      joinedAt: new Date().toLocaleDateString('fr-FR'),
      completedChapters: [],
      isCompleted: false
    };

    const updated = [...userProgresses, newProg];
    saveProgress(updated);
    setActiveSegment('joined');
    setSelectedPlanId(planId);
  };

  // Quit/Delete progress of a plan
  const quitPlan = (planId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir abandonner ce défi ? Vos progrès seront réinitialisés pour ce plan.")) {
      const updated = userProgresses.filter(p => p.planId !== planId);
      saveProgress(updated);
      setSelectedPlanId(null);
    }
  };

  // Find the next unread chapter for a plan to quickly continue reading
  const getNextUnreadChapter = (planId: string, planCategory: ReadingPlan['category']) => {
    const progress = userProgresses.find(p => p.planId === planId);
    if (!progress) return null;

    const planBooks = getPlanBooks(planCategory);
    for (const book of planBooks) {
      for (let ch = 1; ch <= book.chapters_count; ch++) {
        const key = `${book.id}:${ch}`;
        if (!progress.completedChapters.includes(key)) {
          return { book, chapterNum: ch };
        }
      }
    }
    // All read!
    return null;
  };

  return (
    <div className="w-full text-left space-y-4 select-none relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 w-80 bg-[#1a1712] border-2 border-[#c9a84c] text-[#e8e0d0] text-xs rounded-xl p-3 shadow-2xl flex items-start gap-2.5 z-50 animate-fade-slide-up">
          <BookOpenCheck className="w-4 h-4 text-[#c9a84c] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-[#c9a84c] font-serif">Plan de lecture mis à jour</p>
            <p className="text-[10px] text-[#6b6355] mt-1 line-clamp-2">{toastMessage}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-[#6b6355] hover:text-[#e8e0d0]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* RENDER PLAN DETAIL VIEW IF ONE IS SELECTED */}
      {selectedPlanId ? (() => {
        const plan = DEFAULT_PLANS.find(p => p.id === selectedPlanId);
        const progress = userProgresses.find(p => p.planId === selectedPlanId);
        if (!plan || !progress) return null;

        const totalChapters = getPlanTotalChapters(plan.category);
        const completedCount = progress.completedChapters.length;
        const progressPercent = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;
        const nextToRead = getNextUnreadChapter(plan.id, plan.category);
        const planBooks = getPlanBooks(plan.category);

        return (
          <div className="bg-[#12100c] rounded-2xl border border-[#2e2a1e] p-4 space-y-4 animate-fade-slide-up">
            {/* Header control */}
            <div className="flex items-center justify-between border-b border-[#2e2a1e] pb-3">
              <button 
                onClick={() => setSelectedPlanId(null)}
                className="flex items-center gap-1.5 text-xs text-[#c9a84c] hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retour aux défis</span>
              </button>
              <button 
                onClick={() => quitPlan(plan.id)}
                className="text-[9px] text-rose-400 font-mono tracking-wider hover:underline"
              >
                ABANDONNER
              </button>
            </div>

            {/* Title & Badge */}
            <div>
              <div className="inline-block bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 rounded px-2 py-0.5 text-[8px] font-mono font-bold tracking-widest uppercase mb-1.5">
                {plan.targetCategoryName || "PLAN ACTIF"}
              </div>
              <h3 className="font-serif font-extrabold text-sm text-[#e8e0d0] tracking-tight">{plan.title}</h3>
              <p className="text-[10px] text-[#6b6355] leading-relaxed mt-1">{plan.description}</p>
            </div>

            {/* Progress status card with luxury bars */}
            <div className="bg-[#1a1712] p-3 rounded-xl border border-[#2e2a1e] space-y-2.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-[#6b6355]">PROGRÈS GLOBAL</span>
                <span className="text-[#c9a84c] font-bold">{progressPercent}% ({completedCount}/{totalChapters} chap.)</span>
              </div>
              
              {/* Luxury progress bar */}
              <div className="w-full h-2 bg-[#0d0b07] rounded-full overflow-hidden border border-[#2e2a1e]">
                <div 
                  className="h-full bg-gradient-to-r from-[#a08232] to-[#c9a84c] rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(201,168,76,0.5)]"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              <div className="flex items-center gap-1.5 pt-1 text-[9px] font-mono text-[#6b6355]">
                <Calendar className="w-3 h-3 text-[#c9a84c]" />
                <span>Rejoint le {progress.joinedAt} · Objectif {plan.durationDays} Jours</span>
              </div>
            </div>

            {/* "Continuer la lecture" direct action and visual sharing card generation buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              {nextToRead ? (
                <button
                  onClick={() => onNavigateToChapter(nextToRead.book.id, nextToRead.chapterNum)}
                  className="flex-1 py-2.5 bg-[#c9a84c] text-[#0d0b07] font-bold text-xs rounded-xl hover:bg-[#dfba5a] active:scale-[0.98] transition duration-150 inline-flex items-center justify-center gap-2 cursor-pointer outline-none shadow-gold-glow"
                >
                  <Play className="w-3.5 h-3.5 fill-[#0d0b07]" />
                  <span>LIRE CHAP. SUIVANT : {nextToRead.book.name} {nextToRead.chapterNum}</span>
                </button>
              ) : (
                <div className="flex-1 bg-[#c9a84c]/10 rounded-xl p-3 border border-[#c9a84c]/20 flex items-center gap-3">
                  <Award className="w-8 h-8 text-[#c9a84c] shrink-0" />
                  <div>
                    <h4 className="font-serif font-extrabold text-[#c9a84c] text-xs">Félicitations pour votre fidélité !</h4>
                    <p className="text-[9px] text-[#6b6355] mt-0.5">Vous avez lu l'ensemble des {totalChapters} chapitres de ce plan.</p>
                  </div>
                </div>
              )}

              {/* Beautiful custom vector card generator */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="py-2.5 px-4 bg-[#1a1712] hover:bg-[#c9a84c]/15 text-[#c9a84c] hover:text-[#e8e0d0] border border-[#c9a84c]/20 hover:border-[#c9a84c] text-xs font-bold rounded-xl active:scale-[0.98] transition duration-150 inline-flex items-center justify-center gap-2 cursor-pointer outline-none"
                title="Générer une magnifique image souvenir de ce défi"
              >
                <Share2 className="w-3.5 h-3.5 text-[#c9a84c]" />
                <span>Partager ma Réussite 🎨</span>
              </button>
            </div>

            {/* Collapsible Books & Chapters Grid */}
            <div className="space-y-2">
              <span className="block text-[9px] font-mono tracking-[0.15em] text-[#6b6355] uppercase font-bold border-b border-[#2e2a1e] pb-1.5">
                INDEX DES CHAPITRES DU PLAN
              </span>

              <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                {planBooks.map(b => {
                  const isExpanded = expandedBookId === b.id;
                  
                  // Calculate book-specific chapters completed count
                  const bookChapters = Array.from({ length: b.chapters_count }, (_, i) => i + 1);
                  const bookCompletedKeys = bookChapters.filter(ch => 
                    progress.completedChapters.includes(`${b.id}:${ch}`)
                  );
                  const allCompletedInBook = bookCompletedKeys.length === b.chapters_count;

                  return (
                    <div key={b.id} className="bg-[#161410] rounded-lg border border-[#2e2a1e]/65 overflow-hidden">
                      {/* Accordion Header */}
                      <button
                        onClick={() => setExpandedBookId(isExpanded ? null : b.id)}
                        className="w-full p-2.5 flex items-center justify-between text-left hover:bg-[#1a1712] transition duration-200 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {allCompletedInBook ? (
                            <CheckCircle2 className="w-4 h-4 text-[#c9a84c] shrink-0" />
                          ) : (
                            <BookMarked className="w-4 h-4 text-[#6b6355] shrink-0" />
                          )}
                          <span className="font-serif text-xs font-bold text-[#e8e0d0]">{b.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-mono text-[#6b6355]">
                            {bookCompletedKeys.length}/{b.chapters_count}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-[#6b6355] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {/* Chapters Grid Panel (shown when expanded) */}
                      {isExpanded && (
                        <div className="p-3 bg-[#0d0b07] border-t border-[#2e2a1e]/40">
                          <div className="grid grid-cols-5 gap-1.5">
                            {bookChapters.map(ch => {
                              const isChCompleted = progress.completedChapters.includes(`${b.id}:${ch}`);
                              return (
                                <button
                                  key={ch}
                                  onClick={() => toggleChapterCompletion(plan.id, b.id, ch)}
                                  className="aspect-square rounded-md p-1 border flex flex-col items-center justify-center transition duration-150 cursor-pointer text-center relative group"
                                  style={{
                                    backgroundColor: isChCompleted ? 'rgba(201,168,76,0.1)' : '#161410',
                                    borderColor: isChCompleted ? '#c9a84c' : '#2e2a1e',
                                  }}
                                >
                                  {/* Chapter index label */}
                                  <span 
                                    className="font-mono text-[10px] font-bold"
                                    style={{ color: isChCompleted ? '#c9a84c' : '#6b6355' }}
                                  >
                                    {ch}
                                  </span>

                                  {/* Small helper indicating checkmark or click to read */}
                                  <div className="absolute top-0 right-0 p-0.5">
                                    {isChCompleted ? (
                                      <div className="w-1.5 h-1.5 bg-[#c9a84c] rounded-full"></div>
                                    ) : null}
                                  </div>
                                  
                                  {/* Tap to read option */}
                                  <span 
                                    onClick={(e) => {
                                      e.stopPropagation(); // Avoid checking
                                      onNavigateToChapter(b.id, ch);
                                    }}
                                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-[#c9a84c] text-[#0d0b07] text-[8px] font-mono tracking-tighter uppercase font-extrabold rounded-md shadow transition-opacity"
                                  >
                                    Lire
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        );
      })() : (
        /* STANDARD SEGMENTED NAVIGATION SCREEN (Mes Défis / Découvrir) */
        <div className="space-y-4">
          
          {/* Custom Luxury Tab Headers */}
          <div className="flex border-b border-[#2e2a1e] pb-0.5">
            <button
              onClick={() => setActiveSegment('joined')}
              className="flex-1 pb-2 font-serif text-xs font-bold transition-all relative text-center cursor-pointer uppercase tracking-wider"
              style={{ color: activeSegment === 'joined' ? '#c9a84c' : '#6b6355' }}
            >
              <span>Mes Défis ({userProgresses.length})</span>
              {activeSegment === 'joined' && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-[#c9a84c] rounded-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveSegment('discover')}
              className="flex-1 pb-2 font-serif text-xs font-bold transition-all relative text-center cursor-pointer uppercase tracking-wider"
              style={{ color: activeSegment === 'discover' ? '#c9a84c' : '#6b6355' }}
            >
              <span>Bibliothèque ({DEFAULT_PLANS.length - userProgresses.length})</span>
              {activeSegment === 'discover' && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-[#c9a84c] rounded-full"></div>
              )}
            </button>
          </div>

          {/* MES DÉFIS INTERACTIVE CARDS */}
          {activeSegment === 'joined' && (
            <div className="space-y-3.5">
              {userProgresses.length === 0 ? (
                <div className="py-8 px-4 text-center border-2 border-dashed border-[#2e2a1e] rounded-2xl bg-[#12100c]/40 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#161410] border border-[#2e2a1e] flex items-center justify-center text-[#6b6355] mx-auto">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-serif font-bold text-xs text-[#e8e0d0]">Aucun chemin tracé</p>
                    <p className="text-[10px] text-[#6b6355] leading-relaxed max-w-[240px] mx-auto">
                      Engagez-vous dans un plan d'étude régulier pour fortifier votre esprit et suivre votre avancement.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveSegment('discover')}
                    className="px-3.5 py-1.5 bg-[#c9a84c]/10 hover:bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/30 rounded-lg text-[10px] font-bold uppercase transition"
                  >
                    Découvrir les Plans
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {userProgresses.map(prog => {
                    const plan = DEFAULT_PLANS.find(p => p.id === prog.planId);
                    if (!plan) return null;

                    const totalChapters = getPlanTotalChapters(plan.category);
                    const completedCount = prog.completedChapters.length;
                    const progressPercent = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;
                    const nextToRead = getNextUnreadChapter(plan.id, plan.category);

                    return (
                      <div 
                        key={prog.planId}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className="bg-[#12100c] border border-[#2e2a1e] hover:border-[#c9a84c]/40 p-3.5 rounded-xl transition duration-300 cursor-pointer flex flex-col justify-between gap-3 group relative select-none"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[8px] font-mono tracking-widest text-[#c9a84c] uppercase font-bold bg-[#c9a84c]/10 border border-[#c9a84c]/20 px-1.5 py-0.5 rounded mr-1">
                              {plan.durationDays} Jours
                            </span>
                            <h4 className="font-serif font-extrabold text-xs text-[#e8e0d0] mt-1.5 group-hover:text-[#c9a84c] transition-colors line-clamp-1">{plan.title}</h4>
                            <p className="text-[9px] text-[#6b6355] line-clamp-1 mt-0.5">{plan.description}</p>
                          </div>
                          
                          <ChevronRight className="w-4 h-4 text-[#6b6355] group-hover:text-[#c9a84c] transition-colors shrink-0 mt-1" />
                        </div>

                        {/* Progress slider layout */}
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-[#6b6355] uppercase">Progression</span>
                            <span className="text-[#c9a84c] font-bold">{progressPercent}% ({completedCount}/{totalChapters} ch.)</span>
                          </div>
                          
                          <div className="w-full h-1.5 bg-[#0d0b07] rounded-full overflow-hidden border border-[#2e2a1e]/70">
                            <div 
                              className="h-full bg-[#c9a84c] rounded-full"
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Direct action info bar */}
                        {nextToRead && (
                          <div className="flex justify-between items-center pt-2 border-t border-[#2e2a1e]/40 text-[9px]">
                            <span className="text-[#6b6355] italic">Prochaine étape : {nextToRead.book.name} {nextToRead.chapterNum}</span>
                            <span className="text-[#c9a84c] font-bold flex items-center gap-1 hover:underline">
                              <span>Sujet</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        )}
                        
                        {prog.isCompleted && (
                          <div className="absolute top-2 right-2 bg-gradient-to-r from-[#a08232] to-[#c9a84c] p-1 rounded-full shadow-lg">
                            <Award className="w-3 h-3 text-[#0d0b07]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* DÉCOUVRIR DISCOVERY PLANS LIBRARY */}
          {activeSegment === 'discover' && (() => {
            const unjoinedPlans = DEFAULT_PLANS.filter(p => !userProgresses.some(u => u.planId === p.id));
            
            return (
              <div className="space-y-3.5">
                {unjoinedPlans.length === 0 ? (
                  <div className="py-8 px-4 text-center border border-[#2e2a1e] rounded-2xl bg-[#12100c]/40">
                    <Award className="w-7 h-7 text-[#c9a84c] mx-auto mb-2" />
                    <p className="font-serif font-bold text-xs text-[#e8e0d0]">Tous les défis sont honorés !</p>
                    <p className="text-[10px] text-[#6b6355] mt-1 max-w-[200px] mx-auto">Vous avez rejoint l'intégralité des plans sacrés disponibles. Méditez fidèlement.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {unjoinedPlans.map(plan => {
                      const totalChapters = getPlanTotalChapters(plan.category);
                      
                      return (
                        <div 
                          key={plan.id}
                          className="bg-[#12100c] border border-[#2e2a1e] p-3.5 rounded-xl space-y-3 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[8px] font-mono tracking-widest text-[#6b6355] uppercase font-bold border border-[#2e2a1e] px-1.5 py-0.5 rounded">
                                {plan.durationDays} jours · {totalChapters} Chapitres
                              </span>
                              <span className="text-[8px] font-bold text-[#c9a84c] uppercase">{plan.id === 'nt-90' ? 'Populaire' : ''}</span>
                            </div>
                            <h4 className="font-serif font-extrabold text-xs text-[#e8e0d0] mt-2 tracking-tight">{plan.title}</h4>
                            <p className="text-[10px] text-[#6b6355] mt-1 leading-relaxed">{plan.description}</p>
                          </div>

                          <button
                            onClick={() => joinPlan(plan.id)}
                            className="w-full py-1.5 bg-[#c9a84c]/10 text-[#c9a84c] hover:bg-[#c9a84c] hover:text-[#0d0b07] border border-[#c9a84c]/20 hover:border-[#c9a84c] text-[10px] uppercase font-bold rounded-lg tracking-wider transition duration-200 cursor-pointer"
                          >
                            Rejoindre ce défi
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          </div>
        )}

      {/* SUCCESS CARD GENERATOR MODAL */}
      {isShareModalOpen && selectedPlanId && (() => {
        const plan = DEFAULT_PLANS.find(p => p.id === selectedPlanId);
        const progress = userProgresses.find(p => p.planId === selectedPlanId);
        if (!plan || !progress) return null;

        const totalChapters = getPlanTotalChapters(plan.category);
        const completedCount = progress.completedChapters.length;

        return (
          <ChallengeShareModal
            plan={plan}
            completedChaptersCount={completedCount}
            totalChaptersCount={totalChapters}
            onClose={() => setIsShareModalOpen(false)}
          />
        );
      })()}

    </div>
  );
};
