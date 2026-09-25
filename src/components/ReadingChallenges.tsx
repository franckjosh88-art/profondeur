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
  Sparkles,
  Flame,
  Layers,
  Filter,
  Clock,
  Timer,
  Plus,
  Minus,
  BookOpen,
  Crown
} from 'lucide-react';
import { Book as BibleBook, ReadingHistory } from '../types/bible';
import { ReadingPlan, PlanUserProgress, ReadingPlanDay } from '../types/challenges';
import { BOOKS } from '../data/bibleData';
import { ChallengeShareModal } from './ChallengeShareModal';
import { AiReadingPlanModal } from './AiReadingPlanModal';

interface ReadingChallengesProps {
  readingHistory: ReadingHistory[];
  onNavigateToChapter: (bookId: number, chapterNum: number) => void;
  dailyGoalPercent?: number;
  dailyGoalType?: 'chapters' | 'time';
  todayReadingsCount?: number;
  dailyGoalTarget?: number;
  readingTimeToday?: number;
  dailyTimeGoal?: number;
  setReadingTimeToday?: React.Dispatch<React.SetStateAction<number>>;
  setDailyTimeGoal?: (goal: number) => void;
  onNavigateToReader?: () => void;
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
  if (planCategory === 'custom' || planCategory === 'ai_generated') {
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

// Helper to check if a day in an AI plan is completed
const isDayDone = (prog: PlanUserProgress | undefined, day: ReadingPlanDay): boolean => {
  if (!prog) return false;
  return prog.completedChapters.includes(`day_${day.day}`) || 
         prog.completedChapters.includes(`${day.bookId}:${day.chapter}`);
};

// Helper to format reading duration into human readable string
const formatReadingDuration = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return '0 min';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes} min ${seconds} s` : `${minutes} min`;
  }
  return `${seconds} s`;
};

export const ReadingChallenges: React.FC<ReadingChallengesProps> = ({
  readingHistory,
  onNavigateToChapter,
  dailyGoalPercent,
  dailyGoalType = 'chapters',
  todayReadingsCount = 0,
  dailyGoalTarget = 3,
  readingTimeToday = 0,
  dailyTimeGoal = 15,
  setReadingTimeToday,
  setDailyTimeGoal,
  onNavigateToReader
}) => {
  // Navigation tabs within Challenges component
  const [activeSegment, setActiveSegment] = useState<'joined' | 'discover'>('joined');
  
  // State for joined progress
  const [userProgresses, setUserProgresses] = useState<PlanUserProgress[]>([]);

  // State for user custom & AI plans
  const [customPlans, setCustomPlans] = useState<ReadingPlan[]>([]);
  
  // Selected challenge for detail view
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  
  // Selected book folder in chapter checklist detail view (for collapsible navigation)
  const [expandedBookId, setExpandedBookId] = useState<number | null>(null);

  // Day filter in AI plan detail view ('all' | 'pending' | 'completed')
  const [dayFilter, setDayFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Successful tracking Toast/notification when a chapter is auto-completed
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // State to control visual challenge share modal
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // State to control AI reading plan generator modal
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  // Form states for creating custom reading plan manually
  const [isCreatingCustom, setIsCreatingCustom] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [customWeeks, setCustomWeeks] = useState<number>(4);
  const [selectedCustomBookIds, setSelectedCustomBookIds] = useState<number[]>([]);

  // Computed all plans list
  const ALL_PLANS = [...DEFAULT_PLANS, ...customPlans];

  // Reading Time computations for daily goal tracking
  const timeGoalMin = dailyTimeGoal || 15;
  const timeGoalSec = timeGoalMin * 60;
  const timeProgressRatio = timeGoalSec > 0 ? (readingTimeToday || 0) / timeGoalSec : 0;
  const timeGoalPercent = Math.min(100, Math.round(timeProgressRatio * 100));
  const isTimeGoalReached = timeGoalPercent >= 100;
  const remainingSeconds = Math.max(0, timeGoalSec - (readingTimeToday || 0));
  const remainingMinutes = Math.ceil(remainingSeconds / 60);

  // Quick manual time addition (+5 min, +15 min)
  const handleAddQuickTime = (mins: number) => {
    if (setReadingTimeToday) {
      setReadingTimeToday(prev => {
        const next = prev + (mins * 60);
        const todayStr = new Date().toDateString();
        let durations: Record<string, number> = {};
        const savedDurations = localStorage.getItem('bible_reading_durations_by_day');
        if (savedDurations) {
          try {
            durations = JSON.parse(savedDurations);
          } catch (_) {}
        }
        durations[todayStr] = next;
        localStorage.setItem('bible_reading_durations_by_day', JSON.stringify(durations));
        return next;
      });
      setToastMessage(`⏱️ +${mins} min de lecture ajoutées au cumul journalier !`);
    }
  };

  // Quick goal adjustment
  const handleAdjustGoal = (deltaMins: number) => {
    if (setDailyTimeGoal) {
      const next = Math.max(5, Math.min(180, timeGoalMin + deltaMins));
      setDailyTimeGoal(next);
      localStorage.setItem('bible_daily_goal_time', String(next));
      setToastMessage(`🎯 Objectif temporel ajusté à ${next} min par jour.`);
    }
  };

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
      const plan = ALL_PLANS.find(p => p.id === prog.planId);
      if (!plan) return prog;

      // Case A: Plan with structured days (AI Generated 30-Day Plan)
      if (plan.days && plan.days.length > 0) {
        const matchingDay = plan.days.find(d => d.bookId === latestReading.book_id && d.chapter === latestReading.chapter);
        if (matchingDay && !isDayDone(prog, matchingDay)) {
          const dayKey = `day_${matchingDay.day}`;
          const newCompleted = [...prog.completedChapters, dayKey, key];
          const isNowCompleted = plan.days.every(d => d.day === matchingDay.day || isDayDone(prog, d));

          progressChanged = true;
          setToastMessage(`✓ Jour ${matchingDay.day} validé : ${latestReading.book_name} ${latestReading.chapter} validé dans "${plan.title}" !`);

          return {
            ...prog,
            completedChapters: newCompleted,
            isCompleted: isNowCompleted
          };
        }
        return prog;
      }

      // Case B: Standard whole book/category plan
      const book = BOOKS.find(b => b.id === latestReading.book_id);
      if (!book) return prog;

      if (isBookInPlan(book, plan.category, plan.bookIds)) {
        if (!prog.completedChapters.includes(key)) {
          const newCompleted = [...prog.completedChapters, key];
          const totalChaptersCount = getPlanTotalChapters(plan.category, plan.bookIds);
          const isNowCompleted = newCompleted.length >= totalChaptersCount;

          progressChanged = true;
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

  // Toggle chapter completed manually in standard plans
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

  // Toggle Day completion in AI 30-day plans
  const toggleDayCompletion = (planId: string, dayNum: number, bookId: number, chapterNum: number) => {
    const dayKey = `day_${dayNum}`;
    const chKey = `${bookId}:${chapterNum}`;

    const updated = userProgresses.map(prog => {
      if (prog.planId !== planId) return prog;
      const plan = ALL_PLANS.find(p => p.id === planId);
      if (!plan || !plan.days) return prog;

      const alreadyDone = prog.completedChapters.includes(dayKey) || prog.completedChapters.includes(chKey);
      const newCompleted = alreadyDone
        ? prog.completedChapters.filter(k => k !== dayKey && k !== chKey)
        : [...prog.completedChapters, dayKey, chKey];

      const isNowCompleted = plan.days.every(d => 
        d.day === dayNum ? !alreadyDone : (newCompleted.includes(`day_${d.day}`) || newCompleted.includes(`${d.bookId}:${d.chapter}`))
      );

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
    const isCustomOrAi = customPlans.some(p => p.id === planId);
    if (isCustomOrAi) {
      const option = window.confirm("Souhaitez-vous abandonner ce plan personnalisé ? Ses progrès seront réinitialisés. Voulez-vous également le supprimer définitivement ?");
      if (option) {
        const updatedCustom = customPlans.filter(p => p.id !== planId);
        saveCustomPlans(updatedCustom);
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

  // Find the next unread chapter for a standard plan
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
    return null;
  };

  // Find the next unread day for an AI plan
  const getNextUnreadDay = (plan: ReadingPlan, progress: PlanUserProgress): ReadingPlanDay | null => {
    if (!plan.days) return null;
    return plan.days.find(d => !isDayDone(progress, d)) || null;
  };

  // Callback when AI creates a new 30-day reading plan
  const handleAiPlanCreated = (newPlan: ReadingPlan) => {
    // 1. Add to customPlans list
    const updatedCustomPlans = [newPlan, ...customPlans];
    saveCustomPlans(updatedCustomPlans);

    // 2. Automatically join the newly created plan
    const newProg: PlanUserProgress = {
      planId: newPlan.id,
      joinedAt: new Date().toLocaleDateString('fr-FR'),
      completedChapters: [],
      isCompleted: false
    };
    saveProgress([newProg, ...userProgresses]);

    // 3. Switch to joined tab and open the plan detail view
    setActiveSegment('joined');
    setSelectedPlanId(newPlan.id);
    setToastMessage(`✨ Plan de 30 jours "${newPlan.title}" généré et activé avec succès !`);
  };

  // Submit manual custom plan handler
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

        const isAiPlan = !!(plan.days && plan.days.length > 0);
        const totalItems = isAiPlan ? plan.days!.length : getPlanTotalChapters(plan.category, plan.bookIds);
        const completedCount = isAiPlan 
          ? plan.days!.filter(d => isDayDone(progress, d)).length
          : progress.completedChapters.length;
        const progressPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
        
        const nextDay = isAiPlan ? getNextUnreadDay(plan, progress) : null;
        const nextToRead = !isAiPlan ? getNextUnreadChapter(plan.id, plan.category, plan.bookIds) : null;
        const planBooks = !isAiPlan ? getPlanBooks(plan.category, plan.bookIds) : [];

        // Filtered days for AI plans
        const displayedDays = isAiPlan ? plan.days!.filter(d => {
          const done = isDayDone(progress, d);
          if (dayFilter === 'completed') return done;
          if (dayFilter === 'pending') return !done;
          return true;
        }) : [];

        return (
          <div className="bg-[#12100c] rounded-2xl border border-[#2e2a1e] p-4 sm:p-5 space-y-4 animate-fade-slide-up">
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
                className="text-[9px] text-rose-400 font-mono tracking-wider hover:underline cursor-pointer"
              >
                ABANDONNER LE PLAN
              </button>
            </div>

            {/* Title & Badge */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-block bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/25 rounded px-2 py-0.5 text-[8px] font-mono font-bold tracking-widest uppercase">
                  {plan.targetCategoryName || (isAiPlan ? "Plan IA 30 Jours" : "Plan Actif")}
                </span>
                {plan.theme && (
                  <span className="text-[9px] font-serif italic text-[#a89d8b]">
                    Thème : {plan.theme}
                  </span>
                )}
              </div>
              <h3 className="font-serif font-extrabold text-base sm:text-lg text-[#e8e0d0] tracking-tight">{plan.title}</h3>
              <p className="text-xs text-[#8c8270] leading-relaxed mt-1">{plan.description}</p>
            </div>

            {/* Progress status card with luxury bars */}
            <div className="bg-[#181510] p-3.5 rounded-xl border border-[#2e2a1e] space-y-2.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-[#8c8270]">AVANCEMENT DU PARCOURS</span>
                <span className="text-[#c9a84c] font-bold">
                  {progressPercent}% ({completedCount}/{totalItems} {isAiPlan ? 'jours' : 'chap.'})
                </span>
              </div>
              
              {/* Luxury progress bar */}
              <div className="w-full h-2 bg-[#0d0b07] rounded-full overflow-hidden border border-[#2e2a1e]">
                <div 
                  className="h-full bg-gradient-to-r from-[#a08232] via-[#c9a84c] to-[#dfba5a] rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(201,168,76,0.4)]"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[9px] font-mono text-[#6b6355]">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-[#c9a84c]" />
                  Rejoint le {progress.joinedAt}
                </span>
                <span>Objectif : {plan.durationDays} Jours</span>
              </div>
            </div>

            {/* CTA action buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              {isAiPlan ? (
                nextDay ? (
                  <button
                    onClick={() => onNavigateToChapter(nextDay.bookId, nextDay.chapter)}
                    className="flex-1 py-2.5 px-4 bg-[#c9a84c] text-[#0d0b07] font-serif font-extrabold text-xs rounded-xl hover:bg-[#dfba5a] active:scale-[0.98] transition duration-150 inline-flex items-center justify-center gap-2 cursor-pointer shadow-gold-glow"
                  >
                    <Play className="w-3.5 h-3.5 fill-[#0d0b07]" />
                    <span>LIRE JOUR {nextDay.day} : {nextDay.bookName} {nextDay.chapter} ({nextDay.verseRange})</span>
                  </button>
                ) : (
                  <div className="flex-1 bg-[#c9a84c]/10 rounded-xl p-3 border border-[#c9a84c]/30 flex items-center gap-3">
                    <Award className="w-8 h-8 text-[#c9a84c] shrink-0" />
                    <div>
                      <h4 className="font-serif font-extrabold text-[#c9a84c] text-xs">Parcours de 30 Jours Accompli !</h4>
                      <p className="text-[10px] text-[#8c8270] mt-0.5">Que cette méditation fidèle continue de porter du fruit dans votre vie.</p>
                    </div>
                  </div>
                )
              ) : (
                nextToRead ? (
                  <button
                    onClick={() => onNavigateToChapter(nextToRead.book.id, nextToRead.chapterNum)}
                    className="flex-1 py-2.5 bg-[#c9a84c] text-[#0d0b07] font-bold text-xs rounded-xl hover:bg-[#dfba5a] active:scale-[0.98] transition duration-150 inline-flex items-center justify-center gap-2 cursor-pointer shadow-gold-glow"
                  >
                    <Play className="w-3.5 h-3.5 fill-[#0d0b07]" />
                    <span>LIRE CHAP. SUIVANT : {nextToRead.book.name} {nextToRead.chapterNum}</span>
                  </button>
                ) : (
                  <div className="flex-1 bg-[#c9a84c]/10 rounded-xl p-3 border border-[#c9a84c]/20 flex items-center gap-3">
                    <Award className="w-8 h-8 text-[#c9a84c] shrink-0" />
                    <div>
                      <h4 className="font-serif font-extrabold text-[#c9a84c] text-xs">Félicitations pour votre fidélité !</h4>
                      <p className="text-[9px] text-[#6b6355] mt-0.5">Vous avez lu l'ensemble des {totalItems} chapitres de ce plan.</p>
                    </div>
                  </div>
                )
              )}

              {/* Share modal button */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="py-2.5 px-4 bg-[#181510] hover:bg-[#c9a84c]/15 text-[#c9a84c] hover:text-[#e8e0d0] border border-[#c9a84c]/20 hover:border-[#c9a84c] text-xs font-serif font-bold rounded-xl active:scale-[0.98] transition duration-150 inline-flex items-center justify-center gap-2 cursor-pointer"
                title="Générer une image souvenir"
              >
                <Share2 className="w-3.5 h-3.5 text-[#c9a84c]" />
                <span>Partager ma Réussite 🎨</span>
              </button>
            </div>

            {/* AI 30-DAY JOURNEY ACCORDION/LIST */}
            {isAiPlan ? (
              <div className="space-y-3 pt-1">
                {/* Filter bar */}
                <div className="flex items-center justify-between border-b border-[#2e2a1e] pb-2 text-[10px] font-mono">
                  <span className="text-[#a89d8b] uppercase font-bold tracking-wider">
                    ITINÉRAIRE DE 30 JOURS
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setDayFilter('all')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition ${
                        dayFilter === 'all' 
                          ? 'bg-[#c9a84c] text-[#0d0b07] font-bold' 
                          : 'bg-[#181510] text-[#6b6355] hover:text-[#e8e0d0]'
                      }`}
                    >
                      Tous (30)
                    </button>
                    <button
                      onClick={() => setDayFilter('pending')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition ${
                        dayFilter === 'pending' 
                          ? 'bg-[#c9a84c] text-[#0d0b07] font-bold' 
                          : 'bg-[#181510] text-[#6b6355] hover:text-[#e8e0d0]'
                      }`}
                    >
                      À lire ({30 - completedCount})
                    </button>
                    <button
                      onClick={() => setDayFilter('completed')}
                      className={`px-2 py-0.5 rounded cursor-pointer transition ${
                        dayFilter === 'completed' 
                          ? 'bg-[#c9a84c] text-[#0d0b07] font-bold' 
                          : 'bg-[#181510] text-[#6b6355] hover:text-[#e8e0d0]'
                      }`}
                    >
                      Terminés ({completedCount})
                    </button>
                  </div>
                </div>

                {/* Days list */}
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 no-scrollbar">
                  {displayedDays.map((day) => {
                    const isCompleted = isDayDone(progress, day);
                    return (
                      <div 
                        key={day.day}
                        className={`rounded-xl border p-3.5 transition-all space-y-2.5 text-left ${
                          isCompleted
                            ? 'bg-[#12100c]/70 border-[#c9a84c]/30 opacity-80 hover:opacity-100'
                            : 'bg-[#161410] border-[#2e2a1e] hover:border-[#c9a84c]/50 shadow-soft'
                        }`}
                      >
                        {/* Day header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              isCompleted 
                                ? 'bg-[#c9a84c]/20 text-[#c9a84c]' 
                                : 'bg-[#2e2a1e] text-[#e8e0d0]'
                            }`}>
                              Jour {day.day} / 30
                            </span>
                            <span className="text-xs font-serif font-bold text-[#c9a84c]">
                              {day.bookName} {day.chapter} {day.verseRange ? `(${day.verseRange})` : ''}
                            </span>
                          </div>

                          <button
                            onClick={() => toggleDayCompletion(plan.id, day.day, day.bookId, day.chapter)}
                            className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-lg border transition cursor-pointer ${
                              isCompleted
                                ? 'bg-[#c9a84c]/15 border-[#c9a84c]/40 text-[#c9a84c]'
                                : 'bg-[#181510] border-[#2e2a1e] text-[#6b6355] hover:text-[#e8e0d0]'
                            }`}
                          >
                            {isCompleted ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#c9a84c]" />
                                <span>Complété</span>
                              </>
                            ) : (
                              <>
                                <Circle className="w-3.5 h-3.5" />
                                <span>Marquer lu</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Title of the day */}
                        <h5 className="font-serif font-bold text-sm text-[#e8e0d0]">
                          {day.title}
                        </h5>

                        {/* Key Verse Quote */}
                        {day.keyVerse && (
                          <div className="bg-[#12100c] border-l-2 border-[#c9a84c] px-3 py-2 rounded-r-lg text-xs font-serif italic text-[#e8e0d0]/90 leading-relaxed">
                            « {day.keyVerse} »
                          </div>
                        )}

                        {/* Pastoral Meditation Prompt */}
                        {day.meditationPrompt && (
                          <div className="bg-[#0f0d0a] border border-[#2e2a1e]/60 rounded-lg p-2.5 flex items-start gap-2 text-[11px] text-[#8c8270] leading-relaxed">
                            <span className="text-xs">🕊️</span>
                            <div>
                              <strong className="text-[#c9a84c] font-serif">Méditation : </strong>
                              <span className="font-sans text-[#a89d8b]">{day.meditationPrompt}</span>
                            </div>
                          </div>
                        )}

                        {/* Read action button */}
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => onNavigateToChapter(day.bookId, day.chapter)}
                            className="px-3 py-1.5 bg-[#c9a84c]/10 hover:bg-[#c9a84c] text-[#c9a84c] hover:text-[#0d0b07] border border-[#c9a84c]/30 hover:border-[#c9a84c] text-[10px] font-serif font-bold rounded-lg transition duration-150 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>Ouvrir dans la Bible</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* STANDARD PLAN: Collapsible Books & Chapters Grid */
              <div className="space-y-2">
                <span className="block text-[9px] font-mono tracking-[0.15em] text-[#6b6355] uppercase font-bold border-b border-[#2e2a1e] pb-1.5">
                  INDEX DES CHAPITRES DU PLAN
                </span>

                <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                  {planBooks.map(b => {
                    const isExpanded = expandedBookId === b.id;
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

                        {/* Chapters Grid Panel */}
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
                                    <span 
                                      className="font-mono text-[10px] font-bold"
                                      style={{ color: isChCompleted ? '#c9a84c' : '#6b6355' }}
                                    >
                                      {ch}
                                    </span>
                                    <div className="absolute top-0 right-0 p-0.5">
                                      {isChCompleted && (
                                        <div className="w-1.5 h-1.5 bg-[#c9a84c] rounded-full"></div>
                                      )}
                                    </div>
                                    <span 
                                      onClick={(e) => {
                                        e.stopPropagation();
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
            )}

          </div>
        );
      })() : (
        /* STANDARD SEGMENTED NAVIGATION SCREEN (Mes Défis / Découvrir) */
        <div className="space-y-4">
          
          {/* Visual Daily Reading Time Indicator at the top of Challenges Section */}
          <div className="bg-[#12100c] border border-[#2e2a1e] rounded-2xl p-4 sm:p-5 shadow-soft relative overflow-hidden">
            {/* Ambient background glows */}
            <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
              isTimeGoalReached ? 'bg-emerald-500/10' : timeGoalPercent > 0 ? 'bg-[#c9a84c]/10' : 'bg-transparent'
            }`} />

            {/* Header row: Title, Icon, Status Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#221e16]">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                  isTimeGoalReached 
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                    : timeGoalPercent > 0 
                      ? 'bg-[#c9a84c]/15 border-[#c9a84c]/30 text-[#dfba5a]' 
                      : 'bg-[#181510] border-[#2e2a1e] text-[#6b6355]'
                }`}>
                  <Timer className={`w-4 h-4 ${timeGoalPercent > 0 && !isTimeGoalReached ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase font-bold tracking-wider text-[#c9a84c]">
                    <span>Temps de Lecture Quotidien</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] animate-ping" />
                  </div>
                  <h4 className="text-xs font-serif font-extrabold text-[#e8e0d0] tracking-tight">
                    Durée cumulée par rapport à l'objectif temporel
                  </h4>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className={`text-[9.5px] font-mono font-bold uppercase px-2.5 py-1 rounded-full border transition-all ${
                  isTimeGoalReached 
                    ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/35 shadow-[0_0_12px_rgba(16,185,129,0.25)]' 
                    : timeGoalPercent > 0
                      ? 'text-[#dfba5a] bg-[#c9a84c]/15 border-[#c9a84c]/30'
                      : 'text-[#8c8270] bg-[#181510] border-[#2e2a1e]'
                }`}>
                  {isTimeGoalReached 
                    ? `👑 Objectif Atteint (${timeGoalPercent}%)` 
                    : timeGoalPercent > 0 
                      ? `⏱️ En Cours (${timeGoalPercent}%)` 
                      : '📖 À Débuter (0%)'
                  }
                </span>
              </div>
            </div>

            {/* Core Metrics: Radial Gauge + Accumulated Duration + Target */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3.5">
              <div className="flex items-center gap-4">
                {/* SVG Radial Circular Gauge */}
                <div className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 flex items-center justify-center">
                  <svg className="w-16 h-16 sm:w-18 sm:h-18 transform -rotate-90" viewBox="0 0 60 60">
                    <circle cx="30" cy="30" r="24" fill="transparent" stroke="#1f1b14" strokeWidth="5" />
                    <circle 
                      cx="30" cy="30" r="24" fill="transparent" 
                      stroke={isTimeGoalReached ? '#10b981' : '#c9a84c'} 
                      strokeWidth="5" 
                      strokeLinecap="round"
                      strokeDasharray="150.8"
                      strokeDashoffset={150.8 - (timeGoalPercent / 100) * 150.8}
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {isTimeGoalReached ? (
                      <Crown className="w-3.5 h-3.5 text-emerald-400 mb-0.5 animate-bounce" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-[#c9a84c] mb-0.5" />
                    )}
                    <span className="font-mono font-black text-xs text-[#e8e0d0] leading-none">
                      {timeGoalPercent}%
                    </span>
                  </div>
                </div>

                {/* Duration & Target Readout */}
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono font-black text-2xl sm:text-3xl text-[#e8e0d0] tracking-tight">
                      {formatReadingDuration(readingTimeToday)}
                    </span>
                    <span className="text-xs font-mono text-[#8c8270]">
                      / {timeGoalMin} min définies
                    </span>
                  </div>

                  <p className="text-xs font-serif text-[#a0947f] mt-1 leading-snug">
                    {isTimeGoalReached ? (
                      <span className="text-emerald-300 font-medium">
                        ✨ Félicitations ! Votre temps de méditation sacré est accompli pour aujourd'hui.
                      </span>
                    ) : readingTimeToday > 0 ? (
                      <span>
                        Encore <strong className="text-[#c9a84c] font-mono">{remainingMinutes} min</strong> pour valider votre objectif temporel.
                      </span>
                    ) : (
                      <span>
                        Aucune durée enregistrée aujourd'hui. Commencez à lire pour lancer le chronomètre.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Controls: Add time, Adjust goal, Continue Reading */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-start md:self-center">
                {/* Manual Time Quick-Add */}
                {setReadingTimeToday && (
                  <div className="flex items-center gap-1 bg-[#181510] border border-[#2e2a1e] rounded-xl p-1" title="Ajouter du temps de lecture papier ou audio">
                    <span className="text-[9px] font-mono text-[#6b6355] px-1">+Temps:</span>
                    <button
                      onClick={() => handleAddQuickTime(5)}
                      className="px-2 py-1 text-[10px] font-mono font-bold text-[#c9a84c] hover:bg-[#c9a84c]/10 rounded-lg transition cursor-pointer active:scale-95"
                      title="Ajouter 5 minutes"
                    >
                      +5m
                    </button>
                    <button
                      onClick={() => handleAddQuickTime(15)}
                      className="px-2 py-1 text-[10px] font-mono font-bold text-[#c9a84c] hover:bg-[#c9a84c]/10 rounded-lg transition cursor-pointer active:scale-95"
                      title="Ajouter 15 minutes"
                    >
                      +15m
                    </button>
                  </div>
                )}

                {/* Goal Adjuster Controls */}
                {setDailyTimeGoal && (
                  <div className="flex items-center gap-1 bg-[#181510] border border-[#2e2a1e] rounded-xl p-1" title="Ajuster l'objectif quotidien">
                    <button
                      onClick={() => handleAdjustGoal(-5)}
                      className="w-6 h-6 flex items-center justify-center text-[#8c8270] hover:text-[#e8e0d0] hover:bg-[#252017] rounded-lg transition cursor-pointer active:scale-95"
                      title="Diminuer l'objectif de 5 min"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-[#e8e0d0] px-1">
                      {timeGoalMin}m
                    </span>
                    <button
                      onClick={() => handleAdjustGoal(5)}
                      className="w-6 h-6 flex items-center justify-center text-[#8c8270] hover:text-[#e8e0d0] hover:bg-[#252017] rounded-lg transition cursor-pointer active:scale-95"
                      title="Augmenter l'objectif de 5 min"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Continue / Start Reading Button */}
                {onNavigateToReader && (
                  <button
                    onClick={onNavigateToReader}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#c9a84c] hover:bg-[#dfba5a] text-[#0d0b07] font-serif font-bold text-xs rounded-xl transition cursor-pointer shadow-soft active:scale-95"
                    title="Basculer vers la lecture biblique"
                  >
                    <Play className="w-3 h-3 fill-[#0d0b07]" />
                    <span>Lire</span>
                  </button>
                )}
              </div>
            </div>

            {/* Horizontal Linear Progress Bar with Milestones */}
            <div className="mt-1 space-y-1.5">
              <div className="w-full h-2 bg-[#0d0b07] border border-[#2e2a1e] rounded-full overflow-hidden relative">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    isTimeGoalReached 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]' 
                      : 'bg-gold-gradient shadow-[0_0_10px_rgba(201,168,76,0.3)]'
                  }`}
                  style={{ width: `${timeGoalPercent}%` }}
                />
              </div>

              {/* Milestones labels */}
              <div className="flex justify-between items-center text-[9px] font-mono text-[#6b6355]">
                <span>0 min</span>
                <span>25% ({Math.round(timeGoalMin * 0.25)}m)</span>
                <span>50% ({Math.round(timeGoalMin * 0.5)}m)</span>
                <span>75% ({Math.round(timeGoalMin * 0.75)}m)</span>
                <span className={`font-bold ${isTimeGoalReached ? 'text-emerald-400' : 'text-[#c9a84c]'}`}>
                  🎯 {timeGoalMin} min (100%)
                </span>
              </div>
            </div>

            {/* Secondary Footer Info: Chapter reading complement */}
            {todayReadingsCount !== undefined && dailyGoalTarget !== undefined && (
              <div className="mt-3 pt-2.5 border-t border-[#1d1912] flex flex-wrap items-center justify-between text-[10px] font-mono text-[#8c8270] gap-2">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3 text-[#c9a84c]" />
                  <span>Chapitres lus aujourd'hui : <strong className="text-[#e8e0d0]">{todayReadingsCount}</strong> / {dailyGoalTarget}</span>
                </span>
                <span className="text-[9px] italic text-[#6b6355]">
                  {formatReadingDuration(readingTimeToday)} cumulées en lecture aujourd'hui
                </span>
              </div>
            )}
          </div>

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
              {/* HERO BANNER TO GENERATE AI 30-DAY PLAN */}
              <div className="bg-gradient-to-br from-[#1c1811] via-[#14120e] to-[#1a160f] border border-[#c9a84c]/35 rounded-2xl p-4 sm:p-5 shadow-gold-glow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden">
                <div className="space-y-1 relative z-10 text-left">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c]/30 text-[#c9a84c] text-[9px] font-mono font-bold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    Plan Personnalisé IA
                  </div>
                  <h3 className="font-serif font-extrabold text-sm sm:text-base text-[#e8e0d0]">
                    Plan de Lecture Biblique sur 30 Jours
                  </h3>
                  <p className="text-[11px] text-[#8c8270] max-w-md font-sans">
                    Choisissez votre centre d'intérêt spirituel (Paix intérieure, Courage, Pardon, Espérance...) et recevez un parcours guidé avec versets clés et méditations.
                  </p>
                </div>
                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#b59238] to-[#c9a84c] hover:from-[#c9a84c] hover:to-[#dec16a] text-[#0d0b07] font-serif font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-gold-glow flex items-center gap-2 shrink-0 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#0d0b07]" />
                  <span>Créer mon Plan IA ✨</span>
                </button>
              </div>

              {userProgresses.length === 0 ? (
                <div className="py-8 px-4 text-center border-2 border-dashed border-[#2e2a1e] rounded-2xl bg-[#12100c]/40 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#161410] border border-[#2e2a1e] flex items-center justify-center text-[#6b6355] mx-auto">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-serif font-bold text-xs text-[#e8e0d0]">Aucun chemin tracé</p>
                    <p className="text-[10px] text-[#6b6355] leading-relaxed max-w-[240px] mx-auto font-sans">
                      Engagez-vous dans un plan d'étude régulier pour fortifier votre esprit et suivre votre avancement.
                    </p>
                  </div>
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => setIsAiModalOpen(true)}
                      className="px-3.5 py-1.5 bg-[#c9a84c] text-[#0d0b07] font-serif font-bold rounded-lg text-[10px] uppercase transition cursor-pointer shadow-gold-glow"
                    >
                      Générer avec l'IA ✨
                    </button>
                    <button
                      onClick={() => setActiveSegment('discover')}
                      className="px-3.5 py-1.5 bg-[#c9a84c]/10 hover:bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/30 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer"
                    >
                      Découvrir la Bibliothèque
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {userProgresses.map(prog => {
                    const plan = ALL_PLANS.find(p => p.id === prog.planId);
                    if (!plan) return null;

                    const isAiPlan = !!(plan.days && plan.days.length > 0);
                    const totalItems = isAiPlan ? plan.days!.length : getPlanTotalChapters(plan.category, plan.bookIds);
                    const completedCount = isAiPlan
                      ? plan.days!.filter(d => isDayDone(prog, d)).length
                      : prog.completedChapters.length;
                    const progressPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
                    
                    const nextDay = isAiPlan ? getNextUnreadDay(plan, prog) : null;
                    const nextToRead = !isAiPlan ? getNextUnreadChapter(plan.id, plan.category, plan.bookIds) : null;

                    return (
                      <div 
                        key={prog.planId}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className="bg-[#12100c] border border-[#2e2a1e] hover:border-[#c9a84c]/40 p-3.5 rounded-xl transition duration-300 cursor-pointer flex flex-col justify-between gap-3 group relative select-none shadow-soft"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-mono tracking-widest text-[#c9a84c] uppercase font-bold bg-[#c9a84c]/10 border border-[#c9a84c]/20 px-1.5 py-0.5 rounded">
                                {plan.durationDays} Jours
                              </span>
                              {isAiPlan && (
                                <span className="text-[8px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                                  IA Thématique
                                </span>
                              )}
                            </div>
                            <h4 className="font-serif font-extrabold text-xs text-[#e8e0d0] mt-1.5 group-hover:text-[#c9a84c] transition-colors line-clamp-1">{plan.title}</h4>
                            <p className="text-[9px] text-[#6b6355] line-clamp-1 mt-0.5">{plan.description}</p>
                          </div>
                          
                          <ChevronRight className="w-4 h-4 text-[#6b6355] group-hover:text-[#c9a84c] transition-colors shrink-0 mt-1" />
                        </div>

                        {/* Progress slider layout */}
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-[#6b6355] uppercase">Progression</span>
                            <span className="text-[#c9a84c] font-bold">
                              {progressPercent}% ({completedCount}/{totalItems} {isAiPlan ? 'j.' : 'ch.'})
                            </span>
                          </div>
                          
                          <div className="w-full h-1.5 bg-[#0d0b07] rounded-full overflow-hidden border border-[#2e2a1e]/70">
                            <div 
                              className="h-full bg-gradient-to-r from-[#a08232] to-[#c9a84c] rounded-full"
                              style={{ width: `${progressPercent}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Direct action info bar */}
                        {isAiPlan && nextDay && (
                          <div className="flex justify-between items-center pt-2 border-t border-[#2e2a1e]/40 text-[9px]">
                            <span className="text-[#8c8270] italic">
                              Étape suivante : Jour {nextDay.day} • {nextDay.bookName} {nextDay.chapter}
                            </span>
                            <span className="text-[#c9a84c] font-bold flex items-center gap-1 hover:underline">
                              <span>Ouvrir</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        )}

                        {!isAiPlan && nextToRead && (
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
                {/* AI PLAN LAUNCHER CARD */}
                <div className="bg-gradient-to-br from-[#1c1811] via-[#14120e] to-[#1a160f] border border-[#c9a84c]/35 rounded-2xl p-4 sm:p-5 shadow-gold-glow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden">
                  <div className="space-y-1 relative z-10 text-left">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c]/30 text-[#c9a84c] text-[9px] font-mono font-bold uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" />
                      Générateur Intelligent
                    </div>
                    <h3 className="font-serif font-extrabold text-sm sm:text-base text-[#e8e0d0]">
                      Générer un Plan de 30 Jours avec l'IA
                    </h3>
                    <p className="text-[11px] text-[#8c8270] max-w-md font-sans">
                      Paix intérieure, Courage, Foi dans l'épreuve... Décrivez votre besoin et Gemini structure un cheminement de 30 jours adapté.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAiModalOpen(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-[#b59238] to-[#c9a84c] hover:from-[#c9a84c] hover:to-[#dec16a] text-[#0d0b07] font-serif font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-gold-glow flex items-center gap-2 shrink-0 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#0d0b07]" />
                    <span>Lancer le Générateur ✨</span>
                  </button>
                </div>

                {/* CREATE CUSTOM MANUAL PLAN FORM OR launcher CTA */}
                {isCreatingCustom ? (
                  <form onSubmit={handleCreateCustomPlan} className="bg-[#1a1712] border border-[#c9a84c]/35 rounded-xl p-4 space-y-4 animate-fade-slide-up">
                    <div className="flex items-center justify-between border-b border-[#2e2a1e] pb-2">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#c9a84c]" />
                        <span className="font-serif font-extrabold text-[11px] text-[#c9a84c] uppercase tracking-wider">Créer un Programme Manuel</span>
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
                    className="w-full bg-gradient-to-r from-[#161410]/80 to-[#c9a84c]/5 border border-[#c9a84c]/20 hover:border-[#c9a84c]/50 p-3.5 rounded-xl flex items-center justify-between transition cursor-pointer group shadow-soft"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1a1712] border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c] group-hover:scale-110 transition shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-serif font-extrabold text-[12px] text-[#e8e0d0]">Composer un Plan Manuel par Livres</h4>
                        <p className="text-[10px] text-[#6b6355] mt-0.5 leading-tight font-sans">Sélectionnez manuellement vos livres et la durée souhaitée.</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#6b6355] group-hover:text-[#c9a84c] transition" />
                  </button>
                )}

                {unjoinedPlans.length === 0 ? (
                  <div className="py-8 px-4 text-center border border-[#2e2a1e] rounded-2xl bg-[#12100c]/40">
                    <Award className="w-7 h-7 text-[#c9a84c] mx-auto mb-2" />
                    <p className="font-serif font-bold text-xs text-[#e8e0d0]">Tous les défis sont honorés !</p>
                    <p className="text-[10px] text-[#6b6355] mt-1 max-w-[200px] mx-auto">Vous avez rejoint l'intégralité des plans disponibles. Méditez fidèlement.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {unjoinedPlans.map(plan => {
                      const isAi = !!(plan.days && plan.days.length > 0);
                      const totalChapters = isAi ? plan.days!.length : getPlanTotalChapters(plan.category, plan.bookIds);
                      
                      return (
                        <div 
                          key={plan.id}
                          className="bg-[#12100c] border border-[#2e2a1e] p-3.5 rounded-xl space-y-3 flex flex-col justify-between text-left shadow-soft"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[8px] font-mono tracking-widest text-[#6b6355] uppercase font-bold border border-[#2e2a1e] px-1.5 py-0.5 rounded">
                                {plan.durationDays} jours · {totalChapters} {isAi ? 'Jours' : 'Chapitres'}
                              </span>
                              <span className="text-[8px] font-bold text-[#c9a84c] uppercase">
                                {isAi ? 'IA Thématique' : plan.isCustom ? 'Personnalisé' : plan.id === 'nt-90' ? 'Populaire' : ''}
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

      {/* AI READING PLAN GENERATOR MODAL */}
      <AiReadingPlanModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onPlanCreated={handleAiPlanCreated}
      />

      {/* SUCCESS CARD GENERATOR MODAL */}
      {isShareModalOpen && selectedPlanId && (() => {
        const plan = ALL_PLANS.find(p => p.id === selectedPlanId);
        const progress = userProgresses.find(p => p.planId === selectedPlanId);
        if (!plan || !progress) return null;

        const isAiPlan = !!(plan.days && plan.days.length > 0);
        const totalItems = isAiPlan ? plan.days!.length : getPlanTotalChapters(plan.category, plan.bookIds);
        const completedCount = isAiPlan 
          ? plan.days!.filter(d => isDayDone(progress, d)).length 
          : progress.completedChapters.length;

        return (
          <ChallengeShareModal
            plan={plan}
            completedChaptersCount={completedCount}
            totalChaptersCount={totalItems}
            onClose={() => setIsShareModalOpen(false)}
          />
        );
      })()}

    </div>
  );
};
