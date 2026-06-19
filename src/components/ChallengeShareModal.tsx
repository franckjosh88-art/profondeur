import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, Download, Share2, Palette, Image as ImageIcon, Copy, Check, Type,
  Sparkles, Award, Star, Trophy, RefreshCw, Layers
} from 'lucide-react';
import { ReadingPlan } from '../types/challenges';

interface ChallengeShareModalProps {
  plan: ReadingPlan;
  onClose: () => void;
  completedChaptersCount: number;
  totalChaptersCount: number;
}

type ThemePreset = 'gold_crown' | 'parchment_victory' | 'heavenly_starlight' | 'emerald_glory' | 'royal_velvet';
type AspectRatio = 'square' | 'story' | 'landscape';
type CardFont = 'garamond' | 'cinzel' | 'playfair' | 'montserrat' | 'mono';

interface ThemeConfig {
  id: ThemePreset;
  name: string;
  bgCanvasGradient: string[]; // start, end colors
  textColor: string;
  referenceColor: string;
  borderColor: string;
  accentColor: string;
  glowColor: string;
}

const THEME_CONFIGS: Record<ThemePreset, ThemeConfig> = {
  gold_crown: {
    id: 'gold_crown',
    name: 'Couronne d\'Or Solennel',
    bgCanvasGradient: ['#0f0d09', '#050403'],
    textColor: '#f4efe2',
    referenceColor: '#c9a84c',
    borderColor: 'rgba(201, 168, 76, 0.28)',
    accentColor: '#c9a84c',
    glowColor: '201, 168, 76'
  },
  parchment_victory: {
    id: 'parchment_victory',
    name: 'Manuscrit de Triomphe',
    bgCanvasGradient: ['#fbf8f0', '#ebdcb7'],
    textColor: '#1a140e',
    referenceColor: '#7a5a1f',
    borderColor: 'rgba(122, 90, 31, 0.38)',
    accentColor: '#b0913e',
    glowColor: '176, 145, 62'
  },
  heavenly_starlight: {
    id: 'heavenly_starlight',
    name: 'Firmament Étoilé',
    bgCanvasGradient: ['#070d1e', '#11061f'],
    textColor: '#f0f3ff',
    referenceColor: '#7a9eff',
    borderColor: 'rgba(122, 158, 255, 0.25)',
    accentColor: '#7a9eff',
    glowColor: '122, 158, 255'
  },
  emerald_glory: {
    id: 'emerald_glory',
    name: 'Saison d\'Espérance',
    bgCanvasGradient: ['#05180e', '#010a05'],
    textColor: '#e6f4ed',
    referenceColor: '#c9a84c',
    borderColor: 'rgba(201, 168, 76, 0.25)',
    accentColor: '#c9a84c',
    glowColor: '4, 120, 87'
  },
  royal_velvet: {
    id: 'royal_velvet',
    name: 'Pourpre Sacerdotale',
    bgCanvasGradient: ['#1c0410', '#070104'],
    textColor: '#fdf0f5',
    referenceColor: '#ec4899',
    borderColor: 'rgba(236, 72, 153, 0.25)',
    accentColor: '#ec4899',
    glowColor: '236, 72, 153'
  }
};

const FONTS_LIST = [
  { id: 'garamond', name: 'Garamond Littéraire', family: "'Cormorant Garamond', serif", cssName: 'font-serif italic' },
  { id: 'cinzel', name: 'Cinzel Antique', family: "'Cinzel', serif", cssName: 'font-serif tracking-wider uppercase' },
  { id: 'playfair', name: 'Playfair Romantique', family: "'Playfair Display', serif", cssName: 'font-serif italic' },
  { id: 'montserrat', name: 'Montserrat Épuré', family: "'Montserrat', sans-serif", cssName: 'font-sans font-light tracking-wide' },
  { id: 'mono', name: 'Scribe Monospace', family: "'JetBrains Mono', monospace", cssName: 'font-mono text-xs' }
];

const INSPIRATIONAL_VERSES = [
  {
    ref: 'Psaumes 119:105',
    text: 'Ta parole est une lampe à mes pieds, Et une lumière sur mon sentier.'
  },
  {
    ref: 'Josué 1:8',
    text: 'Que ce livre de la loi ne s\'éloigne point de ta bouche; médite-le jour et nuit, pour agir fidèlement.'
  },
  {
    ref: '2 Timothée 4:7',
    text: 'J\'ai combattu le bon combat, j\'ai achevé la course, j\'ai gardé la foi.'
  },
  {
    ref: 'Psaumes 19:8',
    text: 'La loi de l\'Éternel est parfaite, elle restaure l\'âme; Le témoignage de l\'Éternel est véritable, il rend sage l\'ignorant.'
  },
  {
    ref: 'Colossiens 3:16',
    text: 'Que la parole de Christ habite parmi vous abondamment dans toute sa sagesse.'
  }
];

