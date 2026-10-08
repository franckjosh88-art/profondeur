import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mic, MicOff, Play, Pause, Square, Trash2, Check, Clock, 
  RotateCcw, ArrowRight, Loader2, Volume2, Edit3, X 
} from 'lucide-react';
import { ChapterMeditation, ChapterAudioMeditation } from '../types/bible';
import { getSupportedAudioMimeType, getAudioPlayableUrl } from '../utils/audioStorage';

interface ChapterNoteSectionProps {
  bookId: number;
  bookName: string;
  chapter: number;
  chapterMeditations?: ChapterMeditation[];
  chapterAudios?: ChapterAudioMeditation[];
  onSaveMeditation?: (bookId: number, bookName: string, chapter: number, text: string, noteId?: string) => Promise<boolean>;
  onDeleteMeditation?: (bookId: number, chapter: number, noteId?: string) => Promise<void> | void;
  onSaveAudioMeditation?: (
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
  onAutoValidateChapter?: () => void;
  onNextChapter?: () => void;
  textToAppend?: string | null;
  onClearTextToAppend?: () => void;
}

export const ChapterNoteSection: React.FC<ChapterNoteSectionProps> = ({
  bookId,
  bookName,
  chapter,
  chapterMeditations = [],
  chapterAudios = [],
  onSaveMeditation,
  onDeleteMeditation,
  onSaveAudioMeditation,
  onDeleteAudioMeditation,
  onAutoValidateChapter,
  onNextChapter,
  textToAppend,
  onClearTextToAppend,
}) => {
  const [text, setText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [autoTranscribe, setAutoTranscribe] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioDuration, setRecordedAudioDuration] = useState(0);

  // Audio preview playback
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // List audio playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const listAudioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});

  // Refs for recording & speech recognition
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter notes and audios for this chapter (memoized to prevent new array references on each render)
  const currentChapterNotes = useMemo(() => {
    return (chapterMeditations || [])
      .filter(m => m.book_id === bookId && m.chapter === chapter)
      .sort((a, b) => new Date(b.created_at || b.updated_at).getTime() - new Date(a.created_at || a.updated_at).getTime());
  }, [chapterMeditations, bookId, chapter]);

  const currentChapterAudios = useMemo(() => {
    return (chapterAudios || [])
      .filter(a => a.book_id === bookId && a.chapter === chapter)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [chapterAudios, bookId, chapter]);

  // Stable string key representing the set of chapter audio IDs and URLs
  const audioIdsKey = useMemo(() => {
    return currentChapterAudios.map(a => `${a.id}:${a.audio_url || 'fetch'}`).join('|');
  }, [currentChapterAudios]);

  const onClearTextToAppendRef = useRef(onClearTextToAppend);
  useEffect(() => {
    onClearTextToAppendRef.current = onClearTextToAppend;
  });

  // Handle external text append (e.g. from AI summary)
  useEffect(() => {
    if (textToAppend) {
      setText(prev => {
        if (!prev.trim()) return textToAppend;
        return `${prev}\n\n${textToAppend}`;
      });
      if (onClearTextToAppendRef.current) {
        onClearTextToAppendRef.current();
      }
      // Auto-resize textarea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.max(88, textareaRef.current.scrollHeight)}px`;
        }
      }, 50);
    }
  }, [textToAppend]);

  // Reset form when book or chapter changes
  useEffect(() => {
    setText('');
    setEditingNoteId(null);
    cancelRecording();
    setSaveSuccess(false);
  }, [bookId, chapter]);

  // Load playable URLs for chapter audios safely without triggering infinite loops
  useEffect(() => {
    let isMounted = true;
    const loadUrls = async () => {
      const urls: Record<string, string> = {};
      for (const item of currentChapterAudios) {
        if (item.audio_url) {
          urls[item.id] = item.audio_url;
        } else {
          try {
            const url = await getAudioPlayableUrl(item.id);
            if (url && isMounted) {
              urls[item.id] = url;
            }
          } catch (_) {}
        }
      }
      if (isMounted) {
        setAudioUrls(prev => {
          const prevKeys = Object.keys(prev);
          const newKeys = Object.keys(urls);
          if (prevKeys.length === newKeys.length && prevKeys.every(k => prev[k] === urls[k])) {
            return prev;
          }
          return urls;
        });
      }
    };
    loadUrls();
    return () => {
      isMounted = false;
    };
  }, [audioIdsKey, currentChapterAudios]);

  // Adjust textarea height automatically
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.max(88, e.target.scrollHeight)}px`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        setRecordedAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
      };

      recorder.start(250);
      setIsRecording(true);
      setIsPaused(false);
      setRecordSeconds(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordSeconds(prev => prev + 1);
      }, 1000);

      // Web Speech API for transcription if enabled
      if (autoTranscribe) {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          const rec = new SpeechRec();
          rec.lang = 'fr-FR';
          rec.continuous = true;
          rec.interimResults = true;

          rec.onresult = (event: any) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              transcript += event.results[i][0].transcript;
            }
            if (transcript.trim()) {
              setText(prev => {
                const prefix = prev.trim() ? `${prev.trim()} ` : '';
                return prefix + transcript.trim();
              });
            }
          };

          rec.onerror = () => {};
          rec.start();
          recognitionRef.current = rec;
        }
      }
    } catch (err) {
      console.error('Error starting audio recording:', err);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordSeconds(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
    setIsPaused(false);
    setRecordedAudioDuration(recordSeconds);
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (_) {}
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
    setIsPaused(false);
    setRecordSeconds(0);
    setRecordedAudioBlob(null);
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
  };

  // Preview recorded audio
  const togglePreviewAudio = () => {
    if (!recordedAudioUrl) return;
    if (isPreviewPlaying) {
      previewAudioRef.current?.pause();
      setIsPreviewPlaying(false);
    } else {
      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio(recordedAudioUrl);
        previewAudioRef.current.onended = () => setIsPreviewPlaying(false);
      }
      previewAudioRef.current.play();
      setIsPreviewPlaying(true);
    }
  };

  // List audio playback
  const toggleListAudio = (audioId: string, url: string) => {
    if (playingAudioId === audioId) {
      listAudioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (listAudioRef.current) {
        listAudioRef.current.pause();
      }
      const audio = new Audio(url);
      listAudioRef.current = audio;
      audio.onended = () => setPlayingAudioId(null);
      audio.play();
      setPlayingAudioId(audioId);
    }
  };

  // Save meditation / note
  const handleSave = async () => {
    if (!text.trim() && !recordedAudioBlob) return;
    setIsSaving(true);

    try {
      // 1. Save written meditation
      if (text.trim() && onSaveMeditation) {
        await onSaveMeditation(bookId, bookName, chapter, text.trim(), editingNoteId || undefined);
      }

      // 2. Save audio meditation if recorded
      if (recordedAudioBlob && onSaveAudioMeditation) {
        const mimeType = getSupportedAudioMimeType() || 'audio/webm';
        const title = `${bookName} ${chapter} – Note vocale`;
        await onSaveAudioMeditation(
          bookId,
          bookName,
          chapter,
          title,
          recordedAudioDuration || 1,
          recordedAudioBlob,
          mimeType,
          editingNoteId || undefined
        );
      }

      // Automatically validate chapter for today's reading progress!
      if (onAutoValidateChapter) {
        onAutoValidateChapter();
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);

      // Reset form
      setText('');
      setEditingNoteId(null);
      cancelRecording();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to save chapter note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setText('');
    setEditingNoteId(null);
    cancelRecording();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleEditNote = (note: ChapterMeditation) => {
    setText(note.text);
    setEditingNoteId(note.id);
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(88, textareaRef.current.scrollHeight)}px`;
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
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
  };

  const canSave = text.trim().length > 0 || !!recordedAudioBlob;

  return (
    <div className="mt-12 mb-8 space-y-8">
      {/* 1. SECTION « CE QUE J'AI RETENU DE CE CHAPITRE » */}
      <div className="bg-[#12100c] border border-[#2e2a1e] rounded-2xl p-5 sm:p-6 text-left space-y-4">
        
        {/* En-tête : Titre en casse normale, petit + sous-titre gris discret */}
        <div className="space-y-0.5">
          <h3 className="font-sans text-sm sm:text-base font-semibold text-[#ded7c8]">
            Ce que j'ai retenu de {bookName} {chapter}
          </h3>
          <p className="font-sans text-xs text-[#8c8270]">
            L'idée générale, en vos propres mots
          </p>
        </div>

        {/* 2. Champ de texte unique avec icône micro à droite */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder="Écrire l'idée générale du chapitre…"
            rows={3}
            className="w-full bg-[#181510] border border-[#2e2a1e] focus:border-[#c9a84c]/60 rounded-xl px-4 py-3 pr-12 text-sm text-[#ded7c8] placeholder-[#736a59] outline-none font-serif leading-relaxed transition resize-none min-h-[92px]"
          />

          {/* Icône micro à droite du champ */}
          <div className="absolute right-3 top-3">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="w-8 h-8 rounded-full bg-[#221e16] hover:bg-[#2e2a1e] text-[#a0947f] hover:text-[#c9a84c] flex items-center justify-center transition cursor-pointer"
                title="Enregistrer une note vocale"
                aria-label="Enregistrer une note vocale"
              >
                <Mic className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Option : « Transcrire automatiquement » */}
        <div className="flex items-center justify-between text-xs font-sans text-[#8c8270]">
          <label className="flex items-center gap-2 cursor-pointer select-none hover:text-[#ded7c8] transition">
            <input
              type="checkbox"
              checked={autoTranscribe}
              onChange={(e) => setAutoTranscribe(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-[#181510] border border-[#2e2a1e] text-[#c9a84c] focus:ring-0 cursor-pointer accent-[#c9a84c]"
            />
            <span>Transcrire automatiquement</span>
          </label>
        </div>

        {/* 3. Pendant l'enregistrement vocal : indicateur rouge discret, chronomètre, boutons Pause / Arrêter / Annuler */}
        {isRecording && (
          <div className="bg-[#181510] border border-[#2e2a1e] rounded-xl p-3 flex items-center justify-between gap-3 animate-fade-in font-sans">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full bg-rose-500 ${isPaused ? '' : 'animate-ping'}`} />
              <span className="text-xs text-[#ded7c8] font-mono">
                {isPaused ? 'En pause' : 'Enregistrement'} · {formatSeconds(recordSeconds)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Pause / Reprendre */}
              <button
                type="button"
                onClick={isPaused ? resumeRecording : pauseRecording}
                className="px-2.5 py-1 rounded-lg bg-[#242018] hover:bg-[#2e2a1e] text-xs text-[#ded7c8] transition cursor-pointer"
              >
                {isPaused ? 'Reprendre' : 'Pause'}
              </button>

              {/* Arrêter */}
              <button
                type="button"
                onClick={stopRecording}
                className="px-2.5 py-1 rounded-lg bg-[#2e2a1e] hover:bg-[#3d3829] text-xs text-[#c9a84c] font-medium transition cursor-pointer"
              >
                Arrêter
              </button>

              {/* Annuler */}
              <button
                type="button"
                onClick={cancelRecording}
                className="p-1 rounded-lg hover:bg-[#242018] text-[#8c8270] hover:text-[#ded7c8] transition cursor-pointer"
                title="Annuler l'enregistrement"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Après l'enregistrement : mini-lecteur audio preview */}
        {recordedAudioUrl && !isRecording && (
          <div className="bg-[#181510] border border-[#2e2a1e] rounded-xl p-3 flex items-center justify-between gap-3 animate-fade-in font-sans">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePreviewAudio}
                className="w-7 h-7 rounded-full bg-[#242018] hover:bg-[#2e2a1e] text-[#c9a84c] flex items-center justify-center transition cursor-pointer"
              >
                {isPreviewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>
              <span className="text-xs text-[#ded7c8]">
                Note vocale enregistrée ({formatSeconds(recordedAudioDuration)})
              </span>
            </div>

            <button
              type="button"
              onClick={cancelRecording}
              className="p-1 rounded-lg hover:bg-[#242018] text-[#8c8270] hover:text-rose-400 transition cursor-pointer"
              title="Supprimer l'enregistrement vocal"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4. Boutons « Annuler » et « Enregistrer » alignés à droite */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1f1b14] font-sans">
          {saveSuccess && (
            <span className="text-xs text-[#c9a84c] flex items-center gap-1 mr-auto animate-fade-in">
              <Check className="w-3.5 h-3.5" /> Note enregistrée
            </span>
          )}

          {(text.trim() || recordedAudioBlob || editingNoteId) && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-3.5 py-1.5 rounded-lg text-xs text-[#8c8270] hover:text-[#ded7c8] hover:bg-[#181510] transition cursor-pointer"
            >
              Annuler
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              canSave && !isSaving
                ? 'bg-[#c9a84c] text-[#0a0907] hover:bg-[#d6b75c] active:scale-95 shadow-sm'
                : 'bg-[#181510] text-[#736a59] border border-[#2e2a1e] cursor-not-allowed opacity-60'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <span>{editingNoteId ? 'Mettre à jour' : 'Enregistrer'}</span>
            )}
          </button>
        </div>

        {/* 5. Notes déjà enregistrées pour ce chapitre */}
        {(currentChapterNotes.length > 0 || currentChapterAudios.length > 0) && (
          <div className="pt-4 border-t border-[#1f1b14] space-y-3">
            <div className="text-[11px] font-sans text-[#8c8270] uppercase tracking-wider">
              Notes enregistrées pour ce chapitre ({currentChapterNotes.length + currentChapterAudios.length})
            </div>

            <div className="space-y-2.5">
              {/* Notes écrites */}
              {currentChapterNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-xl bg-[#181510] border border-[#242018] space-y-2 text-left"
                >
                  <div className="flex items-center justify-between text-[11px] font-sans text-[#8c8270]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#736a59]" />
                      {formatDate(note.updated_at || note.created_at)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditNote(note)}
                        className="p-1 hover:text-[#ded7c8] transition"
                        title="Modifier cette note"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {onDeleteMeditation && (
                        <button
                          type="button"
                          onClick={() => onDeleteMeditation(note.book_id, note.chapter, note.id)}
                          className="p-1 hover:text-rose-400 transition"
                          title="Supprimer cette note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="font-serif text-xs sm:text-sm text-[#ded7c8] leading-relaxed whitespace-pre-line">
                    {note.text}
                  </p>
                </div>
              ))}

              {/* Notes vocales enregistrées */}
              {currentChapterAudios.map((audioItem) => {
                const url = audioUrls[audioItem.id];
                const isPlaying = playingAudioId === audioItem.id;
                return (
                  <div
                    key={audioItem.id}
                    className="p-3 rounded-xl bg-[#181510] border border-[#242018] flex items-center justify-between gap-3 text-left font-sans"
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => url && toggleListAudio(audioItem.id, url)}
                        disabled={!url}
                        className="w-7 h-7 rounded-full bg-[#242018] hover:bg-[#2e2a1e] text-[#c9a84c] flex items-center justify-center transition cursor-pointer disabled:opacity-50"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                      </button>
                      <div className="space-y-0.5">
                        <div className="text-xs text-[#ded7c8] flex items-center gap-1.5">
                          <Volume2 className="w-3 h-3 text-[#c9a84c]" />
                          <span>{audioItem.title || 'Note vocale'}</span>
                        </div>
                        <div className="text-[10px] text-[#8c8270]">
                          {formatDate(audioItem.created_at)} · {formatSeconds(audioItem.duration_seconds || 0)}
                        </div>
                      </div>
                    </div>

                    {onDeleteAudioMeditation && (
                      <button
                        type="button"
                        onClick={() => onDeleteAudioMeditation(audioItem.id)}
                        className="p-1 text-[#8c8270] hover:text-rose-400 transition cursor-pointer"
                        title="Supprimer la note vocale"
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

      {/* 6. Bouton « Chapitre suivant » sous la section, bien visible mais sobre */}
      {onNextChapter && (
        <div className="flex justify-center pt-2 pb-6">
          <button
            type="button"
            onClick={onNextChapter}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#14120e] hover:bg-[#1c1913] border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-xs sm:text-sm font-sans font-medium text-[#ded7c8] hover:text-[#f4efe2] transition cursor-pointer shadow-sm active:scale-95 group"
          >
            <span>Chapitre suivant</span>
            <ArrowRight className="w-4 h-4 text-[#8c8270] group-hover:text-[#c9a84c] group-hover:translate-x-0.5 transition" />
          </button>
        </div>
      )}
    </div>
  );
};
