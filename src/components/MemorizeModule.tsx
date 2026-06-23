import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, BookOpen, Star, RefreshCw, Eye, EyeOff, Sparkles, 
  ChevronRight, List, Brain, Sliders, CheckCircle2, AlertTriangle, 
  Undo2, Volume2, HelpCircle, Mic, MicOff
} from 'lucide-react';
import { FavoriteVerse } from '../types/bible';

interface MemorizeModuleProps {
  favorites: FavoriteVerse[];
  onNavigateToVerse?: (bookId: number, chapter: number, verseNum: number) => void;
}

// Fallback high-inspiration verses for users with no bookmarks yet
const DEMO_VERSES: FavoriteVerse[] = [
  {
    book_id: 19,
    book_name: "Psaumes",
    chapter: 119,
    verse: 105,
    text: "Ta parole est une lampe à mes pieds, Et une lumière sur mon sentier.",
    added_at: new Date().toISOString()
  },
  {
    book_id: 43,
    book_name: "Jean",
    chapter: 3,
    verse: 16,
    text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle.",
    added_at: new Date().toISOString()
  },
  {
    book_id: 45,
    book_name: "Romains",
    chapter: 8,
    verse: 28,
    text: "Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu, de ceux qui sont appelés selon son dessein.",
    added_at: new Date().toISOString()
  },
  {
    book_id: 19,
    book_name: "Psaumes",
    chapter: 23,
    verse: 1,
    text: "L'Éternel est mon berger: je ne manquerai de rien.",
    added_at: new Date().toISOString()
  }
];

type MemorizationMode = 'progressive' | 'first_letter' | 'manual' | 'challenge';

interface InteractiveWord {
  id: number;
  text: string;
  cleanText: string; // text without punctuation for matching
  isPunctuation: boolean;
  isManuallyHidden: boolean;
  isRandomlyHidden: boolean;
}

