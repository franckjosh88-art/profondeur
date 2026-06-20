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
  Share2,
  Sparkles
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
const isBookInPlan = (book: BibleBook, planCategory: ReadingPlan['category'], planBookIds?: number[]): boolean => {
  if (planCategory === 'custom') {
    return planBookIds ? planBookIds.includes(book.id) : false;
  }
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
const getPlanBooks = (planCategory: ReadingPlan['category'], planBookIds?: number[]): BibleBook[] => {
  return BOOKS.filter(b => isBookInPlan(b, planCategory, planBookIds));
};

// Calculate total chapters in a challenge category
const getPlanTotalChapters = (planCategory: ReadingPlan['category'], planBookIds?: number[]): number => {
  const matching = getPlanBooks(planCategory, planBookIds);
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

  // State for user custom plans
  const [customPlans, setCustomPlans] = useState<ReadingPlan[]>([]);
  
  // Selected challenge for detail view
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  
  // Selected book folder in chapter checklist detail view (for collapsible navigation)
  const [expandedBookId, setExpandedBookId] = useState<number | null>(null);

  // Succesful tracking Toast/notification when a chapter is auto-completed
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // State to control visual challenge share modal
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Form states for creating custom reading plan
  const [isCreatingCustom, setIsCreatingCustom] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [customWeeks, setCustomWeeks] = useState<number>(4);
  const [selectedCustomBookIds, setSelectedCustomBookIds] = useState<number[]>([]);

  // Computed all plans list
  const ALL_PLANS = [...DEFAULT_PLANS, ...customPlans];

  // Load from localStorage
  useEffect(() => {
    try {
      const storedProgress = localStorage.getItem('bible_reading_challenges_progress');
      if (storedProgress) {
        setUserProgresses(JSON.parse(storedProgress));
      } else {
        setUserProgresses([]);
      }

      const storedCustomPlans = localStorage.getItem('bible_custom_reading_plans');
      if (storedCustomPlans) {
        setCustomPlans(JSON.parse(storedCustomPlans));
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

  // Save custom plans
  const saveCustomPlans = (updatedPlans: ReadingPlan[]) => {
    setCustomPlans(updatedPlans);
    try {
      localStorage.setItem('bible_custom_reading_plans', JSON.stringify(updatedPlans));
    } catch (e) {
      console.warn("Storage write failed for custom plans", e);
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
      const plan = ALL_PLANS.find(p => p.id === prog.planId);
      if (!plan) return prog;

      const book = BOOKS.find(b => b.id === latestReading.book_id);
      if (!book) return prog;

      // Check if book matches plan category
      if (isBookInPlan(book, plan.category, plan.bookIds)) {
        // If not already completed
        if (!prog.completedChapters.includes(key)) {
          const newCompleted = [...prog.completedChapters, key];
          const totalChaptersCount = getPlanTotalChapters(plan.category, plan.bookIds);
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
  }, [readingHistory, userProgresses, customPlans]);

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

      const plan = ALL_PLANS.find(p => p.id === planId);
      const isAlreadyCompleted = prog.completedChapters.includes(key);
      const newCompleted = isAlreadyCompleted
        ? prog.completedChapters.filter(k => k !== key)
        : [...prog.completedChapters, key];

      const totalChaptersCount = plan ? getPlanTotalChapters(plan.category, plan.bookIds) : 0;
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
    const isCustom = customPlans.some(p => p.id === planId);
    if (isCustom) {
      const option = window.confirm("Souhaitez-vous abandonner ce plan personnalisé ? Si vous choisissez OK, ses progrès seront réinitialisés. Voulez-vous également supprimer ce plan de votre bibliothèque ?");
      if (option) {
        const deletePlan = window.confirm("Supprimer définitivement ce plan de votre bibliothèque ?");
        if (deletePlan) {
          const updatedCustom = customPlans.filter(p => p.id !== planId);
          saveCustomPlans(updatedCustom);
        }
      }
    } else {
      if (!window.confirm("Êtes-vous sûr de vouloir abandonner ce défi ? Vos progrès seront réinitialisés pour ce plan.")) {
        return;
      }
    }
    const updated = userProgresses.filter(p => p.planId !== planId);
    saveProgress(updated);
    setSelectedPlanId(null);
  };

  // Find the next unread chapter for a plan to quickly continue reading
  const getNextUnreadChapter = (planId: string, planCategory: ReadingPlan['category'], planBookIds?: number[]) => {
    const progress = userProgresses.find(p => p.planId === planId);
    if (!progress) return null;

    const planBooks = getPlanBooks(planCategory, planBookIds);
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

  // Submit custom plan handler
  const handleCreateCustomPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) {
      alert("Veuillez saisir un titre pour votre plan.");
      return;
    }
    if (selectedCustomBookIds.length === 0) {
      alert("Veuillez sélectionner au moins un livre à inclure dans votre programme.");
      return;
    }

    const newPlanId = `custom-plan-${Date.now()}`;
    const newPlan: ReadingPlan = {
      id: newPlanId,
      title: customTitle.trim(),
      description: customDescription.trim() || `Programme d'étude personnalisé de ${selectedCustomBookIds.length} livre(s) sur ${customWeeks} semaines.`,
      durationDays: customWeeks * 7,
      category: 'custom',
      targetCategoryName: `Mon Plan (${customWeeks} sem.)`,
      isCustom: true,
      bookIds: [...selectedCustomBookIds]
    };

    const updatedPlans = [...customPlans, newPlan];
    saveCustomPlans(updatedPlans);

    // Auto join the plan immediately!
    const newProg: PlanUserProgress = {
      planId: newPlanId,
      joinedAt: new Date().toLocaleDateString('fr-FR'),
      completedChapters: [],
      isCompleted: false
    };
    saveProgress([...userProgresses, newProg]);

    // Reset form states
    setCustomTitle('');
    setCustomDescription('');
    setCustomWeeks(4);
    setSelectedCustomBookIds([]);
    setIsCreatingCustom(false);
    
    // Open the detail view of the newly created plan
    setSelectedPlanId(newPlanId);
    setActiveSegment('joined');
    
    setToastMessage(`✨ Plan Personnalisé "${newPlan.title}" créé et rejoint avec succès !`);
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
        const plan = ALL_PLANS.find(p => p.id === selectedPlanId);
        const progress = userProgresses.find(p => p.planId === selectedPlanId);
        if (!plan || !progress) return null;

        const totalChapters = getPlanTotalChapters(plan.category, plan.bookIds);
        const completedCount = progress.completedChapters.length;
        const progressPercent = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;
        const nextToRead = getNextUnreadChapter(plan.id, plan.category, plan.bookIds);
        const planBooks = getPlanBooks(plan.category, plan.bookIds);

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
              <span>Bibliothèque ({ALL_PLANS.length - userProgresses.length})</span>
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
                    const plan = ALL_PLANS.find(p => p.id === prog.planId);
                    if (!plan) return null;

                    const totalChapters = getPlanTotalChapters(plan.category, plan.bookIds);
                    const completedCount = prog.completedChapters.length;
                    const progressPercent = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;
                    const nextToRead = getNextUnreadChapter(plan.id, plan.category, plan.bookIds);

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
            const unjoinedPlans = ALL_PLANS.filter(p => !userProgresses.some(u => u.planId === p.id));
            
            return (
              <div className="space-y-4">
                {/* CREATE CUSTOM PLAN FORM OR launcher CTA */}
                {isCreatingCustom ? (
                  <form onSubmit={handleCreateCustomPlan} className="bg-[#1a1712] border border-[#c9a84c]/35 rounded-xl p-4 space-y-4 animate-fade-slide-up">
                    <div className="flex items-center justify-between border-b border-[#2e2a1e] pb-2">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#c9a84c] animate-pulse" />
                        <span className="font-serif font-extrabold text-[11px] text-[#c9a84c] uppercase tracking-wider">Créer mon Programme de Lecture</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsCreatingCustom(false)} 
                        className="text-[#6b6355] hover:text-[#e8e0d0] text-xs cursor-pointer p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Title Input */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-mono text-[#6b6355] uppercase tracking-wider font-extrabold">TITRE DE VOTRE AGENDA</label>
                      <input 
                        type="text" 
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        placeholder="Ex: Psaumes de Sagesse Quotidienne"
                        required
                        className="w-full bg-[#0d0b07] text-[#e8e0d0] text-xs rounded-lg border border-[#2e2a1e] focus:border-[#c9a84c] focus:outline-none p-2.5 font-serif placeholder:text-[#6b6355]/40"
                      />
                    </div>

                    {/* Description Input */}
                    <div className="space-y-1">
                      <label className="block text-[9px] font-mono text-[#6b6355] uppercase tracking-wider font-extrabold">DESCRIPTION / INTENTIONS</label>
                      <textarea 
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        placeholder="Ex: Une heure sainte passée sur les messages prophétiques et l'Épiphanie."
                        rows={2}
                        className="w-full bg-[#0d0b07] text-[#e8e0d0] text-xs rounded-lg border border-[#2e2a1e] focus:border-[#c9a84c] focus:outline-none p-2.5 font-sans placeholder:text-[#6b6355]/40 resize-none"
                      />
                    </div>

                    {/* Duration Input */}
                    <div className="space-y-1 bg-[#12100c] p-2.5 rounded-lg border border-[#2e2a1e]/50">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[9px] font-mono text-[#6b6355] uppercase tracking-wider font-extrabold">ORGANISATION TEMPORELLE</label>
                        <span className="text-xs font-mono font-black text-[#c9a84c]">{customWeeks} Semaine{customWeeks > 1 ? 's' : ''} <span className="text-[10px] text-[#6b6355]">({customWeeks * 7} jours)</span></span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="16" 
                        value={customWeeks}
                        onChange={(e) => setCustomWeeks(parseInt(e.target.value))}
                        className="w-full accent-[#c9a84c] cursor-pointer h-1 bg-[#2e2a1e] rounded-lg appearance-none"
                      />
                      <div className="flex justify-between text-[8px] font-mono text-[#6b6355] pt-1">
                        <span>1 sem.</span>
                        <span>4 sem.</span>
                        <span>8 sem.</span>
                        <span>12 sem.</span>
                        <span>16 sem.</span>
                      </div>
                    </div>

                    {/* Book select grid */}
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2e2a1e]/50 pb-1.5 gap-2">
                        <label className="text-[9px] font-mono text-[#6b6355] uppercase tracking-wider font-extrabold block">SÉLECTION DES LIVRES ({selectedCustomBookIds.length})</label>
                        
                        {/* Quick select buttons */}
                        <div className="flex flex-wrap gap-1 text-[8px] font-mono">
                          <button 
                            type="button"
                            onClick={() => setSelectedCustomBookIds(BOOKS.filter(b => b.testament === 'NT').map(b => b.id))}
                            className="px-1.5 py-0.5 bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 rounded hover:bg-[#c9a84c]/20 cursor-pointer"
                          >
                            Nouveau Test.
                          </button>
                          <button 
                            type="button"
                            onClick={() => setSelectedCustomBookIds(BOOKS.filter(b => b.testament === 'AT').map(b => b.id))}
                            className="px-1.5 py-0.5 bg-[#2e2a1e] text-[#6b6355] rounded hover:text-[#e8e0d0] cursor-pointer"
                          >
                            Ancien Test.
                          </button>
                          <button 
                            type="button"
                            onClick={() => setSelectedCustomBookIds(BOOKS.map(b => b.id))}
                            className="px-1.5 py-0.5 bg-[#2e2a1e] text-[#6b6355] rounded hover:text-[#e8e0d0] cursor-pointer"
                          >
                            Toute la Bible
                          </button>
                          <button 
                            type="button"
                            onClick={() => setSelectedCustomBookIds([])}
                            className="px-1.5 py-0.5 bg-rose-950/20 text-rose-400 rounded hover:bg-rose-950/40 cursor-pointer"
                          >
                            Vider
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1 no-scrollbar text-[10px]">
                        {/* Ancien Testament */}
                        <div className="space-y-1">
                          <span className="text-[8px] font-mono text-[#6b6355] uppercase block tracking-widest font-black">Ancien Testament</span>
                          <div className="flex flex-wrap gap-1">
                            {BOOKS.filter(b => b.testament === 'AT').map(b => {
                              const isSelected = selectedCustomBookIds.includes(b.id);
                              return (
                                <button
                                  type="button"
                                  key={b.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedCustomBookIds(selectedCustomBookIds.filter(id => id !== b.id));
                                    } else {
                                      setSelectedCustomBookIds([...selectedCustomBookIds, b.id]);
                                    }
                                  }}
                                  className={`px-2 py-1 rounded text-[9px] transition cursor-pointer select-none font-serif ${
                                    isSelected 
                                      ? 'bg-[#c9a84c] text-[#0d0b07] font-bold shadow-[0_2px_4px_rgba(201,168,76,0.3)]' 
                                      : 'bg-[#12100c] text-[#6b6355] border border-[#2e2a1e]/60 hover:text-[#e8e0d0]'
                                  }`}
                                >
                                  {b.name} <span className="font-mono text-[8px] opacity-75">({b.chapters_count})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Nouveau Testament */}
                        <div className="space-y-1 pt-1 border-t border-[#2e2a1e]/30">
                          <span className="text-[8px] font-mono text-[#6b6355] uppercase block tracking-widest font-black">Nouveau Testament</span>
                          <div className="flex flex-wrap gap-1">
                            {BOOKS.filter(b => b.testament === 'NT').map(b => {
                              const isSelected = selectedCustomBookIds.includes(b.id);
                              return (
                                <button
                                  type="button"
                                  key={b.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedCustomBookIds(selectedCustomBookIds.filter(id => id !== b.id));
                                    } else {
                                      setSelectedCustomBookIds([...selectedCustomBookIds, b.id]);
                                    }
                                  }}
                                  className={`px-2 py-1 rounded text-[9px] transition cursor-pointer select-none font-serif ${
                                    isSelected 
                                      ? 'bg-[#c9a84c] text-[#0d0b07] font-bold shadow-[0_2px_4px_rgba(201,168,76,0.3)]' 
                                      : 'bg-[#12100c] text-[#6b6355] border border-[#2e2a1e]/60 hover:text-[#e8e0d0]'
                                  }`}
                                >
                                  {b.name} <span className="font-mono text-[8px] opacity-75">({b.chapters_count})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Form action bar */}
                    <div className="flex gap-2 pt-2.5 border-t border-[#2e2a1e]/50">
                      <button
                        type="button"
                        onClick={() => setIsCreatingCustom(false)}
                        className="flex-1 py-1.5 bg-[#2e2a1e]/15 border border-[#2e2a1e] text-[#6b6355] hover:text-[#e8e0d0] text-[10px] font-bold uppercase rounded-lg tracking-wider cursor-pointer transition"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="flex-[2] py-1.5 bg-[#c9a84c] text-[#0d0b07] hover:bg-[#dfba5a] text-[10px] font-bold uppercase rounded-lg tracking-wider shadow-gold-glow cursor-pointer transition"
                      >
                        Enregistrer & Débuter le Plan ⚡
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsCreatingCustom(true)}
                    className="w-full bg-gradient-to-r from-[#161410]/80 to-[#c9a84c]/5 border border-[#c9a84c]/20 hover:border-[#c9a84c]/50 p-4 rounded-xl flex items-center justify-between transition cursor-pointer group shadow-soft"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1a1712] border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c] group-hover:scale-110 transition shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-serif font-extrabold text-[12px] text-[#e8e0d0]">Créer mon Plan Personnalisé</h4>
                        <p className="text-[10px] text-[#6b6355] mt-0.5 leading-tight">Sélectionnez vos livres sacrés et organisez votre rythme sur mesure.</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#6b6355] group-hover:text-[#c9a84c] transition" />
                  </button>
                )}

                {unjoinedPlans.length === 0 ? (
                  <div className="py-8 px-4 text-center border border-[#2e2a1e] rounded-2xl bg-[#12100c]/40">
                    <Award className="w-7 h-7 text-[#c9a84c] mx-auto mb-2" />
                    <p className="font-serif font-bold text-xs text-[#e8e0d0]">Tous les défis sont honorés !</p>
                    <p className="text-[10px] text-[#6b6355] mt-1 max-w-[200px] mx-auto">Vous avez rejoint l'intégralité des plans sacrés disponibles. Méditez fidèlement.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {unjoinedPlans.map(plan => {
                      const totalChapters = getPlanTotalChapters(plan.category, plan.bookIds);
                      
                      return (
                        <div 
                          key={plan.id}
                          className="bg-[#12100c] border border-[#2e2a1e] p-3.5 rounded-xl space-y-3 flex flex-col justify-between text-left"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[8px] font-mono tracking-widest text-[#6b6355] uppercase font-bold border border-[#2e2a1e] px-1.5 py-0.5 rounded">
                                {plan.durationDays} jours · {totalChapters} Chapitres
                              </span>
                              <span className="text-[8px] font-bold text-[#c9a84c] uppercase">
                                {plan.isCustom ? 'Personnalisé' : plan.id === 'nt-90' ? 'Populaire' : ''}
                              </span>
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
        const plan = ALL_PLANS.find(p => p.id === selectedPlanId);
        const progress = userProgresses.find(p => p.planId === selectedPlanId);
        if (!plan || !progress) return null;

        const totalChapters = getPlanTotalChapters(plan.category, plan.bookIds);
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
