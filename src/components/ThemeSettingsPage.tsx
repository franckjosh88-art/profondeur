import React from 'react';
import { 
  ArrowLeft, Sun, Moon, Sunrise, Type, Palette
} from 'lucide-react';
import { 
  ThemeSettings, 
  DAY_COLORS, 
  NIGHT_COLORS, 
  DayColor, 
  NightColor, 
  ThemeMode,
  ReaderFont
} from '../lib/theme';
import { ReaderColorThemeCard } from './ReaderColorThemeCard';

interface ThemeSettingsPageProps {
  settings: ThemeSettings;
  onUpdateSettings: (newSettings: ThemeSettings) => void;
  onBack: () => void;
}

export const ThemeSettingsPage: React.FC<ThemeSettingsPageProps> = ({
  settings,
  onUpdateSettings,
  onBack
}) => {
  const handleModeChange = (mode: ThemeMode) => {
    onUpdateSettings({ ...settings, mode });
  };

  const handleDayColorChange = (dayColor: DayColor) => {
    onUpdateSettings({ ...settings, dayColor });
  };

  const handleNightColorChange = (nightColor: NightColor) => {
    onUpdateSettings({ ...settings, nightColor });
  };

  const handleFontChange = (fontFamily: ReaderFont) => {
    onUpdateSettings({ ...settings, fontFamily });
  };

  const handleSizeChange = (textSize: number) => {
    onUpdateSettings({ ...settings, textSize });
  };

  const handleLineHeightChange = (lineHeight: number) => {
    onUpdateSettings({ ...settings, lineHeight });
  };

  const currentModeLabel = 
    settings.mode === 'auto' ? 'Auto' : 
    settings.mode === 'light' ? 'Clair' : 'Sombre';

  const currentDayLabel = DAY_COLORS[settings.dayColor]?.name || 'Blanc';
  const currentNightLabel = NIGHT_COLORS[settings.nightColor]?.name || 'Noir';

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4 space-y-6 text-left select-none animate-fade-in">
      {/* En-tête avec flèche retour */}
      <div className="flex items-center gap-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl text-app opacity-80 hover:opacity-100 hover:bg-surface transition cursor-pointer active:scale-95"
          title="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-xl sm:text-2xl font-bold text-app">
          Thème
        </h1>
      </div>

      {/* 1. CARTE MODE */}
      <div className="rounded-2xl bg-surface border border-app p-4 sm:p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center gap-2 text-muted text-xs font-mono uppercase tracking-widest">
          <Sun className="w-3.5 h-3.5" />
          <span>MODE</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="font-sans text-sm sm:text-base font-medium text-app">
            {currentModeLabel}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleModeChange('light')}
              className={`p-2 rounded-xl transition cursor-pointer ${
                settings.mode === 'light'
                  ? 'bg-app text-accent border border-app shadow-sm'
                  : 'text-muted hover:text-app hover:bg-surface-hover'
              }`}
              title="Mode Clair"
            >
              <Sun className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('dark')}
              className={`p-2 rounded-xl transition cursor-pointer ${
                settings.mode === 'dark'
                  ? 'bg-app text-accent border border-app shadow-sm'
                  : 'text-muted hover:text-app hover:bg-surface-hover'
              }`}
              title="Mode Sombre"
            >
              <Moon className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('auto')}
              className={`p-2 rounded-xl transition cursor-pointer ${
                settings.mode === 'auto'
                  ? 'bg-app text-accent border border-app shadow-sm'
                  : 'text-muted hover:text-app hover:bg-surface-hover'
              }`}
              title="Mode Auto (suit le système)"
            >
              <Sunrise className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. CARTE COULEUR JOUR */}
      <div className="rounded-2xl bg-surface border border-app p-4 sm:p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center gap-2 text-muted text-xs font-mono uppercase tracking-widest">
          <Sun className="w-3.5 h-3.5" />
          <span>COULEUR JOUR</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="font-sans text-sm sm:text-base font-medium text-app">
            {currentDayLabel}
          </span>

          <div className="flex items-center gap-3">
            {(Object.keys(DAY_COLORS) as DayColor[]).map((cKey) => {
              const preset = DAY_COLORS[cKey];
              const isSelected = settings.dayColor === cKey;

              return (
                <button
                  key={cKey}
                  type="button"
                  onClick={() => handleDayColorChange(cKey)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-black/20 transition-all cursor-pointer relative ${
                    isSelected ? 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--surface)] scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: preset.hex }}
                  title={preset.name}
                  aria-label={preset.name}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. CARTE COULEUR NUIT */}
      <div className="rounded-2xl bg-surface border border-app p-4 sm:p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center gap-2 text-muted text-xs font-mono uppercase tracking-widest">
          <Moon className="w-3.5 h-3.5" />
          <span>COULEUR NUIT</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="font-sans text-sm sm:text-base font-medium text-app">
            {currentNightLabel}
          </span>

          <div className="flex items-center gap-3">
            {(Object.keys(NIGHT_COLORS) as NightColor[]).map((cKey) => {
              const preset = NIGHT_COLORS[cKey];
              const isSelected = settings.nightColor === cKey;

              return (
                <button
                  key={cKey}
                  type="button"
                  onClick={() => handleNightColorChange(cKey)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/20 transition-all cursor-pointer relative ${
                    isSelected ? 'ring-2 ring-accent ring-offset-2 ring-offset-[var(--surface)] scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: preset.hex }}
                  title={preset.name}
                  aria-label={preset.name}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. CARTE COULEUR DU LECTEUR (7 Couleurs) */}
      <ReaderColorThemeCard />

      {/* 5. CARTE TYPOGRAPHIE & LECTEUR */}
      <div className="rounded-2xl bg-surface border border-app p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-muted text-xs font-mono uppercase tracking-widest">
          <Type className="w-3.5 h-3.5" />
          <span>TYPOGRAPHIE DU LECTEUR</span>
        </div>

        {/* Choix de police */}
        <div className="space-y-1.5 pt-1">
          <span className="text-xs text-muted block">Police de caractères</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleFontChange('serif')}
              className={`py-2 px-3 rounded-xl border text-sm transition cursor-pointer font-serif ${
                settings.fontFamily === 'serif'
                  ? 'border-accent bg-app text-accent font-bold'
                  : 'border-app text-muted hover:text-app'
              }`}
            >
              Serif classique
            </button>
            <button
              type="button"
              onClick={() => handleFontChange('sans')}
              className={`py-2 px-3 rounded-xl border text-sm transition cursor-pointer font-sans ${
                settings.fontFamily === 'sans'
                  ? 'border-accent bg-app text-accent font-bold'
                  : 'border-app text-muted hover:text-app'
              }`}
            >
              Sans-serif moderne
            </button>
          </div>
        </div>

        {/* Taille du texte */}
        <div className="space-y-1.5 pt-2 border-t border-app">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted">Taille du texte</span>
            <span className="font-mono text-accent font-bold">{settings.textSize} px</span>
          </div>
          <input
            type="range"
            min={14}
            max={28}
            step={1}
            value={settings.textSize}
            onChange={(e) => handleSizeChange(Number(e.target.value))}
            className="w-full accent-[var(--accent)] h-1.5 bg-app rounded-lg cursor-pointer"
          />
        </div>

        {/* Interligne */}
        <div className="space-y-1.5 pt-2 border-t border-app">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted">Interligne</span>
            <span className="font-mono text-accent font-bold">{settings.lineHeight.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={1.5}
            max={2.2}
            step={0.1}
            value={settings.lineHeight}
            onChange={(e) => handleLineHeightChange(Number(e.target.value))}
            className="w-full accent-[var(--accent)] h-1.5 bg-app rounded-lg cursor-pointer"
          />
        </div>

        {/* Aperçu en direct */}
        <div className="p-3.5 rounded-xl bg-app border border-app mt-2">
          <span className="text-[10px] text-muted uppercase font-mono tracking-widest block mb-1">Aperçu du verset</span>
          <p 
            className="text-app italic"
            style={{
              fontFamily: settings.fontFamily === 'serif' ? 'var(--font-reading)' : 'var(--font-sans)',
              fontSize: `${settings.textSize}px`,
              lineHeight: settings.lineHeight
            }}
          >
            <sup className="text-[11px] text-muted mr-1.5 not-italic">4</sup>
            Quand je marche dans la vallée de l'ombre de la mort, je ne crains aucun mal, car tu es avec moi.
          </p>
        </div>
      </div>
    </div>
  );
};
