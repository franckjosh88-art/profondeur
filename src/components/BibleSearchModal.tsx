import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Mic, BookOpen, AlertCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Book } from '../types/bible';
import { BOOKS, searchSmartVerses, SmartSearchResult, normalizeVerseText } from '../data/bibleData';

interface BibleSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVerse: (book: Book, chapter: number, verseNum: number) => void;
}

export const BibleSearchModal: React.FC<BibleSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectVerse
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [dictationMessage, setDictationMessage] = useState<string | null>(null);
  const [resultsLimit, setResultsLimit] = useState(20);

  const inputRef = useRef<HTMLInputElement>(null);
  const speechRef = useRef<any>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setResultsLimit(20);
    } else {
      if (speechRef.current) {
        try { speechRef.current.stop(); } catch (_) {}
      }
      setIsDictating(false);
    }
  }, [isOpen]);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Check direct reference pattern: e.g. "Ps 23:4", "Psaumes 23 4", "Jean 3 16"
  const directRefMatch = React.useMemo(() => {
    if (!debouncedQuery.trim()) return null;
    const clean = debouncedQuery.trim().toLowerCase();
    // Pattern: [book] [chapter](:|[space])[verse]
    const match = clean.match(/^([a-zà-ÿ0-9\s\-]+?)\s+(\d+)(?:[:\s](\d+))?$/i);
    if (!match) return null;

    const rawBook = match[1].trim();
    const chapterNum = parseInt(match[2], 10);
    const verseNum = match[3] ? parseInt(match[3], 10) : 1;

    const normBook = normalizeVerseText(rawBook);
    const foundBook = BOOKS.find(b => {
      const bNorm = normalizeVerseText(b.name);
      return bNorm.startsWith(normBook) || normBook.startsWith(bNorm) || b.slug.startsWith(normBook);
    });

    if (foundBook && chapterNum >= 1 && chapterNum <= foundBook.chapters_count) {
      return {
        book: foundBook,
        chapter: chapterNum,
        verse: verseNum,
        label: `${foundBook.name} ${chapterNum}:${verseNum}`
      };
    }
    return null;
  }, [debouncedQuery]);

  // Search Results
  const searchResults: SmartSearchResult[] = React.useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    return searchSmartVerses(debouncedQuery, { maxResults: resultsLimit + 10 });
  }, [debouncedQuery, resultsLimit]);

  // Web Speech API Dictation
  const handleToggleDictation = () => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setDictationMessage("La reconnaissance vocale n'est pas supportée sur ce navigateur.");
      setTimeout(() => setDictationMessage(null), 3500);
      return;
    }

    if (isDictating) {
      if (speechRef.current) {
        try { speechRef.current.stop(); } catch (_) {}
      }
      setIsDictating(false);
      return;
    }

    try {
      const rec = new SpeechRecognitionClass();
      rec.lang = 'fr-FR';
      rec.continuous = false;
      rec.interimResults = true;

      rec.onstart = () => {
        setIsDictating(true);
        setDictationMessage("🎙️ Écoute en cours, dictez votre verset...");
      };

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setQuery(transcript.trim());
        }
      };

      rec.onerror = (e: any) => {
        console.warn("Speech error:", e);
        setIsDictating(false);
        setDictationMessage("Erreur d'accès au micro.");
        setTimeout(() => setDictationMessage(null), 3000);
      };

      rec.onend = () => {
        setIsDictating(false);
        setTimeout(() => setDictationMessage(null), 2000);
      };

      speechRef.current = rec;
      rec.start();
    } catch (e) {
      console.error(e);
      setIsDictating(false);
      setDictationMessage("Impossible de démarrer le micro.");
      setTimeout(() => setDictationMessage(null), 3000);
    }
  };

  // Helper to highlight terms
  const renderHighlightedSnippet = (text: string, queryStr: string) => {
    if (!queryStr.trim()) return text;
    const tokens = normalizeVerseText(queryStr).split(' ').filter(t => t.length > 2);
    if (tokens.length === 0) return text;

    try {
      const regex = new RegExp(`(${tokens.join('|')})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) => {
        const isMatch = tokens.some(t => normalizeVerseText(part).includes(t));
        return isMatch ? (
          <mark key={i} className="bg-[#c9a84c]/30 text-[#ebd092] font-bold rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      });
    } catch (_) {
      return text;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-14 p-3 sm:p-5 bg-black/80 backdrop-blur-sm select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-xl rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.9),0_0_20px_rgba(201,168,76,0.15)] flex flex-col max-h-[85vh] overflow-hidden border border-[#2e2a1e] bg-[#0c0a07] text-[#e8e0d0]"
          >
            {/* BARRE DE RECHERCHE */}
            <div className="p-3.5 border-b border-[#2e2a1e] flex items-center gap-2.5 bg-[#12100c]">
              <Search className="w-5 h-5 shrink-0 text-[#c9a84c]" />

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex : Ps 23:4, Jean 3 16, berger, paix..."
                className="bg-transparent flex-1 text-sm outline-none border-none placeholder:text-[#8c8270] text-[#f4efe2] font-sans"
              />

              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded-full text-[#8c8270] hover:text-[#e8e0d0] transition cursor-pointer"
                  title="Effacer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Bouton Dicter (Web Speech API) */}
              <button
                type="button"
                onClick={handleToggleDictation}
                className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                  isDictating
                    ? 'bg-red-500/20 border-red-500/60 text-red-300 font-bold animate-pulse'
                    : 'bg-[#17140f] border-[#2e2a1e] text-[#c9a84c] hover:border-[#c9a84c]'
                }`}
                title={isDictating ? "Arrêter la dictée" : "Dicter vocalement"}
              >
                <Mic className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">{isDictating ? 'Écoute...' : 'Dicter'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#8c8270] hover:text-[#c9a84c] transition cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MESSAGE D'ÉTAT VOCAL */}
            {dictationMessage && (
              <div className="px-4 py-1.5 bg-[#c9a84c]/15 text-[#c9a84c] text-xs font-mono border-b border-[#2e2a1e] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#c9a84c] animate-pulse"></span>
                <span>{dictationMessage}</span>
              </div>
            )}

            {/* RÉSULTATS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scroller-thin">
              {/* Accès direct par référence détectée */}
              {directRefMatch && (
                <div 
                  onClick={() => {
                    onSelectVerse(directRefMatch.book, directRefMatch.chapter, directRefMatch.verse);
                    onClose();
                  }}
                  className="p-3.5 rounded-xl border border-[#c9a84c] bg-[#c9a84c]/15 hover:bg-[#c9a84c]/25 cursor-pointer transition flex items-center justify-between shadow-sm active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-[#c9a84c]" />
                    <div>
                      <span className="font-serif font-black text-sm text-[#f4efe2] block">
                        Accéder directement à : {directRefMatch.label}
                      </span>
                      <span className="text-[10px] font-mono text-[#c9a84c]">
                        Ouvrir {directRefMatch.book.name}, chapitre {directRefMatch.chapter}, verset {directRefMatch.verse}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#c9a84c]" />
                </div>
              )}

              {/* Liste des résultats par mot-clé */}
              {debouncedQuery.trim() === '' ? (
                <div className="py-12 text-center text-[#8c8270] space-y-2">
                  <Search className="w-8 h-8 mx-auto stroke-[1.5] text-[#c9a84c]/40" />
                  <p className="text-xs font-mono">
                    Tapez des mots ou une référence (ex: "Ps 23:4", "berger", "lumière").
                  </p>
                </div>
              ) : searchResults.length === 0 && !directRefMatch ? (
                <div className="py-12 text-center text-[#8c8270] space-y-2">
                  <AlertCircle className="w-8 h-8 mx-auto text-[#c9a84c]" />
                  <p className="font-serif font-bold text-sm text-[#f4efe2]">Aucun verset trouvé</p>
                  <p className="text-xs font-mono opacity-70 max-w-xs mx-auto">
                    Essayez de simplifier votre recherche ou vérifiez l'orthographe.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8c8270] px-1">
                    <span>{searchResults.length} occurrence(s) trouvée(s) :</span>
                  </div>

                  {searchResults.slice(0, resultsLimit).map((result, idx) => {
                    const v = result.verse;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          const bookObj = BOOKS.find(b => b.id === v.book_id);
                          if (bookObj) {
                            onSelectVerse(bookObj, v.chapter, v.verse);
                            onClose();
                          }
                        }}
                        className="p-3.5 rounded-xl border border-[#2e2a1e] bg-[#12100c] hover:border-[#c9a84c]/60 hover:bg-[#1a1712] text-left cursor-pointer transition space-y-1 active:scale-99"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-serif font-black text-xs text-[#c9a84c] uppercase tracking-wide">
                            {v.reference}
                          </span>
                          <span className="text-[9px] font-mono text-[#8c8270] uppercase">
                            {v.testament} • {v.category}
                          </span>
                        </div>

                        <p className="text-xs font-sans leading-relaxed text-[#f4efe2] line-clamp-3">
                          « {renderHighlightedSnippet(v.cleanText, debouncedQuery)} »
                        </p>
                      </div>
                    );
                  })}

                  {searchResults.length > resultsLimit && (
                    <button
                      onClick={() => setResultsLimit(prev => prev + 20)}
                      className="w-full py-2.5 rounded-xl border border-[#2e2a1e] hover:border-[#c9a84c] bg-[#12100c] hover:bg-[#1a1712] text-[#c9a84c] font-mono text-xs font-bold uppercase transition cursor-pointer"
                    >
                      Voir plus de résultats (+20)
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
