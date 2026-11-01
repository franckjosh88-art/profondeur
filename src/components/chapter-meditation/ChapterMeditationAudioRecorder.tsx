import React from 'react';
import { 
  Mic, Play, Pause, Square, X, RotateCcw, Trash2, Volume2, 
  AlertTriangle, Loader2, Check 
} from 'lucide-react';
import { motion } from 'motion/react';

interface ChapterMeditationAudioRecorderProps {
  recordingState: 'idle' | 'recording' | 'paused' | 'stopped';
  recordDuration: number;
  micError: string | null;
  audioTitle: string;
  setAudioTitle: (val: string) => void;
  audioSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  audioSaveError: string | null;
  recordedUrl: string | null;
  isPreviewPlaying: boolean;
  previewTime: number;
  bookName: string;
  chapter: number;
  onStartRecording: () => void;
  onPauseResumeRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onTogglePreviewPlay: () => void;
  onPreviewSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetPreview: () => void;
  onSaveAudio: () => void;
  formatTimer: (seconds: number) => string;
}

export const ChapterMeditationAudioRecorder: React.FC<ChapterMeditationAudioRecorderProps> = ({
  recordingState,
  recordDuration,
  micError,
  audioTitle,
  setAudioTitle,
  audioSaveStatus,
  audioSaveError,
  recordedUrl,
  isPreviewPlaying,
  previewTime,
  bookName,
  chapter,
  onStartRecording,
  onPauseResumeRecording,
  onStopRecording,
  onCancelRecording,
  onTogglePreviewPlay,
  onPreviewSeek,
  onResetPreview,
  onSaveAudio,
  formatTimer
}) => {
  return (
    <div className="border-t border-[#2e2a1e]/60 pt-3 space-y-3">
      {/* Message d'erreur micro si refusé */}
      {micError && (
        <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl space-y-1 text-xs text-red-300">
          <div className="flex items-center gap-1.5 font-bold text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Autorisation du micro requise</span>
          </div>
          <p className="leading-relaxed font-sans text-xs">
            {micError}
          </p>
        </div>
      )}

      {/* État 1: Bouton de lancement de l'enregistrement quand idle */}
      {recordingState === 'idle' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onStartRecording}
            className="px-4 py-2.5 bg-[#14120e] hover:bg-[#1f1a13] text-[#c9a84c] hover:text-[#ebd092] border border-[#c9a84c]/40 hover:border-[#c9a84c] rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-soft group w-fit min-h-[44px]"
          >
            <Mic className="w-4 h-4 text-[#c9a84c] group-hover:scale-110 transition-transform" />
            <span>Enregistrer un audio</span>
          </button>

          <span className="text-xs font-mono text-[#8c8270]">
            Max. 10 min · Réflexion vocale
          </span>
        </div>
      )}

      {/* État 2: Enregistrement en cours ou en pause */}
      {(recordingState === 'recording' || recordingState === 'paused') && (
        <div className="bg-[#12100c] border border-[#c9a84c]/50 rounded-xl p-3.5 space-y-3 shadow-[0_0_20px_rgba(201,168,76,0.12)] animate-fade-in">
          {/* Ligne haute : Point rouge, Timer, Ondes & Statut */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center">
                <span className={`w-3 h-3 rounded-full ${recordingState === 'recording' ? 'bg-red-500 animate-ping' : 'bg-amber-500'} absolute`} />
                <span className={`w-3 h-3 rounded-full ${recordingState === 'recording' ? 'bg-red-500' : 'bg-amber-500'} relative`} />
              </div>
              <div>
                <span className="font-mono text-base font-bold text-[#f4efe2]">
                  {formatTimer(recordDuration)}
                </span>
                <span className="text-xs font-mono text-[#8c8270] block uppercase tracking-wider">
                  {recordingState === 'recording' ? 'Enregistrement en direct' : 'En pause'}
                </span>
              </div>
            </div>

            {/* Animation d'ondes */}
            <div className="flex items-center gap-1 h-6 px-2 bg-[#060503] rounded-lg border border-[#2e2a1e]">
              {[8, 16, 22, 14, 20, 10, 18, 12].map((h, i) => (
                <motion.span
                  key={i}
                  className={`w-1 rounded-full ${recordingState === 'recording' ? 'bg-[#c9a84c]' : 'bg-[#6b6355]'}`}
                  animate={{
                    height: recordingState === 'recording' 
                      ? [`${h * 0.4}px`, `${h}px`, `${h * 0.4}px`] 
                      : `${h * 0.3}px`
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.5 + (i % 3) * 0.2,
                    ease: 'easeInOut'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Avertissement à 9 minutes (540s) */}
          {recordDuration >= 540 && recordDuration < 600 && (
            <div className="flex items-center gap-1.5 p-2 bg-amber-950/40 border border-amber-500/40 rounded-lg text-amber-300 text-xs font-sans">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>Attention : limite de 10 minutes bientôt atteinte (il reste {600 - recordDuration} s).</span>
            </div>
          )}

          {/* Boutons d'action : Pause/Reprendre, Arrêter, Annuler */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-[#2e2a1e]/60">
            <button
              type="button"
              onClick={onCancelRecording}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider text-[#8c8270] hover:text-[#f4efe2] bg-[#1a1712] border border-[#2e2a1e] transition cursor-pointer flex items-center gap-1.5 min-h-[44px]"
            >
              <X className="w-3 h-3" />
              <span>Annuler</span>
            </button>

            <button
              type="button"
              onClick={onPauseResumeRecording}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider text-[#c9a84c] hover:text-[#ebd092] bg-[#1a1712] border border-[#c9a84c]/30 transition cursor-pointer flex items-center gap-1.5 min-h-[44px]"
            >
              {recordingState === 'recording' ? (
                <>
                  <Pause className="w-3 h-3" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>Reprendre</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onStopRecording}
              className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider text-[#0d0b07] bg-[#c9a84c] hover:bg-[#ebd092] shadow-gold-glow transition cursor-pointer flex items-center gap-1.5 min-h-[44px]"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Arrêter</span>
            </button>
          </div>
        </div>
      )}

      {/* État 3: Audio arrêté et prêt pour réécoute & sauvegarde */}
      {recordingState === 'stopped' && recordedUrl && (
        <div className="bg-[#12100c] border border-[#c9a84c]/50 rounded-xl p-3.5 space-y-3 shadow-gold-glow animate-fade-in">
          {/* Header du lecteur */}
          <div className="flex items-center justify-between text-xs font-mono text-[#c9a84c] border-b border-[#2e2a1e]/60 pb-2">
            <span className="flex items-center gap-1.5 font-bold">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Audio prêt · Réécoute</span>
            </span>
            <span className="text-[#8c8270]">
              Durée : {formatTimer(recordDuration)}
            </span>
          </div>

          {/* Lecteur audio de prévisualisation */}
          <div className="flex items-center gap-3 bg-[#060503] p-2.5 rounded-xl border border-[#2e2a1e]">
            <button
              type="button"
              onClick={onTogglePreviewPlay}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 min-h-[36px] min-w-[36px] ${
                isPreviewPlaying 
                  ? 'bg-[#c9a84c] text-[#0d0b07]' 
                  : 'bg-[#1a1712] text-[#c9a84c] border border-[#c9a84c]/40 hover:bg-[#252017]'
              }`}
              title={isPreviewPlaying ? "Pause" : "Lecture"}
            >
              {isPreviewPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            <div className="flex-1 space-y-1">
              <input
                type="range"
                min={0}
                max={recordDuration || 1}
                step={0.1}
                value={previewTime}
                onChange={onPreviewSeek}
                className="w-full accent-[#c9a84c] h-1.5 bg-[#1a1712] rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between text-xs font-mono text-[#8c8270]">
                <span>{formatTimer(Math.floor(previewTime))}</span>
                <span>{formatTimer(recordDuration)}</span>
              </div>
            </div>
          </div>

          {/* Champ Titre optionnel avec placeholder par défaut */}
          <div className="space-y-1">
            <label className="text-xs font-mono uppercase text-[#8c8270] tracking-wider block">
              Titre de l'audio (optionnel)
            </label>
            <input
              type="text"
              value={audioTitle}
              onChange={(e) => setAudioTitle(e.target.value)}
              placeholder={`${bookName} ${chapter} – ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}`}
              className="w-full bg-[#060503] border border-[#2e2a1e] focus:border-[#c9a84c]/70 rounded-xl px-3 py-2 text-xs text-[#f4efe2] placeholder-[#6b6355] outline-none font-serif transition"
            />
          </div>

          {audioSaveError && (
            <p className="text-xs font-sans text-red-400 bg-red-950/30 border border-red-500/20 p-2 rounded-lg">
              {audioSaveError}
            </p>
          )}

          {/* Boutons d'action : Refaire, Supprimer, Enregistrer l'audio */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#2e2a1e]/60">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onStartRecording}
                disabled={audioSaveStatus === 'saving'}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider text-[#8c8270] hover:text-[#f4efe2] bg-[#1a1712] border border-[#2e2a1e] transition cursor-pointer flex items-center gap-1.5 min-h-[44px]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Refaire</span>
              </button>

              <button
                type="button"
                onClick={onResetPreview}
                disabled={audioSaveStatus === 'saving'}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider text-red-400/80 hover:text-red-400 bg-[#1a1712] border border-red-500/20 transition cursor-pointer flex items-center gap-1.5 min-h-[44px]"
              >
                <Trash2 className="w-3 h-3" />
                <span>Supprimer</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onSaveAudio}
              disabled={audioSaveStatus === 'saving'}
              className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm min-h-[44px] ${
                audioSaveStatus === 'saved'
                  ? 'bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                  : 'bg-[#c9a84c] hover:bg-[#ebd092] text-[#0d0b07] font-black hover:scale-[1.02] active:scale-98 shadow-[0_0_12px_rgba(201,168,76,0.2)]'
              }`}
            >
              {audioSaveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : audioSaveStatus === 'saved' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span>Enregistré ✓</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Enregistrer l'audio</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
