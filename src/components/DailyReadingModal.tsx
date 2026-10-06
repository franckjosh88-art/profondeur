import React from 'react';
import { Calendar, CheckCircle2, Clock, BookOpen, X, Award, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ReadingHistory } from '../types/bible';

interface DailyReadingModalProps {
  isOpen: boolean;
  readingHistory: ReadingHistory[];
  readingTimeToday: number;
  dailyTimeGoal: number;
  currentStreak: number;
  onClose: () => void;
  onNavigateToChapter: (bookId: number, chapter: number, verse?: number) => void;
}

export const DailyReadingModal: React.FC<DailyReadingModalProps> = ({
  isOpen,
  readingHistory,
  readingTimeToday,
  dailyTimeGoal,
  currentStreak,
  onClose,
  onNavigateToChapter
}) => {
  const percent = Math.min(100, Math.round((readingTimeToday / (dailyTimeGoal || 15)) * 100));

  const sortedHistory = [...readingHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-xl rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.9),0_0_20px_rgba(201,168,76,0.15)] flex flex-col max-h-[85vh] overflow-hidden border border-[#2e2a1e] bg-[#0c0a07] text-[#e8e0d0] text-left"
          >
            {/* EN-TÊTE */}
            <div className="p-4 border-b border-[#2e2a1e] flex items-center justify-between bg-[#12100c]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-base text-[#f4efe2]">
                    Lecture du Jour & Progression
                  </h3>
                  <span className="text-[10px] font-mono text-[#8c8270] block">
                    Discipline & méditation biblique
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#8c8270] hover:text-[#c9a84c] hover:bg-[#1a1712] transition cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STATS DU JOUR */}
            <div className="p-4 border-b border-[#2e2a1e] bg-[#050403] space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-[#2e2a1e] bg-[#12100c] flex items-center gap-3">
                  <Clock className="w-5 h-5 text-[#c9a84c] shrink-0" />
                  <div>
                    <span className="text-[9px] font-mono uppercase text-[#8c8270] block">Temps Aujourd'hui</span>
                    <span className="text-base font-serif font-bold text-[#f4efe2]">
                      {readingTimeToday} <span className="text-xs text-[#8c8270]">/ {dailyTimeGoal} min</span>
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-[#2e2a1e] bg-[#12100c] flex items-center gap-3">
                  <Award className="w-5 h-5 text-[#c9a84c] shrink-0" />
                  <div>
                    <span className="text-[9px] font-mono uppercase text-[#8c8270] block">Série Active</span>
                    <span className="text-base font-serif font-bold text-[#c9a84c]">
                      {currentStreak} {currentStreak > 1 ? 'jours' : 'jour'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Jauge de progression */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-[#8c8270]">Objectif quotidien : {percent}%</span>
                  <span className="text-[#c9a84c] font-bold">{percent >= 100 ? 'Complété ! ✨' : `${dailyTimeGoal - readingTimeToday} min restantes`}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#12100c] border border-[#2e2a1e] overflow-hidden">
                  <div
                    className="h-full bg-[#c9a84c] transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* HISTORIQUE RÉCENT */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scroller-thin">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#8c8270] block">
                Chapitres Récemment Consultés
              </span>

              {sortedHistory.length === 0 ? (
                <div className="py-12 text-center text-[#8c8270] space-y-2">
                  <BookOpen className="w-10 h-10 mx-auto opacity-30 stroke-[1.5]" />
                  <p className="text-xs font-mono">Aucun historique de lecture pour le moment</p>
                  <p className="text-[10px] text-[#8c8270]/80">Commencez la lecture pour enregistrer votre parcours.</p>
                </div>
              ) : (
                sortedHistory.map((item, idx) => (
                  <button
                    key={`${item.book_id}_${item.chapter}_${idx}`}
                    onClick={() => {
                      onNavigateToChapter(item.book_id, item.chapter, item.last_verse || 1);
                      onClose();
                    }}
                    className="w-full p-3 rounded-xl border border-[#2e2a1e] bg-[#12100c] hover:border-[#c9a84c]/50 hover:bg-[#16130e] transition flex items-center justify-between text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#c9a84c]/10 text-[#c9a84c] flex items-center justify-center font-serif font-black text-xs">
                        {item.chapter}
                      </div>
                      <div>
                        <span className="text-xs font-serif font-bold text-[#f4efe2] group-hover:text-[#c9a84c] transition">
                          {item.book_name} {item.chapter}
                        </span>
                        <span className="text-[9.5px] font-mono text-[#8c8270] block">
                          Dernier verset lu : {item.last_verse || 1}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-[#8c8270]">
                        {new Date(item.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#8c8270] group-hover:text-[#c9a84c] group-hover:translate-x-0.5 transition" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
