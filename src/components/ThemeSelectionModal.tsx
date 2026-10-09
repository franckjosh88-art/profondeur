import React, { useState, useEffect } from 'react';
import { Palette, X, Check, Sparkles } from 'lucide-react';
import { 
  ReaderColorId, 
  ORDERED_READER_COLORS, 
  READER_COLORS, 
  getReaderPreset, 
  loadSavedReaderColor, 
  saveReaderColorLocally,
  applyReaderThemeCssVars 
} from '../types/readerTheme';

export interface ThemeSelectionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  selectedColorId?: ReaderColorId;
  onSelectColor?: (colorId: ReaderColorId) => void;
  variant?: 'modal' | 'card' | 'bottomSheet';
  className?: string;
  previewVerseText?: string;
  previewVerseRef?: string;
}

export { ReaderVersePreview } from './ReaderVersePreview';
import { ReaderVersePreview } from './ReaderVersePreview';
export { ReaderColorThemeCard } from './ReaderColorThemeCard';

/**
 * 4e Carte « Couleur du lecteur » pour la page Thème / Plus
 */
export const ReaderColorCard: React.FC<{
  selectedColorId?: ReaderColorId;
  onSelectColor?: (colorId: ReaderColorId) => void;
  className?: string;
}> = ({
  selectedColorId: controlledColorId,
  onSelectColor,
  className = ""
}) => {
  const [internalColorId, setInternalColorId] = useState<ReaderColorId>(() => loadSavedReaderColor());
  const [hoveredColorId, setHoveredColorId] = useState<ReaderColorId | null>(null);

  const currentColorId = controlledColorId || internalColorId;
  const activePreviewColorId = hoveredColorId || currentColorId;
  const currentPreset = getReaderPreset(currentColorId);

  // Synchronisation avec l'état local et les événements externes
  useEffect(() => {
    if (controlledColorId) {
      setInternalColorId(controlledColorId);
    }
  }, [controlledColorId]);

  useEffect(() => {
    const handleColorEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ReaderColorId>;
      if (customEvent.detail && customEvent.detail in READER_COLORS) {
        setInternalColorId(customEvent.detail);
      }
    };
    window.addEventListener('reader-color-changed', handleColorEvent);
    return () => window.removeEventListener('reader-color-changed', handleColorEvent);
  }, []);

  const handleChooseColor = (colorId: ReaderColorId) => {
    setInternalColorId(colorId);
    saveReaderColorLocally(colorId);
    applyReaderThemeCssVars(colorId);
    if (onSelectColor) {
      onSelectColor(colorId);
    }
  };

  return (
    <div className={`rounded-2xl bg-surface border border-app p-4 sm:p-5 space-y-4 shadow-sm text-left ${className}`}>
      {/* En-tête de la carte (même style que Mode / Couleur jour / Couleur nuit) */}
      <div className="flex items-center gap-2 text-muted text-xs font-mono uppercase tracking-widest">
        <Palette className="w-3.5 h-3.5 text-accent" />
        <span>COULEUR DU LECTEUR</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <span className="font-sans text-sm sm:text-base font-medium text-app block">
            {hoveredColorId ? READER_COLORS[hoveredColorId].name : currentPreset.name}
          </span>
          <span className="text-[11px] font-mono text-muted">
            Personnalise le confort visuel du lecteur
          </span>
        </div>

        {/* 7 Pastilles rondes */}
        <div 
          className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap"
          role="radiogroup"
          aria-label="Sélection de la couleur du lecteur"
        >
          {ORDERED_READER_COLORS.map((preset) => {
            const isSelected = currentColorId === preset.id;
            const isHovered = hoveredColorId === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleChooseColor(preset.id)}
                onMouseEnter={() => setHoveredColorId(preset.id)}
                onMouseLeave={() => setHoveredColorId(null)}
                onFocus={() => setHoveredColorId(preset.id)}
                onBlur={() => setHoveredColorId(null)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border transition-all cursor-pointer relative flex items-center justify-center ${
                  isSelected 
                    ? 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--surface,#12100c)] scale-110 shadow-md border-black/30' 
                    : isHovered 
                      ? 'scale-110 shadow-sm border-white/40' 
                      : 'border-white/20 hover:scale-105 opacity-85 hover:opacity-100'
                }`}
                style={{ 
                  backgroundColor: preset.hex,
                  borderColor: preset.id === 'bronze' ? '#CD7F32' : (preset.id === 'blanc' ? '#d4d4d8' : undefined)
                }}
                title={preset.name}
                aria-label={preset.name}
              >
                {isSelected && (
                  <Check 
                    className="w-3.5 h-3.5 drop-shadow"
                    style={{ 
                      color: preset.id === 'bronze' 
                        ? '#CD7F32' 
                        : (preset.id === 'blanc' || preset.id === 'rose' ? '#1c1c1c' : '#ffffff') 
                    }} 
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Aperçu textuel dynamique avec variables CSS --r-* */}
      <div className="pt-2">
        <ReaderVersePreview colorId={activePreviewColorId} />
      </div>
    </div>
  );
};

/**
 * Composant Modal / Bottom Sheet 'ThemeSelectionModal'
 * Permet à l'utilisateur de choisir parmi les 7 couleurs définies en utilisant
 * les variables CSS --r-* dans le conteneur .reader et incluant un aperçu textuel dynamique.
 */
export const ThemeSelectionModal: React.FC<ThemeSelectionModalProps> = ({
  isOpen = true,
  onClose,
  selectedColorId: controlledColorId,
  onSelectColor,
  variant,
  className = "",
  previewVerseText,
  previewVerseRef
}) => {
  const [internalColorId, setInternalColorId] = useState<ReaderColorId>(() => loadSavedReaderColor());
  const [hoveredColorId, setHoveredColorId] = useState<ReaderColorId | null>(null);

  const currentColorId = controlledColorId || internalColorId;
  const activePreviewColorId = hoveredColorId || currentColorId;
  const currentPreset = getReaderPreset(currentColorId);

  useEffect(() => {
    if (controlledColorId) {
      setInternalColorId(controlledColorId);
    }
  }, [controlledColorId]);

  useEffect(() => {
    const handleColorEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ReaderColorId>;
      if (customEvent.detail && customEvent.detail in READER_COLORS) {
        setInternalColorId(customEvent.detail);
      }
    };
    window.addEventListener('reader-color-changed', handleColorEvent);
    return () => window.removeEventListener('reader-color-changed', handleColorEvent);
  }, []);

  const handleChooseColor = (colorId: ReaderColorId) => {
    setInternalColorId(colorId);
    saveReaderColorLocally(colorId);
    applyReaderThemeCssVars(colorId);
    if (onSelectColor) {
      onSelectColor(colorId);
    }
  };

  // Si utilisé en variante 'card', afficher directement la carte
  if (variant === 'card') {
    return (
      <ReaderColorCard 
        selectedColorId={currentColorId}
        onSelectColor={onSelectColor}
        className={className}
      />
    );
  }

  // Si fermé en mode modal
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm select-none animate-fade-in"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-[#0c0a07] border border-[#2e2a1e] shadow-[0_0_40px_rgba(0,0,0,0.9),0_0_20px_rgba(201,168,76,0.15)] flex flex-col overflow-hidden text-left text-[#e8e0d0] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête Modal / Sheet */}
        <div className="p-4 sm:p-5 border-b border-[#2e2a1e] bg-[#12100c] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#f4efe2]">
                Couleur du lecteur
              </h3>
              <span className="text-[11px] font-mono text-[#8c8270] block">
                {hoveredColorId ? READER_COLORS[hoveredColorId].name : currentPreset.name} (actif immédiatement)
              </span>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8c8270] hover:text-[#c9a84c] hover:bg-[#1a1712] transition cursor-pointer"
              title="Fermer"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Corps : 7 pastilles et aperçu dynamique */}
        <div className="p-5 space-y-5">
          {/* Rangée des 7 pastilles rondes */}
          <div>
            <div className="flex items-center justify-between mb-3 text-xs text-[#a89b84]">
              <span>Choisissez votre ambiance :</span>
              <span className="font-mono text-[#c9a84c] font-semibold">
                {hoveredColorId ? READER_COLORS[hoveredColorId].name : currentPreset.name}
              </span>
            </div>

            <div 
              className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#12100c] border border-[#2e2a1e]"
              role="radiogroup"
              aria-label="Palette des 7 couleurs"
            >
              {ORDERED_READER_COLORS.map((preset) => {
                const isSelected = currentColorId === preset.id;
                const isHovered = hoveredColorId === preset.id;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleChooseColor(preset.id)}
                    onMouseEnter={() => setHoveredColorId(preset.id)}
                    onMouseLeave={() => setHoveredColorId(null)}
                    onFocus={() => setHoveredColorId(preset.id)}
                    onBlur={() => setHoveredColorId(null)}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border transition-all cursor-pointer relative flex items-center justify-center ${
                      isSelected 
                        ? 'ring-2 ring-[#c9a84c] ring-offset-2 ring-offset-[#12100c] scale-110 shadow-md border-black/30' 
                        : isHovered 
                          ? 'scale-110 shadow-sm border-white/40' 
                          : 'border-white/20 hover:scale-105 opacity-85 hover:opacity-100'
                    }`}
                    style={{ 
                      backgroundColor: preset.hex,
                      borderColor: preset.id === 'blanc' ? '#d4d4d8' : undefined
                    }}
                    title={preset.name}
                    aria-label={preset.name}
                  >
                    {isSelected && (
                      <Check 
                        className="w-4 h-4 drop-shadow" 
                        style={{ 
                          color: preset.id === 'bronze' 
                            ? '#CD7F32' 
                            : (preset.id === 'blanc' || preset.id === 'rose' ? '#1c1c1c' : '#ffffff') 
                        }} 
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aperçu textuel dynamique dans le conteneur .reader avec CSS variables --r-* */}
          <div>
            <ReaderVersePreview 
              colorId={activePreviewColorId}
              verseText={previewVerseText}
              verseRef={previewVerseRef}
            />
          </div>

          {/* Bouton de confirmation rapide */}
          {onClose && (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#c9a84c]/20 hover:bg-[#c9a84c]/30 text-[#c9a84c] border border-[#c9a84c]/40 font-medium text-xs font-sans transition cursor-pointer active:scale-95"
              >
                Terminer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThemeSelectionModal;
