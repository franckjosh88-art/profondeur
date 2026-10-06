import React, { useState, useMemo } from 'react';
import { 
  BookOpen, Trash2, Calendar, Search, Sparkles, Filter, 
  Play, Pause, RefreshCw, Eye, FileText, Share2, Edit3, 
  Check, X, ChevronRight, Clock, Bookmark, Heart
} from 'lucide-react';
import { VerseNote, Verse, EmotionAnalysisResult } from '../types/bible';
import { getEmotionMeta, renderEmotionIcon, EMOTIONS_LIST } from '../utils/emotionHelpers';
import { 
  SpiritualNote, 
  migrateNote, 
  formatFullFrenchDate, 
  formatRelativeDate, 
  getModifiedLabel, 
  getMonthGroupKey, 
  DateFilterType, 
  matchesDateFilter, 
  saveSpiritualNotesToStorage,
  parseNoteContent
} from '../utils/spiritualNotes';
import { motion, AnimatePresence } from 'motion/react';

interface SpiritualNotesManagerProps {
  notes: (VerseNote | SpiritualNote)[];
  onNavigateToVerse: (bookId: number, chapter: number, verseNum: number) => void;
  onSaveNote: (verse: Verse, textNote: string, audioBase64?: string, emotionAnalysis?: EmotionAnalysisResult) => Promise<void>;
  onDeleteNote?: (noteId: string) => Promise<void>;
  onUpdateNote?: (note: SpiritualNote) => Promise<void>;
}

