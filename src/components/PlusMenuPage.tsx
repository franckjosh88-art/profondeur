import React from 'react';
import { 
  ChevronRight, ArrowLeft, User, Search, Library, MessageSquare, 
  ScrollText, Download, Flame, Brain, Clock, Award, 
  Calendar, BookOpen, Palette, Globe, RefreshCw, HelpCircle, 
  Mail, Sparkles, LogIn, LogOut
} from 'lucide-react';

export type PlusSubpage = 
  | null
  | 'login'
  | 'dictionary'
  | 'encyclopedia'
  | 'assistant'
  | 'notes'
  | 'offline_studies'
  | 'challenges'
  | 'memorize'
  | 'reading_time'
  | 'completed_chapters'
  | 'streak'
  | 'add_time'
  | 'recent'
  | 'reading_plans'
  | 'language'
  | 'theme'
  | 'default_bible'
  | 'downloads'
  | 'updates'
  | 'whats_new'
  | 'faq'
  | 'contact';

interface PlusMenuPageProps {
  user: any;
  onOpenSubpage: (subpage: PlusSubpage) => void;
  onSignOut?: () => void;
  onOpenLogin?: () => void;
  currentStreak?: number;
  readingTimeMinutes?: number;
  dailyGoalMinutes?: number;
}

