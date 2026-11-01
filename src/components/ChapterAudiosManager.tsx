import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Mic, Play, Pause, Trash2, Download, Edit3, BookOpen, Clock, 
  Calendar, Search, Filter, Volume2, Sparkles, AlertTriangle, 
  Check, X, ChevronRight, Layers, FileText, Cloud, CloudUpload, 
  HardDrive, Loader2, CheckCircle, RefreshCw, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChapterAudioMeditation, ChapterMeditation } from '../types/bible';
import { getAudioPlayableUrl, downloadAudioFile } from '../utils/audioStorage';

// Helper format date & time
export const formatFullDate = (isoStr: string): string => {
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

// Helper to get formatted sync date for tooltip: 'Synchronisé le [date]' or 'En attente de synchronisation'
export const getSyncTooltip = (item: ChapterAudioMeditation, isMissing = false): string => {
  if (isMissing) {
    return "Fichier manquant, ré-importer";
  }
  if (item.is_cloud_synced) {
    const syncDate = item.synced_at || item.created_at;
    if (syncDate) {
      try {
        const d = new Date(syncDate);
        if (!isNaN(d.getTime())) {
          const formattedDate = d.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
          const formattedTime = d.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          });
          return `Synchronisé le ${formattedDate} à ${formattedTime}`;
        }
      } catch (_) {}
      const fallback = formatFullDate(syncDate);
      if (fallback) return `Synchronisé le ${fallback}`;
    }
    return 'Synchronisé';
  }
  return 'En attente de synchronisation';
};

import { SyncStatusIcon as AudioStatusTooltip } from './chapter-audios/SyncStatusIcon';
import { ChapterAudioItem } from './chapter-audios/ChapterAudioItem';
import { ChapterAudiosFilterBar } from './chapter-audios/ChapterAudiosFilterBar';
import { AudioRenameModal } from './chapter-audios/AudioRenameModal';
import { AudioDeleteModal } from './chapter-audios/AudioDeleteModal';
import { ChapterAudiosListView } from './chapter-audios/ChapterAudiosListView';
import { ChapterAudiosHeader } from './chapter-audios/ChapterAudiosHeader';
import { groupAudiosByBook, groupAudiosByDate } from '../utils/audioGrouping';

interface ChapterAudiosManagerProps {
  audios: ChapterAudioMeditation[];
  writtenMeditations: ChapterMeditation[];
  onNavigateToChapter: (bookId: number, chapter: number, verseNum?: number) => void;
  onNavigateToWrittenTab?: () => void;
  onDeleteAudio: (audioId: string) => Promise<void> | void;
  onRenameAudio: (audioId: string, newTitle: string) => Promise<void> | void;
  onSyncAllToCloud?: () => Promise<void>;
  onSyncSingleAudio?: (audio: ChapterAudioMeditation) => Promise<void>;
  isSyncingCloud?: boolean;
  syncProgress?: { current: number; total: number; title: string } | null;
  userId?: string | null;
}

