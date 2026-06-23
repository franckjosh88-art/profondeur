import React from 'react';
import { motion } from 'motion/react';
import { History, Play, Bookmark, Calendar, ArrowRight } from 'lucide-react';
import { ReadingHistory } from '../types/bible';

interface RecentlyReadChaptersProps {
  readingHistory: ReadingHistory[];
  onNavigateToChapter: (bookId: number, chapterNum: number) => void;
}

export const RecentlyReadChapters: React.FC<RecentlyReadChaptersProps> = ({ 
  readingHistory, 
  onNavigateToChapter 
}) => {
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
      if (diffDays < 7) return `Il y a ${diffDays} jours`;
      
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch (_) {
      return "Récemment";
    }
  };

  return (
    <div className="bg-[#12100c] border border-[#2e2a1e] rounded-2xl p-5 space-y-4 select-none relative overflow-hidden text-left shadow-soft">
      {/* Background radial gold glow */}
      <div className="absolute top-0 left-0 w-24 h-24 bg-[#c9a84c]/5 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#2e2a1e]/40">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl border border-[#2e2a1e] bg-[#1a1712] flex items-center justify-center text-[#c9a84c]">
            <History className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="font-serif font-extrabold text-[13px] text-[#e8e0d0] tracking-tight">Reprendre la Lecture</h4>
            <p className="text-[10px] text-[#6b6355] font-mono uppercase tracking-wider mt-0.5">Chapitres consultés récemment</p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-[#c9a84c] font-bold bg-[#c9a84c]/10 border border-[#c9a84c]/20 px-2.5 py-0.5 rounded-full">
          {uniqueHistory.length} unique{uniqueHistory.length > 1 ? 's' : ''}
        </span>
      </div>

      {uniqueHistory.length === 0 ? (
        <div className="py-6 text-center text-[#6b6355] space-y-2">
          <p className="text-xs font-serif italic">« Votre journal de lecture est encore vierge. »</p>
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#6b6355]/70">Commencez à lire un chapitre pour enregistrer votre historique.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 scroller-thin">
          {uniqueHistory.slice(0, 5).map((item, index) => (
            <div 
              key={`${item.book_id}_${item.chapter}_${index}`}
              className="group flex items-center justify-between p-3 rounded-xl bg-[#1a1712] border border-[#2e2a1e]/50 hover:border-[#c9a84c]/30 transition-all duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0d0b07] border border-[#2e2a1e] text-[#6b6355] group-hover:text-[#c9a84c] group-hover:border-[#c9a84c]/20 flex items-center justify-center transition-all duration-300">
                  <Bookmark className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <h5 className="font-serif font-bold text-[12px] text-[#e8e0d0] group-hover:text-[#c9a84c] transition duration-200">
                    {item.book_name} {item.chapter}
                  </h5>
                  <div className="flex items-center gap-1.5 text-[9px] text-[#6b6355] font-mono">
                    <Calendar className="w-3 h-3 text-[#c9a84c]/60" />
                    <span>{formatRelativeTime(item.timestamp)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onNavigateToChapter(item.book_id, item.chapter)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d0b07] border border-[#2e2a1e] text-[#c9a84c] group-hover:bg-[#c9a84c] group-hover:text-[#0d0b07] text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer"
              >
                <span>Reprendre</span>
                <Play className="w-2.5 h-2.5 fill-current" />
              </button>
            </div>
          ))}
          {uniqueHistory.length > 5 && (
            <p className="text-[9px] text-center text-[#6b6355] italic pt-1">
              Affichage des 5 chapitres les plus récents
            </p>
          )}
        </div>
      )}
    </div>
  );
};
