import React, { useState, useMemo } from 'react';
import { 
  Folder, FolderPlus, Heart, BookOpen, Trash2, Edit3, Share2, Copy, Check, 
  Search, Sparkles, Shield, Star, Book, Flame, Feather, Sun, Cross, 
  ChevronRight, Tag, ArrowLeft, Filter, Layers, X
} from 'lucide-react';
import { FavoriteVerse, BookmarkFolder } from '../types/bible';
import { motion, AnimatePresence } from 'motion/react';

interface BookmarkFoldersManagerProps {
  favorites: FavoriteVerse[];
  folders: BookmarkFolder[];
  onNavigateToVerse: (bookId: number, chapter: number, verseNum: number) => void;
  onToggleFavorite: (verse: { book_id: number; book_name: string; chapter: number; verse: number; text: string }) => void;
  onAssignVerseToFolder: (verse: FavoriteVerse, folderId?: string, folderName?: string) => Promise<void> | void;
  onCreateFolder: (folder: Omit<BookmarkFolder, 'id' | 'created_at'>) => Promise<string | void> | void;
  onUpdateFolder: (folderId: string, updates: Partial<BookmarkFolder>) => Promise<void> | void;
  onDeleteFolder: (folderId: string) => Promise<void> | void;
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; glow: string; badge: string }> = {
  gold: {
    bg: 'bg-[#c9a84c]/10',
    border: 'border-[#c9a84c]/40',
    text: 'text-[#c9a84c]',
    glow: 'shadow-[0_0_15px_rgba(201,168,76,0.15)]',
    badge: 'bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c]/30'
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    text: 'text-emerald-400',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/40',
    text: 'text-indigo-400',
    glow: 'shadow-[0_0_15px_rgba(99,102,241,0.15)]',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    text: 'text-amber-400',
    glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  },
  rose: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/40',
    text: 'text-rose-400',
    glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/40',
    text: 'text-cyan-400',
    glow: 'shadow-[0_0_15px_rgba(6,182,212,0.15)]',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/40',
    text: 'text-purple-400',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.15)]',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
  }
};

const AVAILABLE_ICONS = [
  { id: 'sparkles', label: 'Étoiles', Icon: Sparkles },
  { id: 'heart', label: 'Cœur', Icon: Heart },
  { id: 'shield', label: 'Bouclier', Icon: Shield },
  { id: 'star', label: 'Étoile', Icon: Star },
  { id: 'book', label: 'Livre', Icon: Book },
  { id: 'flame', label: 'Flamme', Icon: Flame },
  { id: 'feather', label: 'Plume', Icon: Feather },
  { id: 'sun', label: 'Soleil', Icon: Sun },
  { id: 'cross', label: 'Croix', Icon: Cross }
];

const AVAILABLE_COLORS = [
  { id: 'gold', label: 'Or Royal', hex: '#c9a84c' },
  { id: 'emerald', label: 'Émeraude', hex: '#10b981' },
  { id: 'indigo', label: 'Indigo', hex: '#6366f1' },
  { id: 'amber', label: 'Ambre', hex: '#f59e0b' },
  { id: 'rose', label: 'Rose Rubis', hex: '#f43f5e' },
  { id: 'cyan', label: 'Cyan Céleste', hex: '#06b6d4' },
  { id: 'purple', label: 'Pourpre', hex: '#a855f7' }
];

