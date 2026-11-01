import React from 'react';
import { CheckCircle, CloudUpload, AlertCircle } from 'lucide-react';
import { ChapterAudioMeditation } from '../../types/bible';

interface SyncStatusIconProps {
  item: ChapterAudioMeditation;
  isMissing?: boolean;
}

export const getSyncTooltip = (item: ChapterAudioMeditation, isMissing?: boolean): string => {
  if (isMissing) {
    return "Fichier introuvable localement et dans le Cloud. Ré-enregistrez ou importez cet audio.";
  }
  if (item.is_cloud_synced) {
    return "Audio synchronisé dans Cloud Storage (sauvegardé en ligne et accessible sur tous vos appareils).";
  }
  return "Audio stocké uniquement sur cet appareil. Cliquez sur « Synchroniser » ou « Synchroniser tout » pour le sauvegarder dans le Cloud.";
};

export const SyncStatusIcon: React.FC<SyncStatusIconProps> = ({ item, isMissing = false }) => {
  const tooltipText = getSyncTooltip(item, isMissing);

  return (
    <div className="pt-0.5 shrink-0 relative group/sync-icon">
      {/* Visual icon for audio status: check-circle vert pour synchronisé, cloud-upload ambre pour local */}
      {isMissing ? (
        <span
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-sm transition-transform group-hover/sync-icon:scale-110 cursor-help"
          title={tooltipText}
          aria-label={tooltipText}
          role="img"
        >
          <AlertCircle className="w-5 h-5 stroke-[2.2]" />
        </span>
      ) : item.is_cloud_synced ? (
        <span
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 ring-1 ring-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)] transition-transform group-hover/sync-icon:scale-110 cursor-help"
          title={tooltipText}
          aria-label={tooltipText}
          role="img"
        >
          <CheckCircle className="w-5 h-5 stroke-[2.2] text-emerald-400" />
        </span>
      ) : (
        <span
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 ring-1 ring-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] transition-transform group-hover/sync-icon:scale-110 cursor-help"
          title={tooltipText}
          aria-label={tooltipText}
          role="img"
        >
          <CloudUpload className="w-5 h-5 stroke-[2.2] text-amber-400" />
        </span>
      )}

      {/* Dedicated Tooltip Element */}
      <span
        role="tooltip"
        className="absolute left-0 bottom-full mb-1.5 hidden group-hover/sync-icon:flex flex-col items-start z-30 pointer-events-none transition-all duration-150 drop-shadow-xl"
      >
        <span className="bg-[#1a1712] text-[#f4efe2] border border-[#c9a84c]/40 text-xs font-sans font-medium px-2.5 py-1 rounded-md shadow-2xl whitespace-nowrap flex items-center gap-1.5">
          {isMissing ? (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          ) : item.is_cloud_synced ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <CloudUpload className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          )}
          <span>{tooltipText}</span>
        </span>
        <span className="w-2 h-2 bg-[#1a1712] border-r border-b border-[#c9a84c]/40 rotate-45 -mt-1 ml-3" />
      </span>
    </div>
  );
};
