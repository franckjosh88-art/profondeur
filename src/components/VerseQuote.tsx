import React from 'react';

interface VerseQuoteProps {
  text: string;
  book: string;
  chapter: number;
  verse: number;
  onExplainPress?: () => void;
}

export const VerseQuote: React.FC<VerseQuoteProps> = ({
  text,
  book,
  chapter,
  verse,
  onExplainPress
}) => {
  // Clean translation markers from the text if present
  const cleanText = text.replace(/\[[HG]\d+\]/g, '').trim();

  return (
    <div className="flex flex-col items-center justify-center text-center py-8 px-6 bg-luxury-bg rounded-[2rem] border border-luxury-border/30 shadow-gold-glow relative overflow-hidden select-none">
      {/* Decorative Golden Star glow background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-luxury-gold/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Decorative top gold ornament */}
      <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-luxury-gold to-transparent mb-6"></div>

      {/* Main Quote */}
      <p 
        className="font-serif italic text-luxury-text-verse leading-relaxed mb-6 px-1 tracking-wide"
        style={{ fontSize: '24px', textShadow: '0 0 15px rgba(201, 168, 76, 0.25)' }}
      >
        « {cleanText} »
      </p>

      {/* Reference name */}
      <span className="font-serif text-[11px] uppercase tracking-[0.2em] text-luxury-text-muted font-bold">
        {book} · {chapter} : {verse}
      </span>

      {/* Bottom border line */}
      <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-luxury-gold/40 to-transparent mt-6"></div>
      
      {onExplainPress && (
        <button
          onClick={onExplainPress}
          className="mt-4 px-4 py-1.5 bg-luxury-button-bg hover:bg-luxury-gold/20 text-luxury-gold border border-luxury-gold/30 rounded-full text-[10px] font-bold tracking-widest uppercase transition flex items-center gap-1 shadow-sm"
        >
          <span>❖ LIRE L'EXÉGÈSE</span>
        </button>
      )}
    </div>
  );
};
