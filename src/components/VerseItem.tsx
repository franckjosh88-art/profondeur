import React, { useState, useEffect } from 'react';
import { Copy, Sparkles, Heart, Check, FileText } from 'lucide-react';
import { Verse } from '../types/bible';

interface VerseItemProps {
  verse: Verse;
  isFavorite: boolean;
  onToggleFavorite: (verse: Verse) => void;
  onExplain: (verse: Verse) => void;
  onStrongClick: (code: string) => void;
  highlightKeyword?: string;
  textSize: number; // 14 to 24px
  lineHeight: number; // proportional
  isSelected: boolean;
  onTap: () => void;
  hasNote: boolean;
  noteText: string;
  onSaveNote: (verse: Verse, noteText: string) => void;
}

export const VerseItem: React.FC<VerseItemProps> = React.memo(({
  verse,
  isFavorite,
  onToggleFavorite,
  onExplain,
  onStrongClick,
  highlightKeyword = "",
  textSize,
  lineHeight,
  isSelected,
  onTap,
  hasNote,
  noteText,
  onSaveNote
}) => {
  const [copied, setCopied] = useState(false);
  const [localNote, setLocalNote] = useState(noteText || "");

  useEffect(() => {
    setLocalNote(noteText || "");
  }, [noteText]);

  // Parse text to find Strong codes like [H7225] or [G3056]
  const parseStrongCodes = (text: string) => {
    const rx = /\[(H\d+|G\d+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = rx.exec(text)) !== null) {
      const matchIndex = match.index;
      // Add preceding text
      if (matchIndex > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, matchIndex)
        });
      }
      // Add strong code
      parts.push({
        type: 'strong',
        content: match[1]
      });
      lastIndex = rx.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }

    // Fallback if no code matches
    if (parts.length === 0) {
      parts.push({ type: 'text', content: text });
    }

    return parts;
  };

  const textParts = parseStrongCodes(verse.text);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid toggling selection or clearing it
    const copyText = `${verse.book_name} ${verse.chapter}:${verse.verse} - "${verse.text}"`;
    navigator.clipboard.writeText(copyText);
    setCopied(true);
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(verse);
  };

  const handleAnalyze = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExplain(verse);
  };

  const highlightText = (content: string, search: string) => {
    if (!search) return <span>{content}</span>;
    const pieces = content.split(new RegExp(`(${search})`, 'gi'));
    return (
      <>
        {pieces.map((piece, i) => 
          piece.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-[#c9a84c]/20 text-[#c9a84c] border-b border-[#c9a84c] font-medium px-0.5 rounded">{piece}</mark>
          ) : (
            <span key={i}>{piece}</span>
          )
        )}
      </>
    );
  };

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
      className={`group relative py-2 px-3 transition-all duration-200 cursor-pointer select-none border-b border-[#2e2a1e]/10 ${
        isSelected 
          ? 'bg-[rgba(201,168,76,0.06)] border-l-2 border-[#c9a84c] rounded-none' 
          : 'border-l-2 border-transparent hover:bg-white/[0.01]'
      }`}
      style={{
        paddingLeft: '12px',
        paddingRight: '12px',
        paddingTop: '8px',
        paddingBottom: '8px',
      }}
    >
      <div className="flex items-start gap-2.5">
        {/* Verse Number aligned elegant top-left superscript style with optional Note icon */}
        <div className="flex flex-col items-center gap-1 select-none font-mono text-[11px] font-extrabold text-[#c9a84c] mt-1 pr-0.5 flex-shrink-0">
          <span>{verse.verse}</span>
          {hasNote && (
            <FileText className="w-3.5 h-3.5 text-[#c9a84c] animate-pulse" title="Ce verset contient une note personnelle" />
          )}
        </div>

        {/* Verse Content Text (crème color, elegant Playfair/serif look) */}
        <div 
          className="flex-1 text-[#e8e0d0] font-serif pr-2" 
          style={{ 
            fontSize: `${textSize}px`, 
            lineHeight: `${lineHeight}px`,
          }}
        >
          <div>
            {textParts.map((part, index) => {
              if (part.type === 'strong') {
                return (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStrongClick(part.content);
                    }}
                    className="mx-1 px-1.5 py-0.5 bg-[#1a1712] hover:bg-[#c9a84c]/20 text-[#c9a84c] rounded font-mono text-[10px] font-bold align-super border border-[#2e2a1e] transition cursor-pointer"
                    title="Consulter l'étymologie originale"
                  >
                    {part.content}
                  </button>
                );
              }
              return (
                <span key={index}>
                  {highlightText(part.content, highlightKeyword)}
                </span>
              );
            })}
          </div>

          {/* Elegant preview of personal note below the text */}
          {hasNote && !isSelected && (
            <div className="mt-2 flex items-start gap-1 pb-1 text-[11.5px] text-[#c9a84c]/85 italic border-l border-[#c9a84c]/40 pl-3">
              <span>{noteText}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar & Editor (shown right below the verse only on tap/selection) */}
      {isSelected && (
        <div className="space-y-3">
          {/* Note Editor */}
          <div className="mt-3 bg-[#110e0a] border border-[#2e2a1e]/60 rounded-xl p-3 space-y-2.5 animate-fade-slide-up text-left">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono tracking-wider text-[#c9a84c] uppercase font-bold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#c9a84c]" /> Note personnelle
              </span>
              {noteText && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveNote(verse, "");
                  }}
                  className="text-[9px] font-mono text-rose-400 hover:text-rose-300 transition uppercase cursor-pointer"
                >
                  Effacer
                </button>
              )}
            </div>
            <textarea
              value={localNote}
              onChange={(e) => {
                setLocalNote(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Rédigez vos notes, prières ou réflexions d'étude sur ce verset..."
              className="w-full h-16 bg-[#16130e] border border-[#2e2a1e] rounded-lg p-2 text-xs text-[#e8e0d0] placeholder-[#6b6355] focus:outline-none focus:border-[#c9a84c] resize-none font-sans"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLocalNote(noteText || "");
                }}
                disabled={localNote === (noteText || "")}
                className="px-2.5 py-1 text-[10px] text-luxury-text-muted hover:text-luxury-text-primary disabled:opacity-40 transition font-mono cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveNote(verse, localNote.trim());
                }}
                disabled={localNote.trim() === (noteText || "").trim()}
                className="px-3 py-1 text-[10px] bg-[#c9a84c] hover:bg-[#b0913e] disabled:bg-[#2e2a1e] disabled:text-[#6b6355] text-[#0d0b07] rounded font-bold font-mono transition cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </div>

          <div className="mx-auto max-w-sm bg-[#1a1712] border border-[#2e2a1e] rounded-lg py-2 px-4 flex items-center justify-around gap-1 animate-fade-slide-up shadow-xl z-20">
            {/* Copier */}
            <button
              onClick={handleCopy}
              className="flex-1 py-1 px-2 rounded hover:bg-white/[0.04] flex items-center justify-center gap-1.5 text-xs font-bold transition duration-150 cursor-pointer text-center"
              style={{ color: copied ? '#c9a84c' : '#6b6355' }}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copié ✓</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="w-[1px] h-4 bg-[#2e2a1e]"></div>

            {/* Sauver */}
            <button
              onClick={handleSave}
              className="flex-1 py-1 px-2 rounded hover:bg-white/[0.04] flex items-center justify-center gap-1.5 text-xs font-bold transition duration-150 cursor-pointer text-center"
              style={{ color: isFavorite ? '#c9a84c' : '#6b6355' }}
            >
              <Heart className="w-3.5 h-3.5" fill={isFavorite ? '#c9a84c' : 'none'} />
              <span>{isFavorite ? 'Sauvé' : 'Sauver'}</span>
            </button>

            {/* Divider */}
            <div className="w-[1px] h-4 bg-[#2e2a1e]"></div>

            {/* Analyser */}
            <button
              onClick={handleAnalyze}
              className="flex-1 py-1 px-2 rounded hover:bg-white/[0.04] flex items-center justify-center gap-1.5 text-xs font-bold transition duration-150 cursor-pointer text-center text-[#c9a84c]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />
              <span>Analyser</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

VerseItem.displayName = 'VerseItem';
