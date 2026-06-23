import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Crown, BookOpen, Award, Sparkles, Plus, Minus, Trophy, 
  CheckCircle2, Flame, Calendar, RefreshCw 
} from 'lucide-react';
import { ReadingHistory } from '../types/bible';

interface DailyReadingGoalProps {
  readingHistory: ReadingHistory[];
}

export const DailyReadingGoal: React.FC<DailyReadingGoalProps> = ({ readingHistory }) => {
  const [dailyGoal, setDailyGoal] = useState<number>(3);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  // Load daily goal from localStorage on mount
  useEffect(() => {
    const savedGoal = localStorage.getItem('bible_daily_goal');
    if (savedGoal) {
      setDailyGoal(parseInt(savedGoal, 10) || 3);
    }
  }, []);

  // Filter history entries completed today (local time)
  const todayStr = new Date().toDateString();
  const todayReadings = readingHistory.filter(h => {
    if (!h.timestamp) return false;
    try {
      return new Date(h.timestamp).toDateString() === todayStr;
    } catch (e) {
      return false;
    }
  });

  const countToday = todayReadings.length;
  const progressRatio = countToday / dailyGoal;
  const percent = Math.min(100, Math.round(progressRatio * 100));
  const isGoalReached = countToday >= dailyGoal;

  // Trigger celebration on reaching goal for the first time in session
  useEffect(() => {
    if (isGoalReached && countToday > 0) {
      const triggeredToday = localStorage.getItem(`goal_celebration_${todayStr}`);
      if (!triggeredToday) {
        setShowCelebration(true);
        localStorage.setItem(`goal_celebration_${todayStr}`, 'true');
        // Auto dismiss after nice animation
        const timer = setTimeout(() => setShowCelebration(false), 6000);
        return () => clearTimeout(timer);
      }
    }
  }, [isGoalReached, countToday, todayStr]);

  const handleUpdateGoal = (amount: number) => {
    const nextGoal = Math.max(1, Math.min(20, dailyGoal + amount));
    setDailyGoal(nextGoal);
    localStorage.setItem('bible_daily_goal', String(nextGoal));
  };

  return (
    <div className="bg-[#12100c] border border-[#2e2a1e] rounded-2xl p-5 md:p-6 space-y-4 select-none relative overflow-hidden text-left shadow-soft">
      {/* Background ambient gold light effects */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#c9a84c]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

      {/* Goal Celebration Overlay Banner */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute inset-0 bg-[#0d0b07]/95 border border-[#c9a84c]/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center z-10"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#c9a84c]/10 via-transparent to-transparent opacity-60"></div>
            <div className="relative z-20 space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#c9a84c]/20 border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c] mx-auto animate-bounce">
                <Crown className="w-5 h-5" />
              </div>
              <h4 className="font-serif font-extrabold text-[#c9a84c] text-sm uppercase tracking-wider">Objectif Sacré Accomplis !</h4>
              <p className="text-[10px] text-[#e8e0d0] max-w-xs font-serif italic mx-auto">
                « Celui qui persévère dans la vérité verra sa foi couronnée de lumière. »
              </p>
              <p className="text-[9px] text-[#6b6355] font-mono uppercase tracking-widest pt-1">
                {countToday} / {dailyGoal} chapitres lus aujourd'hui
              </p>
              <button 
                onClick={() => setShowCelebration(false)}
                className="mt-3 px-3 py-1 bg-[#1a1712] border border-[#2e2a1e] text-[#c9a84c] rounded-lg text-[8.5px] font-mono tracking-widest uppercase hover:text-[#e8e0d0] hover:border-[#c9a84c]/30 transition"
              >
                Continuer la lecture
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header and Title Section */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
            isGoalReached 
              ? 'bg-[#c9a84c]/10 border-[#c9a84c] text-[#c9a84c]' 
              : 'bg-[#1a1712] border-[#2e2a1e] text-[#6b6355]'
          }`}>
            {isGoalReached ? <Trophy className="w-4.5 h-4.5 text-[#c9a84c] animate-pulse" /> : <BookOpen className="w-4.5 h-4.5 text-[#a0947f]" />}
          </div>
          <div>
            <h4 className="font-serif font-extrabold text-[13px] text-[#e8e0d0] tracking-tight">Objectif Spirituel Quotidien</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[8.5px] font-mono text-[#6b6355] uppercase flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#c9a84c]" />
                Progression du Jour
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Chapter Goal Setter dial */}
        <div className="bg-[#1a1712] border border-[#2e2a1e] rounded-xl px-2.5 py-1 flex items-center gap-2">
          <button 
            onClick={() => handleUpdateGoal(-1)}
            disabled={dailyGoal <= 1}
            className="p-1 text-[#6b6355] hover:text-[#c9a84c] disabled:opacity-30 disabled:hover:text-[#6b6355] transition text-xs shrink-0 cursor-pointer"
            title="Diminuer l'objectif"
          >
            <Minus className="w-3 h-3" />
          </button>
          
          <div className="text-center min-w-[36px]">
            <p className="text-[11px] font-mono font-bold text-[#c9a84c] leading-none">{dailyGoal}</p>
            <span className="text-[6.5px] font-mono text-[#6b6355] uppercase tracking-wider block mt-0.5">ch. / jour</span>
          </div>

          <button 
            onClick={() => handleUpdateGoal(1)}
            disabled={dailyGoal >= 20}
            className="p-1 text-[#6b6355] hover:text-[#c9a84c] disabled:opacity-30 disabled:hover:text-[#6b6355] transition text-xs shrink-0 cursor-pointer"
            title="Augmenter l'objectif"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Global Progress Bar with Gold Glow and Shine Effect */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-[#a0947f]">Statut :</span>
            {isGoalReached ? (
              <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1 py-0.5 px-1.5 bg-emerald-500/10 rounded-md border border-emerald-500/15 text-[8.5px]">
                <CheckCircle2 className="w-3 h-3" /> Complété
              </span>
            ) : countToday > 0 ? (
              <span className="text-[#c9a84c] uppercase tracking-wider flex items-center gap-1 text-[8.5px]">
                <Flame className="w-3 h-3 animate-pulse" /> En chemin
              </span>
            ) : (
              <span className="text-[#6b6355] uppercase tracking-wider text-[8.5px]">En attente</span>
            )}
          </div>
          <span className="text-[#e8e0d0] font-bold">
            {countToday} / {dailyGoal} <span className="text-[10px] text-[#6b6355] font-light font-sans">ch. ({percent}%)</span>
          </span>
        </div>

        {/* Global Progress Track */}
        <div className="w-full h-3 bg-[#0d0b07] border border-[#2e2a1e] rounded-full overflow-hidden p-[2px] relative">
          <motion.div 
            className="h-full rounded-full bg-gold-gradient relative overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Elegant light sweep overlay effect for completed ratio */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
          </motion.div>
        </div>
      </div>

      {/* Dynamic Spiritual Motivation Text */}
      <div className="pt-2 border-t border-[#2e2a1e]/40 flex items-center justify-between text-[10px]">
        <p className="text-[#a0947f] italic font-serif leading-relaxed pr-2">
          {isGoalReached 
            ? "« Votre esprit est nourri aujourd'hui. Poursuivez cette fidélité sacré ! »" 
            : countToday > 0 
              ? `Il vous reste ${dailyGoal - countToday} chapitre${dailyGoal - countToday > 1 ? 's' : ''} à lire pour accomplir votre objectif de sagesse.` 
              : "« Un chapitre par jour sanctifie un esprit. Prenez un instant spirituel. »"}
        </p>

        {isGoalReached && (
          <div className="flex items-center gap-0.5 py-0.5 px-2 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/20 text-[#c9a84c] shrink-0 text-[8.5px] font-mono font-bold">
            <Crown className="w-3 h-3" />
            <span>+1 STREAK</span>
          </div>
        )}
      </div>

      {/* Accordion view list of Chapters completed today */}
      {countToday > 0 && (
        <div className="bg-[#0c0a07] border border-[#2e2a1e]/50 rounded-xl p-3.5 mt-3.5 text-[10px] space-y-1.5">
          <div className="text-[8px] font-mono text-[#6b6355] uppercase tracking-widest font-black">
            Chapitres accomplis aujourd'hui :
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {todayReadings.slice().reverse().map((h, index) => (
              <div 
                key={`${h.book_id}_${h.chapter}_${index}`}
                className="flex items-center gap-1.5 py-1 px-2 rounded-lg bg-[#14120e] border border-[#2e2a1e]/35 text-[#e8e0d0] font-serif"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]" />
                <span className="truncate">{h.book_name} {h.chapter}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
