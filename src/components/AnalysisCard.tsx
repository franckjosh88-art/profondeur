import React from 'react';
import { Sparkles, MessageSquare, BookOpen } from 'lucide-react';
import { cleanBibleMarkdown } from '../lib/bibleFormatter';

interface AnalysisCardProps {
  type: 'linguistic' | 'context' | 'historical';
  title: string;
  content: string;
  strongWords?: { word: string; code: string }[];
  onStrongPress?: (code: string) => void;
}

export const AnalysisCard: React.FC<AnalysisCardProps> = ({
  type,
  title,
  content,
  strongWords = [],
  onStrongPress
}) => {
  const getHeaderLabel = () => {
    switch (type) {
      case 'linguistic':
        return '• ANALYSE LINGUISTIQUE';
      case 'context':
        return '• CONTEXTE SPIRITUEL';
      case 'historical':
        return '• CONTEXTE HISTORIQUE';
      default:
        return '• ÉLUCIDATION BIBLIQUE';
    }
  };

  const getHeaderIcon = () => {
    switch (type) {
      case 'linguistic':
        return <Sparkles className="w-3.5 h-3.5 text-luxury-gold" />;
      case 'context':
        return <BookOpen className="w-3.5 h-3.5 text-luxury-gold" />;
      case 'historical':
        return <MessageSquare className="w-3.5 h-3.5 text-luxury-gold" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-luxury-surface border border-luxury-border rounded-lg p-5 shadow-soft transition-all duration-300 hover:border-luxury-gold/30">
      
      {/* Header section with tiny golden indicator dot */}
      <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-luxury-border/40">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-luxury-gold animate-pulse"></span>
          <span className="font-mono text-[10px] tracking-[0.15em] font-extrabold text-luxury-text-muted uppercase">
            {getHeaderLabel()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 text-[7px] md:text-[8px] font-mono font-bold uppercase tracking-widest text-[#c9a84c] bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded select-none">
            Analyse générée par IA — à vérifier
          </span>
          <div className="opacity-70">{getHeaderIcon()}</div>
        </div>
      </div>

      {title && (
        <h4 className="font-serif text-sm font-bold text-luxury-text-verse mb-2 pr-4 leading-snug">
          {title}
        </h4>
      )}

      {/* Main Analysis content body */}
      <p className="font-reading text-[15.5px] md:text-[16.5px] leading-[25px] md:leading-[28px] text-luxury-text-primary/95 mb-5 whitespace-pre-line">
        {cleanBibleMarkdown(content)}
      </p>

      {/* Clickable Greek/Hebrew Strong words */}
      {strongWords && strongWords.length > 0 && (
        <div className="mt-4 pt-3 border-t border-luxury-border/30">
          <span className="block font-mono text-[9px] tracking-wider text-luxury-text-muted uppercase mb-2">
            Mots originaux repérés :
          </span>
          <div className="flex flex-wrap gap-2">
            {strongWords.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onStrongPress && onStrongPress(item.code)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-luxury-button-bg hover:bg-luxury-gold/20 text-luxury-text-accent font-serif italic text-xs rounded border border-luxury-border/60 transition cursor-pointer"
                title={`Explorer le mot originel ${item.code}`}
              >
                <span>{item.word}</span>
                <span className="font-mono text-[9px] not-italic opacity-60">[{item.code}]</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
