import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Crown, BookOpen, Award, Sparkles, Plus, Minus, Trophy, 
  CheckCircle2, Flame, Calendar, RefreshCw, Timer, Clock, ArrowRight,
  ChevronRight, Compass
} from 'lucide-react';
import { ReadingHistory } from '../types/bible';

interface DailyReadingGoalProps {
  readingHistory: ReadingHistory[];
  readingTimeToday: number;
  setReadingTimeToday: React.Dispatch<React.SetStateAction<number>>;
  dailyTimeGoal: number;
  setDailyTimeGoal: (goal: number) => void;
  goalType: 'chapters' | 'time';
  setGoalType: (type: 'chapters' | 'time') => void;
  currentStreak?: number;
  onNavigateToReader?: () => void;
}

export const DailyReadingGoal: React.FC<DailyReadingGoalProps> = ({ 
  readingHistory,
  readingTimeToday,
  setReadingTimeToday,
  dailyTimeGoal,
  setDailyTimeGoal,
  goalType,
  setGoalType,
  currentStreak = 0,
  onNavigateToReader
}) => {
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
  const minutesToday = Math.floor(readingTimeToday / 60);
  const secondsLeft = readingTimeToday % 60;

  const progressRatio = goalType === 'chapters' 
    ? (dailyGoal > 0 ? countToday / dailyGoal : 0)
    : (dailyTimeGoal > 0 ? (readingTimeToday / 60) / dailyTimeGoal : 0);

  const percent = Math.min(100, Math.round(progressRatio * 100));
  const isGoalReached = percent >= 100;

  // Circular gauge calculations (SVG radius = 48, circumference = 2 * PI * 48 ≈ 301.59)
  const RADIUS = 48;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;

  // Trigger celebration on reaching goal for the first time in session
  useEffect(() => {
    if (isGoalReached && (countToday > 0 || readingTimeToday > 0)) {
      const triggeredToday = localStorage.getItem(`goal_celebration_${todayStr}`);
      if (!triggeredToday) {
        setShowCelebration(true);
        localStorage.setItem(`goal_celebration_${todayStr}`, 'true');
        const timer = setTimeout(() => setShowCelebration(false), 6000);
        return () => clearTimeout(timer);
      }
    }
  }, [isGoalReached, countToday, readingTimeToday, todayStr]);

  const handleUpdateGoal = (amount: number) => {
    if (goalType === 'chapters') {
      const nextGoal = Math.max(1, Math.min(20, dailyGoal + amount));
      setDailyGoal(nextGoal);
      localStorage.setItem('bible_daily_goal', String(nextGoal));
    } else {
      const nextGoal = Math.max(5, Math.min(120, dailyTimeGoal + (amount * 5)));
      setDailyTimeGoal(nextGoal);
      localStorage.setItem('bible_daily_goal_time', String(nextGoal));
    }
  };

  const handleAddManualTime = (minutes: number) => {
    setReadingTimeToday(prev => {
      const nextTime = prev + (minutes * 60);
      let durations: Record<string, number> = {};
      const savedDurations = localStorage.getItem('bible_reading_durations_by_day');
      if (savedDurations) {
        try {
          durations = JSON.parse(savedDurations);
        } catch (e) {}
      }
      durations[todayStr] = nextTime;
      localStorage.setItem('bible_reading_durations_by_day', JSON.stringify(durations));
      return nextTime;
    });
  };

  return (
    <div className="bg-[#12100c] border border-[#2e2a1e] rounded-[2rem] p-5 sm:p-6 space-y-5 select-none relative overflow-hidden text-left shadow-soft">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#c9a84c]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

      {/* Goal Celebration Overlay Banner */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute inset-0 bg-[#0d0b07]/95 border border-[#c9a84c]/30 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center z-30 shadow-gold-glow"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#c9a84c]/15 via-transparent to-transparent opacity-80"></div>
            <div className="relative z-20 space-y-2.5 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#c9a84c]/20 border border-[#c9a84c]/40 flex items-center justify-center text-[#c9a84c] mx-auto animate-bounce shadow-gold-glow">
                <Crown className="w-6 h-6" />
              </div>
              <h4 className="font-serif font-extrabold text-[#c9a84c] text-base sm:text-lg uppercase tracking-wider">
                Objectif Quotidien Accompli !
              </h4>
              <p className="text-xs text-[#e8e0d0] font-serif italic leading-relaxed">
                « Celui qui persévère dans la vérité verra sa foi couronnée de lumière et de discernement. »
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1a1712] border border-[#c9a84c]/40 rounded-full text-[10px] font-mono text-[#c9a84c] font-bold uppercase tracking-wider mt-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {goalType === 'chapters' 
                    ? `${countToday} / ${dailyGoal} chapitres lus aujourd'hui (100%)`
                    : `${minutesToday} min de méditation accomplies (100%)`
                  }
                </span>
              </div>
              <div>
                <button 
                  onClick={() => setShowCelebration(false)}
                  className="mt-3 px-4 py-1.5 bg-[#c9a84c] hover:bg-[#dfba5a] text-[#0d0b07] rounded-xl text-xs font-serif font-bold tracking-wider uppercase transition cursor-pointer shadow-md"
                >
                  Continuer la lecture
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP SECTION: CIRCULAR RADIAL GAUGE + HERO PROGRESS METRICS */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-2">
        {/* 1. CIRCULAR RADIAL GAUGE */}
        <div className="flex items-center gap-5 shrink-0">
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center">
            {/* Background circular glow */}
            <div 
              className={`absolute inset-2 rounded-full transition-all duration-700 pointer-events-none ${
                isGoalReached 
                  ? 'bg-emerald-500/15 blur-xl' 
                  : percent > 0 
                    ? 'bg-[#c9a84c]/15 blur-lg' 
                    : 'bg-transparent'
              }`}
            />

            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="dailyGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#dfba5a" />
                  <stop offset="60%" stopColor="#c9a84c" />
                  <stop offset="100%" stopColor={isGoalReached ? '#10b981' : '#f59e0b'} />
                </linearGradient>
                <filter id="gaugeShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#c9a84c" floodOpacity="0.4"/>
                </filter>
              </defs>

              {/* Background track circle */}
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="transparent"
                stroke="#1b1711"
                strokeWidth="10"
                className="transition-all"
              />

              {/* Tick marks around track */}
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="transparent"
                stroke="#2a2419"
                strokeWidth="10"
                strokeDasharray="2 12"
                className="opacity-40"
              />

              {/* Animated Progress Arc */}
              <motion.circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="transparent"
                stroke="url(#dailyGaugeGrad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                initial={{ strokeDashoffset: CIRCUMFERENCE }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                filter={percent > 0 ? "url(#gaugeShadow)" : undefined}
              />
            </svg>

            {/* Inner Gauge Center Details */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              {isGoalReached ? (
                <Crown className="w-4 h-4 text-emerald-400 mb-0.5 animate-bounce" />
              ) : percent > 0 ? (
                <Flame className="w-4 h-4 text-[#c9a84c] mb-0.5 animate-pulse" />
              ) : (
                <BookOpen className="w-4 h-4 text-[#6b6355] mb-0.5" />
              )}

              <span className="font-mono font-black text-2xl sm:text-3xl text-[#e8e0d0] leading-none tracking-tight">
                {percent}%
              </span>

              <span className={`text-[8.5px] font-mono font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded ${
                isGoalReached 
                  ? 'text-emerald-300 bg-emerald-500/20' 
                  : percent > 0 
                    ? 'text-[#c9a84c] bg-[#c9a84c]/10' 
                    : 'text-[#6b6355]'
              }`}>
                {isGoalReached 
                  ? 'Accompli' 
                  : (goalType === 'chapters' ? `${countToday}/${dailyGoal} ch.` : `${minutesToday}/${dailyTimeGoal} min`)
                }
              </span>
            </div>
          </div>

          {/* Side title & quick summary for mobile / compact */}
          <div className="space-y-1 block md:hidden">
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#c9a84c] uppercase font-bold tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>Progression Quotidienne</span>
            </div>
            <h3 className="font-serif font-extrabold text-base text-[#e8e0d0]">
              {goalType === 'chapters' ? `${countToday} / ${dailyGoal} chapitres` : `${minutesToday} / ${dailyTimeGoal} min`}
            </h3>
            <p className="text-[10px] text-[#8e8574]">
              {isGoalReached 
                ? 'Objectif du jour complété !' 
                : goalType === 'chapters' 
                  ? `Plus que ${Math.max(0, dailyGoal - countToday)} ch. à lire` 
                  : `Plus que ${Math.max(0, dailyTimeGoal - minutesToday)} min restantes`
              }
            </p>
          </div>
        </div>

        {/* 2. CONTROLS, TARGET CHANGER & STREAK BADGE */}
        <div className="flex-1 w-full space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="hidden md:block">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-[#c9a84c] animate-pulse"></span>
                <span className="text-[9.5px] font-mono uppercase tracking-widest text-[#c9a84c] font-bold">
                  Indicateur de Progression Quotidienne
                </span>
              </div>
              <h3 className="text-lg font-serif font-extrabold text-[#e8e0d0] tracking-tight">
                {goalType === 'chapters' ? (
                  <>Lecture du jour : <span className="text-[#c9a84c]">{countToday}</span> / {dailyGoal} chapitres</>
                ) : (
                  <>Temps du jour : <span className="text-[#c9a84c]">{minutesToday} min {secondsLeft}s</span> / {dailyTimeGoal} min</>
                )}
              </h3>
            </div>

            {/* Streak Counter Chip */}
            {currentStreak > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#c9a84c]/10 border border-[#c9a84c]/30 text-[#c9a84c] text-xs font-mono font-bold">
                <Flame className="w-3.5 h-3.5 fill-[#c9a84c]" />
                <span>{currentStreak} JOUR{currentStreak > 1 ? 'S' : ''} DE SÉRIE</span>
              </div>
            )}
          </div>

          {/* MODE SELECTOR (CHAPITRES / TEMPS) & TARGET DIAL */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Goal Type Switcher */}
            <div className="flex bg-[#181510] border border-[#2e2a1e] rounded-xl p-1 gap-1 flex-1">
              <button
                onClick={() => {
                  setGoalType('chapters');
                  localStorage.setItem('bible_daily_goal_type', 'chapters');
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  goalType === 'chapters'
                    ? 'bg-[#c9a84c] text-[#0d0b07] shadow-gold-glow'
                    : 'text-[#8e8574] hover:text-[#e8e0d0] hover:bg-[#201b13]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Chapitres</span>
              </button>

              <button
                onClick={() => {
                  setGoalType('time');
                  localStorage.setItem('bible_daily_goal_type', 'time');
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  goalType === 'time'
                    ? 'bg-[#c9a84c] text-[#0d0b07] shadow-gold-glow'
                    : 'text-[#8e8574] hover:text-[#e8e0d0] hover:bg-[#201b13]'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Temps de lecture</span>
              </button>
            </div>

            {/* Target Dial (- / +) */}
            <div className="flex items-center gap-2 bg-[#181510] border border-[#2e2a1e] rounded-xl px-3 py-1.5 justify-between sm:justify-start">
              <span className="text-[9px] font-mono text-[#6b6355] uppercase font-bold sm:hidden">
                Objectif visé :
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleUpdateGoal(-1)}
                  disabled={goalType === 'chapters' ? dailyGoal <= 1 : dailyTimeGoal <= 5}
                  className="p-1 rounded-lg text-[#8e8574] hover:text-[#c9a84c] hover:bg-[#201b13] disabled:opacity-30 disabled:hover:text-[#8e8574] transition cursor-pointer"
                  title="Diminuer l'objectif"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                
                <div className="text-center min-w-[55px]">
                  <p className="text-xs font-mono font-bold text-[#c9a84c] leading-none">
                    {goalType === 'chapters' ? `${dailyGoal} ch.` : `${dailyTimeGoal} min`}
                  </p>
                  <span className="text-[7px] font-mono text-[#6b6355] uppercase tracking-wider block mt-0.5">
                    / jour
                  </span>
                </div>

                <button 
                  onClick={() => handleUpdateGoal(1)}
                  disabled={goalType === 'chapters' ? dailyGoal >= 20 : dailyTimeGoal >= 120}
                  className="p-1 rounded-lg text-[#8e8574] hover:text-[#c9a84c] hover:bg-[#201b13] disabled:opacity-30 disabled:hover:text-[#8e8574] transition cursor-pointer"
                  title="Augmenter l'objectif"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Navigate Button to Reader if provided */}
            {onNavigateToReader && (
              <button
                onClick={onNavigateToReader}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 bg-[#c9a84c]/15 hover:bg-[#c9a84c]/25 border border-[#c9a84c]/40 text-[#c9a84c] rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition cursor-pointer shrink-0"
              >
                <span>Lire</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* HORIZONTAL ILLUMINATED PROGRESS TRACK WITH MILESTONES */}
      <div className="space-y-2 pt-2 border-t border-[#2e2a1e]/60">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[#8e8574] text-[10px] uppercase tracking-wider">État :</span>
            {isGoalReached ? (
              <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1 py-0.5 px-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-[9px]">
                <CheckCircle2 className="w-3 h-3" /> Objectif Sacré Complété (100%)
              </span>
            ) : percent > 0 ? (
              <span className="text-[#c9a84c] font-bold uppercase tracking-wider flex items-center gap-1 py-0.5 px-2 bg-[#c9a84c]/10 rounded-lg border border-[#c9a84c]/20 text-[9px]">
                <Flame className="w-3 h-3 animate-pulse" /> En bonne voie ({percent}%)
              </span>
            ) : (
              <span className="text-[#6b6355] uppercase tracking-wider text-[9px] py-0.5 px-2 bg-[#181510] rounded-lg border border-[#2e2a1e]">
                En attente de méditation (0%)
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-[#e8e0d0] font-bold text-xs font-mono">
              {percent}%
            </span>
            <span className="text-[10px] text-[#6b6355] ml-1">
              ({goalType === 'chapters' ? `${countToday}/${dailyGoal} ch.` : `${minutesToday}/${dailyTimeGoal} min`})
            </span>
          </div>
        </div>

        {/* The Track with Milestones Markers */}
        <div className="relative pt-1 pb-4">
          <div className="w-full h-3.5 bg-[#0d0b07] border border-[#2e2a1e] rounded-full overflow-hidden p-[2px] relative shadow-inner">
            <motion.div 
              className={`h-full rounded-full relative overflow-hidden transition-all ${
                isGoalReached 
                  ? 'bg-gradient-to-r from-[#c9a84c] via-emerald-400 to-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
                  : 'bg-gold-gradient shadow-[0_0_12px_rgba(201,168,76,0.3)]'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* Animated Light Sweep / Shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer"></div>
            </motion.div>
          </div>

          {/* 4 Milestones Markers: 25%, 50%, 75%, 100% */}
          <div className="relative w-full flex justify-between px-1 mt-1 text-[8.5px] font-mono text-[#6b6355]">
            <span className={`transition-colors ${percent >= 25 ? 'text-[#c9a84c] font-bold' : ''}`}>25%</span>
            <span className={`transition-colors ${percent >= 50 ? 'text-[#c9a84c] font-bold' : ''}`}>50%</span>
            <span className={`transition-colors ${percent >= 75 ? 'text-[#c9a84c] font-bold' : ''}`}>75%</span>
            <span className={`transition-colors flex items-center gap-0.5 ${percent >= 100 ? 'text-emerald-400 font-bold' : ''}`}>
              100% {percent >= 100 && '👑'}
            </span>
          </div>
        </div>
      </div>

      {/* MANUAL TIME LOGGING PANEL (IF TIME GOAL ACTIVE) */}
      {goalType === 'time' && (
        <div className="bg-[#181510] border border-[#2e2a1e] rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#c9a84c]" />
            <span className="text-[10px] font-mono text-[#a0947f] uppercase tracking-wide">
              Ajouter du temps (Lecture Bible papier ou audio)
            </span>
          </div>
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
            <button
              onClick={() => handleAddManualTime(1)}
              className="px-2.5 py-1 bg-[#12100c] hover:bg-[#c9a84c]/10 text-[#c9a84c] border border-[#2e2a1e] hover:border-[#c9a84c]/30 rounded-lg text-[9px] font-mono font-bold tracking-wider transition cursor-pointer"
            >
              +1 min
            </button>
            <button
              onClick={() => handleAddManualTime(5)}
              className="px-2.5 py-1 bg-[#12100c] hover:bg-[#c9a84c]/10 text-[#c9a84c] border border-[#2e2a1e] hover:border-[#c9a84c]/30 rounded-lg text-[9px] font-mono font-bold tracking-wider transition cursor-pointer"
            >
              +5 min
            </button>
            <button
              onClick={() => handleAddManualTime(15)}
              className="px-2.5 py-1 bg-[#12100c] hover:bg-[#c9a84c]/10 text-[#c9a84c] border border-[#2e2a1e] hover:border-[#c9a84c]/30 rounded-lg text-[9px] font-mono font-bold tracking-wider transition cursor-pointer"
            >
              +15 min
            </button>
            <button
              onClick={() => {
                setReadingTimeToday(0);
                let durations: Record<string, number> = {};
                const savedDurations = localStorage.getItem('bible_reading_durations_by_day');
                if (savedDurations) {
                  try { durations = JSON.parse(savedDurations); } catch (e) {}
                }
                durations[todayStr] = 0;
                localStorage.setItem('bible_reading_durations_by_day', JSON.stringify(durations));
              }}
              title="Réinitialiser le chrono d'aujourd'hui"
              className="p-1.5 text-[#6b6355] hover:text-rose-400 border border-transparent hover:border-rose-500/20 rounded-lg transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* DYNAMIC SPIRITUAL MOTIVATION TEXT */}
      <div className="pt-2 border-t border-[#2e2a1e]/40 flex items-center justify-between text-[10.5px]">
        <p className="text-[#a0947f] italic font-serif leading-relaxed pr-2">
          {isGoalReached 
            ? "« Votre esprit est nourri de la Parole aujourd'hui. Poursuivez cette admirable fidélité ! »" 
            : goalType === 'chapters' 
              ? (countToday > 0 
                ? `Il vous reste ${dailyGoal - countToday} chapitre${dailyGoal - countToday > 1 ? 's' : ''} à lire pour accomplir votre engagement spirituel.` 
                : "« Un chapitre par jour sanctifie un esprit. Prenez un instant spirituel dans la Parole. »")
              : (readingTimeToday > 0
                ? `Il vous reste environ ${Math.max(1, dailyTimeGoal - minutesToday)} minute${(dailyTimeGoal - minutesToday) > 1 ? 's' : ''} de lecture pour parachever votre objectif.`
                : "« Prenez quelques minutes de recueillement et de lecture pour élever et apaiser votre âme. »")
          }
        </p>

        {isGoalReached && (
          <div className="flex items-center gap-1 py-0.5 px-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 shrink-0 text-[9px] font-mono font-bold">
            <Crown className="w-3 h-3" />
            <span>STREAK SAUVEGARDÉ</span>
          </div>
        )}
      </div>

      {/* ACCORDION VIEW OF CHAPTERS READ TODAY */}
      {countToday > 0 && (
        <div className="bg-[#0d0b07] border border-[#2e2a1e]/60 rounded-2xl p-3.5 text-[10px] space-y-2">
          <div className="flex items-center justify-between text-[8.5px] font-mono text-[#6b6355] uppercase tracking-widest font-bold">
            <span>Chapitres validés aujourd'hui ({countToday}) :</span>
            <span className="text-[#c9a84c]">{todayStr}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {todayReadings.slice().reverse().map((h, index) => (
              <div 
                key={`${h.book_id}_${h.chapter}_${index}`}
                className="flex items-center gap-2 py-1.5 px-2.5 rounded-xl bg-[#14120e] border border-[#2e2a1e]/50 text-[#e8e0d0] font-serif"
              >
                <div className="w-2 h-2 rounded-full bg-[#c9a84c] shrink-0" />
                <span className="truncate text-xs font-bold">{h.book_name} {h.chapter}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
