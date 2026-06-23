import React, { useState, useEffect } from 'react';
import { Copy, Sparkles, Heart, Star, Check, FileText, Share2, ArrowRightLeft, Mic, Square, Play, Pause, Trash2, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Verse, EmotionAnalysisResult } from '../types/bible';
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
  isCurrentSpoken?: boolean;
  index?: number;
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
  isCurrentSpoken = false,
  index = 0
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
      className={`group relative py-2 px-3 transition-all duration-200 cursor-pointer select-none border-b border-[#2e2a1e]/10 ${
        isSelected 
          ? 'bg-[rgba(201,168,76,0.06)] border-l-2 border-[#c9a84c] rounded-none' 
          : isCurrentSpoken
            ? 'bg-[rgba(201,168,76,0.04)] border-l-2 border-[#c9a84c] rounded-none animate-pulse'
            : 'border-l-2 border-transparent hover:bg-white/[0.01]'
      }`}
      style={{
        paddingLeft: '12px',
        paddingRight: '12px',
        paddingTop: '8px',
        paddingBottom: '8px',
      }}
    >
      <div className="flex items-start gap-2.5">
        {/* Verse Number aligned elegant top-left superscript style with optional Note icon */}
        <div className="flex flex-col items-center gap-1 select-none font-mono text-[11px] font-extrabold text-[#c9a84c] mt-1 pr-0.5 flex-shrink-0">
          <span>{verse.verse}</span>
          {hasNote && (() => {
            if (emotionAnalysis?.detectedEmotion) {
              const meta = getEmotionMeta(emotionAnalysis.detectedEmotion);
              return (
                <div 
                  className={`p-0.5 rounded-full border ${meta.badgeBg} ${meta.colorClass} ${meta.borderClass} animate-fade-in`}
                  title={`Note spirituelle (${emotionAnalysis.detectedEmotion})`}
                >
                  {renderEmotionIcon(meta.iconName, "w-3 h-3")}
                </div>
              );
            }
            return (
              <FileText className="w-3.5 h-3.5 text-[#c9a84c] animate-pulse" title="Ce verset contient une note personnelle" />
            );
          })()}
        </div>

        {/* Verse Content Text (crème color, elegant Lora screen-reading look) */}
        <div 
          className="flex-1 text-luxury-text-primary font-reading pr-2" 
          style={{ 
            fontSize: `${textSize}px`, 
            lineHeight: `${lineHeight}px`,
          }}
        >
          <div>
            {textParts.map((part, index) => {
              if (part.type === 'strong') {
                return (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStrongClick(part.content);
                    }}
                    className="mx-1 px-1.5 py-0.5 bg-[#1a1712] hover:bg-[#c9a84c]/20 text-[#c9a84c] rounded font-mono text-[10px] font-bold align-super border border-[#2e2a1e] transition cursor-pointer"
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
          </div>

          {/* Elegant preview of personal note below the text */}
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

        {/* Quick bookmark/favorite immediate action button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(verse);
          }}
          className={`flex-shrink-0 p-1.5 rounded bg-white/[0.01] hover:bg-white/[0.08] transition duration-150 cursor-pointer self-start ${
            isFavorite 
              ? 'text-[#c9a84c] opacity-100' 
              : 'text-[#6b6355] hover:text-[#c9a84c] opacity-0 group-hover:opacity-100 max-md:opacity-30 focus:opacity-100'
          }`}
          title={isFavorite ? "Retirer des favoris" : "Ajout rapide aux favoris"}
        >
          <Star 
            className="w-3.5 h-3.5" 
            fill={isFavorite ? "#c9a84c" : "transparent"} 
          />
        </button>

        {/* Quick copy-to-clipboard option directly in the interface */}
        <button
          onClick={handleCopy}
          className="flex-shrink-0 p-1.5 rounded bg-white/[0.01] hover:bg-white/[0.08] text-[#6b6355] hover:text-[#c9a84c] transition duration-150 cursor-pointer self-start opacity-0 group-hover:opacity-100 max-md:opacity-30 focus:opacity-100"
          title="Copier ce verset dans le presse-papiers"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Quick aesthetic image generation button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsShareOpen(true);
          }}
          className="flex-shrink-0 p-1.5 rounded bg-white/[0.01] hover:bg-white/[0.08] text-[#6b6355] hover:text-[#c9a84c] transition duration-150 cursor-pointer self-start opacity-0 group-hover:opacity-100 max-md:opacity-30 focus:opacity-100"
          title="Créer une image esthétique du verset pour les réseaux sociaux"
        >
          <Image className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action Bar & Editor (shown right below the verse only on tap/selection) */}
      {isSelected && (
        <div className="space-y-3">
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

            {/* Visual audio voice memo block */}
            <div className="pt-2 border-t border-[#2e2a1e]/30 space-y-2 select-none">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono tracking-wider text-[#c9a84c] uppercase font-bold flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#c9a84c]" /> Réflexion vocale
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
                        Enregistrement... {Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="p-1 px-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-md text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Arrêter</span>
                    </button>
                  </div>
                  {isTranscribing && (
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#c9a84c] bg-[#1a1712] rounded px-2 py-1 border border-[#c9a84c]/20 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />
                      <span>Dictée vocale active : exprimez votre pensée spirituelle oralement...</span>
                    </div>
                  )}
                </div>
              ) : audioUrl ? (
                <div className="flex items-center justify-between bg-[#1f1a12] border border-[#2e2a1e] rounded-lg p-2 px-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={playAudio}
                      className="w-7 h-7 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c] hover:bg-[#c9a84c]/20 transition cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                    </button>
                    <div>
                      <p className="text-[11px] text-[#e8e0d0] font-sans font-medium">Réflexion audio enregistrée</p>
                      <p className="text-[9px] text-[#6b6355] font-mono uppercase">Prêt à être sauvegardé dans vos notes</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDeleteAudio}
                    className="p-1.5 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 rounded-md transition cursor-pointer"
                    title="Supprimer la réflexion vocale"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-full py-2 bg-[#17140f] hover:bg-[#201b13] border border-[#2e2a1e]/60 text-[#6b6355] hover:text-[#c9a84c] rounded-lg text-[10px] font-mono uppercase font-black tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Mic className="w-3.5 h-3.5 text-[#c9a84c]" />
                  <span>Enregistrer une réflexion vocale</span>
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

          <div className="mx-auto max-w-sm bg-[#1a1712] border border-[#2e2a1e] rounded-lg py-2 px-4 flex items-center justify-around gap-1 animate-fade-slide-up shadow-xl z-20">
            {/* Copier */}
            <button
              onClick={handleCopy}
              className="flex-1 py-1 px-2 rounded hover:bg-white/[0.04] flex items-center justify-center gap-1.5 text-xs font-bold transition duration-150 cursor-pointer text-center"
              style={{ color: copied ? '#c9a84c' : '#6b6355' }}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copié ✓</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="w-[1px] h-4 bg-[#2e2a1e]"></div>

            {/* Sauver */}
            <button
              onClick={handleSave}
              className="flex-1 py-1 px-2 rounded hover:bg-white/[0.04] flex items-center justify-center gap-1.5 text-xs font-bold transition duration-150 cursor-pointer text-center"
              style={{ color: isFavorite ? '#c9a84c' : '#6b6355' }}
            >
              <Heart className="w-3.5 h-3.5" fill={isFavorite ? '#c9a84c' : 'none'} />
              <span>{isFavorite ? 'Sauvé' : 'Sauver'}</span>
            </button>

            {/* Divider */}
            <div className="w-[1px] h-4 bg-[#2e2a1e]"></div>

            {/* Analyser */}
            <button
              onClick={handleAnalyze}
              className="flex-1 py-1 px-1.5 rounded hover:bg-white/[0.04] flex items-center justify-center gap-1 text-xs font-bold transition duration-150 cursor-pointer text-center text-[#c9a84c]"
              title="Obtenir l'analyse théologique détaillée par IA"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />
              <span>Analyser</span>
            </button>

            {/* Divider */}
            <div className="w-[1px] h-4 bg-[#2e2a1e]"></div>

            {/* Comparer */}
            <button
              onClick={handleCompare}
              className="flex-1 py-1 px-1.5 rounded hover:bg-white/[0.04] flex items-center justify-center gap-1 text-xs font-bold transition duration-150 cursor-pointer text-center text-[#c9a84c]"
              title="Comparer côte à côte différentes traductions"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#c9a84c]" />
              <span>Comparer</span>
            </button>

            {/* Divider */}
            <div className="w-[1px] h-4 bg-[#2e2a1e]"></div>

            {/* Partager */}
            <div className="relative flex-1 flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShareMenu(!showShareMenu);
                }}
                className="w-full py-1 px-2 rounded hover:bg-white/[0.04] flex items-center justify-center gap-1.5 text-xs font-bold transition duration-150 cursor-pointer text-center text-emerald-400"
                title="Options de partage"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Partager</span>
              </button>

              {/* Share Menu Dropdown */}
              {showShareMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-30 cursor-default" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowShareMenu(false);
                    }}
                  />
                  
                  <div className="absolute bottom-[130%] right-0 w-52 bg-[#16130e] border border-[#2e2a1e] rounded-xl p-1.5 shadow-2xl z-40 animate-fade-slide-up space-y-1">
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
                      onClick={(e) => {
                        e.stopPropagation();
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