export const MemorizeModule: React.FC<MemorizeModuleProps> = ({ 
  favorites,
  onNavigateToVerse
}) => {
  // Combine user favorites with demo verses
  const allAvailableVerses = useMemo(() => {
    if (favorites.length === 0) return DEMO_VERSES;
    // Put user bookmarked verses first, then demo verses
    return [...favorites, ...DEMO_VERSES.filter(dv => 
      !favorites.some(f => f.book_id === dv.book_id && f.chapter === dv.chapter && f.verse === dv.verse)
    )];
  }, [favorites]);

  // Selected Verse State
  const [selectedVerseIndex, setSelectedVerseIndex] = useState<number>(0);
  const currentVerse = allAvailableVerses[selectedVerseIndex] || DEMO_VERSES[0];

  // Memorization Mode & Slider percentage
  const [mode, setMode] = useState<MemorizationMode>('progressive');
  const [hiddenPercentage, setHiddenPercentage] = useState<number>(30); // 0% to 100%
  const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});
  
  // Custom interactive click-to-hide states
  const [manualHiddenWordIds, setManualHiddenWordIds] = useState<Set<number>>(new Set());

  // Self-test states
  const [userAttemptText, setUserAttemptText] = useState<string>('');
  const [testResult, setTestResult] = useState<{
    score: number;
    totalWords: number;
    diffWords: { text: string; status: 'correct' | 'wrong' | 'missing' }[];
    checked: boolean;
  } | null>(null);

  // Success Celebration
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  // Vocal/Voice recitation states
  const [recitationMethod, setRecitationMethod] = useState<'write' | 'voice'>('write');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [recognitionInstance, setRecognitionInstance] = useState<any | null>(null);

  // Tokenize the verse text into lists of words & punctuation
  const tokenizedWords = useMemo((): InteractiveWord[] => {
    if (!currentVerse) return [];
    
    // Regular expression to extract words, preserving French diacritics
    const rawTokens = currentVerse.text.split(/(\s+|[,.;:!?()«»'’""])/);
    let wordCounter = 0;

    return rawTokens
      .map((token) => {
        if (!token) return null;
        
        const isWhitespace = /^\s+$/.test(token);
        if (isWhitespace) return null;

        const isPunct = /^[,.;:!?()«»'’""]+$/.test(token);
        const clean = token.toLowerCase()
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()«»]/g, "")
          .replace(/['’]/g, "")
          .trim();

        wordCounter++;

        return {
          id: wordCounter,
          text: token,
          cleanText: clean,
          isPunctuation: isPunct || clean.length === 0,
          isManuallyHidden: manualHiddenWordIds.has(wordCounter),
          isRandomlyHidden: false // will calculate dynamically below
        };
      })
      .filter((w): w is InteractiveWord => w !== null);
  }, [currentVerse, manualHiddenWordIds]);

  // Apply deterministic randomness for the slider progressive hiding
  const processedWords = useMemo(() => {
    if (mode !== 'progressive' && mode !== 'challenge') return tokenizedWords;

    // Filter indexable words (non-punctuation)
    const indexableWords = tokenizedWords.filter(w => !w.isPunctuation);
    const nonPunctCount = indexableWords.length;
    
    // Calculate how many words we need to hide
    const targetHideCount = Math.round((hiddenPercentage / 100) * nonPunctCount);

    // Generate pseudo-random order based on word id & verse text length to keep it feeling consistent but varied
    const seededOrder = [...indexableWords].sort((a, b) => {
      const seedA = (a.id * 17 + currentVerse.text.length * 3) % 100;
      const seedB = (b.id * 17 + currentVerse.text.length * 3) % 100;
      return seedA - seedB;
    });

    // Pick top targetHideCount words to hide
    const hiddenIds = new Set(seededOrder.slice(0, targetHideCount).map(w => w.id));

    return tokenizedWords.map(w => ({
      ...w,
      isRandomlyHidden: hiddenIds.has(w.id)
    }));
  }, [tokenizedWords, mode, hiddenPercentage, currentVerse]);

  // Reset interactive states when verse or mode changes
  useEffect(() => {
    setRevealedHints({});
    setManualHiddenWordIds(new Set());
    setUserAttemptText('');
    setTestResult(null);
    setShowCelebration(false);
    setInterimTranscript('');
    if (isRecording && recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (e) {}
    }
  }, [selectedVerseIndex, mode]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionInstance) {
        try {
          recognitionInstance.stop();
        } catch (e) {}
      }
    };
  }, [recognitionInstance]);

  // Toggle voice recording
  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    if (isRecording) {
      if (recognitionInstance) {
        try {
          recognitionInstance.stop();
        } catch (e) {
          console.error(e);
        }
      }
      setIsRecording(false);
    } else {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'fr-FR';

        rec.onstart = () => {
          setIsRecording(true);
          setInterimTranscript('');
        };

        rec.onresult = (event: any) => {
          let finalTranscript = '';
          let interim = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            setUserAttemptText(prev => {
              const prefix = prev.trim() ? prev.trim() + ' ' : '';
              return prefix + finalTranscript;
            });
          }
          setInterimTranscript(interim);
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsRecording(false);
        };

        rec.onend = () => {
          setIsRecording(false);
        };

        setRecognitionInstance(rec);
        rec.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    }
  };

  // Auto-fill prompt if user switches to self-test
  const testWordCount = useMemo(() => {
    return tokenizedWords.filter(w => !w.isPunctuation).length;
  }, [tokenizedWords]);

  // Helper: toggle hover-state manual mask if manual mode is active
  const handleWordClick = (word: InteractiveWord) => {
    if (word.isPunctuation) return;

    if (mode === 'manual') {
      const newManualSet = new Set(manualHiddenWordIds);
      if (newManualSet.has(word.id)) {
        newManualSet.delete(word.id);
      } else {
        newManualSet.add(word.id);
      }
      setManualHiddenWordIds(newManualSet);
    } else {
      // Temporary peek toggle hint
      setRevealedHints(prev => ({
        ...prev,
        [word.id]: !prev[word.id]
      }));
    }
  };

  // Helper check: is word currently masked?
  const isWordMasked = (word: InteractiveWord) => {
    if (word.isPunctuation) return false;
    
    // Hint overrides mask
    if (revealedHints[word.id]) return false;

    if (mode === 'progressive' || mode === 'challenge') {
      return word.isRandomlyHidden;
    }
    if (mode === 'manual') {
      return word.isManuallyHidden;
    }
    if (mode === 'first_letter') {
      return true; // first letter always hides the rest of the word
    }
    return false;
  };

  // Format masked word text
  const getRenderedWordText = (word: InteractiveWord) => {
    if (word.isPunctuation) return word.text;

    const isMasked = isWordMasked(word);
    
    if (isMasked) {
      if (mode === 'first_letter') {
        const firstChar = word.text.charAt(0);
        const placeholderUnderscores = '_'.repeat(Math.max(1, word.text.length - 1));
        return `${firstChar}${placeholderUnderscores}`;
      }
      // Blank box representation
      return '▨'.repeat(Math.min(8, word.text.length));
    }

    return word.text;
  };

  // Speak aloud the selected verse text using SpeechSynthesis
  const speakVerseAloud = () => {
    if (!window.speechSynthesis) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const textToSpeak = currentVerse.text;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'fr-FR';
    
    // Read preferences from localStorage
    let storedGender = 'auto';
    let storedVoiceURI = '';
    let storedPitch = 1.0;
    try {
      storedGender = localStorage.getItem('bible_voice_gender') || 'auto';
      storedVoiceURI = localStorage.getItem('bible_preferred_voice_uri') || '';
      const p = localStorage.getItem('bible_voice_pitch');
      if (p) storedPitch = Number(p);
    } catch (_) {}

    // Select a premium French voice
    const voices = window.speechSynthesis.getVoices();
    const frenchVoices = voices.filter(v => v.lang.startsWith('fr') || v.lang.includes('FR'));
    
    // Sort French voices: prioritize higher fidelity/cloud-based voices (Google, Natural, Neural, Premium, High, etc.)
    const sortedFrenchVoices = [...frenchVoices].sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      const aIsPremium = aLower.includes('google') || aLower.includes('natural') || aLower.includes('neural') || aLower.includes('premium') || aLower.includes('high');
      const bIsPremium = bLower.includes('google') || bLower.includes('natural') || bLower.includes('neural') || bLower.includes('premium') || bLower.includes('high');
      if (aIsPremium && !bIsPremium) return -1;
      if (!aIsPremium && bIsPremium) return 1;
      if (a.localService === false && b.localService === true) return -1;
      if (a.localService === true && b.localService === false) return 1;
      return 0;
    });

    const lowerMaleNames = [
      'paul', 'thomas', 'nicolas', 'daniel', 'guy', 'julien', 'bernard', 'male', 'homme', 'microsoft paul', 
      'nils', 'sébastien', 'sebastien', 'alain', 'pierre', 'michel', 'jean', 'jacques', 'philippe', 'henri', 'microsoft henri',
      'olivier', 'christophe', 'gilles', 'yves', 'luc', 'gérard', 'gerard', 'rene', 'rené', 'claude', 'andre', 'andré',
      'x-frd', 'x-frb', 'x-fri', 'male', 'man', 'boy', 'guy'
    ];
    const lowerFemaleNames = [
      'hortense', 'julie', 'aurelie', 'aurélie', 'celeste', 'céleste', 'virginie', 'helene', 'hélène', 
      'chloe', 'chloé', 'female', 'femme', 'amelie', 'amélie', 'marie', 'audrey', 'clara', 'alice', 
      'laura', 'renee', 'renée', 'lucie', 'mathilde', 'valerie', 'valérie', 'celine', 'céline', 'elise', 
      'élise', 'lea', 'léa', 'emma', 'manon', 'camille', 'zoe', 'zoé', 'sarah', 'louise', 'microsoft hortense', 
      'zira', 'google français'
    ];
    
    let selectedVoice: SpeechSynthesisVoice | null = null;
    
    if (storedVoiceURI) {
      selectedVoice = sortedFrenchVoices.find(voice => voice.voiceURI === storedVoiceURI) || null;
    }

    if (!selectedVoice) {
      if (storedGender === 'male') {
        selectedVoice = sortedFrenchVoices.find(voice => 
          lowerMaleNames.some(name => voice.name.toLowerCase().includes(name))
        ) || null;
        if (!selectedVoice) {
          selectedVoice = sortedFrenchVoices.find(voice => 
            !lowerFemaleNames.some(name => voice.name.toLowerCase().includes(name))
          ) || null;
        }
      } else if (storedGender === 'female') {
        selectedVoice = sortedFrenchVoices.find(voice => 
          lowerFemaleNames.some(name => voice.name.toLowerCase().includes(name))
        ) || null;
        if (!selectedVoice) {
          selectedVoice = sortedFrenchVoices.find(voice => 
            !lowerMaleNames.some(name => voice.name.toLowerCase().includes(name))
          ) || null;
        }
      }
    }

    if (!selectedVoice && sortedFrenchVoices.length > 0) {
      selectedVoice = sortedFrenchVoices.find(voice => voice.lang.includes('FR')) || sortedFrenchVoices[0];
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Apply gender-optimized pitch
    if (storedGender === 'male') {
      const isKnownMale = selectedVoice ? lowerMaleNames.some(name => selectedVoice!.name.toLowerCase().includes(name)) : false;
      utterance.pitch = isKnownMale ? Math.max(0.65, storedPitch * 0.88) : Math.max(0.60, storedPitch * 0.74);
    } else if (storedGender === 'female') {
      const isKnownFemale = selectedVoice ? lowerFemaleNames.some(name => selectedVoice!.name.toLowerCase().includes(name)) : false;
      utterance.pitch = isKnownFemale ? storedPitch * 1.02 : Math.min(1.8, storedPitch * 1.18);
    } else {
      utterance.pitch = storedPitch;
    }

    utterance.rate = 0.85;

    window.speechSynthesis.speak(utterance);
  };

  // Core Self-Test submission logic (Word validation algorithm)
  const handleVerifySubmission = () => {
    if (!userAttemptText.trim()) return;

    const targetText = currentVerse.text;
    // Clean strings helper
    const cleanWord = (w: string) => w.toLowerCase()
      .trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove French accents
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()«»"’']/g, "");

    const targetWords = targetText.split(/\s+/).filter(w => w.length > 0);
    const userWords = userAttemptText.split(/\s+/).filter(w => w.length > 0);

    let matchCount = 0;
    const diffArr: { text: string; status: 'correct' | 'wrong' | 'missing' }[] = [];

    // Simple robust sequence match comparisons
    targetWords.forEach((targetW, idx) => {
      const userW = userWords[idx];

      if (!userW) {
        // Word missing in user attempt
        diffArr.push({
          text: targetW,
          status: 'missing'
        });
      } else if (cleanWord(userW) === cleanWord(targetW)) {
        matchCount++;
        diffArr.push({
          text: userW,
          status: 'correct'
        });
      } else {
        diffArr.push({
          text: `${userW} (Attendu: ${targetW})`,
          status: 'wrong'
        });
      }
    });

    const scorePercent = Math.round((matchCount / targetWords.length) * 100);

    setTestResult({
      score: scorePercent,
      totalWords: targetWords.length,
      diffWords: diffArr,
      checked: true
    });

    if (scorePercent === 100) {
      setShowCelebration(true);
    }
  };

  const handleResetChallenge = () => {
    setRevealedHints({});
    setManualHiddenWordIds(new Set());
    setUserAttemptText('');
    setTestResult(null);
    setShowCelebration(false);
  };

  return (
    <div className="bg-[#12100c] border border-[#c9a84c]/20 p-4 sm:p-6 rounded-2xl shadow-xl w-full text-left font-serif select-none">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#2e2a1e]/60 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2 text-[#c9a84c]">
            <Brain className="w-5 h-5 text-[#c9a84c] shrink-0" />
            <h2 className="text-base font-black tracking-wider uppercase font-serif">Mémorisation Sacrée</h2>
          </div>
          <p className="text-[11px] text-[#6b6355] mt-1 font-sans">
            Gravez les Écritures célestes dans votre cœur à l'aide de notre algorithme d'occultation à trous interactif.
          </p>
        </div>

        {favorites.length > 0 && (
          <div className="flex items-center gap-1.5 py-1 px-2.5 bg-[#1a1712] border border-[#c9a84c]/14 rounded-full">
            <Star className="w-3.5 h-3.5 text-[#c9a84c] fill-[#c9a84c]" />
            <span className="text-[10px] font-mono font-bold text-[#c9a84c]">
              {favorites.length} Favoris Importés
            </span>
          </div>
        )}
      </div>

      {/* CORE DISPLAY GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COMPONENT: VERSE SELECTOR & PERFORMANCE BOARD */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#161410] border border-[#2e2a1e]/60 rounded-xl p-3.5">
            <h3 className="text-[10px] font-mono tracking-widest text-[#c9a84c] uppercase font-bold mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Choisir un Verset
            </h3>

            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
              {allAvailableVerses.map((f, idx) => {
                const isUserFav = favorites.some(fav => fav.book_id === f.book_id && fav.chapter === f.chapter && fav.verse === f.verse);
                const isSelected = selectedVerseIndex === idx;

                return (
                  <button
                    key={`${f.book_id}_${f.chapter}_${f.verse}`}
                    onClick={() => setSelectedVerseIndex(idx)}
                    className={`w-full p-2.5 text-left text-xs rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                      isSelected 
                        ? 'bg-[#c9a84c]/10 border-[#c9a84c] text-[#e8e0d0]' 
                        : 'bg-[#12100c] border-[#2e2a1e] text-[#6b6355] hover:border-[#c9a84c]/20 hover:text-[#b8af9e]'
                    }`}
                  >
                    <div className="mt-0.5">
                      <Star className={`w-3 h-3 ${isUserFav ? 'text-[#c9a84c] fill-[#c9a84c]' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-black text-[#c9a84c] text-[10.5px]">
                          {f.book_name} {f.chapter}:{f.verse}
                        </span>
                        {isUserFav && (
                          <span className="text-[8px] font-mono bg-[#c9a84c]/14 text-[#c9a84c] px-1 py-0.5 rounded uppercase font-bold shrink-0">Signet</span>
                        )}
                      </div>
                      <p className="line-clamp-1 italic text-[10px] text-[#8e8574] mt-0.5 shrink-0">« {f.text} »</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* METHOD SELECTION TRAY */}
          <div className="bg-[#161410] border border-[#2e2a1e]/60 rounded-xl p-3.5 space-y-2.5 text-[11px] font-sans text-left">
            <h3 className="text-[10px] font-mono tracking-widest text-[#c9a84c] uppercase font-bold flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Méthodes d'exercice
            </h3>

            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'progressive', label: 'Progressif', desc: 'Sélecteur de masquage' },
                { id: 'first_letter', label: 'Initiales', desc: 'Indice de la première lettre' },
                { id: 'manual', label: 'Manuel', desc: 'Cliquez les mots à masquer' },
                { id: 'challenge', label: 'Défi Secret', desc: 'Mode aveugle intégral' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMode(m.id as MemorizationMode);
                    if (m.id === 'challenge') setHiddenPercentage(100);
                    if (m.id === 'progressive') setHiddenPercentage(40);
                  }}
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                    mode === m.id 
                      ? 'bg-[#1c1913] border-[#c9a84c] text-[#e8e0d0]' 
                      : 'bg-[#12100c] border-[#2e2a1e] text-[#6b6355] hover:border-[#c9a84c]/10'
                  }`}
                >
                  <span className="text-[10px] font-bold block">{m.label}</span>
                  <span className="text-[8.5px] leading-tight text-[#6b6355] block mt-0.5">{m.desc}</span>
                </button>
              ))}
            </div>

            {/* PROGRESSIVE SLIDER WIDGET */}
            {(mode === 'progressive' || mode === 'challenge') && (
              <div className="space-y-1.5 pt-2 border-t border-[#2e2a1e]/60">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-[#6b6355]">OBSCURITÉ (MASQUE)</span>
                  <span className="text-[#c9a84c] font-bold">{hiddenPercentage}%</span>
                </div>
                <input 
                  type="range" 
                  min={0} 
                  max={100} 
                  step={5}
                  value={hiddenPercentage}
                  onChange={(e) => setHiddenPercentage(Number(e.target.value))}
                  className="w-full accent-[#c9a84c] bg-[#2e2a1e] h-1 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[8px] text-[#6b6355] font-mono">
                  <span>DOUX (0%)</span>
                  <span>MOYEN (50%)</span>
                  <span>INTENSE (100%)</span>
                </div>
              </div>
            )}

            {mode === 'manual' && (
              <div className="p-2.5 bg-[#c9a84c]/5 rounded-lg border border-[#c9a84c]/10 text-[9.5px] text-[#8e8574] leading-normal">
                💡 <strong className="text-[#c9a84c] font-sans">Mode Manuel actif :</strong> Pour masquer ou afficher un mot, cliquez simplement dessus directement dans le panneau de droite.
              </div>
            )}

            {mode === 'first_letter' && (
              <div className="p-2.5 bg-[#c9a84c]/5 rounded-lg border border-[#c9a84c]/10 text-[9.5px] text-[#8e8574] leading-normal">
                💡 <strong className="text-[#c9a84c] font-sans">Méthode d'initiale :</strong> Conserve uniquement la première lettre de chaque mot porteur. Une gymnastique mentale remarquable pour mémoriser.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE PLAYGROUND BOX */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          
          {/* THE MASKED BIBLE VERSE CARD */}
          <div className="bg-[#181511] border border-[#c9a84c]/20 p-5 sm:p-7 rounded-2xl relative shadow-2xl overflow-hidden min-h-[190px] flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-3 flex gap-2">
              <button 
                onClick={speakVerseAloud}
                className="p-1 px-2.5 rounded-full bg-[#1e1a14] border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#c9a84c] text-[10px] font-sans font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                title="Écouter la lecture audio"
              >
                <Volume2 className="w-3 h-3" />
                <span>Audition</span>
              </button>

              <button 
                onClick={handleResetChallenge}
                className="p-1 px-2 text-xs rounded-full bg-[#1e1a14] border border-[#2e2a1e] hover:border-[#c9a84c]/40 text-[#6b6355] hover:text-[#e8e0d0] transition-all cursor-pointer"
                title="Réinitialiser l'exercice"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* Reference */}
            <div className="text-left font-sans text-[10px] font-mono tracking-widest text-[#c9a84c] uppercase font-bold mb-4">
              ✨ {currentVerse.book_name} {currentVerse.chapter}:{currentVerse.verse} Sorte
            </div>

            {/* Interspersed masked text panel */}
            <div className="flex-1 py-1 text-left leading-relaxed font-serif text-lg sm:text-xl text-[#e8e0d0] select-none text-wrap flex flex-wrap gap-x-1.5 gap-y-2.5 font-medium italic items-baseline">
              {processedWords.map((word) => {
                const isMasked = isWordMasked(word);
                
                return (
                  <span
                    key={word.id}
                    onClick={() => handleWordClick(word)}
                    className={`transition-all duration-200 cursor-pointer rounded px-1 py-0.5 ${
                      word.isPunctuation 
                        ? 'text-[#6b6355]' 
                        : isMasked 
                          ? 'bg-[#292215]/80 text-[#c9a84c] border border-dashed border-[#c9a84c]/40 select-none hover:bg-[#3d3320] text-sm font-sans'
                          : 'hover:bg-white/[0.04] text-[#e8e0d0]'
                    }`}
                    title={isMasked ? "Cliquer pour afficher l'indice" : (mode === 'manual' ? "Cliquer pour masquer ce mot" : undefined)}
                  >
                    {getRenderedWordText(word)}
                  </span>
                );
              })}
            </div>

            {/* Card Info message footer */}
            <div className="mt-5 pt-3 border-t border-[#2e2a1e]/40 flex justify-between items-center text-[10px] font-sans text-[#6b6355]">
              <span>Cliquez sur un mot masqué pour l'apercevoir temporairement.</span>
              <span className="font-mono">{testWordCount} mots clés</span>
            </div>
          </div>

          {/* SELF-TEST EVALUATOR (CHALLENGE WRITING CHECK) */}
          <div className="bg-[#161410] border border-[#2e2a1e]/60 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#2e2a1e]/65">
              <h3 className="text-xs font-mono font-bold text-[#c9a84c] uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Console de Récitation
              </h3>
              
              <div className="flex bg-[#12100c] border border-[#2e2a1e] rounded-lg p-0.5 text-[9px] font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setRecitationMethod('write');
                    if (isRecording) toggleRecording();
                  }}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                    recitationMethod === 'write' 
                      ? 'bg-[#c9a84c] text-[#0d0b07] font-bold' 
                      : 'text-[#6b6355] hover:text-[#e8e0d0]'
                  }`}
                >
                  Clavier
                </button>
                <button
                  type="button"
                  onClick={() => setRecitationMethod('voice')}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                    recitationMethod === 'voice' 
                      ? 'bg-[#c9a84c] text-[#0d0b07] font-bold' 
                      : 'text-[#6b6355] hover:text-[#e8e0d0]'
                  }`}
                >
                  <Mic className="w-2.5 h-2.5" />
                  Voix L'Écoute
                </button>
              </div>
            </div>

            {recitationMethod === 'voice' ? (
              <div className="space-y-4">
                {!speechSupported ? (
                  <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl text-center text-xs text-red-400 font-sans">
                    La reconnaissance vocale n'est pas prise en charge par ce navigateur ou nécessite une connexion sécurisée. Veuillez utiliser le mode Clavier.
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 bg-[#12100c] border border-[#2e2a1e]/80 rounded-xl space-y-4 text-center">
                    {/* Pulsing micro button in golden style */}
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center border transition-all duration-300 transform active:scale-95 cursor-pointer ${
                        isRecording 
                          ? 'bg-red-950/40 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse' 
                          : 'bg-[#1c1913] border-[#c9a84c]/50 hover:border-[#c9a84c] text-[#c9a84c]'
                      }`}
                    >
                      {isRecording ? (
                        <MicOff className="w-8 h-8" />
                      ) : (
                        <Mic className="w-8 h-8" />
                      )}

                      {/* Visual sound rings */}
                      {isRecording && (
                        <>
                          <span className="absolute -inset-2 border border-red-500/30 rounded-full animate-ping pointer-events-none" />
                          <span className="absolute -inset-4 border border-red-500/10 rounded-full animate-pulse pointer-events-none" />
                        </>
                      )}
                    </button>

                    <div className="space-y-1">
                      <p className="text-xs font-serif font-black text-[#e8e0d0]">
                        {isRecording ? "L'application vous écoute..." : "Prêt pour la récitation vocale"}
                      </p>
                      <p className="text-[10px] text-[#6b6355] max-w-xs leading-normal">
                        {isRecording 
                          ? "Récitez le verset de mémoire de vive voix maintenant. Appuyez sur le bouton rouge pour terminer." 
                          : "Cliquez sur le micro or, autorisez l'accès au micro et récitez le verset."}
                      </p>
                    </div>

                    {/* LIVE TRANSCRIPT FEEDBACK */}
                    {(userAttemptText || interimTranscript) && (
                      <div className="w-full pt-3 border-t border-[#2e2a1e]/40 text-left space-y-1.5">
                        <span className="text-[9px] font-mono text-[#6b6355] uppercase tracking-wider block">Transcription en temps réel :</span>
                        <div className="p-3 bg-[#0d0b07] border border-[#2e2a1e]/50 rounded-lg min-h-[50px] font-serif italic text-xs leading-relaxed text-[#e8e0d0] text-wrap">
                          {userAttemptText}
                          {interimTranscript && (
                            <span className="text-[#6b6355] selection:bg-transparent">
                              {' '}{interimTranscript}
                            </span>
                          )}
                        </div>
                        {userAttemptText && (
                          <div className="flex justify-between items-center text-[8.5px] font-mono text-[#6b6355]">
                            <span>Vous pouvez modifier ce texte s'il y a des erreurs, puis l'évaluer ci-dessous.</span>
                            <button
                              type="button"
                              onClick={() => {
                                setUserAttemptText('');
                                setInterimTranscript('');
                                if (testResult) setTestResult(null);
                              }}
                              className="text-[#c9a84c] hover:underline cursor-pointer"
                            >
                              Effacer
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <textarea
                className="w-full p-3 bg-[#12100c] border border-[#2e2a1e] focus:border-[#c9a84c]/50 text-xs sm:text-sm text-[#e8e0d0] rounded-xl outline-none transition font-serif italic"
                rows={3}
                value={userAttemptText}
                onChange={(e) => {
                  setUserAttemptText(e.target.value);
                  if (testResult) setTestResult(null); // clear results on modification
                }}
                placeholder="Écrivez le verset fidèlement de mémoire ici..."
              />
            )}

            {/* SUBMIT EVALUATION */}
            <div className="flex justify-end gap-3">
              {testResult?.checked && (
                <button
                  onClick={handleResetChallenge}
                  className="px-4 py-2 bg-[#1c1913] hover:bg-[#28241b] border border-[#c9a84c]/20 hover:border-[#c9a84c]/40 text-[#c9a84c] text-xs font-sans font-bold rounded-xl transition duration-150 cursor-pointer"
                >
                  Effacer
                </button>
              )}

              <button
                onClick={handleVerifySubmission}
                disabled={!userAttemptText.trim()}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs font-sans transition duration-150 inline-flex items-center gap-1.5 cursor-pointer shadow-md ${
                  userAttemptText.trim()
                    ? 'bg-gradient-to-r from-[#a08232] to-[#c9a84c] text-[#0d0b07] hover:from-[#b0923e] hover:to-[#dfba5a] active:scale-[0.98]'
                    : 'bg-[#1e1b15] text-[#4d463b] border border-[#2e2a1e] cursor-not-allowed'
                }`}
              >
                <span>Vérifier la fidélité de ma récitation</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* TEST RESULT AND HIGHLIGHTING VIEWPORT */}
            <AnimatePresence>
              {testResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-3 border-t border-[#2e2a1e]/40 overflow-hidden text-left space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#6b6355] uppercase">Indicateur de Précision Littérale</span>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-sans text-gray-400">Score de fidélité :</span>
                      <span className={`text-base font-mono font-black ${
                        testResult.score >= 90 ? 'text-emerald-500' : testResult.score >= 60 ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {testResult.score}%
                      </span>
                    </div>
                  </div>

                  {/* Progress evaluation rating bar */}
                  <div className="w-full bg-[#12100c] h-2 rounded-full overflow-hidden border border-[#2e2a1e]">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        testResult.score >= 90 ? 'bg-emerald-500 shadow-emerald-glow' : testResult.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${testResult.score}%` }}
                    />
                  </div>

                  {/* Comparison Diff Box */}
                  <div className="bg-[#12100c] p-3 border border-[#2e2a1e] rounded-xl text-xs space-y-2">
                    <div className="text-[9px] font-mono text-[#6b6355] uppercase font-bold">Analyse mot-à-mot comparée :</div>
                    <div className="flex flex-wrap gap-x-1.5 gap-y-2 font-serif text-[13px] leading-relaxed italic pr-1">
                      {testResult.diffWords.map((item, idx) => (
                        <span 
                          key={idx} 
                          className={`rounded px-1.5 py-0.5 inline-block ${
                            item.status === 'correct' 
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' 
                              : item.status === 'wrong'
                                ? 'bg-red-950/40 text-red-400 border border-red-500/20 line-through decoration-red-700 decoration-2'
                                : 'bg-amber-950/40 text-[#c9a84c] border border-amber-500/20 border-dashed'
                          }`}
                        >
                          {item.text}
                        </span>
                      ))}
                    </div>
                    {testResult.score < 100 && (
                      <div className="pt-2 border-t border-[#2e2a1e]/40 flex gap-1.5 items-center text-[10px] text-[#8e8574] font-sans">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Les mots en rouge ou soulignés diffèrent des écritures d'origine. Les mots jaunâtres ont été omis. Courage ! Vous y êtes presque.</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CELEBRATION OVERLAY BANNER */}
            <AnimatePresence>
              {showCelebration && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-gradient-to-br from-emerald-950/40 to-emerald-900/10 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-4 text-left shadow-soft"
                >
                  <Award className="w-10 h-10 text-emerald-400 animate-bounce shrink-0" />
                  <div>
                    <h4 className="font-serif font-black text-emerald-400 uppercase text-xs tracking-wider">Fidélité Absolue et Parfaite !</h4>
                    <p className="text-[10.5px] text-[#e8e0d0]/90 mt-0.5 leading-normal">
                      Excellent travail ! Votre récitation reflète la perfection mot-à-mot d'origine. Ce verset sacré habite désormais fermement dans votre mémoire. Continuez d'étudier et de fortifier votre esprit ! 📖✨
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

      </div>

    </div>
  );
};
