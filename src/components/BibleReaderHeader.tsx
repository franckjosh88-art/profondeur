import React from 'react';
import { Menu, Search, Moon, Sun, ChevronDown, Sparkles } from 'lucide-react';

interface BibleReaderHeaderProps {
  currentPassage: string; // e.g. "Psaumes 84"
  isNightMode: boolean;
  onOpenDrawer: () => void;
  onOpenSelector: () => void;
  onToggleNightMode: () => void;
  onOpenSearch: () => void;
  onOpenAdFreeModal: () => void;
}

export const BibleReaderHeader: React.FC<BibleReaderHeaderProps> = ({
  currentPassage,
  isNightMode,
  onOpenDrawer,
  onOpenSelector,
  onToggleNightMode,
  onOpenSearch,
  onOpenAdFreeModal
}) => {
  return (
    <header className={`w-full h-14 px-3 sm:px-4 flex items-center justify-between border-b transition-colors duration-200 select-none sticky top-0 z-30 ${
      isNightMode 
        ? 'bg-[#182026] border-[#2A343D] text-[#A6BAC5]' 
        : 'bg-[#E9EDF0] border-[#D4DCE2] text-[#5F7F8C]'
    }`}>
      {/* GAUCHE : Menu Hamburger + Icône ADS barrée */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Hamburger menu */}
        <button
          onClick={onOpenDrawer}
          className={`p-2 rounded-lg transition cursor-pointer ${
            isNightMode 
              ? 'hover:bg-[#252F37] text-[#A6BAC5] active:bg-[#2A353E]' 
              : 'hover:bg-[#DCE3E8] text-[#5F7F8C] active:bg-[#CFD9E0]'
          }`}
          title="Ouvrir le menu latéral"
          aria-label="Menu principal"
        >
          <Menu className="w-5 h-5 stroke-[2.2]" />
        </button>

        {/* Icône ADS barrée en rouge (Suppression des publicités) */}
        <button
          onClick={onOpenAdFreeModal}
          className="relative px-1.5 py-0.5 rounded border border-rose-500/30 hover:border-rose-500/60 bg-rose-500/10 hover:bg-rose-500/15 transition cursor-pointer flex items-center justify-center group"
          title="Version 100% sans publicité"
          aria-label="Suppression des publicités"
        >
          <span className="font-mono font-black text-[9px] tracking-tight text-rose-500 group-hover:scale-105 transition-transform">
            ADS
          </span>
          {/* Ligne rouge diagonale pour barrer ADS */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[110%] h-[1.5px] bg-rose-600 rotate-[-28deg] rounded-full shadow-sm"></div>
          </div>
        </button>
      </div>

      {/* CENTRE : Titre du passage cliquable -> Ouvre Sélecteur Livre -> Chapitre -> Verset */}
      <button
        onClick={onOpenSelector}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-serif font-black text-sm sm:text-base tracking-wide transition cursor-pointer max-w-[50%] truncate ${
          isNightMode 
            ? 'text-[#E0E8EE] hover:bg-[#252F37]' 
            : 'text-[#3D525E] hover:bg-[#DCE3E8]'
        }`}
        title="Changer de livre, chapitre ou verset"
      >
        <span className="truncate">{currentPassage}</span>
        <ChevronDown className="w-4 h-4 shrink-0 opacity-70" />
      </button>

      {/* DROITE : Mode Nuit (Lune avec étoiles) + Loupe Recherche */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Mode Nuit */}
        <button
          onClick={onToggleNightMode}
          className={`p-2 rounded-lg transition cursor-pointer relative ${
            isNightMode 
              ? 'hover:bg-[#252F37] text-amber-400' 
              : 'hover:bg-[#DCE3E8] text-[#5F7F8C]'
          }`}
          title={isNightMode ? "Activer le mode jour" : "Activer le mode nuit"}
          aria-label="Basculer mode jour / nuit"
        >
          {isNightMode ? (
            <Sun className="w-4.5 h-4.5" />
          ) : (
            <div className="relative">
              <Moon className="w-4.5 h-4.5" />
              <Sparkles className="w-2.5 h-2.5 text-amber-500 absolute -top-1 -right-1" />
            </div>
          )}
        </button>

        {/* Loupe Recherche */}
        <button
          onClick={onOpenSearch}
          className={`p-2 rounded-lg transition cursor-pointer ${
            isNightMode 
              ? 'hover:bg-[#252F37] text-[#A6BAC5]' 
              : 'hover:bg-[#DCE3E8] text-[#5F7F8C]'
          }`}
          title="Rechercher un verset par mot-clé ou référence"
          aria-label="Recherche"
        >
          <Search className="w-4.5 h-4.5 stroke-[2.2]" />
        </button>
      </div>
    </header>
  );
};
