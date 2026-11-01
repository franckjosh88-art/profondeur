import React from 'react';
import { Sparkles } from 'lucide-react';

interface AiDisclaimerProps {
  className?: string;
}

/**
 * Mention légale et théologique obligatoire sous chaque contenu généré par l'IA.
 */
export const AiDisclaimer: React.FC<AiDisclaimerProps> = ({ className = '' }) => {
  return (
    <div className={`mt-2.5 pt-2 text-xs font-sans text-[#a0947f] flex items-center gap-1.5 border-t border-[#2e2a1e]/40 select-none ${className}`}>
      <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]/90 shrink-0" />
      <span>Généré par IA : vérifie toujours avec le texte biblique.</span>
    </div>
  );
};
