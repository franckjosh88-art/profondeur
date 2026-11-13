import React, { useEffect } from 'react';
import { 
  Home, BookOpen, Search, Library, MessageSquare, Flame, 
  Brain, ScrollText, Download, Settings, X, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../i18n/LanguageContext';

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

export const BibleDrawer: React.FC<BibleDrawerProps> = ({
  isOpen,
  activePage,
  onClose,
  onSelectPage,
  userEmail,
  onOpenAuth
}) => {
  const { language, setLanguage, t } = useLanguage();

  const navItems = [
    { key: 'read' as DrawerPageKey, label: t('nav.study'), icon: BookOpen },
    { key: 'dictionary' as DrawerPageKey, label: t('nav.concordance'), icon: Search },
    { key: 'encyclopedia' as DrawerPageKey, label: t('nav.dictionary'), icon: Library },
    { key: 'assistant' as DrawerPageKey, label: t('nav.assistant'), icon: MessageSquare },
    { key: 'challenges' as DrawerPageKey, label: t('nav.challenges'), icon: Flame },
    { key: 'memorize' as DrawerPageKey, label: t('nav.memorize'), icon: Brain },
    { key: 'notes' as DrawerPageKey, label: t('nav.notes'), icon: ScrollText },
    { key: 'offline' as DrawerPageKey, label: t('nav.offlineStudies'), icon: Download },
  ];

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden select-none"
          role="dialog"
          aria-modal="true"
          aria-label={t('home.openMenu')}
        >
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
            className="absolute top-0 bottom-0 left-0 w-[290px] sm:w-[320px] max-w-[85vw] shadow-[0_0_35px_rgba(0,0,0,0.9),0_0_20px_rgba(201,168,76,0.15)] flex flex-col z-10 overflow-hidden border-r border-[#2e2a1e] bg-[#0c0a07] text-[#e8e0d0]"
          >
            {/* EN-TÊTE : Titre "BIBLE PROFONDE" et bouton fermer "✕" */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-[#2e2a1e]/80 shrink-0 bg-[#050403]/90">
              <button
                type="button"
                onClick={() => {
                  onSelectPage('home');
                  onClose();
                }}
                className="font-serif font-semibold text-xs uppercase tracking-[0.24em] text-[#c9a84c] hover:text-[#ebd092] transition-colors cursor-pointer text-left flex items-center gap-2"
                title={t('common.back')}
              >
                <span>BIBLE PROFONDE</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-[#8c8270] hover:text-[#c9a84c] hover:bg-[#1a1712] border border-[#2e2a1e]/40 transition cursor-pointer flex items-center justify-center"
                title={t('common.close')}
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* LISTE DES ENTRÉES DU TIROIR */}
            <nav className="flex-1 overflow-y-auto p-3.5 space-y-2 scroller-thin" aria-label="Sections de l'application">
              {activePage !== 'home' && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectPage('home');
                    onClose();
                  }}
                  className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border flex items-center gap-3 transition cursor-pointer font-serif text-xs tracking-wide text-left bg-[#12100c]/60 text-[#8c8270] hover:text-[#f4efe2] hover:bg-[#1a1712] border-[#2e2a1e]/60 hover:border-[#c9a84c]/40"
                >
                  <Home className="w-4 h-4 shrink-0 text-[#c9a84c]" />
                  <span className="truncate">{t('nav.home')}</span>
                </button>
              )}

              {navItems.map((item) => {
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
                    className={`w-full min-h-[46px] px-4 py-2.5 rounded-xl border flex items-center gap-3 transition cursor-pointer font-serif text-sm tracking-wide text-left ${
                      isActive 
                        ? 'bg-[#c9a84c]/15 text-[#c9a84c] border-[#c9a84c] font-bold shadow-[0_0_12px_rgba(201,168,76,0.18)]' 
                        : 'bg-[#12100c]/60 text-[#bdb4a2] hover:text-[#f4efe2] hover:bg-[#1a1712] border-[#2e2a1e]/60 hover:border-[#c9a84c]/40'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#c9a84c]' : 'text-[#8c8270]'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* PIED DE TIROIR : Sélecteur rapide de langue + Réglages & Compte */}
            <div className="p-3.5 border-t border-[#2e2a1e]/80 flex flex-col gap-2.5 text-xs font-sans text-[#8c8270] bg-[#050403]/90">
              {/* Sélecteur de langue bilingue rapide */}
              <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-[#12100c] border border-[#2e2a1e]/80">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#a0947f]">
                  <Globe className="w-3.5 h-3.5 text-[#c9a84c]" />
                  <span>Langue:</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setLanguage('fr')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                      language === 'fr'
                        ? 'bg-[#c9a84c] text-[#0c0a07] shadow-xs'
                        : 'text-[#a0947f] hover:text-[#f4efe2] hover:bg-[#1f1b13]'
                    }`}
                    title="Passer en français"
                  >
                    <span>🇫🇷 FR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                      language === 'en'
                        ? 'bg-[#c9a84c] text-[#0c0a07] shadow-xs'
                        : 'text-[#a0947f] hover:text-[#f4efe2] hover:bg-[#1f1b13]'
                    }`}
                    title="Switch to English"
                  >
                    <span>🇬🇧 EN</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectPage('settings');
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl border border-[#2e2a1e]/60 hover:border-[#c9a84c]/40 hover:text-[#f4efe2] flex items-center gap-2 transition cursor-pointer"
                  aria-label={t('nav.settings')}
                >
                  <Settings className="w-4 h-4 text-[#c9a84c]" />
                  <span>{t('nav.settings')}</span>
                </button>

                {userEmail ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenAuth) onOpenAuth();
                    }}
                    className="px-3 py-2 rounded-xl text-[#c9a84c] hover:underline cursor-pointer truncate max-w-[140px]"
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
                    className="px-3 py-2 rounded-xl text-[#c9a84c] hover:underline cursor-pointer font-medium"
                  >
                    {t('nav.signIn')}
                  </button>
                )}
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
