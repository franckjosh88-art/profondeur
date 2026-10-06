import React from 'react';
import { ShieldCheck, Heart, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdFreeModalProps {
  isOpen: boolean;
  isNightMode: boolean;
  onClose: () => void;
}

export const AdFreeModal: React.FC<AdFreeModalProps> = ({
  isOpen,
  isNightMode,
  onClose
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`w-full max-w-sm rounded-2xl shadow-2xl p-5 border text-left space-y-4 relative ${
              isNightMode 
                ? 'bg-[#151B20] border-[#2A343D] text-[#E0E8EE]' 
                : 'bg-white border-[#DCE3E8] text-[#2C3B44]'
            }`}
          >
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 p-1 rounded-lg opacity-60 hover:opacity-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-serif font-black text-base uppercase text-[#C0391B]">
                Version Pure & Sans Publicité
              </h3>
              <p className="text-xs font-sans opacity-80 leading-relaxed">
                Votre expérience de lecture et de méditation de la Parole de Dieu est protégée de toute interruption publicitaire.
              </p>
            </div>

            <div className={`p-3 rounded-xl border space-y-2 text-xs font-mono ${
              isNightMode ? 'bg-[#1A2228] border-[#2A343D]' : 'bg-[#F5F7F8] border-[#E0E7EC]'
            }`}>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Zéro bannière intrusive</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>100% Fonctionnel hors-ligne</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Respect absolu de la vie privée</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[#C0391B] hover:bg-[#A83217] text-white font-mono font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Continuer la lecture sacrée
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
