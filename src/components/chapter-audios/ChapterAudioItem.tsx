import React from 'react';
import { 
  BookOpen, Clock, AlertCircle, CheckCircle, CloudUpload, 
  Loader2, Edit3, Download, Trash2, Play, Pause, FileText 
} from 'lucide-react';
import { ChapterAudioMeditation, ChapterMeditation } from '../../types/bible';
import { SyncStatusIcon, getSyncTooltip } from './SyncStatusIcon';

interface ChapterAudioItemProps {
  item: ChapterAudioMeditation;
  written?: ChapterMeditation;
  isPlaying: boolean;
  isCurrent: boolean;
  isLoading: boolean;
  isMissing: boolean;
  playbackTime: number;
  playbackDuration: number;
  playbackRate: number;
  syncingSingleId: string | null;
  isSyncingCloud: boolean;
  userId: string | null;
  onNavigateToChapter: (bookId: number, chapter: number, verseNum?: number) => void;
  onNavigateToWrittenTab?: () => void;
  onTogglePlay: (item: ChapterAudioMeditation) => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangePlaybackRate: (rate: number) => void;
  onOpenRename: (item: ChapterAudioMeditation) => void;
  onDownload: (item: ChapterAudioMeditation) => void;
  onOpenDelete: (item: ChapterAudioMeditation) => void;
  onSyncSingleAudio?: (item: ChapterAudioMeditation) => void;
  formatFullDate: (iso: string) => string;
  formatTime: (sec: number) => string;
}

