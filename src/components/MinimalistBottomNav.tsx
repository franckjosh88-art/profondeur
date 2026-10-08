import React from 'react';
import { Home, Search, BookOpen, ScrollText, Menu } from 'lucide-react';

export type MainNavTab = 'home' | 'search' | 'read' | 'notes' | 'plus';

interface MinimalistBottomNavProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
}

export const MinimalistBottomNav: React.FC<MinimalistBottomNavProps> = ({
  activeTab,
  onSelectTab
}) => {
  const tabs = [
    { key: 'home' as MainNavTab, icon: Home, label: 'Accueil' },
    { key: 'search' as MainNavTab, icon: Search, label: 'Recherche' },
    { key: 'read' as MainNavTab, icon: BookOpen, label: 'Lecteur' },
    { key: 'notes' as MainNavTab, icon: ScrollText, label: 'Notes' },
    { key: 'plus' as MainNavTab, icon: Menu, label: 'Plus' },
  ];

  return (
    <nav 
      aria-label="Navigation principale"
      className="fixed bottom-0 inset-x-0 bg-surface/95 backdrop-blur-md border-t border-app py-2 px-4 flex justify-around items-center z-40 select-none transition-colors"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelectTab(tab.key)}
            className={`p-2 sm:px-4 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer relative ${
              isActive 
                ? 'text-accent font-bold scale-110' 
                : 'text-muted hover:text-app'
            }`}
            title={tab.label}
            aria-label={tab.label}
          >
            <Icon className="w-5 h-5 stroke-[1.8]" />
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-accent mt-1" />
            )}
          </button>
        );
      })}
    </nav>
  );
};
