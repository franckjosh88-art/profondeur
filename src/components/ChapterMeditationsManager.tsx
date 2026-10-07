import React, { useState, useMemo } from 'react';
import { Feather, Trash2, Search, BookOpen, Clock, AlertTriangle, X, ChevronRight, Sparkles } from 'lucide-react';
import { ChapterMeditation } from '../types/bible';
import { motion, AnimatePresence } from 'motion/react';

interface ChapterMeditationsManagerProps {
  meditations: ChapterMeditation[];
  onNavigateToChapter: (bookId: number, chapter: number, verseNum?: number) => void;
  onDeleteMeditation: (bookId: number, chapter: number) => Promise<void> | void;
}

export const ChapterMeditationsManager: React.FC<ChapterMeditationsManagerProps> = ({
  meditations,
  onNavigateToChapter,
  onDeleteMeditation
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [meditationToDelete, setMeditationToDelete] = useState<ChapterMeditation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter meditations by search query
  const filteredMeditations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return meditations;
    return meditations.filter(m => 
      m.book_name.toLowerCase().includes(q) ||
      m.text.toLowerCase().includes(q) ||
      `chapitre ${m.chapter}`.includes(q)
    );
  }, [meditations, searchQuery]);

  // Group by book, sorted canonical by book_id, chapters sorted ascending
  const groupedByBook = useMemo(() => {
    const groups: { book_id: number; book_name: string; items: ChapterMeditation[] }[] = [];
    const map = new Map<number, { book_id: number; book_name: string; items: ChapterMeditation[] }>();

    filteredMeditations.forEach(m => {
      if (!map.has(m.book_id)) {
        map.set(m.book_id, {
          book_id: m.book_id,
          book_name: m.book_name,
          items: []
        });
      }
      map.get(m.book_id)!.items.push(m);
    });

    // Sort books by book_id
    const sortedBookIds = Array.from(map.keys()).sort((a, b) => a - b);
    sortedBookIds.forEach(id => {
      const g = map.get(id)!;
      // Sort chapters ascending
      g.items.sort((a, b) => a.chapter - b.chapter);
      groups.push(g);
    });

    return groups;
  }, [filteredMeditations]);

  const confirmDelete = async () => {
    if (!meditationToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteMeditation(meditationToDelete.book_id, meditationToDelete.chapter);
      setMeditationToDelete(null);
    } catch (e) {
      console.error("Error deleting meditation:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (_) {
      return '';
    }
  };

  return (
    <div className="space-y-5 text-left select-none max-w-4xl mx-auto">
      {/* Barre d'en-tête & Recherche */}
      <div className="bg-[#12100c] border border-[#2e2a1e] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c9a84c]/15 border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c] shrink-0 shadow-sm">
            <Feather className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h2 className="font-serif font-black text-base sm:text-lg text-[#f4efe2]">
              Mes Méditations de Chapitre
            </h2>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#8c8270] block">
              {meditations.length} méditation{meditations.length > 1 ? 's' : ''} enregistrée{meditations.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#8c8270] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer par livre ou mot-clé..."
            className="w-full bg-[#0a0805] border border-[#2e2a1e] focus:border-[#c9a84c]/60 rounded-xl pl-8 pr-8 py-2 text-xs text-[#f4efe2] placeholder-[#6b6355] outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8c8270] hover:text-[#f4efe2] p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Liste des méditations groupées */}
      {meditations.length === 0 ? (
        /* État vide initial */
        <div className="bg-[#12100c]/70 border border-[#2e2a1e] rounded-2xl p-10 text-center space-y-3 shadow-soft">
          <div className="w-14 h-14 rounded-2xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center text-[#c9a84c] mx-auto shadow-inner">
            <Feather className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="font-serif font-bold text-sm sm:text-base text-[#f4efe2]">
            Aucune méditation de chapitre enregistrée
          </h3>
          <p className="text-xs text-[#8c8270] max-w-md mx-auto leading-relaxed font-sans">
            À la fin de chaque chapitre de lecture, une carte vous permet d'écrire en quelques phrases ce que vous en avez retenu. Vos réflexions apparaîtront ici, organisées par livre et chapitre.
          </p>
        </div>
      ) : filteredMeditations.length === 0 ? (
        /* Aucun résultat pour la recherche */
        <div className="bg-[#12100c]/70 border border-[#2e2a1e] rounded-2xl p-8 text-center space-y-2 text-[#8c8270]">
          <Search className="w-8 h-8 mx-auto opacity-40" />
          <p className="text-xs font-mono">Aucune méditation ne correspond à votre recherche « {searchQuery} ».</p>
        </div>
      ) : (
        /* Groupes par livre */
        <div className="space-y-6">
          {groupedByBook.map((group) => (
            <div key={group.book_id} className="space-y-3">
              {/* En-tête du groupe Livre */}
              <div className="flex items-center gap-2 px-1 border-b border-[#2e2a1e]/60 pb-1.5">
                <BookOpen className="w-4 h-4 text-[#c9a84c]" />
                <h3 className="font-serif font-extrabold text-sm sm:text-base text-[#c9a84c] tracking-wide">
                  {group.book_name}
                </h3>
                <span className="text-[10px] font-mono text-[#8c8270] bg-[#14120e] px-2 py-0.5 rounded-md border border-[#2e2a1e]/60">
                  {group.items.length} chapitre{group.items.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Grille des méditations du livre */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {group.items.map((item) => (
                  <div
                    key={`${item.book_id}_${item.chapter}`}
                    className="bg-[#0e0c08] border border-[#2e2a1e] hover:border-[#c9a84c]/50 rounded-2xl p-4 sm:p-5 shadow-soft transition-all duration-200 flex flex-col justify-between group hover:shadow-[0_0_15px_rgba(201,168,76,0.1)] relative"
                  >
                    <div className="space-y-2.5">
                      {/* Ligne haute : Chapitre & Date */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-serif font-black text-xs sm:text-sm text-[#c9a84c] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]/70" />
                          <span>{item.book_name} {item.chapter}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono text-[#8c8270] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#6b6355]" />
                            <span>{formatDate(item.updated_at || item.created_at)}</span>
                          </span>

                          {/* Bouton supprimer */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMeditationToDelete(item);
                            }}
                            className="p-1 rounded-md text-[#6b6355] hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                            title="Supprimer cette méditation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Texte / extrait de la méditation */}
                      <p 
                        onClick={() => onNavigateToChapter(item.book_id, item.chapter, 1)}
                        className="font-serif italic text-xs sm:text-sm text-[#e8e0d0] leading-relaxed line-clamp-4 cursor-pointer hover:text-white transition select-text"
                      >
                        « {item.text} »
                      </p>
                    </div>

                    {/* Ligne basse : Bouton ouvrir le chapitre */}
                    <div className="pt-3 mt-3 border-t border-[#2e2a1e]/40 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => onNavigateToChapter(item.book_id, item.chapter, 1)}
                        className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#c9a84c] hover:text-[#ebd092] flex items-center gap-1 transition cursor-pointer"
                      >
                        <span>Ouvrir le chapitre {item.chapter}</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      <span className="text-[9px] font-mono text-[#6b6355]">
                        {item.text.length} car.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      <AnimatePresence>
        {meditationToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#12100c] border border-red-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl text-left"
            >
              <div className="flex items-center gap-3 text-red-400">
                <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-black text-sm text-[#f4efe2]">
                    Supprimer la méditation ?
                  </h4>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#8c8270] block">
                    {meditationToDelete.book_name} Chapitre {meditationToDelete.chapter}
                  </span>
                </div>
              </div>

              <div className="bg-[#0a0805] border border-[#2e2a1e] rounded-xl p-3">
                <p className="text-xs font-serif italic text-[#c4bdae] line-clamp-3">
                  « {meditationToDelete.text} »
                </p>
              </div>

              <p className="text-xs text-[#8c8270] leading-normal font-sans">
                Êtes-vous sûr de vouloir supprimer cette méditation de chapitre ? Cette action est définitive.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setMeditationToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-[#8c8270] hover:text-[#f4efe2] bg-[#1a1712] border border-[#2e2a1e] cursor-pointer transition"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 cursor-pointer transition shadow-md flex items-center gap-1.5"
                >
                  {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
