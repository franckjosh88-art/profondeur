import React, { useState, useEffect } from 'react';
import { Copy, Sparkles, Heart, Star, Check, FileText, Share2, ArrowRightLeft, Mic, Square, Play, Pause, Trash2, Image, Bookmark, GitFork, BookOpen, RotateCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Verse, EmotionAnalysisResult, SimilarVerse, SimilarVersesResponse, BookmarkFolder } from '../types/bible';
import { VerseShareModal } from './VerseShareModal';
import { getEmotionMeta, renderEmotionIcon } from '../utils/emotionHelpers';

interface VerseItemProps {
  verse: Verse;
  isFavorite: boolean;
  onToggleFavorite: (verse: Verse) => void;
  onExplain: (verse: Verse, tab?: 'exegesis' | 'compare') => void;
  onStrongClick: (code: string) => void;
  highlightKeyword?: string;
  textSize: number; // 14 to 24px
  lineHeight: number; // proportional
  isSelected: boolean;
  onTap: () => void;
  hasNote: boolean;
  noteText: string;
  noteAudio?: string;
  emotionAnalysis?: EmotionAnalysisResult;
  onSaveNote: (verse: Verse, noteText: string, audioBase64?: string, emotionAnalysis?: EmotionAnalysisResult) => void;
  onNavigateToVerse?: (bookId: number, chapterNum: number, verseNum: number) => void;
  isVerseFavorite?: (bookId: number, chapter: number, verse: number) => boolean;
  isCurrentSpoken?: boolean;
  isLastReadTarget?: boolean;
  isLastRead?: boolean;
  index?: number;
  bookmarkFolders?: BookmarkFolder[];
  favoriteFolderId?: string;
  onAssignFavoriteFolder?: (verse: Verse, folderId?: string, folderName?: string) => void;
}

