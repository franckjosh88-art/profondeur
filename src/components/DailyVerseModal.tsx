import React from 'react';
import { Sun, BookOpen, X, Share2, Sparkles, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DailyVerse } from '../types/bible';

interface DailyVerseModalProps {
  isOpen: boolean;
  dailyVerse: DailyVerse;
  onClose: () => void;
  onNavigateToPassage: (bookId: number, chapter: number, verse: number) => void;
}

export const DailyVerseModal: React.FC<DailyVerseModalProps> = ({
  isOpen,
  dailyVerse,
  onClose,
  onNavigateToPassage
}) => {
  const handleShare = () => {
    const text = `« ${dailyVerse.verse.text} » — ${dailyVerse.verse.book_name} ${dailyVerse.verse.chapter}:${dailyVerse.verse.verse}`;
    if (navigator.share) {
      navigator.share({
        title: 'Verset du Jour',
        text: text
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.9),0_0_20px_rgba(201,168,76,0.15)] p-6 border border-[#2e2a1e] bg-[#0c0a07] text-[#e8e0d0] text-left space-y-5 relative"
          >
            {/* Bouton fermer */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#8c8270] hover:text-[#c9a84c] hover:bg-[#1a1712] transition cursor-pointer"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* En-tête */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30 flex items-center justify-center">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-[#c9a84c] uppercase font-bold block">
                  INSPIRATION DU JOUR
                </span>
                <h3 className="font-serif font-black text-lg text-[#f4efe2]">
                  Verset du Jour
                </h3>
              </div>
            </div>

            {/* Carte du verset */}
            <div className="p-5 rounded-2xl border border-[#2e2a1e] bg-[#050403] space-y-3 shadow-inner">
              <Quote className="w-6 h-6 text-[#c9a84c]/50" />
              <p className="font-serif italic text-base sm:text-lg leading-relaxed text-[#f4efe2] select-text">
                « {dailyVerse.verse.text} »
              </p>
              <div className="pt-2 border-t border-[#2e2a1e]/60 flex items-center justify-between">
                <span className="font-serif font-black text-xs text-[#c9a84c] tracking-wider uppercase">
                  {dailyVerse.verse.book_name} {dailyVerse.verse.chapter}:{dailyVerse.verse.verse}
                </span>
                <span className="text-[10px] font-mono text-[#8c8270]">
                  Louis Segond 1910
                </span>
              </div>
            </div>

            {/* Thème & pensée */}
            {dailyVerse.theme && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#12100c] border border-[#2e2a1e] text-xs font-mono text-[#ebd092]">
                <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />
                <span>Thème spirituel : <strong className="text-[#f4efe2]">{dailyVerse.theme}</strong></span>
              </div>
            )}

            {/* Boutons d'actions */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                onClick={handleShare}
                className="flex-1 py-2.5 px-4 rounded-xl border border-[#2e2a1e] hover:border-[#c9a84c]/40 bg-[#12100c] hover:bg-[#1a1712] text-[#8c8270] hover:text-[#c9a84c] text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Partager</span>
              </button>

              <button
                onClick={() => {
                  onNavigateToPassage(
                    dailyVerse.verse.book_id,
                    dailyVerse.verse.chapter,
                    dailyVerse.verse.verse
                  );
                  onClose();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#c9a84c] hover:bg-[#ebd092] text-[#050403] text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
              >
                <BookOpen className="w-4 h-4" />
                <span>Lire dans le contexte</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
