import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit3 } from 'lucide-react';
import { ChapterAudioMeditation } from '../../types/bible';

interface AudioRenameModalProps {
  audio: ChapterAudioMeditation | null;
  newTitleInput: string;
  setNewTitleInput: (val: string) => void;
  isRenaming: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const AudioRenameModal: React.FC<AudioRenameModalProps> = ({
  audio,
  newTitleInput,
  setNewTitleInput,
  isRenaming,
  onClose,
  onConfirm
}) => {
  return (
    <AnimatePresence>
      {audio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md bg-[#12100c] border border-[#c9a84c]/40 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl text-left"
          >
            <div className="flex items-center gap-3 text-[#c9a84c]">
              <div className="w-9 h-9 rounded-xl bg-[#c9a84c]/15 border border-[#c9a84c]/30 flex items-center justify-center shrink-0">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-black text-sm text-[#f4efe2]">
                  Renommer l'audio
                </h4>
                <span className="text-xs font-mono uppercase tracking-wider text-[#8c8270] block">
                  {audio.book_name} {audio.chapter}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-[#8c8270] tracking-wider block">
                Nouveau titre
              </label>
              <input
                type="text"
                value={newTitleInput}
                onChange={(e) => setNewTitleInput(e.target.value)}
                className="w-full bg-[#060503] border border-[#2e2a1e] focus:border-[#c9a84c] rounded-xl p-3 text-xs text-[#f4efe2] outline-none font-serif min-h-[44px]"
                maxLength={100}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isRenaming}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-[#8c8270] hover:text-[#f4efe2] bg-[#1a1712] border border-[#2e2a1e] cursor-pointer transition"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={isRenaming || !newTitleInput.trim()}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-[#0d0b07] bg-[#c9a84c] hover:bg-[#ebd092] font-black cursor-pointer transition shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRenaming ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