export const PlusMenuPage: React.FC<PlusMenuPageProps> = ({
  user,
  onOpenSubpage,
  onSignOut,
  onOpenLogin,
  currentStreak = 0,
  readingTimeMinutes = 0,
  dailyGoalMinutes = 15
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4 space-y-6 text-left select-none animate-fade-in">
      {/* En-tête */}
      <div className="flex items-center gap-3 py-2">
        <h1 className="font-serif text-xl sm:text-2xl font-bold text-app">
          Plus
        </h1>
      </div>

      {/* SECTION COMPTE */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase text-muted tracking-widest px-1 font-bold">
          COMPTE
        </span>
        <div className="rounded-2xl bg-surface border border-app overflow-hidden shadow-sm">
          {user ? (
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <span className="font-medium text-sm text-app block">
                    {user.displayName || user.email?.split('@')[0] || 'Utilisateur'}
                  </span>
                  <span className="text-xs text-muted block truncate max-w-[200px]">
                    {user.email}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="px-3 py-1.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-sans transition cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Quitter</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="w-full p-4 flex items-center justify-between hover:bg-surface-hover transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                  <LogIn className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-app">
                  Se connecter
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted" />
            </button>
          )}
        </div>
      </div>

      {/* SECTION ÉTUDE */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase text-muted tracking-widest px-1 font-bold">
          ÉTUDE
        </span>
        <div className="rounded-2xl bg-surface border border-app divide-y divide-app overflow-hidden shadow-sm">
          <MenuItem 
            icon={Search} 
            iconBg="bg-blue-500/15 text-blue-400" 
            label="Concordance Strong (Lexique)" 
            onClick={() => onOpenSubpage('dictionary')} 
          />
          <MenuItem 
            icon={Library} 
            iconBg="bg-amber-500/15 text-amber-400" 
            label="Dictionnaire IA" 
            onClick={() => onOpenSubpage('encyclopedia')} 
          />
          <MenuItem 
            icon={MessageSquare} 
            iconBg="bg-purple-500/15 text-purple-400" 
            label="Assistant biblique" 
            onClick={() => onOpenSubpage('assistant')} 
          />
          <MenuItem 
            icon={ScrollText} 
            iconBg="bg-emerald-500/15 text-emerald-400" 
            label="Notes spirituelles & Journal" 
            onClick={() => onOpenSubpage('notes')} 
          />
          <MenuItem 
            icon={Download} 
            iconBg="bg-teal-500/15 text-teal-400" 
            label="Études hors-ligne" 
            onClick={() => onOpenSubpage('offline_studies')} 
          />
        </div>
      </div>

      {/* SECTION PROGRESSION */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase text-muted tracking-widest px-1 font-bold">
          PROGRESSION
        </span>
        <div className="rounded-2xl bg-surface border border-app divide-y divide-app overflow-hidden shadow-sm">
          <MenuItem 
            icon={Flame} 
            iconBg="bg-orange-500/15 text-orange-400" 
            label="Défis & fidélité" 
            badge={`${currentStreak} jours`}
            onClick={() => onOpenSubpage('challenges')} 
          />
          <MenuItem 
            icon={Brain} 
            iconBg="bg-pink-500/15 text-pink-400" 
            label="Mémorisation" 
            onClick={() => onOpenSubpage('memorize')} 
          />
          <MenuItem 
            icon={Clock} 
            iconBg="bg-cyan-500/15 text-cyan-400" 
            label="Temps de lecture et objectif du jour" 
            badge={`${readingTimeMinutes} / ${dailyGoalMinutes} min`}
            onClick={() => onOpenSubpage('reading_time')} 
          />
          <MenuItem 
            icon={Award} 
            iconBg="bg-yellow-500/15 text-yellow-400" 
            label="Chapitres validés & historique" 
            onClick={() => onOpenSubpage('completed_chapters')} 
          />
        </div>
      </div>

      {/* SECTION RESSOURCES */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase text-muted tracking-widest px-1 font-bold">
          RESSOURCES
        </span>
        <div className="rounded-2xl bg-surface border border-app divide-y divide-app overflow-hidden shadow-sm">
          <MenuItem 
            icon={Clock} 
            iconBg="bg-slate-500/15 text-slate-300" 
            label="Consultés récemment" 
            onClick={() => onOpenSubpage('recent')} 
          />
          <MenuItem 
            icon={Calendar} 
            iconBg="bg-indigo-500/15 text-indigo-400" 
            label="Plans de lecture biblique" 
            onClick={() => onOpenSubpage('reading_plans')} 
          />
        </div>
      </div>

      {/* SECTION PARAMÈTRES */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase text-muted tracking-widest px-1 font-bold">
          PARAMÈTRES
        </span>
        <div className="rounded-2xl bg-surface border border-app divide-y divide-app overflow-hidden shadow-sm">
          <MenuItem 
            icon={Palette} 
            iconBg="bg-amber-500/15 text-amber-400" 
            label="Thème & Typographie" 
            onClick={() => onOpenSubpage('theme')} 
          />
          <MenuItem 
            icon={Globe} 
            iconBg="bg-blue-500/15 text-blue-400" 
            label="Langue" 
            badge="Français"
            onClick={() => onOpenSubpage('language')} 
          />
          <MenuItem 
            icon={BookOpen} 
            iconBg="bg-emerald-500/15 text-emerald-400" 
            label="Bible par défaut" 
            badge="LSG 1910"
            onClick={() => onOpenSubpage('default_bible')} 
          />
          <MenuItem 
            icon={Download} 
            iconBg="bg-violet-500/15 text-violet-400" 
            label="Gestion des téléchargements (hors-ligne)" 
            onClick={() => onOpenSubpage('downloads')} 
          />
          <MenuItem 
            icon={RefreshCw} 
            iconBg="bg-zinc-500/15 text-zinc-300" 
            label="Mises à jour" 
            badge="v2.5"
            onClick={() => onOpenSubpage('updates')} 
          />
        </div>
      </div>

      {/* SECTION AIDE */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase text-muted tracking-widest px-1 font-bold">
          AIDE
        </span>
        <div className="rounded-2xl bg-surface border border-app divide-y divide-app overflow-hidden shadow-sm">
          <MenuItem 
            icon={Sparkles} 
            iconBg="bg-yellow-500/15 text-yellow-400" 
            label="Nouveautés" 
            onClick={() => onOpenSubpage('whats_new')} 
          />
          <MenuItem 
            icon={HelpCircle} 
            iconBg="bg-indigo-500/15 text-indigo-400" 
            label="Foire aux questions (FAQ)" 
            onClick={() => onOpenSubpage('faq')} 
          />
          <MenuItem 
            icon={Mail} 
            iconBg="bg-rose-500/15 text-rose-400" 
            label="Contacter le développeur" 
            onClick={() => onOpenSubpage('contact')} 
          />
        </div>
      </div>
    </div>
  );
};

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  label: string;
  badge?: string;
  onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon: Icon,
  iconBg,
  label,
  badge,
  onClick
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-surface-hover transition cursor-pointer text-left"
    >
      <div className="flex items-center gap-3.5">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <span className="text-sm font-medium text-app">
          {label}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {badge && (
          <span className="text-xs text-muted font-mono">
            {badge}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-muted" />
      </div>
    </button>
  );
};
