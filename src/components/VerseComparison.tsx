import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, Copy, Sparkles, BookOpen, AlertCircle, ArrowRightLeft, Info, HelpCircle
} from 'lucide-react';
import { Verse } from '../types/bible';

interface Translation {
  code: string;
  name: string;
  text: string;
  language: string;
  description: string;
}

interface ComparativeData {
  reference: string;
  translations: Translation[];
}

interface VerseComparisonProps {
  verse: Verse;
}

export const VerseComparison: React.FC<VerseComparisonProps> = ({ verse }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ComparativeData | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Comparative Dual-Column Selector State
  const [leftVersion, setLeftVersion] = useState<string>('LSG');
  const [rightVersion, setRightVersion] = useState<string>('KJV');

  const fetchComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/gemini/compare-verse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookName: verse.book_name,
          chapter: verse.chapter,
          verse: verse.verse,
          originalText: verse.text.replace(/\[[HG]\d+\]/g, '')
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Impossible d'obtenir les traductions d'analyses.");
      
      setData(resData);
      
      // Auto-select standard codes if available
      if (resData.translations && resData.translations.length > 1) {
        const hasKJV = resData.translations.some((t: Translation) => t.code === 'KJV');
        if (hasKJV) setRightVersion('KJV');
        else setRightVersion(resData.translations[1].code);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erreur de connexion lors du chargement des versions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [verse]);

  const handleCopyText = (text: string, code: string) => {
    navigator.clipboard.writeText(`[${code}] ${verse.book_name} ${verse.chapter}:${verse.verse} - "${text}"`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getTranslationByCode = (code: string): Translation | undefined => {
    if (code === 'LSG' && !data?.translations.some(t => t.code === 'LSG')) {
      // Fallback if LSG is not outputted in translations list
      return {
        code: 'LSG',
        name: 'Louis Segond (1910)',
        text: verse.text.replace(/\[[HG]\d+\]/g, ''),
        language: 'fr',
        description: 'La version de référence d\'étude dans votre application.'
      };
    }
    return data?.translations.find(t => t.code === code);
  };

  const leftItem = getTranslationByCode(leftVersion);
  const rightItem = getTranslationByCode(rightVersion);

  return (
    <div className="space-y-5 animate-fade-slide-up text-left">
      {/* Header and status info */}
      <div className="bg-[#12100c]/80 border border-[#2e2a1e] rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 select-none">
        <div className="space-y-1">
          <h5 className="font-serif font-black text-sm text-[#c9a84c] flex items-center gap-1.5 uppercase">
            <ArrowRightLeft className="w-4 h-4 text-[#c9a84c] animate-pulse" />
            <span>Laboratoire d'Étude Comparative</span>
          </h5>
          <p className="text-[11px] text-luxury-text-muted leading-relaxed font-sans max-w-lg">
            Comparez côte à côte différentes traductions historiques (littérales, dynamiques) et les textes originaux (grec/hébreu translittérés) pour percer le sens théologique profond du verset.
          </p>
        </div>
        {data && !loading && (
          <button 
            onClick={fetchComparison}
            className="text-[10px] font-mono font-bold bg-[#1a1712] text-[#c9a84c] border border-[#c9a84c]/20 rounded-xl px-3 py-1.5 hover:bg-[#c9a84c]/10 transition cursor-pointer"
          >
            Rafraîchir
          </button>
        )}
      </div>

      {loading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 rounded-full border-t-2 border-[#c9a84c] animate-spin"></div>
          <p className="text-[11px] font-mono text-[#6b6355] uppercase tracking-widest animate-pulse">Consultation des manuscrits multilingues...</p>
        </div>
      )}

      {error && (
        <div className="p-5 bg-rose-500/5 border border-rose-500/15 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-xs text-[#e8e0d0]">{error}</p>
          <button 
            onClick={fetchComparison}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-mono text-[10px] uppercase font-bold rounded-xl transition cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-5">
          {/* COMPARATIVE CONTROLS PANEL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Column Left Selector */}
            <div className="space-y-2">
              <label className="text-[9px] font-mono text-luxury-text-muted tracking-wider uppercase font-bold block">Version A (Gauche)</label>
              <select
                value={leftVersion}
                onChange={(e) => setLeftVersion(e.target.value)}
                className="w-full bg-[#12100c] border border-[#2e2a1e] rounded-xl px-3 py-2 text-xs font-serif text-[#e8e0d0] focus:ring-1 focus:ring-[#c9a84c]/30 focus:outline-none"
              >
                {/* Fallback Reference option */}
                <option value="LSG">Louis Segond (1910) — Référence</option>
                {data.translations.map((t) => (
                  <option key={`left_${t.code}`} value={t.code}>
                    {t.name} [{t.code}]
                  </option>
                ))}
              </select>
            </div>

            {/* Column Right Selector */}
            <div className="space-y-2">
              <label className="text-[9px] font-mono text-luxury-text-muted tracking-wider uppercase font-bold block">Version B (Droite)</label>
              <select
                value={rightVersion}
                onChange={(e) => setRightVersion(e.target.value)}
                className="w-full bg-[#12100c] border border-[#2e2a1e] rounded-xl px-3 py-2 text-xs font-serif text-[#e8e0d0] focus:ring-1 focus:ring-[#c9a84c]/30 focus:outline-none"
              >
                {data.translations.map((t) => (
                  <option key={`right_${t.code}`} value={t.code}>
                    {t.name} [{t.code}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DUAL STREAM SIDE-BY-SIDE PRESENTATION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 select-text">
            
            {/* Version A Card rendering */}
            <div className="bg-[#12100c] border border-[#2e2a1e] rounded-[2rem] p-5 md:p-6 flex flex-col justify-between space-y-4 hover:border-[#c9a84c]/15 transition">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#2e2a1e]/40">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-black text-[#c9a84c] bg-[#c9a84c]/10 border border-[#c9a84c]/20 px-1.5 py-0.5 rounded">
                      {leftItem ? leftItem.code : 'LSG'}
                    </span>
                    <span className="font-serif text-[12.5px] font-extrabold text-[#e8e0d0]">
                      {leftItem ? leftItem.name : 'Louis Segond (1910)'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyText(leftItem?.text || verse.text, leftItem?.code || 'LSG')}
                    className="p-1.5 bg-[#15120e] hover:bg-[#201c15] text-[#6b6355] hover:text-[#c9a84c] rounded-lg border border-[#2e2a1e] transition cursor-pointer"
                    title="Copier avec référence"
                  >
                    {copiedCode === (leftItem?.code || 'LSG') ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="font-reading text-[15px] md:text-[16px] leading-[26px] text-luxury-text-primary italic py-2 min-h-[90px]">
                  « {leftItem ? leftItem.text : verse.text.replace(/\[[HG]\d+\]/g, '')} »
                </div>
              </div>

              {leftItem?.description && (
                <div className="bg-[#15120e] border border-[#2e2a1e]/50 rounded-xl p-3 flex gap-2.5 items-start">
                  <Info className="w-3.5 h-3.5 text-[#c9a84c] shrink-0 mt-0.5" />
                  <p className="text-[10px] font-sans text-luxury-text-muted leading-relaxed">
                    {leftItem.description}
                  </p>
                </div>
              )}
            </div>

            {/* Version B Card rendering */}
            <div className="bg-[#12100c] border border-[#2e2a1e] rounded-[2rem] p-5 md:p-6 flex flex-col justify-between space-y-4 hover:border-[#c9a84c]/15 transition">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#2e2a1e]/40">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono font-black text-[#c9a84c] bg-[#c9a84c]/10 border border-[#c9a84c]/20 px-1.5 py-0.5 rounded">
                      {rightItem ? rightItem.code : 'KJV'}
                    </span>
                    <span className="font-serif text-[12.5px] font-extrabold text-[#e8e0d0]">
                      {rightItem ? rightItem.name : 'King James Version'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyText(rightItem?.text || '', rightItem?.code || '')}
                    className="p-1.5 bg-[#15120e] hover:bg-[#201c15] text-[#6b6355] hover:text-[#c9a84c] rounded-lg border border-[#2e2a1e] transition cursor-pointer"
                    title="Copier avec référence"
                  >
                    {copiedCode === (rightItem?.code || '') ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="font-reading text-[15px] md:text-[16px] leading-[26px] text-luxury-text-primary italic py-2 min-h-[90px]">
                  « {rightItem ? rightItem.text : "Sélectionner une seconde version..."} »
                </div>
              </div>

              {rightItem?.description && (
                <div className="bg-[#15120e] border border-[#2e2a1e]/50 rounded-xl p-3 flex gap-2.5 items-start">
                  <Info className="w-3.5 h-3.5 text-[#c9a84c] shrink-0 mt-0.5" />
                  <p className="text-[10px] font-sans text-luxury-text-muted leading-relaxed">
                    {rightItem.description}
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* ALL LOADED VERSIONS SUMMARY TRAY */}
          <div className="bg-[#0f0d09] border border-[#2e2a1e] rounded-[2rem] p-5 space-y-3.5">
            <span className="text-[8.5px] font-mono tracking-widest text-[#c9a84c] uppercase block font-black border-b border-[#2e2a1e] pb-1.5">
              Toutes les traductions disponibles du verset
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar select-text">
              {data.translations.map((t) => {
                const isSelectedCol = leftVersion === t.code || rightVersion === t.code;
                return (
                  <div 
                    key={`all_${t.code}`}
                    className={`p-3.5 rounded-2xl border transition duration-150 flex flex-col justify-between gap-2 text-left ${
                      isSelectedCol 
                        ? 'bg-[#15120e] border-[#c9a84c]/20' 
                        : 'bg-[#12100cb5] border-[#2e2a1e]/60 hover:border-[#2e2a1e]'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8.5px] font-mono font-bold text-[#c9a84c] bg-[#c9a84c]/5 rounded px-1">{t.code}</span>
                        <span className="text-[11px] font-serif font-black text-[#e8e0d0] truncate max-w-[170px]">{t.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setLeftVersion(t.code)}
                          className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded border transition cursor-pointer ${
                            leftVersion === t.code 
                              ? 'bg-[#c9a84c] text-[#0d0b07] border-[#c9a84c] font-black' 
                              : 'bg-transparent text-[#6b6355] border-[#2e2a1e] hover:text-[#e8e0d0]'
                          }`}
                        >
                          Col. A
                        </button>
                        <button
                          onClick={() => setRightVersion(t.code)}
                          className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded border transition cursor-pointer ${
                            rightVersion === t.code 
                              ? 'bg-[#c9a84c] text-[#0d0b07] border-[#c9a84c] font-black' 
                              : 'bg-transparent text-[#6b6355] border-[#2e2a1e] hover:text-[#e8e0d0]'
                          }`}
                        >
                          Col. B
                        </button>
                      </div>
                    </div>

                    <p className="text-[12.5px] font-reading leading-relaxed text-[#c9a84c]/90 line-clamp-2 italic">
                      {t.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
