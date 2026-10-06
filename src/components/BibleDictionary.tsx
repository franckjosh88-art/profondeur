import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, BookOpen, Sparkles, AlertCircle, Compass, MapPin, 
  User, Bookmark, ArrowRight, ArrowLeft, RefreshCw, Filter, 
  X, ChevronDown, Check, Layers
} from 'lucide-react';
import { explainCache } from '../utils/indexedDBCache';
import { BOOKS } from '../data/bibleData';
import { BOOK_DICTIONARY_ENTITIES } from '../data/bookDictionaryEntities';

interface DictionaryResult {
  term: string;
  category: string;
  pronunciation: string;
  etymology: string;
  shortDefinition: string;
  detailedDescription: string;
  scriptureReferences: string[];
  relatedTerms: string[];
}

interface BibleDictionaryProps {
  onSearchReference?: (reference: string) => void;
  initialBookId?: number;
}

export const BibleDictionary: React.FC<BibleDictionaryProps> = ({ 
  onSearchReference,
  initialBookId 
}) => {
  const [query, setQuery] = useState<string>('');
  const [inputVal, setInputVal] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  
  // Book Filter State: null = "Tous les livres" / Vue globale
  const [selectedBookId, setSelectedBookId] = useState<number | null>(initialBookId || null);
  const [bookSelectorOpen, setBookSelectorOpen] = useState<boolean>(false);
  const [bookSearchFilter, setBookSearchFilter] = useState<string>('');
  const [activeTestamentTab, setActiveTestamentTab] = useState<'ALL' | 'AT' | 'NT'>('ALL');
  
  // Active entity type tab when filtered by book ('all' | 'persons' | 'places' | 'notions')
  const [entityTypeFilter, setEntityTypeFilter] = useState<'all' | 'persons' | 'places' | 'notions'>('all');

  // Currently selected book object
  const selectedBook = useMemo(() => {
    if (!selectedBookId) return null;
    return BOOKS.find(b => b.id === selectedBookId) || null;
  }, [selectedBookId]);

  // Entities for the currently selected book
  const currentBookEntities = useMemo(() => {
    if (!selectedBookId) return null;
    return BOOK_DICTIONARY_ENTITIES[selectedBookId] || {
      persons: [],
      places: [],
      notions: []
    };
  }, [selectedBookId]);

  // Global default suggested keywords if no book is selected
  const globalSuggestedTerms = {
    persons: ["Jésus-Christ", "Moïse", "Paul de Tarse", "David", "Marie", "Abraham", "Ruth", "Élie", "Pierre", "Joseph"],
    places: ["Jérusalem", "Béthanie", "Mont Sinaï", "Babylone", "Jourdain", "Nazareth", "Bethléem", "Capernaüm"],
    notions: ["La Pâque", "L'Exode", "La Transfiguration", "La Pentecôte", "L'Alliance", "La Grâce", "La Résurrection"]
  };

  // Filtered books list for dropdown selector
  const filteredBooks = useMemo(() => {
    return BOOKS.filter(book => {
      const matchesTestament = activeTestamentTab === 'ALL' || book.testament === activeTestamentTab;
      const matchesSearch = !bookSearchFilter.trim() || 
        book.name.toLowerCase().includes(bookSearchFilter.toLowerCase().trim());
      return matchesTestament && matchesSearch;
    });
  }, [activeTestamentTab, bookSearchFilter]);

  const fetchDefinition = async (termToSearch: string, bookContextName?: string) => {
    if (!termToSearch.trim()) return;
    
    const effectiveBookName = bookContextName !== undefined ? bookContextName : (selectedBook ? selectedBook.name : undefined);
    
    setLoading(true);
    setError(null);
    try {
      const cacheKey = `dict:${termToSearch.toLowerCase().trim()}${effectiveBookName ? `:${effectiveBookName.toLowerCase()}` : ''}`;
      const cached = await explainCache.get(cacheKey);
      if (cached && cached.content) {
        try {
          const parsedResult = JSON.parse(cached.content);
          setResult(parsedResult);
          setQuery(termToSearch);
          setInputVal(termToSearch);
          
          setHistory(prev => {
            const filtered = prev.filter(h => h.toLowerCase() !== termToSearch.toLowerCase());
            return [termToSearch, ...filtered].slice(0, 8);
          });
          return;
        } catch (e) {
          console.warn("Error parsing cached dictionary entry:", e);
        }
      }

      const response = await fetch('/api/gemini/dictionary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          query: termToSearch,
          bookName: effectiveBookName 
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Une erreur s'est produite lors de l'interrogation du dictionnaire.");
      }

      setResult(data);
      setQuery(termToSearch);
      setInputVal(termToSearch);
      
      // Save definition to local cache
      await explainCache.set(cacheKey, 'chapter', termToSearch, JSON.stringify(data));

      // Save to history (avoid duplicates)
      setHistory(prev => {
        const filtered = prev.filter(h => h.toLowerCase() !== termToSearch.toLowerCase());
        return [termToSearch, ...filtered].slice(0, 8);
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erreur de connexion lors du chargement de la définition.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      fetchDefinition(inputVal.trim());
    }
  };

  const handleSelectSuggested = (term: string) => {
    fetchDefinition(term);
  };

  const handleGoBack = () => {
    setResult(null);
    setError(null);
    setInputVal('');
  };

  const handleSelectBook = (bookId: number | null) => {
    setSelectedBookId(bookId);
    setBookSelectorOpen(false);
    setBookSearchFilter('');
    setEntityTypeFilter('all');
  };

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('pers') || cat.includes('char')) {
      return <User className="w-4 h-4 text-emerald-400" />;
    }
    if (cat.includes('lieu') || cat.includes('ville') || cat.includes('mont') || cat.includes('pays')) {
      return <MapPin className="w-4 h-4 text-sky-400" />;
    }
    if (cat.includes('notion') || cat.includes('concept') || cat.includes('theol') || cat.includes('doct')) {
      return <Bookmark className="w-4 h-4 text-amber-400" />;
    }
    return <Compass className="w-4 h-4 text-purple-400" />;
  };

  const getCategoryThemeClass = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('pers') || cat.includes('char')) {
      return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    }
    if (cat.includes('lieu') || cat.includes('ville')) {
      return 'bg-sky-500/10 border-sky-500/20 text-sky-400';
    }
    if (cat.includes('notion') || cat.includes('concept') || cat.includes('theol')) {
      return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    }
    return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
  };

  return (
    <div className="w-full h-full text-left flex flex-col select-none relative bg-luxury-bg text-[#e8e0d0]" id="bible-dictionary-root">
      
      {/* HEADER BAR */}
      <div className="p-4 space-y-3 shrink-0 border-b border-[#2e2a1e] select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center text-[#c9a84c]">
              <BookOpen className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-serif font-extrabold text-sm text-[#e8e0d0] tracking-tight">Dictionnaire Biblique IA</h3>
              <p className="text-[10px] font-mono text-[#c9a84c] uppercase font-bold tracking-wider">Encyclopédie des Noms, Lieux & Événements</p>
            </div>
          </div>
          {result && (
            <button 
              onClick={handleGoBack}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono text-luxury-text-muted hover:text-[#c9a84c] bg-[#1a1712] border border-[#2e2a1e] rounded-lg transition shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour</span>
            </button>
          )}
        </div>

        {/* BOOK FILTER SELECTOR & SEARCH ROW */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          
          {/* BOOK FILTER DROPDOWN TRIGGER */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setBookSelectorOpen(prev => !prev)}
              className={`w-full sm:w-auto flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs font-mono transition cursor-pointer ${
                selectedBook 
                  ? 'bg-[#c9a84c]/15 border-[#c9a84c]/40 text-[#f3d889] shadow-soft' 
                  : 'bg-[#12100c] border-[#2e2a1e] text-[#a0947f] hover:text-[#e8e0d0] hover:border-[#c9a84c]/30'
              }`}
              title="Filtrer le dictionnaire par livre biblique"
            >
              <div className="flex items-center gap-2 truncate">
                <Filter className={`w-3.5 h-3.5 shrink-0 ${selectedBook ? 'text-[#c9a84c]' : 'text-[#6b6355]'}`} />
                <span className="font-serif font-bold text-xs truncate">
                  {selectedBook ? selectedBook.name : "Tous les livres (Global)"}
                </span>
                {selectedBook && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#c9a84c]/20 text-[#c9a84c] uppercase font-bold">
                    {selectedBook.testament}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 text-[#c9a84c] ${bookSelectorOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Clear Book Filter Quick Button if active */}
            {selectedBook && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectBook(null);
                }}
                className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-[#1e1a14] border border-[#c9a84c]/40 rounded-full flex items-center justify-center text-[#c9a84c] hover:bg-[#c9a84c] hover:text-black transition text-[9px] cursor-pointer shadow-soft"
                title="Réinitialiser le filtre de livre"
              >
                <X className="w-2.5 h-2.5 stroke-[3]" />
              </button>
            )}

            {/* POPUP / MODAL DROPDOWN FOR CHOOSING BOOK */}
            <AnimatePresence>
              {bookSelectorOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" 
                    onClick={() => setBookSelectorOpen(false)}
                  />

                  {/* Dropdown Menu */}
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-[#12100c] border border-[#c9a84c]/30 rounded-2xl p-3 shadow-2xl z-50 space-y-2.5"
                  >
                    {/* Header: Testament Switcher + Reset */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#2e2a1e]">
                      <div className="flex items-center gap-1 bg-[#1a1712] p-0.5 rounded-lg border border-[#2e2a1e]">
                        <button
                          type="button"
                          onClick={() => setActiveTestamentTab('ALL')}
                          className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded ${activeTestamentTab === 'ALL' ? 'bg-[#c9a84c] text-black' : 'text-[#8c8270] hover:text-[#e8e0d0]'}`}
                        >
                          TOUS
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTestamentTab('AT')}
                          className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded ${activeTestamentTab === 'AT' ? 'bg-[#c9a84c] text-black' : 'text-[#8c8270] hover:text-[#e8e0d0]'}`}
                        >
                          AT (39)
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTestamentTab('NT')}
                          className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded ${activeTestamentTab === 'NT' ? 'bg-[#c9a84c] text-black' : 'text-[#8c8270] hover:text-[#e8e0d0]'}`}
                        >
                          NT (27)
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectBook(null)}
                        className="text-[9.5px] font-mono text-[#c9a84c] hover:underline cursor-pointer"
                      >
                        Tout afficher
                      </button>
                    </div>

                    {/* Book Search Filter Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#6b6355] absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Chercher un livre (ex: Genèse, Jean)..."
                        value={bookSearchFilter}
                        onChange={(e) => setBookSearchFilter(e.target.value)}
                        className="w-full bg-[#0a0806] border border-[#2e2a1e] rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-[#e8e0d0] placeholder-[#6b6355] focus:outline-none focus:border-[#c9a84c]/50"
                        autoFocus
                      />
                    </div>

                    {/* Books Scrollable List */}
                    <div className="max-h-56 overflow-y-auto space-y-1 scroller-thin pr-1">
                      {/* Global Option */}
                      <button
                        type="button"
                        onClick={() => handleSelectBook(null)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-serif transition cursor-pointer ${
                          selectedBookId === null 
                            ? 'bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30 font-bold' 
                            : 'hover:bg-[#1a1712] text-[#e8e0d0]'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-[#c9a84c]" />
                          <span>Vue Globale (Tous les 66 livres)</span>
                        </span>
                        {selectedBookId === null && <Check className="w-3.5 h-3.5 text-[#c9a84c]" />}
                      </button>

                      {filteredBooks.map(b => {
                        const isSelected = selectedBookId === b.id;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleSelectBook(b.id)}
                            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left text-xs transition cursor-pointer ${
                              isSelected 
                                ? 'bg-[#c9a84c]/15 text-[#f3d889] border border-[#c9a84c]/30 font-bold' 
                                : 'hover:bg-[#1a1712] text-[#e8e0d0]'
                            }`}
                          >
                            <span className="font-serif truncate">{b.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-mono text-[#6b6355] uppercase">
                                {b.chapters_count} ch.
                              </span>
                              <span className={`text-[8.5px] font-mono px-1 rounded ${b.testament === 'AT' ? 'bg-[#241f17] text-[#c9a84c]' : 'bg-[#18231c] text-emerald-400'}`}>
                                {b.testament}
                              </span>
                              {isSelected && <Check className="w-3 h-3 text-[#c9a84c]" />}
                            </div>
                          </button>
                        );
                      })}
                      {filteredBooks.length === 0 && (
                        <p className="text-center text-xs font-mono text-[#6b6355] py-4">
                          Aucun livre biblique trouvé.
                        </p>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* SEARCH FORM INPUT */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder={
                  selectedBook 
                    ? `Rechercher un personnage, lieu ou événement dans ${selectedBook.name}...` 
                    : "Rechercher un personnage, lieu ou événement (ex: Jérusalem, Moïse)..."
                }
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="w-full bg-[#12100c] border border-[#2e2a1e] placeholder-[#6b6355] text-xs px-3.5 pl-10 pr-10 py-2.5 rounded-xl text-[#e8e0d0] focus:ring-1 focus:ring-[#c9a84c]/30 focus:border-[#c9a84c]/30 focus:outline-none"
              />
              <div className="absolute left-3.5 text-[#6b6355]">
                <Search className="w-4.5 h-4.5" />
              </div>
              {inputVal && (
                <button
                  type="button"
                  onClick={() => setInputVal('')}
                  className="absolute right-3.5 text-[9.5px] font-sans font-black text-[#6b6355] hover:text-[#c9a84c] tracking-widest cursor-pointer uppercase"
                >
                  Effacer
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ACTIVE FILTER STATUS BANNER */}
        {selectedBook && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 px-3 bg-[#181510] border border-[#c9a84c]/20 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[9.5px] font-mono text-[#8c8270] uppercase">Filtre actif :</span>
              <span className="font-serif font-extrabold text-[#c9a84c]">{selectedBook.name}</span>
              <span className="text-[9px] font-mono text-[#6b6355]">
                ({selectedBook.testament === 'AT' ? 'Ancien Testament' : 'Nouveau Testament'} • {selectedBook.chapters_count} chapitres)
              </span>
            </div>

            {/* Entity Type Switchers */}
            <div className="flex items-center gap-1 text-[9px] font-mono">
              <button
                type="button"
                onClick={() => setEntityTypeFilter('all')}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${entityTypeFilter === 'all' ? 'bg-[#c9a84c] text-black font-bold' : 'text-[#8c8270] hover:text-[#e8e0d0]'}`}
              >
                TOUT
              </button>
              <button
                type="button"
                onClick={() => setEntityTypeFilter('persons')}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${entityTypeFilter === 'persons' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold' : 'text-[#8c8270] hover:text-emerald-400'}`}
              >
                PERSONNAGES
              </button>
              <button
                type="button"
                onClick={() => setEntityTypeFilter('places')}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${entityTypeFilter === 'places' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold' : 'text-[#8c8270] hover:text-sky-400'}`}
              >
                LIEUX
              </button>
              <button
                type="button"
                onClick={() => setEntityTypeFilter('notions')}
                className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${entityTypeFilter === 'notions' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold' : 'text-[#8c8270] hover:text-amber-400'}`}
              >
                ÉVÉNEMENTS
              </button>
              <button
                type="button"
                onClick={() => handleSelectBook(null)}
                className="ml-1 text-[#6b6355] hover:text-[#c9a84c] cursor-pointer"
                title="Supprimer le filtre de livre"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CORE FRAME CONTENT WITH ANIMATED SWITCHES */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 scroller-thin min-h-[440px]">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-24 flex flex-col items-center justify-center space-y-4 text-center"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-t-2 border-[#c9a84c] animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#c9a84c] animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-mono text-[#c9a84c] uppercase tracking-widest animate-pulse font-bold">Consultation théologique en cours...</p>
                <p className="text-[10px] text-luxury-text-muted max-w-xs font-sans">
                  L'IA analyse les rapports exégétiques de « <span className="italic text-[#e8e0d0] font-bold">{inputVal}</span> »{selectedBook ? ` dans le livre de ${selectedBook.name}` : ''}.
                </p>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-6 bg-rose-500/5 border border-rose-500/15 rounded-[2rem] text-center space-y-4"
            >
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <div className="space-y-1.5">
                <h5 className="font-serif font-black text-rose-300 text-sm">Échec d'Analyse</h5>
                <p className="text-xs text-luxury-text-muted leading-relaxed max-w-sm mx-auto">{error}</p>
              </div>
              <button 
                onClick={() => fetchDefinition(inputVal)}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-mono text-[9px] uppercase font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 mx-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Réessayer</span>
              </button>
            </motion.div>
          ) : result ? (
            /* DETAILED ENCYCLOPEDIC RESULT */
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5 select-text"
            >
              {/* Card Main Header */}
              <div className="bg-[#12100c] border border-[#2e2a1e] rounded-[2.5rem] p-5 md:p-6 space-y-4 relative overflow-hidden shadow-gold-glow">
                
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-[#c9a84c]/2 rounded-full blur-[40px] pointer-events-none"></div>

                <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#2e2a1e]/40 select-none">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${getCategoryThemeClass(result.category)}`}>
                        {getCategoryIcon(result.category)}
                        <span className="uppercase tracking-wider">{result.category}</span>
                      </span>
                      {result.pronunciation && (
                        <span className="text-[10px] font-mono text-luxury-text-muted italic">{result.pronunciation}</span>
                      )}
                      {selectedBook && (
                        <span className="text-[9px] font-mono text-[#c9a84c] bg-[#c9a84c]/10 border border-[#c9a84c]/20 px-2 py-0.5 rounded-full">
                          Livre : {selectedBook.name}
                        </span>
                      )}
                    </div>
                    <h2 className="font-serif font-black text-2xl text-[#e8e0d0] tracking-tight">{result.term}</h2>
                  </div>
                  <span className="px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-widest text-[#c9a84c] bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-full select-none">
                    Analyse générée par IA — à vérifier
                  </span>
                </div>

                {/* Etymology meaning bar */}
                {result.etymology && (
                  <div className="bg-[#0f0d09] border border-[#2e2a1e]/60 rounded-2xl p-3 flex gap-3 items-start">
                    <Sparkles className="w-4 h-4 text-[#c9a84c] shrink-0 mt-0.5" />
                    <div className="text-left space-y-0.5">
                      <span className="text-[8.5px] font-mono text-[#c9a84c] uppercase font-bold tracking-wider">Origine & Signification Étymologique</span>
                      <p className="text-xs text-luxury-text-primary leading-relaxed">{result.etymology}</p>
                    </div>
                  </div>
                )}

                {/* Short definition executive brief */}
                <div className="space-y-1.5 pt-1.5">
                  <span className="text-[8.5px] font-mono text-[#6b6355] uppercase font-black tracking-widest block">Aperçu Thématique</span>
                  <p className="font-reading text-[14px] leading-relaxed text-[#c9a84c] font-medium py-1 italic">
                    « {result.shortDefinition} »
                  </p>
                </div>

                {/* Long description text block */}
                <div className="space-y-2 pt-2 border-t border-[#2e2a1e]/30">
                  <span className="text-[8.5px] font-mono text-[#6b6355] uppercase font-black tracking-widest block select-none">Analyse Théologique Approfondie</span>
                  <div className="font-sans text-[12.5px] leading-relaxed text-luxury-text-primary space-y-3 whitespace-pre-line text-justify">
                    {result.detailedDescription}
                  </div>
                </div>
              </div>

              {/* SCRIPTURE REFERENCES AND CONNECTIONS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
                
                {/* References Box */}
                {result.scriptureReferences && result.scriptureReferences.length > 0 && (
                  <div className="bg-[#12100c] border border-[#2e2a1e] rounded-[2rem] p-5 space-y-3">
                    <h5 className="font-serif font-black text-xs text-[#c9a84c] uppercase tracking-wide flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-[#c9a84c]" />
                      <span>Passages Clés de Référence</span>
                    </h5>
                    <div className="flex flex-col gap-2">
                      {result.scriptureReferences.map((ref, idx) => (
                        <button
                          key={idx}
                          onClick={() => onSearchReference && onSearchReference(ref)}
                          className="flex items-center justify-between p-2.5 bg-[#0e0d0a] hover:bg-[#15120e] border border-[#2e2a1e]/70 rounded-xl text-[11px] text-[#e8e0d0] hover:text-[#c2fbf2] hover:border-[#c9a84c]/20 transition text-left cursor-pointer"
                        >
                          <span className="font-serif italic font-bold">{ref}</span>
                          <span className="text-[8px] font-mono text-[#c9a84c] uppercase tracking-widest flex items-center gap-0.5">
                            <span>Lire</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Terms / Context exploration */}
                {result.relatedTerms && result.relatedTerms.length > 0 && (
                  <div className="bg-[#12100c] border border-[#2e2a1e] rounded-[2rem] p-5 space-y-3">
                    <h5 className="font-serif font-black text-xs text-[#c9a84c] uppercase tracking-wide flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-[#c9a84c]" />
                      <span>Termes connexes d'étude</span>
                    </h5>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {result.relatedTerms.map((term, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectSuggested(term)}
                          className="px-3 py-2 bg-[#0e0d0a] hover:bg-[#c9a84c]/5 border border-[#2e2a1e]/80 hover:border-[#c9a84c]/20 rounded-xl text-xs text-luxury-text-muted hover:text-[#e8e0d0] transition cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <span className="font-serif font-black">{term}</span>
                          <ArrowRight className="w-3 h-3 text-[#c9a84c]/70" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          ) : (
            /* DEFAULT / EMPTY DICTIONARY LANDING SCREEN WITH BOOK ENTITIES OR GLOBAL SUGGESTIONS */
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 select-none"
            >
              {/* Intro Banner */}
              <div className="bg-[#12100c]/60 border border-[#2e2a1e] rounded-[2rem] p-5 flex gap-4 items-start">
                <div className="w-10 h-10 rounded-2xl bg-[#c9a84c]/5 border border-[#c9a84c]/15 shrink-0 flex items-center justify-center text-[#c9a84c]">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-serif font-extrabold text-[12.5px] text-[#e8e0d0] uppercase tracking-wide flex items-center gap-2">
                    <span>
                      {selectedBook 
                        ? `Index Lexical & Personnages : Livre de ${selectedBook.name}` 
                        : "Outil d'Herméneutique & Lexicographie Sacrée"}
                    </span>
                  </h4>
                  <p className="text-[11px] text-luxury-text-muted leading-relaxed font-sans">
                    {selectedBook ? (
                      <>
                        Explorez ci-dessous les figures marquantes, cités historiques et doctrines fondamentales qui structurent le livre de <strong className="text-[#c9a84c]">{selectedBook.name}</strong>. Cliquez sur n'importe quel terme pour ouvrir sa fiche exégétique complète.
                      </>
                    ) : (
                      <>
                        Explorez les personnages majeurs, les cités bibliques oubliées, et les grands concepts spirituels avec notre assistant théologique. Utilisez le sélecteur ci-dessus pour filtrer par livre biblique spécifique ou explorez les thèmes généraux.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Research History tray (if available) */}
              {history.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[8.5px] font-mono tracking-widest text-[#6b6355] uppercase block font-black">Recherches Récentes</span>
                  <div className="flex flex-wrap gap-2">
                    {history.map((h, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectSuggested(h)}
                        className="px-2.5 py-1 text-[10.5px] font-serif bg-[#12100c] border border-[#2e2a1e] hover:border-[#c9a84c]/30 rounded-lg hover:text-[#e8e0d0] text-luxury-text-muted transition cursor-pointer"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions lists: Either Book specific or Global */}
              {selectedBook && currentBookEntities ? (
                /* BOOK SPECIFIC ENTITIES VIEW */
                <div className="space-y-6">
                  
                  {/* Persons Category */}
                  {(entityTypeFilter === 'all' || entityTypeFilter === 'persons') && currentBookEntities.persons.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-[#2e2a1e] pb-1">
                        <span className="text-[9.5px] font-mono tracking-widest text-emerald-400 uppercase font-black flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span>Personnages du livre ({currentBookEntities.persons.length})</span>
                        </span>
                        <span className="text-[9px] font-mono text-[#6b6355]">{selectedBook.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentBookEntities.persons.map((term, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectSuggested(term)}
                            className="px-3 py-2 text-xs font-serif bg-[#12100cb5] border border-[#2e2a1e]/80 hover:border-emerald-500/40 rounded-xl hover:text-emerald-300 text-luxury-text-primary transition cursor-pointer flex items-center gap-1.5 group"
                          >
                            <User className="w-3 h-3 text-emerald-400/60 group-hover:text-emerald-400" />
                            <span>{term}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Places Category */}
                  {(entityTypeFilter === 'all' || entityTypeFilter === 'places') && currentBookEntities.places.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-[#2e2a1e] pb-1">
                        <span className="text-[9.5px] font-mono tracking-widest text-sky-400 uppercase font-black flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Lieux, Villes & Géographie ({currentBookEntities.places.length})</span>
                        </span>
                        <span className="text-[9px] font-mono text-[#6b6355]">{selectedBook.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentBookEntities.places.map((term, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectSuggested(term)}
                            className="px-3 py-2 text-xs font-serif bg-[#12100cb5] border border-[#2e2a1e]/80 hover:border-sky-500/40 rounded-xl hover:text-sky-300 text-luxury-text-primary transition cursor-pointer flex items-center gap-1.5 group"
                          >
                            <MapPin className="w-3 h-3 text-sky-400/60 group-hover:text-sky-400" />
                            <span>{term}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Concepts/Notions/Events Category */}
                  {(entityTypeFilter === 'all' || entityTypeFilter === 'notions') && currentBookEntities.notions.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-[#2e2a1e] pb-1">
                        <span className="text-[9.5px] font-mono tracking-widest text-amber-400 uppercase font-black flex items-center gap-1.5">
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>Événements & Thèmes Principaux ({currentBookEntities.notions.length})</span>
                        </span>
                        <span className="text-[9px] font-mono text-[#6b6355]">{selectedBook.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currentBookEntities.notions.map((term, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectSuggested(term)}
                            className="px-3 py-2 text-xs font-serif bg-[#12100cb5] border border-[#2e2a1e]/80 hover:border-amber-500/40 rounded-xl hover:text-amber-300 text-luxury-text-primary transition cursor-pointer flex items-center gap-1.5 group"
                          >
                            <Bookmark className="w-3 h-3 text-amber-400/60 group-hover:text-amber-400" />
                            <span>{term}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                /* GLOBAL CATEGORIZED LIST */
                <div className="space-y-5">
                  
                  {/* Persons Category */}
                  <div className="space-y-2.5">
                    <span className="text-[9px] font-mono tracking-widest text-emerald-400 uppercase block font-black border-b border-[#2e2a1e] pb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>Personnages Clés de l'Histoire Biblique</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {globalSuggestedTerms.persons.map((term, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectSuggested(term)}
                          className="px-3 py-2 text-xs font-serif bg-[#12100cb5] border border-[#2e2a1e]/60 hover:border-emerald-500/30 rounded-xl hover:text-emerald-300 text-luxury-text-primary transition cursor-pointer flex items-center gap-1.5"
                        >
                          <User className="w-3 h-3 text-emerald-400/60" />
                          <span>{term}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Places Category */}
                  <div className="space-y-2.5">
                    <span className="text-[9px] font-mono tracking-widest text-sky-400 uppercase block font-black border-b border-[#2e2a1e] pb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Lieux & Cités Bibliques Majeures</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {globalSuggestedTerms.places.map((term, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectSuggested(term)}
                          className="px-3 py-2 text-xs font-serif bg-[#12100cb5] border border-[#2e2a1e]/60 hover:border-sky-500/30 rounded-xl hover:text-sky-300 text-luxury-text-primary transition cursor-pointer flex items-center gap-1.5"
                        >
                          <MapPin className="w-3 h-3 text-sky-400/60" />
                          <span>{term}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Concepts/Notions Category */}
                  <div className="space-y-2.5">
                    <span className="text-[9px] font-mono tracking-widest text-[#c9a84c] uppercase block font-black border-b border-[#2e2a1e] pb-1 flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Événements, Alliances & Doctrines</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {globalSuggestedTerms.notions.map((term, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectSuggested(term)}
                          className="px-3 py-2 text-xs font-serif bg-[#12100cb5] border border-[#2e2a1e]/60 hover:border-[#c9a84c]/30 rounded-xl hover:text-[#e8e0d0] text-luxury-text-primary transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Bookmark className="w-3 h-3 text-[#c9a84c]/60" />
                          <span>{term}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
