import React, { useRef, useEffect } from 'react';
import { Play, Pause, Bookmark, Copy, Check, FileText, Share2, Volume2 } from 'lucide-react';
import { Verse, Book } from '../types/bible';
import { getChapterSectionTitle } from '../data/chapterSectionTitles';
import { cleanStrongCodes } from '../data/bibleData';

interface BibleReaderViewProps {
  book: Book;
  chapter: number;
  verses: Verse[];
  highlightVerseNum?: number | null;
  textSize?: number;
  isNightMode: boolean;
  isPlayingAudio: boolean;
  onToggleAudio: () => void;
  onSelectVerseTarget?: (verse: Verse) => void;
  onToggleBookmark?: (verse: Verse) => void;
  isFavorite?: (bookId: number, chapter: number, verse: number) => boolean;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
}

export const BibleReaderView: React.FC<BibleReaderViewProps> = ({
  book,
  chapter,
  verses,
  highlightVerseNum,
  textSize = 17,
  isNightMode,
  isPlayingAudio,
  onToggleAudio,
  onSelectVerseTarget,
  onToggleBookmark,
  isFavorite,
  onPrevChapter,
  onNextChapter
}) => {
  const sectionTitle = getChapterSectionTitle(book.id, chapter, book.name);
  const highlightedRef = useRef<HTMLDivElement>(null);
  const [copiedVerseNum, setCopiedVerseNum] = React.useState<number | null>(null);

  // Auto-scroll to highlighted verse if specified
  useEffect(() => {
    if (highlightVerseNum && highlightedRef.current) {
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    }
  }, [highlightVerseNum, chapter, book.id]);

  const handleCopy = (v: Verse, e: React.MouseEvent) => {
    e.stopPropagation();
    const clean = cleanStrongCodes(v.text);
    navigator.clipboard.writeText(`« ${clean} » — ${book.name} ${chapter}:${v.verse}`);
    setCopiedVerseNum(v.verse);
    setTimeout(() => setCopiedVerseNum(null), 2000);
  };

  return (
    <div className={`w-full min-h-screen transition-colors duration-200 relative pb-28 text-left ${
      isNightMode ? 'bg-[#12161A] text-[#E0E8EE]' : 'bg-[#FFFFFF] text-[#1A2228]'
    }`}>
      {/* CONTENEUR CENTRÉ TEXTE MAX MOBILE-FIRST */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7">
        
        {/* EN-TÊTE DU CHAPITRE : LETTRINE ROUGE-BRIQUE & TITRE DE SECTION */}
        <div className="mb-6 sm:mb-8 pb-4 border-b border-[#C0391B]/20 overflow-hidden clearfix">
          {/* Grand Numéro de Chapitre en Lettrine rouge-brique décorative serif */}
          <div className="float-left mr-3 sm:mr-4 select-none leading-none">
            <span className="font-serif font-black text-6xl sm:text-7xl md:text-8xl text-[#C0391B] tracking-tight block drop-shadow-sm">
              {chapter}
            </span>
          </div>

          {/* Titre de section et sous-titre */}
          <div className="pt-1 space-y-1">
            <span className={`text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] font-bold block ${
              isNightMode ? 'text-[#8E9FA9]' : 'text-[#5F7F8C]'
            }`}>
              {book.name} • {book.testament === 'AT' ? 'Ancien Testament' : 'Nouveau Testament'}
            </span>

            <h1 className={`font-serif font-black text-lg sm:text-2xl leading-snug tracking-normal ${
              isNightMode ? 'text-white' : 'text-[#243038]'
            }`}>
              {sectionTitle}
            </h1>
          </div>
        </div>

        {/* CORPS DU TEXTE DU CHAPITRE : DÉFILEMENT FLUIDE, NUMÉRO ROUGE-BRIQUE & TEXTE AÉRÉ */}
        <div className="space-y-3 font-sans leading-[1.75]" style={{ fontSize: `${textSize}px` }}>
          {verses.length === 0 ? (
            <div className="py-16 text-center opacity-60">
              <p className="font-mono text-xs">Chargement du chapitre...</p>
            </div>
          ) : (
            verses.map((v) => {
              const isHighlighted = highlightVerseNum === v.verse;
              const cleanText = cleanStrongCodes(v.text);
              const isFav = isFavorite ? isFavorite(book.id, chapter, v.verse) : false;

              return (
                <div
                  key={v.verse}
                  ref={isHighlighted ? highlightedRef : null}
                  id={`verse-${book.id}-${chapter}-${v.verse}`}
                  onClick={() => onSelectVerseTarget && onSelectVerseTarget(v)}
                  className={`relative p-2 rounded-xl transition duration-200 group cursor-pointer ${
                    isHighlighted 
                      ? 'bg-[#C0391B]/10 border-l-4 border-[#C0391B] shadow-sm' 
                      : 'hover:bg-black/5 dark:hover:bg-white/5 border-l-4 border-transparent'
                  }`}
                >
                  <p className="inline leading-relaxed">
                    {/* Numéro de verset en rouge-brique et en gras */}
                    <span className="text-[#C0391B] font-bold font-mono text-[0.88em] mr-2 inline-block select-none">
                      {v.verse}
                    </span>

                    {/* Texte du verset en police lisible */}
                    <span className={isNightMode ? 'text-[#E0E8EE]' : 'text-[#1E272E]'}>
                      {cleanText}
                    </span>
                  </p>

                  {/* Actions discrètes au survol / sélection */}
                  <div className="hidden group-hover:flex items-center gap-1.5 mt-1 pt-1 border-t border-black/5 dark:border-white/5 select-none">
                    <button
                      onClick={(e) => handleCopy(v, e)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono text-[#5F7F8C] hover:text-[#C0391B] flex items-center gap-1 transition"
                      title="Copier le verset"
                    >
                      {copiedVerseNum === v.verse ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500 font-bold">Copié</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copier</span>
                        </>
                      )}
                    </button>

                    {onToggleBookmark && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(v);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 transition ${
                          isFav ? 'text-[#C0391B] font-bold' : 'text-[#5F7F8C] hover:text-[#C0391B]'
                        }`}
                        title="Ajouter aux signets"
                      >
                        <Bookmark className={`w-3 h-3 ${isFav ? 'fill-current' : ''}`} />
                        <span>{isFav ? 'Signet ✓' : 'Signet'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* NAVIGATION BAS DE PAGE ENTRE LES CHAPITRES */}
        <div className="mt-10 pt-6 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-3 select-none">
          {onPrevChapter ? (
            <button
              onClick={onPrevChapter}
              className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                isNightMode
                  ? 'border-[#2A343D] hover:border-[#C0391B] text-[#A6BAC5] hover:text-[#C0391B] hover:bg-[#1A2228]'
                  : 'border-[#DCE3E8] hover:border-[#C0391B] text-[#5F7F8C] hover:text-[#C0391B] hover:bg-[#F5F7F8]'
              }`}
            >
              <span>← Chapitre précédent</span>
            </button>
          ) : <div />}

          {onNextChapter ? (
            <button
              onClick={onNextChapter}
              className="px-4 py-2.5 rounded-xl bg-[#C0391B] hover:bg-[#A83217] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-sm"
            >
              <span>Chapitre suivant →</span>
            </button>
          ) : <div />}
        </div>
      </div>

      {/* BOUTON FLOTTANT LECTURE AUDIO EN BAS À DROITE */}
      <div className="fixed bottom-6 right-5 sm:bottom-8 sm:right-8 z-30 select-none">
        <button
          onClick={onToggleAudio}
          className={`w-13 h-13 rounded-full flex items-center justify-center shadow-xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer border ${
            isPlayingAudio
              ? 'bg-[#C0391B] text-white border-white/20 animate-pulse ring-4 ring-[#C0391B]/30'
              : isNightMode
                ? 'bg-[#1E252B] hover:bg-[#28323A] text-[#C0391B] border-[#2A343D]'
                : 'bg-white hover:bg-[#F5F7F8] text-[#C0391B] border-[#DCE3E8]'
          }`}
          title={isPlayingAudio ? "Mettre en pause la lecture audio" : "Écouter ce chapitre en audio"}
          aria-label="Lecture audio"
        >
          {isPlayingAudio ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
};