export const BookmarkFoldersManager: React.FC<BookmarkFoldersManagerProps> = ({
  favorites,
  folders,
  onNavigateToVerse,
  onToggleFavorite,
  onAssignVerseToFolder,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null); // null = 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal create/edit folder states
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<BookmarkFolder | null>(null);
  const [folderFormName, setFolderFormName] = useState('');
  const [folderFormDesc, setFolderFormDesc] = useState('');
  const [folderFormColor, setFolderFormColor] = useState('gold');
  const [folderFormIcon, setFolderFormIcon] = useState('sparkles');
  const [formError, setFormError] = useState<string | null>(null);

  // Compute folder counts
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let unclassified = 0;

    favorites.forEach(fav => {
      if (fav.folder_id) {
        counts[fav.folder_id] = (counts[fav.folder_id] || 0) + 1;
      } else {
        unclassified++;
      }
    });

    return { counts, unclassified };
  }, [favorites]);

  // Filtered favorites
  const filteredFavorites = useMemo(() => {
    return favorites.filter(fav => {
      // 1. Folder filter
      if (selectedFolderId === 'unclassified') {
        if (fav.folder_id) return false;
      } else if (selectedFolderId !== null) {
        if (fav.folder_id !== selectedFolderId) return false;
      }

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const ref = `${fav.book_name} ${fav.chapter}:${fav.verse}`.toLowerCase();
        const text = fav.text.toLowerCase();
        const folderName = (fav.folder_name || '').toLowerCase();
        return ref.includes(q) || text.includes(q) || folderName.includes(q);
      }

      return true;
    });
  }, [favorites, selectedFolderId, searchQuery]);

  const activeFolder = useMemo(() => {
    if (!selectedFolderId || selectedFolderId === 'unclassified') return null;
    return folders.find(f => f.id === selectedFolderId) || null;
  }, [selectedFolderId, folders]);

  const handleOpenCreateModal = () => {
    setEditingFolder(null);
    setFolderFormName('');
    setFolderFormDesc('');
    setFolderFormColor('gold');
    setFolderFormIcon('sparkles');
    setFormError(null);
    setIsFolderModalOpen(true);
  };

  const handleOpenEditModal = (folder: BookmarkFolder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingFolder(folder);
    setFolderFormName(folder.name);
    setFolderFormDesc(folder.description || '');
    setFolderFormColor(folder.color || 'gold');
    setFolderFormIcon(folder.icon || 'sparkles');
    setFormError(null);
    setIsFolderModalOpen(true);
  };

  const handleSaveFolderModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderFormName.trim()) {
      setFormError('Le nom du dossier thématique est obligatoire.');
      return;
    }

    try {
      if (editingFolder) {
        await onUpdateFolder(editingFolder.id, {
          name: folderFormName.trim(),
          description: folderFormDesc.trim(),
          color: folderFormColor,
          icon: folderFormIcon,
          updated_at: new Date().toISOString()
        });
      } else {
        await onCreateFolder({
          name: folderFormName.trim(),
          description: folderFormDesc.trim(),
          color: folderFormColor,
          icon: folderFormIcon
        });
      }
      setIsFolderModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Une erreur est survenue lors de l'enregistrement.");
    }
  };

  const handleDeleteFolderConfirm = async (folder: BookmarkFolder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const count = folderCounts.counts[folder.id] || 0;
    const msg = count > 0
      ? `Êtes-vous sûr de vouloir supprimer le dossier « ${folder.name} » ? Les ${count} verset(s) seront conservés et placés dans les « Non classés » sans être supprimés de vos favoris.`
      : `Voulez-vous supprimer le dossier « ${folder.name} » ?`;

    if (window.confirm(msg)) {
      await onDeleteFolder(folder.id);
      if (selectedFolderId === folder.id) {
        setSelectedFolderId(null);
      }
    }
  };

  const handleCopyVerse = (fav: FavoriteVerse) => {
    const textToCopy = `« ${fav.text} »\n— ${fav.book_name} ${fav.chapter}:${fav.verse}`;
    navigator.clipboard.writeText(textToCopy);
    const key = `${fav.book_id}_${fav.chapter}_${fav.verse}`;
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleShareVerse = async (fav: FavoriteVerse) => {
    const textToShare = `« ${fav.text} »\n— ${fav.book_name} ${fav.chapter}:${fav.verse}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${fav.book_name} ${fav.chapter}:${fav.verse}`,
          text: textToShare
        });
      } catch (_) {}
    } else {
      handleCopyVerse(fav);
    }
  };

  const renderIcon = (iconName?: string, className: string = 'w-4 h-4') => {
    const found = AVAILABLE_ICONS.find(i => i.id === iconName);
    const IconComponent = found ? found.Icon : Sparkles;
    return <IconComponent className={className} />;
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* HEADER SECTION */}
      <div className="bg-[#12100c] border border-[#2e2a1e] p-5 sm:p-6 rounded-[2rem] shadow-soft relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#c9a84c]/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#c9a84c] animate-pulse"></span>
              <span className="text-[10px] font-mono tracking-widest text-[#c9a84c] uppercase font-bold">
                Organisation Spirituelle & Thématique
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-extrabold text-[#e8e0d0] tracking-tight">
              Mes Favoris par Thèmes
            </h2>
            <p className="text-xs text-[#a0947f] font-sans mt-0.5">
              Classez vos passages préférés en dossiers personnalisés pour méditer selon vos besoins spirituels.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#c9a84c]/15 hover:bg-[#c9a84c]/25 text-[#c9a84c] border border-[#c9a84c]/40 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            <FolderPlus className="w-4 h-4 text-[#c9a84c]" />
            <span>Nouveau Thème</span>
          </button>
        </div>

        {/* STATS STRIP */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-[#2e2a1e]/60">
          <div className="bg-[#17140f] border border-[#2e2a1e]/40 p-3 rounded-xl flex flex-col">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#6b6355]">Total Favoris</span>
            <span className="text-lg font-mono font-extrabold text-[#e8e0d0] mt-0.5">{favorites.length}</span>
          </div>

          <div className="bg-[#17140f] border border-[#2e2a1e]/40 p-3 rounded-xl flex flex-col">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#6b6355]">Thèmes Actifs</span>
            <span className="text-lg font-mono font-extrabold text-[#c9a84c] mt-0.5">{folders.length}</span>
          </div>

          <div className="bg-[#17140f] border border-[#2e2a1e]/40 p-3 rounded-xl flex flex-col">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#6b6355]">Non Classés</span>
            <span className="text-lg font-mono font-extrabold text-[#8e8574] mt-0.5">{folderCounts.unclassified}</span>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b6355]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par référence, mot-clé ou texte biblique..."
            className="w-full bg-[#12100c] border border-[#2e2a1e] rounded-xl pl-10 pr-9 py-2.5 text-xs text-[#e8e0d0] placeholder-[#6b6355] focus:outline-none focus:border-[#c9a84c] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6355] hover:text-[#e8e0d0]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* THEMES & FOLDERS CAROUSEL / GRID */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#6b6355] font-bold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#c9a84c]" />
            Dossiers Thématiques ({folders.length})
          </span>
          {selectedFolderId !== null && (
            <button
              onClick={() => setSelectedFolderId(null)}
              className="text-[9px] font-mono text-[#c9a84c] hover:underline uppercase cursor-pointer"
            >
              Afficher tout ({favorites.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* 1. All Favorites Card */}
          <button
            onClick={() => setSelectedFolderId(null)}
            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[105px] group ${
              selectedFolderId === null
                ? 'bg-[#1a1712] border-[#c9a84c] shadow-[0_0_15px_rgba(201,168,76,0.18)] scale-[1.01]'
                : 'bg-[#12100c] border-[#2e2a1e] hover:border-[#c9a84c]/40 hover:bg-[#16130e]'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-xl border ${selectedFolderId === null ? 'bg-[#c9a84c]/20 border-[#c9a84c]/50 text-[#c9a84c]' : 'bg-[#1a1712] border-[#2e2a1e] text-[#8e8574]'}`}>
                <Heart className="w-4 h-4 fill-current" />
              </div>
              <span className="text-xs font-mono font-bold text-[#e8e0d0] px-2 py-0.5 rounded-full bg-[#1e1b15] border border-[#2e2a1e]">
                {favorites.length}
              </span>
            </div>
            <div className="mt-2">
              <h4 className={`text-xs font-serif font-bold truncate ${selectedFolderId === null ? 'text-[#c9a84c]' : 'text-[#e8e0d0]'}`}>
                Tous les favoris
              </h4>
              <p className="text-[9.5px] text-[#6b6355] font-sans truncate">
                L'ensemble de vos versets
              </p>
            </div>
          </button>

          {/* 2. Unclassified Card */}
          <button
            onClick={() => setSelectedFolderId('unclassified')}
            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[105px] group ${
              selectedFolderId === 'unclassified'
                ? 'bg-[#1a1712] border-[#8e8574] shadow-sm scale-[1.01]'
                : 'bg-[#12100c] border-[#2e2a1e] hover:border-[#8e8574]/40 hover:bg-[#16130e]'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-xl border ${selectedFolderId === 'unclassified' ? 'bg-[#8e8574]/20 border-[#8e8574]/50 text-[#e8e0d0]' : 'bg-[#1a1712] border-[#2e2a1e] text-[#6b6355]'}`}>
                <Folder className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono font-bold text-[#8e8574] px-2 py-0.5 rounded-full bg-[#1e1b15] border border-[#2e2a1e]">
                {folderCounts.unclassified}
              </span>
            </div>
            <div className="mt-2">
              <h4 className={`text-xs font-serif font-bold truncate ${selectedFolderId === 'unclassified' ? 'text-[#e8e0d0]' : 'text-[#a0947f]'}`}>
                Non classés
              </h4>
              <p className="text-[9.5px] text-[#6b6355] font-sans truncate">
                Versets sans thème
              </p>
            </div>
          </button>

          {/* 3. Thematic Folders */}
          {folders.map(folder => {
            const isSelected = selectedFolderId === folder.id;
            const count = folderCounts.counts[folder.id] || 0;
            const style = COLOR_MAP[folder.color || 'gold'] || COLOR_MAP.gold;

            return (
              <div
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[105px] relative group ${
                  isSelected
                    ? `${style.bg} ${style.border} ${style.glow} scale-[1.01]`
                    : 'bg-[#12100c] border-[#2e2a1e] hover:border-[#c9a84c]/40 hover:bg-[#16130e]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-xl border ${style.bg} ${style.border} ${style.text}`}>
                    {renderIcon(folder.icon, 'w-4 h-4')}
                  </div>

                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${isSelected ? style.badge : 'bg-[#1e1b15] text-[#a0947f] border-[#2e2a1e]'}`}>
                      {count}
                    </span>

                    {/* Quick options menu on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center pl-1">
                      <button
                        onClick={(e) => handleOpenEditModal(folder, e)}
                        title="Modifier ce dossier"
                        className="p-1 hover:text-[#c9a84c] text-[#6b6355] transition"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteFolderConfirm(folder, e)}
                        title="Supprimer ce dossier"
                        className="p-1 hover:text-rose-400 text-[#6b6355] transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <h4 className={`text-xs font-serif font-bold truncate ${isSelected ? style.text : 'text-[#e8e0d0]'}`}>
                    {folder.name}
                  </h4>
                  <p className="text-[9.5px] text-[#6b6355] font-sans truncate">
                    {folder.description || `${count} verset(s) sauvegardé(s)`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ACTIVE FOLDER BANNER (IF A THEME IS SELECTED) */}
      {activeFolder && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${COLOR_MAP[activeFolder.color || 'gold']?.bg || 'bg-[#12100c]'} ${COLOR_MAP[activeFolder.color || 'gold']?.border || 'border-[#2e2a1e]'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${COLOR_MAP[activeFolder.color || 'gold']?.badge || 'bg-[#c9a84c]/20 text-[#c9a84c]'}`}>
              {renderIcon(activeFolder.icon, 'w-5 h-5')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-serif font-bold text-sm sm:text-base ${COLOR_MAP[activeFolder.color || 'gold']?.text || 'text-[#c9a84c]'}`}>
                  {activeFolder.name}
                </h3>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#12100c] border border-[#2e2a1e] text-[#a0947f]">
                  {folderCounts.counts[activeFolder.id] || 0} verset(s)
                </span>
              </div>
              {activeFolder.description && (
                <p className="text-xs text-[#a0947f] font-sans mt-0.5">
                  {activeFolder.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => handleOpenEditModal(activeFolder)}
              className="px-3 py-1.5 bg-[#17140f] hover:bg-[#201b13] border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#a0947f] hover:text-[#e8e0d0] rounded-xl text-[10px] font-mono uppercase font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Edit3 className="w-3 h-3 text-[#c9a84c]" />
              <span>Modifier</span>
            </button>
            <button
              onClick={() => handleDeleteFolderConfirm(activeFolder)}
              className="px-3 py-1.5 bg-[#17140f] hover:bg-rose-500/10 border border-[#2e2a1e] hover:border-rose-500/30 text-[#6b6355] hover:text-rose-400 rounded-xl text-[10px] font-mono uppercase font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Supprimer</span>
            </button>
          </div>
        </div>
      )}

      {/* VERSES LIST SECTION */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#6b6355] font-bold">
            {filteredFavorites.length} passage(s) trouvé(s)
            {selectedFolderId && (
              <span> dans « {activeFolder ? activeFolder.name : (selectedFolderId === 'unclassified' ? 'Non classés' : 'Tous')} »</span>
            )}
          </span>

          {searchQuery && (
            <span className="text-[10px] font-mono text-[#c9a84c]">
              Filtre actif : « {searchQuery} »
            </span>
          )}
        </div>

        {filteredFavorites.length === 0 ? (
          <div className="bg-[#12100c] border border-[#2e2a1e] rounded-[2rem] p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1a1712] border border-[#2e2a1e] flex items-center justify-center mx-auto text-[#6b6355]">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-base font-serif font-bold text-[#e8e0d0]">
              {favorites.length === 0 
                ? "Aucun verset favori pour le moment"
                : (selectedFolderId 
                  ? "Aucun verset dans ce dossier thématique"
                  : "Aucun verset ne correspond à votre recherche")}
            </h3>
            <p className="text-xs text-[#a0947f] font-sans max-w-md mx-auto">
              {favorites.length === 0
                ? "Lors de votre lecture dans la Bible, cliquez sur le bouton « Favori » en forme de cœur sur n'importe quel verset pour l'ajouter à vos dossiers thématiques."
                : (selectedFolderId
                  ? "Sélectionnez « Tous les favoris » ci-dessus, puis choisissez ce dossier dans le menu déroulant d'un verset pour l'y classer."
                  : "Essayez de modifier votre mot-clé de recherche ou de réinitialiser le filtre.")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFavorites.map((fav) => {
              const key = `${fav.book_id}_${fav.chapter}_${fav.verse}`;
              const isCopied = copiedId === key;
              const currentFolder = fav.folder_id ? folders.find(f => f.id === fav.folder_id) : null;
              const folderStyle = currentFolder ? COLOR_MAP[currentFolder.color || 'gold'] : null;

              return (
                <div
                  key={key}
                  className="bg-[#12100c] border border-[#2e2a1e] hover:border-[#c9a84c]/30 rounded-2xl p-4 sm:p-5 space-y-3 transition-all duration-200 group"
                >
                  {/* Top line: Reference + Thematic Folder Dropdown */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2e2a1e]/40 pb-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onNavigateToVerse(fav.book_id, fav.chapter, fav.verse)}
                        className="font-serif font-extrabold text-sm sm:text-base text-[#c9a84c] hover:underline flex items-center gap-1.5 cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4 text-[#c9a84c]" />
                        <span>{fav.book_name} {fav.chapter}:{fav.verse}</span>
                      </button>

                      {currentFolder && folderStyle && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${folderStyle.badge}`}>
                          {renderIcon(currentFolder.icon, 'w-2.5 h-2.5')}
                          <span>{currentFolder.name}</span>
                        </span>
                      )}
                    </div>

                    {/* Folder Assignment Dropdown */}
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-[#6b6355]" />
                      <select
                        value={fav.folder_id || ''}
                        onChange={(e) => {
                          const newFolderId = e.target.value || undefined;
                          const found = newFolderId ? folders.find(f => f.id === newFolderId) : undefined;
                          onAssignVerseToFolder(fav, newFolderId, found?.name);
                        }}
                        className="bg-[#17140f] border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#a0947f] hover:text-[#e8e0d0] rounded-lg px-2.5 py-1 text-[10px] font-mono outline-none cursor-pointer transition"
                        title="Classer ce verset dans un dossier thématique"
                      >
                        <option value="">(Non classé)</option>
                        {folders.map(f => (
                          <option key={f.id} value={f.id}>
                            📁 {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Biblical Verse Text */}
                  <p className="font-serif text-sm sm:text-base text-[#e8e0d0] leading-relaxed italic pl-3 border-l-2 border-[#c9a84c]/40">
                    « {fav.text} »
                  </p>

                  {/* Actions footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-[9px] font-mono text-[#6b6355]">
                      Ajouté le {new Date(fav.added_at).toLocaleDateString('fr-FR')}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onNavigateToVerse(fav.book_id, fav.chapter, fav.verse)}
                        className="px-2.5 py-1 bg-[#17140f] hover:bg-[#201b13] border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#c9a84c] rounded-lg text-[9.5px] font-mono uppercase font-bold flex items-center gap-1 transition cursor-pointer"
                        title="Ouvrir dans la lecture biblique"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Lire</span>
                      </button>

                      <button
                        onClick={() => handleCopyVerse(fav)}
                        className="p-1.5 bg-[#17140f] hover:bg-[#201b13] border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#a0947f] hover:text-[#e8e0d0] rounded-lg text-[10px] transition cursor-pointer"
                        title="Copier le verset"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => handleShareVerse(fav)}
                        className="p-1.5 bg-[#17140f] hover:bg-[#201b13] border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#a0947f] hover:text-[#e8e0d0] rounded-lg text-[10px] transition cursor-pointer"
                        title="Partager le verset"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onToggleFavorite({ book_id: fav.book_id, book_name: fav.book_name, chapter: fav.chapter, verse: fav.verse, text: fav.text })}
                        className="p-1.5 bg-[#17140f] hover:bg-rose-500/10 border border-[#2e2a1e] hover:border-rose-500/30 text-[#6b6355] hover:text-rose-400 rounded-lg text-[10px] transition cursor-pointer"
                        title="Retirer des favoris"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT FOLDER MODAL */}
      <AnimatePresence>
        {isFolderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12100c] border border-[#2e2a1e] rounded-[2rem] p-6 w-full max-w-md shadow-gold-intense space-y-4 relative"
            >
              <div className="flex justify-between items-center pb-2 border-b border-[#2e2a1e]">
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-[#c9a84c]" />
                  <h3 className="font-serif font-extrabold text-sm sm:text-base text-[#e8e0d0]">
                    {editingFolder ? 'Modifier le Thème' : 'Nouveau Dossier Thématique'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsFolderModalOpen(false)}
                  className="p-1 text-[#6b6355] hover:text-[#e8e0d0] rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-sans">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveFolderModal} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9.5px] font-mono uppercase text-[#6b6355] font-bold">
                    Nom du Thème / Dossier *
                  </label>
                  <input
                    type="text"
                    required
                    value={folderFormName}
                    onChange={(e) => setFolderFormName(e.target.value)}
                    placeholder="Ex : Promesses Divines, Prières, Famille..."
                    className="w-full bg-[#17140f] border border-[#2e2a1e] focus:border-[#c9a84c] rounded-xl px-3 py-2 text-xs text-[#e8e0d0] placeholder-[#6b6355] outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9.5px] font-mono uppercase text-[#6b6355] font-bold">
                    Description ou intention spirituelle
                  </label>
                  <input
                    type="text"
                    value={folderFormDesc}
                    onChange={(e) => setFolderFormDesc(e.target.value)}
                    placeholder="Ex : Versets d'encouragement pour les moments d'épreuve..."
                    className="w-full bg-[#17140f] border border-[#2e2a1e] focus:border-[#c9a84c] rounded-xl px-3 py-2 text-xs text-[#e8e0d0] placeholder-[#6b6355] outline-none transition"
                  />
                </div>

                {/* Color selection */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-mono uppercase text-[#6b6355] font-bold">
                    Couleur d'accent
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_COLORS.map(c => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setFolderFormColor(c.id)}
                        className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                          folderFormColor === c.id ? 'scale-110 border-white' : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      >
                        {folderFormColor === c.id && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon selection */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-mono uppercase text-[#6b6355] font-bold">
                    Icône Thématique
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {AVAILABLE_ICONS.map(i => {
                      const IconC = i.Icon;
                      const isSelected = folderFormIcon === i.id;
                      return (
                        <button
                          type="button"
                          key={i.id}
                          onClick={() => setFolderFormIcon(i.id)}
                          className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#c9a84c]/20 border-[#c9a84c] text-[#c9a84c]'
                              : 'bg-[#17140f] border-[#2e2a1e] text-[#8e8574] hover:text-[#e8e0d0]'
                          }`}
                          title={i.label}
                        >
                          <IconC className="w-4 h-4" />
                          <span className="text-[8px] font-mono">{i.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#2e2a1e]/60">
                  <button
                    type="button"
                    onClick={() => setIsFolderModalOpen(false)}
                    className="px-4 py-2 bg-[#17140f] hover:bg-[#201b13] border border-[#2e2a1e] text-[#a0947f] rounded-xl text-xs font-mono uppercase transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#c9a84c] hover:bg-[#d8b85c] text-[#0d0b07] font-serif font-bold rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
                  >
                    {editingFolder ? 'Enregistrer les modifications' : 'Créer le dossier'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
