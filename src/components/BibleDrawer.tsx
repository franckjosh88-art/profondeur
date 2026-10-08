import React from 'react';
import { 
  Home, BookOpen, Search, Library, MessageSquare, Flame, 
  Brain, ScrollText, Download, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type DrawerPageKey = 
  | 'home'
  | 'read' 
  | 'dictionary' 
  | 'encyclopedia' 
  | 'assistant' 
  | 'challenges' 
  | 'memorize' 
  | 'notes' 
  | 'offline'
  | 'toc' 
  | 'daily_verse' 
  | 'daily_reading' 
  | 'bookmarks' 
  | 'highlights' 
  | 'settings';

interface BibleDrawerProps {
  isOpen: boolean;
  activePage: string;
  onClose: () => void;
  onSelectPage: (page: DrawerPageKey) => void;
  userEmail?: string | null;
  onOpenAuth?: () => void;
}

export const SANCTUARY_NAV_ITEMS = [
  { key: 'home' as DrawerPageKey, label: 'Accueil', icon: Home },
  { key: 'read' as DrawerPageKey, label: 'Étude & lecture', icon: BookOpen },
  { key: 'dictionary' as DrawerPageKey, label: 'Concordance Strong', icon: Search },
  { key: 'encyclopedia' as DrawerPageKey, label: 'Dictionnaire IA', icon: Library },
  { key: 'assistant' as DrawerPageKey, label: 'Assistant biblique', icon: MessageSquare },
  { key: 'challenges' as DrawerPageKey, label: 'Défis & fidélité', icon: Flame },
  { key: 'memorize' as DrawerPageKey, label: 'Mémorisation', icon: Brain },
  { key: 'notes' as DrawerPageKey, label: 'Notes spirituelles', icon: ScrollText },
  { key: 'offline' as DrawerPageKey, label: 'Études hors-ligne', icon: Download },
];

export const BibleDrawer: React.FC<BibleDrawerProps> = ({
  isOpen,
  activePage,
  onClose,
  onSelectPage,
  userEmail,
  onOpenAuth
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none">
          {/* Backdrop avec flou sombre */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-xs"
          />

          {/* Panneau glissant depuis la gauche : Tiroir Sanctuaire */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="absolute top-0 bottom-0 left-0 w-[280px] sm:w-[320px] max-w-[85vw] shadow-[0_0_35px_rgba(0,0,0,0.9),0_0_20px_rgba(201,168,76,0.15)] flex flex-col z-10 overflow-hidden border-r border-[#2e2a1e] bg-[#0c0a07] text-[#e8e0d0]"
          >
            {/* EN-TÊTE : Titre "SANCTUAIRE" et bouton fermer "✕" */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-[#2e2a1e]/80 shrink-0 bg-[#050403]/90">
              <span className="font-serif font-black text-xs uppercase tracking-[0.24em] text-[#c9a84c]">
                SANCTUAIRE
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-[#8c8270] hover:text-[#c9a84c] hover:bg-[#1a1712] border border-[#2e2a1e]/40 transition cursor-pointer"
                title="Fermer le menu"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* LISTE DES 9 ENTRÉES DU SANCTUAIRE */}
            <nav className="flex-1 overflow-y-auto p-3.5 space-y-2 scroller-thin">
              {SANCTUARY_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      onSelectPage(item.key);
                      onClose();
                    }}
                    className={`w-full min-h-[46px] px-4 py-2.5 rounded-xl border flex items-center gap-3 transition cursor-pointer font-serif text-xs uppercase tracking-wider text-left ${
                      isActive 
                        ? 'bg-[#c9a84c]/15 text-[#c9a84c] border-[#c9a84c] font-bold shadow-[0_0_12px_rgba(201,168,76,0.18)]' 
                        : 'bg-[#12100c]/60 text-[#8c8270] hover:text-[#f4efe2] hover:bg-[#1a1712] border-[#2e2a1e]/60 hover:border-[#c9a84c]/40'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#c9a84c]' : 'text-[#8c8270]'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* PIED DE TIROIR */}
            <div className="p-3.5 border-t border-[#2e2a1e]/80 flex items-center justify-between text-[9px] font-mono text-[#6b6355] bg-[#050403]/90">
              <span>Bible Profonde · Mode Sacré</span>
              {userEmail ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenAuth) onOpenAuth();
                  }}
                  className="text-[#c9a84c] hover:underline cursor-pointer truncate max-w-[120px]"
                  title={userEmail}
                >
                  {userEmail.split('@')[0]}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenAuth) onOpenAuth();
                  }}
                  className="text-[#c9a84c] hover:underline cursor-pointer font-bold uppercase tracking-wider"
                >
                  Se connecter
                </button>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
