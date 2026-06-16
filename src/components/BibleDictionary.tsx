import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, BookOpen, Sparkles, AlertCircle, Compass, MapPin, 
  User, Bookmark, HelpCircle, ArrowRight, ArrowLeft, RefreshCw 
} from 'lucide-react';

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
}

export const BibleDictionary: React.FC<BibleDictionaryProps> = ({ onSearchReference }) => {
  const [query, setQuery] = useState<string>('');
  const [inputVal, setInputVal] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  
  // Suggested curated keywords list to kickstart user exploration
  const suggestedTerms = {
    persons: ["Jésus-Christ", "Moïse", "Paul de Tarse", "David", "Marie", "Abraham", "Ruth", "Élie"],
    places: ["Jérusalem", "Béthanie", "Mont Sinaï", "Babylone", "Jourdain", "Nazareth"],
    notions: ["La Pâque", "L'Exode", "La Transfiguration", "La Pentecôte", "L'Alliance"]
  };

  const fetchDefinition = async (termToSearch: string) => {
    if (!termToSearch.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/gemini/dictionary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: termToSearch })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Une erreur s'est produite lors de l'interrogation du dictionnaire.");
      }

      setResult(data);
      setQuery(termToSearch);
      setInputVal(termToSearch);
      
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

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('pers') || cat.includes('char')) {
      return <User className="w-4 h-4 text-emerald-400" />;
    }
    if (cat.includes('lieu') || cat.includes('ville') || cat.includes('mont') || cat.includes('pays')) {
      return <MapPin className="w-4 h-4 text-sky-400" />;
    }
    if (cat.includes('notion') || cat.includes('concept') || cat.includes('theol')) {
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

        {/* SEARCH FORM */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Rechercher un personnage, lieu ou événement (ex: Jérusalem, Moïse)..."
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
                  L'IA analyse les rapports exégétiques et l'histoire biblique de « <span className="italic text-[#e8e0d0] font-bold">{inputVal}</span> ».
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
                    </div>
                    <h2 className="font-serif font-black text-2xl text-[#e8e0d0] tracking-tight">{result.term}</h2>
                  </div>
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
            /* DEFAULT / EMPTY DICTIONARY LANDING SCREEN */
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
                  <h4 className="font-serif font-extrabold text-[12.5px] text-[#e8e0d0] uppercase tracking-wide">
                    Outil d'Herméneutique & Lexicographie Sacrée
                  </h4>
                  <p className="text-[11px] text-luxury-text-muted leading-relaxed font-sans">
                    Explorez les personnages majeurs, les cités bibliques oubliées, et les grands concepts spirituels avec notre assistant théologique. Saisissez n'importe quel terme ou choisissez l'une des suggestions académiques ci-dessous.
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

              {/* suggestions lists categorized beautifully */}
              <div className="space-y-5">
                
                {/* Persons Category */}
                <div className="space-y-2.5">
                  <span className="text-[9px] font-mono tracking-widest text-[#c9a84c] uppercase block font-black border-b border-[#2e2a1e] pb-1">
                    Personnages Clés
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTerms.persons.map((term, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectSuggested(term)}
                        className="px-3 py-2 text-xs font-serif bg-[#12100cb5] border border-[#2e2a1e]/60 hover:border-[#c9a84c]/30 rounded-xl hover:text-[#e8e0d0] text-luxury-text-primary transition cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Places Category */}
                <div className="space-y-2.5">
                  <span className="text-[9px] font-mono tracking-widest text-[#c9a84c] uppercase block font-black border-b border-[#2e2a1e] pb-1">
                    Lieux & Cités Bibliques
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTerms.places.map((term, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectSuggested(term)}
                        className="px-3 py-2 text-xs font-serif bg-[#12100cb5] border border-[#2e2a1e]/60 hover:border-[#c9a84c]/30 rounded-xl hover:text-[#e8e0d0] text-luxury-text-primary transition cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Concepts/Notions Category */}
                <div className="space-y-2.5">
                  <span className="text-[9px] font-mono tracking-widest text-[#c9a84c] uppercase block font-black border-b border-[#2e2a1e] pb-1">
                    Événements & Doctrines
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTerms.notions.map((term, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectSuggested(term)}
                        className="px-3 py-2 text-xs font-serif bg-[#12100cb5] border border-[#2e2a1e]/60 hover:border-[#c9a84c]/30 rounded-xl hover:text-[#e8e0d0] text-luxury-text-primary transition cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
