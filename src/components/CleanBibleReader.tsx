import React, { useState } from 'react';
import { 
  ChevronDown, MoreVertical, ChevronLeft, ChevronRight, Volume2, 
  Pause, Check, Download, Bookmark, Copy, Share2, FileText, 
  Search, Sparkles, X, Palette, BookOpen, Heart
} from 'lucide-react';
import { Verse, Book } from '../types/bible';
import { VerseShareModal } from './VerseShareModal';

interface CleanBibleReaderProps {
  selectedBook: Book;
  selectedChapter: number;
  selectedTranslation: string;
  chapterVerses: Verse[];
  loadingVerses: boolean;
  loadingError: string | null;
  onOpenNavigator: () => void;
  onOpenTranslationModal: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  isSpeaking: boolean;
  onToggleAudio: () => void;
  onExplainVerse: (verse: Verse) => void;
  onStrongClick: (code: string) => void;
  onSaveNote: (verse: Verse, text: string) => void;
  isCurrentChapterCached: boolean;
  onCacheCurrentChapter: () => Promise<void>;
  onOpenChapterMeditation: () => void;
  onOpenThemeSettings: () => void;
  onValidateChapterReading?: () => void;
  favorites: any[];
  onToggleFavorite: (verse: Verse) => void;
}

export const CleanBibleReader: React.FC<CleanBibleReaderProps> = ({
  selectedBook,
  selectedChapter,
  selectedTranslation,
  chapterVerses,
  loadingVerses,
  loadingError,
  onOpenNavigator,
  onOpenTranslationModal,
  onPrevChapter,
  onNextChapter,
  isSpeaking,
  onToggleAudio,
  onExplainVerse,
  onStrongClick,
  onSaveNote,
  isCurrentChapterCached,
  onCacheCurrentChapter,
  onOpenChapterMeditation,
  onOpenThemeSettings,
  onValidateChapterReading,
  favorites,
  onToggleFavorite
}) => {
  const [selectedVerseId, setSelectedVerseId] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [copiedVerseId, setCopiedVerseId] = useState<string | null>(null);
  const [shareModalVerse, setShareModalVerse] = useState<Verse | null>(null);
  const [activeNoteVerse, setActiveNoteVerse] = useState<Verse | null>(null);
  const [noteInputText, setNoteInputText] = useState<string>('');
  const [downloadToast, setDownloadToast] = useState<string | null>(null);
  
  // Verse Highlights map persisted in localStorage
  const [highlights, setHighlights] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('bible_verse_highlights');
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  });

  const selectedVerse = chapterVerses.find(
    v => `${v.book_id}_${v.chapter}_${v.verse}` === selectedVerseId
  );

  const getTranslationCode = (trans: string): string => {
    switch (trans.toLowerCase()) {
      case 'local':
      case 'lsg':
        return 'LSG';
      case 'kjv':
        return 'KJV';
      case 'darby':
        return 'DRB';
      case 'ostervald':
        return 'OST';
      case 'martin':
        return 'MAR';
      case 's21':
        return 'S21';
      default:
        return trans.slice(0, 3).toUpperCase();
    }
  };

  const handleApplyHighlight = (color: string) => {
    if (!selectedVerseId) return;
    const next = { ...highlights };
    if (!color || next[selectedVerseId] === color) {
      delete next[selectedVerseId];
    } else {
      next[selectedVerseId] = color;
    }
    setHighlights(next);
    try {
      localStorage.setItem('bible_verse_highlights', JSON.stringify(next));
    } catch (_) {}
  };

  const handleCopyVerse = (verse: Verse) => {
    const text = `« ${verse.text.replace(/\[[HG]\d+\]/g, '').trim()} » (${verse.book_name} ${verse.chapter}:${verse.verse})`;
    navigator.clipboard.writeText(text);
    const vId = `${verse.book_id}_${verse.chapter}_${verse.verse}`;
    setCopiedVerseId(vId);
    setTimeout(() => setCopiedVerseId(null), 2000);
  };

  const handleNativeShare = async (verse: Verse) => {
    const text = `« ${verse.text.replace(/\[[HG]\d+\]/g, '').trim()} »\n— ${verse.book_name} ${verse.chapter}:${verse.verse}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${verse.book_name} ${verse.chapter}:${verse.verse}`,
          text
        });
        return;
      } catch (_) {}
    }
    setShareModalVerse(verse);
  };

  const handleDownloadClick = async () => {
    try {
      await onCacheCurrentChapter();
      setDownloadToast("Chapitre téléchargé hors-ligne ✓");
      setTimeout(() => setDownloadToast(null), 2500);
    } catch (_) {
      setDownloadToast("Erreur de téléchargement");
      setTimeout(() => setDownloadToast(null), 2500);
    }
  };

  return (
    <div className="reader reader-container w-full min-h-screen pb-32 text-left select-text relative">
      
      {/* 1. BARRE DU HAUT TRÈS FINE */}
      {/* Bouton Livre+chapitre, bouton Version, icône menu ⋮ à droite */}
      <header className="sticky top-0 z-30 w-full bg-surface/95 backdrop-blur-md border-b border-app h-12 px-3 sm:px-4 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          {/* Bouton « Livre + chapitre » (ex. « Actes 4 ») */}
          <button
            type="button"
            onClick={onOpenNavigator}
            className="px-3 py-1.5 rounded-full bg-app border border-app hover:border-accent text-app font-sans font-medium text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-xs"
            title="Changer de livre ou de chapitre"
          >
            <span>{selectedBook.name} {selectedChapter}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted" />
          </button>

          {/* Bouton « Version » (ex. « LSG ») */}
          <button
            type="button"
            onClick={onOpenTranslationModal}
            className="px-2.5 py-1.5 rounded-full bg-app border border-app hover:border-accent text-muted hover:text-app font-mono font-bold text-xs flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-xs"
            title="Changer de traduction"
          >
            <span>{getTranslationCode(selectedTranslation)}</span>
            <ChevronDown className="w-3 h-3 text-muted" />
          </button>
        </div>

        {/* Droite : Statut cache hors-ligne & Menu ⋮ */}
        <div className="flex items-center gap-1.5 relative">
          {/* Bouton statut cache hors-ligne */}
          <button
            type="button"
            onClick={handleDownloadClick}
            className={`p-1.5 rounded-xl transition cursor-pointer ${
              isCurrentChapterCached 
                ? 'text-emerald-500 hover:bg-surface' 
                : 'text-muted hover:text-app hover:bg-surface'
            }`}
            title={isCurrentChapterCached ? "Chapitre disponible hors-ligne" : "Télécharger ce chapitre hors-ligne"}
          >
            {isCurrentChapterCached ? (
              <Check className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>

          {/* Icône menu (⋮) à droite */}
          <button
            type="button"
            onClick={() => setShowMoreMenu(prev => !prev)}
            className="p-1.5 rounded-xl text-muted hover:text-app hover:bg-surface transition cursor-pointer"
            title="Menu du lecteur"
            aria-label="Options de lecture"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Dropdown Menu discret */}
          {showMoreMenu && (
            <div 
              className="absolute right-0 top-10 w-56 rounded-2xl bg-surface border border-app shadow-2xl p-1.5 z-50 text-xs font-sans text-app divide-y divide-app animate-fade-in"
              onClick={() => setShowMoreMenu(false)}
            >
              <div className="py-1">
                <button
                  type="button"
                  onClick={onToggleAudio}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-surface-hover flex items-center gap-2.5 transition"
                >
                  <Volume2 className="w-4 h-4 text-accent" />
                  <span>{isSpeaking ? "Arrêter la lecture audio" : "Écouter ce chapitre (Audio)"}</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenChapterMeditation}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-surface-hover flex items-center gap-2.5 transition"
                >
                  <FileText className="w-4 h-4 text-accent" />
                  <span>Méditation de chapitre</span>
                </button>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={onOpenThemeSettings}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-surface-hover flex items-center gap-2.5 transition"
                >
                  <Palette className="w-4 h-4 text-accent" />
                  <span>Police, taille & Thème</span>
                </button>

                {onValidateChapterReading && (
                  <button
                    type="button"
                    onClick={onValidateChapterReading}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-surface-hover flex items-center gap-2.5 transition"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Valider ce chapitre lu (+1)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Toast de téléchargement */}
      {downloadToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-surface border border-app text-xs text-app font-sans shadow-lg animate-fade-in">
          {downloadToast}
        </div>
      )}

      {/* 2. LE TEXTE BIBLIQUE OCCUPE TOUT L'ÉCRAN */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {loadingVerses ? (
          <div className="py-32 flex flex-col items-center justify-center space-y-3">
            <div className="w-7 h-7 rounded-full border-t-2 border-accent animate-spin" />
            <span className="text-xs text-muted font-sans">Chargement du texte...</span>
          </div>
        ) : loadingError ? (
          <div className="py-20 text-center space-y-2">
            <p className="text-sm text-rose-400 font-sans">{loadingError}</p>
          </div>
        ) : chapterVerses.length === 0 ? (
          <div className="py-20 text-center">
            <span className="text-xs text-muted">Aucun verset disponible.</span>
          </div>
        ) : (
          <div 
            className="space-y-3 text-app select-text"
            style={{ 
              fontFamily: 'var(--font-reading)',
              fontSize: 'var(--text-size)',
              lineHeight: 'var(--line-height)'
            }}
          >
            {chapterVerses.map((item) => {
              const verseUniqueId = `${item.book_id}_${item.chapter}_${item.verse}`;
              const isSelected = selectedVerseId === verseUniqueId;
              const isFav = favorites.some(
                f => f.book_id === item.book_id && f.chapter === item.chapter && f.verse === item.verse
              );
              const highlightColor = highlights[verseUniqueId];

              // Clean Strong numbers for pure reading, but keep them clickable if present
              const cleanText = item.text.replace(/\[[HG]\d+\]/g, '').trim();

              return (
                <div
                  key={verseUniqueId}
                  id={`verse-${item.verse}`}
                  onClick={() => {
                    setSelectedVerseId(isSelected ? null : verseUniqueId);
                  }}
                  className={`py-1 px-2 rounded-xl transition-colors duration-150 cursor-pointer ${
                    isSelected 
                      ? 'bg-surface shadow-xs ring-1 ring-accent/30' 
                      : 'hover:bg-surface/40'
                  }`}
                  style={{
                    backgroundColor: highlightColor ? highlightColor : undefined
                  }}
                >
                  <p className="inline leading-relaxed text-app">
                    {/* Numéro de verset petit et discret dans le flux du texte */}
                    <sup 
                      className={`text-[11px] font-mono font-bold mr-1.5 select-none ${
                        isFav ? 'text-accent font-black' : 'text-muted'
                      }`}
                      style={{ color: isFav ? 'var(--accent)' : 'var(--verse-num)' }}
                    >
                      {item.verse}
                    </sup>
                    <span>{cleanText}</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 3. BARRE CONTEXTUELLE DE VERSET FLOTTANTE */}
      {selectedVerse && (
        <div className="fixed bottom-24 inset-x-4 max-w-lg mx-auto z-40 bg-surface/95 backdrop-blur-md border border-app rounded-2xl p-2 shadow-2xl flex items-center justify-between gap-1 animate-fade-slide-up select-none">
          <div className="flex items-center gap-1 overflow-x-auto scroller-none py-1 px-1">
            {/* Surligner (pastilles de couleurs) */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-app rounded-xl border border-app">
              <button
                type="button"
                onClick={() => handleApplyHighlight('rgba(250, 204, 21, 0.25)')} // Jaune
                className="w-5 h-5 rounded-full bg-yellow-400 border border-yellow-500 hover:scale-110 transition cursor-pointer"
                title="Surligner en jaune"
              />
              <button
                type="button"
                onClick={() => handleApplyHighlight('rgba(74, 222, 128, 0.25)')} // Vert
                className="w-5 h-5 rounded-full bg-emerald-400 border border-emerald-500 hover:scale-110 transition cursor-pointer"
                title="Surligner en vert"
              />
              <button
                type="button"
                onClick={() => handleApplyHighlight('rgba(96, 165, 250, 0.25)')} // Bleu
                className="w-5 h-5 rounded-full bg-blue-400 border border-blue-500 hover:scale-110 transition cursor-pointer"
                title="Surligner en bleu"
              />
              <button
                type="button"
                onClick={() => handleApplyHighlight('rgba(244, 114, 182, 0.25)')} // Rose
                className="w-5 h-5 rounded-full bg-pink-400 border border-pink-500 hover:scale-110 transition cursor-pointer"
                title="Surligner en rose"
              />
              <button
                type="button"
                onClick={() => handleApplyHighlight('')}
                className="text-[10px] text-muted hover:text-rose-400 transition ml-0.5 cursor-pointer"
                title="Effacer surlignage"
              >
                ✕
              </button>
            </div>

            {/* Copier */}
            <button
              type="button"
              onClick={() => handleCopyVerse(selectedVerse)}
              className="p-2 rounded-xl text-muted hover:text-app hover:bg-app transition cursor-pointer flex items-center gap-1"
              title="Copier le verset"
            >
              {copiedVerseId === `${selectedVerse.book_id}_${selectedVerse.chapter}_${selectedVerse.verse}` ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            {/* Favori */}
            <button
              type="button"
              onClick={() => onToggleFavorite(selectedVerse)}
              className="p-2 rounded-xl text-muted hover:text-accent hover:bg-app transition cursor-pointer"
              title="Ajouter aux favoris"
            >
              <Heart className={`w-4 h-4 ${favorites.some(f => f.book_id === selectedVerse.book_id && f.chapter === selectedVerse.chapter && f.verse === selectedVerse.verse) ? 'fill-accent text-accent' : ''}`} />
            </button>

            {/* Noter */}
            <button
              type="button"
              onClick={() => {
                setActiveNoteVerse(selectedVerse);
                setNoteInputText('');
              }}
              className="p-2 rounded-xl text-muted hover:text-app hover:bg-app transition cursor-pointer"
              title="Ajouter une note"
            >
              <FileText className="w-4 h-4" />
            </button>

            {/* Partager */}
            <button
              type="button"
              onClick={() => handleNativeShare(selectedVerse)}
              className="p-2 rounded-xl text-muted hover:text-app hover:bg-app transition cursor-pointer"
              title="Partager le verset"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Concordance Strong */}
            <button
              type="button"
              onClick={() => onExplainVerse(selectedVerse)}
              className="p-2 rounded-xl text-muted hover:text-app hover:bg-app transition cursor-pointer"
              title="Concordance Strong & Exégèse"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Bouton fermer la barre contextuelle */}
          <button
            type="button"
            onClick={() => setSelectedVerseId(null)}
            className="p-1.5 rounded-lg text-muted hover:text-app transition cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. FLÈCHES PRÉCÉDENT / SUIVANT ET BOUTON AUDIO FLOTTANT */}
      <div className="fixed bottom-16 inset-x-0 pointer-events-none z-30">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between">
          {/* Flèche précédent discrète */}
          <button
            type="button"
            onClick={onPrevChapter}
            className="pointer-events-auto p-2.5 rounded-full bg-surface/90 hover:bg-surface border border-app text-muted hover:text-app shadow-md transition cursor-pointer active:scale-95"
            title="Chapitre précédent"
            aria-label="Chapitre précédent"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Bouton audio flottant au centre */}
          <button
            type="button"
            onClick={onToggleAudio}
            className={`pointer-events-auto w-11 h-11 rounded-full border shadow-lg flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              isSpeaking
                ? 'bg-accent text-surface border-accent shadow-accent/30 animate-pulse'
                : 'bg-surface/95 text-app border-app hover:border-accent'
            }`}
            title={isSpeaking ? "Pause de la lecture audio" : "Lancer la lecture audio"}
            aria-label="Lecture audio"
          >
            {isSpeaking ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>

          {/* Flèche suivant discrète */}
          <button
            type="button"
            onClick={onNextChapter}
            className="pointer-events-auto p-2.5 rounded-full bg-surface/90 hover:bg-surface border border-app text-muted hover:text-app shadow-md transition cursor-pointer active:scale-95"
            title="Chapitre suivant"
            aria-label="Chapitre suivant"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modale de note rapide */}
      {activeNoteVerse && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-app rounded-2xl p-5 space-y-4 shadow-2xl animate-fade-in text-left">
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-sm text-app">
                Note sur {activeNoteVerse.book_name} {activeNoteVerse.chapter}:{activeNoteVerse.verse}
              </span>
              <button
                type="button"
                onClick={() => setActiveNoteVerse(null)}
                className="text-muted hover:text-app"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={noteInputText}
              onChange={(e) => setNoteInputText(e.target.value)}
              placeholder="Écrivez votre réflexion spirituelle..."
              rows={4}
              className="w-full bg-app border border-app rounded-xl p-3 text-xs text-app outline-none focus:border-accent resize-none font-sans"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveNoteVerse(null)}
                className="px-4 py-2 rounded-xl text-xs text-muted hover:text-app transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveNote(activeNoteVerse, noteInputText.trim());
                  setActiveNoteVerse(null);
                }}
                disabled={!noteInputText.trim()}
                className="px-4 py-2 rounded-xl bg-accent text-surface text-xs font-bold transition cursor-pointer disabled:opacity-40"
              >
                Enregistrer la note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale Partage d'image */}
      {shareModalVerse && (
        <VerseShareModal
          verse={shareModalVerse}
          onClose={() => setShareModalVerse(null)}
        />
      )}

    </div>
  );
};
