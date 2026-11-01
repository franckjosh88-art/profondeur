import React, { useState } from 'react';
import { 
  Settings, Type, Volume2, LogOut, 
  Sparkles, X, Check, ShieldCheck, Palette,
  BookOpen, Library, Sun, Moon, Coffee
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ORDERED_READER_COLORS, 
  getReaderPreset, 
  ReaderColorId 
} from '../types/readerTheme';
import { ReaderVersePreview } from './ReaderVersePreview';
import { useModalA11y } from '../hooks/useModalA11y';

interface SettingsModalProps {
  isOpen: boolean;
  textSize: number;
  speechRate: number;
  speechVolume: number;
  selectedVoiceGender: 'female' | 'male' | 'all';
  userEmail?: string | null;
  readerColor?: string;
  themeMode?: 'dark' | 'sepia' | 'light';
  onSelectReaderColor?: (color: string) => void;
  onClose: () => void;
  onChangeTextSize: (size: number) => void;
  onChangeSpeechRate: (rate: number) => void;
  onChangeSpeechVolume: (volume: number) => void;
  onChangeVoiceGender: (gender: 'female' | 'male' | 'all') => void;
  onChangeThemeMode?: (theme: 'dark' | 'sepia' | 'light') => void;
  onSignOut?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  textSize,
  speechRate,
  speechVolume,
  selectedVoiceGender,
  userEmail,
  readerColor = 'sanctuary',
  themeMode = 'dark',
  onSelectReaderColor,
  onClose,
  onChangeTextSize,
  onChangeSpeechRate,
  onChangeSpeechVolume,
  onChangeVoiceGender,
  onChangeThemeMode,
  onSignOut
}) => {
  const [activeTab, setActiveTab] = useState<'preferences' | 'credits'>('preferences');
  const activeColorPreset = getReaderPreset(readerColor);

  // Hook d'accessibilité : piège le focus clavier et écoute la touche Échap
  const modalRef = useModalA11y(isOpen, onClose);

  // Niveaux de taille de texte prédéfinis
  const TEXT_SIZE_PRESETS = [
    { label: 'Petit', value: 14, description: '14 px' },
    { label: 'Moyen', value: 17, description: '17 px' },
    { label: 'Grand', value: 20, description: '20 px' },
    { label: 'Très grand', value: 24, description: '24 px' },
  ];

  const THEMES_LIST: Array<{ id: 'dark' | 'sepia' | 'light'; name: string; desc: string; icon: any; previewBg: string; previewText: string; previewBorder: string }> = [
    {
      id: 'dark',
      name: 'Sombre',
      desc: 'Sanctuaire Noir & Or',
      icon: Moon,
      previewBg: '#0e0c08',
      previewText: '#f4efe2',
      previewBorder: '#c9a84c'
    },
    {
      id: 'sepia',
      name: 'Sépia',
      desc: 'Parchemin chaud',
      icon: Coffee,
      previewBg: '#f4ecd8',
      previewText: '#3d2f1f',
      previewBorder: '#8e6812'
    },
    {
      id: 'light',
      name: 'Clair',
      desc: 'Blanc pur & Or doux',
      icon: Sun,
      previewBg: '#ffffff',
      previewText: '#171717',
      previewBorder: '#9a6b10'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm select-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
        >
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.9),0_0_20px_rgba(201,168,76,0.15)] flex flex-col max-h-[88vh] overflow-hidden border border-[#2e2a1e] bg-[#0c0a07] text-[#e8e0d0] text-left focus:outline-none"
          >
            {/* EN-TÊTE */}
            <div className="p-4 border-b border-[#2e2a1e] flex items-center justify-between bg-[#12100c]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30 flex items-center justify-center shrink-0">
                  {activeTab === 'preferences' ? <Settings className="w-5 h-5" aria-hidden="true" /> : <Library className="w-5 h-5" aria-hidden="true" />}
                </div>
                <div>
                  <h3 id="settings-modal-title" className="font-serif font-black text-base text-[#f4efe2]">
                    {activeTab === 'preferences' ? 'Paramètres & Préférences' : 'Sources & Crédits'}
                  </h3>
                  <span className="text-xs font-mono text-[#a0947f] block">
                    {activeTab === 'preferences' ? 'Confort de lecture, audio & affichage' : 'Origine des textes, données & mentions IA'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer les paramètres"
                className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[#8c8270] hover:text-[#c9a84c] hover:bg-[#1a1712] transition cursor-pointer flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#c9a84c]"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* NAVIGATION ONGLET */}
            <div className="flex border-b border-[#2e2a1e] bg-[#0e0d09] px-4 pt-2 gap-2" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'preferences'}
                onClick={() => setActiveTab('preferences')}
                className={`min-h-[44px] pb-2.5 px-4 text-xs font-mono font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-[#c9a84c] ${
                  activeTab === 'preferences'
                    ? 'border-[#c9a84c] text-[#c9a84c]'
                    : 'border-transparent text-[#a0947f] hover:text-[#e8e0d0]'
                }`}
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
                <span>Réglages</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'credits'}
                onClick={() => setActiveTab('credits')}
                className={`min-h-[44px] pb-2.5 px-4 text-xs font-mono font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-[#c9a84c] ${
                  activeTab === 'credits'
                    ? 'border-[#c9a84c] text-[#c9a84c]'
                    : 'border-transparent text-[#a0947f] hover:text-[#e8e0d0]'
                }`}
              >
                <BookOpen className="w-4 h-4" aria-hidden="true" />
                <span>Sources & Crédits</span>
              </button>
            </div>

            {/* CONTENU */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 scroller-thin">
              {activeTab === 'preferences' ? (
                <>
                  {/* 1. THÈME GLOBAL (SOMBRE, SÉPIA, CLAIR) */}
                  <div className="p-4 rounded-xl border border-[#2e2a1e] bg-[#12100c] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-[#c9a84c]" aria-hidden="true" />
                        <span className="text-sm font-serif font-bold text-[#f4efe2]">Thème d'affichage</span>
                      </div>
                      <span className="text-xs font-mono text-[#c9a84c] uppercase font-bold">
                        {themeMode === 'sepia' ? 'Sépia' : themeMode === 'light' ? 'Clair' : 'Sombre'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1" role="radiogroup" aria-label="Thème d'affichage">
                      {THEMES_LIST.map((t) => {
                        const isSelected = themeMode === t.id;
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => onChangeThemeMode && onChangeThemeMode(t.id)}
                            className={`min-h-[50px] p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-[#c9a84c] ${
                              isSelected
                                ? 'border-[#c9a84c] bg-[#c9a84c]/15 ring-1 ring-[#c9a84c]'
                                : 'border-[#2e2a1e] bg-[#0c0a07] hover:border-[#c9a84c]/40'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <div 
                                className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0"
                                style={{ backgroundColor: t.previewBg, borderColor: t.previewBorder }}
                              >
                                {isSelected && <Check className="w-3 h-3 text-[#c9a84c]" aria-hidden="true" />}
                              </div>
                              <Icon className="w-3.5 h-3.5 text-[#a0947f]" aria-hidden="true" />
                            </div>
                            <div>
                              <span className="text-xs font-serif font-bold text-[#f4efe2] block">
                                {t.name}
                              </span>
                              <span className="text-[12px] font-mono text-[#a0947f] block truncate">
                                {t.desc}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. TAILLE DU TEXTE APPLIQUÉE À TOUTE L'APPLICATION */}
                  <div className="p-4 rounded-xl border border-[#2e2a1e] bg-[#12100c] space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Type className="w-4 h-4 text-[#c9a84c]" aria-hidden="true" />
                        <span className="text-sm font-serif font-bold text-[#f4efe2]">Taille du texte</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#c9a84c] px-2 py-0.5 rounded bg-[#c9a84c]/15 border border-[#c9a84c]/30">
                        {textSize} px
                      </span>
                    </div>

                    <p className="text-xs font-sans text-[#a0947f] leading-relaxed">
                      La taille choisie s'applique à la lecture de la Bible et à toute l'application.
                    </p>

                    {/* Boutons de présélection : Petit, Moyen, Grand, Très grand */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1" role="radiogroup" aria-label="Taille de texte">
                      {TEXT_SIZE_PRESETS.map((preset) => {
                        const isSelected = textSize === preset.value;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => onChangeTextSize(preset.value)}
                            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer flex flex-col items-center justify-center border focus-visible:ring-2 focus-visible:ring-[#c9a84c] ${
                              isSelected
                                ? 'bg-[#c9a84c] text-[#0d0b07] border-[#c9a84c] shadow-md'
                                : 'bg-[#18140f] text-[#ded7c8] border-[#2e2a1e] hover:border-[#c9a84c]/50'
                            }`}
                          >
                            <span>{preset.label}</span>
                            <span className="text-[12px] opacity-75">{preset.description}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Curseur précis */}
                    <div className="flex items-center gap-3 pt-2">
                      <span className="text-xs font-serif text-[#a0947f] font-bold">A-</span>
                      <input
                        type="range"
                        min="14"
                        max="28"
                        step="1"
                        value={textSize}
                        aria-label="Ajuster la taille du texte en pixels"
                        onChange={(e) => onChangeTextSize(Number(e.target.value))}
                        className="flex-1 accent-[#c9a84c] cursor-pointer min-h-[44px]"
                      />
                      <span className="text-lg font-serif font-bold text-[#f4efe2]">A+</span>
                    </div>

                    {/* Zone de prévisualisation en direct */}
                    <div className="p-3 rounded-xl bg-[#050403] border border-[#2e2a1e] text-center">
                      <p 
                        style={{ fontSize: `${textSize}px` }} 
                        className="font-serif italic leading-relaxed text-[#f4efe2] transition-all"
                      >
                        « L'Éternel est mon berger : je ne manquerai de rien. »
                      </p>
                    </div>
                  </div>

                  {/* 3. LECTURE AUDIO */}
                  <div className="p-4 rounded-xl border border-[#2e2a1e] bg-[#12100c] space-y-3.5">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-[#c9a84c]" aria-hidden="true" />
                      <span className="text-sm font-serif font-bold text-[#f4efe2]">Paramètres audio</span>
                    </div>

                    {/* Vitesse de parole */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono text-[#a0947f]">
                        <span>Vitesse d'élocution</span>
                        <span className="text-[#c9a84c] font-bold">{speechRate}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.75"
                        max="1.5"
                        step="0.05"
                        value={speechRate}
                        aria-label="Vitesse d'élocution"
                        onChange={(e) => onChangeSpeechRate(Number(e.target.value))}
                        className="w-full accent-[#c9a84c] cursor-pointer min-h-[44px]"
                      />
                    </div>

                    {/* Volume audio */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono text-[#a0947f]">
                        <span>Volume de la voix</span>
                        <span className="text-[#c9a84c] font-bold">{Math.round(speechVolume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={speechVolume}
                        aria-label="Volume de la voix"
                        onChange={(e) => onChangeSpeechVolume(Number(e.target.value))}
                        className="w-full accent-[#c9a84c] cursor-pointer min-h-[44px]"
                      />
                    </div>

                    {/* Type de voix */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-mono text-[#a0947f] block">Timbre de voix</span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'female', label: 'Féminine' },
                          { id: 'male', label: 'Masculine' },
                          { id: 'all', label: 'Automatique' },
                        ].map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => onChangeVoiceGender(v.id as any)}
                            className={`min-h-[44px] py-2 px-2.5 rounded-xl text-xs font-mono transition cursor-pointer border flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#c9a84c] ${
                              selectedVoiceGender === v.id
                                ? 'bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c]/50 font-bold'
                                : 'bg-[#050403] text-[#a0947f] border-[#2e2a1e] hover:text-[#e8e0d0]'
                            }`}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. PALETTE DU LECTEUR BIBLIQUE */}
                  <div className="p-4 rounded-xl border border-[#2e2a1e] bg-[#12100c] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-[#c9a84c]" aria-hidden="true" />
                        <span className="text-sm font-serif font-bold text-[#f4efe2]">Nuancier du lecteur</span>
                      </div>
                      <span className="text-xs font-mono text-[#c9a84c]">
                        {activeColorPreset.name}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1" role="radiogroup" aria-label="Palette du lecteur">
                      {ORDERED_READER_COLORS.map((preset) => {
                        const isSelected = (readerColor === 'sanctuary' && preset.id === 'sanctuaire') || readerColor === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => onSelectReaderColor && onSelectReaderColor(preset.id)}
                            className={`min-h-[44px] min-w-[44px] w-11 h-11 rounded-full border transition-all cursor-pointer relative flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#c9a84c] ${
                              isSelected 
                                ? 'ring-2 ring-[#c9a84c] ring-offset-2 ring-offset-[#12100c] scale-105 shadow-md border-black/30' 
                                : 'border-white/20 hover:scale-105 opacity-85 hover:opacity-100'
                            }`}
                            style={{ 
                              backgroundColor: preset.hex,
                              borderColor: preset.id === 'blanc' ? '#d4d4d8' : undefined
                            }}
                            title={preset.name}
                            aria-label={`Couleur du lecteur : ${preset.name}`}
                          >
                            {isSelected && (
                              <Check 
                                className="w-4 h-4 drop-shadow" 
                                style={{ 
                                  color: preset.id === 'blanc' || preset.id === 'rose' ? '#1c1c1c' : '#ffffff' 
                                }} 
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2">
                      <ReaderVersePreview colorId={readerColor} />
                    </div>
                  </div>

                  {/* 5. COMPTE ET CONFIDENTIALITÉ */}
                  <div className="p-4 rounded-xl border border-[#2e2a1e] bg-[#12100c] flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-mono uppercase text-[#a0947f] block">Compte Actif</span>
                      <span className="text-sm font-serif font-bold text-[#f4efe2]">
                        {userEmail || 'Utilisateur local'}
                      </span>
                    </div>

                    {onSignOut && (
                      <button
                        type="button"
                        onClick={onSignOut}
                        className="min-h-[44px] px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-red-400"
                      >
                        <LogOut className="w-4 h-4" aria-hidden="true" />
                        <span>Déconnexion</span>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* PAGE SOURCES & CRÉDITS */
                <div className="space-y-4 text-sm font-sans leading-relaxed text-[#ded7c8]">
                  {/* 1. Texte Louis Segond 1910 */}
                  <div className="p-4 rounded-xl border border-[#2e2a1e] bg-[#12100c] space-y-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#c9a84c]" aria-hidden="true" />
                      <h4 className="font-serif font-bold text-sm text-[#f4efe2]">
                        Texte Biblique : Louis Segond 1910
                      </h4>
                    </div>
                    <span className="inline-block text-xs font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded font-bold">
                      Domaine Public
                    </span>
                    <p className="text-sm text-[#b8af9e] leading-relaxed">
                      L'ensemble du texte des Écritures saintes (Ancien et Nouveau Testament, 66 livres canoniques) utilisé dans cette application est issu de la révision officielle de 1910 de la traduction du pasteur et théologien suisse Louis Segond (1810-1885).
                    </p>
                    <p className="text-xs text-[#a0947f]">
                      Cette traduction historique fait partie intégrante du domaine public mondial et est exempte de tout droit patrimonial ou restriction commerciale.
                    </p>
                  </div>

                  {/* 2. Dictionnaire & Données lexicales */}
                  <div className="p-4 rounded-xl border border-[#2e2a1e] bg-[#12100c] space-y-2">
                    <div className="flex items-center gap-2">
                      <Library className="w-4 h-4 text-[#c9a84c]" aria-hidden="true" />
                      <h4 className="font-serif font-bold text-sm text-[#f4efe2]">
                        Dictionnaire Biblique & Données Strong
                      </h4>
                    </div>
                    <span className="inline-block text-xs font-mono uppercase tracking-wider text-[#c9a84c] bg-[#c9a84c]/10 border border-[#c9a84c]/20 px-2.5 py-0.5 rounded font-bold">
                      Exégèse Historique & Domaine Public
                    </span>
                    <p className="text-sm text-[#b8af9e] leading-relaxed">
                      <strong>Concordance et Numéros Strong :</strong> Le système d'annotations lexicales repose sur la Concordance exhaustive de James Strong (1890, domaine public), reliant chaque vocable hébreu, araméen ou grec à sa racine originelle.
                    </p>
                    <p className="text-sm text-[#b8af9e] leading-relaxed">
                      <strong>Dictionnaire encyclopédique :</strong> Les fiches descriptives des personnages, cités, événements et concepts théologiques s'appuient sur des corpus historiques francophones du domaine public.
                    </p>
                  </div>

                  {/* 3. Explications et Résumés Générés par l'IA */}
                  <div className="p-4 rounded-xl border border-[#c9a84c]/30 bg-[#16130c] space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#c9a84c]" aria-hidden="true" />
                      <h4 className="font-serif font-bold text-sm text-[#f4efe2]">
                        Explications & Analyses par Intelligence Artificielle
                      </h4>
                    </div>
                    <div className="p-3 rounded-lg bg-[#0e0c08] border border-[#c9a84c]/20 text-xs font-sans text-[#c9a84c] flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#c9a84c] shrink-0 mt-0.5" aria-hidden="true" />
                      <span>
                        <strong>Règle de transparence :</strong> Les synthèses de chapitres, explications de versets, suggestions de versets similaires et analyses de notes spirituelles sont générées par des modèles d'intelligence artificielle (Google Gemini).
                      </span>
                    </div>
                    <p className="text-sm text-[#b8af9e] leading-relaxed">
                      L'intelligence artificielle est programmée avec une consigne stricte de fidélité au texte biblique fourni, distinguant ce que dit le texte de ce qui relève de l'interprétation, et présentant les différentes lectures chrétiennes sans parti pris confessionnel.
                    </p>
                    <div className="pt-1.5 text-xs font-mono text-[#a0947f] border-t border-[#2e2a1e]/60 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" aria-hidden="true" />
                      <span>Généré par IA : vérifie toujours avec le texte biblique.</span>
                    </div>
                  </div>

                  {/* 4. Respect des Données et Hors-Ligne */}
                  <div className="p-4 rounded-xl border border-[#2e2a1e] bg-[#12100c] space-y-1.5 text-xs text-[#a0947f]">
                    <div className="flex items-center gap-2 text-[#f4efe2] font-serif font-bold text-sm mb-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                      <span>Confidentialité & Stockage local</span>
                    </div>
                    <p className="leading-relaxed">
                      Vos notes d'étude, signets et enregistrements audio sont stockés en priorité sur votre appareil et synchronisés de manière privée avec votre compte personnel. Aucun texte biblique n'est inventé par l'IA lors du chargement des chapitres.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
