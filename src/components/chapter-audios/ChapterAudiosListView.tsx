import React from 'react';
import { BookOpen, Calendar, CheckCircle, CloudUpload, Search } from 'lucide-react';
import { ChapterAudioMeditation } from '../../types/bible';

interface GroupedItem<T> {
  book_id?: number;
  book_name?: string;
  label?: string;
  items: T[];
}

interface ChapterAudiosListViewProps {
  filteredAudios: ChapterAudioMeditation[];
  viewMode: 'book' | 'date';
  selectedSyncFilter: 'all' | 'synced' | 'local' | 'missing';
  unsyncedCount: number;
  syncedCount: number;
  isSyncingCloud: boolean;
  onSyncAllToCloud?: () => Promise<void>;
  onResetFilters: () => void;
  onSelectSyncFilter: (filter: 'all' | 'synced' | 'local' | 'missing') => void;
  groupedByBook: GroupedItem<ChapterAudioMeditation>[];
  groupedByDateBuckets: GroupedItem<ChapterAudioMeditation>[];
  renderAudioCard: (item: ChapterAudioMeditation) => React.ReactNode;
}

export const ChapterAudiosListView: React.FC<ChapterAudiosListViewProps> = ({
  filteredAudios,
  viewMode,
  selectedSyncFilter,
  unsyncedCount,
  syncedCount,
  isSyncingCloud,
  onSyncAllToCloud,
  onResetFilters,
  onSelectSyncFilter,
  groupedByBook,
  groupedByDateBuckets,
  renderAudioCard
}) => {
  if (filteredAudios.length === 0) {
    if (selectedSyncFilter === 'local' && unsyncedCount === 0) {
      return (
        <div className="bg-[#12100c]/80 border border-emerald-500/30 rounded-2xl p-8 sm:p-10 text-center space-y-3 shadow-soft">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mx-auto shadow-sm">
            <CheckCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="font-serif font-bold text-base text-[#f4efe2]">
              Tous vos audios sont synchronisés !
            </h4>
            <p className="text-xs text-[#a89f8c] leading-relaxed">
              Vos enregistrements audio sont en sécurité dans Cloud Storage et accessibles sur l'ensemble de vos appareils.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectSyncFilter('all')}
            className="mt-2 min-h-[44px] px-4 py-2 bg-[#181510] hover:bg-[#221e16] border border-[#c9a84c]/50 text-[#c9a84c] rounded-xl text-xs font-mono uppercase tracking-wider transition cursor-pointer"
          >
            Afficher tous les audios
          </button>
        </div>
      );
    }

    if (selectedSyncFilter === 'synced' && syncedCount === 0) {
      return (
        <div className="bg-[#12100c]/80 border border-amber-500/30 rounded-2xl p-8 sm:p-10 text-center space-y-3 shadow-soft">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto shadow-sm">
            <CloudUpload className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="font-serif font-bold text-base text-[#f4efe2]">
              Aucun audio synchronisé pour l'instant
            </h4>
            <p className="text-xs text-[#a89f8c] leading-relaxed">
              Vous avez {unsyncedCount} audio(s) stocké(s) localement sur cet appareil en attente de migration vers le Cloud Storage.
            </p>
          </div>
          {onSyncAllToCloud ? (
            <button
              type="button"
              onClick={onSyncAllToCloud}
              disabled={isSyncingCloud}
              className="mt-2 min-h-[44px] px-4 py-2 bg-gradient-to-r from-[#c9a84c] to-[#ebd092] text-[#0d0b07] font-bold rounded-xl text-xs font-serif transition cursor-pointer shadow-gold-glow flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              <CloudUpload className="w-4 h-4" />
              <span>Migrer les {unsyncedCount} audios locaux</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSelectSyncFilter('all')}
              className="mt-2 min-h-[44px] px-4 py-2 bg-[#181510] hover:bg-[#221e16] border border-[#c9a84c]/50 text-[#c9a84c] rounded-xl text-xs font-mono uppercase tracking-wider transition cursor-pointer"
            >
              Afficher tous les audios
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="bg-[#12100c]/70 border border-[#2e2a1e] rounded-2xl p-8 text-center space-y-3 text-[#8c8270]">
        <Search className="w-8 h-8 mx-auto opacity-40 text-[#c9a84c]" />
        <p className="text-xs font-mono">Aucun enregistrement ne correspond à vos critères de recherche.</p>
        <button
          type="button"
          onClick={onResetFilters}
          className="min-h-[44px] px-3.5 py-1.5 bg-[#181510] hover:bg-[#221e16] border border-[#2e2a1e] text-[#c9a84c] rounded-xl text-xs font-mono uppercase tracking-wider transition cursor-pointer"
        >
          Réinitialiser tous les filtres
        </button>
      </div>
    );
  }

  if (viewMode === 'book') {
    return (
      <div className="space-y-6">
        {groupedByBook.map((group) => (
          <div key={group.book_id || group.book_name} className="space-y-3">
            <div className="flex items-center gap-2 px-1 border-b border-[#2e2a1e]/60 pb-1.5">
              <BookOpen className="w-4 h-4 text-[#c9a84c]" />
              <h3 className="font-serif font-extrabold text-sm sm:text-base text-[#c9a84c] tracking-wide">
                {group.book_name}
              </h3>
              <span className="text-xs font-mono text-[#8c8270] bg-[#14120e] px-2 py-0.5 rounded-md border border-[#2e2a1e]/60">
                {group.items.length} audio{group.items.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {group.items.map(renderAudioCard)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedByDateBuckets.map((bucket) => (
        <div key={bucket.label} className="space-y-3">
          <div className="flex items-center gap-2 px-1 border-b border-[#2e2a1e]/60 pb-1.5">
            <Calendar className="w-4 h-4 text-[#c9a84c]" />
            <h3 className="font-serif font-extrabold text-sm sm:text-base text-[#c9a84c] tracking-wide">
              {bucket.label}
            </h3>
            <span className="text-xs font-mono text-[#8c8270] bg-[#14120e] px-2 py-0.5 rounded-md border border-[#2e2a1e]/60">
              {bucket.items.length} audio{bucket.items.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {bucket.items.map(renderAudioCard)}
          </div>
        </div>
      ))}
    </div>
  );
};