export const ChapterAudiosManager: React.FC<ChapterAudiosManagerProps> = ({
  audios,
  writtenMeditations,
  onNavigateToChapter,
  onNavigateToWrittenTab,
  onDeleteAudio,
  onRenameAudio,
  onSyncAllToCloud,
  onSyncSingleAudio,
  isSyncingCloud = false,
  syncProgress = null,
  userId = null
}) => {
  // View mode: 'book' (group by book and chapter) or 'date' (chronological with time buckets)
  const [viewMode, setViewMode] = useState<'book' | 'date'>('book');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookFilter, setSelectedBookFilter] = useState<string>('all');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedSyncFilter, setSelectedSyncFilter] = useState<'all' | 'synced' | 'local' | 'missing'>('all');

  // Audio Playback State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [missingAudioIds, setMissingAudioIds] = useState<Set<string>>(new Set());
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [playbackDuration, setPlaybackDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [playbackErrorMessage, setPlaybackErrorMessage] = useState<string | null>(null);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);
  const [syncingSingleId, setSyncingSingleId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Modals state
  const [audioToDelete, setAudioToDelete] = useState<ChapterAudioMeditation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [audioToRename, setAudioToRename] = useState<ChapterAudioMeditation | null>(null);
  const [newTitleInput, setNewTitleInput] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Handler for manual migration of all local audios to Cloud Storage
  const handleTriggerSyncAll = async () => {
    if (!onSyncAllToCloud || isSyncingCloud) return;
    try {
      await onSyncAllToCloud();
      setSyncSuccessToast("Tous vos fichiers audios ont été synchronisés avec succès dans Cloud Storage !");
      setTimeout(() => setSyncSuccessToast(null), 4000);
    } catch (e: any) {
      setPlaybackErrorMessage(`Erreur lors de la synchronisation : ${e?.message || 'Erreur inconnue'}`);
    }
  };

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

  const syncedCount = useMemo(() => {
    return audios.filter(a => a.is_cloud_synced && !missingAudioIds.has(a.id)).length;
  }, [audios, missingAudioIds]);

  const unsyncedCount = useMemo(() => {
    return audios.filter(a => !a.is_cloud_synced).length;
  }, [audios]);

  const missingCount = useMemo(() => {
    return audios.filter(a => missingAudioIds.has(a.id)).length;
  }, [audios, missingAudioIds]);

  // List of unique books present in audios for the filter dropdown
  const availableBooks = useMemo(() => {
    const map = new Map<number, string>();
    audios.forEach(a => map.set(a.book_id, a.book_name));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [audios]);

  // Filtered audios based on search query, book filter, period filter, and sync status filter
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

      // 4. Sync status filter
      if (selectedSyncFilter === 'synced') {
        if (!audio.is_cloud_synced || missingAudioIds.has(audio.id)) return false;
      } else if (selectedSyncFilter === 'local') {
        if (audio.is_cloud_synced) return false;
      } else if (selectedSyncFilter === 'missing') {
        if (!missingAudioIds.has(audio.id)) return false;
      }

      return true;
    });
  }, [audios, searchQuery, selectedBookFilter, selectedPeriodFilter, selectedSyncFilter, missingAudioIds]);

  // Playback control
  const handleTogglePlay = async (audioItem: ChapterAudioMeditation) => {
    setPlaybackErrorMessage(null);

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
      setLoadingAudioId(audioItem.id);
      // Fetch playable URL resolving local IndexedDB first, with automatic server streaming & Cloud Firestore chunk download
      const url = await getAudioPlayableUrl(audioItem.id, audioItem, userId);
      if (!url) {
        setLoadingAudioId(null);
        setMissingAudioIds(prev => new Set(prev).add(audioItem.id));
        setPlaybackErrorMessage(`Fichier manquant, ré-importer : l'enregistrement « ${audioItem.title} » est introuvable sur le stockage permanent.`);
        return;
      }

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;
      audio.src = url;
      audio.playbackRate = playbackRate;
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
        setLoadingAudioId(null);
        setPlaybackErrorMessage("Erreur lors de la lecture du fichier audio. Format ou connexion incompatible.");
      };

      await audio.play();
      setLoadingAudioId(null);
    } catch (e: any) {
      console.error("Error playing audio:", e);
      setPlayingAudioId(null);
      setLoadingAudioId(null);
      setPlaybackErrorMessage("Impossible de démarrer la lecture : " + (e?.message || "Erreur de chargement."));
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
  const groupedByBook = useMemo(() => groupAudiosByBook(filteredAudios), [filteredAudios]);

  // Grouped by Date Buckets ("Aujourd'hui", "Hier", "Cette semaine", "Ce mois-ci", puis par mois)
  const groupedByDateBuckets = useMemo(() => groupAudiosByDate(filteredAudios), [filteredAudios]);

  // Helper to find associated written meditation
  const getWrittenMeditation = (bookId: number, chapter: number) => {
    return writtenMeditations.find(m => m.book_id === bookId && m.chapter === chapter);
  };

  // Render an individual Audio Card using extracted ChapterAudioItem
  const renderAudioCard = (item: ChapterAudioMeditation) => {
    const isPlaying = playingAudioId === item.id && audioRef.current && !audioRef.current.paused;
    const isCurrent = playingAudioId === item.id;
    const written = getWrittenMeditation(item.book_id, item.chapter);

    return (
      <ChapterAudioItem
        key={item.id}
        item={item}
        written={written}
        isPlaying={!!isPlaying}
        isCurrent={isCurrent}
        isLoading={loadingAudioId === item.id}
        isMissing={missingAudioIds.has(item.id)}
        playbackTime={playbackTime}
        playbackDuration={playbackDuration}
        playbackRate={playbackRate}
        syncingSingleId={syncingSingleId}
        isSyncingCloud={isSyncingCloud}
        userId={userId}
        onNavigateToChapter={onNavigateToChapter}
        onNavigateToWrittenTab={onNavigateToWrittenTab}
        onTogglePlay={handleTogglePlay}
        onSeek={handleSeek}
        onChangePlaybackRate={handleChangePlaybackRate}
        onOpenRename={(it) => {
          setAudioToRename(it);
          setNewTitleInput(it.title);
        }}
        onDownload={async (it) => {
          const res = await downloadAudioFile(it.id, it.title, it, userId);
          if (!res.success) {
            if (res.missing) {
              setMissingAudioIds(prev => new Set(prev).add(it.id));
              setPlaybackErrorMessage(`Fichier manquant, ré-importer : l'enregistrement « ${it.title} » n'est plus présent dans le stockage permanent. Veuillez le ré-enregistrer ou le synchroniser depuis l'appareil d'origine.`);
            } else {
              setPlaybackErrorMessage(`Erreur de téléchargement : ${res.error || 'Erreur inconnue'}`);
            }
          }
        }}
        onOpenDelete={(it) => setAudioToDelete(it)}
        onSyncSingleAudio={onSyncSingleAudio ? async (it) => {
          setSyncingSingleId(it.id);
          try {
            await onSyncSingleAudio(it);
            setSyncSuccessToast(`Audio « ${it.title} » sauvegardé en ligne !`);
            setTimeout(() => setSyncSuccessToast(null), 3000);
          } catch (e: any) {
            setPlaybackErrorMessage(`Erreur de synchronisation : ${e?.message || 'Erreur inconnue'}`);
          } finally {
            setSyncingSingleId(null);
          }
        } : undefined}
        formatFullDate={formatFullDate}
        formatTime={formatTime}
      />
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
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setSelectedSyncFilter('all')}
                className={`text-xs font-mono uppercase tracking-widest px-2 py-0.5 rounded-md transition cursor-pointer ${
                  selectedSyncFilter === 'all'
                    ? 'text-[#ebd092] bg-[#c9a84c]/20 ring-1 ring-[#c9a84c] font-bold'
                    : 'text-[#c9a84c] hover:bg-[#1a1712] font-semibold'
                }`}
                title="Afficher tous les enregistrements"
                aria-label="Afficher tous les enregistrements"
              >
                {totalStatsString}
              </button>
              <span className="text-[#3d3727] text-xs hidden sm:inline">•</span>
              <button
                type="button"
                onClick={() => setSelectedSyncFilter(prev => prev === 'synced' ? 'all' : 'synced')}
                className={`inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-md border transition cursor-pointer ${
                  selectedSyncFilter === 'synced'
                    ? 'text-emerald-300 bg-emerald-500/25 border-emerald-400 ring-2 ring-emerald-500/50 font-bold'
                    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
                title="Cliquer pour afficher uniquement les audios synchronisés dans le Cloud"
                aria-label={`Filtrer par audios synchronisés dans le Cloud (${syncedCount})`}
                aria-pressed={selectedSyncFilter === 'synced'}
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>{syncedCount} Cloud</span>
              </button>
              {unsyncedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSyncFilter(prev => prev === 'local' ? 'all' : 'local')}
                  className={`inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-md border transition cursor-pointer ${
                    selectedSyncFilter === 'local'
                      ? 'text-amber-300 bg-amber-500/25 border-amber-400 ring-2 ring-amber-500/50 font-bold'
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'
                  }`}
                  title="Cliquer pour afficher uniquement les audios non synchronisés locaux (en attente de migration)"
                  aria-label={`Filtrer par audios non synchronisés locaux (${unsyncedCount})`}
                  aria-pressed={selectedSyncFilter === 'local'}
                >
                  <CloudUpload className="w-3.5 h-3.5 text-amber-400" />
                  <span>{unsyncedCount} local{unsyncedCount > 1 ? 's' : ''}</span>
                </button>
              )}
              {missingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSyncFilter(prev => prev === 'missing' ? 'all' : 'missing')}
                  className={`inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-md border transition cursor-pointer ${
                    selectedSyncFilter === 'missing'
                      ? 'text-rose-300 bg-rose-500/25 border-rose-400 ring-2 ring-rose-500/50 font-bold'
                      : 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20'
                  }`}
                  title="Cliquer pour afficher uniquement les fichiers manquants"
                  aria-label={`Filtrer par fichiers manquants (${missingCount})`}
                  aria-pressed={selectedSyncFilter === 'missing'}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>{missingCount} manquant{missingCount > 1 ? 's' : ''}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Actions Area: Bouton "Synchroniser tout" & Toggle de mode */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onSyncAllToCloud && audios.length > 0 && (
            <button
              type="button"
              onClick={handleTriggerSyncAll}
              disabled={isSyncingCloud}
              className={`px-3.5 py-2 rounded-xl text-xs font-serif font-bold flex items-center gap-2 transition cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed ${
                unsyncedCount > 0
                  ? 'bg-gradient-to-r from-[#c9a84c] to-[#ebd092] text-[#0d0b07] shadow-gold-glow hover:brightness-105 active:scale-95'
                  : 'bg-[#181510] hover:bg-[#221e16] border border-[#c9a84c]/50 text-[#c9a84c] hover:border-[#c9a84c]'
              }`}
              title={
                isSyncingCloud
                  ? "Synchronisation vers Cloud Storage en cours..."
                  : unsyncedCount > 0
                  ? `Synchroniser ${unsyncedCount} fichier(s) localement vers Cloud Storage`
                  : "Tous vos audios sont synchronisés (cliquez pour vérifier)"
              }
            >
              {isSyncingCloud ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synchronisation...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span>Synchroniser tout</span>
                  {unsyncedCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#0d0b07]/25 text-[#0d0b07]">
                      {unsyncedCount}
                    </span>
                  )}
                </>
              )}
            </button>
          )}

          {/* Quick Sync Filter Toggle: Tous / Cloud / Locaux */}
          {audios.length > 0 && (
            <div className="flex items-center gap-1 bg-[#060503] border border-[#2e2a1e] p-1 rounded-xl w-fit" role="group" aria-label="Filtre rapide de synchronisation">
              <button
                type="button"
                onClick={() => setSelectedSyncFilter('all')}
                className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                  selectedSyncFilter === 'all'
                    ? 'bg-[#c9a84c] text-[#0d0b07] shadow-gold-glow'
                    : 'text-[#6b6355] hover:text-[#e8e0d0]'
                }`}
                title="Afficher tous les enregistrements"
                aria-label={`Afficher tous les enregistrements (${audios.length})`}
                aria-pressed={selectedSyncFilter === 'all'}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tous</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSyncFilter(prev => prev === 'synced' ? 'all' : 'synced')}
                className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                  selectedSyncFilter === 'synced'
                    ? 'bg-emerald-500 text-black font-extrabold shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                    : 'text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10'
                }`}
                title={`Afficher uniquement les audios synchronisés dans le Cloud (${syncedCount})`}
                aria-label={`Filtrer par audios synchronisés Cloud (${syncedCount})`}
                aria-pressed={selectedSyncFilter === 'synced'}
              >
                <CheckCircle className="w-3.5 h-3.5 text-current" />
                <span>Cloud ({syncedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSyncFilter(prev => prev === 'local' ? 'all' : 'local')}
                className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                  selectedSyncFilter === 'local'
                    ? 'bg-amber-500 text-black font-extrabold shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                    : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
                }`}
                title={`Afficher uniquement les audios locaux non synchronisés (${unsyncedCount})`}
                aria-label={`Filtrer par audios locaux non synchronisés (${unsyncedCount})`}
                aria-pressed={selectedSyncFilter === 'local'}
              >
                <CloudUpload className="w-3.5 h-3.5 text-current" />
                <span>Locaux ({unsyncedCount})</span>
              </button>
            </div>
          )}

          {/* View Mode Toggle: Livre vs Date */}
          <div className="flex items-center gap-1 bg-[#060503] border border-[#2e2a1e] p-1 rounded-xl w-fit" role="group" aria-label="Mode d'affichage">
            <button
              type="button"
              onClick={() => setViewMode('book')}
              className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
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
              className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
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
      </div>

      {/* Indicateur visuel de progression globale de la synchronisation vers Cloud Storage */}
      {isSyncingCloud && (
        <div className="bg-gradient-to-r from-[#211a0d] via-[#1a150a] to-[#14120e] border border-[#c9a84c]/60 rounded-2xl p-4 sm:p-5 shadow-[0_4px_30px_rgba(201,168,76,0.18)] space-y-3 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#c9a84c]/20 border border-[#c9a84c]/40 flex items-center justify-center text-[#c9a84c] shrink-0">
                <Loader2 className="w-4 h-4 animate-spin text-[#c9a84c]" />
              </div>
              <div className="min-w-0">
                <h4 className="font-serif font-bold text-sm text-[#f4efe2] flex items-center gap-2">
                  <span>Migration vers Cloud Storage en cours</span>
                  <span className="inline-block w-2 h-2 rounded-full bg-[#c9a84c] animate-pulse" />
                </h4>
                {syncProgress?.title ? (
                  <p className="text-xs text-[#a89f8c] truncate max-w-sm sm:max-w-lg">
                    Transfert en cours : <span className="text-[#ebd092] font-medium">{syncProgress.title}</span>
                  </p>
                ) : (
                  <p className="text-xs text-[#a89f8c]">
                    Préparation du transfert et téléversement des fichiers audio...
                  </p>
                )}
              </div>
            </div>

            {/* Compteur chiffré et pourcentage */}
            {syncProgress && syncProgress.total > 0 ? (
              <div className="text-right sm:shrink-0 font-mono text-xs text-[#c9a84c] font-bold bg-[#0d0b07]/50 px-3 py-1.5 rounded-xl border border-[#c9a84c]/30">
                <span>{syncProgress.current} / {syncProgress.total}</span>
                <span className="text-[#ebd092] ml-1.5">
                  ({Math.round((syncProgress.current / syncProgress.total) * 100)}%)
                </span>
              </div>
            ) : (
              <div className="text-right sm:shrink-0 font-mono text-xs text-[#c9a84c] font-medium">
                Initialisation...
              </div>
            )}
          </div>

          {/* Barre visuelle de progression */}
          <div className="w-full bg-[#0a0805] rounded-full h-2.5 overflow-hidden border border-[#2e2a1e] p-0.5">
            <div
              className="bg-gradient-to-r from-[#c9a84c] via-[#ebd092] to-[#c9a84c] h-full rounded-full transition-all duration-300 shadow-gold-glow"
              style={{
                width: syncProgress && syncProgress.total > 0
                  ? `${Math.max(6, Math.min(100, Math.round((syncProgress.current / syncProgress.total) * 100)))}%`
                  : '20%'
              }}
            />
          </div>
        </div>
      )}

      {/* Playback Error Toast */}
      {playbackErrorMessage && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-3 flex items-start justify-between gap-3 text-red-200 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{playbackErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setPlaybackErrorMessage(null)}
            className="text-red-400 hover:text-red-200 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sync Success Toast */}
      {syncSuccessToast && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 flex items-start justify-between gap-3 text-emerald-200 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncSuccessToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncSuccessToast(null)}
            className="text-emerald-400 hover:text-emerald-200 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Cloud Migration & Sync Banner if unsynced items exist */}
      {unsyncedCount > 0 && (
        <div className="bg-gradient-to-r from-[#211a0d] to-[#14120e] border border-[#c9a84c]/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c9a84c]/20 border border-[#c9a84c]/40 flex items-center justify-center text-[#c9a84c] shrink-0 mt-0.5 sm:mt-0">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-sm text-[#f4efe2]">
                {unsyncedCount} audio{unsyncedCount > 1 ? 's' : ''} à sauvegarder en ligne
              </h4>
              <p className="text-xs text-[#a89f8c] leading-relaxed">
                Sauvegardez vos enregistrements dans le stockage en ligne pour pouvoir les écouter sur votre iPhone, Android ou tout autre appareil.
              </p>
              {isSyncingCloud && syncProgress && (
                <div className="mt-2.5 space-y-1.5 w-full max-w-md">
                  <div className="text-[11px] font-mono text-[#c9a84c] flex items-center justify-between">
                    <span className="flex items-center gap-1.5 truncate">
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span className="truncate">Envoi : {syncProgress.title}</span>
                    </span>
                    <span className="shrink-0 ml-2">
                      {syncProgress.current}/{syncProgress.total} ({Math.round((syncProgress.current / syncProgress.total) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#14120e] rounded-full h-1.5 overflow-hidden border border-[#2e2a1e]">
                    <div 
                      className="bg-gradient-to-r from-[#c9a84c] to-[#ebd092] h-full transition-all duration-300"
                      style={{ width: `${Math.round((syncProgress.current / syncProgress.total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {onSyncAllToCloud && (
            <button
              type="button"
              disabled={isSyncingCloud}
              onClick={handleTriggerSyncAll}
              className="px-4 py-2.5 rounded-xl text-xs font-serif font-bold bg-[#c9a84c] hover:bg-[#ebd092] text-[#0d0b07] flex items-center gap-2 transition cursor-pointer shadow-gold-glow shrink-0 disabled:opacity-50"
            >
              {isSyncingCloud ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synchronisation...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  <span>Synchroniser tout</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Filter and Search Bar using extracted ChapterAudiosFilterBar */}
      {audios.length > 0 && (
        <ChapterAudiosFilterBar
          audios={audios}
          filteredAudiosCount={filteredAudios.length}
          selectedSyncFilter={selectedSyncFilter}
          setSelectedSyncFilter={setSelectedSyncFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedBookFilter={selectedBookFilter}
          setSelectedBookFilter={setSelectedBookFilter}
          selectedPeriodFilter={selectedPeriodFilter}
          setSelectedPeriodFilter={setSelectedPeriodFilter}
          availableBooks={availableBooks}
          unsyncedCount={unsyncedCount}
          syncedCount={syncedCount}
          missingCount={missingCount}
          onSyncAllToCloud={handleTriggerSyncAll}
          isSyncingCloud={isSyncingCloud}
        />
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
      ) : (
        <ChapterAudiosListView
          filteredAudios={filteredAudios}
          viewMode={viewMode}
          selectedSyncFilter={selectedSyncFilter}
          unsyncedCount={unsyncedCount}
          syncedCount={syncedCount}
          isSyncingCloud={isSyncingCloud}
          onSyncAllToCloud={onSyncAllToCloud ? handleTriggerSyncAll : undefined}
          onResetFilters={() => {
            setSearchQuery('');
            setSelectedBookFilter('all');
            setSelectedPeriodFilter('all');
            setSelectedSyncFilter('all');
          }}
          onSelectSyncFilter={setSelectedSyncFilter}
          groupedByBook={groupedByBook}
          groupedByDateBuckets={groupedByDateBuckets}
          renderAudioCard={renderAudioCard}
        />
      )}

      {/* Rename Modal */}
      <AudioRenameModal
        audio={audioToRename}
        newTitleInput={newTitleInput}
        setNewTitleInput={setNewTitleInput}
        isRenaming={isRenaming}
        onClose={() => setAudioToRename(null)}
        onConfirm={confirmRename}
      />

      {/* Delete Confirmation Modal */}
      <AudioDeleteModal
        audio={audioToDelete}
        isDeleting={isDeleting}
        onClose={() => setAudioToDelete(null)}
        onConfirm={confirmDelete}
        formatTime={formatTime}
      />
    </div>
  );
};

