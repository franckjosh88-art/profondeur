import React, { useState } from 'react';
import { Bookmark, Highlighter, X, Trash2, BookOpen, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FavoriteVerse } from '../types/bible';
import { cleanBibleMarkdown } from '../lib/bibleFormatter';

interface BookmarksModalProps {
  isOpen: boolean;
  favorites: FavoriteVerse[];
  initialTab?: 'bookmarks' | 'highlights';
  onClose: () => void;
  onNavigateToVerse: (bookId: number, chapter: number, verse: number) => void;
  onRemoveFavorite: (id: string) => void;
}

export const BookmarksModal: React.FC<BookmarksModalProps> = ({
  isOpen,
  favorites,
  initialTab = 'bookmarks',
  onClose,
  onNavigateToVerse,
  onRemoveFavorite
}) => {
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'highlights'>(initialTab);
  const [filterText, setFilterText] = useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Separate bookmarks (favorites without color or with default) and highlights
  const items = favorites.filter(fav => {
    if (activeTab === 'highlights') {
      return Boolean(fav.color && fav.color !== 'none');
    }
    return true;
  });

  const filteredItems = items.filter(fav => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return (
      fav.book_name.toLowerCase().includes(q) ||
      fav.text.toLowerCase().includes(q) ||
      `${fav.chapter}:${fav.verse}`.includes(q)
    );
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-xl rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.9),0_0_20px_rgba(201,168,76,0.15)] flex flex-col max-h-[85vh] overflow-hidden border border-[#2e2a1e] bg-[#0c0a07] text-[#e8e0d0] text-left"
          >
            {/* EN-TÊTE */}
            <div className="p-4 border-b border-[#2e2a1e] flex items-center justify-between bg-[#12100c]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30 flex items-center justify-center">
                  {activeTab === 'bookmarks' ? <Bookmark className="w-5 h-5" /> : <Highlighter className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-serif font-black text-base text-[#f4efe2]">
                    {activeTab === 'bookmarks' ? 'Signets & Favoris' : 'Versets Surlignés'}
                  </h3>
                  <span className="text-[10px] font-mono text-[#8c8270] block">
                    {filteredItems.length} verset{filteredItems.length > 1 ? 's' : ''} enregistré{filteredItems.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#8c8270] hover:text-[#c9a84c] hover:bg-[#1a1712] transition cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ONGLETS ET RECHERCHE */}
            <div className="p-3 border-b border-[#2e2a1e] bg-[#050403] space-y-2.5">
              <div className="flex p-1 rounded-xl bg-[#12100c] border border-[#2e2a1e]">
                <button
                  onClick={() => setActiveTab('bookmarks')}
                  className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'bookmarks'
                      ? 'bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/40'
                      : 'text-[#8c8270] hover:text-[#e8e0d0]'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Tous les signets</span>
                </button>
                <button
                  onClick={() => setActiveTab('highlights')}
                  className={`flex-1 py-1.5 text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'highlights'
                      ? 'bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/40'
                      : 'text-[#8c8270] hover:text-[#e8e0d0]'
                  }`}
                >
                  <Highlighter className="w-3.5 h-3.5" />
                  <span>Surlignages</span>
                </button>
              </div>

              {/* Barre de filtre */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8c8270] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Filtrer par livre ou mot..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#12100c] border border-[#2e2a1e] focus:border-[#c9a84c]/60 text-[#f4efe2] placeholder:text-[#8c8270] outline-none"
                />
              </div>
            </div>

            {/* LISTE DES VERSETS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scroller-thin">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-[#8c8270] space-y-2">
                  <Bookmark className="w-10 h-10 mx-auto opacity-30 stroke-[1.5]" />
                  <p className="text-xs font-mono">Aucun verset enregistré dans cette catégorie</p>
                  <p className="text-[10px] text-[#8c8270]/80">Touchez l'icône de signet lors de votre lecture pour en ajouter.</p>
                </div>
              ) : (
                filteredItems.map((fav) => (
                  <div
                    key={fav.id}
                    className="p-3.5 rounded-xl border border-[#2e2a1e] bg-[#12100c] hover:border-[#c9a84c]/50 transition group space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          onNavigateToVerse(fav.book_id, fav.chapter, fav.verse);
                          onClose();
                        }}
                        className="font-serif font-black text-xs text-[#c9a84c] hover:text-[#ebd092] flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{fav.book_name} {fav.chapter}:{fav.verse}</span>
                      </button>

                      <button
                        onClick={() => onRemoveFavorite(fav.id)}
                        className="p-1 rounded text-[#8c8270] hover:text-red-400 opacity-60 group-hover:opacity-100 transition cursor-pointer"
                        title="Supprimer des signets"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p 
                      onClick={() => {
                        onNavigateToVerse(fav.book_id, fav.chapter, fav.verse);
                        onClose();
                      }}
                      className="text-xs font-serif leading-relaxed text-[#e8e0d0] hover:text-white cursor-pointer select-text"
                    >
                      « {cleanStrongCodes(fav.text)} »
                    </p>

                    {fav.note && (
                      <div className="p-2 rounded-lg bg-[#050403] border border-[#2e2a1e] text-[10px] text-[#ebd092] font-mono">
                        Note : {fav.note}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
