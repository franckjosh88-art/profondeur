import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, ShieldAlert, X } from 'lucide-react';
import { registerDialogListener, DialogState } from '../utils/dialog';
import { useModalA11y } from '../hooks/useModalA11y';

export const AppDialogContainer: React.FC = () => {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  useEffect(() => {
    return registerDialogListener((state) => {
      setDialog(state);
    });
  }, []);

  const handleConfirm = () => {
    if (!dialog) return;
    const resolve = dialog.resolve;
    setDialog(null);
    resolve(true);
  };

  const handleCancel = () => {
    if (!dialog) return;
    const resolve = dialog.resolve;
    setDialog(null);
    resolve(false);
  };

  const modalRef = useModalA11y(!!dialog, handleCancel);

  if (!dialog) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        aria-describedby="app-dialog-desc"
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md rounded-2xl border border-[#c9a84c]/50 bg-[#0e0c08] text-[#f4efe2] shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_25px_rgba(201,168,76,0.2)] overflow-hidden flex flex-col focus:outline-none"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#2e2a1e] flex items-center justify-between bg-[#14110b]">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                dialog.variant === 'danger'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  : 'bg-[#c9a84c]/15 border-[#c9a84c]/30 text-[#c9a84c]'
              }`}>
                {dialog.variant === 'danger' ? (
                  <ShieldAlert className="w-5 h-5" aria-hidden="true" />
                ) : dialog.type === 'confirm' ? (
                  <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Info className="w-5 h-5" aria-hidden="true" />
                )}
              </div>
              <h3 
                id="app-dialog-title" 
                className="font-serif font-black text-base text-[#f4efe2] tracking-wide"
              >
                {dialog.title}
              </h3>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              aria-label="Fermer la boîte de dialogue"
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[#8c8270] hover:text-[#c9a84c] hover:bg-[#1a1712] transition cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Message body - Minimum 14px for reading */}
          <div className="p-5 space-y-3">
            <p 
              id="app-dialog-desc"
              className="text-sm font-sans leading-relaxed text-[#ded7c8] whitespace-pre-wrap select-text"
            >
              {dialog.message}
            </p>
          </div>

          {/* Action Footer - Min 44px buttons with high contrast */}
          <div className="p-4 border-t border-[#2e2a1e] bg-[#120f09] flex items-center justify-end gap-3">
            {dialog.type === 'confirm' && (
              <button
                type="button"
                onClick={handleCancel}
                className="min-h-[44px] px-5 py-2.5 rounded-xl border border-[#2e2a1e] bg-[#1a1712] hover:bg-[#262118] text-[#c2b7a3] hover:text-[#f4efe2] text-sm font-sans font-medium transition cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
              >
                {dialog.cancelText || 'Annuler'}
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              className={`min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-sans font-bold transition cursor-pointer flex items-center justify-center shadow-md focus-visible:ring-2 focus-visible:ring-[#c9a84c] ${
                dialog.variant === 'danger'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                  : 'bg-[#c9a84c] hover:bg-[#d8b85d] text-[#0d0b07] shadow-[#c9a84c]/20'
              }`}
            >
              {dialog.confirmText || 'Confirmer'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
