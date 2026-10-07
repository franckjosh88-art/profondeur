import React from 'react';
import { Menu, Search, User } from 'lucide-react';

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
  onOpenDrawer,
  onOpenSelector,
  onSearchPress,
  onProfilePress
}) => {
  return (
    <header className="w-full bg-[#050403]/95 backdrop-blur-md h-14 px-3 sm:px-4 md:px-6 flex items-center justify-between border-b border-[#2e2a1e] sticky top-0 z-40 select-none text-[#e8e0d0]">
      {/* GAUCHE : Bouton hamburger (3 traits) */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={onOpenDrawer}
          className="p-2 rounded-xl text-[#c9a84c] hover:bg-[#1a1712] hover:text-[#ebd092] border border-[#2e2a1e]/50 hover:border-[#c9a84c]/50 transition cursor-pointer active:scale-95"
          title="Menu Sanctuaire"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5 stroke-[2.2]" />
        </button>
      </div>

      {/* CENTRE : Le pilier « BIBLE PROFONDE » avec « Mode sacré » en dessous */}
      <div 
        onClick={onOpenSelector}
        className="px-5 sm:px-6 py-1 rounded-full bg-[#12100c]/90 border border-[#c9a84c]/40 hover:border-[#c9a84c]/70 transition shadow-[0_2px_10px_rgba(0,0,0,0.5),0_0_12px_rgba(201,168,76,0.12)] cursor-pointer flex flex-col items-center justify-center select-none"
        title="Bible Profonde · Mode Sacré"
      >
        <span className="font-serif font-black text-xs sm:text-sm uppercase tracking-[0.24em] text-[#c9a84c] drop-shadow-sm">
          BIBLE PROFONDE
        </span>
        <span className="text-[7.5px] sm:text-[8px] font-mono uppercase text-[#8c8270] tracking-widest font-extrabold -mt-0.5">
          Mode sacré
        </span>
      </div>

      {/* DROITE : Icône recherche et icône profil */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button 
          type="button"
          onClick={onSearchPress}
          className="p-2 text-[#c9a84c] hover:bg-[#1a1712] hover:text-[#ebd092] rounded-xl border border-[#2e2a1e]/50 hover:border-[#c9a84c]/50 transition cursor-pointer active:scale-95"
          title="Recherche"
          aria-label="Recherche"
        >
          <Search className="w-5 h-5 stroke-[2.2]" />
        </button>

        <button 
          type="button"
          onClick={onProfilePress}
          className="p-2 text-[#c9a84c] hover:bg-[#1a1712] hover:text-[#ebd092] rounded-xl border border-[#2e2a1e]/50 hover:border-[#c9a84c]/50 transition cursor-pointer active:scale-95"
          title="Mon Profil & Paramètres"
          aria-label="Profil"
        >
          <User className="w-5 h-5 stroke-[2.2]" />
        </button>
      </div>
    </header>
  );
};
