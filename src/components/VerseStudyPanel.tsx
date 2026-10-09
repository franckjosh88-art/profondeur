import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bookmark,
  Copy,
  Image as ImageIcon,
  Share2,
  Sparkles,
  ArrowRightLeft,
  GitFork,
  X,
  Mic,
  MicOff,
  Check,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  BookOpen,
  Volume2,
  Plus,
  RotateCcw
} from 'lucide-react';
import { Verse, SimilarVerse, SimilarVersesResponse } from '../types/bible';

interface TranslationComparison {
  code: string;
  name: string;
  text: string;
  language: string;
}

interface VerseStudyPanelProps {
  verse: Verse;
  isOpen: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (verse: Verse) => void;
  onOpenImageShare: (verse: Verse) => void;
  onNavigateToScripture?: (bookId: number | string, chapter: number, verse: number) => void;
  onSaveNote: (verse: Verse, text: string, audioBase64?: string) => Promise<void> | void;
  existingNotes?: Array<{
    id?: string;
    note: string;
    audio?: string;
    created_at?: string;
    updated_at?: string;
  }>;
  onDeleteNote?: (verse: Verse, noteId?: string) => Promise<void> | void;
}

type ActivePanelTab = 'none' | 'compare' | 'similar' | 'analyze';

export const VerseStudyPanel: React.FC<VerseStudyPanelProps> = ({
  verse,
  isOpen,
  onClose,
  isFavorite,
  onToggleFavorite,
  onOpenImageShare,
  onNavigateToScripture,
  onSaveNote,
  existingNotes = [],
  onDeleteNote,
}) => {
  // Action rows active sub-view
  const [activeTab, setActiveTab] = useState<ActivePanelTab>('none');

  // Copy feedback
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);

  // 1. COMPARER STATE
  const [compareData, setCompareData] = useState<TranslationComparison[]>([]);
  const [loadingCompare, setLoadingCompare] = useState<boolean>(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [availableVersions, setAvailableVersions] = useState<string[]>(['LSG', 'DRB', 'KJV']);
  const [selectedVersions, setSelectedVersions] = useState<string[]>(['LSG', 'DRB', 'KJV']);

  // 2. SIMILAIRES STATE
  const [similarVerses, setSimilarVerses] = useState<SimilarVerse[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState<boolean>(false);
  const [similarError, setSimilarError] = useState<string | null>(null);
  // Méditer state for similar verses
  const [meditationVerseRef, setMeditationVerseRef] = useState<string | null>(null);
  const [meditationText, setMeditationText] = useState<string | null>(null);
  const [loadingMeditation, setLoadingMeditation] = useState<boolean>(false);

  // 3. ANALYSER STATE
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [analysisStrongWords, setAnalysisStrongWords] = useState<Array<{ word: string; code: string }>>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState<boolean>(true);

  // 4. MA NOTE STATE
  const [noteText, setNoteText] = useState<string>('');
  const [autoTranscribe, setAutoTranscribe] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudioBase64, setRecordedAudioBase64] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Playing existing voice notes
  const [playingAudioIndex, setPlayingAudioIndex] = useState<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Reset tab when verse changes
  useEffect(() => {
    setActiveTab('none');
    setCompareData([]);
    setSimilarVerses([]);
    setAnalysisText(null);
    setMeditationVerseRef(null);
    setMeditationText(null);
    setNoteText('');
    setRecordedAudioBase64(null);
    setIsRecording(false);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setPlayingAudioIndex(null);
  }, [verse.book_id, verse.chapter, verse.verse]);

  // Clean verse text (strip strong codes [H1234] / [G1234])
  const cleanVerseText = (raw: string) => {
    return raw.replace(/\[[HG]\d+\]/g, '').replace(/\s+/g, ' ').trim();
  };

  // ===================== ACTION ROW HANDLERS =====================
  const handleCopy = () => {
    const textToCopy = `${verse.book_name} ${verse.chapter}:${verse.verse} — « ${cleanVerseText(verse.text)} »`;
    navigator.clipboard.writeText(textToCopy);
    setHasCopied(true);
    setCopyNotification('Verset copié');
    setTimeout(() => {
      setHasCopied(false);
      setCopyNotification(null);
    }, 2000);
  };

  const handleShare = async () => {
    const clean = cleanVerseText(verse.text);
    const text = `${verse.book_name} ${verse.chapter}:${verse.verse}\n\n« ${clean} »\n\nPartagé depuis Sanctuaire Bible`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${verse.book_name} ${verse.chapter}:${verse.verse}`,
          text: text,
        });
      } catch (_) {}
    } else {
      navigator.clipboard.writeText(text);
      setCopyNotification('Copié pour partage');
      setTimeout(() => setCopyNotification(null), 2000);
    }
  };

  // ===================== 1. COMPARER =====================
  const toggleCompare = async () => {
    if (activeTab === 'compare') {
      setActiveTab('none');
      return;
    }
    setActiveTab('compare');
    if (compareData.length > 0) return;

    setLoadingCompare(true);
    setCompareError(null);
    try {
      const resp = await fetch('/api/gemini/compare-verse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookName: verse.book_name,
          chapter: verse.chapter,
          verse: verse.verse,
          originalText: cleanVerseText(verse.text),
        }),
      });

      if (!resp.ok) {
        throw new Error("Impossible de charger les traductions comparatives.");
      }
      const data = await resp.json();
      const list: TranslationComparison[] = (data.translations || []).map((t: any) => ({
        code: t.code,
        name: t.name || t.code,
        text: t.text,
        language: t.language || 'fr',
      }));

      // Ensure LSG is present
      const hasLsg = list.some(t => t.code.toUpperCase() === 'LSG');
      const all: TranslationComparison[] = hasLsg
        ? list
        : [
            {
              code: 'LSG',
              name: 'Louis Segond (1910)',
              text: cleanVerseText(verse.text),
              language: 'fr',
            },
            ...list,
          ];

      setCompareData(all);
      const codes = all.map(t => t.code);
      setAvailableVersions(codes);
      // Select up to 3 versions by default
      setSelectedVersions(codes.slice(0, 3));
    } catch (err: any) {
      console.error("Erreur comparaison:", err);
      // Fallback local comparison with LSG + Darby approximation
      const fallback: TranslationComparison[] = [
        {
          code: 'LSG',
          name: 'Louis Segond 1910',
          text: cleanVerseText(verse.text),
          language: 'fr',
        },
        {
          code: 'DRB',
          name: 'Darby (Français)',
          text: cleanVerseText(verse.text),
          language: 'fr',
        },
        {
          code: 'KJV',
          name: 'King James Version',
          text: cleanVerseText(verse.text),
          language: 'en',
        },
      ];
      setCompareData(fallback);
      setSelectedVersions(['LSG', 'DRB', 'KJV']);
    } finally {
      setLoadingCompare(false);
    }
  };

  const handleToggleSelectedVersion = (code: string) => {
    if (selectedVersions.includes(code)) {
      if (selectedVersions.length > 1) {
        setSelectedVersions(selectedVersions.filter(c => c !== code));
      }
    } else {
      setSelectedVersions([...selectedVersions, code]);
    }
  };

  // ===================== 2. VERSETS SIMILAIRES =====================
  const toggleSimilar = async () => {
    if (activeTab === 'similar') {
      setActiveTab('none');
      return;
    }
    setActiveTab('similar');
    if (similarVerses.length > 0) return;

    setLoadingSimilar(true);
    setSimilarError(null);
    try {
      const resp = await fetch('/api/gemini/similar-verses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verseText: cleanVerseText(verse.text),
          reference: `${verse.book_name} ${verse.chapter}:${verse.verse}`,
          bookName: verse.book_name,
          bookId: verse.book_id,
          chapter: verse.chapter,
          verse: verse.verse,
        }),
      });

      if (!resp.ok) {
        throw new Error("Impossible de trouver des versets similaires.");
      }
      const data: SimilarVersesResponse = await resp.json();
      setSimilarVerses(data.versets_similaires || []);
    } catch (err: any) {
      console.error("Erreur versets similaires:", err);
      setSimilarError("Une erreur est survenue lors de la recherche des passages connexes.");
    } finally {
      setLoadingSimilar(false);
    }
  };

  // Bouton « Méditer » (IA)
  const handleGenerateMeditation = async (sv: SimilarVerse) => {
    setMeditationVerseRef(sv.reference);
    setLoadingMeditation(true);
    setMeditationText(null);
    try {
      const resp = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Génère une courte réflexion spirituelle et méditative (environ 3 phrases) reliant ces deux versets bibliques : 
1) ${verse.book_name} ${verse.chapter}:${verse.verse} : "${cleanVerseText(verse.text)}"
2) ${sv.reference} : "${sv.text}" (${sv.type_lien} : ${sv.explication}).
Donne une application pratique pour la foi chrétienne aujourd'hui. Reste concis, sobre et chaleureux.`,
        }),
      });
      if (!resp.ok) throw new Error("Erreur de génération");
      const data = await resp.json();
      setMeditationText(data.explanation || data.text || "Prenez un moment pour méditer sur la fidélité de Dieu à travers ce passage.");
    } catch (e) {
      setMeditationText(`Ce passage (${sv.reference}) fait écho à ${verse.book_name} ${verse.chapter}:${verse.verse}. Méditez sur la manière dont ces vérités se renforcent mutuellement dans votre marche quotidienne.`);
    } finally {
      setLoadingMeditation(false);
    }
  };

  // ===================== 3. ANALYSER =====================
  const toggleAnalyze = async () => {
    if (activeTab === 'analyze') {
      setActiveTab('none');
      return;
    }
    setActiveTab('analyze');
    if (analysisText) return;

    setLoadingAnalysis(true);
    setAnalysisError(null);

    // Parse strong codes from raw verse text if present
    const rawMatches = (verse.text.match(/\[[HG]\d+\]/g) || []).map(code => {
      const cleaned = code.replace('[', '').replace(']', '');
      return {
        word: cleaned.startsWith('H') ? 'Hébreu' : 'Grec',
        code: cleaned,
      };
    });
    setAnalysisStrongWords(rawMatches);

    try {
      const resp = await fetch('/api/gemini/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verseText: cleanVerseText(verse.text),
          bookName: verse.book_name,
          chapter: verse.chapter,
          verse: verse.verse,
          fullContext: `Livre de ${verse.book_name}, chapitre ${verse.chapter}, verset ${verse.verse}`,
        }),
      });

      if (!resp.ok) throw new Error("Erreur d'analyse");
      const data = await resp.json();
      setAnalysisText(data.explanation || "Aucune analyse disponible pour ce verset.");
    } catch (err: any) {
      console.error("Erreur analyse:", err);
      setAnalysisError("Impossible de charger l'analyse. Vérifiez votre connexion.");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // ===================== 4. MA NOTE & AUDIO RECORDING =====================
  const handleStartVoiceRecording = async () => {
    if (isRecording) {
      handleStopVoiceRecording();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setRecordedAudioBase64(reader.result as string);
        };
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);

      // Web Speech API for transcription if autoTranscribe is checked
      const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechClass && autoTranscribe) {
        try {
          const rec = new SpeechClass();
          rec.continuous = true;
          rec.interimResults = false;
          rec.lang = 'fr-FR';

          const currentNoteBefore = noteText ? noteText.trim() + ' ' : '';
          rec.onresult = (evt: any) => {
            let transcribed = '';
            for (let i = evt.resultIndex; i < evt.results.length; ++i) {
              if (evt.results[i].isFinal) {
                transcribed += evt.results[i][0].transcript + ' ';
              }
            }
            if (transcribed) {
              setNoteText(currentNoteBefore + transcribed.trim());
            }
          };

          rec.onerror = (e: any) => console.log("Speech recognition error:", e);
          rec.start();
          speechRecognitionRef.current = rec;
        } catch (e) {
          console.warn("Speech recognition couldn't start:", e);
        }
      }
    } catch (err) {
      console.error("Microphone error:", err);
      alert("Accès au microphone refusé ou non supporté.");
    }
  };

  const handleStopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
      setIsRecording(false);
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (_) {}
      speechRecognitionRef.current = null;
    }
  };

  const handleSaveNoteSubmit = async () => {
    if (!noteText.trim() && !recordedAudioBase64) return;
    setIsSavingNote(true);
    try {
      await onSaveNote(verse, noteText.trim(), recordedAudioBase64 || undefined);
      setNoteText('');
      setRecordedAudioBase64(null);
      setSaveSuccessMsg('Note enregistrée');
      setTimeout(() => setSaveSuccessMsg(null), 2500);
    } catch (err) {
      console.error("Erreur sauvegarde note:", err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleTogglePlayExistingAudio = (audioSrc: string, index: number) => {
    if (playingAudioIndex === index) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      setPlayingAudioIndex(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const player = new Audio(audioSrc);
    player.onended = () => {
      setPlayingAudioIndex(null);
      audioPlayerRef.current = null;
    };
    player.play().catch(console.error);
    audioPlayerRef.current = player;
    setPlayingAudioIndex(index);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-auto bg-black/60 backdrop-blur-xs select-none transition-opacity"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-2xl max-h-[85vh] bg-[#14120e] border-t sm:border border-[#2a261c] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden text-left"
          style={{
            backgroundColor: 'var(--r-surface, var(--color-surface, #14120e))',
            borderColor: 'var(--r-border, var(--color-border, #2a261c))',
            color: 'var(--r-text, var(--color-text, #ded7c8))',
          }}
        >
          {/* Poignée mobile (drag handle) */}
          <div className="w-full pt-2.5 pb-1 flex justify-center sm:hidden">
            <div className="w-10 h-1 rounded-full bg-[#3a3428]" />
          </div>

          {/* En-tête : Référence du verset + bouton Fermer */}
          <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-[#242018] shrink-0">
            <div>
              <h3 className="font-serif text-base font-bold text-[#e8e0d0] tracking-wide">
                {verse.book_name} {verse.chapter}:{verse.verse}
              </h3>
              <p className="text-xs text-[#8c8270] font-sans line-clamp-1 italic mt-0.5">
                « {cleanVerseText(verse.text)} »
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#8c8270] hover:text-[#e8e0d0] hover:bg-[#1f1b14] transition cursor-pointer"
              title="Fermer"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Toast / Notification feedback */}
          {copyNotification && (
            <div className="mx-5 my-2 px-3 py-1.5 rounded-lg bg-[#1f1b14] border border-[#3a3428] text-xs text-[#c9a84c] flex items-center gap-1.5 animate-fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>{copyNotification}</span>
            </div>
          )}

          {/* 1) RANGÉE D'ACTIONS (une seule ligne, défilement horizontal) */}
          {/* Boutons sobres : fond légèrement plus clair que le panneau, le doré uniquement pour l'action active */}
          <div className="px-4 py-2.5 border-b border-[#242018] shrink-0 overflow-x-auto scroller-none">
            <div className="flex items-center gap-2 min-w-max">
              {/* Favori */}
              <button
                type="button"
                onClick={() => onToggleFavorite(verse)}
                className={`min-h-[44px] px-3.5 rounded-xl font-sans text-xs flex items-center gap-1.5 transition cursor-pointer ${
                  isFavorite
                    ? 'bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/50 font-medium'
                    : 'bg-[#1b1812] text-[#b8ad99] hover:bg-[#231f17] hover:text-[#ded7c8]'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                <span>Favori</span>
              </button>

              {/* Copier */}
              <button
                type="button"
                onClick={handleCopy}
                className="min-h-[44px] px-3.5 rounded-xl font-sans text-xs bg-[#1b1812] text-[#b8ad99] hover:bg-[#231f17] hover:text-[#ded7c8] flex items-center gap-1.5 transition cursor-pointer"
              >
                {hasCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copier</span>
                  </>
                )}
              </button>

              {/* Image */}
              <button
                type="button"
                onClick={() => onOpenImageShare(verse)}
                className="min-h-[44px] px-3.5 rounded-xl font-sans text-xs bg-[#1b1812] text-[#b8ad99] hover:bg-[#231f17] hover:text-[#ded7c8] flex items-center gap-1.5 transition cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Image</span>
              </button>

              {/* Partager */}
              <button
                type="button"
                onClick={handleShare}
                className="min-h-[44px] px-3.5 rounded-xl font-sans text-xs bg-[#1b1812] text-[#b8ad99] hover:bg-[#231f17] hover:text-[#ded7c8] flex items-center gap-1.5 transition cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Partager</span>
              </button>

              {/* Analyser */}
              <button
                type="button"
                onClick={toggleAnalyze}
                className={`min-h-[44px] px-3.5 rounded-xl font-sans text-xs flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'analyze'
                    ? 'bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/50 font-medium'
                    : 'bg-[#1b1812] text-[#b8ad99] hover:bg-[#231f17] hover:text-[#ded7c8]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Analyser</span>
              </button>

              {/* Comparer */}
              <button
                type="button"
                onClick={toggleCompare}
                className={`min-h-[44px] px-3.5 rounded-xl font-sans text-xs flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'compare'
                    ? 'bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/50 font-medium'
                    : 'bg-[#1b1812] text-[#b8ad99] hover:bg-[#231f17] hover:text-[#ded7c8]'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Comparer</span>
              </button>

              {/* Similaires */}
              <button
                type="button"
                onClick={toggleSimilar}
                className={`min-h-[44px] px-3.5 rounded-xl font-sans text-xs flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'similar'
                    ? 'bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/50 font-medium'
                    : 'bg-[#1b1812] text-[#b8ad99] hover:bg-[#231f17] hover:text-[#ded7c8]'
                }`}
              >
                <GitFork className="w-4 h-4" />
                <span>Similaires</span>
              </button>
            </div>
          </div>

          {/* CORPS PRINCIPAL : ZONE DÉROULANTE (Analyses, Comparaisons, Similaires, Notes) */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scroller-thin">

            {/* 2) COMPARER (Vue 2 ou 3 versions l'une sous l'autre) */}
            {activeTab === 'compare' && (
              <div className="space-y-3 bg-[#110f0b] border border-[#242018] rounded-2xl p-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#242018]">
                  <h4 className="text-xs font-sans text-[#a0947f]">
                    Comparaison de traductions
                  </h4>
                  {/* Sélecteur de versions */}
                  <div className="flex items-center gap-1.5">
                    {availableVersions.map(code => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => handleToggleSelectedVersion(code)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-sans font-medium transition cursor-pointer ${
                          selectedVersions.includes(code)
                            ? 'bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/40'
                            : 'bg-[#181510] text-[#736a59] hover:text-[#ded7c8]'
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>

                {loadingCompare ? (
                  <div className="py-8 flex flex-col items-center justify-center space-y-2">
                    <div className="w-5 h-5 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin" />
                    <span className="text-xs text-[#8c8270] font-sans">Chargement des versions...</span>
                  </div>
                ) : compareError ? (
                  <p className="text-xs text-rose-400 font-sans">{compareError}</p>
                ) : (
                  <div className="space-y-3.5">
                    {compareData
                      .filter(item => selectedVersions.includes(item.code))
                      .map((item) => (
                        <div key={item.code} className="space-y-1">
                          <div className="text-[11px] text-[#8c8270] font-sans flex items-center justify-between">
                            <span className="font-medium text-[#c9a84c]">{item.name}</span>
                            <span className="text-[10px] text-[#736a59] uppercase">{item.code}</span>
                          </div>
                          <p className="font-serif text-sm text-[#e8e0d0] leading-relaxed pl-2 border-l-2 border-[#2e2a1e]">
                            « {cleanVerseText(item.text)} »
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* 3) VERSETS SIMILAIRES */}
            {activeTab === 'similar' && (
              <div className="space-y-3 bg-[#110f0b] border border-[#242018] rounded-2xl p-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#242018]">
                  <h4 className="text-xs font-sans text-[#a0947f]">
                    Passages proches et correspondances
                  </h4>
                  <span className="text-[11px] text-[#736a59] font-sans">
                    {similarVerses.length} trouvés
                  </span>
                </div>

                {loadingSimilar ? (
                  <div className="py-8 flex flex-col items-center justify-center space-y-2">
                    <div className="w-5 h-5 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin" />
                    <span className="text-xs text-[#8c8270] font-sans">Recherche des passages connexes...</span>
                  </div>
                ) : similarError ? (
                  <p className="text-xs text-rose-400 font-sans">{similarError}</p>
                ) : similarVerses.length === 0 ? (
                  <p className="text-xs text-[#8c8270] font-sans italic">Aucun verset similaire trouvé.</p>
                ) : (
                  <div className="space-y-3">
                    {similarVerses.map((sv, idx) => (
                      <div 
                        key={idx}
                        className="p-3 rounded-xl bg-[#181510] border border-[#242018] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          {/* Référence cliquable pour naviguer */}
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigateToScripture) {
                                onNavigateToScripture(sv.book_id, sv.chapter, sv.verse);
                                onClose();
                              }
                            }}
                            className="font-serif text-xs font-bold text-[#c9a84c] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{sv.reference}</span>
                            <ExternalLink className="w-3 h-3 text-[#8c8270]" />
                          </button>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#242018] text-[#8c8270] font-sans">
                            {sv.type_lien}
                          </span>
                        </div>

                        <p className="font-serif text-xs text-[#d0c6b4] leading-relaxed italic">
                          « {cleanVerseText(sv.text)} »
                        </p>
                        <p className="text-[11px] text-[#8c8270] font-sans">
                          {sv.explication}
                        </p>

                        {/* Bouton « Méditer » (IA) */}
                        <div className="pt-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleGenerateMeditation(sv)}
                            className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#242018] text-[#ded7c8] hover:bg-[#2e2a1e] hover:text-[#c9a84c] text-[11px] font-sans flex items-center gap-1 transition cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-[#c9a84c]" />
                            <span>Méditer</span>
                          </button>
                        </div>

                        {/* Réflexion de méditation affichée */}
                        {meditationVerseRef === sv.reference && (
                          <div className="mt-2 p-2.5 rounded-lg bg-[#14120e] border border-[#2e2a1e] text-xs font-sans text-[#ded7c8] space-y-1">
                            <span className="text-[10px] text-[#c9a84c] font-medium flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Réflexion spirituelle
                            </span>
                            {loadingMeditation ? (
                              <p className="text-[#8c8270] italic">Génération en cours...</p>
                            ) : (
                              <p className="leading-relaxed">{meditationText}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4) ANALYSER (Explication courte, contexte, mots clés Strong) */}
            {activeTab === 'analyze' && (
              <div className="space-y-3 bg-[#110f0b] border border-[#242018] rounded-2xl p-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#242018]">
                  <h4 className="text-xs font-sans text-[#a0947f]">
                    Explication et contexte du verset
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
                    className="text-[#8c8270] hover:text-[#e8e0d0] p-1 cursor-pointer"
                  >
                    {isAnalysisExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {loadingAnalysis ? (
                  <div className="py-8 flex flex-col items-center justify-center space-y-2">
                    <div className="w-5 h-5 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin" />
                    <span className="text-xs text-[#8c8270] font-sans">Analyse théologique en cours...</span>
                  </div>
                ) : analysisError ? (
                  <p className="text-xs text-rose-400 font-sans">{analysisError}</p>
                ) : isAnalysisExpanded && (
                  <div className="space-y-3 text-xs font-sans text-[#ded7c8] leading-relaxed">
                    <p className="whitespace-pre-line">{analysisText}</p>

                    {/* Mots clés Strong si disponibles */}
                    {analysisStrongWords.length > 0 && (
                      <div className="pt-2 border-t border-[#242018]">
                        <span className="text-[11px] text-[#8c8270] block mb-1.5 font-medium">
                          Racines linguistiques :
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {analysisStrongWords.map((item, idx) => (
                            <span 
                              key={idx}
                              className="px-2 py-0.5 rounded-lg bg-[#1f1b14] border border-[#2e2a1e] text-[10px] text-[#c9a84c] font-mono"
                            >
                              {item.code} ({item.word})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 5) MA NOTE */}
            {/* Champ de texte qui s'agrandit, icône micro, case transcrire automatiquement, boutons Annuler / Enregistrer */}
            <div className="space-y-3 bg-[#110f0b] border border-[#242018] rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-sans text-[#a0947f]">
                  Ma note
                </h4>
                {saveSuccessMsg && (
                  <span className="text-xs text-emerald-400 font-sans flex items-center gap-1 animate-fade-in">
                    <Check className="w-3.5 h-3.5" /> {saveSuccessMsg}
                  </span>
                )}
              </div>

              {/* Champ texte */}
              <div className="relative">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Écrire une note…"
                  rows={Math.max(2, Math.min(8, noteText.split('\n').length + 1))}
                  className="w-full bg-[#181510] border border-[#2e2a1e] rounded-xl p-3 text-xs text-[#ded7c8] placeholder-[#736a59] outline-none focus:border-[#c9a84c]/60 resize-none font-sans transition-all leading-relaxed"
                />
              </div>

              {/* Ligne d'outils de note : Micro, case Transcrire, Annuler / Enregistrer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                
                {/* Micro et transcription */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={isRecording ? handleStopVoiceRecording : handleStartVoiceRecording}
                    className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center transition cursor-pointer ${
                      isRecording
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 animate-pulse'
                        : 'bg-[#181510] text-[#a0947f] hover:text-[#e8e0d0] hover:bg-[#242018]'
                    }`}
                    title={isRecording ? "Arrêter l'enregistrement" : "Enregistrer une note vocale"}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  {isRecording && (
                    <span className="text-xs text-rose-400 font-mono">
                      {formatSeconds(recordingSeconds)}
                    </span>
                  )}

                  {/* Option Transcrire automatiquement (activée par défaut) */}
                  <label className="flex items-center gap-1.5 text-[11px] text-[#8c8270] font-sans cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoTranscribe}
                      onChange={(e) => setAutoTranscribe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded bg-[#181510] border-[#2e2a1e] accent-[#c9a84c] cursor-pointer"
                    />
                    <span>Transcrire automatiquement</span>
                  </label>
                </div>

                {/* Boutons Annuler et Enregistrer alignés à droite */}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setNoteText('');
                      setRecordedAudioBase64(null);
                      if (isRecording) handleStopVoiceRecording();
                    }}
                    className="min-h-[44px] px-3.5 rounded-xl text-xs font-sans text-[#8c8270] hover:text-[#ded7c8] hover:bg-[#181510] transition cursor-pointer"
                  >
                    Annuler
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveNoteSubmit}
                    disabled={(!noteText.trim() && !recordedAudioBase64) || isSavingNote}
                    className="min-h-[44px] px-4 rounded-xl text-xs font-sans font-medium bg-[#c9a84c] text-[#0c0a07] hover:bg-[#dfba55] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    {isSavingNote ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>

              {/* Aperçu audio en cours si enregistré */}
              {recordedAudioBase64 && (
                <div className="p-2.5 rounded-xl bg-[#181510] border border-[#2e2a1e] flex items-center justify-between text-xs font-sans text-[#ded7c8]">
                  <span className="flex items-center gap-1.5 text-[#c9a84c]">
                    <Volume2 className="w-3.5 h-3.5" /> Note vocale prête
                  </span>
                  <button
                    type="button"
                    onClick={() => setRecordedAudioBase64(null)}
                    className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                    title="Supprimer la note vocale non sauvegardée"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Notes déjà enregistrées pour ce verset */}
              {existingNotes.length > 0 && (
                <div className="pt-3 border-t border-[#242018] space-y-2">
                  <span className="text-[11px] text-[#8c8270] font-sans block">
                    Notes enregistrées ({existingNotes.length})
                  </span>

                  <div className="space-y-2">
                    {existingNotes.map((n, i) => (
                      <div 
                        key={n.id || i}
                        className="p-3 rounded-xl bg-[#181510] border border-[#242018] text-xs font-sans space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[10px] text-[#736a59]">
                          <span>
                            {n.created_at ? new Date(n.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }) : 'Note enregistrée'}
                          </span>

                          <div className="flex items-center gap-1">
                            {/* Bouton lecture si note audio */}
                            {n.audio && (
                              <button
                                type="button"
                                onClick={() => handleTogglePlayExistingAudio(n.audio!, i)}
                                className="min-w-[32px] min-h-[32px] rounded-lg bg-[#242018] text-[#c9a84c] flex items-center justify-center hover:bg-[#2e2a1e] transition cursor-pointer"
                                title={playingAudioIndex === i ? "Pause" : "Écouter"}
                              >
                                {playingAudioIndex === i ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                              </button>
                            )}

                            {/* Bouton supprimer */}
                            {onDeleteNote && (
                              <button
                                type="button"
                                onClick={() => onDeleteNote(verse, n.id)}
                                className="min-w-[32px] min-h-[32px] rounded-lg text-[#736a59] hover:text-rose-400 flex items-center justify-center transition cursor-pointer"
                                title="Supprimer la note"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {n.note && (
                          <p className="text-[#ded7c8] leading-relaxed whitespace-pre-line">
                            {n.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
