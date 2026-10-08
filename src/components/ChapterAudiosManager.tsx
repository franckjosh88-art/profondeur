import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Mic, Play, Pause, Trash2, Download, Edit3, BookOpen, Clock, 
  Calendar, Search, Filter, Volume2, Sparkles, AlertTriangle, 
  Check, X, ChevronRight, Layers, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChapterAudioMeditation, ChapterMeditation } from '../types/bible';
import { getAudioPlayableUrl, downloadAudioFile } from '../utils/audioStorage';

interface ChapterAudiosManagerProps {
  audios: ChapterAudioMeditation[];
  writtenMeditations: ChapterMeditation[];
  onNavigateToChapter: (bookId: number, chapter: number, verseNum?: number) => void;
  onNavigateToWrittenTab?: () => void;
  onDeleteAudio: (audioId: string) => Promise<void> | void;
  onRenameAudio: (audioId: string, newTitle: string) => Promise<void> | void;
}

export const ChapterAudiosManager: React.FC<ChapterAudiosManagerProps> = ({
  audios,
  writtenMeditations,
  onNavigateToChapter,
  onNavigateToWrittenTab,
  onDeleteAudio,
  onRenameAudio
}) => {
  // View mode: 'book' (group by book and chapter) or 'date' (chronological with time buckets)
  const [viewMode, setViewMode] = useState<'book' | 'date'>('book');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookFilter, setSelectedBookFilter] = useState<string>('all');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [playbackDuration, setPlaybackDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Modals state
  const [audioToDelete, setAudioToDelete] = useState<ChapterAudioMeditation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [audioToRename, setAudioToRename] = useState<ChapterAudioMeditation | null>(null);
  const [newTitleInput, setNewTitleInput] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Stop playback when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Format total counter e.g. "12 audios · 1 h 24 min"
  const totalStatsString = useMemo(() => {
    const count = audios.length;
    const totalSecs = audios.reduce((acc, a) => acc + (a.duration_seconds || 0), 0);
    const countLabel = `${count} audio${count > 1 ? 's' : ''}`;

    if (totalSecs < 60) {
      return `${countLabel} · ${Math.round(totalSecs)} s`;
    }
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);

    if (hours > 0) {
      return `${countLabel} · ${hours} h ${mins.toString().padStart(2, '0')} min`;
    }
    return `${countLabel} · ${mins} min`;
  }, [audios]);

  // List of unique books present in audios for the filter dropdown
  const availableBooks = useMemo(() => {
    const map = new Map<number, string>();
    audios.forEach(a => map.set(a.book_id, a.book_name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [audios]);

  // Filtered audios based on search query, book filter, and period filter
  const filteredAudios = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();

    return audios.filter(audio => {
      // 1. Text Search
      if (q) {
        const titleMatch = audio.title.toLowerCase().includes(q);
        const bookMatch = audio.book_name.toLowerCase().includes(q);
        const chapterMatch = `chapitre ${audio.chapter}`.includes(q) || `${audio.chapter}` === q;
        if (!titleMatch && !bookMatch && !chapterMatch) return false;
      }

      // 2. Book filter
      if (selectedBookFilter !== 'all') {
        if (audio.book_id.toString() !== selectedBookFilter) return false;
      }

      // 3. Period filter
      if (selectedPeriodFilter !== 'all') {
        const audioDate = new Date(audio.created_at);
        const diffMs = now.getTime() - audioDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (selectedPeriodFilter === 'today') {
          if (now.toDateString() !== audioDate.toDateString()) return false;
        } else if (selectedPeriodFilter === 'week') {
          if (diffDays > 7) return false;
        } else if (selectedPeriodFilter === 'month') {
          if (now.getMonth() !== audioDate.getMonth() || now.getFullYear() !== audioDate.getFullYear()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [audios, searchQuery, selectedBookFilter, selectedPeriodFilter]);

  // Playback control
  const handleTogglePlay = async (audioItem: ChapterAudioMeditation) => {
    if (playingAudioId === audioItem.id) {
      if (audioRef.current) {
        if (audioRef.current.paused) {
          audioRef.current.play();
        } else {
          audioRef.current.pause();
        }
      }
      return;
    }

    // New audio to play
    if (audioRef.current) {
      audioRef.current.pause();
    }

    try {
      const url = await getAudioPlayableUrl(audioItem.id);
      if (!url) {
        alert("Fichier audio introuvable dans le stockage local.");
        return;
      }

      const audio = new Audio(url);
      audio.playbackRate = playbackRate;
      audioRef.current = audio;
      setPlayingAudioId(audioItem.id);
      setPlaybackTime(0);
      setPlaybackDuration(audioItem.duration_seconds || 0);

      audio.ontimeupdate = () => {
        setPlaybackTime(audio.currentTime);
      };

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setPlaybackDuration(audio.duration);
        }
      };

      audio.onended = () => {
        setPlayingAudioId(null);
        setPlaybackTime(0);
      };

      audio.onerror = () => {
        console.error("Audio playback error");
        setPlayingAudioId(null);
      };

      await audio.play();
    } catch (e) {
      console.error("Error playing audio:", e);
      setPlayingAudioId(null);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setPlaybackTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleChangePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // Helper format seconds -> mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper format date & time
  const formatFullDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
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

  // Confirm delete handler
  const confirmDelete = async () => {
    if (!audioToDelete) return;
    setIsDeleting(true);
    try {
      if (playingAudioId === audioToDelete.id && audioRef.current) {
        audioRef.current.pause();
        setPlayingAudioId(null);
      }
      await onDeleteAudio(audioToDelete.id);
      setAudioToDelete(null);
    } catch (e) {
      console.error("Error deleting audio:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  // Confirm rename handler
  const confirmRename = async () => {
    if (!audioToRename || !newTitleInput.trim()) return;
    setIsRenaming(true);
    try {
      await onRenameAudio(audioToRename.id, newTitleInput.trim());
      setAudioToRename(null);
    } catch (e) {
      console.error("Error renaming audio:", e);
    } finally {
      setIsRenaming(false);
    }
  };

  // Grouped by Book and Chapter
  const groupedByBook = useMemo(() => {
    const groups: { book_id: number; book_name: string; items: ChapterAudioMeditation[] }[] = [];
    const map = new Map<number, { book_id: number; book_name: string; items: ChapterAudioMeditation[] }>();

    filteredAudios.forEach(item => {
      if (!map.has(item.book_id)) {
        map.set(item.book_id, {
          book_id: item.book_id,
          book_name: item.book_name,
          items: []
        });
      }
      map.get(item.book_id)!.items.push(item);
    });

    const sortedBookIds = Array.from(map.keys()).sort((a, b) => a - b);
    sortedBookIds.forEach(id => {
      const g = map.get(id)!;
      // Sort items by chapter asc, then date desc
      g.items.sort((a, b) => {
        if (a.chapter !== b.chapter) return a.chapter - b.chapter;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      groups.push(g);
    });

    return groups;
  }, [filteredAudios]);

  // Grouped by Date Buckets ("Aujourd'hui", "Hier", "Cette semaine", "Ce mois-ci", puis par mois)
  const groupedByDateBuckets = useMemo(() => {
    // Sort all descending
    const sorted = [...filteredAudios].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const buckets: { label: string; items: ChapterAudioMeditation[] }[] = [];
    const now = new Date();
    const todayStr = now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    // Start of current week (7 days ago)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const bucketMap = new Map<string, ChapterAudioMeditation[]>();

    sorted.forEach(item => {
      const itemDate = new Date(item.created_at);
      const itemDateStr = itemDate.toDateString();

      let key = '';
      if (itemDateStr === todayStr) {
        key = "Aujourd'hui";
      } else if (itemDateStr === yesterdayStr) {
        key = 'Hier';
      } else if (itemDate >= sevenDaysAgo) {
        key = 'Cette semaine';
      } else if (itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()) {
        key = 'Ce mois-ci';
      } else {
        const monthName = itemDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        key = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      }

      if (!bucketMap.has(key)) {
        bucketMap.set(key, []);
      }
      bucketMap.get(key)!.push(item);
    });

    bucketMap.forEach((items, label) => {
      buckets.push({ label, items });
    });

    return buckets;
  }, [filteredAudios]);

  // Helper to find associated written meditation
  const getWrittenMeditation = (bookId: number, chapter: number) => {
    return writtenMeditations.find(m => m.book_id === bookId && m.chapter === chapter);
  };

  // Render an individual Audio Card
  const renderAudioCard = (item: ChapterAudioMeditation) => {
    const isPlaying = playingAudioId === item.id && audioRef.current && !audioRef.current.paused;
    const isCurrent = playingAudioId === item.id;
    const written = getWrittenMeditation(item.book_id, item.chapter);

    return (
      <div
        key={item.id}
        className="bg-[#0e0c08] border border-[#2e2a1e] hover:border-[#c9a84c]/50 rounded-2xl p-4 sm:p-5 shadow-soft transition-all duration-200 flex flex-col justify-between group hover:shadow-[0_0_15px_rgba(201,168,76,0.12)] relative space-y-3.5"
      >
        {/* Header: Titre, Référence & Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h4 className="font-serif font-black text-sm sm:text-base text-[#f4efe2] truncate leading-tight">
              {item.title}
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => onNavigateToChapter(item.book_id, item.chapter, 1)}
                className="font-serif font-bold text-[#c9a84c] hover:text-[#ebd092] flex items-center gap-1 transition cursor-pointer bg-[#14120e] px-2 py-0.5 rounded-md border border-[#c9a84c]/30 hover:border-[#c9a84c]"
                title="Ouvrir ce chapitre dans le lecteur"
              >
                <BookOpen className="w-3 h-3 text-[#c9a84c]" />
                <span>{item.book_name} {item.chapter}</span>
              </button>

              <span className="text-[10px] font-mono text-[#8c8270] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#6b6355]" />
                <span>{formatFullDate(item.created_at)}</span>
              </span>
            </div>
          </div>

          {/* Action buttons (Rename, Download, Delete) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setAudioToRename(item);
                setNewTitleInput(item.title);
              }}
              className="p-1.5 rounded-lg text-[#6b6355] hover:text-[#c9a84c] hover:bg-[#1a1712] transition cursor-pointer"
              title="Renommer l'audio"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => downloadAudioFile(item.id, item.title)}
              className="p-1.5 rounded-lg text-[#6b6355] hover:text-[#c9a84c] hover:bg-[#1a1712] transition cursor-pointer"
              title="Télécharger l'enregistrement"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setAudioToDelete(item)}
              className="p-1.5 rounded-lg text-[#6b6355] hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
              title="Supprimer cet audio"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Audio Player Widget */}
        <div className="bg-[#050403] border border-[#2e2a1e] rounded-xl p-3 space-y-2.5">
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={() => handleTogglePlay(item)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0 ${
                isPlaying
                  ? 'bg-[#c9a84c] text-[#0d0b07] shadow-gold-glow scale-105'
                  : 'bg-[#1a1712] hover:bg-[#252017] text-[#c9a84c] hover:text-[#ebd092] border border-[#c9a84c]/30 hover:border-[#c9a84c]'
              }`}
              title={isPlaying ? "Mettre en pause" : "Écouter l'audio"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Slider & Duration */}
            <div className="flex-1 space-y-1">
              <input
                type="range"
                min={0}
                max={isCurrent ? playbackDuration || item.duration_seconds || 1 : item.duration_seconds || 1}
                step={0.1}
                value={isCurrent ? playbackTime : 0}
                readOnly={!isCurrent}
                onChange={(e) => {
                  if (isCurrent) {
                    handleSeek(e);
                  }
                }}
                className="w-full accent-[#c9a84c] h-1.5 bg-[#1a1712] rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] font-mono text-[#8c8270]">
                <span>{isCurrent ? formatTime(playbackTime) : '00:00'}</span>
                <span>{formatTime(item.duration_seconds)}</span>
              </div>
            </div>

            {/* Speed Selector (1x, 1.5x, 2x) */}
            <div className="flex items-center gap-1 border border-[#2e2a1e] rounded-lg p-0.5 bg-[#0e0c08]">
              {[1, 1.5, 2].map(rate => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleChangePlaybackRate(rate)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition cursor-pointer ${
                    playbackRate === rate
                      ? 'bg-[#c9a84c] text-[#0d0b07]'
                      : 'text-[#6b6355] hover:text-[#e8e0d0]'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Written Meditation Excerpt (if exists) */}
        {written && written.text && (
          <div className="p-2.5 rounded-xl bg-[#14120e] border border-[#2e2a1e]/70 space-y-1 text-left">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#c9a84c]">
              <span className="flex items-center gap-1 font-bold">
                <FileText className="w-3 h-3" />
                <span>Méditation écrite associée</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToWrittenTab) {
                    onNavigateToWrittenTab();
                  } else {
                    onNavigateToChapter(item.book_id, item.chapter);
                  }
                }}
                className="hover:underline cursor-pointer text-[#ebd092]"
              >
                Voir la méditation →
              </button>
            </div>
            <p className="font-serif italic text-xs text-[#c4bdae] line-clamp-2 leading-relaxed">
              « {written.text} »
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 text-left select-none max-w-4xl mx-auto">
      {/* Header Bar: Titre, Compteur Global & Toggle de vue */}
      <div className="bg-[#12100c] border border-[#2e2a1e] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c9a84c]/15 border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c] shrink-0 shadow-sm">
            <Mic className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h2 className="font-serif font-black text-base sm:text-lg text-[#f4efe2]">
              Mes Méditations Audio
            </h2>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#c9a84c] font-bold block">
              {totalStatsString}
            </span>
          </div>
        </div>

        {/* View Mode Toggle: Livre vs Date */}
        <div className="flex items-center gap-1 bg-[#060503] border border-[#2e2a1e] p-1 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setViewMode('book')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === 'book'
                ? 'bg-[#c9a84c] text-[#0d0b07] shadow-gold-glow'
                : 'text-[#6b6355] hover:text-[#e8e0d0]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Par Livre</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('date')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
              viewMode === 'date'
                ? 'bg-[#c9a84c] text-[#0d0b07] shadow-gold-glow'
                : 'text-[#6b6355] hover:text-[#e8e0d0]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Par Date</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {audios.length > 0 && (
        <div className="bg-[#12100c]/80 border border-[#2e2a1e] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-[#8c8270] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, livre ou chapitre..."
              className="w-full bg-[#060503] border border-[#2e2a1e] focus:border-[#c9a84c]/60 rounded-xl pl-8 pr-8 py-2 text-xs text-[#f4efe2] placeholder-[#6b6355] outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8c8270] hover:text-[#f4efe2] p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Book Filter Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedBookFilter}
              onChange={(e) => setSelectedBookFilter(e.target.value)}
              className="bg-[#060503] border border-[#2e2a1e] text-xs font-mono text-[#e8e0d0] rounded-xl px-3 py-2 outline-none focus:border-[#c9a84c] cursor-pointer flex-1 sm:flex-initial"
            >
              <option value="all">Tous les livres ({audios.length})</option>
              {availableBooks.map(b => (
                <option key={b.id} value={b.id.toString()}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Period Filter Dropdown */}
            <select
              value={selectedPeriodFilter}
              onChange={(e) => setSelectedPeriodFilter(e.target.value as any)}
              className="bg-[#060503] border border-[#2e2a1e] text-xs font-mono text-[#e8e0d0] rounded-xl px-3 py-2 outline-none focus:border-[#c9a84c] cursor-pointer flex-1 sm:flex-initial"
            >
              <option value="all">Toutes périodes</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">7 derniers jours</option>
              <option value="month">Ce mois-ci</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Content / Lists */}
      {audios.length === 0 ? (
        /* Empty State */
        <div className="bg-[#12100c]/70 border border-[#2e2a1e] rounded-2xl p-10 text-center space-y-4 shadow-soft">
          <div className="w-16 h-16 rounded-2xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center text-[#c9a84c] mx-auto shadow-inner">
            <Mic className="w-8 h-8 stroke-[1.5]" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="font-serif font-bold text-base text-[#f4efe2]">
              Aucun audio pour l'instant
            </h3>
            <p className="text-xs text-[#8c8270] leading-relaxed font-sans">
              Enregistrez votre première méditation après une lecture en appuyant sur le bouton « Enregistrer un audio » en bas de chapitre. Vos réflexions orales seront sauvegardées ici.
            </p>
          </div>
        </div>
      ) : filteredAudios.length === 0 ? (
        /* No results for current filter/search */
        <div className="bg-[#12100c]/70 border border-[#2e2a1e] rounded-2xl p-8 text-center space-y-2 text-[#8c8270]">
          <Search className="w-8 h-8 mx-auto opacity-40" />
          <p className="text-xs font-mono">Aucun enregistrement ne correspond à vos critères de recherche.</p>
        </div>
      ) : viewMode === 'book' ? (
        /* 1. Grouped by Book */
        <div className="space-y-6">
          {groupedByBook.map((group) => (
            <div key={group.book_id} className="space-y-3">
              <div className="flex items-center gap-2 px-1 border-b border-[#2e2a1e]/60 pb-1.5">
                <BookOpen className="w-4 h-4 text-[#c9a84c]" />
                <h3 className="font-serif font-extrabold text-sm sm:text-base text-[#c9a84c] tracking-wide">
                  {group.book_name}
                </h3>
                <span className="text-[10px] font-mono text-[#8c8270] bg-[#14120e] px-2 py-0.5 rounded-md border border-[#2e2a1e]/60">
                  {group.items.length} audio{group.items.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {group.items.map(renderAudioCard)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 2. Grouped by Date Buckets ("Aujourd'hui", "Hier", "Cette semaine", "Ce mois-ci", puis par mois) */
        <div className="space-y-6">
          {groupedByDateBuckets.map((bucket) => (
            <div key={bucket.label} className="space-y-3">
              <div className="flex items-center gap-2 px-1 border-b border-[#2e2a1e]/60 pb-1.5">
                <Calendar className="w-4 h-4 text-[#c9a84c]" />
                <h3 className="font-serif font-extrabold text-sm sm:text-base text-[#c9a84c] tracking-wide">
                  {bucket.label}
                </h3>
                <span className="text-[10px] font-mono text-[#8c8270] bg-[#14120e] px-2 py-0.5 rounded-md border border-[#2e2a1e]/60">
                  {bucket.items.length} audio{bucket.items.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {bucket.items.map(renderAudioCard)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rename Modal */}
      <AnimatePresence>
        {audioToRename && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#12100c] border border-[#c9a84c]/40 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl text-left"
            >
              <div className="flex items-center gap-3 text-[#c9a84c]">
                <div className="w-9 h-9 rounded-xl bg-[#c9a84c]/15 border border-[#c9a84c]/30 flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-black text-sm text-[#f4efe2]">
                    Renommer l'audio
                  </h4>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#8c8270] block">
                    {audioToRename.book_name} {audioToRename.chapter}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-[#8c8270] tracking-wider block">
                  Nouveau titre
                </label>
                <input
                  type="text"
                  value={newTitleInput}
                  onChange={(e) => setNewTitleInput(e.target.value)}
                  className="w-full bg-[#060503] border border-[#2e2a1e] focus:border-[#c9a84c] rounded-xl p-3 text-xs text-[#f4efe2] outline-none font-serif"
                  maxLength={100}
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setAudioToRename(null)}
                  disabled={isRenaming}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-[#8c8270] hover:text-[#f4efe2] bg-[#1a1712] border border-[#2e2a1e] cursor-pointer transition"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={confirmRename}
                  disabled={isRenaming || !newTitleInput.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-[#0d0b07] bg-[#c9a84c] hover:bg-[#ebd092] font-black cursor-pointer transition shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isRenaming ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {audioToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#12100c] border border-red-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl text-left"
            >
              <div className="flex items-center gap-3 text-red-400">
                <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-black text-sm text-[#f4efe2]">
                    Supprimer cet audio ?
                  </h4>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#8c8270] block">
                    {audioToDelete.title} · {audioToDelete.book_name} {audioToDelete.chapter}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#8c8270] leading-normal font-sans">
                Êtes-vous sûr de vouloir supprimer définitivement cet enregistrement audio ({formatTime(audioToDelete.duration_seconds)}) ? Cette action ne pourra pas être annulée.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setAudioToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-[#8c8270] hover:text-[#f4efe2] bg-[#1a1712] border border-[#2e2a1e] cursor-pointer transition"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 cursor-pointer transition shadow-md flex items-center gap-1.5"
                >
                  {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
