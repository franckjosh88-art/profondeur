import React from 'react';
import { BookOpen, Search, User } from 'lucide-react';

interface TopBarProps {
  onSearchPress?: () => void;
  onStudyPress?: () => void;
  onProfilePress?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onSearchPress,
  onStudyPress,
  onProfilePress
}) => {
  return (
    <div className="w-full bg-luxury-bg h-14 px-4 flex items-center justify-between border-b border-transparent relative select-none">
      
      {/* Left Icon - Book Open in Gold */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-luxury-button-bg flex items-center justify-center border border-luxury-gold/20">
          <BookOpen className="w-4 h-4 text-luxury-gold" />
        </div>
        <span className="font-serif font-extrabold tracking-wide text-xs uppercase text-luxury-gold filter drop-shadow">
          BIBLE PROFONDE
        </span>
      </div>

      {/* Right Icons Container */}
      <div className="flex items-center gap-3">
        {/* Search icon */}
        <button 
          onClick={onSearchPress}
          className="p-1.5 hover:bg-luxury-surface/80 text-luxury-text-muted hover:text-luxury-gold rounded-full transition cursor-pointer"
          title="Recherche"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* OUTLINED STUDY BUTTON */}
        <button
          onClick={onStudyPress}
          className="h-8 px-3.5 bg-transparent hover:bg-luxury-button-bg text-luxury-gold font-serif text-[11px] font-extrabold tracking-widest uppercase border border-luxury-gold hover:border-luxury-gold-light rounded-[12px] transition shadow-gold-glow flex items-center justify-center cursor-pointer"
        >
          ÉTUDIER
        </button>

        {/* User icon */}
        <button
          onClick={onProfilePress}
          className="w-8 h-8 rounded-full bg-luxury-surface hover:bg-luxury-button-bg text-luxury-text-muted hover:text-luxury-gold flex items-center justify-center transition border border-luxury-border/60 cursor-pointer"
          title="Mon Espace"
        >
          <User className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