export const ChallengeShareModal: React.FC<ChallengeShareModalProps> = ({
  plan,
  onClose,
  completedChaptersCount,
  totalChaptersCount
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Settings states
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>('gold_crown');
  const [selectedFont, setSelectedFont] = useState<CardFont>('garamond');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('square');
  const [customReaderName, setCustomReaderName] = useState<string>('');
  const [selectedVerseIndex, setSelectedVerseIndex] = useState<number>(0);
  const [customVerseText, setCustomVerseText] = useState<string>('');
  const [customVerseRef, setCustomVerseRef] = useState<string>('');
  const [isCustomVerseEnabled, setIsCustomVerseEnabled] = useState<boolean>(false);
  const [withWatermark, setWithWatermark] = useState<boolean>(true);
  const [bgTextureIntensity, setBgTextureIntensity] = useState<number>(40);

  const [copiedLink, setCopiedLink] = useState(false);

  // Procedural stars background (generated once)
  const [starList] = useState(() => {
    const list = [];
    for (let i = 0; i < 90; i++) {
      list.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 2.0 + 0.5,
        alpha: Math.random() * 0.7 + 0.3
      });
    }
    return list;
  });

  // Redraw canvas whenever options change
  useEffect(() => {
    drawCanvas();
  }, [
    selectedTheme, selectedFont, aspectRatio, customReaderName, 
    selectedVerseIndex, customVerseText, customVerseRef, isCustomVerseEnabled,
    withWatermark, bgTextureIntensity
  ]);

  // Handle initial font load safety redrawing
  useEffect(() => {
    document.fonts.ready.then(() => {
      drawCanvas();
    });
  }, []);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions
    let width = 1200;
    let height = 1200;

    if (aspectRatio === 'story') {
      height = 2133; // 9:16 high ratio
    } else if (aspectRatio === 'landscape') {
      width = 1920;
      height = 1080;
    }

    canvas.width = width;
    canvas.height = height;

    const config = THEME_CONFIGS[selectedTheme];

    // Clear and draw background gradient
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, config.bgCanvasGradient[0]);
    gradient.addColorStop(1, config.bgCanvasGradient[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Render Procedural Shimmer Background Effects
    if (bgTextureIntensity > 0) {
      const alphaMultiplier = bgTextureIntensity / 100;

      // Deep Space Themes
      if (selectedTheme === 'gold_crown' || selectedTheme === 'heavenly_starlight' || selectedTheme === 'royal_velvet') {
        starList.forEach(star => {
          ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * alphaMultiplier})`;
          ctx.beginPath();
          ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
          ctx.fill();
        });

        // Add celestial radial core glowing orbs
        const coreGlow = ctx.createRadialGradient(
          width / 2, height / 2, 80,
          width / 2, height / 2, width * 0.5
        );
        coreGlow.addColorStop(0, `rgba(${config.glowColor}, ${0.12 * alphaMultiplier})`);
        coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = coreGlow;
        ctx.fillRect(0, 0, width, height);
      }

      // Parchment ancient scrolls textures
      if (selectedTheme === 'parchment_victory') {
        ctx.fillStyle = `rgba(139, 90, 43, ${0.03 * alphaMultiplier})`;
        for (let i = 0; i < 200; i++) {
          const rx = Math.random() * width;
          const ry = Math.random() * height;
          const size = Math.random() * 120 + 40;
          ctx.beginPath();
          ctx.arc(rx, ry, size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Horizontal ancient fibers
        ctx.strokeStyle = `rgba(139, 90, 43, ${0.02 * alphaMultiplier})`;
        ctx.lineWidth = 1;
        for (let y = 0; y < height; y += 10) {
          ctx.beginPath();
          ctx.moveTo(0, y + (Math.random() * 6 - 3));
          ctx.lineTo(width, y + (Math.random() * 6 - 3));
          ctx.stroke();
        }
      }
    }

    // Outer and Inner Borders (Marges)
    const margin = width * 0.045;
    ctx.strokeStyle = config.borderColor;

    // Double Borders
    ctx.lineWidth = 5;
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

    ctx.lineWidth = 1.5;
    const innerMargin = margin + 15;
    ctx.strokeRect(innerMargin, innerMargin, width - innerMargin * 2, height - innerMargin * 2);

    // Draw Corner Ornaments (Luxury Corner Brackets)
    ctx.lineWidth = 3;
    const oSize = width * 0.035;
    const drawCornerLine = (cx: number, cy: number, dx: number, dy: number) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx * oSize, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * oSize);
      ctx.stroke();
    };
    drawCornerLine(margin, margin, 1, 1);
    drawCornerLine(width - margin, margin, -1, 1);
    drawCornerLine(margin, height - margin, 1, -1);
    drawCornerLine(width - margin, height - margin, -1, -1);

    const centerX = width / 2;

    // Render Victory Trophy Icon & Title
    const awardY = aspectRatio === 'story' ? height * 0.16 : height * 0.15;
    
    // Draw Glowing Trophy outline procedurally
    ctx.strokeStyle = config.referenceColor;
    ctx.fillStyle = config.referenceColor;
    ctx.lineWidth = 3.5;
    
    ctx.shadowColor = `rgba(${config.glowColor}, 0.5)`;
    ctx.shadowBlur = 20;

    // Draw Crown / Star Motif
    ctx.beginPath();
    ctx.arc(centerX, awardY, 40, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Trophy base/chalice inside circle
    ctx.beginPath();
    ctx.moveTo(centerX - 15, awardY - 12);
    ctx.lineTo(centerX + 15, awardY - 12);
    ctx.lineTo(centerX + 12, awardY + 5);
    ctx.quadraticCurveTo(centerX, awardY + 18, centerX - 12, awardY + 5);
    ctx.closePath();
    ctx.stroke();
    // Stem + base of trophy
    ctx.beginPath();
    ctx.moveTo(centerX, awardY + 12);
    ctx.lineTo(centerX, awardY + 24);
    ctx.moveTo(centerX - 12, awardY + 24);
    ctx.lineTo(centerX + 12, awardY + 24);
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // 1. Victory/Completion Badge Header
    ctx.fillStyle = config.referenceColor;
    ctx.font = "bold uppercase tracking-[0.22em] 18px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText("TÉMOIGNAGE DE FIDÉLITÉ", centerX, awardY + 80);

    // 2. Challenge Plan Title
    ctx.fillStyle = config.textColor;
    ctx.font = "bold 44px 'Cinzel', serif";
    ctx.fillText(plan.title.toUpperCase(), centerX, awardY + 140);

    // 3. Status Bar description or 100% Accomplished
    ctx.fillStyle = config.referenceColor;
    ctx.font = "italic 22px 'Cormorant Garamond', serif";
    const percentMsg = completedChaptersCount >= totalChaptersCount 
      ? `DÉFI INTÉGRAL COMPLETÉ AVEC SUCCÈS (100%)`
      : `PROGRESSION : ${completedChaptersCount} SUR ${totalChaptersCount} CHAPITRES VECTEURS`;
    ctx.fillText(percentMsg, centerX, awardY + 190);

    // Decorative divider line between title and verse
    ctx.strokeStyle = config.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 150, awardY + 225);
    ctx.lineTo(centerX + 150, awardY + 225);
    ctx.stroke();

    // Dot accents
    ctx.fillStyle = config.referenceColor;
    ctx.beginPath();
    ctx.arc(centerX - 158, awardY + 225, 3.5, 0, Math.PI * 2);
    ctx.arc(centerX + 158, awardY + 225, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 4. Draw chosen inspirational Scripture Verse
    const verseText = isCustomVerseEnabled ? customVerseText : INSPIRATIONAL_VERSES[selectedVerseIndex].text;
    const verseRef = isCustomVerseEnabled ? customVerseRef : INSPIRATIONAL_VERSES[selectedVerseIndex].ref;

    const fontObj = FONTS_LIST.find(f => f.id === selectedFont) || FONTS_LIST[0];
    ctx.fillStyle = config.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Choose font size based on text length to avoid overflow
    let computedFontSize = 38;
    if (verseText.length > 120) computedFontSize = 32;
    if (verseText.length > 200) computedFontSize = 26;

    ctx.font = `${selectedFont === 'garamond' || selectedFont === 'playfair' ? 'italic' : 'normal'} ${computedFontSize}px ${fontObj.family}`;

    // Add subtle text shadow
    ctx.shadowColor = selectedTheme === 'parchment_victory' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;

    const printableText = `« ${verseText} »`;
    const wrapMaxWidth = width - 300;
    const words = printableText.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > wrapMaxWidth && i > 0) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    // Compute Y positions
    const realLineHeight = computedFontSize * 1.5;
    const totalVerseHeight = lines.length * realLineHeight;
    let verseContentStartY = awardY + 340;

    if (aspectRatio === 'story') {
      verseContentStartY = height * 0.42;
    }

    lines.forEach((line, idx) => {
      ctx.fillText(line, centerX, verseContentStartY + idx * realLineHeight);
    });

    // Reset shadow for smaller indicators
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowColor = 'transparent';

    // 5. Draw Verse Reference Source Label
    const refY = verseContentStartY + totalVerseHeight + 60;
    ctx.fillStyle = config.referenceColor;
    ctx.font = "bold 24px 'Cinzel', serif";
    ctx.fillText(verseRef.toUpperCase(), centerX, refY);

    // Louis Segond 1910 Translation mention
    ctx.fillStyle = config.textColor + '80'; // 50% opacity
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.fillText("BIBLE DICTÉE LOUIS SEGOND", centerX, refY + 38);

    // 6. Draw Personal Dedication / Reader Name
    if (customReaderName.trim()) {
      const dedicationY = refY + 110;
      ctx.fillStyle = config.referenceColor;
      ctx.font = "bold uppercase tracking-[0.15em] 15px 'JetBrains Mono', monospace";
      ctx.fillText(`MÉDITÉ ET ACCOMPLI PAR :`, centerX, dedicationY);

      ctx.fillStyle = config.textColor;
      ctx.font = "bold 34px 'Cinzel', serif";
      ctx.fillText(customReaderName.trim(), centerX, dedicationY + 45);
    }

    // 7. Watermark signature
    if (withWatermark) {
      const bottomY = height - (aspectRatio === 'story' ? height * 0.09 : 100);

      // Ribbon divider line
      ctx.strokeStyle = config.borderColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - 130, bottomY - 30);
      ctx.lineTo(centerX + 130, bottomY - 30);
      ctx.stroke();

      // Watermark Text
      ctx.fillStyle = config.referenceColor;
      ctx.font = "bold 13px 'JetBrains Mono', monospace";
      ctx.fillText("📖 BIBLE PROFONDE", centerX, bottomY);

      // Tagline
      ctx.fillStyle = config.textColor + '45'; // 27% opacity
      ctx.font = "italic 11px 'Cormorant Garamond', serif";
      ctx.fillText("Suivi des Défis Sacrés & Exploration Harmonique", centerX, bottomY + 22);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const filename = `Défi_Accompli_${plan.id}_${customReaderName.trim() ? customReaderName.replace(/\s+/g, '_') : 'BibleProfonde'}.png`;
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Erreur de téléchargement : ", e);
      alert("Une erreur s'est produite lors de l'encodage de l'image.");
    }
  };

  const handleShareNative = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      if (navigator.share) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `Victoire_${plan.id}.png`, { type: 'image/png' });
          try {
            await navigator.share({
              title: `Défi Biblique Terminé: ${plan.title}`,
              text: `J'ai complété le défi "${plan.title}" sur la plateforme Bible Profonde ! Rejoignez-moi dans l'étude vivante des Écritures saintes ! 📖✨`,
              files: [file]
            });
          } catch (err) {
            console.warn("Share aborted or failed", err);
          }
        }, 'image/png');
      } else {
        // Fallback to clipboard text copy
        const textToCopy = `J'ai complété le défi "${plan.title}" sur l'application Bible Profonde ! 📖✨\nProgrès: ${completedChaptersCount}/${totalChaptersCount} chapitres dévorés. Venez approfondir les écritures et explorer les étymologies sacrées avec l'Harmonie Émotionnelle IA !`;
        await navigator.clipboard.writeText(textToCopy);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#070503]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto no-scrollbar">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#12100c] border border-[#c9a84c]/20 w-full max-w-5xl rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-2xl relative max-h-[96vh] lg:max-h-[90vh]"
      >
        
        {/* CLOSE BUTTON */}
        <button 
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-2 rounded-full bg-[#1c1913] border border-[#2e2a1e] text-[#6b6355] hover:text-[#e8e0d0] hover:border-[#c9a84c]/20 transition-all cursor-pointer z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* LEFT COLUMN: SETTINGS PANEL */}
        <div className="lg:col-span-5 p-5 border-b lg:border-b-0 lg:border-r border-[#2e2a1e] space-y-4 overflow-y-auto max-h-[45vh] lg:max-h-[90vh] no-scrollbar text-left select-none">
          <div>
            <div className="flex items-center gap-2 text-[#c9a84c]">
              <Trophy className="w-5 h-5" />
              <h2 className="font-serif font-black text-sm tracking-tight uppercase">Générateur de Carte de Réussite</h2>
            </div>
            <p className="text-[10px] text-[#6b6355] leading-normal mt-1">
              Couronnez votre fidélité ! Personnalisez et partagez cette superbe image commémorative sur vos réseaux pour inspirer votre communauté.
            </p>
          </div>

          <div className="space-y-3.5">
            {/* Setting: Reader Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono tracking-wider text-[#c9a84c] uppercase font-bold flex items-center gap-1">
                ✍️ Votre nom (Signataire)
              </label>
              <input 
                type="text" 
                value={customReaderName}
                onChange={(e) => setCustomReaderName(e.target.value)}
                placeholder="Ex: Franck Josh, Frère Matthieu, etc." 
                maxLength={25}
                className="w-full px-3 py-2 bg-[#1a1712] border border-[#2e2a1e] focus:border-[#c9a84c]/50 text-xs text-[#e8e0d0] rounded-xl outline-none transition"
              />
            </div>

            {/* Setting: Verse selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-[#2e2a1e] pb-1">
                <label className="text-[10px] font-mono tracking-wider text-[#c9a84c] uppercase font-bold">
                  📖 Sélection du Verset Porteur
                </label>
                <button
                  onClick={() => setIsCustomVerseEnabled(!isCustomVerseEnabled)}
                  className="text-[9px] font-mono text-[#c9a84c] hover:underline uppercase"
                >
                  {isCustomVerseEnabled ? 'Choisir un modèle' : 'Saisir un verset personnalisé'}
                </button>
              </div>

              {isCustomVerseEnabled ? (
                <div className="space-y-2 animate-fade-in">
                  <textarea
                    value={customVerseText}
                    onChange={(e) => setCustomVerseText(e.target.value)}
                    placeholder="Contenu du verset ou message de bénédiction..."
                    rows={2.5}
                    className="w-full p-2.5 bg-[#1a1712] border border-[#2e2a1e] focus:border-[#c9a84c]/50 text-[11px] text-[#e8e0d0] rounded-xl outline-none transition"
                  />
                  <input
                    type="text"
                    value={customVerseRef}
                    onChange={(e) => setCustomVerseRef(e.target.value)}
                    placeholder="Référence (ex: Jean 3:16)"
                    className="w-full px-3 py-1.5 bg-[#1a1712] border border-[#2e2a1e] focus:border-[#c9a84c]/50 text-xs text-[#e8e0d0] rounded-xl outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar pr-1">
                  {INSPIRATIONAL_VERSES.map((v, vidx) => (
                    <button
                      key={vidx}
                      onClick={() => setSelectedVerseIndex(vidx)}
                      className={`w-full p-2 text-left text-[10.5px] rounded-lg border transition-all flex flex-col gap-0.5 ${
                        selectedVerseIndex === vidx 
                          ? 'bg-[#c9a84c]/10 border-[#c9a84c] text-[#e8e0d0]' 
                          : 'bg-[#161410] border-[#2e2a1e]/80 text-[#6b6355] hover:border-[#c9a84c]/20 hover:text-[#b8af9e]'
                      }`}
                    >
                      <span className="font-serif font-black text-[#c9a84c] text-[10px]">{v.ref}</span>
                      <span className="line-clamp-1 italic text-[10px]">« {v.text} »</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Setting: Color Themes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono tracking-wider text-[#c9a84c] uppercase font-bold flex items-center gap-1">
                <Palette className="w-3.5 h-3.5" /> Climat Visuel (Thème)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(THEME_CONFIGS).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTheme(t.id)}
                    className={`p-2 text-left rounded-xl border transition-all flex items-center gap-2 cursor-pointer ${
                      selectedTheme === t.id 
                        ? 'bg-[#1c1913] border-[#c9a84c] text-[#e8e0d0]' 
                        : 'bg-[#161410] border-[#2e2a1e] text-[#6b6355] hover:border-[#c9a84c]/10 hover:text-[#b8af9e]'
                    }`}
                  >
                    <span 
                      className="w-3 h-3 rounded-full shrink-0 border border-white/10"
                      style={{ background: `linear-gradient(135deg, ${t.bgCanvasGradient[0]}, ${t.bgCanvasGradient[1]})` }}
                    ></span>
                    <span className="text-[9.5px] font-medium leading-none truncated">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Row configurations: Font + Format */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Aspect Ratio */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-wider text-[#6b6355] uppercase font-bold flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Format d'Image
                </label>
                <div className="flex bg-[#161410] border border-[#2e2a1e] p-0.5 rounded-xl">
                  {[
                    { label: 'Carré', value: 'square' },
                    { label: 'Story', value: 'story' },
                    { label: 'Large', value: 'landscape' }
                  ].map((format) => (
                    <button
                      key={format.value}
                      onClick={() => setAspectRatio(format.value as AspectRatio)}
                      className={`flex-1 py-1.5 text-[9px] font-sans font-bold rounded-lg transition-all ${
                        aspectRatio === format.value 
                          ? 'bg-[#c9a84c] text-[#12100c]' 
                          : 'text-[#6b6355] hover:text-[#e8e0d0]'
                      }`}
                    >
                      {format.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fonts Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono tracking-wider text-[#6b6355] uppercase font-bold flex items-center gap-1">
                  <Type className="w-3.5 h-3.5" /> Calligraphie
                </label>
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value as CardFont)}
                  className="w-full bg-[#161410] border border-[#2e2a1e] focus:border-[#c9a84c]/20 text-[10.5px] text-[#e8e0d0] rounded-xl p-2 outline-none"
                >
                  {FONTS_LIST.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Texture sliders checkmark */}
            <div className="flex items-center justify-between p-2 bg-[#161410] border border-[#2e2a1e]/60 rounded-xl">
              <span className="text-[9.5px] text-[#8e8574] font-medium">Inclure le filigrane de l'application</span>
              <button
                onClick={() => setWithWatermark(!withWatermark)}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${withWatermark ? 'bg-[#c9a84c]' : 'bg-[#2e2a1e]'}`}
              >
                <div className={`w-4 h-4 bg-[#12100c] rounded-full shadow transition-transform ${withWatermark ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </button>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW AND EXPORT */}
        <div className="lg:col-span-7 bg-[#0b0907] p-4 flex flex-col items-center justify-between max-h-[50vh] lg:max-h-[90vh]">
          {/* Card Title status */}
          <div className="w-full flex justify-between items-center px-2 pb-2 border-b border-[#2e2a1e]/65">
            <span className="text-[9px] font-mono text-[#6b6355] uppercase font-bold">Aperçu de la carte</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-mono text-emerald-500 uppercase font-black">Prêt à l'export</span>
            </div>
          </div>

          {/* Core Interactive Canvas Scroll container */}
          <div className="flex-1 w-full flex items-center justify-center p-3 sm:p-5 overflow-auto select-none no-scrollbar">
            {/* The scaled down live preview element of actual canvas */}
            <div className="shadow-2xl border border-[#2e2a1e] max-w-full rounded-lg overflow-hidden flex items-center justify-center relative">
              <canvas 
                ref={canvasRef} 
                className="max-h-[30vh] sm:max-h-[42vh] lg:max-h-[55vh] object-contain w-auto h-auto transition-transform duration-300"
                style={{
                  aspectRatio: aspectRatio === 'square' ? '1/1' : aspectRatio === 'story' ? '9/16' : '16/9'
                }}
              />
              
              <div className="absolute inset-0 bg-[#000]/10 hover:bg-transparent transition-all pointer-events-none"></div>
            </div>
          </div>

          {/* Action buttons footer */}
          <div className="w-full border-t border-[#2e2a1e] pt-4 pb-2 grid grid-cols-2 gap-3 px-2">
            <button
              onClick={handleShareNative}
              className="py-3 bg-[#1c1913] hover:bg-[#28241b] border border-[#c9a84c]/20 hover:border-[#c9a84c]/50 text-[#e8e0d0] text-xs font-bold rounded-xl transition duration-200 inline-flex items-center justify-center gap-1.5 cursor-pointer shadow"
            >
              <Share2 className="w-4 h-4 text-[#c9a84c]" />
              <span>{copiedLink ? "✓ Copié !" : "Partager"}</span>
            </button>

            <button
              onClick={handleDownload}
              className="py-3 bg-gradient-to-r from-[#a08232] to-[#c9a84c] text-[#0d0b07] text-xs font-bold rounded-xl hover:from-[#b0923e] hover:to-[#dfba5a] active:scale-[0.98] transition duration-200 inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-gold-glow"
            >
              <Download className="w-4 h-4 fill-none stroke-[#0d0b07]" />
              <span>Télécharger PNG</span>
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
};
