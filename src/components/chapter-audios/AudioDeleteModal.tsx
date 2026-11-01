import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { ChapterAudioMeditation } from '../../types/bible';

interface AudioDeleteModalProps {
  audio: ChapterAudioMeditation | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  formatTime: (seconds: number) => string;
}

export const AudioDeleteModal: React.FC<AudioDeleteModalProps> = ({
  audio,
  isDeleting,
  onClose,
  onConfirm,
  formatTime
}) => {
  return (
    <AnimatePresence>
      {audio && (
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
                  Supprimer cet audio ?
                </h4>
                <span className="text-xs font-mono uppercase tracking-wider text-[#8c8270] block">
                  {audio.title} · {audio.book_name} {audio.chapter}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#8c8270] leading-normal font-sans">
              Êtes-vous sûr de vouloir supprimer définitivement cet enregistrement audio ({formatTime(audio.duration_seconds)}) ? Cette action ne pourra pas être annulée.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-[#8c8270] hover:text-[#f4efe2] bg-[#1a1712] border border-[#2e2a1e] cursor-pointer transition"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={isDeleting}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 cursor-pointer transition shadow-md flex items-center gap-1.5"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
