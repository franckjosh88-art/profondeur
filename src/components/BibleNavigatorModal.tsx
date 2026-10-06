import React, { useState } from 'react';
import { X, ChevronLeft, BookOpen, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Book } from '../types/bible';
import { BOOKS } from '../data/bibleData';
import { getChapterMaxVerses } from '../data/bibleChapterVerseCounts';

interface BibleNavigatorModalProps {
  isOpen: boolean;
  currentBook: Book;
  currentChapter: number;
  currentVerse?: number;
  onClose: () => void;
  onSelectPassage: (book: Book, chapter: number, verseNum?: number) => void;
}

type NavStep = 'book' | 'chapter' | 'verse';

export const BibleNavigatorModal: React.FC<BibleNavigatorModalProps> = ({
  isOpen,
  currentBook,
  currentChapter,
  currentVerse = 1,
  onClose,
  onSelectPassage
}) => {
  const [step, setStep] = useState<NavStep>('book');
  const [selectedTestament, setSelectedTestament] = useState<'AT' | 'NT'>(currentBook.testament);
  const [chosenBook, setChosenBook] = useState<Book>(currentBook);
  const [chosenChapter, setChosenChapter] = useState<number>(currentChapter);

  // Sync state when opening
  React.useEffect(() => {
    if (isOpen) {
      setStep('book');
      setSelectedTestament(currentBook.testament);
      setChosenBook(currentBook);
      setChosenChapter(currentChapter);
    }
  }, [isOpen, currentBook, currentChapter]);

  const otBooks = BOOKS.filter(b => b.testament === 'AT');
  const ntBooks = BOOKS.filter(b => b.testament === 'NT');
  const currentBooksList = selectedTestament === 'AT' ? otBooks : ntBooks;

  const totalVersesInChosenChapter = getChapterMaxVerses(chosenBook.id, chosenChapter);

  const handleSelectBook = (book: Book) => {
    setChosenBook(book);
    setStep('chapter');
  };

  const handleSelectChapter = (chapter: number) => {
    setChosenChapter(chapter);
    setStep('verse');
  };

  const handleSelectVerse = (verseNum: number) => {
    onSelectPassage(chosenBook, chosenChapter, verseNum);
    onClose();
  };

  const handleReadFullChapter = () => {
    onSelectPassage(chosenBook, chosenChapter, 1);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.9),0_0_20px_rgba(201,168,76,0.15)] flex flex-col max-h-[85vh] overflow-hidden border border-[#2e2a1e] bg-[#0c0a07] text-[#e8e0d0]"
          >
            {/* EN-TÊTE DU SÉLECTEUR */}
            <div className="p-4 border-b border-[#2e2a1e] flex items-center justify-between bg-[#12100c]">
              <div className="flex items-center gap-2 min-w-0">
                {step !== 'book' && (
                  <button
                    onClick={() => setStep(step === 'verse' ? 'chapter' : 'book')}
                    className="p-1.5 rounded-lg hover:bg-[#1a1712] text-[#c9a84c] transition cursor-pointer flex items-center gap-1 text-xs font-mono font-bold uppercase active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Retour</span>
                  </button>
                )}

                <h3 className="font-serif font-black text-sm sm:text-base tracking-wide uppercase truncate text-[#c9a84c]">
                  {step === 'book' && "Table des matières"}
                  {step === 'chapter' && `${chosenBook.name} • Chapitres`}
                  {step === 'verse' && `${chosenBook.name} ${chosenChapter} • Versets`}
                </h3>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-[#1a1712] text-[#8c8270] hover:text-[#c9a84c] border border-transparent hover:border-[#2e2a1e] transition cursor-pointer"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CONTENU PRINCIPAL SELON L'ÉTAPE */}
            <div className="flex-1 overflow-y-auto p-4 scroller-thin">
              {/* ÉTAPE 1 : LIVRES AVEC ONGLETS AT / NT */}
              {step === 'book' && (
                <div className="space-y-3.5">
                  {/* Onglets Ancien Testament / Nouveau Testament */}
                  <div className="p-1 rounded-xl flex border border-[#2e2a1e] bg-[#050403]">
                    <button
                      onClick={() => setSelectedTestament('AT')}
                      className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition cursor-pointer ${
                        selectedTestament === 'AT'
                          ? 'bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/50 shadow-sm'
                          : 'text-[#8c8270] hover:text-[#e8e0d0]'
                      }`}
                    >
                      Ancien Testament (39)
                    </button>
                    <button
                      onClick={() => setSelectedTestament('NT')}
                      className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition cursor-pointer ${
                        selectedTestament === 'NT'
                          ? 'bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/50 shadow-sm'
                          : 'text-[#8c8270] hover:text-[#e8e0d0]'
                      }`}
                    >
                      Nouveau Testament (27)
                    </button>
                  </div>

                  {/* Grille des livres */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {currentBooksList.map((book) => {
                      const isCurrent = currentBook.id === book.id;
                      return (
                        <button
                          key={book.id}
                          onClick={() => handleSelectBook(book)}
                          className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between min-h-[54px] active:scale-98 ${
                            isCurrent
                              ? 'border-[#c9a84c] bg-[#c9a84c]/20 font-bold text-[#c9a84c]'
                              : 'bg-[#12100c] border-[#2e2a1e] hover:border-[#c9a84c]/60 hover:bg-[#1a1712] text-[#e8e0d0]'
                          }`}
                        >
                          <span className={`text-xs font-serif font-black truncate ${
                            isCurrent ? 'text-[#c9a84c]' : 'text-[#f4efe2]'
                          }`}>
                            {book.name}
                          </span>
                          <span className="text-[9.5px] font-mono text-[#8c8270] mt-0.5">
                            {book.chapters_count} chapitres
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ÉTAPE 2 : CHAPITRES */}
              {step === 'chapter' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#8c8270]">
                      Touchez un chapitre (1 à {chosenBook.chapters_count}) :
                    </span>
                    <button
                      onClick={() => setStep('book')}
                      className="text-xs font-mono text-[#c9a84c] hover:underline cursor-pointer"
                    >
                      Changer de livre
                    </button>
                  </div>

                  {/* Grille des chapitres */}
                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {Array.from({ length: chosenBook.chapters_count }, (_, i) => i + 1).map((chNum) => {
                      const isCurrent = chosenBook.id === currentBook.id && chNum === currentChapter;
                      return (
                        <button
                          key={chNum}
                          onClick={() => handleSelectChapter(chNum)}
                          className={`aspect-square rounded-xl flex items-center justify-center font-mono font-bold text-sm sm:text-base border transition cursor-pointer active:scale-95 ${
                            isCurrent
                              ? 'bg-[#c9a84c] text-[#050403] border-[#c9a84c] font-black shadow-md'
                              : 'bg-[#12100c] border-[#2e2a1e] hover:border-[#c9a84c] hover:text-[#c9a84c] text-[#e8e0d0]'
                          }`}
                        >
                          {chNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ÉTAPE 3 : VERSETS */}
              {step === 'verse' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-[#8c8270]">
                      Touchez un verset pour y aller :
                    </span>
                    <button
                      onClick={handleReadFullChapter}
                      className="px-3 py-1 bg-[#c9a84c]/20 hover:bg-[#c9a84c]/30 text-[#c9a84c] border border-[#c9a84c]/50 rounded-lg text-xs font-mono font-bold uppercase transition cursor-pointer shrink-0 active:scale-95"
                    >
                      Tout le chapitre
                    </button>
                  </div>

                  {/* Grille des versets */}
                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {Array.from({ length: totalVersesInChosenChapter }, (_, i) => i + 1).map((vNum) => {
                      const isCurrent = chosenBook.id === currentBook.id && chosenChapter === currentChapter && vNum === currentVerse;
                      return (
                        <button
                          key={vNum}
                          onClick={() => handleSelectVerse(vNum)}
                          className={`aspect-square rounded-xl flex items-center justify-center font-mono font-bold text-sm sm:text-base border transition cursor-pointer active:scale-95 ${
                            isCurrent
                              ? 'bg-[#c9a84c] text-[#050403] border-[#c9a84c] font-black shadow-md'
                              : 'bg-[#12100c] border-[#2e2a1e] hover:border-[#c9a84c] hover:text-[#c9a84c] text-[#e8e0d0]'
                          }`}
                        >
                          {vNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