export const VerseItem: React.FC<VerseItemProps> = React.memo(({
  verse,
  isFavorite,
  onToggleFavorite,
  onExplain,
  onStrongClick,
  highlightKeyword = "",
  textSize,
  lineHeight,
  isSelected,
  onTap,
  hasNote,
  noteText,
  noteAudio,
  emotionAnalysis,
  onSaveNote,
  onNavigateToVerse,
  isVerseFavorite,
  isCurrentSpoken = false,
  isLastReadTarget = false,
  isLastRead = false,
  index = 0,
  bookmarkFolders,
  favoriteFolderId,
  onAssignFavoriteFolder
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedShareText, setCopiedShareText] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [localNote, setLocalNote] = useState(noteText || "");
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Audio recording & playback States
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(noteAudio || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const [durationInterval, setDurationInterval] = useState<any>(null);

  // Speech-to-Text Transcription States
  const [recognition, setRecognition] = useState<any>(null);
  const [isSpeechToTextSupported, setIsSpeechToTextSupported] = useState(false);
  const [isSpeechToTextEnabled, setIsSpeechToTextEnabled] = useState(true); // default enabled for convenience
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Emotional Analysis States
  const [currentAnalysis, setCurrentAnalysis] = useState<EmotionAnalysisResult | null>(null);
  const [isAnalyzingEmotion, setIsAnalyzingEmotion] = useState(false);
  const [emotionError, setEmotionError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentAnalysis(emotionAnalysis || null);
    setEmotionError(null);
  }, [verse.book_id, verse.chapter, verse.verse, emotionAnalysis]);

  const handleAnalyzeEmotion = async () => {
    if (!localNote || !localNote.trim()) return;
    setIsAnalyzingEmotion(true);
    setEmotionError(null);

    try {
      const verseRef = `${verse.book_name} ${verse.chapter}:${verse.verse}`;
      const response = await fetch('/api/gemini/analyze-emotion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteText: localNote,
          verseReference: verseRef,
        }),
      });

      if (!response.ok) {
        throw new Error("L'analyse émotionnelle a échoué. Veuillez réessayer.");
      }

      const data = await response.json() as EmotionAnalysisResult;
      setCurrentAnalysis(data);
      // Persist it immediately by calling onSaveNote with the analysis
      onSaveNote(verse, localNote.trim(), noteAudio || '', data);
    } catch (err: any) {
      console.error(err);
      setEmotionError(err.message || "Impossible de réaliser l'analyse pour le moment.");
    } finally {
      setIsAnalyzingEmotion(false);
    }
  };

  // "Méditer en profondeur" - Versets similaires States & Cache
  const [similarVerses, setSimilarVerses] = useState<SimilarVerse[] | null>(() => {
    try {
      const cached = localStorage.getItem(`bible_similar_v1_${verse.book_id}_${verse.chapter}_${verse.verse}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return null;
  });
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const [similarError, setSimilarError] = useState<string | null>(null);
  const [isSimilarExpanded, setIsSimilarExpanded] = useState(false);
  const [addedNoteVerseIndex, setAddedNoteVerseIndex] = useState<number | null>(null);
  const [localSimilarFavs, setLocalSimilarFavs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // When verse changes, load from cache if available
    try {
      const cached = localStorage.getItem(`bible_similar_v1_${verse.book_id}_${verse.chapter}_${verse.verse}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSimilarVerses(parsed);
          setSimilarError(null);
          return;
        }
      }
    } catch (e) {}
    setSimilarVerses(null);
    setSimilarError(null);
    setIsSimilarExpanded(false);
  }, [verse.book_id, verse.chapter, verse.verse]);

  const handleFetchSimilarVerses = async (forceRefresh: boolean = false) => {
    setIsSimilarExpanded(true);
    setSimilarError(null);

    const cacheKey = `bible_similar_v1_${verse.book_id}_${verse.chapter}_${verse.verse}`;

    // If already in state and not forcing refresh, nothing to fetch
    if (!forceRefresh && similarVerses && similarVerses.length > 0) {
      return;
    }

    // Check localStorage if not forcing refresh
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSimilarVerses(parsed);
            return;
          }
        }
      } catch (e) {}
    }

    setIsLoadingSimilar(true);

    try {
      const response = await fetch('/api/gemini/similar-verses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verseText: verse.text,
          reference: `${verse.book_name} ${verse.chapter}:${verse.verse}`,
          bookName: verse.book_name,
          bookId: verse.book_id,
          chapter: verse.chapter,
          verse: verse.verse
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Impossible de récupérer les versets similaires.");
      }

      const data: SimilarVersesResponse = await response.json();
      const results = data.versets_similaires || [];

      if (results.length === 0) {
        throw new Error("Aucun verset similaire n'a pu être validé pour ce passage.");
      }

      setSimilarVerses(results);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(results));
      } catch (e) {}
    } catch (err: any) {
      console.error("Erreur similar-verses:", err);
      setSimilarError(err.message || "Une erreur réseau ou d'IA est survenue. Veuillez réessayer.");
    } finally {
      setIsLoadingSimilar(false);
    }
  };

  const handleAddSimilarToNote = (sv: SimilarVerse, sIndex: number) => {
    const formattedQuote = `\n\n📌 ${sv.reference} :\n« ${sv.text} »\n(${sv.type_lien} — ${sv.explication})`;
    setLocalNote(prev => (prev ? prev.trim() + formattedQuote : formattedQuote.trim()));
    setAddedNoteVerseIndex(sIndex);
    setTimeout(() => {
      setAddedNoteVerseIndex(null);
    }, 2200);
  };

  const isSimilarVerseFav = (sv: SimilarVerse) => {
    const key = `${sv.book_id}_${sv.chapter}_${sv.verse}`;
    if (localSimilarFavs[key] !== undefined) {
      return localSimilarFavs[key];
    }
    if (isVerseFavorite) {
      return isVerseFavorite(sv.book_id, sv.chapter, sv.verse);
    }
    return false;
  };

  const handleToggleSimilarFav = (sv: SimilarVerse) => {
    const vObj: Verse = {
      book_id: sv.book_id,
      book_name: sv.book_name,
      chapter: sv.chapter,
      verse: sv.verse,
      text: sv.text
    };
    onToggleFavorite(vObj);
    const key = `${sv.book_id}_${sv.chapter}_${sv.verse}`;
    setLocalSimilarFavs(prev => ({
      ...prev,
      [key]: !isSimilarVerseFav(sv)
    }));
  };

  const handleOpenSimilarVerse = (sv: SimilarVerse) => {
    if (onNavigateToVerse) {
      onNavigateToVerse(sv.book_id, sv.chapter, sv.verse);
    }
  };

  const getLinkTypeBadge = (type: string) => {
    switch (type) {
      case 'Parallèle':
        return {
          bg: 'bg-blue-500/15',
          text: 'text-blue-300',
          border: 'border-blue-500/30',
          label: 'Parallèle'
        };
      case 'Accomplissement':
        return {
          bg: 'bg-[#c9a84c]/20',
          text: 'text-[#c9a84c]',
          border: 'border-[#c9a84c]/40',
          label: 'Accomplissement'
        };
      case 'Éclairage':
        return {
          bg: 'bg-amber-500/15',
          text: 'text-amber-300',
          border: 'border-amber-500/30',
          label: 'Éclairage'
        };
      case 'Contraste':
        return {
          bg: 'bg-purple-500/15',
          text: 'text-purple-300',
          border: 'border-purple-500/30',
          label: 'Contraste'
        };
      default:
        return {
          bg: 'bg-emerald-500/15',
          text: 'text-emerald-300',
          border: 'border-emerald-500/30',
          label: type || 'Illustration'
        };
    }
  };

  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSpeechToTextSupported(!!SpeechRecognitionClass);
  }, []);

  useEffect(() => {
    setLocalNote(noteText || "");
  }, [noteText]);

  useEffect(() => {
    setAudioUrl(noteAudio || null);
    if (audioPlayer) {
      audioPlayer.pause();
      setAudioPlayer(null);
      setIsPlaying(false);
    }
  }, [noteAudio]);

  // Parse text to find Strong codes like [H7225] or [G3056]
  const parseStrongCodes = (text: string) => {
    const rx = /\[(H\d+|G\d+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = rx.exec(text)) !== null) {
      const matchIndex = match.index;
      // Add preceding text
      if (matchIndex > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, matchIndex)
        });
      }
      // Add strong code
      parts.push({
        type: 'strong',
        content: match[1]
      });
      lastIndex = rx.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }

    // Fallback if no code matches
    if (parts.length === 0) {
      parts.push({ type: 'text', content: text });
    }

    return parts;
  };

  const textParts = parseStrongCodes(verse.text);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid toggling selection or clearing it
    const copyText = `${verse.book_name} ${verse.chapter}:${verse.verse} - "${verse.text}"`;
    navigator.clipboard.writeText(copyText);
    setCopied(true);
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(verse);
  };

  const startRecording = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAudioUrl(base64data);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      setRecording(true);
      setRecordDuration(0);

      const interval = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
      setDurationInterval(interval);

      // Web Speech API Speech-to-Text Transcription integration
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass && isSpeechToTextEnabled) {
        try {
          const rec = new SpeechRecognitionClass();
          rec.continuous = true;
          rec.interimResults = false;
          rec.lang = 'fr-FR';

          const initialBaseNote = (localNote || "").trim();
          let sessionTranscript = '';

          rec.onresult = (event: any) => {
            let newlyFinalized = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                newlyFinalized += event.results[i][0].transcript + ' ';
              }
            }
            if (newlyFinalized) {
              sessionTranscript += newlyFinalized;
              setLocalNote(() => {
                const combined = initialBaseNote 
                  ? `${initialBaseNote}\n${sessionTranscript.trim()}` 
                  : sessionTranscript.trim();
                return combined;
              });
            }
          };

          rec.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error);
          };

          rec.onend = () => {
            setIsTranscribing(false);
          };

          rec.start();
          setRecognition(rec);
          setIsTranscribing(true);
        } catch (recognitionError) {
          console.error("SpeechRecognition initialization failed:", recognitionError);
        }
      }
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Impossible d'accéder au microphone. Veuillez autoriser l'accès dans les paramètres du navigateur.");
    }
  };

  const stopRecording = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
      if (durationInterval) {
        clearInterval(durationInterval);
        setDurationInterval(null);
      }
    }

    if (recognition) {
      try {
        recognition.stop();
      } catch (_) {}
      setRecognition(null);
      setIsTranscribing(false);
    }
  };

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioUrl) return;

    if (isPlaying && audioPlayer) {
      audioPlayer.pause();
      setIsPlaying(false);
    } else {
      if (audioPlayer) {
        audioPlayer.currentTime = 0;
        audioPlayer.play().catch(err => console.error(err));
        setIsPlaying(true);
      } else {
        const player = new Audio(audioUrl);
        player.onended = () => {
          setIsPlaying(false);
        };
        player.play().catch(err => console.error(err));
        setAudioPlayer(player);
        setIsPlaying(true);
      }
    }
  };

  const handleDeleteAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioPlayer) {
      audioPlayer.pause();
      setAudioPlayer(null);
    }
    setAudioUrl(null);
    setIsPlaying(false);
  };

  useEffect(() => {
    return () => {
      if (audioPlayer) {
        audioPlayer.pause();
      }
      if (durationInterval) {
        clearInterval(durationInterval);
      }
      if (recognition) {
        try {
          recognition.onresult = null;
          recognition.onerror = null;
          recognition.onend = null;
          recognition.stop();
        } catch (_) {}
      }
    };
  }, [audioPlayer, durationInterval, recognition]);

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareMenu(false);
    
    // Clean text by stripping strong codes
    const cleanVerseText = verse.text.replace(/\[[HG]\d+\]/g, '').trim();
    const shareText = `📖 "${cleanVerseText}"\n\n— ${verse.book_name} ${verse.chapter}:${verse.verse} (Louis Segond 1910)`;
    const shareUrl = window.location.origin;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${verse.book_name} ${verse.chapter}:${verse.verse}`,
          text: shareText,
          url: shareUrl
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Native share failed:", err);
          handleDirectCopy(shareText, shareUrl);
        }
      }
    } else {
      handleDirectCopy(shareText, shareUrl);
    }
  };

  const handleCopyShareText = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanVerseText = verse.text.replace(/\[[HG]\d+\]/g, '').trim();
    const shareText = `📖 "${cleanVerseText}"\n\n— ${verse.book_name} ${verse.chapter}:${verse.verse} (Louis Segond 1910)`;
    const shareUrl = window.location.origin;
    handleDirectCopy(shareText, shareUrl);
  };

  const handleDirectCopy = (text: string, url: string) => {
    const fullMessage = `${text}\n\nÉtudiez la Bible en profondeur:\n🔗 ${url}`;
    navigator.clipboard.writeText(fullMessage);
    setCopiedShareText(true);
    setTimeout(() => setCopiedShareText(false), 2000);
  };

  const handleAnalyze = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExplain(verse);
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExplain(verse, 'compare');
  };

  const highlightText = (content: string, search: string) => {
    if (!search) return <span>{content}</span>;
    const pieces = content.split(new RegExp(`(${search})`, 'gi'));
    return (
      <>
        {pieces.map((piece, i) => 
          piece.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-[#c9a84c]/20 text-[#c9a84c] border-b border-[#c9a84c] font-medium px-0.5 rounded">{piece}</mark>
          ) : (
            <span key={i}>{piece}</span>
          )
        )}
      </>
    );
  };

  return (
    <motion.div 
      id={`verse-${verse.book_id}-${verse.chapter}-${verse.verse}`}
      data-book-id={verse.book_id}
      data-book-name={verse.book_name}
      data-chapter={verse.chapter}
      data-verse-num={verse.verse}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.35, 
        delay: Math.min(index, 20) * 0.012, 
        ease: [0.215, 0.610, 0.355, 1.000] 
      }}
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
      className={`verse-container-item group relative py-2.5 px-3 transition-all duration-200 cursor-pointer select-none border-b border-[#2e2a1e]/15 ${
        (isLastReadTarget || isLastRead)
          ? 'bg-[#c9a84c]/10 border-l-2 border-[#c9a84c] rounded-r-xl shadow-[0_0_15px_rgba(201,168,76,0.15)] ring-1 ring-[#c9a84c]/30 my-1'
          : isSelected 
            ? 'bg-[rgba(201,168,76,0.06)] border-l-2 border-[#c9a84c] rounded-none' 
            : isCurrentSpoken
              ? 'bg-[rgba(201,168,76,0.04)] border-l-2 border-[#c9a84c] rounded-none animate-pulse'
              : 'border-l-2 border-transparent hover:bg-white/[0.01]'
      }`}
      style={{
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        paddingLeft: '12px',
        paddingRight: '12px',
        paddingTop: '8px',
        paddingBottom: '8px',
      }}
    >
      {/* Golden Banner for Last Read Position */}
      {(isLastReadTarget || isLastRead) && (
        <div className="mb-2 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#c9a84c] text-[#0d0b07] font-mono text-[9px] font-extrabold uppercase tracking-wider w-fit shadow-md animate-fade-in">
          <Bookmark className="w-3 h-3 fill-current" />
          <Sparkles className="w-3 h-3 fill-current" />
          <span>Dernière position de lecture · {verse.book_name} {verse.chapter}:{verse.verse}</span>
        </div>
      )}

      {/* 100% Full-Width Verse Text Container (mobile-first, single paragraph, inline verse number) */}
      <div className="w-full min-w-0" style={{ width: '100%', minWidth: 0 }}>
        <p 
          className="text-left font-reading text-[#e8e0d0] select-text" 
          style={{ 
            width: '100%',
            minWidth: 0,
            fontSize: textSize ? `${textSize}px` : '18px', 
            lineHeight: lineHeight ? `${lineHeight}px` : '1.7',
            textAlign: 'left',
            overflowWrap: 'break-word',
            wordBreak: 'normal',
          }}
        >
          {/* Verse Number inline inside paragraph (small, bold, golden #c9a84c) */}
          <span 
            className="verse-num font-mono font-extrabold text-[#c9a84c] select-none text-[11px] mr-1.5 align-baseline inline-flex items-center gap-1"
            style={{ color: '#c9a84c' }}
          >
            <span>{verse.verse}</span>
            {(isLastRead || isLastReadTarget) && (
              <Bookmark className="w-2.5 h-2.5 text-[#c9a84c] fill-[#c9a84c] inline-block" />
            )}
            {hasNote && (() => {
              if (emotionAnalysis?.detectedEmotion) {
                const meta = getEmotionMeta(emotionAnalysis.detectedEmotion);
                return (
                  <span 
                    className={`inline-flex items-center justify-center p-0.5 rounded-full border ${meta.badgeBg} ${meta.colorClass} ${meta.borderClass}`}
                    title={`Note spirituelle (${emotionAnalysis.detectedEmotion})`}
                  >
                    {renderEmotionIcon(meta.iconName, "w-2.5 h-2.5")}
                  </span>
                );
              }
              return (
                <FileText className="w-2.5 h-2.5 text-[#c9a84c] inline-block" title="Ce verset contient une note personnelle" />
              );
            })()}
          </span>

          {textParts.map((part, index) => {
            if (part.type === 'strong') {
              return (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStrongClick(part.content);
                  }}
                  className="mx-1 px-1.5 py-0.5 bg-[#1a1712] hover:bg-[#c9a84c]/20 text-[#c9a84c] rounded font-mono text-[10px] font-bold align-baseline border border-[#2e2a1e] transition cursor-pointer"
                  title="Consulter l'étymologie originale"
                >
                  {part.content}
                </button>
              );
            }
            return (
              <span key={index}>
                {highlightText(part.content, highlightKeyword)}
              </span>
            );
          })}
        </p>

        {/* Note preview if any and verse is not currently selected */}
        {(hasNote || noteAudio) && !isSelected && (
          <div className="mt-2 flex flex-col gap-1.5 border-l border-[#c9a84c]/40 pl-3">
            {noteText && (
              <div className="space-y-1">
                <p className="text-[11.5px] text-[#c9a84c]/85 italic">« {noteText} »</p>
                {emotionAnalysis?.detectedEmotion && (() => {
                  const meta = getEmotionMeta(emotionAnalysis.detectedEmotion);
                  return (
                    <div className={`inline-flex items-center gap-1.5 text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${meta.badgeBg} ${meta.colorClass} ${meta.borderClass} select-none animate-fade-in`}>
                      {renderEmotionIcon(meta.iconName, "w-2.5 h-2.5")}
                      <span>{emotionAnalysis.detectedEmotion}</span>
                    </div>
                  );
                })()}
              </div>
            )}
            {noteAudio && (
              <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 mt-0.5 select-none">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPlaying && audioPlayer) {
                      audioPlayer.pause();
                      setIsPlaying(false);
                    } else {
                      if (audioPlayer) {
                        audioPlayer.currentTime = 0;
                        audioPlayer.play().catch(err => console.error(err));
                        setIsPlaying(true);
                      } else {
                        const player = new Audio(noteAudio);
                        player.onended = () => setIsPlaying(false);
                        player.play().catch(err => console.error(err));
                        setAudioPlayer(player);
                        setIsPlaying(true);
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1a1712] border border-[#2e2a1e] hover:border-[#c9a84c]/40 rounded-lg text-[9px] font-mono uppercase tracking-wider text-[#c9a84c] cursor-pointer hover:bg-[#201b13] transition"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-2.5 h-2.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Écouter Réflexion</span>
                    </>
                  )
                  }
                </button>
                <span className="text-[8px] font-mono text-[#6b6355] uppercase">Vocale personnelle</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons under the verse: shown only when tapped / active (isSelected), on a flex-wrap row */}
      {isSelected && (
        <div className="space-y-3">
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="mt-3 pt-2.5 border-t border-[#2e2a1e]/50 flex flex-wrap items-center gap-2 select-none animate-fade-slide-up"
          >
            {/* Favori */}
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono tracking-wider transition-all duration-200 cursor-pointer ${
                isFavorite 
                  ? 'bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c]/60 shadow-[0_0_12px_rgba(201,168,76,0.2)] font-bold' 
                  : 'bg-[#1a1712] hover:bg-[#c9a84c]/10 text-[#8e8574] hover:text-[#c9a84c] border-[#2e2a1e]'
              }`}
              title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Heart 
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isFavorite ? 'scale-110 fill-[#c9a84c] text-[#c9a84c]' : ''
                }`} 
              />
              <span>Favori</span>
            </button>

            {/* Favori thematic folder dropdown if favorited */}
            {isFavorite && bookmarkFolders && bookmarkFolders.length > 0 && onAssignFavoriteFolder && (
              <div className="relative inline-flex items-center">
                <select
                  value={favoriteFolderId || ''}
                  onChange={(e) => {
                    const newFId = e.target.value || undefined;
                    const fObj = newFId ? bookmarkFolders.find(f => f.id === newFId) : undefined;
                    onAssignFavoriteFolder(verse, newFId, fObj?.name);
                  }}
                  className="bg-[#1a1712] border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#c9a84c] text-[10px] font-mono rounded-lg px-2 py-1.5 outline-none cursor-pointer max-w-[130px] truncate transition"
                  title="Classer ce verset dans un dossier thématique"
                >
                  <option value="">📁 Dossier...</option>
                  {bookmarkFolders.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Copier */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1712] hover:bg-[#c9a84c]/10 border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#c9a84c] text-xs font-mono tracking-wider transition duration-150 cursor-pointer"
              title="Copier ce verset dans le presse-papiers"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copié ✓</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier</span>
                </>
              )}
            </button>

            {/* Image */}
            <button
              onClick={() => setIsShareOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1712] hover:bg-[#c9a84c]/10 border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#c9a84c] text-xs font-mono tracking-wider transition duration-150 cursor-pointer"
              title="Créer une image esthétique du verset"
            >
              <Image className="w-3.5 h-3.5" />
              <span>Image</span>
            </button>

            {/* Partager */}
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1712] hover:bg-emerald-500/10 border border-[#2e2a1e] hover:border-emerald-500/40 text-emerald-400 text-xs font-mono tracking-wider transition duration-150 cursor-pointer"
                title="Options de partage"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Partager</span>
              </button>

              {/* Share dropdown */}
              {showShareMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-30 cursor-default" 
                    onClick={() => setShowShareMenu(false)}
                  />
                  <div className="absolute top-[110%] left-0 w-52 bg-[#16130e] border border-[#2e2a1e] rounded-xl p-1.5 shadow-2xl z-40 animate-fade-slide-up space-y-1">
                    <button
                      onClick={handleNativeShare}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-medium text-[#e4dfd5] hover:bg-[#c9a84c]/10 hover:text-[#c9a84c] transition duration-150 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <div className="leading-tight">
                        <p className="font-sans font-bold text-[11.5px]">Partage Système</p>
                        <p className="text-[8px] text-[#6b6355] font-mono uppercase tracking-wider mt-0.5">SMS, Réseaux, Mail</p>
                      </div>
                    </button>

                    <button
                      onClick={handleCopyShareText}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-medium text-[#e4dfd5] hover:bg-[#c9a84c]/10 hover:text-[#c9a84c] transition duration-150 cursor-pointer"
                    >
                      {copiedShareText ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#c9a84c] flex-shrink-0" />
                          <div className="leading-tight">
                            <p className="font-sans font-bold text-[11.5px] text-[#c9a84c]">Copié ✓</p>
                            <p className="text-[8px] text-[#c9a84c] font-mono uppercase tracking-wider mt-0.5">Vers presse-papier</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#c9a84c] flex-shrink-0" />
                          <div className="leading-tight">
                            <p className="font-sans font-bold text-[11.5px]">Copier le Texte</p>
                            <p className="text-[8px] text-[#6b6355] font-mono uppercase tracking-wider mt-0.5">Citation avec lien</p>
                          </div>
                        </>
                      )}
                    </button>

                    <div className="h-[1px] bg-[#2e2a1e]/60 my-1"></div>

                    <button
                      onClick={() => {
                        setShowShareMenu(false);
                        setIsShareOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-medium text-[#e4dfd5] hover:bg-[#c9a84c]/10 hover:text-[#c9a84c] transition duration-150 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#c9a84c] flex-shrink-0" />
                      <div className="leading-tight">
                        <p className="font-sans font-bold text-[11.5px]">Image d'Art / Carte</p>
                        <p className="text-[8px] text-[#6b6355] font-mono uppercase tracking-wider mt-0.5">Enluminure & Studio IA</p>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Analyser */}
            <button
              onClick={handleAnalyze}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1712] hover:bg-[#c9a84c]/10 border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#c9a84c] text-xs font-mono tracking-wider transition duration-150 cursor-pointer"
              title="Obtenir l'analyse théologique détaillée par IA"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Analyser</span>
            </button>

            {/* Comparer */}
            <button
              onClick={handleCompare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1712] hover:bg-[#c9a84c]/10 border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#c9a84c] text-xs font-mono tracking-wider transition duration-150 cursor-pointer"
              title="Comparer côte à côte différentes traductions"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Comparer</span>
            </button>

            {/* Similaires */}
            <button
              onClick={() => {
                if (!isSimilarExpanded) {
                  handleFetchSimilarVerses(false);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1712] hover:bg-[#c9a84c]/10 border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#c9a84c] text-xs font-mono tracking-wider transition duration-150 cursor-pointer"
              title="Méditer en profondeur : versets similaires"
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>Similaires</span>
            </button>
          </div>
          {/* Note Editor */}
          <div className="mt-3 bg-[#110e0a] border border-[#2e2a1e]/60 rounded-xl p-3 space-y-2.5 animate-fade-slide-up text-left">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono tracking-wider text-[#c9a84c] uppercase font-bold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#c9a84c]" /> Note personnelle
              </span>
              {(noteText || noteAudio) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocalNote("");
                    setAudioUrl(null);
                    onSaveNote(verse, "", "");
                  }}
                  className="text-[9px] font-mono text-rose-400 hover:text-rose-300 transition uppercase cursor-pointer"
                >
                  Effacer
                </button>
              )}
            </div>
            <textarea
              value={localNote}
              onChange={(e) => {
                setLocalNote(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Rédigez vos notes, prières ou réflexions d'étude sur ce verset..."
              className="w-full h-16 bg-[#16130e] border border-[#2e2a1e] rounded-lg p-2 text-xs text-[#e8e0d0] placeholder-[#6b6355] focus:outline-none focus:border-[#c9a84c] resize-none font-sans"
            />

            {/* SECTION : Méditer en profondeur / Versets similaires */}
            <div className="pt-2 border-t border-[#2e2a1e]/30 space-y-2 select-none">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono tracking-wider text-[#c9a84c] uppercase font-bold flex items-center gap-1.5">
                  <GitFork className="w-3.5 h-3.5 text-[#c9a84c]" /> Versets similaires & Méditation
                </span>
                {similarVerses && similarVerses.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFetchSimilarVerses(true);
                    }}
                    disabled={isLoadingSimilar}
                    className="text-[8.5px] font-mono text-[#c9a84c] hover:text-[#e8e0d0] transition uppercase cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    title="Obtenir d'autres suggestions de versets pour ce passage"
                  >
                    <RotateCw className={`w-2.5 h-2.5 ${isLoadingSimilar ? 'animate-spin' : ''}`} />
                    <span>Régénérer</span>
                  </button>
                )}
              </div>

              {!isSimilarExpanded && !similarVerses ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFetchSimilarVerses(false);
                  }}
                  className="w-full py-2.5 bg-[#17140f] hover:bg-[#201b13] border border-[#c9a84c]/30 hover:border-[#c9a84c] text-[#c9a84c] hover:text-[#e8e0d0] rounded-lg text-[10px] font-mono uppercase font-black tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  title="Méditer en profondeur : obtenir automatiquement 4 à 6 versets bibliques complémentaires ou parallèles"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />
                  <span>Versets similaires</span>
                </button>
              ) : isLoadingSimilar ? (
                <div className="bg-[#17140f] border border-[#2e2a1e]/60 rounded-lg p-3 flex flex-col items-center justify-center space-y-2 py-4 animate-pulse">
                  <div className="w-5 h-5 rounded-full border-t-2 border-[#c9a84c] animate-spin"></div>
                  <span className="text-[10px] font-mono text-[#c9a84c] uppercase tracking-wider">
                    Exploration des versets parallèles & éclairages...
                  </span>
                </div>
              ) : similarError ? (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p>{similarError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFetchSimilarVerses(true);
                    }}
                    className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 rounded text-[9.5px] font-mono uppercase tracking-wider transition cursor-pointer"
                  >
                    Réessayer
                  </button>
                </div>
              ) : similarVerses && similarVerses.length > 0 ? (
                <div className="space-y-2.5 animate-fade-in text-left">
                  {similarVerses.map((sv, sIdx) => {
                    const badge = getLinkTypeBadge(sv.type_lien);
                    const isFav = isSimilarVerseFav(sv);
                    const isJustAdded = addedNoteVerseIndex === sIdx;

                    return (
                      <div
                        key={`${sv.book_id}_${sv.chapter}_${sv.verse}_${sIdx}`}
                        className="bg-[#12100c] border border-[#2e2a1e]/70 hover:border-[#c9a84c]/40 rounded-xl p-3 space-y-2 transition-all duration-200 shadow-sm"
                      >
                        {/* Header: Référence & Badge du type de lien */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-serif font-bold text-[#c9a84c] tracking-wide">
                            {sv.reference}
                          </span>
                          <span
                            className={`text-[8.5px] font-mono font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border} uppercase tracking-wider select-none`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        {/* Texte du verset issu de la Bible authentique de l'application */}
                        <p className="font-serif italic text-xs text-[#e8e0d0] leading-relaxed bg-[#0a0907] p-2.5 rounded-lg border border-[#2e2a1e]/40">
                          « {sv.text} »
                        </p>

                        {/* Explication théologique courte du lien */}
                        <p className="text-[10px] text-[#b8af9e] font-sans leading-normal border-l-2 border-[#c9a84c]/40 pl-2">
                          {sv.explication}
                        </p>

                        {/* Actions : Favori, Ajouter à ma note, Ouvrir */}
                        <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-[#2e2a1e]/40">
                          {/* ⭐ Favori */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSimilarFav(sv);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-mono uppercase tracking-wider border transition cursor-pointer select-none ${
                              isFav
                                ? 'bg-[#c9a84c]/15 text-[#c9a84c] border-[#c9a84c]/40 font-bold shadow-sm'
                                : 'bg-[#17140f] hover:bg-[#c9a84c]/10 text-[#8e8574] hover:text-[#c9a84c] border-[#2e2a1e]'
                            }`}
                            title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                          >
                            <Star className={`w-3 h-3 ${isFav ? 'fill-[#c9a84c] text-[#c9a84c]' : ''}`} />
                            <span>{isFav ? 'Favori ★' : 'Favori'}</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            {/* 📝 Ajouter à ma note */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddSimilarToNote(sv, sIdx);
                              }}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[9px] font-mono uppercase tracking-wider border transition cursor-pointer select-none ${
                                isJustAdded
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                                  : 'bg-[#17140f] hover:bg-[#c9a84c]/15 text-[#c9a84c] hover:text-[#f3e7c4] border-[#c9a84c]/30'
                              }`}
                              title="Insérer la référence et le texte dans la note personnelle"
                            >
                              {isJustAdded ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Ajouté ✓</span>
                                </>
                              ) : (
                                <>
                                  <FileText className="w-3 h-3" />
                                  <span>Ajouter à ma note</span>
                                </>
                              )}
                            </button>

                            {/* 📖 Ouvrir dans son chapitre */}
                            {onNavigateToVerse && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenSimilarVerse(sv);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 bg-[#17140f] hover:bg-[#201b13] border border-[#2e2a1e] hover:border-[#c9a84c]/50 text-[#8e8574] hover:text-[#c9a84c] rounded-md text-[9px] font-mono uppercase tracking-wider transition cursor-pointer select-none"
                                title="Ouvrir ce verset dans son chapitre"
                              >
                                <BookOpen className="w-3 h-3" />
                                <span>Ouvrir</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Visual audio voice memo block */}
            <div className="pt-2 border-t border-[#2e2a1e]/30 space-y-2 select-none">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono tracking-wider text-[#c9a84c] uppercase font-bold flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#c9a84c]" /> Note vocale & Témoignage spirituel
                </span>
                
                {isSpeechToTextSupported && (
                  <label className="flex items-center gap-1.5 cursor-pointer text-[9px] font-mono text-[#6b6355] hover:text-[#c9a84c] transition select-none">
                    <input
                      type="checkbox"
                      checked={isSpeechToTextEnabled}
                      onChange={(e) => {
                        setIsSpeechToTextEnabled(e.target.checked);
                      }}
                      className="accent-[#c9a84c] w-3 h-3 rounded bg-[#16130e] border-[#2e2a1e] focus:ring-0 cursor-pointer"
                    />
                    <span>Transcription Automatique</span>
                  </label>
                )}
              </div>

              {recording ? (
                <div className="flex flex-col bg-rose-500/5 border border-rose-500/20 rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                      <span className="text-[10.5px] font-mono text-rose-400 font-bold">
                        Enregistrement du témoignage... {Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="p-1 px-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-md text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Arrêter</span>
                    </button>
                  </div>
                  {isTranscribing && (
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#c9a84c] bg-[#1a1712] rounded px-2 py-1 border border-[#c9a84c]/20 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />
                      <span>Dictée vocale active : exprimez votre témoignage spirituel oralement...</span>
                    </div>
                  )}
                </div>
              ) : audioUrl ? (
                <div className="flex items-center justify-between bg-[#1f1a12] border border-[#c9a84c]/30 rounded-lg p-2 px-3 shadow-soft">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={playAudio}
                      className="w-7 h-7 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c] hover:bg-[#c9a84c]/20 transition cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                    </button>
                    <div>
                      <p className="text-[11px] text-[#e8e0d0] font-sans font-medium">Témoignage vocal enregistré</p>
                      <p className="text-[9px] text-[#6b6355] font-mono uppercase">Prêt à être sauvegardé dans Firestore</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteAudio}
                    className="p-1.5 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 rounded-md transition cursor-pointer"
                    title="Supprimer la note vocale"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-full py-2.5 bg-[#17140f] hover:bg-[#201b13] border border-[#c9a84c]/30 hover:border-[#c9a84c] text-[#c9a84c] hover:text-[#e8e0d0] rounded-lg text-[10px] font-mono uppercase font-black tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  title="Enregistrer un témoignage ou une note vocale via MediaRecorder et sauvegarder dans Firestore"
                >
                  <Mic className="w-3.5 h-3.5 text-[#c9a84c]" />
                  <span>Enregistrer une note vocale</span>
                </button>
              )}
            </div>

            {/* Emotional analysis segment */}
            {localNote.trim().length > 3 && (
              <div className="pt-2 border-t border-[#2e2a1e]/30 space-y-2 select-none">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-mono tracking-wider text-[#c9a84c] uppercase font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" /> Harmonie & Soutien Émotionnel
                  </span>
                  {currentAnalysis && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyzeEmotion();
                      }}
                      disabled={isAnalyzingEmotion}
                      className="text-[8px] font-mono text-[#c9a84c] hover:text-[#e8e0d0] transition uppercase cursor-pointer"
                    >
                      Mettre à jour
                    </button>
                  )}
                </div>

                {isAnalyzingEmotion ? (
                  <div className="bg-[#17140f] border border-[#2e2a1e]/60 rounded-lg p-3 flex flex-col items-center justify-center space-y-2 py-4 animate-pulse">
                    <div className="w-5 h-5 rounded-full border-t-2 border-[#c9a84c] animate-spin"></div>
                    <span className="text-[10px] font-mono text-[#c9a84c] uppercase">Analyse théologique & résonance de l'âme...</span>
                  </div>
                ) : emotionError ? (
                  <div className="p-2 bg-rose-500/5 border border-rose-500/20 text-rose-400 text-xs rounded-md">
                    {emotionError}
                  </div>
                ) : currentAnalysis ? (
                  <div className="bg-[#17140f] border border-[#2e2a1e]/60 rounded-lg p-3 space-y-2.5 animate-fade-in text-left">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const meta = getEmotionMeta(currentAnalysis.detectedEmotion);
                          return (
                            <div className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${meta.badgeBg} ${meta.colorClass} ${meta.borderClass} select-none`}>
                              {renderEmotionIcon(meta.iconName, "w-3 h-3")}
                              <span>{currentAnalysis.detectedEmotion}</span>
                            </div>
                          );
                        })()}
                        <p className="text-[10.5px] font-sans font-bold text-[#b8af9e]">
                          détecté comme climat spirituel
                        </p>
                      </div>
                      <span className="px-1.5 py-0.5 text-[6.5px] font-mono font-bold uppercase tracking-widest text-[#c9a84c] bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded select-none">
                        Analyse générée par IA — à vérifier
                      </span>
                    </div>

                    <p className="font-serif italic text-xs text-[#b8af9e] leading-relaxed">
                      {currentAnalysis.emotionalSummary}
                    </p>

                    <p className="text-[11.5px] text-[#e8e0d0]/90 leading-relaxed font-sans bg-[#110e0a]/40 p-2.5 border-l-2 border-[#c9a84c]/60 rounded-r">
                      {currentAnalysis.pastoralEncouragement}
                    </p>

                    <div className="space-y-2 pt-1.5 border-t border-[#2e2a1e]/20">
                      <span className="text-[9px] font-mono tracking-wider text-[#6b6355] uppercase block font-bold">
                        Psaumes & Versets de réconfort :
                      </span>
                      {currentAnalysis.suggestedVerses && currentAnalysis.suggestedVerses.length > 0 ? (
                        currentAnalysis.suggestedVerses.map((sv, sidx) => (
                          <div key={sidx} className="bg-[#12100c] border border-[#2e2a1e]/40 rounded-lg p-2.5 space-y-1 hover:border-[#c9a84c]/20 transition-all duration-300">
                            <span className="text-[10.5px] font-serif font-black text-[#c9a84c] block">
                              ✨ {sv.reference}
                            </span>
                            <p className="font-serif italic text-xs text-[#e8e0d0] leading-relaxed bg-[#0a0907] p-2 rounded border border-[#2e2a1e]/30">
                              « {sv.text} »
                            </p>
                            <p className="text-[9.5px] text-[#8e8574] leading-normal font-sans">
                              {sv.reason}
                            </p>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-muted">Aucune suggestion disponible.</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnalyzeEmotion();
                    }}
                    className="w-full py-2 bg-[#17140f] hover:bg-[#c9a84c]/10 border border-[#c9a84c]/20 hover:border-[#c9a84c] text-[#c9a84c] rounded-lg text-[10px] font-mono uppercase font-black tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />
                    <span>Analyser le climat émotionnel & suggérer des Versets</span>
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1 border-t border-[#2e2a1e]/30">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLocalNote(noteText || "");
                  setAudioUrl(noteAudio || null);
                  if (audioPlayer) {
                    audioPlayer.pause();
                    setAudioPlayer(null);
                  }
                  setIsPlaying(false);
                }}
                disabled={localNote === (noteText || "") && audioUrl === (noteAudio || null)}
                className="px-2.5 py-1 text-[10px] text-luxury-text-muted hover:text-luxury-text-primary disabled:opacity-40 transition font-mono cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveNote(verse, localNote.trim(), audioUrl || '');
                }}
                disabled={localNote.trim() === (noteText || "").trim() && audioUrl === (noteAudio || null)}
                className="px-3 py-1 text-[10px] bg-[#c9a84c] hover:bg-[#b0913e] disabled:bg-[#2e2a1e] disabled:text-[#6b6355] text-[#0d0b07] rounded font-bold font-mono transition cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled Canvas Image Share Modal Dialog overlay */}
      <AnimatePresence>
        {isShareOpen && (
          <VerseShareModal 
            verse={verse} 
            onClose={() => setIsShareOpen(false)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
});

VerseItem.displayName = 'VerseItem';