export const SpiritualNotesManager: React.FC<SpiritualNotesManagerProps> = ({
  notes: incomingNotes,
  onNavigateToVerse,
  onSaveNote,
  onDeleteNote,
  onUpdateNote
}) => {
  // Normalize and migrate all notes on the fly
  const migratedNotes: SpiritualNote[] = useMemo(() => {
    return incomingNotes.map(n => migrateNote(n));
  }, [incomingNotes]);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [selectedEmotionFilter, setSelectedEmotionFilter] = useState<string>('all');

  // Selected note for full details modal / drawer
  const [selectedNote, setSelectedNote] = useState<SpiritualNote | null>(null);
  
  // Note editing state inside modal
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Audio playback state
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);

  // Delete confirmation modal state
  const [noteToDelete, setNoteToDelete] = useState<SpiritualNote | null>(null);

  // Share feedback toast state
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Gemini emotion analysis tracking
  const [analyzingNoteRefs, setAnalyzingNoteRefs] = useState<string[]>([]);
  const [analysisErrors, setAnalysisErrors] = useState<Record<string, string>>({});

  // Audio Playback handler
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

  // Open note details modal
  const handleOpenNote = (note: SpiritualNote) => {
    setSelectedNote(note);
    setIsEditing(false);
    setEditTitle(note.titre);
    setEditContent(note.contenu);
  };

  // Start editing
  const handleStartEdit = () => {
    if (!selectedNote) return;
    setEditTitle(selectedNote.titre);
    setEditContent(selectedNote.contenu);
    setIsEditing(true);
  };

  // Save edited note
  const handleSaveEdit = async () => {
    if (!selectedNote) return;
    setIsSavingEdit(true);

    try {
      const nowIso = new Date().toISOString();
      const updatedNote: SpiritualNote = {
        ...selectedNote,
        titre: editTitle.trim() || selectedNote.titre,
        contenu: editContent.trim(),
        note: editContent.trim(),
        updatedAt: nowIso
      };

      if (onUpdateNote) {
        await onUpdateNote(updatedNote);
      } else if (selectedNote.book_id && selectedNote.chapter && selectedNote.verse) {
        const dummyVerse: Verse = {
          book_id: selectedNote.book_id,
          book_name: selectedNote.book_name || '',
          chapter: selectedNote.chapter,
          verse: selectedNote.verse,
          text: ''
        };
        await onSaveNote(dummyVerse, updatedNote.contenu, updatedNote.audio, updatedNote.emotion_analysis);
      }

      setSelectedNote(updatedNote);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save edited note:", err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Trigger Deletion Confirmation
  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;
    const target = noteToDelete;
    setNoteToDelete(null);

    if (selectedNote?.id === target.id) {
      setSelectedNote(null);
      setIsEditing(false);
    }

    if (onDeleteNote) {
      await onDeleteNote(target.id);
    } else if (target.book_id && target.chapter && target.verse) {
      const dummyVerse: Verse = {
        book_id: target.book_id,
        book_name: target.book_name || '',
        chapter: target.chapter,
        verse: target.verse,
        text: ''
      };
      await onSaveNote(dummyVerse, '', '');
    }
  };

  // Share Note (Clipboard / Web Share API)
  const handleShareNote = async (note: SpiritualNote) => {
    const textToShare = `📖 ${note.reference}\n« ${note.contenu} »\n\n— Note spirituelle : ${note.titre}\nEnregistrée avec Bible Profonde`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${note.reference} - Note spirituelle`,
          text: textToShare
        });
        return;
      } catch (err) {
        // User cancelled or share unavailable, fallback to clipboard
      }
    }

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(textToShare);
        setShareFeedback("Note copiée dans le presse-papier !");
        setTimeout(() => setShareFeedback(null), 3000);
      } catch (e) {
        setShareFeedback("Impossible de copier automatiquement.");
        setTimeout(() => setShareFeedback(null), 3000);
      }
    }
  };

  // Trigger Gemini AI Emotion Analysis
  const handleTriggerAnalysis = async (note: SpiritualNote) => {
    const noteId = note.id;
    setAnalyzingNoteRefs(prev => [...prev, noteId]);
    setAnalysisErrors(prev => {
      const copy = { ...prev };
      delete copy[noteId];
      return copy;
    });

    try {
      const response = await fetch('/api/gemini/analyze-emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteText: note.contenu,
          verseReference: note.reference,
        }),
      });

      if (!response.ok) {
        throw new Error("L'analyse avec l'IA a échoué. Veuillez réessayer.");
      }

      const result = await response.json() as EmotionAnalysisResult;

      if (selectedNote?.id === note.id) {
        setSelectedNote(prev => prev ? { ...prev, emotion_analysis: result } : null);
      }

      if (note.book_id && note.chapter && note.verse) {
        const dummyVerse: Verse = {
          book_id: note.book_id,
          book_name: note.book_name || '',
          chapter: note.chapter,
          verse: note.verse,
          text: ''
        };
        await onSaveNote(dummyVerse, note.contenu, note.audio || '', result);
      }
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

  // Filter notes
  const filteredNotes = useMemo(() => {
    return migratedNotes.filter(note => {
      // 1. Date Filter
      if (!matchesDateFilter(note, dateFilter)) return false;

      // 2. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refMatch = note.reference.toLowerCase().includes(q);
        const titleMatch = note.titre.toLowerCase().includes(q);
        const contentMatch = note.contenu.toLowerCase().includes(q);
        const catMatch = note.categorie?.toLowerCase().includes(q);
        if (!refMatch && !titleMatch && !contentMatch && !catMatch) return false;
      }

      // 3. Emotion Filter
      if (selectedEmotionFilter !== 'all') {
        const meta = getEmotionMeta(note.emotion_analysis?.detectedEmotion);
        if (meta.key !== selectedEmotionFilter) return false;
      }

      return true;
    });
  }, [migratedNotes, dateFilter, searchQuery, selectedEmotionFilter]);

  // Group notes by Month (newest month first, and newest note first within month)
  const monthlyGroups = useMemo(() => {
    const groupsMap = new Map<string, { key: string; label: string; timestamp: number; notes: SpiritualNote[] }>();

    filteredNotes.forEach(note => {
      const iso = note.updatedAt || note.createdAt;
      const meta = getMonthGroupKey(iso);
      if (!groupsMap.has(meta.key)) {
        groupsMap.set(meta.key, {
          key: meta.key,
          label: meta.label,
          timestamp: meta.timestamp,
          notes: []
        });
      }
      groupsMap.get(meta.key)!.notes.push(note);
    });

    // Sort notes inside each group: newest updated first
    groupsMap.forEach(group => {
      group.notes.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt).getTime() || 0;
        const timeB = new Date(b.updatedAt || b.createdAt).getTime() || 0;
        return timeB - timeA;
      });
    });

    // Return groups array sorted by month timestamp descending
    return Array.from(groupsMap.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredNotes]);

  return (
    <div className="w-full space-y-4 max-w-full text-left">
      {/* 1. HEADER MODULE */}
      <div className="bg-[#12100c] border border-[#c9a84c]/20 p-4 sm:p-5 rounded-[12px] relative overflow-hidden select-none">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#c9a84c]/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-[#c9a84c]/3 rounded-full blur-xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-[9px] font-mono tracking-[0.25em] text-[#c9a84c] uppercase font-black block mb-1">
              JOURNAL SPIRITUEL
            </span>
            <h2 className="font-serif font-black text-base sm:text-lg text-[#e8e0d0] tracking-wide uppercase">
              Notes de Méditation & Études
            </h2>
            <p className="text-xs text-[#a0947f] font-sans leading-relaxed mt-0.5 max-w-xl">
              Chaque pensée gravée lors de vos méditations et lectures bibliques, soigneusement datée et ordonnée dans votre sanctuaire.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0 mt-1 sm:mt-0">
            <div className="px-3 py-1.5 bg-[#0a0805] border border-[#c9a84c]/25 rounded-[12px] flex items-center gap-2">
              <span className="text-[10px] font-mono text-[#8c8270] uppercase">Total :</span>
              <span className="font-mono font-bold text-xs text-[#c9a84c]">{migratedNotes.length} notes</span>
            </div>
          </div>
        </div>

        {/* Global Toast Alert for share or actions */}
        <AnimatePresence>
          {shareFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-3 p-2 bg-[#c9a84c]/15 border border-[#c9a84c]/40 text-[#f0e8d8] text-xs font-mono rounded-lg flex items-center gap-2"
            >
              <Check className="w-3.5 h-3.5 text-[#c9a84c]" />
              <span>{shareFeedback}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. CONTROLS BAR: SEARCH & DATE FILTER */}
      <div className="bg-[#12100c] border border-[#c9a84c]/15 p-3 rounded-[12px] space-y-3">
        {/* Search Input Box - 100% full width on mobile */}
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6b6355]">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par verset, titre, mot-clé ou thème..."
            className="w-full pl-9 pr-8 py-2 bg-[#0a0805] border border-[#2e2a1e] rounded-[10px] text-xs text-[#e8e0d0] placeholder-[#6b6355] focus:outline-none focus:border-[#c9a84c]/60 transition font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6b6355] hover:text-[#e8e0d0]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#2e2a1e]/40 select-none">
          <span className="text-[9px] font-mono text-[#8c8270] uppercase font-bold mr-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#c9a84c]" /> Période :
          </span>

          <button
            onClick={() => setDateFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition cursor-pointer ${
              dateFilter === 'all'
                ? 'bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/50 font-bold'
                : 'bg-[#0a0805] text-[#8c8270] border border-[#2e2a1e] hover:text-[#e8e0d0]'
            }`}
          >
            Tout
          </button>

          <button
            onClick={() => setDateFilter('today')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition cursor-pointer ${
              dateFilter === 'today'
                ? 'bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/50 font-bold'
                : 'bg-[#0a0805] text-[#8c8270] border border-[#2e2a1e] hover:text-[#e8e0d0]'
            }`}
          >
            Aujourd'hui
          </button>

          <button
            onClick={() => setDateFilter('week')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition cursor-pointer ${
              dateFilter === 'week'
                ? 'bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/50 font-bold'
                : 'bg-[#0a0805] text-[#8c8270] border border-[#2e2a1e] hover:text-[#e8e0d0]'
            }`}
          >
            Cette semaine
          </button>

          <button
            onClick={() => setDateFilter('month')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition cursor-pointer ${
              dateFilter === 'month'
                ? 'bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/50 font-bold'
                : 'bg-[#0a0805] text-[#8c8270] border border-[#2e2a1e] hover:text-[#e8e0d0]'
            }`}
          >
            Ce mois
          </button>
        </div>
      </div>

      {/* 3. NOTES LIST GROUPED BY MONTH */}
      <div className="space-y-6">
        {filteredNotes.length === 0 ? (
          /* Robust Empty State with encouraging message */
          <div className="bg-[#12100c] border border-[#c9a84c]/20 p-8 sm:p-12 text-center rounded-[12px] select-none flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c]">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="font-serif font-black text-sm sm:text-base text-[#e8e0d0] uppercase tracking-wider">
                {searchQuery || dateFilter !== 'all' 
                  ? "Aucune note ne correspond à ces critères"
                  : "Votre carnet spirituel attend votre première note"}
              </p>
              <p className="text-xs text-[#a0947f] font-sans max-w-md mx-auto leading-relaxed">
                {searchQuery || dateFilter !== 'all' 
                  ? "Essayez de modifier votre terme de recherche ou d'élargir la période sélectionnée."
                  : "« Garde ton cœur plus que toute autre chose, car de lui jaillissent les sources de la vie. » (Proverbes 4:23). Prenez un instant pour méditer un verset et graver vos pensées spirituelles."}
              </p>
            </div>
            {(searchQuery || dateFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter('all');
                  setSelectedEmotionFilter('all');
                }}
                className="px-3 py-1.5 bg-[#0a0805] border border-[#c9a84c]/30 hover:border-[#c9a84c] text-[#c9a84c] rounded-[10px] text-[10px] font-mono uppercase tracking-wider transition cursor-pointer mt-2"
              >
                Réinitialiser la recherche
              </button>
            )}
          </div>
        ) : (
          /* Render Each Month Group */
          monthlyGroups.map((group) => (
            <div key={group.key} className="space-y-3">
              {/* Month Group Header */}
              <div className="flex items-center gap-2 px-1 select-none">
                <span className="w-2 h-2 rounded-full bg-[#c9a84c]/70"></span>
                <h3 className="font-serif font-black text-sm uppercase text-[#c9a84c] tracking-wider">
                  {group.label}
                </h3>
                <span className="text-[10px] font-mono text-[#8c8270] uppercase">
                  ({group.notes.length})
                </span>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-[#c9a84c]/30 to-transparent ml-2"></div>
              </div>

              {/* Cards List in Full Width (Single column for optimal mobile 375px reading) */}
              <div className="grid grid-cols-1 gap-2.5">
                {group.notes.map((note) => {
                  const relativeDate = formatRelativeDate(note.updatedAt || note.createdAt);
                  const modifiedInfo = getModifiedLabel(note.createdAt, note.updatedAt);
                  const isNotePlaying = playingNoteId === note.id;

                  return (
                    <motion.div
                      key={note.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => handleOpenNote(note)}
                      className="bg-[#12100c] border border-[#c9a84c]/20 hover:border-[#c9a84c]/50 p-3.5 rounded-[12px] flex flex-col space-y-2 cursor-pointer transition duration-150 group relative overflow-hidden select-none"
                    >
                      {/* Top Row: Reference in bold gold + Date & Time on the right */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <span className="font-serif font-black text-sm text-[#c9a84c] group-hover:text-[#e8cb75] transition block truncate">
                            {note.reference}
                          </span>
                          <h4 className="font-serif font-semibold text-xs text-[#e8e0d0] truncate">
                            {note.titre}
                          </h4>
                        </div>

                        {/* Date and Time in small monospace grey */}
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-mono text-[#8c8270] group-hover:text-[#a0947f] transition block">
                            {relativeDate}
                          </span>
                          {note.categorie && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[8px] font-mono uppercase text-[#c9a84c]/80 bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded">
                              {note.categorie}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content Preview: max 2 lines with ellipsis, clean text without JSON */}
                      <p className="text-xs text-[#c2b7a3] font-serif leading-relaxed line-clamp-2 pl-0.5">
                        {note.contenu || "(Note vide ou enregistrement audio uniquement)"}
                      </p>

                      {/* Bottom Micro Details: Voice Memo icon or Modified tag */}
                      <div className="flex items-center justify-between pt-1 border-t border-[#2e2a1e]/40 text-[9px] font-mono text-[#8c8270]">
                        <div className="flex items-center gap-2">
                          {note.audio && (
                            <span className="flex items-center gap-1 text-[#c9a84c]">
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>Mémo vocal</span>
                            </span>
                          )}
                          {note.emotion_analysis?.detectedEmotion && (
                            <span className="flex items-center gap-1 text-[#a0947f]">
                              <Sparkles className="w-2.5 h-2.5 text-[#c9a84c]" />
                              <span>{note.emotion_analysis.detectedEmotion}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[#8c8270] group-hover:text-[#c9a84c] transition">
                          <span>Détails</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. FULL NOTE MODAL (ON CLICK ON A CARD) */}
      <AnimatePresence>
        {selectedNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-[#12100c] border border-[#c9a84c]/40 rounded-[12px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-left relative"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-[#2e2a1e] bg-[#0c0a07] flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <span className="font-serif font-black text-base text-[#c9a84c] block tracking-wide">
                    {selectedNote.reference}
                  </span>
                  {!isEditing ? (
                    <h3 className="font-serif font-bold text-sm text-[#e8e0d0] leading-snug">
                      {selectedNote.titre}
                    </h3>
                  ) : (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Titre de la note..."
                      className="w-full bg-[#17140f] border border-[#c9a84c]/40 rounded px-2.5 py-1 text-xs text-[#e8e0d0] font-serif focus:outline-none focus:border-[#c9a84c]"
                    />
                  )}
                  {/* Clean French Date */}
                  <div className="space-y-0.5 pt-0.5">
                    <span className="text-[10px] font-mono text-[#8c8270] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#c9a84c]" />
                      {formatFullFrenchDate(selectedNote.createdAt || selectedNote.updatedAt)}
                    </span>
                    {getModifiedLabel(selectedNote.createdAt, selectedNote.updatedAt) && (
                      <span className="text-[9px] font-mono text-[#a0947f] italic block">
                        {getModifiedLabel(selectedNote.createdAt, selectedNote.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedNote(null);
                    setIsEditing(false);
                  }}
                  className="p-1.5 text-[#8c8270] hover:text-[#e8e0d0] hover:bg-[#201b13] rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 overflow-y-auto space-y-4 flex-1 scroller-thin">
                {isEditing ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-[#8c8270] uppercase">
                      Texte de la note spirituelle :
                    </label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Contenu de votre note..."
                      className="w-full h-44 bg-[#0a0805] border border-[#2e2a1e] rounded-[10px] p-3 text-xs text-[#e8e0d0] font-serif leading-relaxed focus:outline-none focus:border-[#c9a84c] resize-none"
                    />
                  </div>
                ) : (
                  <div className="bg-[#0a0805] border border-[#2e2a1e] rounded-[10px] p-3.5 space-y-2">
                    <p className="font-serif text-xs sm:text-sm text-[#e8e0d0] leading-relaxed whitespace-pre-wrap">
                      {selectedNote.contenu || "(Aucun texte rédigé pour cette note)"}
                    </p>
                  </div>
                )}

                {/* Voice Audio Memo if present */}
                {selectedNote.audio && (
                  <div className="bg-[#17140f] border border-[#2e2a1e] rounded-[10px] p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePlayAudio(selectedNote.id, selectedNote.audio!)}
                        className="w-8 h-8 rounded-full bg-[#c9a84c]/15 border border-[#c9a84c]/40 flex items-center justify-center text-[#c9a84c] hover:bg-[#c9a84c]/30 transition cursor-pointer"
                      >
                        {playingNoteId === selectedNote.id ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>
                      <div>
                        <span className="text-xs text-[#e8e0d0] font-sans font-medium block">
                          Mémo vocal spirituel
                        </span>
                        <span className="text-[9px] font-mono text-[#8c8270] uppercase">
                          Enregistrement audio lié
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Emotion Resonance if present */}
                {selectedNote.emotion_analysis && (
                  <div className="bg-[#17140f] border border-[#c9a84c]/20 rounded-[10px] p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-[#c9a84c] uppercase font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#c9a84c]" />
                        Résonance : {selectedNote.emotion_analysis.detectedEmotion}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#b8af9e] italic font-sans leading-relaxed">
                      {selectedNote.emotion_analysis.emotionalSummary}
                    </p>
                    {selectedNote.emotion_analysis.pastoralEncouragement && (
                      <p className="text-[10px] text-[#c9a84c]/90 font-serif border-t border-[#2e2a1e]/40 pt-1.5 mt-1.5">
                        « {selectedNote.emotion_analysis.pastoralEncouragement} »
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer with Actions: Modifier, Supprimer, Partager, Ouvrir */}
              <div className="p-3 border-t border-[#2e2a1e] bg-[#0c0a07] flex flex-wrap items-center justify-between gap-2">
                {isEditing ? (
                  <div className="flex items-center justify-end gap-2 w-full">
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={isSavingEdit}
                      className="px-3 py-1.5 rounded-lg border border-[#2e2a1e] text-[#8c8270] hover:text-[#e8e0d0] text-xs font-mono transition cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit}
                      className="px-3.5 py-1.5 rounded-lg bg-[#c9a84c] hover:bg-[#b0913e] text-[#0a0805] text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSavingEdit ? "Enregistrement..." : "Enregistrer"}</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      {/* Bouton Modifier */}
                      <button
                        onClick={handleStartEdit}
                        className="px-2.5 py-1.5 bg-[#17140f] hover:bg-[#201b13] border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#c9a84c] rounded-[8px] text-[10.5px] font-mono uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                        title="Modifier le titre ou le contenu de cette note"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Modifier</span>
                      </button>

                      {/* Bouton Partager */}
                      <button
                        onClick={() => handleShareNote(selectedNote)}
                        className="px-2.5 py-1.5 bg-[#17140f] hover:bg-[#201b13] border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#e8e0d0] rounded-[8px] text-[10.5px] font-mono uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                        title="Partager ou copier cette note"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Partager</span>
                      </button>

                      {/* Bouton Supprimer */}
                      <button
                        onClick={() => setNoteToDelete(selectedNote)}
                        className="p-1.5 text-[#8c8270] hover:text-rose-400 hover:bg-rose-500/10 rounded-[8px] transition cursor-pointer"
                        title="Supprimer cette note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Naviguer dans le texte biblique si lié */}
                    {selectedNote.book_id && selectedNote.chapter && selectedNote.verse && (
                      <button
                        onClick={() => {
                          onNavigateToVerse(selectedNote.book_id!, selectedNote.chapter!, selectedNote.verse!);
                          setSelectedNote(null);
                        }}
                        className="px-3 py-1.5 bg-[#c9a84c]/15 hover:bg-[#c9a84c]/25 border border-[#c9a84c]/40 text-[#c9a84c] rounded-[8px] text-[10.5px] font-mono uppercase font-bold tracking-wider transition cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Lire le verset</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. CONFIRMATION DE SUPPRESSION (ROBUSTESSE) */}
      <AnimatePresence>
        {noteToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-[#12100c] border border-rose-500/30 rounded-[12px] p-5 shadow-2xl text-left space-y-3"
            >
              <div className="flex items-center gap-2 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h4 className="font-serif font-black text-sm uppercase text-[#e8e0d0]">
                  Confirmer la suppression
                </h4>
              </div>
              <p className="text-xs text-[#a0947f] font-sans leading-relaxed">
                Voulez-vous vraiment supprimer la note spirituelle sur <strong className="text-[#c9a84c] font-serif">{noteToDelete.reference}</strong> ? Cette action est irréversible.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2e2a1e]">
                <button
                  onClick={() => setNoteToDelete(null)}
                  className="px-3 py-1.5 rounded-lg border border-[#2e2a1e] text-[#8c8270] hover:text-[#e8e0d0] text-xs font-mono transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDeleteNote}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition cursor-pointer"
                >
                  Supprimer définitivement
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
