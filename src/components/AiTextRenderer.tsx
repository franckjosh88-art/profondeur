import React from 'react';
import { cleanInlineText } from '../lib/bibleFormatter';
import { AiDisclaimer } from './AiDisclaimer';

interface AiTextRendererProps {
  text: string | null | undefined;
  className?: string;
}

/**
 * Composant de rendu visuel pour le texte généré par l'IA.
 * Transforme le Markdown en éléments React harmonieux (titres dorés en gras,
 * vraies puces stylisées, texte en gras) tout en éliminant absolument tous
 * les symboles bruts (*, **, #, ##, _).
 */
export const AiTextRenderer: React.FC<AiTextRendererProps> = ({
  text,
  className = ''
}) => {
  if (!text) return null;

  // Découpage en lignes
  const rawLines = text.split('\n');

  // Helper pour parser les segments inline (**gras**, suppression des résidus)
  const renderInline = (str: string): React.ReactNode => {
    if (!str) return null;

    // Découper sur les balises de gras **...**
    const parts = str.split(/\*\*(.*?)\*\*/g);

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // Segment en gras
        const cleanedBold = cleanInlineText(part);
        if (!cleanedBold) return null;
        return (
          <strong key={index} className="font-semibold text-[#f3ebd8]">
            {cleanedBold}
          </strong>
        );
      } else {
        // Texte normal : éliminer tous les symboles résiduels (*, #, _)
        const cleanedNormal = cleanInlineText(part);
        return <span key={index}>{cleanedNormal}</span>;
      }
    });
  };

  // Traitement et rendu de chaque ligne
  return (
    <div className={`space-y-1.5 font-sans ${className}`}>
      {rawLines.map((rawLine, idx) => {
        const trimmed = rawLine.trim();

        // Ligne vide -> espacement
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // 1. Détection de titre (#, ##, ### ou **Titre seul sur la ligne** ou titre suivi de deux-points)
        const isHashHeader = /^#+\s+/.test(trimmed);
        const isBoldOnlyHeader = /^\*\*[^*]+(\*\*:?|\*\*)$/.test(trimmed) && trimmed.length < 80;
        const isColonHeader = /^[A-ZÀ-Ÿ][a-zà-ÿ0-9\s—–'-]{3,45}\s*:$/.test(trimmed) && !trimmed.startsWith('*') && !trimmed.startsWith('-');

        if (isHashHeader || isBoldOnlyHeader || isColonHeader) {
          const headerText = trimmed
            .replace(/^#+\s*/, '')
            .replace(/^\*\*|\*\*$/g, '')
            .replace(/^\*\*|\*\*:$/g, ':');

          return (
            <h4
              key={idx}
              className="font-serif font-bold text-[#c9a84c] text-sm sm:text-base mt-3.5 mb-1.5 tracking-wide leading-snug flex items-center gap-1.5"
            >
              <span>{cleanInlineText(headerText)}</span>
            </h4>
          );
        }

        // 2. Détection de puce (*, -, •, 1.)
        const isBullet = /^([*\-•]|\d+\.)\s+/.test(trimmed) || /^[*\-]\s*\*\*/.test(trimmed);

        if (isBullet) {
          // Extraire le contenu de la puce en retirant le symbole initial
          const bulletContent = trimmed.replace(/^([*\-•]|\d+\.)\s+/, '');

          return (
            <div
              key={idx}
              className="flex items-start gap-2.5 text-xs sm:text-sm text-[#ded7c8] leading-relaxed my-1 pl-1"
            >
              <span className="text-[#c9a84c] text-xs mt-1 select-none shrink-0">•</span>
              <div className="flex-1 min-w-0">
                {renderInline(bulletContent)}
              </div>
            </div>
          );
        }

        // 3. Paragraphe standard
        return (
          <p
            key={idx}
            className="text-xs sm:text-sm text-[#ded7c8] font-sans leading-relaxed my-1"
          >
            {renderInline(trimmed)}
          </p>
        );
      })}

      {/* Mention légale et théologique systématique */}
      <AiDisclaimer />
    </div>
  );
};
