import React from 'react';
import { 
  ReaderColorId, 
  getReaderPreset, 
  normalizeReaderColorId 
} from '../types/readerTheme';

export interface ReaderVersePreviewProps {
  /**
   * Identifiant du thème de couleur du lecteur ('sanctuaire', 'blanc', 'rose', 'bronze', 'rouge', 'noir', 'bleu')
   */
  colorId?: ReaderColorId | string;
  /**
   * Numéro du verset affiché (par défaut 105)
   */
  verseNumber?: number | string;
  /**
   * Texte du verset biblique type
   */
  verseText?: string;
  /**
   * Référence du verset (ex: "Psaume 119:105")
   */
  verseRef?: string;
  /**
   * Classes CSS additionnelles
   */
  className?: string;
  /**
   * Afficher le badge avec le nom du thème et la référence
   */
  showBadge?: boolean;
}

/**
 * Composant court de prévisualisation dynamique qui affiche un verset biblique type
 * avec les variables CSS --r-* appliquées sur le conteneur .reader.
 * Sert d'aperçu en temps réel pour la carte 'Couleur du lecteur'.
 */
export const ReaderVersePreview: React.FC<ReaderVersePreviewProps> = ({
  colorId = 'sanctuaire',
  verseNumber = 105,
  verseText = "Ta parole est une lampe à mes pieds, et une lumière sur mon sentier.",
  verseRef = "Psaume 119:105",
  className = "",
  showBadge = true,
}) => {
  const normalizedId = normalizeReaderColorId(colorId);
  const preset = getReaderPreset(normalizedId);
  const tokens = preset.tokens;

  // Injection stricte des variables CSS --r-* circonscrites au conteneur .reader
  const cssVarsStyle: React.CSSProperties = {
    '--r-bg': tokens.bg,
    '--r-surface': tokens.surface,
    '--r-text': tokens.text,
    '--r-text-secondary': tokens.textMuted,
    '--r-text-muted': tokens.textMuted,
    '--r-accent': tokens.accent,
    '--r-border': tokens.border,
    '--r-verse-num': tokens.verseNum,
    backgroundColor: 'var(--r-bg)',
    borderColor: 'var(--r-border)',
    color: 'var(--r-text)',
  } as React.CSSProperties;

  return (
    <div
      className={`reader reader-container relative overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-all duration-300 shadow-sm ${className}`}
      style={cssVarsStyle}
      data-theme={preset.id}
    >
      {showBadge && (
        <div className="flex items-center justify-between mb-2 select-none">
          <span
            className="text-[10px] font-mono uppercase tracking-widest font-semibold flex items-center gap-1.5"
            style={{ color: 'var(--r-text-secondary)' }}
          >
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0 shadow-xs"
              style={{ backgroundColor: 'var(--r-accent)' }}
            />
            <span>Aperçu — {preset.name}</span>
          </span>

          <span
            className="text-[11px] font-mono px-2 py-0.5 rounded border transition-colors"
            style={{
              backgroundColor: 'var(--r-surface)',
              color: 'var(--r-accent)',
              borderColor: 'var(--r-border)',
            }}
          >
            {verseRef}
          </span>
        </div>
      )}

      {/* Texte biblique avec typographie soignée et numéro de verset stylisé */}
      <p
        className="font-serif italic text-sm sm:text-base leading-relaxed tracking-normal select-none"
        style={{ color: 'var(--r-text)' }}
      >
        <sup
          className="text-xs mr-1.5 not-italic font-bold font-mono inline-block opacity-90"
          style={{ color: 'var(--r-verse-num)' }}
        >
          {verseNumber}
        </sup>
        «&nbsp;{verseText}&nbsp;»
      </p>
    </div>
  );
};

export default ReaderVersePreview;
