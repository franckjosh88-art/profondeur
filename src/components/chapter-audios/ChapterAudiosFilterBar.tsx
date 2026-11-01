import React from 'react';
import { Filter, Layers, CloudUpload, CheckCircle, AlertCircle, RefreshCw, Search, X } from 'lucide-react';
import { ChapterAudioMeditation, Book } from '../../types/bible';

interface ChapterAudiosFilterBarProps {
  audios: ChapterAudioMeditation[];
  filteredAudiosCount: number;
  selectedSyncFilter: 'all' | 'synced' | 'local' | 'missing';
  setSelectedSyncFilter: React.Dispatch<React.SetStateAction<'all' | 'synced' | 'local' | 'missing'>>;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedBookFilter: string;
  setSelectedBookFilter: (val: string) => void;
  selectedPeriodFilter: 'all' | 'today' | 'week' | 'month';
  setSelectedPeriodFilter: (val: 'all' | 'today' | 'week' | 'month') => void;
  availableBooks: Book[];
  unsyncedCount: number;
  syncedCount: number;
  missingCount: number;
  onSyncAllToCloud?: () => Promise<void>;
  isSyncingCloud: boolean;
}

export const ChapterAudiosFilterBar: React.FC<ChapterAudiosFilterBarProps> = ({
  audios,
  filteredAudiosCount,
  selectedSyncFilter,
  setSelectedSyncFilter,
  searchQuery,
  setSearchQuery,
  selectedBookFilter,
  setSelectedBookFilter,
  selectedPeriodFilter,
  setSelectedPeriodFilter,
  availableBooks,
  unsyncedCount,
  syncedCount,
  missingCount,
  onSyncAllToCloud,
  isSyncingCloud
}) => {
  return (
    <div className="space-y-3">
      {/* Segmented Filter Buttons for Cloud vs Local Migration */}
      <div className="bg-[#12100c]/90 border border-[#2e2a1e] rounded-2xl p-2.5 sm:p-3 shadow-soft flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono uppercase tracking-wider text-[#8c8270] mr-1 hidden sm:inline flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#c9a84c]" />
            <span>Statut :</span>
          </span>

          {/* Bouton Tous */}
          <button
            type="button"
            onClick={() => setSelectedSyncFilter('all')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer select-none ${
              selectedSyncFilter === 'all'
                ? 'bg-[#c9a84c] text-[#0d0b07] shadow-gold-glow'
                : 'text-[#8c8270] hover:text-[#f4efe2] bg-[#060503] border border-[#2e2a1e] hover:border-[#c9a84c]/40'
            }`}
            aria-label={`Afficher tous les audios (${audios.length})`}
            aria-pressed={selectedSyncFilter === 'all'}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tous</span>
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
              selectedSyncFilter === 'all' ? 'bg-[#0d0b07]/25 text-[#0d0b07]' : 'bg-[#181510] text-[#a0947f]'
            }`}>
              {audios.length}
            </span>
          </button>

          {/* Bouton Non synchronisés (locaux) */}
          <button
            type="button"
            onClick={() => setSelectedSyncFilter(prev => prev === 'local' ? 'all' : 'local')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer select-none ${
              selectedSyncFilter === 'local'
                ? 'bg-amber-500 text-[#0d0b07] shadow-[0_0_15px_rgba(245,158,11,0.35)] ring-2 ring-amber-400/50'
                : 'text-amber-400 bg-[#060503] border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10'
            }`}
            aria-label={`Filtrer par audios non synchronisés locaux (${unsyncedCount})`}
            aria-pressed={selectedSyncFilter === 'local'}
            title="Afficher uniquement les audios stockés localement sur cet appareil"
          >
            <CloudUpload className="w-4 h-4 shrink-0" />
            <span>Non synchronisés (locaux)</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              selectedSyncFilter === 'local' ? 'bg-[#0d0b07]/25 text-[#0d0b07]' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {unsyncedCount}
            </span>
          </button>

          {/* Bouton Synchronisés Cloud */}
          <button
            type="button"
            onClick={() => setSelectedSyncFilter(prev => prev === 'synced' ? 'all' : 'synced')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer select-none ${
              selectedSyncFilter === 'synced'
                ? 'bg-emerald-500 text-[#0d0b07] shadow-[0_0_15px_rgba(16,185,129,0.35)] ring-2 ring-emerald-400/50'
                : 'text-emerald-400 bg-[#060503] border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/10'
            }`}
            aria-label={`Filtrer par audios synchronisés dans le Cloud (${syncedCount})`}
            aria-pressed={selectedSyncFilter === 'synced'}
            title="Afficher uniquement les audios synchronisés dans Cloud Storage"
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Synchronisés Cloud</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              selectedSyncFilter === 'synced' ? 'bg-[#0d0b07]/25 text-[#0d0b07]' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {syncedCount}
            </span>
          </button>

          {/* Bouton Manquants (si présent) */}
          {missingCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedSyncFilter(prev => prev === 'missing' ? 'all' : 'missing')}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer select-none ${
                selectedSyncFilter === 'missing'
                  ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.35)] ring-2 ring-rose-400/50'
                  : 'text-rose-400 bg-[#060503] border border-rose-500/30 hover:border-rose-400 hover:bg-rose-500/10'
              }`}
              aria-label={`Filtrer par audios manquants (${missingCount})`}
              aria-pressed={selectedSyncFilter === 'missing'}
              title="Afficher uniquement les audios introuvables"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Manquants</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                selectedSyncFilter === 'missing' ? 'bg-black/30 text-white' : 'bg-rose-500/20 text-rose-300'
              }`}>
                {missingCount}
              </span>
            </button>
          )}
        </div>

        {/* Quick reset when a non-all filter is active */}
        {selectedSyncFilter !== 'all' && (
          <button
            type="button"
            onClick={() => setSelectedSyncFilter('all')}
            className="text-xs font-mono text-[#8c8270] hover:text-[#c9a84c] flex items-center gap-1.5 transition cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-[#1a1712] min-h-[44px]"
            title="Afficher tous les enregistrements"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Voir tout</span>
          </button>
        )}
      </div>

      {/* Search bar & Secondary filters (Livre, Période) */}
      <div className="bg-[#12100c]/80 border border-[#2e2a1e] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-[#8c8270] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre, livre ou chapitre..."
            className="w-full bg-[#060503] border border-[#2e2a1e] focus:border-[#c9a84c]/60 rounded-xl pl-8 pr-8 py-2 text-xs text-[#f4efe2] placeholder-[#6b6355] outline-none transition min-h-[44px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8c8270] hover:text-[#f4efe2] p-1 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Effacer la recherche"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Book & Period Dropdowns */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <select
            value={selectedBookFilter}
            onChange={(e) => setSelectedBookFilter(e.target.value)}
            className="bg-[#060503] border border-[#2e2a1e] text-xs font-mono text-[#e8e0d0] rounded-xl px-3 py-2 outline-none focus:border-[#c9a84c] cursor-pointer flex-1 sm:flex-initial min-h-[44px]"
            aria-label="Filtrer par livre"
          >
            <option value="all">Tous les livres ({audios.length})</option>
            {availableBooks.map(b => (
              <option key={b.id} value={b.id.toString()}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={selectedPeriodFilter}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'all' || val === 'today' || val === 'week' || val === 'month') {
                setSelectedPeriodFilter(val);
              }
            }}
            className="bg-[#060503] border border-[#2e2a1e] text-xs font-mono text-[#e8e0d0] rounded-xl px-3 py-2 outline-none focus:border-[#c9a84c] cursor-pointer flex-1 sm:flex-initial min-h-[44px]"
            aria-label="Filtrer par période"
          >
            <option value="all">Toutes périodes</option>
            <option value="today">Aujourd'hui</option>
            <option value="week">7 derniers jours</option>
            <option value="month">Ce mois-ci</option>
          </select>
        </div>
      </div>

      {/* Contextual Action / Status Banner when filter is applied */}
      {selectedSyncFilter === 'local' && filteredAudiosCount > 0 && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Filtre actif : affichage des <strong>{filteredAudiosCount} audio(s) non synchronisé(s)</strong> (stockés uniquement sur cet appareil).
            </span>
          </div>
          {onSyncAllToCloud && unsyncedCount > 0 && (
            <button
              type="button"
              disabled={isSyncingCloud}
              onClick={onSyncAllToCloud}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0d0b07] font-bold font-mono uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              <CloudUpload className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Tout synchroniser maintenant</span>
            </button>
          )}
        </div>
      )}

      {selectedSyncFilter === 'synced' && filteredAudiosCount > 0 && (
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between gap-2.5 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Filtre actif : affichage des <strong>{filteredAudiosCount} audio(s) synchronisé(s)</strong> dans Cloud Storage (sauvegardés et accessibles sur tous vos appareils).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedSyncFilter('all')}
            className="text-xs text-emerald-400 hover:text-emerald-300 underline font-mono cursor-pointer shrink-0 min-h-[44px] flex items-center"
          >
            Afficher tous les audios
          </button>
        </div>
      )}
    </div>
  );
};
