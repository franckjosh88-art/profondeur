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
  Link2,
  Filter,
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
  Scroll,
  RotateCcw
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

export type StrongLanguageFilter = 'all' | 'hebrew' | 'greek';
export type StrongSortOrder = 'code' | 'alpha' | 'definition';

export const StrongLexicon: React.FC<StrongLexiconProps> = ({ 
  onNavigateToChapter,
  onExplainVerse,
  highlightedCode,
  onClearHighlight
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<StrongLanguageFilter>('all');
  const [sortOrder, setSortOrder] = useState<StrongSortOrder>('code');
  const [selectedEntry, setSelectedEntry] = useState<StrongEntry | null>(null);

  // Sync with highlightedCode from parent
  useEffect(() => {
    if (highlightedCode) {
      const entry = EXPANDED_STRONG_ENTRIES.find(e => e.code.toLowerCase() === highlightedCode.toLowerCase());
      if (entry) {
        setSelectedEntry(entry);
        // Automatically switch filter to the matching language for context
        setSelectedLanguage(entry.language);
      }
    }
  }, [highlightedCode]);
  
  // Concordance verses for the currently selected entry
  const concordanceVerses = useMemo(() => {
    if (!selectedEntry) return [];
    // Search on the exact Strong code (e.g. "G3056" or "H7225")
    const results = searchLocalVerses(selectedEntry.code);
    
    // Sort results by canonical book order
    return results.sort((a, b) => {
      if (a.book_id !== b.book_id) return a.book_id - b.book_id;
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });
  }, [selectedEntry]);

  // Compute live match counts for each language based on the search query
  const languageCounts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      let hebTotal = 0;
      let grkTotal = 0;
      for (const e of EXPANDED_STRONG_ENTRIES) {
        if (e.language === 'hebrew') hebTotal++;
        else if (e.language === 'greek') grkTotal++;
      }
      return {
        all: EXPANDED_STRONG_ENTRIES.length,
        hebrew: hebTotal,
        greek: grkTotal
      };
    }

    let all = 0;
    let heb = 0;
    let grk = 0;

    for (const entry of EXPANDED_STRONG_ENTRIES) {
      const matchesCode = entry.code.toLowerCase().includes(q);
      const matchesWord = entry.word.toLowerCase().includes(q);
      const matchesTranslit = entry.transliteration.toLowerCase().includes(q);
      const matchesDef = entry.definition.toLowerCase().includes(q);
      const matchesUsage = entry.usage?.toLowerCase().includes(q) || false;

      if (matchesCode || matchesWord || matchesTranslit || matchesDef || matchesUsage) {
        all++;
        if (entry.language === 'hebrew') heb++;
        else if (entry.language === 'greek') grk++;
      }
    }

    return { all, hebrew: heb, greek: grk };
  }, [searchQuery]);

  // Filter entry list based on language filter and search query
  const filteredEntries = useMemo(() => {
    const filtered = EXPANDED_STRONG_ENTRIES.filter(entry => {
      // 1. Language filter (Hebrew / Greek / All)
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

    // 3. Sorting
    return filtered.sort((a, b) => {
      if (sortOrder === 'alpha') {
        return a.transliteration.localeCompare(b.transliteration);
      }
      if (sortOrder === 'definition') {
        return a.definition.localeCompare(b.definition);
      }
      // Default: sort by Strong code numeric value
      const numA = parseInt(a.code.replace(/^[HG]/i, ''), 10) || 0;
      const numB = parseInt(b.code.replace(/^[HG]/i, ''), 10) || 0;
      const langA = a.code.charAt(0).toUpperCase();
      const langB = b.code.charAt(0).toUpperCase();
      if (langA !== langB) {
        // H before G
        return langB.localeCompare(langA);
      }
      return numA - numB;
    });
  }, [selectedLanguage, searchQuery, sortOrder]);

  // Navigation within the same language in detail view
  const sameLanguageEntries = useMemo(() => {
    if (!selectedEntry) return [];
    return EXPANDED_STRONG_ENTRIES.filter(e => e.language === selectedEntry.language);
  }, [selectedEntry]);

  const currentEntryIndex = useMemo(() => {
    if (!selectedEntry) return -1;
    return sameLanguageEntries.findIndex(e => e.code === selectedEntry.code);
  }, [selectedEntry, sameLanguageEntries]);

  const handlePrevEntry = () => {
    if (currentEntryIndex > 0) {
      setSelectedEntry(sameLanguageEntries[currentEntryIndex - 1]);
    }
  };

  const handleNextEntry = () => {
    if (currentEntryIndex >= 0 && currentEntryIndex < sameLanguageEntries.length - 1) {
      setSelectedEntry(sameLanguageEntries[currentEntryIndex + 1]);
    }
  };

  return (
    <div className="w-full h-full text-left flex flex-col select-none relative bg-luxury-bg text-[#e8e0d0]">
      
      {/* HEADER SECTION */}
      {!selectedEntry ? (
        <div className="p-4 space-y-3 shrink-0 border-b border-[#2e2a1e]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center text-[#c9a84c]">
                <Languages className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-serif font-extrabold text-sm text-[#e8e0d0] tracking-tight">Dictionnaire Strong</h3>
                <p className="text-[10px] text-[#6b6355] font-mono tracking-wider uppercase">Lexique Hébreu & Grec</p>
              </div>
            </div>

            {/* Quick Sort Toggle Button */}
            <div className="flex items-center gap-1 bg-[#12100c] border border-[#2e2a1e] rounded-lg p-0.5 text-[9px] font-mono">
              <button
                onClick={() => setSortOrder(prev => prev === 'code' ? 'alpha' : 'code')}
                title="Changer le tri (Code / Alphabétique)"
                className="px-2 py-1 rounded text-[#c9a84c] hover:bg-[#1a1712] transition flex items-center gap-1 cursor-pointer font-bold"
              >
                <SlidersHorizontal className="w-2.5 h-2.5" />
                <span>{sortOrder === 'code' ? 'Tri : Code' : 'Tri : A-Z'}</span>
              </button>
            </div>
          </div>
          
          <p className="text-[10px] text-[#6b6355] leading-relaxed">
            Filtrez instantanément par langue originale pour accélérer vos recherches exégétiques dans l'Ancien ou le Nouveau Testament.
          </p>

          {/* Search bar with clear button */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher (ex: H7225, G3056, amour, shalom, logos...)"
              className="w-full py-2 pl-8.5 pr-8 bg-[#161410] border border-[#2e2a1e] rounded-xl text-xs text-[#e8e0d0] placeholder-[#6b6355] focus:outline-none focus:border-[#c9a84c]/70 transition font-serif"
            />
            <Search className="w-3.5 h-3.5 text-[#6b6355] absolute left-3 top-2.5" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-[#6b6355] hover:text-[#e8e0d0] text-xs cursor-pointer font-bold"
                title="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* DEDICATED HEBREW / GREEK / ALL TYPE FILTER TABS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[9px] font-mono text-[#8c8270] px-0.5">
              <span className="flex items-center gap-1 uppercase tracking-wider font-semibold">
                <Filter className="w-2.5 h-2.5 text-[#c9a84c]" />
                Filtrer par type de racine :
              </span>
              {selectedLanguage !== 'all' && (
                <button
                  onClick={() => setSelectedLanguage('all')}
                  className="text-[#c9a84c] hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Réinitialiser</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#12100c] rounded-xl border border-[#2e2a1e]">
              {/* ALL TAB */}
              <button
                onClick={() => setSelectedLanguage('all')}
                className={`py-2 px-2 rounded-lg font-mono text-[10px] font-bold tracking-tight transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  selectedLanguage === 'all'
                    ? 'bg-[#c9a84c] text-[#0d0b07] shadow-md'
                    : 'bg-[#181510] text-[#a89d8b] hover:text-[#e8e0d0] hover:bg-[#201c15] border border-[#2e2a1e]/60'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Library className="w-3 h-3" />
                  <span>TOUS</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-sans font-semibold ${
                  selectedLanguage === 'all' ? 'bg-[#0d0b07]/20 text-[#0d0b07]' : 'bg-[#2e2a1e]/50 text-[#8c8270]'
                }`}>
                  {languageCounts.all} mots
                </span>
              </button>

              {/* HEBREW (AT) TAB */}
              <button
                onClick={() => setSelectedLanguage('hebrew')}
                className={`py-2 px-2 rounded-lg font-mono text-[10px] font-bold tracking-tight transition flex flex-col items-center justify-center gap-0.5 cursor-pointer relative overflow-hidden ${
                  selectedLanguage === 'hebrew'
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-[#0d0b07] shadow-md border-amber-400'
                    : 'bg-[#181510] text-amber-400/90 hover:text-amber-300 hover:bg-[#201c15] border border-amber-500/20'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-serif font-black">א</span>
                  <span>HÉBREU (AT)</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-sans font-semibold ${
                  selectedLanguage === 'hebrew' ? 'bg-[#0d0b07]/20 text-[#0d0b07]' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {languageCounts.hebrew} {languageCounts.hebrew > 1 ? 'mots' : 'mot'}
                </span>
              </button>

              {/* GREEK (NT) TAB */}
              <button
                onClick={() => setSelectedLanguage('greek')}
                className={`py-2 px-2 rounded-lg font-mono text-[10px] font-bold tracking-tight transition flex flex-col items-center justify-center gap-0.5 cursor-pointer relative overflow-hidden ${
                  selectedLanguage === 'greek'
                    ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-[#0d0b07] shadow-md border-teal-400'
                    : 'bg-[#181510] text-teal-400/90 hover:text-teal-300 hover:bg-[#201c15] border border-teal-500/20'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-serif font-black">Ω</span>
                  <span>GREC (NT)</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-sans font-semibold ${
                  selectedLanguage === 'greek' ? 'bg-[#0d0b07]/20 text-[#0d0b07]' : 'bg-teal-500/10 text-teal-400'
                }`}>
                  {languageCounts.greek} {languageCounts.greek > 1 ? 'mots' : 'mot'}
                </span>
              </button>
            </div>
          </div>

          {/* ACTIVE FILTER STATUS PILL */}
          {selectedLanguage !== 'all' && (
            <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-[10px] font-mono animate-fade-in ${
              selectedLanguage === 'hebrew'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-teal-500/10 border-teal-500/30 text-teal-400'
            }`}>
              <div className="flex items-center gap-1.5">
                <span className="font-bold">
                  {selectedLanguage === 'hebrew' ? 'Filtre actif : Racines hébraïques (Ancien Testament)' : 'Filtre actif : Racines grecques (Nouveau Testament)'}
                </span>
                <span>• {filteredEntries.length} résultat{filteredEntries.length > 1 ? 's' : ''}</span>
              </div>
              <button
                onClick={() => setSelectedLanguage('all')}
                className="hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                title="Supprimer ce filtre"
              >
                <X className="w-3 h-3" />
                <span>Tous</span>
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* RENDER LIST OF STRONG ENTRIES */}
      {!selectedEntry ? (
        <div className="flex-1 overflow-y-auto px-4 py-3 pb-16 space-y-2.5 no-scrollbar">
          <div className="flex justify-between items-center text-[9px] font-mono text-[#8c8270] border-b border-[#2e2a1e]/40 pb-1 px-1">
            <span className="uppercase tracking-wider">
              {selectedLanguage === 'all' 
                ? 'INDEX COMPLET DES RACINES' 
                : selectedLanguage === 'hebrew' 
                  ? 'RACINES HÉBRAÏQUES (AT)' 
                  : 'RACINES GRECQUES (NT)'}
            </span>
            <span className="font-bold text-[#c9a84c]">{filteredEntries.length} MOT{filteredEntries.length > 1 ? 'S' : ''}</span>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-[#8c8270] space-y-3 bg-[#12100c]/40 border border-[#2e2a1e] rounded-2xl p-6">
              <Compass className="w-8 h-8 text-[#c9a84c]/50 mx-auto animate-spin" style={{ animationDuration: '10s' }} />
              <div className="space-y-1">
                <p className="text-xs font-serif italic text-[#e8e0d0]">
                  Aucune racine trouvée {searchQuery ? `pour "${searchQuery}"` : ''} 
                  {selectedLanguage !== 'all' ? ` en ${selectedLanguage === 'hebrew' ? 'Hébreu' : 'Grec'}` : ''}
                </p>
                {selectedLanguage !== 'all' && languageCounts[selectedLanguage === 'hebrew' ? 'greek' : 'hebrew'] > 0 && (
                  <p className="text-[10px] text-[#8c8270]">
                    Des correspondances existent peut-être dans l'autre langue.
                  </p>
                )}
              </div>
              <div className="flex justify-center gap-2 pt-1">
                {selectedLanguage !== 'all' && (
                  <button
                    onClick={() => setSelectedLanguage('all')}
                    className="px-3 py-1.5 bg-[#c9a84c]/15 hover:bg-[#c9a84c]/25 border border-[#c9a84c]/30 rounded-lg text-[10px] font-mono font-bold text-[#c9a84c] cursor-pointer transition"
                  >
                    Voir tous les mots ({languageCounts.all})
                  </button>
                )}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-3 py-1.5 bg-[#1f1b14] hover:bg-[#2a241b] border border-[#2e2a1e] rounded-lg text-[10px] font-mono text-[#a89d8b] cursor-pointer transition"
                  >
                    Effacer la recherche
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map(entry => {
                const isHebrew = entry.language === 'hebrew';
                return (
                  <div
                    key={entry.code}
                    onClick={() => setSelectedEntry(entry)}
                    className="p-3 bg-[#12100c] border border-[#2e2a1e] hover:border-[#c9a84c]/50 rounded-xl transition cursor-pointer flex items-center justify-between gap-3 group hover:bg-[#16130d]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Language avatar indicator */}
                      <div className={`w-9 h-9 rounded-lg font-mono font-bold text-[10px] flex flex-col items-center justify-center border shrink-0 ${
                        isHebrew 
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                          : 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                      }`}>
                        <span>{entry.code}</span>
                        <span className="text-[7.5px] opacity-75 font-serif font-black">
                          {isHebrew ? 'א' : 'Ω'}
                        </span>
                      </div>

                      <div className="text-left space-y-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-serif font-extrabold text-xs text-[#e8e0d0] group-hover:text-[#c9a84c] transition duration-150">
                            {entry.transliteration}
                          </span>
                          <span className="text-[14px] font-bold text-[#c9a84c] font-serif tracking-normal">
                            {entry.word}
                          </span>
                          
                          {/* Direct Clickable Type Filter Tag */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLanguage(entry.language);
                            }}
                            title={`Filtrer par racine ${isHebrew ? 'Hébraïque (AT)' : 'Grecque (NT)'}`}
                            className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase border transition ${
                              isHebrew
                                ? 'bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/20'
                                : 'bg-teal-500/10 border-teal-500/25 text-teal-400 hover:bg-teal-500/20'
                            }`}
                          >
                            {isHebrew ? 'Hébreu • AT' : 'Grec • NT'}
                          </button>
                        </div>
                        <p className="text-[10px] text-[#8c8270] line-clamp-1 leading-normal pr-2">
                          {entry.definition}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-[#8c8270] group-hover:text-[#c9a84c] group-hover:translate-x-0.5 transition shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* RENDER SELECTED LEXICAL DETAIL VIEW WITH CONCORDANCE SEARCH */
        <div className="flex-1 overflow-y-auto p-4 pb-16 space-y-4 animate-fade-slide-up flex flex-col">
          
          {/* Header Action bar with Language Indicator & Steppers */}
          <div className="flex justify-between items-center border-b border-[#2e2a1e] pb-3 shrink-0">
            <button
              onClick={() => {
                setSelectedEntry(null);
                if (onClearHighlight) onClearHighlight();
              }}
              className="flex items-center gap-1.5 text-xs text-[#c9a84c] hover:underline cursor-pointer font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour au lexique</span>
            </button>

            {/* Stepper buttons between same language entries */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevEntry}
                disabled={currentEntryIndex <= 0}
                className="p-1 rounded bg-[#161410] border border-[#2e2a1e] text-[#a89d8b] hover:text-[#e8e0d0] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                title="Racine précédente"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
              <span className="text-[9px] font-mono text-[#8c8270] px-1">
                {currentEntryIndex + 1}/{sameLanguageEntries.length}
              </span>
              <button
                onClick={handleNextEntry}
                disabled={currentEntryIndex >= sameLanguageEntries.length - 1}
                className="p-1 rounded bg-[#161410] border border-[#2e2a1e] text-[#a89d8b] hover:text-[#e8e0d0] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                title="Racine suivante"
              >
                <ArrowRight className="w-3 h-3" />
              </button>

              <span className={`ml-1 px-2 py-0.5 text-[8.5px] font-mono font-bold uppercase rounded border ${
                selectedEntry.language === 'hebrew' 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                  : 'bg-teal-500/10 border-teal-500/30 text-teal-400'
              }`}>
                {selectedEntry.language === 'hebrew' ? 'Hébreu (AT)' : 'Grec (NT)'}
              </span>
            </div>
          </div>

          {/* Main word display card */}
          <div className="bg-[#12100c] border border-[#2e2a1e] rounded-2xl p-4 space-y-3 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#c9a84c]/5 rounded-full blur-2xl"></div>
            
            <div className="flex items-center justify-center gap-2">
              <div className="inline-block bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 px-2.5 py-0.5 rounded text-[10px] font-mono tracking-widest font-extrabold uppercase">
                {selectedEntry.code}
              </div>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                selectedEntry.language === 'hebrew' ? 'bg-amber-500/10 text-amber-400' : 'bg-teal-500/10 text-teal-400'
              }`}>
                {selectedEntry.language === 'hebrew' ? 'Ancien Testament' : 'Nouveau Testament'}
              </span>
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
            <div className="space-y-4 text-left pt-1 px-1">
              <div className="space-y-1">
                <span className="text-[8px] font-mono tracking-wider text-[#8c8270] uppercase block font-bold">DÉFINITION SÉMANTIQUE</span>
                <p className="text-[14.5px] text-luxury-text-primary leading-relaxed font-reading">
                  {selectedEntry.definition}
                </p>
              </div>

              {selectedEntry.usage && (
                <div className="space-y-1">
                  <span className="text-[8px] font-mono tracking-wider text-[#8c8270] uppercase block font-bold">USAGE TRADUCTIONNEL</span>
                  <p className="text-[12.5px] text-[#60c49f] leading-relaxed italic bg-[#60c49f]/5 border border-[#60c49f]/15 p-2.5 rounded-xl font-reading">
                    {selectedEntry.usage}
                  </p>
                </div>
              )}
            </div>

            {/* Quick Filter Action inside detail card */}
            <div className="pt-2 border-t border-[#2e2a1e]/50 flex items-center justify-between text-[9px] font-mono">
              <span className="text-[#8c8270]">Langue originale : {selectedEntry.language === 'hebrew' ? 'Hébreu Biblique' : 'Grec Koïnè'}</span>
              <button
                onClick={() => {
                  setSelectedLanguage(selectedEntry.language);
                  setSelectedEntry(null);
                }}
                className={`font-bold hover:underline cursor-pointer flex items-center gap-1 ${
                  selectedEntry.language === 'hebrew' ? 'text-amber-400' : 'text-teal-400'
                }`}
              >
                <span>Voir tout l'{selectedEntry.language === 'hebrew' ? 'Hébreu' : 'Grec'}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Concordance Section (Real Database Scanner) */}
          <div className="space-y-2.5 flex-1 flex flex-col min-h-[220px]">
            <div className="flex justify-between items-center text-[9px] font-mono text-[#8c8270] border-b border-[#2e2a1e]/40 pb-1 px-1 shrink-0">
              <span className="uppercase tracking-[0.1em] font-bold flex items-center gap-1">
                <Library className="w-3 h-3 text-[#c9a84c]" />
                Concordance biblique ({concordanceVerses.length})
              </span>
              <span>INDEX LOCAL SQLite</span>
            </div>

            {concordanceVerses.length === 0 ? (
              <div className="py-8 bg-[#12100c]/45 border border-dashed border-[#2e2a1e] rounded-xl text-center text-[#8c8270] px-4 space-y-1 my-auto">
                <p className="text-[11.5px] font-reading italic">Pas d'occurrence directe dans les versets d'évangiles chargés.</p>
                <p className="text-[9.5px] leading-relaxed max-w-[220px] mx-auto font-sans">Ce mot fait partie du dictionnaire de référence général sans être pré-mappé aux fragments offline.</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto flex-1 max-h-[300px] pr-1 no-scrollbar">
                {concordanceVerses.map((v, index) => {
                  return (
                    <div 
                      key={index}
                      className="bg-[#12100c]/85 border border-[#2e2a1e] rounded-xl p-3 space-y-2 text-left hover:border-[#c9a84c]/20 transition"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-serif font-bold text-[10.5px] text-[#c9a84c]">
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

                      <p className="text-[13.5px] text-luxury-text-primary leading-relaxed font-reading italic text-left">
                        {/* Highlights the code inside bracket */}
                        {v.text.split(/(\[[HG]\d+\])/).map((p, idx) => {
                          const isMatch = p.toLowerCase().includes(selectedEntry.code.toLowerCase());
                          return isMatch ? (
                            <strong key={idx} className="bg-[#c9a84c]/15 text-[#c9a84c] px-1 rounded border border-[#c9a84c]/30 font-mono text-[9.5px] whitespace-nowrap">
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
                          className="text-[9px] font-mono text-[#8c8270] hover:text-[#c9a84c] hover:underline cursor-pointer"
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
