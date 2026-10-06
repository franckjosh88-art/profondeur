import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dices, BookOpen, Heart, Copy, Check, Share2, Sparkles, 
  Volume2, VolumeX, X, RotateCw, Pause, Play, FileText, 
  ChevronRight, Compass, Flame, Sun, Bookmark
} from 'lucide-react';
import { 
  LocalVerseItem, RandomVerseFilterType, getRandomLocalVerse, 
  getMeditationForVerse, VerseMeditationContent 
} from '../data/bibleData';
import { Verse, BookmarkFolder } from '../types/bible';
import { VerseShareModal } from './VerseShareModal';
import { 
  SpiritualNote, 
  loadSpiritualNotesFromStorage, 
  saveSpiritualNotesToStorage, 
  formatFullFrenchDate 
} from '../utils/spiritualNotes';

interface MeditationCardProps {
  onClose?: () => void;
  onNavigateToScripture: (bookId: number, chapter: number, verseNum?: number) => void;
  isVerseFavorite?: (bookId: number, chapter: number, verse: number) => boolean;
  onToggleFavorite?: (verse: Verse) => void;
  onSaveNote?: (verse: Verse, noteText: string, fullNote?: any) => void;
  initialFilter?: RandomVerseFilterType;
  bookmarkFolders?: BookmarkFolder[];
}

