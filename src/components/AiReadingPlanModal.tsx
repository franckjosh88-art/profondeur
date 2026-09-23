import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Check, 
  Flame, 
  Compass, 
  Heart, 
  Shield, 
  Feather, 
  Sun, 
  BookOpen, 
  AlertCircle, 
  Loader2,
  Calendar,
  Layers
} from 'lucide-react';
import { ReadingPlan } from '../types/challenges';

interface AiReadingPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanCreated: (newPlan: ReadingPlan) => void;
}

interface CuratedTheme {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
}

const CURATED_THEMES: CuratedTheme[] = [
  { id: 'paix', name: 'Paix intérieure', icon: '🕊️', subtitle: 'Apaiser les craintes, trouver le repos divin' },
  { id: 'courage', name: 'Courage & Force', icon: '🛡️', subtitle: 'Surmonter les épreuves et l\'adversité' },
  { id: 'pardon', name: 'Amour & Pardon', icon: '💖', subtitle: 'Guérir les cœurs, aimer comme le Christ' },
  { id: 'priere', name: 'Prière & Intimité', icon: '🙏', subtitle: 'Développer une écoute fervente de Dieu' },
  { id: 'esperance', name: 'Espérance & Renouveau', icon: '🌅', subtitle: 'Regarder vers l\'avenir avec confiance' },
  { id: 'sagesse', name: 'Sagesse & Décisions', icon: '🦉', subtitle: 'Discerner la volonté de Dieu au quotidien' },
  { id: 'guerison', name: 'Guérison de l\'Âme', icon: '🌿', subtitle: 'Consolation divine dans les temps de deuil et blessure' },
  { id: 'combat', name: 'Victoire Spirituelle', icon: '⚔️', subtitle: 'Revêtir l\'armure de Dieu contre les doutes' },
  { id: 'grace', name: 'La Grâce en Christ', icon: '✝️', subtitle: 'Comprendre le salut et la nouvelle alliance' },
  { id: 'gratitude', name: 'Gratitude & Louange', icon: '☀️', subtitle: 'Cultiver un esprit de reconnaissance constante' },
];

