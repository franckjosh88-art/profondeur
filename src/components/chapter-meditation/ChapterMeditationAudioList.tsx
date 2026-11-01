import React from 'react';
import { Play, Pause, Clock, CheckCircle, CloudUpload, Trash2 } from 'lucide-react';
import { ChapterAudioMeditation } from '../../types/bible';

interface ChapterMeditationAudioListProps {
  chapterAudios: ChapterAudioMeditation[];
  activeChapterAudioId: string | null;
  isChapterAudioPlaying: boolean;
  onTogglePlay: (audio: ChapterAudioMeditation) => void;
  onDeleteAudio?: (audioId: string) => Promise<void> | void;
  formatTimer: (seconds: number) => string;
}

export const ChapterMeditationAudioList: React.FC<ChapterMeditationAudioListProps> = ({
  chapterAudios,
  activeChapterAudioId,
  isChapterAudioPlaying,
  onTogglePlay,
  onDeleteAudio,
  formatTimer
}) => {
  if (!chapterAudios || chapterAudios.length === 0) return null;

  return (
    <div className="pt-2 space-y-2">
      <span className="text-[10px] font-mono uppercase tracking-widest text-[#c9a84c] block font-bold">
        Audios enregistrés pour ce chapitre ({chapterAudios.length})
      </span>

      <div className="space-y-2">
        {chapterAudios.map(audio => {
          const isPlaying = activeChapterAudioId === audio.id && isChapterAudioPlaying;

          return (
            <div
              key={audio.id}
              className="p-2.5 rounded-xl bg-[#060503] border border-[#2e2a1e] flex items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => onTogglePlay(audio)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    isPlaying 
                      ? 'bg-[#c9a84c] text-[#0d0b07]' 
                      : 'bg-[#14120e] text-[#c9a84c] border border-[#c9a84c]/30 hover:border-[#c9a84c]'
                  }`}
                  title={isPlaying ? "Mettre en pause" : "Écouter"}
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-serif font-bold text-xs text-[#f4efe2] truncate">
                      {audio.title}
                    </p>
                    {audio.is_cloud_synced ? (
                      <span title="Synchronisé dans Cloud Storage" className="inline-flex text-emerald-400 shrink-0">
                        <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    ) : (
                      <span title="En attente de synchronisation (Local)" className="inline-flex text-amber-400 shrink-0">
                        <CloudUpload className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-[#8c8270] flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-[#6b6355]" />
                    <span>{formatTimer(audio.duration_seconds)}</span>
                  </span>
                </div>
              </div>

              {onDeleteAudio && (
                <button
                  type="button"
                  onClick={() => onDeleteAudio(audio.id)}
                  className="p-1.5 rounded-lg text-[#6b6355] hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer shrink-0"
                  title="Supprimer cet audio"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
