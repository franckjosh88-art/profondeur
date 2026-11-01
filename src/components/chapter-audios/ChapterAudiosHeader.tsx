import React from 'react';
import { 
  Mic, BookOpen, Calendar, CheckCircle, CloudUpload, 
  AlertCircle, Loader2, AlertTriangle, X 
} from 'lucide-react';

interface ChapterAudiosHeaderProps {
  totalStatsString: string;
  selectedSyncFilter: 'all' | 'synced' | 'local' | 'missing';
  setSelectedSyncFilter: React.Dispatch<React.SetStateAction<'all' | 'synced' | 'local' | 'missing'>>;
  syncedCount: number;
  unsyncedCount: number;
  missingCount: number;
  viewMode: 'book' | 'date';
  setViewMode: (mode: 'book' | 'date') => void;
  isSyncingCloud: boolean;
  syncProgress: { current: number; total: number; title: string } | null;
  playbackErrorMessage: string | null;
  setPlaybackErrorMessage: (msg: string | null) => void;
  syncSuccessToast: string | null;
  setSyncSuccessToast: (msg: string | null) => void;
  onSyncAllToCloud?: () => Promise<void>;
  handleTriggerSyncAll: () => Promise<void>;
}

export const ChapterAudiosHeader: React.FC<ChapterAudiosHeaderProps> = ({
  totalStatsString,
  selectedSyncFilter,
  setSelectedSyncFilter,
  syncedCount,
  unsyncedCount,
  missingCount,
  viewMode,
  setViewMode,
  isSyncingCloud,
  syncProgress,
  playbackErrorMessage,
  setPlaybackErrorMessage,
  syncSuccessToast,
  setSyncSuccessToast,
  onSyncAllToCloud,
  handleTriggerSyncAll
}) => {
  return (
    <>
      {/* Header Bar: Titre, Compteur Global & Toggle de vue */}
      <div className="bg-[#12100c] border border-[#2e2a1e] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c9a84c]/15 border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c] shrink-0 shadow-sm">
            <Mic className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h2 className="font-serif font-black text-lg sm:text-xl text-[#f4efe2] tracking-wide">
              Mes Méditations Audio
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setSelectedSyncFilter('all')}
                className={`text-xs font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-md transition cursor-pointer ${
                  selectedSyncFilter === 'all'
                    ? 'text-[#0d0b07] bg-[#c9a84c] shadow-gold-glow'
                    : 'text-[#c9a84c] bg-[#14120e] border border-[#c9a84c]/30 hover:border-[#c9a84c]'
                }`}
                title="Cliquer pour afficher tous les enregistrements"
                aria-label={`Filtrer par tous les enregistrements (${totalStatsString})`}
                aria-pressed={selectedSyncFilter === 'all'}
              >
                {totalStatsString}
              </button>
              
              <button
                type="button"
                onClick={() => setSelectedSyncFilter(prev => prev === 'synced' ? 'all' : 'synced')}
                className={`text-xs font-mono px-2 py-0.5 rounded-md border flex items-center gap-1.5 transition cursor-pointer font-bold ${
                  selectedSyncFilter === 'synced'
                    ? 'text-[#0d0b07] bg-emerald-500 border-emerald-400 ring-2 ring-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    : 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/25'
                }`}
                title="Cliquer pour afficher uniquement les audios synchronisés dans le Cloud"
                aria-label={`Filtrer par audios synchronisés dans le Cloud (${syncedCount})`}
                aria-pressed={selectedSyncFilter === 'synced'}
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>{syncedCount} Cloud</span>
              </button>
              {unsyncedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSyncFilter(prev => prev === 'local' ? 'all' : 'local')}
                  className={`text-xs font-mono px-2 py-0.5 rounded-md border flex items-center gap-1.5 transition cursor-pointer font-bold ${
                    selectedSyncFilter === 'local'
                      ? 'text-[#0d0b07] bg-amber-500 border-amber-400 ring-2 ring-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                      : 'text-amber-300 bg-amber-500/15 border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/25'
                  }`}
                  title="Cliquer pour afficher uniquement les audios locaux"
                  aria-label={`Filtrer par audios non synchronisés locaux (${unsyncedCount})`}
                  aria-pressed={selectedSyncFilter === 'local'}
                >
                  <CloudUpload className="w-3.5 h-3.5 text-amber-400" />
                  <span>{unsyncedCount} local{unsyncedCount > 1 ? 's' : ''}</span>
                </button>
              )}
              {missingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSyncFilter(prev => prev === 'missing' ? 'all' : 'missing')}
                  className={`text-xs font-mono px-2 py-0.5 rounded-md border flex items-center gap-1.5 transition cursor-pointer font-bold ${
                    selectedSyncFilter === 'missing'
                      ? 'text-white bg-rose-600 border-rose-500 ring-2 ring-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                      : 'text-rose-300 bg-rose-500/15 border-rose-500/30 hover:border-rose-400'
                  }`}
                  title="Cliquer pour afficher uniquement les fichiers manquants"
                  aria-label={`Filtrer par fichiers manquants (${missingCount})`}
                  aria-pressed={selectedSyncFilter === 'missing'}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>{missingCount} manquant{missingCount > 1 ? 's' : ''}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* View Mode Toggle Button Group */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#060503] border border-[#2e2a1e] p-1 rounded-xl w-fit" role="group" aria-label="Mode d'affichage">
            <button
              type="button"
              onClick={() => setViewMode('book')}
              className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'book'
                  ? 'bg-[#c9a84c] text-[#0d0b07] shadow-gold-glow'
                  : 'text-[#6b6355] hover:text-[#e8e0d0]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Par Livre</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('date')}
              className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'date'
                  ? 'bg-[#c9a84c] text-[#0d0b07] shadow-gold-glow'
                  : 'text-[#6b6355] hover:text-[#e8e0d0]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Par Date</span>
            </button>
          </div>
        </div>
      </div>

      {/* Indicateur visuel de progression globale de la synchronisation vers Cloud Storage */}
      {isSyncingCloud && (
        <div className="bg-gradient-to-r from-[#211a0d] via-[#1a150a] to-[#14120e] border border-[#c9a84c]/60 rounded-2xl p-4 sm:p-5 shadow-[0_4px_30px_rgba(201,168,76,0.18)] space-y-3 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#c9a84c]/20 border border-[#c9a84c]/40 flex items-center justify-center text-[#c9a84c] shrink-0">
                <Loader2 className="w-4 h-4 animate-spin text-[#c9a84c]" />
              </div>
              <div className="min-w-0">
                <h4 className="font-serif font-bold text-sm text-[#f4efe2] flex items-center gap-2">
                  <span>Migration vers Cloud Storage en cours</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-[#c9a84c] animate-pulse" />
                </h4>
                {syncProgress?.title ? (
                  <p className="text-xs text-[#a89f8c] truncate max-w-sm sm:max-w-lg">
                    Transfert en cours : <span className="text-[#ebd092] font-medium">{syncProgress.title}</span>
                  </p>
                ) : (
                  <p className="text-xs text-[#a89f8c]">
                    Préparation du transfert et téléversement des fichiers audio...
                  </p>
                )}
              </div>
            </div>

            {/* Compteur chiffré et pourcentage */}
            {syncProgress && syncProgress.total > 0 ? (
              <div className="text-right sm:shrink-0 font-mono text-xs text-[#c9a84c] font-bold bg-[#0d0b07]/50 px-3 py-1.5 rounded-xl border border-[#c9a84c]/30">
                <span>{syncProgress.current} / {syncProgress.total}</span>
                <span className="text-[#ebd092] ml-1.5">
                  ({Math.round((syncProgress.current / syncProgress.total) * 100)}%)
                </span>
              </div>
            ) : (
              <div className="text-right sm:shrink-0 font-mono text-xs text-[#c9a84c] font-medium">
                Initialisation...
              </div>
            )}
          </div>

          {/* Barre visuelle de progression */}
          <div className="w-full bg-[#0a0805] rounded-full h-2.5 overflow-hidden border border-[#2e2a1e] p-0.5">
            <div
              className="bg-gradient-to-r from-[#c9a84c] via-[#ebd092] to-[#c9a84c] h-full rounded-full transition-all duration-300 shadow-gold-glow"
              style={{
                width: syncProgress && syncProgress.total > 0
                  ? `${Math.max(6, Math.min(100, Math.round((syncProgress.current / syncProgress.total) * 100)))}%`
                  : '20%'
              }}
            />
          </div>
        </div>
      )}

      {/* Playback Error Toast */}
      {playbackErrorMessage && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-3 flex items-start justify-between gap-3 text-red-200 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{playbackErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setPlaybackErrorMessage(null)}
            className="text-red-400 hover:text-red-200 p-0.5 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fermer l'erreur"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sync Success Toast */}
      {syncSuccessToast && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 flex items-start justify-between gap-3 text-emerald-200 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncSuccessToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncSuccessToast(null)}
            className="text-emerald-400 hover:text-emerald-200 p-0.5 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fermer le message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cloud Migration & Sync Banner if unsynced items exist */}
      {unsyncedCount > 0 && (
        <div className="bg-gradient-to-r from-[#211a0d] to-[#14120e] border border-[#c9a84c]/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c9a84c]/20 border border-[#c9a84c]/40 flex items-center justify-center text-[#c9a84c] shrink-0 mt-0.5 sm:mt-0">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-sm text-[#f4efe2]">
                {unsyncedCount} audio{unsyncedCount > 1 ? 's' : ''} à sauvegarder en ligne
              </h4>
              <p className="text-xs text-[#a89f8c] leading-relaxed">
                Sauvegardez vos enregistrements dans le stockage en ligne pour pouvoir les écouter sur votre iPhone, Android ou tout autre appareil.
              </p>
              {isSyncingCloud && syncProgress && (
                <div className="mt-2.5 space-y-1.5 w-full max-w-md">
                  <div className="text-xs font-mono text-[#c9a84c] flex items-center justify-between">
                    <span className="flex items-center gap-1.5 truncate">
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span className="truncate">Envoi : {syncProgress.title}</span>
                    </span>
                    <span className="shrink-0 ml-2">
                      {syncProgress.current}/{syncProgress.total} ({Math.round((syncProgress.current / syncProgress.total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#14120e] rounded-full h-1.5 overflow-hidden border border-[#2e2a1e]">
                    <div 
                      className="bg-gradient-to-r from-[#c9a84c] to-[#ebd092] h-full transition-all duration-300"
                      style={{ width: `${Math.round((syncProgress.current / syncProgress.total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {onSyncAllToCloud && (
            <button
              type="button"
              disabled={isSyncingCloud}
              onClick={handleTriggerSyncAll}
              className="px-4 py-2.5 rounded-xl text-xs font-serif font-bold bg-[#c9a84c] hover:bg-[#ebd092] text-[#0d0b07] flex items-center gap-2 transition cursor-pointer shadow-gold-glow shrink-0 disabled:opacity-50 min-h-[44px]"
            >
              {isSyncingCloud ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synchronisation...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  <span>Synchroniser tout</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </>
  );
};
