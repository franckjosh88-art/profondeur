import React from 'react';
import { Menu, Search, ChevronDown, User, Dices } from 'lucide-react';

interface TopBarProps {
  currentPassage?: string;
  onOpenDrawer?: () => void;
  onOpenSelector?: () => void;
  onSearchPress?: () => void;
  onStudyPress?: () => void;
  onProfilePress?: () => void;
  onMeditationPress?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentPassage = "Genèse 1",
  onOpenDrawer,
  onOpenSelector,
  onSearchPress,
  onStudyPress,
  onProfilePress,
  onMeditationPress
}) => {
  return (
    <header className="w-full bg-[#050403]/95 backdrop-blur-md h-14 px-3 sm:px-4 flex items-center justify-between border-b border-[#2e2a1e] sticky top-0 z-40 select-none text-[#e8e0d0]">
      {/* GAUCHE : Menu Hamburger (3 traits) */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenDrawer}
          className="p-2 rounded-xl text-[#c9a84c] hover:bg-[#1a1712] hover:text-[#ebd092] border border-[#2e2a1e]/40 hover:border-[#c9a84c]/40 transition cursor-pointer active:scale-95"
          title="Ouvrir le menu"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5 stroke-[2.2]" />
        </button>
      </div>

      {/* CENTRE : Passage en cours cliquable -> Sélecteur Livre -> Chapitre -> Verset */}
      <button
        onClick={onOpenSelector}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#12100c]/90 hover:bg-[#1a1712] border border-[#2e2a1e] hover:border-[#c9a84c]/60 text-[#c9a84c] font-serif font-extrabold text-xs sm:text-sm tracking-wide transition cursor-pointer shadow-sm max-w-[55%] truncate active:scale-98"
        title="Changer de livre, chapitre ou verset"
      >
        <span className="truncate">{currentPassage}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-80" />
      </button>

      {/* DROITE : Icône recherche (loupe) */}
      <div className="flex items-center gap-1.5">
        <button 
          onClick={onSearchPress}
          className="p-2 text-[#c9a84c] hover:bg-[#1a1712] hover:text-[#ebd092] rounded-xl border border-[#2e2a1e]/40 hover:border-[#c9a84c]/40 transition cursor-pointer active:scale-95"
          title="Rechercher un verset par mot-clé ou référence directe (ex : Ps 23:4)"
          aria-label="Recherche"
        >
          <Search className="w-5 h-5 stroke-[2.2]" />
        </button>
      </div>
    </header>
  );
};