export const AiReadingPlanModal: React.FC<AiReadingPlanModalProps> = ({
  isOpen,
  onClose,
  onPlanCreated
}) => {
  const [selectedTheme, setSelectedTheme] = useState<string>('Paix intérieure');
  const [customTheme, setCustomTheme] = useState<string>('');
  const [userContext, setUserContext] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeTheme = customTheme.trim() ? customTheme.trim() : selectedTheme;

  const handleSelectCurated = (themeName: string) => {
    setSelectedTheme(themeName);
    setCustomTheme('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTheme) {
      setError("Veuillez sélectionner ou indiquer un thème spirituel.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/generate-reading-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme: activeTheme,
          userContext: userContext.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue lors de la génération avec l'IA.");
      }

      if (!data || !data.days || data.days.length === 0) {
        throw new Error("Le plan généré est incomplet. Veuillez réessayer.");
      }

      onPlanCreated(data as ReadingPlan);
      onClose();
    } catch (err: any) {
      console.error("AI plan generation error:", err);
      setError(err.message || "Impossible de contacter l'assistant d'étude biblique.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-[#050403]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-[#12100c] border border-[#c9a84c]/35 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-slide-up text-left my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2e2a1e] bg-gradient-to-r from-[#181510] via-[#14120e] to-[#181510] flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c9a84c]/15 border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c] shadow-soft">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-extrabold text-sm sm:text-base text-[#e8e0d0] tracking-wide">
                  Plan de Lecture IA sur 30 Jours
                </h3>
                <span className="text-[9px] font-mono font-bold bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/35 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  Gemini
                </span>
              </div>
              <p className="text-[11px] text-[#8c8270] mt-0.5 font-sans">
                Parcours biblique personnalisé selon votre cœur et vos besoins spirituels
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-[#6b6355] hover:text-[#e8e0d0] p-1.5 rounded-lg hover:bg-[#2e2a1e]/50 transition cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[78vh] overflow-y-auto no-scrollbar">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold font-serif">Échec de la génération</p>
                <p className="text-[11px] text-rose-200/90 leading-relaxed font-sans">{error}</p>
              </div>
            </div>
          )}

          {/* Theme selector section */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-[#a89d8b] uppercase tracking-wider font-extrabold flex items-center justify-between">
              <span>1. Choisissez un centre d'intérêt spirituel</span>
              <span className="text-[#c9a84c] text-[9px] font-mono font-normal">30 Jours de méditations</span>
            </label>

            {/* Quick Chips Grid */}
            <div className="grid grid-cols-2 gap-2 text-left">
              {CURATED_THEMES.map((theme) => {
                const isSelected = !customTheme && selectedTheme === theme.name;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectCurated(theme.name)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 cursor-pointer select-none ${
                      isSelected
                        ? 'bg-[#c9a84c]/15 border-[#c9a84c] text-[#f4efe2] shadow-[0_0_12px_rgba(201,168,76,0.2)]'
                        : 'bg-[#14120e] border-[#2e2a1e] text-[#a89d8b] hover:border-[#c9a84c]/40 hover:text-[#e8e0d0]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base">{theme.icon}</span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[#c9a84c] text-[#0d0b07] flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-serif font-bold text-xs leading-snug">{theme.name}</p>
                      <p className="text-[9px] text-[#6b6355] line-clamp-1 mt-0.5">{theme.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Theme Input */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] font-mono text-[#a89d8b] uppercase tracking-wider font-extrabold block">
              Ou saisissez un thème ou défi personnel
            </label>
            <input 
              type="text"
              value={customTheme}
              onChange={(e) => {
                setCustomTheme(e.target.value);
                setError(null);
              }}
              placeholder="Ex: Confiance au travail, Surmonter l'anxiété, Deuil, Nouvelle paternité..."
              className="w-full bg-[#0d0b07] text-[#e8e0d0] text-xs rounded-xl border border-[#2e2a1e] focus:border-[#c9a84c] focus:outline-none p-2.5 font-sans placeholder:text-[#6b6355]/50 transition"
            />
          </div>

          {/* User Context & Personal Intentions */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-[#a89d8b] uppercase tracking-wider font-extrabold flex items-center justify-between">
              <span>2. Intention ou situation personnelle (facultatif)</span>
              <span className="text-[#6b6355] text-[9px]">Optionnel</span>
            </label>
            <textarea 
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              placeholder="Ex: Je traverse une période de changement professionnel et j'ai besoin de clarté et de sérénité chaque matin..."
              rows={2}
              className="w-full bg-[#0d0b07] text-[#e8e0d0] text-xs rounded-xl border border-[#2e2a1e] focus:border-[#c9a84c] focus:outline-none p-2.5 font-sans placeholder:text-[#6b6355]/50 resize-none transition"
            />
          </div>

          {/* Feature details banner */}
          <div className="bg-[#181510] border border-[#2e2a1e]/80 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-[#8c8270]">
            <Calendar className="w-4 h-4 text-[#c9a84c] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-[#e8e0d0] font-serif block">Ce que Gemini prépare pour vous :</strong>
              Une progression théologique complète sur 30 jours, un verset phare par jour, une citation Louis Segond et une question de méditation pastorale.
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 border-t border-[#2e2a1e] flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 px-3 bg-[#181510] hover:bg-[#221e17] border border-[#2e2a1e] text-[#8c8270] hover:text-[#e8e0d0] text-xs font-serif font-bold rounded-xl transition cursor-pointer disabled:opacity-40"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading || !activeTheme}
              className="flex-[2] py-2.5 px-4 bg-gradient-to-r from-[#b59238] to-[#c9a84c] hover:from-[#c9a84c] hover:to-[#dec16a] text-[#0d0b07] font-serif font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-gold-glow flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0d0b07]" />
                  <span>Harmonisation des Écritures...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#0d0b07]" />
                  <span>Générer mon Plan 30 Jours ✨</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
