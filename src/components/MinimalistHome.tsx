import React from 'react';
import { Play } from 'lucide-react';
import { ReadingHistory } from '../types/bible';
import { getChapterMaxVerses } from '../data/bibleChapterVerseCounts';

interface MinimalistHomeProps {
  readingHistory?: ReadingHistory[];
  onNavigateToChapter?: (bookId: number, chapterNum: number, verseNum?: number) => void;
  onNavigateToReader: () => void;
  readingTimeMinutes?: number;
  dailyGoalMinutes?: number;
  currentStreak?: number;
  dailyVerse?: {
    text: string;
    reference: string;
  };
}

export const MinimalistHome: React.FC<MinimalistHomeProps> = ({
  readingHistory = [],
  onNavigateToChapter,
  onNavigateToReader,
  readingTimeMinutes = 43,
  dailyGoalMinutes = 15,
  dailyVerse = {
    text: "Quand je marche dans la vallée de l'ombre de la mort, je ne crains aucun mal, car tu es avec moi: ta houlette et ton bâton me rassurent.",
    reference: "Psaumes 23:4"
  }
}) => {
  // Obtenir le dernier passage lu ou Proverbes 6 / Actes 3 par défaut
  const latestReading = readingHistory && readingHistory.length > 0
    ? [...readingHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    : null;

  const getResumeInfo = () => {
    if (latestReading && latestReading.book_name && latestReading.chapter) {
      const vNum = Math.min(Math.max(1, latestReading.last_verse || 1), getChapterMaxVerses(latestReading.book_id, latestReading.chapter));
      return {
        label: `Reprendre : ${latestReading.book_name} ${latestReading.chapter}`,
        bookId: latestReading.book_id,
        chapter: latestReading.chapter,
        verse: vNum
      };
    }
    try {
      const saved = localStorage.getItem('bible_last_reading_position');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.book_name && parsed.chapter) {
          return {
            label: `Reprendre : ${parsed.book_name} ${parsed.chapter}`,
            bookId: parsed.book_id,
            chapter: parsed.chapter,
            verse: parsed.verse || 1
          };
        }
      }
    } catch (_) {}
    return {
      label: "Reprendre : Proverbes 6",
      bookId: 20, // Proverbes
      chapter: 6,
      verse: 1
    };
  };

  const resumeInfo = getResumeInfo();

  const handleResume = () => {
    if (onNavigateToChapter && resumeInfo.bookId) {
      onNavigateToChapter(resumeInfo.bookId, resumeInfo.chapter, resumeInfo.verse);
    } else {
      onNavigateToReader();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-5 py-8 sm:py-16 flex flex-col items-center justify-center min-h-[70vh] text-center select-none space-y-10 sm:space-y-12 animate-fade-in">
      
      {/* 1. UN SEUL GRAND VERSET DU JOUR, CENTRÉ, AVEC RÉFÉRENCE EN DESSOUS */}
      <div className="space-y-4 max-w-lg mx-auto">
        <p 
          className="text-app italic font-serif text-xl sm:text-2xl md:text-3xl leading-relaxed sm:leading-relaxed selection:bg-accent/20"
          style={{ fontFamily: 'var(--font-reading)' }}
        >
          « {dailyVerse.text} »
        </p>

        <span className="text-sm font-sans font-medium text-accent tracking-wide block">
          {dailyVerse.reference}
        </span>
      </div>

      {/* 2. GROS BOUTON « REPRENDRE : [PASSAGE] » & LIGNE DE PROGRESSION */}
      <div className="w-full max-w-md space-y-3.5">
        <button
          type="button"
          onClick={handleResume}
          className="w-full min-h-[54px] py-4 px-6 rounded-2xl bg-surface hover:bg-surface-hover border border-app text-app hover:text-accent transition-all duration-200 cursor-pointer shadow-sm active:scale-98 flex items-center justify-center gap-2.5 font-medium text-base sm:text-lg"
        >
          <Play className="w-4 h-4 fill-current text-accent" />
          <span>{resumeInfo.label}</span>
        </button>

        {/* 3. UNE PETITE LIGNE DE PROGRESSION (ex. « 43 / 15 min ») */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted font-sans">
          <span>{readingTimeMinutes} / {dailyGoalMinutes} min</span>
        </div>
      </div>

    </div>
  );
};