export const ChapterAudioItem: React.FC<ChapterAudioItemProps> = ({
  item,
  written,
  isPlaying,
  isCurrent,
  isLoading,
  isMissing,
  playbackTime,
  playbackDuration,
  playbackRate,
  syncingSingleId,
  isSyncingCloud,
  userId: _userId,
  onNavigateToChapter,
  onNavigateToWrittenTab,
  onTogglePlay,
  onSeek,
  onChangePlaybackRate,
  onOpenRename,
  onDownload,
  onOpenDelete,
  onSyncSingleAudio,
  formatFullDate,
  formatTime
}) => {
  return (
    <div
      key={item.id}
      className="bg-[#0e0c08] border border-[#2e2a1e] hover:border-[#c9a84c]/50 rounded-2xl p-4 sm:p-5 shadow-soft transition-all duration-200 flex flex-col justify-between group hover:shadow-[0_0_15px_rgba(201,168,76,0.12)] relative space-y-3.5"
    >
      {/* Header: Titre, Référence & Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <SyncStatusIcon item={item} isMissing={isMissing} />

          <div className="space-y-1 min-w-0">
            <h4 className="font-serif font-black text-sm sm:text-base text-[#f4efe2] truncate leading-tight">
              {item.title}
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => onNavigateToChapter(item.book_id, item.chapter, 1)}
                className="font-serif font-bold text-[#c9a84c] hover:text-[#ebd092] flex items-center gap-1 transition cursor-pointer bg-[#14120e] px-2 py-0.5 rounded-md border border-[#c9a84c]/30 hover:border-[#c9a84c] min-h-[32px]"
                title="Ouvrir ce chapitre dans le lecteur"
              >
                <BookOpen className="w-3 h-3 text-[#c9a84c]" />
                <span>{item.book_name} {item.chapter}</span>
              </button>

              <span className="text-xs font-mono text-[#8c8270] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#6b6355]" />
                <span>{formatFullDate(item.created_at)}</span>
              </span>

              {/* Cloud Sync Status Badge */}
              {isMissing ? (
                <div className="relative group/badge inline-flex items-center">
                  <span
                    className="text-xs font-mono text-rose-300 bg-rose-500/15 px-2.5 py-0.5 rounded-md border border-rose-500/30 flex items-center gap-1.5 font-medium shadow-sm cursor-help"
                    title={getSyncTooltip(item, true)}
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 stroke-[2.5]" />
                    <span>Fichier manquant</span>
                  </span>
                </div>
              ) : item.is_cloud_synced ? (
                <div className="relative group/badge inline-flex items-center">
                  <span
                    className="text-xs font-mono text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-md border border-emerald-500/30 ring-1 ring-emerald-500/20 flex items-center gap-1.5 font-semibold shadow-sm cursor-help"
                    title={getSyncTooltip(item)}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                    <span>Synchronisé (Cloud)</span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="relative group/badge inline-flex items-center">
                    <span
                      className="text-xs font-mono text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-md border border-amber-500/30 ring-1 ring-amber-500/20 flex items-center gap-1.5 font-semibold shadow-sm cursor-help"
                      title={getSyncTooltip(item)}
                    >
                      <CloudUpload className="w-3.5 h-3.5 text-amber-400 shrink-0 stroke-[2.5]" />
                      <span>En attente de synchronisation</span>
                    </span>
                  </div>
                  {onSyncSingleAudio && (
                    <button
                      type="button"
                      disabled={syncingSingleId === item.id || isSyncingCloud}
                      onClick={() => onSyncSingleAudio(item)}
                      className="text-xs text-[#c9a84c] hover:text-[#ebd092] flex items-center gap-1 underline transition cursor-pointer disabled:opacity-50 min-h-[32px]"
                      title="Envoyer cet enregistrement vers le cloud"
                    >
                      {syncingSingleId === item.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CloudUpload className="w-3 h-3" />
                      )}
                      <span>Synchroniser</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons (Rename, Download, Delete) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onOpenRename(item)}
            className="p-2 rounded-lg text-[#6b6355] hover:text-[#c9a84c] hover:bg-[#1a1712] transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Renommer l'audio"
            aria-label="Renommer l'audio"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onDownload(item)}
            className="p-2 rounded-lg text-[#6b6355] hover:text-[#c9a84c] hover:bg-[#1a1712] transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Télécharger l'enregistrement (MP3)"
            aria-label="Télécharger l'enregistrement (MP3)"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onOpenDelete(item)}
            className="p-2 rounded-lg text-[#6b6355] hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Supprimer cet audio"
            aria-label="Supprimer cet audio"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audio Player Widget */}
      <div className="bg-[#050403] border border-[#2e2a1e] rounded-xl p-3 space-y-2.5">
        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onTogglePlay(item)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0 min-h-[44px] min-w-[44px] ${
              isPlaying
                ? 'bg-[#c9a84c] text-[#0d0b07] shadow-gold-glow scale-105'
                : 'bg-[#1a1712] hover:bg-[#252017] text-[#c9a84c] hover:text-[#ebd092] border border-[#c9a84c]/30 hover:border-[#c9a84c]'
            }`}
            title={isLoading ? "Chargement depuis le cloud..." : isPlaying ? "Mettre en pause" : "Écouter l'audio"}
            aria-label={isPlaying ? "Mettre en pause" : "Écouter l'audio"}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#c9a84c]" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Slider & Duration */}
          <div className="flex-1 space-y-1">
            <input
              type="range"
              min={0}
              max={isCurrent ? playbackDuration || item.duration_seconds || 1 : item.duration_seconds || 1}
              step={0.1}
              value={isCurrent ? playbackTime : 0}
              readOnly={!isCurrent}
              onChange={onSeek}
              className="w-full accent-[#c9a84c] h-1.5 bg-[#1a1712] rounded-lg cursor-pointer"
            />
            <div className="flex items-center justify-between text-xs font-mono text-[#8c8270]">
              <span>{isCurrent ? formatTime(playbackTime) : '00:00'}</span>
              <span>{formatTime(item.duration_seconds)}</span>
            </div>
          </div>

          {/* Speed Selector (1x, 1.5x, 2x) */}
          <div className="flex items-center gap-1 border border-[#2e2a1e] rounded-lg p-0.5 bg-[#0e0c08]">
            {[1, 1.5, 2].map(rate => (
              <button
                key={rate}
                type="button"
                onClick={() => onChangePlaybackRate(rate)}
                className={`px-2 py-1 rounded text-xs font-mono font-bold transition cursor-pointer min-h-[32px] ${
                  playbackRate === rate
                    ? 'bg-[#c9a84c] text-[#0d0b07]'
                    : 'text-[#6b6355] hover:text-[#e8e0d0]'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Written Meditation Excerpt (if exists) */}
      {written && written.text && (
        <div className="p-2.5 rounded-xl bg-[#14120e] border border-[#2e2a1e]/70 space-y-1 text-left">
          <div className="flex items-center justify-between text-xs font-mono text-[#c9a84c]">
            <span className="flex items-center gap-1 font-bold">
              <FileText className="w-3 h-3" />
              <span>Méditation écrite associée</span>
            </span>
            <button
              type="button"
              onClick={() => {
                if (onNavigateToWrittenTab) {
                  onNavigateToWrittenTab();
                } else {
                  onNavigateToChapter(item.book_id, item.chapter);
                }
              }}
              className="hover:underline cursor-pointer text-[#ebd092]"
            >
              Voir la méditation →
            </button>
          </div>
          <p className="font-serif italic text-xs text-[#c4bdae] line-clamp-2 leading-relaxed">
            « {written.text} »
          </p>
        </div>
      )}
    </div>
  );
};
