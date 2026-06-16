import React, { useState, useEffect } from 'react';
import { Copy, Sparkles, Heart, Check, FileText, Share2, ArrowRightLeft, Mic, Square, Play, Pause, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Verse } from '../types/bible';
import { VerseShareModal } from './VerseShareModal';

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
  onSaveNote: (verse: Verse, noteText: string, audioBase64?: string) => void;
  isCurrentSpoken?: boolean;
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
  onSaveNote,
  isCurrentSpoken = false
}) => {
  const [copied, setCopied] = useState(false);
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
    };
  }, [audioPlayer, durationInterval]);

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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
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
          {hasNote && (
            <FileText className="w-3.5 h-3.5 text-[#c9a84c] animate-pulse" title="Ce verset contient une note personnelle" />
          )}
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
                <p className="text-[11.5px] text-[#c9a84c]/85 italic">« {noteText} »</p>
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
                    )}
                  </button>
                  <span className="text-[8px] font-mono text-[#6b6355] uppercase">Vocale personnelle</span>
                </div>
              )}
            </div>
          )}
        </div>
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
              <span className="text-[9px] font-mono tracking-wider text-[#c9a84c] uppercase font-bold flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-[#c9a84c]" /> Réflexion vocale
              </span>

              {recording ? (
                <div className="flex items-center justify-between bg-rose-500/5 border border-rose-500/20 rounded-lg p-2 px-3 animate-pulse">
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsShareOpen(true);
              }}
              className="flex-1 py-1 px-2 rounded hover:bg-white/[0.04] flex items-center justify-center gap-1.5 text-xs font-bold transition duration-150 cursor-pointer text-center text-emerald-400"
              title="Créer une image stylisée de ce verset pour vos réseaux sociaux"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Partager</span>
            </button>
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
