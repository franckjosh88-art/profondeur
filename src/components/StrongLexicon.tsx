import React, { useState, useMemo, useEffect } from 'react';
import { 
  Book, 
  Search, 
  BookOpen, 
  ChevronRight, 
  Tag, 
  Compass, 
  Layers, 
  Languages, 
  Volume2, 
  X, 
  HelpCircle, 
  Library, 
  ArrowLeftRight,
  Sparkles,
  Link2
} from 'lucide-react';
import { StrongEntry, Verse } from '../types/bible';
import { EXPANDED_STRONG_ENTRIES } from '../data/strongLexiconData';
import { searchLocalVerses, BOOKS } from '../data/bibleData';

interface StrongLexiconProps {
  onNavigateToChapter: (bookId: number, chapterNum: number) => void;
  onExplainVerse?: (verse: Verse) => void;
  highlightedCode?: string | null;
  onClearHighlight?: () => void;
}

export const StrongLexicon: React.FC<StrongLexiconProps> = ({ 
  onNavigateToChapter,
  onExplainVerse,
  highlightedCode,
  onClearHighlight
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<'all' | 'hebrew' | 'greek'>('all');
  const [selectedEntry, setSelectedEntry] = useState<StrongEntry | null>(null);

  // Sync with highlightedCode from parent
  useEffect(() => {
    if (highlightedCode) {
      const entry = EXPANDED_STRONG_ENTRIES.find(e => e.code.toLowerCase() === highlightedCode.toLowerCase());
      if (entry) {
        setSelectedEntry(entry);
      }
    }
  }, [highlightedCode]);
  
  // Concordance verses for the currently selected entry
  const concordanceVerses = useMemo(() => {
    if (!selectedEntry) return [];
    // We can execute search on the exact Strong code (e.g. "G3056")
    // This looks up actual loaded verses in our offline database
    const results = searchLocalVerses(selectedEntry.code);
    
    // Sort results by canonical book order
    return results.sort((a, b) => {
      if (a.book_id !== b.book_id) return a.book_id - b.book_id;
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });
  }, [selectedEntry]);

  // Filter entry list based on tabs and search query
  const filteredEntries = useMemo(() => {
    return EXPANDED_STRONG_ENTRIES.filter(entry => {
      // 1. Language filter
      if (selectedLanguage !== 'all' && entry.language !== selectedLanguage) {
        return false;
      }
      
      // 2. Search query filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const matchesCode = entry.code.toLowerCase().includes(query);
        const matchesWord = entry.word.toLowerCase().includes(query);
        const matchesTranslit = entry.transliteration.toLowerCase().includes(query);
        const matchesDef = entry.definition.toLowerCase().includes(query);
        const matchesUsage = entry.usage?.toLowerCase().includes(query) || false;
        
        return matchesCode || matchesWord || matchesTranslit || matchesDef || matchesUsage;
      }
      
      return true;
    });
  }, [selectedLanguage, searchQuery]);

  return (
    <div className="w-full h-full text-left flex flex-col select-none relative bg-luxury-bg text-[#e8e0d0]">
      
      {/* HEADER SECTION */}
      {!selectedEntry ? (
        <div className="p-4 space-y-3 shrink-0 border-b border-[#2e2a1e]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center text-[#c9a84c]">
              <Languages className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-serif font-extrabold text-sm text-[#e8e0d0] tracking-tight">Dictionnaire Strong</h3>
              <p className="text-[10px] text-[#6b6355] font-mono tracking-wider uppercase">Lexique Hébreu & Grec</p>
            </div>
          </div>
          
          <p className="text-[10px] text-[#6b6355] leading-relaxed">
            Parcourez les racines sacrées originales de l'Ancien Testament (Hébreu) et du Nouveau Testament (Grec). Cliquez sur un mot pour voir sa concordance complète.
          </p>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher (code, translittération, mot...)"
              className="w-full py-2 pl-8.5 pr-8 bg-[#161410] border border-[#2e2a1e] rounded-xl text-xs text-[#e8e0d0] placeholder-[#6b6355] focus:outline-none focus:border-[#c9a84c]/70 transition font-serif"
            />
            <Search className="w-3.5 h-3.5 text-[#6b6355] absolute left-3 top-2.5" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-[#6b6355] hover:text-[#e8e0d0] text-xs cursor-pointer font-bold"
              >
                &times;
              </button>
            )}
          </div>

          {/* Segmented language tab toggles */}
          <div className="flex bg-[#12100c] p-0.5 rounded-lg border border-[#2e2a1e] text-[10px] font-mono">
            <button
              onClick={() => setSelectedLanguage('all')}
              className={`flex-1 py-1.5 rounded-md font-bold tracking-wider transition ${
                selectedLanguage === 'all' 
                  ? 'bg-[#c9a84c] text-[#0d0b07] shadow-sm' 
                  : 'text-[#6b6355] hover:text-[#e8e0d0]'
              }`}
            >
              TOUS ({EXPANDED_STRONG_ENTRIES.length})
            </button>
            <button
              onClick={() => setSelectedLanguage('hebrew')}
              className={`flex-1 py-1.5 rounded-md font-bold tracking-wider transition ${
                selectedLanguage === 'hebrew' 
                  ? 'bg-[#c9a84c] text-[#0d0b07] shadow-sm' 
                  : 'text-[#6b6355] hover:text-[#e8e0d0]'
              }`}
            >
              HÉBREU (AT)
            </button>
            <button
              onClick={() => setSelectedLanguage('greek')}
              className={`flex-1 py-1.5 rounded-md font-bold tracking-wider transition  ${
                selectedLanguage === 'greek' 
                  ? 'bg-[#c9a84c] text-[#0d0b07] shadow-sm' 
                  : 'text-[#6b6355] hover:text-[#e8e0d0]'
              }`}
            >
              GREC (NT)
            </button>
          </div>
        </div>
      ) : null}

      {/* RENDER LIST OF STRONG ENTRIES */}
      {!selectedEntry ? (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 scrollbar-thin">
          <div className="flex justify-between items-center text-[9px] font-mono text-[#6b6355] border-b border-[#2e2a1e]/40 pb-1 px-1">
            <span>INDEX DES CODES DISPONIBLES</span>
            <span>{filteredEntries.length} MOTS CORRESPONDANTS</span>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-[#6b6355] space-y-2">
              <Compass className="w-8 h-8 text-[#2e2a1e] mx-auto animate-spin" style={{ animationDuration: '10s' }} />
              <p className="text-xs font-serif italic">Aucune racine trouvée pour "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map(entry => (
                <div
                  key={entry.code}
                  onClick={() => setSelectedEntry(entry)}
                  className="p-3 bg-[#12100c] border border-[#2e2a1e] hover:border-[#c9a84c]/40 rounded-xl transition cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    {/* Language avatar indicator */}
                    <div className={`w-8.5 h-8.5 rounded-lg font-mono font-bold text-[10px] flex items-center justify-center border shrink-0 ${
                      entry.language === 'hebrew' 
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' 
                        : 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                    }`}>
                      {entry.code}
                    </div>

                    <div className="text-left space-y-0.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-serif font-extrabold text-xs text-[#e8e0d0] group-hover:text-[#c9a84c] transition duration-150">
                          {entry.transliteration}
                        </span>
                        <span className="text-[14px] font-bold text-[#c9a84c] font-serif tracking-normal">
                          {entry.word}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#6b6355] line-clamp-1 leading-normal pr-4">
                        {entry.definition}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-[#6b6355] group-hover:text-[#c9a84c] transition" />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* RENDER SELECTED LEXICAL DETAIL VIEW WITH CONCORDANCE SEARCH */
        <div className="flex-1 overflow-y-auto p-4 space-y-4 animate-fade-slide-up flex flex-col">
          
          {/* Header Action bar */}
          <div className="flex justify-between items-center border-b border-[#2e2a1e] pb-3 shrink-0">
            <button
              onClick={() => {
                setSelectedEntry(null);
                if (onClearHighlight) onClearHighlight();
              }}
              className="flex items-center gap-1 text-xs text-[#c9a84c] hover:underline cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Fermer la fiche</span>
            </button>

            <span className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase rounded border ${
              selectedEntry.language === 'hebrew' 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                : 'bg-teal-500/10 border-teal-500/20 text-teal-400'
            }`}>
              {selectedEntry.language === 'hebrew' ? 'Hébreu Biblique' : 'Grec Koïnè'}
            </span>
          </div>

          {/* Main word display card */}
          <div className="bg-[#12100c] border border-[#2e2a1e] rounded-2xl p-4 space-y-3 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#c9a84c]/5 rounded-full blur-2xl"></div>
            
            <div className="inline-block bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 px-2.5 py-0.5 rounded text-[10px] font-mono tracking-widest font-extrabold uppercase">
              {selectedEntry.code}
            </div>

            <div className="space-y-1">
              {/* Huge original word */}
              <h2 className="text-3xl font-serif font-extrabold text-[#c9a84c] tracking-normal py-1">
                {selectedEntry.word}
              </h2>
              {/* Pronunciation/Transliteration details */}
              <p className="text-xs font-serif font-semibold text-[#e8e0d0] tracking-wide italic">
                prononcé : <span className="font-sans text-[#c9a84c] font-bold">"{selectedEntry.transliteration}"</span>
              </p>
            </div>

            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-[#2e2a1e] to-transparent mx-auto"></div>

            {/* Definitions */}
            <div className="space-y-3.5 text-left pt-1 px-1">
              <div className="space-y-1">
                <span className="text-[8px] font-mono tracking-wider text-[#6b6355] uppercase block">DÉFINITION SEMANTIQUE</span>
                <p className="text-xs text-[#e8e0d0] leading-relaxed font-serif">
                  {selectedEntry.definition}
                </p>
              </div>

              {selectedEntry.usage && (
                <div className="space-y-1">
                  <span className="text-[8px] font-mono tracking-wider text-[#6b6355] uppercase block">USAGE TRADUCTIONNEL</span>
                  <p className="text-[10px] text-[#60c49f] leading-normal italic bg-[#60c49f]/5 border border-[#60c49f]/10 p-2 rounded-lg">
                    {selectedEntry.usage}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Concordance Section (Real Database Scanner) */}
          <div className="space-y-2.5 flex-1 flex flex-col min-h-[220px]">
            <div className="flex justify-between items-center text-[9px] font-mono text-[#6b6355] border-b border-[#2e2a1e]/40 pb-1 px-1 shrink-0">
              <span className="uppercase tracking-[0.1em] font-bold flex items-center gap-1">
                <Library className="w-3 h-3 text-[#c9a84c]" />
                Concordance biblique ({concordanceVerses.length})
              </span>
              <span>INDEX LOCAL SQLite</span>
            </div>

            {concordanceVerses.length === 0 ? (
              <div className="py-8 bg-[#12100c]/45 border border-dashed border-[#2e2a1e] rounded-xl text-center text-[#6b6355] px-4 space-y-1 my-auto">
                <p className="text-[11px] font-serif italic">Pas d'occurrence directe dans les versets d'évangiles chargés.</p>
                <p className="text-[9px] leading-relaxed max-w-[220px] mx-auto">Ce mot fait partie du dictionnaire de référence général sans être pré-mappé aux fragments offline.</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto flex-1 max-h-[300px] pr-1 scrollbar-thin">
                {concordanceVerses.map((v, index) => {
                  return (
                    <div 
                      key={index}
                      className="bg-[#12100c]/85 border border-[#2e2a1e] rounded-xl p-3 space-y-2 text-left hover:border-[#c9a84c]/20 transition"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-serif font-bold text-[10px] text-[#c9a84c]">
                          {v.book_name} {v.chapter}:{v.verse}
                        </span>
                        
                        {/* Direct Navigation link */}
                        <button
                          onClick={() => onNavigateToChapter(v.book_id, v.chapter)}
                          className="text-[9px] font-mono font-bold text-[#c9a84c] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Link2 className="w-2.5 h-2.5" />
                          <span>Lire le chap.</span>
                        </button>
                      </div>

                      <p className="text-[11px] text-[#e8e0d0] leading-relaxed font-serif italic text-left">
                        {/* Highlights the code inside bracket */}
                        {v.text.split(/(\[[HG]\d+\])/).map((p, idx) => {
                          const isMatch = p.toLowerCase().includes(selectedEntry.code.toLowerCase());
                          return isMatch ? (
                            <strong key={idx} className="bg-[#c9a84c]/15 text-[#c9a84c] px-0.5 rounded border border-[#c9a84c]/30 font-mono text-[9px] whitespace-nowrap">
                              {p}
                            </strong>
                          ) : p;
                        })}
                      </p>

                      {onExplainVerse && (
                        <button
                          onClick={() => {
                            setSelectedEntry(null);
                            onExplainVerse(v);
                          }}
                          className="text-[9px] font-mono text-[#6b6355] hover:text-[#c9a84c] hover:underline"
                        >
                          + Afficher l'exégèse de ce verset
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
