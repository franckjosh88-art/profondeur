import React from 'react';
import { 
  BookOpen, List, Sun, Calendar, Bookmark, Highlighter, 
  FileText, Settings, X, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import prayerBgBible from '../assets/images/prayer_bg_bible_1790148055006.jpg';

export type DrawerPageKey = 
  | 'read' 
  | 'toc' 
  | 'daily_verse' 
  | 'daily_reading' 
  | 'bookmarks' 
  | 'highlights' 
  | 'notes' 
  | 'settings';

interface BibleDrawerProps {
  isOpen: boolean;
  activePage: DrawerPageKey;
  onClose: () => void;
  onSelectPage: (page: DrawerPageKey) => void;
}

export const BibleDrawer: React.FC<BibleDrawerProps> = ({
  isOpen,
  activePage,
  onClose,
  onSelectPage
}) => {
  const menuItems = [
    { key: 'read' as DrawerPageKey, label: 'Lire', icon: BookOpen, sublabel: 'Reprendre la lecture' },
    { key: 'toc' as DrawerPageKey, label: 'Table des matières', icon: List, sublabel: 'Livre, chapitre et verset' },
    { key: 'daily_verse' as DrawerPageKey, label: 'Verset du jour', icon: Sun, sublabel: 'Inspiration quotidienne' },
    { key: 'daily_reading' as DrawerPageKey, label: 'Lecture du jour', icon: Calendar, sublabel: 'Plan d\'étude biblique' },
    { key: 'bookmarks' as DrawerPageKey, label: 'Signets', icon: Bookmark, sublabel: 'Passages enregistrés' },
    { key: 'highlights' as DrawerPageKey, label: 'Surlignages', icon: Highlighter, sublabel: 'Versets marqués' },
    { key: 'notes' as DrawerPageKey, label: 'Notes', icon: FileText, sublabel: 'Journal & réflexions' },
    { key: 'settings' as DrawerPageKey, label: 'Paramètres', icon: Settings, sublabel: 'Taille, police et audio' },
  ];

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
            className="absolute inset-0 bg-black/75 backdrop-blur-xs"
          />

          {/* Panneau glissant depuis la gauche en style doré et noir (environ 60% de largeur) */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.3, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -30 || info.velocity.x < -200) {
                onClose();
              }
            }}
            className="absolute top-0 bottom-0 left-0 w-[60%] min-w-[250px] max-w-[340px] shadow-[0_0_35px_rgba(0,0,0,0.9),0_0_15px_rgba(201,168,76,0.15)] flex flex-col z-10 overflow-hidden border-r border-[#2e2a1e] bg-[#0c0a07] text-[#e8e0d0] touch-pan-y"
          >
            {/* EN-TÊTE : Image spirituelle d'un vieux livre ouvert avec lueur dorée */}
            <div className="relative h-38 w-full overflow-hidden shrink-0 bg-[#050403]">
              <img
                src={prayerBgBible}
                alt="Bible ancienne et méditation"
                className="w-full h-full object-cover object-center filter brightness-[0.7] contrast-[1.1]"
              />
              {/* Voile dégradé noir et or */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a07] via-[#0c0a07]/60 to-black/40" />

              {/* Bouton fermer en haut à droite */}
              <div className="absolute top-3 right-3">
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full bg-[#050403]/70 hover:bg-[#1a1712] text-[#8c8270] hover:text-[#c9a84c] border border-[#2e2a1e] transition cursor-pointer"
                  title="Fermer le menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Titre sacré en doré */}
              <div className="absolute bottom-3 left-4 right-4 text-left">
                <span className="text-[9px] font-mono tracking-[0.25em] text-[#c9a84c] uppercase font-black block drop-shadow">
                  SAINTE BIBLE
                </span>
                <h2 className="font-serif font-black text-sm sm:text-base text-[#f4efe2] tracking-wide drop-shadow-md">
                  Louis Segond 1910
                </h2>
                <span className="text-[10px] font-mono text-[#8c8270] block mt-0.5">
                  100% Hors-Ligne & Sanctuaire
                </span>
              </div>
            </div>

            {/* LISTE DES 8 ENTRÉES : Touch targets >= 48px, icône dorée fine, séparateur fin */}
            <nav className="flex-1 overflow-y-auto py-2 scroller-thin">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = activePage === item.key;

                return (
                  <React.Fragment key={item.key}>
                    <button
                      onClick={() => {
                        onSelectPage(item.key);
                        onClose();
                      }}
                      className={`w-full min-h-[50px] px-4 flex items-center justify-between text-left transition cursor-pointer select-none group ${
                        isActive 
                          ? 'bg-[#c9a84c]/15 text-[#ebd092] font-bold border-l-4 border-[#c9a84c]' 
                          : 'hover:bg-[#16130e] text-[#e8e0d0]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 py-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                          isActive 
                            ? 'text-[#c9a84c]' 
                            : 'text-[#c9a84c]/80 group-hover:text-[#c9a84c] group-hover:scale-105'
                        }`}>
                          <Icon className="w-4.5 h-4.5 stroke-[1.8]" />
                        </div>
                        <div>
                          <span className="text-xs sm:text-sm font-sans block leading-tight font-medium text-[#f4efe2]">
                            {item.label}
                          </span>
                          <span className={`text-[9.5px] font-mono block leading-none mt-0.5 ${
                            isActive ? 'text-[#c9a84c]' : 'text-[#8c8270]'
                          }`}>
                            {item.sublabel}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className={`w-4 h-4 transition opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 ${
                        isActive ? 'opacity-90 text-[#c9a84c]' : 'text-[#8c8270]'
                      }`} />
                    </button>

                    {/* Séparateur fin entre chaque ligne */}
                    {index < menuItems.length - 1 && (
                      <div className="h-[1px] mx-4 bg-[#2e2a1e]/60" />
                    )}
                  </React.Fragment>
                );
              })}
            </nav>

            {/* PIED DE TIROIR */}
            <div className="p-3 border-t border-[#2e2a1e] text-center text-[9.5px] font-mono text-[#8c8270]">
              <span>Bible Profonde • Louis Segond 1910</span>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
