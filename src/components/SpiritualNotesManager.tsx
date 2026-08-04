import React, { useState } from 'react';
import { 
  BookOpen, Trash2, Calendar, Search, Sparkles, Filter, Play, Pause, RefreshCw, Eye, FileText
} from 'lucide-react';
import { VerseNote, Verse, EmotionAnalysisResult } from '../types/bible';
import { getEmotionMeta, renderEmotionIcon, EMOTIONS_LIST } from '../utils/emotionHelpers';
import { motion, AnimatePresence } from 'motion/react';

interface SpiritualNotesManagerProps {
  notes: VerseNote[];
  onNavigateToVerse: (bookId: number, chapter: number, verseNum: number) => void;
  onSaveNote: (verse: Verse, textNote: string, audioBase64?: string, emotionAnalysis?: EmotionAnalysisResult) => Promise<void>;
}

export const SpiritualNotesManager: React.FC<SpiritualNotesManagerProps> = ({
  notes,
  onNavigateToVerse,
  onSaveNote
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmotionFilter, setSelectedEmotionFilter] = useState<string>('all');
  
  // Local state for tracking note-specific audio playbacks
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  
  // Local states for on-the-fly emotion analyses triggered in this component
  const [analyzingNoteRefs, setAnalyzingNoteRefs] = useState<string[]>([]);
  const [analysisErrors, setAnalysisErrors] = useState<Record<string, string>>({});

  // Helper to handle note audio playback
  const handlePlayAudio = (noteId: string, audioBase64: string) => {
    if (playingNoteId === noteId && audioPlayer) {
      audioPlayer.pause();
      setPlayingNoteId(null);
    } else {
      if (audioPlayer) {
        audioPlayer.pause();
      }
      const player = new Audio(audioBase64);
      player.onended = () => setPlayingNoteId(null);
      player.play().catch(err => {
        console.error("Audio playback error:", err);
      });
      setAudioPlayer(player);
      setPlayingNoteId(noteId);
    }
  };

  // Helper to trigger Gemini emotion analysis for a note directly
  const handleTriggerAnalysis = async (note: VerseNote) => {
    const noteId = `${note.book_id}_${note.chapter}_${note.verse}`;
    setAnalyzingNoteRefs(prev => [...prev, noteId]);
    setAnalysisErrors(prev => {
      const copy = { ...prev };
      delete copy[noteId];
      return copy;
    });

    try {
      const verseRef = `${note.book_name} ${note.chapter}:${note.verse}`;
      const response = await fetch('/api/gemini/analyze-emotion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteText: note.note,
          verseReference: verseRef,
        }),
      });

      if (!response.ok) {
        throw new Error("L'analyse avec l'IA a échoué. Veuillez réessayer.");
      }

      const result = await response.json() as EmotionAnalysisResult;
      
      // Save it using parent's onSaveNote
      const dummyVerse: Verse = {
        book_id: note.book_id,
        book_name: note.book_name,
        chapter: note.chapter,
        verse: note.verse,
        text: '' // This placeholder ok because handleSaveSpiritualNote fetches by id anyway
      };
      
      await onSaveNote(dummyVerse, note.note, note.audio || '', result);
    } catch (err: any) {
      console.error(err);
      setAnalysisErrors(prev => ({
        ...prev,
        [noteId]: err.message || "Impossible de joindre le service d'Intelligence Artificielle."
      }));
    } finally {
      setAnalyzingNoteRefs(prev => prev.filter(id => id !== noteId));
    }
  };

  // Trigger deletion of note
  const handleDeleteNote = async (note: VerseNote) => {
    if (confirm("Voulez-vous vraiment supprimer cette note spirituelle ainsi que ses analyses et mémo audio associés ?")) {
      const dummyVerse: Verse = {
        book_id: note.book_id,
        book_name: note.book_name,
        chapter: note.chapter,
        verse: note.verse,
        text: ''
      };
      // Send blank values to trigger deletion path
      await onSaveNote(dummyVerse, '', '');
    }
  };

  // Calculate stats
  const totalNotesCount = notes.length;
  
  const emotionStats = EMOTIONS_LIST.reduce<Record<string, number>>((acc, em) => {
    acc[em.key] = 0;
    return acc;
  }, { 'meditation': 0 });

  notes.forEach(note => {
    if (note.emotion_analysis?.detectedEmotion) {
      const meta = getEmotionMeta(note.emotion_analysis.detectedEmotion);
      emotionStats[meta.key] = (emotionStats[meta.key] || 0) + 1;
    } else {
      emotionStats['meditation'] += 1;
    }
  });

  // Filter notes
  const filteredNotes = notes.filter(note => {
    // 1. Text search
    const textMatch = 
      note.note.toLowerCase().includes(searchQuery.toLowerCase()) || 
      note.book_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${note.chapter}:${note.verse}`.includes(searchQuery);
      
    if (!textMatch) return false;

    // 2. Emotion filter
    if (selectedEmotionFilter === 'all') return true;
    
    const meta = getEmotionMeta(note.emotion_analysis?.detectedEmotion);
    return meta.key === selectedEmotionFilter;
  });

  // Sort notes by date updated (newest first)
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return dateB - dateA;
  });

  // Formatter for readable French dates
  const formatDate = (isoStr: string | undefined) => {
    if (!isoStr) return "Date indéterminée";
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return "Format inconnu";
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. HEADER HERO MODULE */}
      <div className="bg-[#12100c] border border-[#c9a84c]/20 p-5 rounded-[1.8rem] relative overflow-hidden text-center select-none shadow-gold-glow">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#c9a84c]/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-[#c9a84c]/3 rounded-full blur-xl pointer-events-none"></div>
        
        <span className="text-[9px] font-mono tracking-[0.25em] text-[#c9a84c] uppercase font-black block mb-1">
          CARNET SACRÉ
        </span>
        <h2 className="font-serif font-black text-lg md:text-xl text-[#e8e0d0] tracking-wide uppercase">
          Journal d'Études & Harmonisation Spirituelle
        </h2>
        <p className="text-xs text-[#a0947f] font-sans leading-relaxed max-w-xl mx-auto mt-1">
          Consultez, recherchez et analysez la tonalité émotionnelle de vos notes d'études. L'Harmonie Émotionnelle IA classe vos résonances pour refléter l'état spirituel de votre âme.
        </p>

        {/* CLIMATE STATE METRIC SPLIT BAR */}
        {totalNotesCount > 0 && (
          <div className="mt-5 pt-4 border-t border-[#2e2a1e]/40 space-y-3">
            <span className="text-[8.5px] font-mono uppercase tracking-[0.15em] text-[#6b6355] block">
              État Émotionnel Actuel de Votre Âme
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5 justify-center">
              {/* Every Emotion Stat Button */}
              <button
                onClick={() => setSelectedEmotionFilter('all')}
                className={`py-1.5 px-2.5 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer text-center ${
                  selectedEmotionFilter === 'all' 
                    ? 'bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c]/50 font-bold' 
                    : 'bg-[#0f0d0a] text-[#6b6355] border-[#2e2a1e]/60 hover:text-[#e8e0d0] hover:border-[#6b6355]'
                }`}
              >
                <span className="text-[14px] leading-tight flex items-center h-4 font-mono font-bold">
                  {totalNotesCount}
                </span>
                <span className="text-[8px] font-mono uppercase tracking-wider mt-0.5">Tous</span>
              </button>

              {EMOTIONS_LIST.map((em) => {
                const count = emotionStats[em.key] || 0;
                return (
                  <button
                    key={em.key}
                    onClick={() => setSelectedEmotionFilter(em.key)}
                    className={`py-1.5 px-2 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer text-center ${
                      selectedEmotionFilter === em.key 
                        ? `${em.badgeBg} ${em.colorClass} ${em.borderClass} font-bold ring-1 ring-current/20` 
                        : 'bg-[#0f0d0a] text-[#6b6355] border-[#2e2a1e]/60 hover:text-[#e8e0d0] hover:border-[#6b6355]'
                    }`}
                  >
                    <span className="text-[12px] leading-none flex items-center gap-1">
                      {renderEmotionIcon(em.iconName, `w-3 h-3 ${count > 0 ? em.colorClass : 'text-[#6b6355]'}`)}
                      <span className="font-mono text-[9px] font-extrabold">{count}</span>
                    </span>
                    <span className="text-[7.5px] font-mono tracking-wide truncate max-w-full uppercase mt-1">
                      {em.label.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. CONTROLS BAR: SEARCH & DETAILED FILTER SLIDER */}
      <div className="bg-[#12100c] border border-[#2e2a1e] p-3 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search Input Box */}
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6b6355]">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une référence ou un mot-clé..."
            className="w-full pl-9 pr-4 py-2 bg-[#0d0b07] border border-[#2e2a1e] rounded-xl text-xs text-[#e8e0d0] placeholder-[#6b6355] focus:outline-none focus:border-[#c9a84c] transition"
          />
        </div>

        {/* Compact filters row if not shown in stats bar */}
        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <span className="text-[9px] font-mono text-[#6b6355] uppercase font-bold flex items-center gap-1 select-none">
            <Filter className="w-3 h-3" /> Climat :
          </span>
          <select
            value={selectedEmotionFilter}
            onChange={(e) => setSelectedEmotionFilter(e.target.value)}
            className="bg-[#0f0d0a] border border-[#2e2a1e] text-[10.5px] font-mono text-[#e8e0d0] focus:border-[#c9a84c] rounded-lg px-2 py-1 outline-none cursor-pointer"
          >
            <option value="all">Tous les climats</option>
            {EMOTIONS_LIST.map(em => (
              <option key={em.key} value={em.key}>{em.label}</option>
            ))}
            <option value="meditation">Méditation (Non analysé)</option>
          </select>
        </div>
      </div>

      {/* 3. CORE NOTES CARDS LIST */}
      <div className="space-y-4">
        {sortedNotes.length === 0 ? (
          <div className="bg-[#0c0a08] border border-[#2e2a1e]/40 p-12 text-center rounded-2xl select-none flex flex-col items-center justify-center space-y-3">
            <Sparkles className="w-8 h-8 text-[#6b6355]" />
            <div className="space-y-1">
              <p className="font-serif font-black text-sm text-[#e8e0d0] uppercase tracking-wider">
                Aucune note spirituelle trouvée
              </p>
              <p className="text-xs text-[#6b6355] font-sans max-w-sm leading-relaxed">
                {searchQuery || selectedEmotionFilter !== 'all' 
                  ? "Aucun résultat ne correspond aux filtres de recherche programmés. Essayez d'élargir votre requête." 
                  : "Le grimoire de vos notes est encore vierge. Rejoignez le lecteur biblique et touchez n'importe quel verset pour lui adosser une pensée ou une réflexion vocale."}
              </p>
            </div>
            {(searchQuery || selectedEmotionFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedEmotionFilter('all');
                }}
                className="px-3.5 py-1.5 bg-[#1a1712] border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#c9a84c] rounded-xl text-[9px] font-mono uppercase tracking-wider transition cursor-pointer mt-1"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {sortedNotes.map((note) => {
                const noteId = `${note.book_id}_${note.chapter}_${note.verse}`;
                const isAnalyzing = analyzingNoteRefs.includes(noteId);
                const isNotePlaying = playingNoteId === noteId;
                const errorText = analysisErrors[noteId];
                const meta = getEmotionMeta(note.emotion_analysis?.detectedEmotion);
                
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    key={noteId}
                    className="bg-[#12100c] border border-[#2e2a1e] hover:border-[#c9a84c]/20 p-4 rounded-2xl flex flex-col justify-between space-y-3.5 transition duration-200 group text-left relative overflow-hidden"
                  >
                    {/* Golden glow decoration */}
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#c9a84c]/2 rounded-full blur-xl pointer-events-none"></div>

                    {/* Card Top: Reference + Date */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <button
                          onClick={() => onNavigateToVerse(note.book_id, note.chapter, note.verse)}
                          className="font-serif font-black text-sm text-[#c9a84c] hover:text-[#dbb858] transition uppercase cursor-pointer flex items-center gap-1 select-none"
                          title="Ouvrir ce chapitre dans l'Étude Bible"
                        >
                          <span>📖 {note.book_name} {note.chapter}:{note.verse}</span>
                          <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition duration-150 text-[#6b6355]" />
                        </button>
                        <span className="text-[8.5px] font-mono text-[#6b6355] uppercase flex items-center gap-1 select-none">
                          <Calendar className="w-2.5 h-2.5 text-[#6b6355]" />
                          Mis à jour : {formatDate(note.updated_at)}
                        </span>
                      </div>

                      {/* Emotion Indicator Pill */}
                      {note.emotion_analysis?.detectedEmotion ? (
                        <div className={`flex items-center gap-1.5 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${meta.badgeBg} ${meta.colorClass} ${meta.borderClass} select-none`}>
                          {renderEmotionIcon(meta.iconName, "w-2.5 h-2.5")}
                          <span>{note.emotion_analysis.detectedEmotion}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#6b6355] px-2 py-0.5 rounded-full border border-[#2e2a1e]/80 select-none bg-black/10">
                          <FileText className="w-2.5 h-2.5" />
                          <span>Non Analysé</span>
                        </div>
                      )}
                    </div>

                    {/* Card Body: The Written Reflection Note */}
                    <div className="flex-1 bg-[#0c0a08]/50 p-3 border border-[#2e2a1e]/40 rounded-xl relative">
                      <p className="font-serif italic text-xs leading-relaxed text-[#c9a84c]/90">
                        « {note.note || "(Note spirituelle vocale uniquement)"} »
                      </p>
                      
                      {/* Detailed pastoral analysis advice beneath note text, collapsible on demand or elegant small teaser */}
                      {note.emotion_analysis && (
                        <div className="mt-2.5 pt-2 border-t border-[#2e2a1e]/20 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[7.5px] font-mono text-[#6b6355] uppercase tracking-widest block select-none">
                              RÉSONANCE DE L'ÂME · IA
                            </span>
                            <span className="px-1.5 py-0.5 text-[6.5px] font-mono font-bold uppercase tracking-widest text-[#c9a84c] bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded select-none">
                              Analyse générée par IA — à vérifier
                            </span>
                          </div>
                          <p className="text-[10px] leading-relaxed text-[#b8af9e] italic font-sans pl-1.5 border-l border-[#c9a84c]/20">
                            {note.emotion_analysis.emotionalSummary}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Embed Voice Audio Memo Player if exists */}
                    {note.audio && (
                      <div className="flex items-center justify-between bg-[#19150f] border border-[#2e2a1e] rounded-xl p-2 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePlayAudio(noteId, note.audio!)}
                            className="w-7 h-7 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c] hover:bg-[#c9a84c]/25 transition cursor-pointer"
                          >
                            {isNotePlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
                          </button>
                          <div>
                            <span className="text-[10px] text-[#e8e0d0] block font-sans font-medium">Réflexion vocale sacrée</span>
                            <span className="text-[7.5px] font-mono text-[#6b6355] uppercase">Enregistrement audio disponible</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Analysis Error Alert */}
                    {errorText && (
                      <div className="p-2 bg-rose-500/5 border border-rose-500/20 text-rose-400 text-[9.5px] rounded-lg">
                        ⚠️ {errorText}
                      </div>
                    )}

                    {/* Card Actions Footer block */}
                    <div className="pt-2 border-t border-[#2e2a1e]/30 flex items-center justify-between gap-2.5 mt-auto">
                      <div>
                        {/* Trigger AI analyses on-the-fly */}
                        {note.note && !note.emotion_analysis && (
                          <button
                            disabled={isAnalyzing}
                            onClick={() => handleTriggerAnalysis(note)}
                            className="inline-flex items-center gap-1 text-[9px] font-mono uppercase font-black text-[#c9a84c] hover:text-[#dbb858] transition cursor-pointer disabled:opacity-50"
                          >
                            {isAnalyzing ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Analyse active...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3" />
                                <span>Analyser climat spirituel</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Recalculate or update existing analysis */}
                        {note.note && note.emotion_analysis && (
                          <button
                            disabled={isAnalyzing}
                            onClick={() => handleTriggerAnalysis(note)}
                            className="inline-flex items-center gap-1 text-[8px] font-mono uppercase text-[#6b6355] hover:text-[#c9a84c] transition cursor-pointer disabled:opacity-50"
                          >
                            {isAnalyzing ? (
                              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-2.5 h-2.5" />
                            )}
                            <span>Mettre à jour l'analyse</span>
                          </button>
                        )}
                      </div>

                      {/* Delete actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onNavigateToVerse(note.book_id, note.chapter, note.verse)}
                          className="px-2.5 py-1 bg-[#1a1712] border border-[#2e2a1e] hover:border-[#c9a84c]/40 rounded-lg text-[9px] font-mono uppercase tracking-wider text-[#c9a84c] cursor-pointer hover:bg-[#201b13] transition"
                        >
                          Étudier
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note)}
                          className="p-1 text-[#6b6355] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Supprimer la note spirituelle de manière irrévocable"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
