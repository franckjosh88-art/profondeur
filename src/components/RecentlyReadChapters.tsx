import React, { useState } from 'react';
import { motion } from 'motion/react';
import { History, Play, Bookmark, Calendar, Clock, CheckCircle2, BookOpen, Layers } from 'lucide-react';
import { ReadingHistory } from '../types/bible';

interface RecentlyReadChaptersProps {
  readingHistory: ReadingHistory[];
  onNavigateToChapter: (bookId: number, chapterNum: number, verseNum?: number) => void;
}

export const RecentlyReadChapters: React.FC<RecentlyReadChaptersProps> = ({ 
  readingHistory, 
  onNavigateToChapter 
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'in_progress' | 'completed'>('all');

  // Sort history by timestamp descending (newest first)
  const sortedHistory = [...readingHistory].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  // Get unique chapters so they can resume easily
  const uniqueHistory: ReadingHistory[] = [];
  const seenKeys = new Set<string>();

  for (const item of sortedHistory) {
    const key = `${item.book_id}_${item.chapter}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueHistory.push(item);
    }
  }

  // Filter history
  const filteredHistory = uniqueHistory.filter(item => {
    const isCompleted = item.status === 'complete' || (item.last_verse && item.total_verses && item.last_verse >= item.total_verses);
    if (filterMode === 'completed') return isCompleted;
    if (filterMode === 'in_progress') return !isCompleted;
    return true;
  });

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      if (diffDays === 1) return "Hier";
      if (diffDays < 7) return `Il y a ${diffDays} j`;
      
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch (_) {
      return "Récemment";
    }
  };

  const formatTimeSpent = (seconds?: number) => {
    if (!seconds || seconds <= 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-[#12100c] border border-[#2e2a1e] rounded-2xl p-5 space-y-4 select-none relative overflow-hidden text-left shadow-soft">
      {/* Background radial gold glow */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-[#c9a84c]/5 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#2e2a1e]/40">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl border border-[#2e2a1e] bg-[#1a1712] flex items-center justify-center text-[#c9a84c]">
            <History className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="font-serif font-extrabold text-[13px] text-[#e8e0d0] tracking-tight">Suivi de Progression par Chapitre</h4>
            <p className="text-[10px] text-[#6b6355] font-mono uppercase tracking-wider mt-0.5">Reprise exacte au dernier verset lu</p>
          </div>
        </div>

        {/* Filter modes */}
        <div className="flex items-center gap-1 bg-[#0d0b07] border border-[#2e2a1e] p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase font-bold transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[#c9a84c] text-[#0d0b07]'
                : 'text-[#6b6355] hover:text-[#e8e0d0]'
            }`}
          >
            Tous ({uniqueHistory.length})
          </button>
          <button
            onClick={() => setFilterMode('in_progress')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase font-bold transition cursor-pointer ${
              filterMode === 'in_progress'
                ? 'bg-[#c9a84c] text-[#0d0b07]'
                : 'text-[#6b6355] hover:text-[#e8e0d0]'
            }`}
          >
            En cours
          </button>
          <button
            onClick={() => setFilterMode('completed')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase font-bold transition cursor-pointer ${
              filterMode === 'completed'
                ? 'bg-[#c9a84c] text-[#0d0b07]'
                : 'text-[#6b6355] hover:text-[#e8e0d0]'
            }`}
          >
            Complétés
          </button>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="py-8 text-center text-[#6b6355] space-y-2">
          <Layers className="w-6 h-6 mx-auto text-[#2e2a1e]" />
          <p className="text-xs font-serif italic">« Aucun chapitre dans cette catégorie. »</p>
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#6b6355]/70">Lisez un chapitre pour enregistrer votre progression exacte.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scroller-thin">
          {filteredHistory.map((item, index) => {
            const lastVerse = item.last_verse || 1;
            const totalVerses = item.total_verses || 1;
            const isCompleted = item.status === 'complete' || lastVerse >= totalVerses;
            const progressPercent = isCompleted ? 100 : Math.min(100, Math.round((lastVerse / totalVerses) * 100));
            const durationStr = formatTimeSpent(item.time_spent_seconds);

            return (
              <div 
                key={`${item.book_id}_${item.chapter}_${index}`}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-[#1a1712] border border-[#2e2a1e]/50 hover:border-[#c9a84c]/40 transition-all duration-300 gap-3"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
                      : 'bg-[#0d0b07] border-[#2e2a1e] text-[#c9a84c] group-hover:border-[#c9a84c]/30'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="font-serif font-extrabold text-[13px] text-[#e8e0d0] group-hover:text-[#c9a84c] transition duration-200 truncate">
                        {item.book_name} · Chapitre {item.chapter}
                      </h5>

                      <span className={`text-[8.5px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                          : 'bg-[#c9a84c]/10 text-[#c9a84c] border-[#c9a84c]/20'
                      }`}>
                        {isCompleted ? 'Complété' : `Verset ${lastVerse} / ${totalVerses}`}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full bg-[#0d0b07] h-1.5 rounded-full overflow-hidden border border-[#2e2a1e]/40">
                        <div 
                          className={`h-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#c9a84c] to-[#e8e0d0]'}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between text-[9px] text-[#6b6355] font-mono pt-0.5">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#c9a84c]/70" />
                            {formatRelativeTime(item.timestamp)}
                          </span>
                          {durationStr && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#c9a84c]/70" />
                              {durationStr}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-[#c9a84c]">{progressPercent}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateToChapter(item.book_id, item.chapter, lastVerse)}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0d0b07] border border-[#2e2a1e] text-[#c9a84c] group-hover:bg-[#c9a84c] group-hover:text-[#0d0b07] text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex-shrink-0"
                  title={`Reprendre ${item.book_name} ${item.chapter} au verset ${lastVerse}`}
                >
                  <span>{isCompleted ? 'Relire' : `Reprendre v. ${lastVerse}`}</span>
                  <Play className="w-3 h-3 fill-current" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