export const MeditationCard: React.FC<MeditationCardProps> = ({
  onClose,
  onNavigateToScripture,
  isVerseFavorite,
  onToggleFavorite,
  onSaveNote,
  initialFilter = 'all',
  bookmarkFolders
}) => {
  const [filter, setFilter] = useState<RandomVerseFilterType>(initialFilter as RandomVerseFilterType);
  const [currentVerse, setCurrentVerse] = useState<LocalVerseItem>(() => getRandomLocalVerse((initialFilter as RandomVerseFilterType) || 'all'));
  const [meditation, setMeditation] = useState<VerseMeditationContent>(() => getMeditationForVerse(currentVerse));
  const [activeTab, setActiveTab] = useState<'heart' | 'insight' | 'prayer' | 'silence'>('heart');
  const [copied, setCopied] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  
  // Note editor states
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [savedDateFormatted, setSavedDateFormatted] = useState<string>('');

  // Audio Speech (TTS) states
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 60-Second Meditation Silence Timer
  const [timerActive, setTimerActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [breathPhase, setBreathPhase] = useState<'inspire' | 'hold' | 'expire'>('inspire');

  // Load new meditation whenever verse changes
  useEffect(() => {
    setMeditation(getMeditationForVerse(currentVerse));
    setShowNoteEditor(false);
    setNoteContent('');
    setNoteSaved(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [currentVerse]);

  // Breathing timer loop
  useEffect(() => {
    let interval: any = null;
    if (timerActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, secondsLeft]);

  // Breath rhythm animation (4s in, 4s hold, 4s out)
  useEffect(() => {
    if (!timerActive) return;
    const cycle = (60 - secondsLeft) % 12;
    if (cycle < 4) setBreathPhase('inspire');
    else if (cycle < 8) setBreathPhase('hold');
    else setBreathPhase('expire');
  }, [secondsLeft, timerActive]);

  const handleDrawRandomVerse = (targetFilter: RandomVerseFilterType = filter) => {
    const nextVerse = getRandomLocalVerse(targetFilter);
    setCurrentVerse(nextVerse);
  };

  const handleFilterChange = (newFilter: RandomVerseFilterType) => {
    setFilter(newFilter);
    handleDrawRandomVerse(newFilter);
  };

  const isFavorite = isVerseFavorite 
    ? isVerseFavorite(currentVerse.book_id, currentVerse.chapter, currentVerse.verse)
    : false;

  const handleToggleFav = () => {
    if (onToggleFavorite) {
      const v: Verse = {
        book_id: currentVerse.book_id,
        book_name: currentVerse.book_name,
        chapter: currentVerse.chapter,
        verse: currentVerse.verse,
        text: currentVerse.text,
      };
      onToggleFavorite(v);
    }
  };

  const handleCopyCitation = () => {
    const cleanText = currentVerse.text.replace(/\[[HG]\d+\]/g, '').trim();
    const citation = `📖 « ${cleanText} »\n— ${currentVerse.book_name} ${currentVerse.chapter}:${currentVerse.verse} (LSG 1910)\n\n🙏 Prière : ${meditation.guidedPrayer}\n\nÉtudié avec Bible Profonde`;
    navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInReader = () => {
    if (onClose) onClose();
    onNavigateToScripture(currentVerse.book_id, currentVerse.chapter, currentVerse.verse);
  };

  const handleSavePersonalNote = (finishMeditation = false) => {
    if (!noteContent.trim() && !finishMeditation) return;
    const nowIso = new Date().toISOString();
    const reference = `${currentVerse.book_name} ${currentVerse.chapter}:${currentVerse.verse}`;
    const titre = noteTitle.trim() || `Méditation sur ${reference}`;
    const contenu = noteContent.trim() || `Méditation accomplie sur ${reference}. Thème : ${meditation.theme}`;

    const noteObject: SpiritualNote = {
      id: `note_${currentVerse.book_id}_${currentVerse.chapter}_${currentVerse.verse}_${Date.now()}`,
      reference,
      titre,
      contenu,
      createdAt: nowIso,
      updatedAt: nowIso,
      book_id: currentVerse.book_id,
      book_name: currentVerse.book_name,
      chapter: currentVerse.chapter,
      verse: currentVerse.verse,
      note: contenu
    };

    // Save in localStorage immediately
    try {
      const currentNotes = loadSpiritualNotesFromStorage();
      const filtered = currentNotes.filter(n => !(n.book_id === currentVerse.book_id && n.chapter === currentVerse.chapter && n.verse === currentVerse.verse));
      saveSpiritualNotesToStorage([noteObject, ...filtered]);
    } catch (e) {
      console.error("Storage error:", e);
    }

    if (onSaveNote) {
      const v: Verse = {
        book_id: currentVerse.book_id,
        book_name: currentVerse.book_name,
        chapter: currentVerse.chapter,
        verse: currentVerse.verse,
        text: currentVerse.text,
      };
      onSaveNote(v, contenu, noteObject);
    }

    setSavedDateFormatted(formatFullFrenchDate(nowIso));
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 3500);

    if (finishMeditation && onClose) {
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  const handleToggleSpeak = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanVerse = currentVerse.text.replace(/\[[HG]\d+\]/g, '');
    const toSpeak = `${currentVerse.book_name}, chapitre ${currentVerse.chapter}, verset ${currentVerse.verse}. ${cleanVerse}. Méditation : ${meditation.contemplationPrompt}. Prière : ${meditation.guidedPrayer}`;

    const utterance = new SpeechSynthesisUtterance(toSpeak);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.92; // Slightly contemplative pace

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const verseObjForShare: Verse = {
    book_id: currentVerse.book_id,
    book_name: currentVerse.book_name,
    chapter: currentVerse.chapter,
    verse: currentVerse.verse,
    text: currentVerse.text,
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#0a0805] text-[#e8e0d0] border border-[#c9a84c]/30 rounded-2xl sm:rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(201,168,76,0.12)] overflow-hidden flex flex-col font-sans select-none relative animate-fade-slide-up">
      
      {/* SACRED GLOW & TOP ACCENT */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-20 bg-[#c9a84c]/15 blur-3xl pointer-events-none rounded-full" />
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent opacity-80" />

      {/* HEADER BAR */}
      <header className="px-4 sm:px-6 py-3.5 border-b border-[#2e2a1e]/80 flex items-center justify-between bg-[#100d08]/90 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#c9a84c]/15 border border-[#c9a84c]/30 flex items-center justify-center text-[#c9a84c] shadow-inner">
            <Dices className="w-4 h-4 animate-spin-once" />
          </div>
          <div>
            <h2 className="font-serif font-black text-xs uppercase tracking-[0.2em] text-[#c9a84c]">
              Méditation Sacrée
            </h2>
            <p className="text-[9px] font-mono text-[#8c8270] uppercase tracking-wider">
              Verset au hasard de la base locale
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleDrawRandomVerse(filter)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a1712] hover:bg-[#c9a84c]/20 border border-[#2e2a1e] hover:border-[#c9a84c]/50 text-[#c9a84c] text-[10px] font-mono uppercase tracking-wider transition cursor-pointer active:scale-95"
            title="Tirer un autre verset"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Autre Verset</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/[0.06] text-[#8c8270] hover:text-[#e8e0d0] transition cursor-pointer"
              title="Fermer la carte"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* FILTER SEGMENTED CONTROLS (NO PILL SLOP) */}
      <div className="px-4 sm:px-6 py-2 border-b border-[#2e2a1e]/60 bg-[#0d0b07] flex items-center gap-1 overflow-x-auto no-scrollbar">
        <span className="text-[8px] font-mono uppercase tracking-widest text-[#6b6355] mr-1 shrink-0">
          Source :
        </span>
        {[
          { id: 'all', label: 'Toute la Bible (9 680)' },
          { id: 'pentateuque', label: 'Pentateuque' },
          { id: 'historique', label: 'Historiques' },
          { id: 'sagesse', label: 'Psaumes & Sagesse' },
          { id: 'evangiles', label: 'Évangiles' },
          { id: 'epitre', label: 'Épîtres' },
        ].map(item => {
          const isActive = filter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleFilterChange(item.id as RandomVerseFilterType)}
              className={`px-2.5 py-1 rounded-lg text-[9.5px] font-mono uppercase tracking-wider shrink-0 transition-all cursor-pointer border ${
                isActive
                  ? 'bg-[#c9a84c]/15 text-[#c9a84c] border-[#c9a84c]/50 font-bold shadow-sm'
                  : 'bg-[#14110b] text-[#8c8270] hover:text-[#e8e0d0] border-[#2e2a1e] hover:border-[#c9a84c]/30'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* CORE VERSE CARD CONTENT */}
      <div className="p-5 sm:p-7 space-y-5 text-left relative z-10 flex-1 overflow-y-auto max-h-[70vh] no-scrollbar">
        
        {/* Book & Passage Reference Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#2e2a1e]/40 pb-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#8c8270] block">
              {currentVerse.testament === 'NT' ? 'Nouveau Testament' : 'Ancien Testament'} · {currentVerse.category.toUpperCase()}
            </span>
            <h3 className="font-serif font-black text-lg sm:text-xl text-[#c9a84c] tracking-wide">
              {currentVerse.book_name} {currentVerse.chapter}:{currentVerse.verse}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Audio Recitation button */}
            <button
              onClick={handleToggleSpeak}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isSpeaking 
                  ? 'bg-[#c9a84c] text-[#0d0b07] border-[#c9a84c] animate-pulse'
                  : 'bg-[#17140f] hover:bg-[#c9a84c]/15 text-[#c9a84c] border-[#2e2a1e]'
              }`}
              title={isSpeaking ? "Arrêter la lecture audio" : "Écouter la récitation du verset"}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Favorite button */}
            <button
              onClick={handleToggleFav}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isFavorite 
                  ? 'bg-[#c9a84c]/20 text-[#c9a84c] border-[#c9a84c] shadow-[0_0_12px_rgba(201,168,76,0.3)]' 
                  : 'bg-[#17140f] hover:bg-[#c9a84c]/15 text-[#8c8270] hover:text-[#c9a84c] border-[#2e2a1e]'
              }`}
              title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-[#c9a84c]' : ''}`} />
            </button>

            {/* Copy button */}
            <button
              onClick={handleCopyCitation}
              className="p-2 rounded-xl bg-[#17140f] hover:bg-[#c9a84c]/15 text-[#8c8270] hover:text-[#c9a84c] border border-[#2e2a1e] transition cursor-pointer"
              title="Copier la citation"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Verse Scripture Box */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentVerse.book_id}-${currentVerse.chapter}-${currentVerse.verse}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="p-4 sm:p-5 rounded-2xl bg-[#110e0a] border border-[#c9a84c]/25 shadow-inner relative"
          >
            <span className="font-serif text-3xl sm:text-4xl text-[#c9a84c]/30 absolute -top-2 left-3 select-none">«</span>
            <p className="font-reading text-[17px] sm:text-[20px] text-[#f4efe2] leading-[1.7] italic pl-4 pr-2 pt-1 select-text">
              {currentVerse.text.replace(/\[[HG]\d+\]/g, '').trim()}
            </p>
            <span className="font-serif text-3xl sm:text-4xl text-[#c9a84c]/30 absolute -bottom-4 right-3 select-none">»</span>
          </motion.div>
        </AnimatePresence>

        {/* MEDITATION ANGLE TABS */}
        <div className="space-y-3">
          <div className="flex items-center gap-1 border-b border-[#2e2a1e] pb-1">
            {[
              { id: 'heart', label: 'Méditation du Cœur', icon: Sparkles },
              { id: 'insight', label: 'Éclairage Spirituel', icon: Compass },
              { id: 'prayer', label: 'Prière Inspirée', icon: Flame },
              { id: 'silence', label: 'Silence & Respiration', icon: Sun },
            ].map(tabItem => {
              const Icon = tabItem.icon;
              const isCurrent = activeTab === tabItem.id;
              return (
                <button
                  key={tabItem.id}
                  onClick={() => setActiveTab(tabItem.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition cursor-pointer ${
                    isCurrent
                      ? 'bg-[#1a1712] text-[#c9a84c] font-bold border-b-2 border-[#c9a84c]'
                      : 'text-[#8c8270] hover:text-[#e8e0d0]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tabItem.label}</span>
                  <span className="sm:hidden">{tabItem.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Active Meditation Panel */}
          <div className="p-4 rounded-xl bg-[#0f0c08] border border-[#2e2a1e] min-h-[110px] flex flex-col justify-center text-left">
            {activeTab === 'heart' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#c9a84c] font-bold block">
                  Axe de Contemplation : {meditation.theme}
                </span>
                <p className="text-xs sm:text-sm text-[#e8e0d0] font-sans leading-relaxed">
                  {meditation.contemplationPrompt}
                </p>
              </motion.div>
            )}

            {activeTab === 'insight' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#c9a84c] font-bold block">
                  Fondement Théologique & Contexte
                </span>
                <p className="text-xs sm:text-sm text-[#d4ccbd] font-sans leading-relaxed">
                  {meditation.theologicalInsight}
                </p>
              </motion.div>
            )}

            {activeTab === 'prayer' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <span className="text-[9px] font-mono uppercase tracking-widest text-[#c9a84c] font-bold block">
                  Prière Personnelle Inspirée
                </span>
                <p className="text-xs sm:text-sm text-[#f0e6d6] italic font-serif leading-relaxed border-l-2 border-[#c9a84c]/50 pl-3">
                  « {meditation.guidedPrayer} »
                </p>
              </motion.div>
            )}

            {activeTab === 'silence' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-[9.5px] font-mono uppercase tracking-widest text-[#c9a84c] font-bold block">
                    Minute de Recueillement Sacré
                  </span>
                  <p className="text-xs text-[#b8af9e] font-sans">
                    {breathPhase === 'inspire' && "Inspirez lentement la paix divine..."}
                    {breathPhase === 'hold' && "Méditez la Parole dans votre esprit..."}
                    {breathPhase === 'expire' && "Expirez tout souci et confiez-vous..."}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    <motion.div
                      animate={{
                        scale: timerActive ? (breathPhase === 'inspire' ? 1.25 : breathPhase === 'hold' ? 1.25 : 0.9) : 1,
                        opacity: timerActive ? 0.6 : 0.2
                      }}
                      transition={{ duration: 3, ease: 'easeInOut' }}
                      className="absolute inset-0 rounded-full bg-[#c9a84c]/20 border border-[#c9a84c]"
                    />
                    <span className="font-mono text-xs font-bold text-[#c9a84c] relative z-10">
                      {secondsLeft}s
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (timerActive) {
                        setTimerActive(false);
                      } else {
                        setSecondsLeft(60);
                        setTimerActive(true);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[#c9a84c]/40 text-[#c9a84c] hover:bg-[#c9a84c]/10 text-xs font-mono uppercase tracking-wider transition cursor-pointer"
                  >
                    {timerActive ? <Pause className="w-3.5 h-3.5 inline mr-1" /> : <Play className="w-3.5 h-3.5 inline mr-1" />}
                    <span>{timerActive ? 'Pause' : 'Démarrer (60s)'}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* INLINE PERSONAL NOTE ACCORDION */}
        <div className="pt-2 border-t border-[#2e2a1e]/40">
          {!showNoteEditor ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowNoteEditor(true)}
                className="text-xs font-mono text-[#c9a84c] hover:text-[#f4efe2] flex items-center gap-1.5 transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Rédiger une note spirituelle sur cette méditation</span>
              </button>

              <button
                onClick={() => handleSavePersonalNote(true)}
                className="px-2.5 py-1 bg-[#c9a84c]/10 hover:bg-[#c9a84c]/20 border border-[#c9a84c]/30 text-[#c9a84c] rounded-lg text-[10px] font-mono uppercase tracking-wider transition cursor-pointer"
                title="Clôturer la méditation et enregistrer la lecture dans votre journal"
              >
                ✓ Terminer la méditation
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 bg-[#120f0a] border border-[#c9a84c]/25 rounded-xl p-3.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-[#c9a84c] font-bold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Note Spirituelle & Méditation
                </span>
                <button
                  onClick={() => setShowNoteEditor(false)}
                  className="text-[10px] font-mono text-[#8c8270] hover:text-[#e8e0d0] uppercase cursor-pointer"
                >
                  Fermer
                </button>
              </div>

              {/* Title / Theme input */}
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder={`Titre : ex. Méditation sur ${currentVerse.book_name} ${currentVerse.chapter}:${currentVerse.verse}...`}
                className="w-full bg-[#0a0805] border border-[#2e2a1e] rounded-lg px-2.5 py-1.5 text-xs text-[#e8e0d0] placeholder-[#6b6355] focus:outline-none focus:border-[#c9a84c] font-serif"
              />

              {/* Content textarea */}
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Écrivez vos pensées, résolutions de foi ou prière pour ce passage..."
                className="w-full h-24 bg-[#0a0805] border border-[#2e2a1e] rounded-lg p-2.5 text-xs text-[#e8e0d0] placeholder-[#6b6355] focus:outline-none focus:border-[#c9a84c] resize-none font-serif leading-relaxed"
              />

              {/* Success alert with formatted date */}
              {noteSaved && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-[10px] font-mono flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1 font-bold">
                    <Check className="w-3.5 h-3.5" /> Note enregistrée avec succès !
                  </span>
                  {savedDateFormatted && (
                    <span className="text-[9px] text-[#a0947f]">
                      {savedDateFormatted}
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons: Enregistrer & Terminer */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-[#2e2a1e]/40">
                <button
                  onClick={() => handleSavePersonalNote(false)}
                  disabled={!noteContent.trim() && !noteTitle.trim()}
                  className="px-3 py-1.5 rounded-lg bg-[#1a1712] hover:bg-[#221e17] border border-[#2e2a1e] hover:border-[#c9a84c]/40 disabled:opacity-40 text-[#c9a84c] font-bold text-xs font-mono transition cursor-pointer"
                >
                  Enregistrer
                </button>

                <button
                  onClick={() => handleSavePersonalNote(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-gold-gradient hover:brightness-110 text-[#0a0805] font-bold text-xs font-mono uppercase tracking-wider transition cursor-pointer shadow-gold-glow flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Terminer la méditation</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER ACTIONS ROW */}
      <footer className="px-4 sm:px-6 py-3.5 border-t border-[#2e2a1e] bg-[#0d0b07] flex flex-wrap items-center justify-between gap-2 relative z-10">
        
        {/* Draw Next Random Verse Button */}
        <button
          onClick={() => handleDrawRandomVerse(filter)}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#17140f] hover:bg-[#c9a84c]/15 border border-[#c9a84c]/30 hover:border-[#c9a84c] text-[#c9a84c] text-xs font-mono uppercase tracking-wider transition cursor-pointer active:scale-95"
          title="Tirer un nouveau verset aléatoire"
        >
          <Dices className="w-4 h-4" />
          <span>Verset Suivant</span>
        </button>

        {/* Generate Artwork Share Card */}
        <button
          onClick={() => setIsShareOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#17140f] hover:bg-[#c9a84c]/15 border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#c9a84c] text-xs font-mono uppercase tracking-wider transition cursor-pointer"
          title="Créer une image esthétique de ce verset"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Créer Image</span>
        </button>

        {/* Navigate to Context in Reader */}
        <button
          onClick={handleOpenInReader}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gold-gradient text-[#0d0b07] font-serif font-extrabold text-xs uppercase tracking-wider shadow-gold-glow hover:scale-[1.02] active:scale-95 transition cursor-pointer"
          title="Ouvrir ce verset dans son chapitre complet dans le lecteur biblique"
        >
          <BookOpen className="w-4 h-4" />
          <span>Lire le Chapitre</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </footer>

      {/* VERSE SHARE MODAL DIALOG */}
      <AnimatePresence>
        {isShareOpen && (
          <VerseShareModal
            verse={verseObjForShare}
            onClose={() => setIsShareOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
