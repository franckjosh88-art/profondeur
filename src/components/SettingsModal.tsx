import React from 'react';
import { 
  Settings, Type, Volume2, LogOut, 
  Sparkles, X, Check, ShieldCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsModalProps {
  isOpen: boolean;
  textSize: number;
  speechRate: number;
  speechVolume: number;
  selectedVoiceGender: 'female' | 'male' | 'all';
  userEmail?: string | null;
  onClose: () => void;
  onChangeTextSize: (size: number) => void;
  onChangeSpeechRate: (rate: number) => void;
  onChangeSpeechVolume: (volume: number) => void;
  onChangeVoiceGender: (gender: 'female' | 'male' | 'all') => void;
  onSignOut?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  textSize,
  speechRate,
  speechVolume,
  selectedVoiceGender,
  userEmail,
  onClose,
  onChangeTextSize,
  onChangeSpeechRate,
  onChangeSpeechVolume,
  onChangeVoiceGender,
  onSignOut
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.9),0_0_20px_rgba(201,168,76,0.15)] flex flex-col max-h-[85vh] overflow-hidden border border-[#2e2a1e] bg-[#0c0a07] text-[#e8e0d0] text-left"
          >
            {/* EN-TÊTE */}
            <div className="p-4 border-b border-[#2e2a1e] flex items-center justify-between bg-[#12100c]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30 flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-base text-[#f4efe2]">
                    Paramètres & Préférences
                  </h3>
                  <span className="text-[10px] font-mono text-[#8c8270] block">
                    Confort de lecture & voix
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#8c8270] hover:text-[#c9a84c] hover:bg-[#1a1712] transition cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CONTENU */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 scroller-thin">
              {/* 1. TAILLE DE POLICE DU TEXTE BIBLIQUE */}
              <div className="p-4 rounded-xl border border-[#2e2a1e] bg-[#12100c] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-[#c9a84c]" />
                    <span className="text-xs font-serif font-bold text-[#f4efe2]">Taille de la police</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#c9a84c]">{textSize} px</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-serif text-[#8c8270]">A</span>
                  <input
                    type="range"
                    min="14"
                    max="28"
                    step="1"
                    value={textSize}
                    onChange={(e) => onChangeTextSize(Number(e.target.value))}
                    className="flex-1 accent-[#c9a84c] cursor-pointer"
                  />
                  <span className="text-lg font-serif font-bold text-[#f4efe2]">A</span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#050403] border border-[#2e2a1e] text-center">
                  <p 
                    style={{ fontSize: `${textSize}px` }} 
                    className="font-serif italic leading-relaxed text-[#f4efe2] transition-all"
                  >
                    « L'Éternel est mon berger »
                  </p>
                </div>
              </div>

              {/* 2. LECTURE AUDIO */}
              <div className="p-4 rounded-xl border border-[#2e2a1e] bg-[#12100c] space-y-3.5">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-[#c9a84c]" />
                  <span className="text-xs font-serif font-bold text-[#f4efe2]">Paramètres audio</span>
                </div>

                {/* Vitesse de parole */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-[#8c8270]">
                    <span>Vitesse d'élocution</span>
                    <span className="text-[#c9a84c] font-bold">{speechRate}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.05"
                    value={speechRate}
                    onChange={(e) => onChangeSpeechRate(Number(e.target.value))}
                    className="w-full accent-[#c9a84c] cursor-pointer"
                  />
                </div>

                {/* Volume audio */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-[#8c8270]">
                    <span>Volume de la voix</span>
                    <span className="text-[#c9a84c] font-bold">{Math.round(speechVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={speechVolume}
                    onChange={(e) => onChangeSpeechVolume(Number(e.target.value))}
                    className="w-full accent-[#c9a84c] cursor-pointer"
                  />
                </div>

                {/* Type de voix */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono text-[#8c8270] block">Timbre de voix</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'female', label: 'Féminine' },
                      { id: 'male', label: 'Masculine' },
                      { id: 'all', label: 'Auto' },
                    ].map((v) => (
                      <button
                        key={v.id}
                        onClick={() => onChangeVoiceGender(v.id as any)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-mono transition cursor-pointer border ${
                          selectedVoiceGender === v.id
                            ? 'bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c]/50 font-bold'
                            : 'bg-[#050403] text-[#8c8270] border-[#2e2a1e] hover:text-[#e8e0d0]'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. COMPTE ET CONFIDENTIALITÉ */}
              <div className="p-4 rounded-xl border border-[#2e2a1e] bg-[#12100c] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#8c8270] block">Compte Actif</span>
                  <span className="text-xs font-serif font-bold text-[#f4efe2]">
                    {userEmail || 'Utilisateur local'}
                  </span>
                </div>

                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Déconnexion</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
