import React, { useState, useEffect, useRef } from 'react';
import { 
  Feather, Check, Loader2, Sparkles, Clock, AlertCircle, 
  Mic, Play, Pause, Square, X, RotateCcw, Trash2, Volume2, 
  AlertTriangle, Radio, Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChapterMeditation, ChapterAudioMeditation } from '../types/bible';
import { getSupportedAudioMimeType, getAudioPlayableUrl } from '../utils/audioStorage';

interface ChapterMeditationCardProps {
  bookId: number;
  bookName: string;
  chapter: number;
  savedMeditation?: ChapterMeditation | null;
  chapterAudios?: ChapterAudioMeditation[];
  onSaveMeditation: (bookId: number, bookName: string, chapter: number, text: string) => Promise<boolean>;
  onSaveAudioMeditation: (
    bookId: number,
    bookName: string,
    chapter: number,
    title: string,
    durationSeconds: number,
    audioBlob: Blob,
    mimeType: string,
    writtenMeditationId?: string
  ) => Promise<boolean>;
  onDeleteAudioMeditation?: (audioId: string) => Promise<void> | void;
}

export const ChapterMeditationCard: React.FC<ChapterMeditationCardProps> = ({
  bookId,
  bookName,
  chapter,
  savedMeditation,
  chapterAudios = [],
  onSaveMeditation,
  onSaveAudioMeditation,
  onDeleteAudioMeditation
}) => {
  const draftKey = `chapter_meditation_draft_${bookName}-${chapter}`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [justSavedText, setJustSavedText] = useState<string | null>(null);

  // Initialize text: draft if exists, otherwise savedMeditation text, otherwise empty
  const [text, setText] = useState<string>(() => {
    try {
      const draft = localStorage.getItem(draftKey);
      if (draft !== null && draft.trim().length > 0) return draft;
    } catch (_) {}
    return savedMeditation?.text || '';
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- AUDIO RECORDER STATE ---
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [audioTitle, setAudioTitle] = useState<string>('');
  const [audioSaveStatus, setAudioSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [audioSaveError, setAudioSaveError] = useState<string | null>(null);

  // Recorder references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Preview audio state
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState<string>('audio/webm');
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [previewTime, setPreviewTime] = useState<number>(0);

  // Mini-player state for already saved chapter audios
  const [activeChapterAudioId, setActiveChapterAudioId] = useState<string | null>(null);
  const [isChapterAudioPlaying, setIsChapterAudioPlaying] = useState<boolean>(false);
  const chapterAudioRef = useRef<HTMLAudioElement | null>(null);

  // When book or chapter changes, update local state
  useEffect(() => {
    try {
      const draft = localStorage.getItem(draftKey);
      if (draft !== null && draft.trim().length > 0) {
        setText(draft);
      } else {
        setText(savedMeditation?.text || '');
      }
    } catch (_) {
      setText(savedMeditation?.text || '');
    }
    setJustSavedText(null);
    setSaveStatus('idle');
    setErrorMessage(null);

    // Cancel any active recording on chapter change
    cleanupRecording();
    resetPreview();
    setMicError(null);
    setAudioSaveStatus('idle');
    setAudioSaveError(null);

    if (chapterAudioRef.current) {
      chapterAudioRef.current.pause();
      chapterAudioRef.current = null;
    }
    setActiveChapterAudioId(null);
    setIsChapterAudioPlaying(false);
  }, [bookId, chapter, bookName, savedMeditation?.text, draftKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
      resetPreview();
      if (chapterAudioRef.current) {
        chapterAudioRef.current.pause();
        chapterAudioRef.current = null;
      }
    };
  }, []);

  const cleanupRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  };

  const resetPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (recordedUrl) {
      try {
        URL.revokeObjectURL(recordedUrl);
      } catch (_) {}
    }
    setRecordedBlob(null);
    setRecordedUrl(null);
    setIsPreviewPlaying(false);
    setPreviewTime(0);
    setRecordDuration(0);
    setAudioTitle('');
    setRecordingState('idle');
  };

  // Handle text change & autosave draft
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, 500);
    setText(val);
    if (saveStatus === 'saved' || saveStatus === 'error') {
      setSaveStatus('idle');
      setErrorMessage(null);
    }
    try {
      if (val.trim()) {
        localStorage.setItem(draftKey, val);
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch (_) {}
  };

  const handleSaveWritten = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setSaveStatus('saving');
    setErrorMessage(null);

    try {
      const success = await onSaveMeditation(bookId, bookName, chapter, trimmed);
      if (success) {
        setJustSavedText(trimmed);
        setSaveStatus('saved');
        try {
          localStorage.removeItem(draftKey);
        } catch (_) {}

        setTimeout(() => {
          setSaveStatus('idle');
        }, 2800);
      } else {
        setSaveStatus('error');
        setErrorMessage("Impossible d'enregistrer la méditation pour le moment. Veuillez réessayer.");
      }
    } catch (err: any) {
      console.error("Error saving meditation:", err);
      setSaveStatus('error');
      setErrorMessage(err?.message || "Une erreur est survenue lors de l'enregistrement.");
    }
  };

  // --- AUDIO RECORDING HANDLERS ---
  const handleStartRecording = async () => {
    setMicError(null);
    setAudioSaveError(null);
    cleanupRecording();
    resetPreview();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError("L'enregistrement audio n'est pas supporté par ce navigateur ou nécessite une connexion sécurisée (HTTPS).");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      audioStreamRef.current = stream;

      const mimeType = getSupportedAudioMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordedMimeType(mediaRecorder.mimeType || mimeType || 'audio/webm');

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType || mimeType || 'audio/webm' 
        });
        setRecordedBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setRecordedUrl(url);
        setRecordingState('stopped');

        // Stop micro tracks
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(t => t.stop());
          audioStreamRef.current = null;
        }
      };

      mediaRecorder.start(250); // emit chunk every 250ms
      setRecordingState('recording');
      setRecordDuration(0);

      // Start duration timer
      timerIntervalRef.current = setInterval(() => {
        setRecordDuration(prev => {
          const next = prev + 1;
          // Auto stop at 10 minutes (600s)
          if (next >= 600) {
            handleStopRecording();
            return 600;
          }
          return next;
        });
      }, 1000);

    } catch (err: any) {
      console.error("Microphone access error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError("Accès au micro refusé. Veuillez autoriser le microphone dans les réglages de votre navigateur pour pouvoir enregistrer votre méditation.");
      } else if (err.name === 'NotFoundError') {
        setMicError("Aucun microphone détecté sur cet appareil.");
      } else {
        setMicError("Impossible d'accéder au micro. Veuillez vérifier vos autorisations.");
      }
      cleanupRecording();
      setRecordingState('idle');
    }
  };

  const handlePauseResumeRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setRecordingState('paused');
    } else if (recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      timerIntervalRef.current = setInterval(() => {
        setRecordDuration(prev => {
          const next = prev + 1;
          if (next >= 600) {
            handleStopRecording();
            return 600;
          }
          return next;
        });
      }, 1000);
      setRecordingState('recording');
    }
  };

  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleCancelRecording = () => {
    cleanupRecording();
    resetPreview();
  };

  // --- PREVIEW AUDIO PLAYBACK ---
  const handleTogglePreviewPlay = () => {
    if (!recordedUrl) return;

    if (!previewAudioRef.current) {
      const audio = new Audio(recordedUrl);
      previewAudioRef.current = audio;

      audio.ontimeupdate = () => {
        setPreviewTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPreviewPlaying(false);
        setPreviewTime(0);
      };
    }

    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().then(() => {
        setIsPreviewPlaying(true);
      }).catch(err => {
        console.error("Preview audio play error:", err);
      });
    }
  };

  const handlePreviewSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setPreviewTime(time);
    if (previewAudioRef.current) {
      previewAudioRef.current.currentTime = time;
    }
  };

  // --- SAVE AUDIO HANDLER ---
  const handleSaveAudio = async () => {
    if (!recordedBlob || recordDuration <= 0) return;

    setAudioSaveStatus('saving');
    setAudioSaveError(null);

    // Generate automatic title if empty: "Jean 3 – 7 octobre 2026"
    const todayFormatted = new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());

    const finalTitle = audioTitle.trim() || `${bookName} ${chapter} – ${todayFormatted}`;

    try {
      const success = await onSaveAudioMeditation(
        bookId,
        bookName,
        chapter,
        finalTitle,
        recordDuration,
        recordedBlob,
        recordedMimeType,
        savedMeditation?.id
      );

      if (success) {
        setAudioSaveStatus('saved');
        setTimeout(() => {
          resetPreview();
          setAudioSaveStatus('idle');
        }, 2500);
      } else {
        setAudioSaveStatus('error');
        setAudioSaveError("Impossible d'enregistrer l'audio. L'espace de stockage est peut-être saturé.");
      }
    } catch (err: any) {
      console.error("Error saving audio meditation:", err);
      setAudioSaveStatus('error');
      setAudioSaveError(err?.message || "Erreur lors de l'enregistrement de l'audio.");
    }
  };

  // Mini-player for already saved chapter audios
  const handleTogglePlayChapterAudio = async (audioItem: ChapterAudioMeditation) => {
    if (activeChapterAudioId === audioItem.id) {
      if (chapterAudioRef.current) {
        if (chapterAudioRef.current.paused) {
          chapterAudioRef.current.play();
          setIsChapterAudioPlaying(true);
        } else {
          chapterAudioRef.current.pause();
          setIsChapterAudioPlaying(false);
        }
      }
      return;
    }

    if (chapterAudioRef.current) {
      chapterAudioRef.current.pause();
    }

    try {
      const url = await getAudioPlayableUrl(audioItem.id);
      if (!url) return;

      const audio = new Audio(url);
      chapterAudioRef.current = audio;
      setActiveChapterAudioId(audioItem.id);
      setIsChapterAudioPlaying(true);

      audio.onended = () => {
        setIsChapterAudioPlaying(false);
        setActiveChapterAudioId(null);
      };

      await audio.play();
    } catch (err) {
      console.error("Error playing chapter audio:", err);
      setIsChapterAudioPlaying(false);
      setActiveChapterAudioId(null);
    }
  };

  // Helpers
  const activeSavedText = justSavedText ?? savedMeditation?.text ?? '';
  const isExistingSaved = Boolean(activeSavedText.trim());
  const isModifiedFromSaved = isExistingSaved && text.trim() !== activeSavedText.trim();
  const isEmpty = text.trim().length === 0;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formattedDate = savedMeditation?.updated_at ? (() => {
    try {
      const d = new Date(savedMeditation.updated_at);
      return d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return '';
    }
  })() : null;

  return (
    <div className="mt-8 bg-[#0e0c08]/90 border border-[#c9a84c]/35 hover:border-[#c9a84c]/60 rounded-2xl p-4 sm:p-5 shadow-[0_0_20px_rgba(201,168,76,0.08)] backdrop-blur-sm space-y-4 transition-all duration-200 text-left">
      {/* En-tête : Titre & Icône */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2e2a1e]/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#c9a84c]/15 border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c] shrink-0 shadow-sm">
            <Feather className="w-4 h-4 stroke-[2]" />
          </div>
          <div>
            <h3 className="font-serif font-black text-xs sm:text-sm text-[#f4efe2] tracking-wide">
              Ce que j'ai retenu de {bookName} {chapter}
            </h3>
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#8c8270] block">
              Méditation personnelle du chapitre (texte & audio)
            </span>
          </div>
        </div>

        {formattedDate && (
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#8c8270] bg-[#14120e] px-2.5 py-1 rounded-md border border-[#2e2a1e] w-fit">
            <Clock className="w-3 h-3 text-[#c9a84c]/80" />
            <span>Enregistré · {formattedDate}</span>
          </div>
        )}
      </div>

      {/* 1. Zone de texte écrite */}
      <div className="space-y-1.5">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          placeholder="En une ou deux phrases, de quoi parle ce chapitre selon vous ?"
          maxLength={500}
          rows={3}
          className="w-full bg-[#060503] border border-[#2e2a1e] focus:border-[#c9a84c]/70 rounded-xl p-3 text-xs sm:text-sm text-[#f4efe2] placeholder-[#6b6355] outline-none min-h-[85px] resize-y font-serif leading-relaxed transition shadow-inner"
        />

        {/* Footer texte avec compteur et bouton Enregistrer la méditation */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="text-[10px] font-mono tracking-wider text-[#8c8270]">
            <span className={text.length >= 480 ? 'text-amber-400 font-bold' : ''}>
              {text.length}
            </span>
            <span className="text-[#554e42]"> / 500</span>
          </div>

          <div className="flex items-center gap-2">
            {saveStatus === 'error' && (
              <span className="text-[10px] font-mono text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>Erreur</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                if (saveStatus === 'idle' && isExistingSaved && !isModifiedFromSaved) {
                  textareaRef.current?.focus();
                  const len = textareaRef.current?.value.length || 0;
                  textareaRef.current?.setSelectionRange(len, len);
                } else {
                  handleSaveWritten();
                }
              }}
              disabled={isEmpty || saveStatus === 'saving'}
              className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm select-none ${
                saveStatus === 'saved'
                  ? 'bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                  : isEmpty
                  ? 'bg-[#181510] text-[#6b6355] border border-[#2e2a1e] cursor-not-allowed opacity-60'
                  : isExistingSaved && !isModifiedFromSaved
                  ? 'bg-[#1a1712] hover:bg-[#252017] text-[#c9a84c] hover:text-[#f3d889] border border-[#c9a84c]/50 hover:border-[#c9a84c] shadow-[0_0_12px_rgba(201,168,76,0.15)]'
                  : 'bg-[#c9a84c] hover:bg-[#ebd092] text-[#0d0b07] font-black hover:scale-[1.02] active:scale-98 shadow-[0_0_12px_rgba(201,168,76,0.2)]'
              }`}
            >
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span>Enregistré ✓</span>
                </>
              ) : isExistingSaved && !isModifiedFromSaved ? (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </>
              ) : (
                <>
                  <Feather className="w-3.5 h-3.5" />
                  <span>Enregistrer la méditation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <p className="text-[11px] font-sans text-red-400 bg-red-950/30 border border-red-500/20 p-2 rounded-lg">
          {errorMessage}
        </p>
      )}

      {/* 2. SECTION ENREGISTREUR AUDIO */}
      <div className="border-t border-[#2e2a1e]/60 pt-3 space-y-3">
        {/* Message d'erreur micro si refusé */}
        {micError && (
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl space-y-1 text-xs text-red-300">
            <div className="flex items-center gap-1.5 font-bold text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Autorisation du micro requise</span>
            </div>
            <p className="leading-relaxed font-sans text-[11px]">
              {micError}
            </p>
          </div>
        )}

        {/* État 1: Bouton de lancement de l'enregistrement quand idle */}
        {recordingState === 'idle' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={handleStartRecording}
              className="px-4 py-2.5 bg-[#14120e] hover:bg-[#1f1a13] text-[#c9a84c] hover:text-[#ebd092] border border-[#c9a84c]/40 hover:border-[#c9a84c] rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-soft group w-fit"
            >
              <Mic className="w-4 h-4 text-[#c9a84c] group-hover:scale-110 transition-transform" />
              <span>Enregistrer un audio</span>
            </button>

            <span className="text-[10px] font-mono text-[#8c8270]">
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
                  <span className="text-[9px] font-mono text-[#8c8270] block uppercase tracking-wider">
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
              <div className="flex items-center gap-1.5 p-2 bg-amber-950/40 border border-amber-500/40 rounded-lg text-amber-300 text-[11px] font-sans">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>Attention : limite de 10 minutes bientôt atteinte (il reste {600 - recordDuration} s).</span>
              </div>
            )}

            {/* Boutons d'action : Pause/Reprendre, Arrêter, Annuler */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-[#2e2a1e]/60">
              <button
                type="button"
                onClick={handleCancelRecording}
                className="px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider text-[#8c8270] hover:text-[#f4efe2] bg-[#1a1712] border border-[#2e2a1e] transition cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-3 h-3" />
                <span>Annuler</span>
              </button>

              <button
                type="button"
                onClick={handlePauseResumeRecording}
                className="px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider text-[#c9a84c] hover:text-[#ebd092] bg-[#1a1712] border border-[#c9a84c]/30 transition cursor-pointer flex items-center gap-1.5"
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
                onClick={handleStopRecording}
                className="px-3.5 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider text-[#0d0b07] bg-[#c9a84c] hover:bg-[#ebd092] shadow-gold-glow transition cursor-pointer flex items-center gap-1.5"
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
                onClick={handleTogglePreviewPlay}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
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
                  onChange={handlePreviewSeek}
                  className="w-full accent-[#c9a84c] h-1.5 bg-[#1a1712] rounded-lg cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] font-mono text-[#8c8270]">
                  <span>{formatTimer(Math.floor(previewTime))}</span>
                  <span>{formatTimer(recordDuration)}</span>
                </div>
              </div>
            </div>

            {/* Champ Titre optionnel avec placeholder par défaut */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-[#8c8270] tracking-wider block">
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
              <p className="text-[11px] font-sans text-red-400 bg-red-950/30 border border-red-500/20 p-2 rounded-lg">
                {audioSaveError}
              </p>
            )}

            {/* Boutons d'action : Refaire, Supprimer, Enregistrer l'audio */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#2e2a1e]/60">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={audioSaveStatus === 'saving'}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider text-[#8c8270] hover:text-[#f4efe2] bg-[#1a1712] border border-[#2e2a1e] transition cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Refaire</span>
                </button>

                <button
                  type="button"
                  onClick={resetPreview}
                  disabled={audioSaveStatus === 'saving'}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider text-red-400/80 hover:text-red-400 bg-[#1a1712] border border-red-500/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Supprimer</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveAudio}
                disabled={audioSaveStatus === 'saving'}
                className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm ${
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

        {/* 3. Liste des audios déjà enregistrés pour ce chapitre précis */}
        {chapterAudios && chapterAudios.length > 0 && (
          <div className="pt-2 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#c9a84c] block font-bold">
              Audios enregistrés pour ce chapitre ({chapterAudios.length})
            </span>

            <div className="space-y-2">
              {chapterAudios.map(audio => {
                const isPlaying = activeChapterAudioId === audio.id && isChapterAudioPlaying;

                return (
                  <div
                    key={audio.id}
                    className="p-2.5 rounded-xl bg-[#060503] border border-[#2e2a1e] flex items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleTogglePlayChapterAudio(audio)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                          isPlaying 
                            ? 'bg-[#c9a84c] text-[#0d0b07]' 
                            : 'bg-[#14120e] text-[#c9a84c] border border-[#c9a84c]/30 hover:border-[#c9a84c]'
                        }`}
                        title={isPlaying ? "Mettre en pause" : "Écouter"}
                      >
                        {isPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <p className="font-serif font-bold text-xs text-[#f4efe2] truncate">
                          {audio.title}
                        </p>
                        <span className="text-[9px] font-mono text-[#8c8270] flex items-center gap-1.5">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{formatTimer(audio.duration_seconds)}</span>
                        </span>
                      </div>
                    </div>

                    {onDeleteAudioMeditation && (
                      <button
                        type="button"
                        onClick={() => onDeleteAudioMeditation(audio.id)}
                        className="p-1.5 rounded-lg text-[#6b6355] hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer shrink-0"
                        title="Supprimer cet audio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
