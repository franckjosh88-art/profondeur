import React from 'react';
import { Sparkles, Crown } from 'lucide-react';

interface RevelationBadgeProps {
  onClick?: () => void;
  text?: string;
  isCrown?: boolean;
}

export const RevelationBadge: React.FC<RevelationBadgeProps> = ({
  onClick,
  text = "RÉVÉLATION DU JOUR",
  isCrown = true
}) => {
  return (
    <div className="flex justify-center my-4 select-none">
      <button
        onClick={onClick}
        disabled={!onClick}
        className="inline-flex items-center gap-1.5 px-4.5 py-1.5 bg-luxury-button-bg hover:bg-luxury-gold/20 border border-luxury-gold-dark text-luxury-gold rounded-full transition duration-200 active:scale-95 shadow-gold-glow max-w-fit cursor-pointer"
      >
        {isCrown ? (
          <Crown className="w-3.5 h-3.5 text-luxury-gold filter drop-shadow animate-pulse" />
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-luxury-gold filter drop-shadow animate-pulse" />
        )}
        <span className="font-mono text-[10px] tracking-[0.22em] font-black uppercase text-shadow-gold">
          {text}
        </span>
      </button>
    </div>
  );
};
