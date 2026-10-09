import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trash2, X, Check } from 'lucide-react';
import { Verse, HighlightColor, HIGHLIGHT_PALETTE, HighlightColorDef } from '../types/bible';

export interface VerseHighlightMenuProps {
  verse: Verse;
  position: { x: number; y: number } | null;
  anchorRect?: DOMRect | null;
  currentColorName?: HighlightColor | string | null;
  onSelectColor: (color: HighlightColor) => void;
  onRemoveHighlight: () => void;
  onClose: () => void;
  isOpen: boolean;
}

export const VerseHighlightMenu: React.FC<VerseHighlightMenuProps> = ({
  verse,
  position,
  anchorRect,
  currentColorName,
  onSelectColor,
  onRemoveHighlight,
  onClose,
  isOpen
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; arrowPosition: 'bottom' | 'top' }>({
    top: 0,
    left: 0,
    arrowPosition: 'bottom'
  });

  // Calculate coordinates dynamically to prevent overflow offscreen
  useEffect(() => {
    if (!isOpen) return;

    const computePosition = () => {
      const menuWidth = 260; // Approximate menu width
      const menuHeight = 135; // Approximate menu height
      const padding = 12;

      let targetX = position?.x || (anchorRect ? anchorRect.left + anchorRect.width / 2 : window.innerWidth / 2);
      let targetY = position?.y || (anchorRect ? anchorRect.top : window.innerHeight / 2);

      // Desired position: slightly above the touch/verse point
      let calculatedTop = targetY - menuHeight - 14;
      let arrowPos: 'bottom' | 'top' = 'bottom';

      // If too close to viewport top, show beneath instead
      if (calculatedTop < padding) {
        if (anchorRect) {
          calculatedTop = anchorRect.bottom + 10;
        } else {
          calculatedTop = targetY + 18;
        }
        arrowPos = 'top';
      }

      // Horizontal clamping
      let calculatedLeft = targetX - menuWidth / 2;
      if (calculatedLeft < padding) {
        calculatedLeft = padding;
      } else if (calculatedLeft + menuWidth > window.innerWidth - padding) {
        calculatedLeft = window.innerWidth - menuWidth - padding;
      }

      setCoords({
        top: Math.max(padding, calculatedTop),
        left: calculatedLeft,
        arrowPosition: arrowPos
      });
    };

    computePosition();
    window.addEventListener('resize', computePosition);
    return () => window.removeEventListener('resize', computePosition);
  }, [isOpen, position, anchorRect]);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handlePointerDownOutside = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDownOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] pointer-events-auto">
        {/* Subtle backdrop overlay that closes the menu when tapped */}
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-[0.5px] transition-opacity" 
          onClick={onClose}
        />

        {/* Floating Context Popover */}
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.9, y: coords.arrowPosition === 'bottom' ? 6 : -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 4 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
          }}
          role="dialog"
          aria-label="Menu de surlignage"
          className="absolute w-[260px] rounded-2xl bg-[#181510] border border-[#3a3224] p-3 text-left shadow-[0_12px_36px_rgba(0,0,0,0.65)] select-none z-[80] font-sans"
        >
          {/* Header with Verse Ref & Close button */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2a241a]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#c9a84c] animate-pulse" />
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#c9a84c]">
                {verse.book_name} {verse.chapter}:{verse.verse}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[#8c8270] hover:text-[#ded7c8] hover:bg-[#221e16] transition cursor-pointer"
              title="Fermer"
              aria-label="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[10.5px] font-medium text-[#a0947f] mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#c9a84c]" />
              Surligner le verset
            </span>
            {currentColorName && (
              <span className="text-[9.5px] font-mono text-[#c9a84c] uppercase">
                Actif
              </span>
            )}
          </div>

          {/* 3 Pastilles de couleur : Jaune, Vert, Rose */}
          <div className="grid grid-cols-3 gap-2">
            {HIGHLIGHT_PALETTE.map((pal: HighlightColorDef) => {
              const isSelected = currentColorName?.toLowerCase() === pal.id;

              return (
                <button
                  key={pal.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectColor(pal.id);
                  }}
                  className={`group relative flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-[#252017] border-[#c9a84c] shadow-[0_0_12px_rgba(201,168,76,0.25)]'
                      : 'bg-[#1f1b14] border-[#2e271c] hover:border-[#4a3f2d] hover:bg-[#282218]'
                  }`}
                  title={`Surligner en ${pal.name}`}
                  aria-label={`Surligner en ${pal.name}`}
                >
                  {/* Pastille ronde de couleur */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border"
                    style={{
                      backgroundColor: pal.hex,
                      borderColor: pal.borderHex
                    }}
                  >
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#12100c] stroke-[3]" />
                    )}
                  </div>

                  {/* Libellé */}
                  <span 
                    className={`mt-1.5 text-[10px] font-medium transition-colors ${
                      isSelected ? 'text-[#f0e6d2] font-bold' : 'text-[#a0947f] group-hover:text-[#ded7c8]'
                    }`}
                  >
                    {pal.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Option pour effacer le surlignage si le verset est déjà surligné */}
          {currentColorName && (
            <div className="mt-2.5 pt-2 border-t border-[#2a241a]">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveHighlight();
                }}
                className="w-full py-1.5 px-2 rounded-xl text-[11px] font-medium text-[#c08484] hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Effacer le surlignage</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
