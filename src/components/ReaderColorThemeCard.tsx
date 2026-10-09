import React, { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { 
  ReaderColorId, 
  ORDERED_READER_COLORS, 
  READER_COLORS, 
  getReaderPreset, 
  loadSavedReaderColor, 
  saveReaderColorLocally,
  applyReaderThemeCssVars
} from '../types/readerTheme';
import { ReaderVersePreview } from './ReaderVersePreview';

export interface ReaderColorThemeCardProps {
  /**
   * Identifiant du thème sélectionné (contrôlé si fourni, sinon géré en interne via localStorage / événements)
   */
  selectedColorId?: ReaderColorId | string;
  /**
   * Callback appelé lors de la sélection d'une couleur
   */
  onSelectColor?: (colorId: ReaderColorId) => void;
  /**
   * Classes CSS additionnelles pour le conteneur de la carte
   */
  className?: string;
  /**
   * Texte personnalisé pour l'aperçu du verset (optionnel)
   */
  previewVerseText?: string;
  /**
   * Référence personnalisée pour l'aperçu du verset (optionnel)
   */
  previewVerseRef?: string;
}

/**
 * 4e Carte « Couleur du lecteur » pour la page Thème (Plus > Thème).
 * Affiche les 7 couleurs sous forme de pastilles rondes et un aperçu textuel
 * dynamique d'un verset biblique qui réagit au survol et à la sélection.
 */
export const ReaderColorThemeCard: React.FC<ReaderColorThemeCardProps> = ({
  selectedColorId: controlledColorId,
  onSelectColor,
  className = "",
  previewVerseText,
  previewVerseRef,
}) => {
  const [internalColorId, setInternalColorId] = useState<ReaderColorId>(() => loadSavedReaderColor());
  const [hoveredColorId, setHoveredColorId] = useState<ReaderColorId | null>(null);

  const currentColorId: ReaderColorId = (controlledColorId as ReaderColorId) || internalColorId;
  const activePreviewColorId: ReaderColorId = hoveredColorId || currentColorId;
  const currentPreset = getReaderPreset(currentColorId);
  const activePreset = getReaderPreset(activePreviewColorId);

  // Synchronisation avec les props contrôlées
  useEffect(() => {
    if (controlledColorId) {
      setInternalColorId(controlledColorId as ReaderColorId);
    }
  }, [controlledColorId]);

  // Synchronisation réactive avec les événements 'reader-color-changed' de l'application
  useEffect(() => {
    const handleColorEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ReaderColorId | string>;
      const incomingId = customEvent.detail;
      if (incomingId) {
        const normalized = incomingId === 'sanctuary' ? 'sanctuaire' : (incomingId as ReaderColorId);
        if (normalized in READER_COLORS) {
          setInternalColorId(normalized);
        }
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
      {/* En-tête de la carte */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted text-xs font-mono uppercase tracking-widest">
          <Palette className="w-3.5 h-3.5 text-accent" />
          <span>COULEUR DU LECTEUR</span>
        </div>
        <span className="text-[11px] font-mono text-accent font-semibold px-2 py-0.5 rounded bg-app border border-app">
          {activePreset.name}
          {hoveredColorId && hoveredColorId !== currentColorId && (
            <span className="ml-1 text-[10px] text-muted italic">(aperçu)</span>
          )}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <span className="font-sans text-sm sm:text-base font-medium text-app block">
            {hoveredColorId ? READER_COLORS[hoveredColorId].name : currentPreset.name}
          </span>
          <span className="text-[11px] font-mono text-muted">
            Personnalise le confort visuel du texte biblique
          </span>
        </div>

        {/* 7 Pastilles rondes de sélection de couleur */}
        <div 
          className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap"
          role="radiogroup"
          aria-label="Sélection de la couleur du lecteur (7 nuances)"
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
                      ? 'scale-110 shadow-sm ring-1 ring-white/50 border-white/40' 
                      : 'border-white/20 hover:scale-105 opacity-85 hover:opacity-100'
                }`}
                style={{ 
                  backgroundColor: preset.hex,
                  borderColor: preset.id === 'bronze' ? '#CD7F32' : (preset.id === 'blanc' ? '#d4d4d8' : undefined)
                }}
                title={`${preset.name}${preset.id === 'bronze' ? ' (fond #2A1D12, surface #38281A, texte #F1E2CC, accent #CD7F32)' : ''}`}
                aria-label={`Thème de lecture ${preset.name}`}
              >
                {isSelected && (
                  <Check 
                    className="w-3.5 h-3.5 drop-shadow stroke-[2.5]"
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

      {/* Liste explicite des 7 thèmes en boutons avec badges couleur dont Bronze */}
      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
        {ORDERED_READER_COLORS.map((preset) => {
          const isSelected = currentColorId === preset.id;
          return (
            <button
              key={`pill-${preset.id}`}
              type="button"
              onClick={() => handleChooseColor(preset.id)}
              onMouseEnter={() => setHoveredColorId(preset.id)}
              onMouseLeave={() => setHoveredColorId(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer border ${
                isSelected
                  ? 'border-accent bg-accent/15 text-accent font-semibold shadow-xs'
                  : 'border-app text-muted hover:text-app hover:border-white/30 bg-app/40'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border"
                style={{
                  backgroundColor: preset.hex,
                  borderColor: preset.id === 'bronze' ? '#CD7F32' : (preset.id === 'blanc' ? '#d4d4d8' : 'rgba(255,255,255,0.25)')
                }}
              />
              <span>{preset.name}</span>
            </button>
          );
        })}
      </div>

      {/* Aperçu textuel dynamique avec variables CSS --r-* */}
      <div className="pt-2">
        <ReaderVersePreview 
          colorId={activePreviewColorId} 
          verseText={previewVerseText}
          verseRef={previewVerseRef}
        />
      </div>
    </div>
  );
};

export default ReaderColorThemeCard;
