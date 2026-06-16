import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, Download, Share2, Palette, Image as ImageIcon, Copy, Check, MessageSquare,
  Type, AlignLeft, AlignCenter, AlignRight, Sliders, Settings, Sparkles, RefreshCw
} from 'lucide-react';
import { Verse } from '../types/bible';

interface VerseShareModalProps {
  verse: Verse;
  onClose: () => void;
}

type ThemePreset = 'solemn' | 'parchment' | 'heavenly' | 'emerald' | 'nebula' | 'crimson';
type AspectRatio = 'square' | 'story' | 'landscape';
type TextAlignment = 'left' | 'center' | 'right';
type OrnamentType = 'cross' | 'dove' | 'classic' | 'none';
type BorderStyle = 'double' | 'simple' | 'borderless';

interface ThemeConfig {
  id: ThemePreset;
  name: string;
  bgGradient: string[]; // start, end colors
  bgCanvasGradient: string[]; // for real drawing
  textColor: string;
  referenceColor: string;
  borderColor: string;
  accentColor: string;
}

const THEME_CONFIGS: Record<ThemePreset, ThemeConfig> = {
  solemn: {
    id: 'solemn',
    name: 'Sombre Solennel',
    bgGradient: ['from-[#0e0c08]', 'to-[#050403]'],
    bgCanvasGradient: ['#0f0d09', '#050403'],
    textColor: '#f4efe2',
    referenceColor: '#c9a84c',
    borderColor: 'rgba(201, 168, 76, 0.25)',
    accentColor: '#c9a84c'
  },
  parchment: {
    id: 'parchment',
    name: 'Parchemin Sacré',
    bgGradient: ['from-[#f9f5eb]', 'to-[#eddcb9]'],
    bgCanvasGradient: ['#fbf8f0', '#ebdcb7'],
    textColor: '#1a140e',
    referenceColor: '#7a5a1f',
    borderColor: 'rgba(122, 90, 31, 0.35)',
    accentColor: '#b0913e'
  },
  heavenly: {
    id: 'heavenly',
    name: 'Bleu Céleste',
    bgGradient: ['from-[#0a1128]', 'to-[#1c0b1f]'],
    bgCanvasGradient: ['#070d1e', '#1e0c21'],
    textColor: '#f0f3ff',
    referenceColor: '#7a9eff',
    borderColor: 'rgba(122, 158, 255, 0.25)',
    accentColor: '#7a9eff'
  },
  emerald: {
    id: 'emerald',
    name: 'Sainte Trinité',
    bgGradient: ['from-[#06180f]', 'to-[#020a06]'],
    bgCanvasGradient: ['#061a10', '#020b07'],
    textColor: '#e6f4ed',
    referenceColor: '#c9a84c',
    borderColor: 'rgba(201, 168, 76, 0.25)',
    accentColor: '#c9a84c'
  },
  nebula: {
    id: 'nebula',
    name: 'Nébuleuse Divine',
    bgGradient: ['from-[#150720]', 'to-[#040108]'],
    bgCanvasGradient: ['#180824', '#040108'],
    textColor: '#faeefc',
    referenceColor: '#ec4899',
    borderColor: 'rgba(236, 72, 153, 0.25)',
    accentColor: '#ec4899'
  },
  crimson: {
    id: 'crimson',
    name: 'Monarque Rouge',
    bgGradient: ['from-[#200508]', 'to-[#080102]'],
    bgCanvasGradient: ['#24070a', '#080102'],
    textColor: '#ffebeb',
    referenceColor: '#f43f5e',
    borderColor: 'rgba(244, 63, 94, 0.25)',
    accentColor: '#f43f5e'
  }
};

const FONTS = [
  { id: 'garamond', name: 'Garamond Littéraire', family: "'Cormorant Garamond', serif", cssName: 'font-serif italic' },
  { id: 'cinzel', name: 'Cinzel Antique', family: "'Cinzel', serif", cssName: 'font-serif tracking-wider uppercase' },
  { id: 'alex', name: 'Calligraphie Divine', family: "'Alex Brush', cursive", cssName: 'font-serif font-light' },
  { id: 'playfair', name: 'Playfair Romantique', family: "'Playfair Display', serif", cssName: 'font-serif italic' },
  { id: 'lora', name: 'Lora Élégance', family: "'Lora', Georgia, serif", cssName: 'font-reading italic' },
  { id: 'montserrat', name: 'Montserrat Épuré', family: "'Montserrat', sans-serif", cssName: 'font-sans font-light tracking-wide' },
  { id: 'mono', name: 'Scribe Technique', family: "'JetBrains Mono', monospace", cssName: 'font-mono text-xs' }
];

export const VerseShareModal: React.FC<VerseShareModalProps> = ({ verse, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Settings states
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>('solemn');
  const [selectedFont, setSelectedFont] = useState<string>('garamond');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('square');
  const [textAlignment, setTextAlignment] = useState<TextAlignment>('center');
  const [ornament, setOrnament] = useState<OrnamentType>('cross');
  const [borderStyle, setBorderStyle] = useState<BorderStyle>('double');
  const [fontSize, setFontSize] = useState<number>(38);
  const [lineHeight, setLineHeight] = useState<number>(1.55);
  const [customText, setCustomText] = useState<string>('');
  const [textShadow, setTextShadow] = useState<boolean>(true);
  const [withWatermark, setWithWatermark] = useState<boolean>(true);
  const [bgTextureIntensity, setBgTextureIntensity] = useState<number>(30); // 0 to 100

  const [copiedLink, setCopiedLink] = useState(false);

  // Strip strong tags [H1234] from text for the clean image card
  const cleanText = verse.text.replace(/\[[HG]\d+\]/g, '').trim();

  // Pre-generate stars data once to avoid chaotic blinking on redraws
  const [starList] = useState(() => {
    const list = [];
    for (let i = 0; i < 75; i++) {
      list.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.8 + 0.4,
        alpha: Math.random() * 0.6 + 0.3
      });
    }
    return list;
  });

  useEffect(() => {
    setCustomText(cleanText);
  }, [verse]);

  // Redraw canvas whenever options change
  useEffect(() => {
    drawCanvas();
  }, [
    selectedTheme, selectedFont, aspectRatio, textAlignment, ornament, 
    borderStyle, fontSize, lineHeight, customText, textShadow, withWatermark, bgTextureIntensity
  ]);

  // Handle font loading trigger
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

    // Define target dimensions
    let width = 1080;
    let height = 1080;

    if (aspectRatio === 'story') {
      height = 1920;
    } else if (aspectRatio === 'landscape') {
      width = 1920;
      height = 1080;
    }

    canvas.width = width;
    canvas.height = height;

    const config = THEME_CONFIGS[selectedTheme];

    // Ensure state clean slate for shadow configurations
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 1. Draw Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, config.bgCanvasGradient[0]);
    gradient.addColorStop(1, config.bgCanvasGradient[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Render Procedural Textures & Effects
    if (bgTextureIntensity > 0) {
      const alphaMultiplier = bgTextureIntensity / 100;

      // Celestial Themes: Cosmic Shimmer Shimmers
      if (selectedTheme === 'heavenly' || selectedTheme === 'nebula') {
        starList.forEach(star => {
          ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * alphaMultiplier})`;
          ctx.beginPath();
          ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
          ctx.fill();
        });

        // Soft heavenly glowing orbs
        const radialGl = ctx.createRadialGradient(
          width / 2, height / 2, 50,
          width / 2, height / 2, width / 2
        );
        radialGl.addColorStop(0, `rgba(138, 180, 255, ${0.12 * alphaMultiplier})`);
        radialGl.addColorStop(0.5, `rgba(236, 72, 153, ${0.05 * alphaMultiplier})`);
        radialGl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = radialGl;
        ctx.fillRect(0, 0, width, height);
      }

      // Sacred Parchment: Handcrafted ancient sepia texture
      if (selectedTheme === 'parchment') {
        ctx.fillStyle = `rgba(139, 90, 43, ${0.02 * alphaMultiplier})`;
        for (let i = 0; i < 150; i++) {
          const rx = Math.random() * width;
          const ry = Math.random() * height;
          const size = Math.random() * 90 + 30;
          ctx.beginPath();
          ctx.arc(rx, ry, size, 0, Math.PI * 2);
          ctx.fill();
        }

        // Vintage horizontal paper grains
        ctx.strokeStyle = `rgba(139, 90, 43, ${0.015 * alphaMultiplier})`;
        ctx.lineWidth = 1;
        for (let y = 0; y < height; y += 8) {
          ctx.beginPath();
          ctx.moveTo(0, y + (Math.random() * 4 - 2));
          ctx.lineTo(width, y + (Math.random() * 4 - 2));
          ctx.stroke();
        }
      }

      // Other Dark/Solemn Themes Aura
      if (selectedTheme === 'solemn' || selectedTheme === 'emerald' || selectedTheme === 'crimson') {
        const radGlow = ctx.createRadialGradient(
          width / 2, height / 2, 80,
          width / 2, height / 2, width * 0.45
        );
        const glowColor = selectedTheme === 'emerald' ? '4, 120, 87' : selectedTheme === 'crimson' ? '190, 24, 74' : '201, 168, 76';
        radGlow.addColorStop(0, `rgba(${glowColor}, ${0.1 * alphaMultiplier})`);
        radGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = radGlow;
        ctx.fillRect(0, 0, width, height);
      }
    }

    // 3. Draw Ornament Borders (Marge)
    const margin = 50;
    if (borderStyle !== 'borderless') {
      ctx.strokeStyle = config.borderColor;

      if (borderStyle === 'double') {
        // Outer thick frame
        ctx.lineWidth = 4;
        ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

        // Inner thin filigree line
        ctx.lineWidth = 1;
        const innerMargin = margin + 12;
        ctx.strokeRect(innerMargin, innerMargin, width - innerMargin * 2, height - innerMargin * 2);

        // Corner ornaments accents
        ctx.lineWidth = 2.5;
        const oSize = 25;
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
      } else if (borderStyle === 'simple') {
        ctx.lineWidth = 1.5;
        ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);
      }
    }

    const centerX = width / 2;

    // 4. Draw Spiritual Ornament Emblem
    const ornamentY = aspectRatio === 'story' ? 280 : aspectRatio === 'landscape' ? 160 : 160;
    ctx.strokeStyle = config.referenceColor;
    ctx.lineWidth = 2;

    if (ornament === 'cross') {
      ctx.beginPath();
      // Draw standard elegant cross
      ctx.moveTo(centerX, ornamentY - 18);
      ctx.lineTo(centerX, ornamentY + 22);
      ctx.moveTo(centerX - 12, ornamentY - 6);
      ctx.lineTo(centerX + 12, ornamentY - 6);
      ctx.stroke();

      // Horizontal subtle flow line
      ctx.beginPath();
      ctx.moveTo(centerX - 90, ornamentY - 1);
      ctx.lineTo(centerX - 22, ornamentY - 1);
      ctx.moveTo(centerX + 22, ornamentY - 1);
      ctx.lineTo(centerX + 90, ornamentY - 1);
      ctx.stroke();

      // Dot anchors
      ctx.fillStyle = config.referenceColor;
      ctx.beginPath();
      ctx.arc(centerX - 94, ornamentY - 1, 2.5, 0, Math.PI * 2);
      ctx.arc(centerX + 94, ornamentY - 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (ornament === 'dove') {
      // Abstract spiritual branch/dove outline
      ctx.beginPath();
      // Side olive branch arcs
      ctx.arc(centerX - 40, ornamentY - 2, 25, Math.PI * 0.9, Math.PI * 1.8, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(centerX + 40, ornamentY - 2, 25, Math.PI * 1.2, Math.PI * 0.1, false);
      ctx.stroke();

      // Dove body curves
      ctx.beginPath();
      ctx.moveTo(centerX - 10, ornamentY);
      ctx.bezierCurveTo(centerX - 8, ornamentY - 12, centerX + 8, ornamentY - 12, centerX + 10, ornamentY);
      ctx.bezierCurveTo(centerX + 4, ornamentY + 10, centerX - 4, ornamentY + 10, centerX - 10, ornamentY);
      ctx.fillStyle = config.referenceColor;
      ctx.fill();

      // Small crown dot
      ctx.beginPath();
      ctx.arc(centerX, ornamentY - 16, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (ornament === 'classic') {
      // Ancient scroll divider
      ctx.fillStyle = config.referenceColor;
      ctx.beginPath();
      ctx.moveTo(centerX, ornamentY - 6);
      ctx.lineTo(centerX + 9, ornamentY);
      ctx.lineTo(centerX, ornamentY + 6);
      ctx.lineTo(centerX - 9, ornamentY);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(centerX - 80, ornamentY);
      ctx.quadraticCurveTo(centerX - 40, ornamentY - 6, centerX - 16, ornamentY);
      ctx.moveTo(centerX + 16, ornamentY);
      ctx.quadraticCurveTo(centerX + 40, ornamentY - 6, centerX + 80, ornamentY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX - 84, ornamentY, 2.5, 0, Math.PI * 2);
      ctx.arc(centerX + 84, ornamentY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Wrap, Measure and Draw Verse Text
    const fontObj = FONTS.find(f => f.id === selectedFont) || FONTS[0];
    
    // Set text shadows for stunning typography contrast
    if (textShadow) {
      const isDarkText = selectedTheme === 'parchment';
      ctx.shadowColor = isDarkText ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 3;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = config.textColor;

    // Use alignment mapping
    ctx.textAlign = textAlignment;
    ctx.textBaseline = 'middle';
    ctx.font = `${selectedFont === 'garamond' || selectedFont === 'playfair' || selectedFont === 'lora' ? 'italic' : 'normal'} ${fontSize}px ${fontObj.family}`;

    const textToShow = selectedFont === 'alex' ? customText : `« ${customText} »`;

    // Wrapping algorithm
    const wrapMaxWidth = width - 260;
    const words = textToShow.split(' ');
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

    // Calculate dynamic vertical placement
    const realLineHeight = fontSize * lineHeight;
    const totalHeight = lines.length * realLineHeight;
    let startY = (height / 2) - (totalHeight / 2) + 20;

    // Adjust vertical constraints for extreme vertical (stories) vs wide banners
    if (aspectRatio === 'story') {
      startY = (height / 2) - (totalHeight / 2) + 40;
    } else if (aspectRatio === 'landscape') {
      startY = (height / 2) - (totalHeight / 2) + 15;
    }

    // Render wrap text onto target canvas
    lines.forEach((line, index) => {
      let xPos = centerX;
      if (textAlignment === 'left') {
        xPos = margin + 80;
      } else if (textAlignment === 'right') {
        xPos = width - margin - 80;
      }

      ctx.fillText(line, xPos, startY + index * realLineHeight);
    });

    // 6. Draw Scripture reference
    // Disable text shadow for smaller metadata fonts to avoid mud/blur
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowColor = 'transparent';

    const refY = startY + totalHeight + 70;
    ctx.fillStyle = config.referenceColor;
    ctx.textAlign = 'center';

    // Set gorgeous classical style for scripture source
    ctx.font = `bold 26px 'Cinzel', serif`;
    const bibleReference = `${verse.book_name.toUpperCase()} ${verse.chapter}:${verse.verse}`;
    ctx.fillText(bibleReference, centerX, refY);

    // Subtitle translation label
    ctx.fillStyle = config.textColor + '80'; // 50% opacity
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.fillText("BIBLE LOUIS SEGOND 1910", centerX, refY + 45);

    // 7. Watermark section at deep bottom
    if (withWatermark) {
      const bottomY = height - (aspectRatio === 'story' ? 180 : aspectRatio === 'landscape' ? 100 : 100);

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
      ctx.fillText("Sagesse IA & Étymologies Bibliques Originales", centerX, bottomY + 22);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `BibleProfonde_${verse.book_name.replace(/\s+/g, '')}_Ch${verse.chapter}_V${verse.verse}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Error generating poster image download:", e);
    }
  };

  const handleCopyLink = () => {
    const shareText = `📖 "« ${customText} »"\n\n👉 *${verse.book_name} ${verse.chapter}:${verse.verse}* (Louis Segond 1910) - Étudié sur Bible Profonde.\n🔗 ${window.location.origin}`;
    navigator.clipboard.writeText(shareText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsappShare = () => {
    const shareText = `📖 "« ${customText} »"\n\n👉 *${verse.book_name} ${verse.chapter}:${verse.verse}* (Louis Segond 1910)\n\nConsulter l'étymologie originale et l'analyse IA :\n🔗 ${window.location.origin}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/90 backdrop-blur-xl select-none overflow-y-auto">
      {/* Outer overlay closer click */}
      <div className="absolute inset-0 cursor-default" onClick={onClose}></div>

      {/* Main Studio Frame Layout */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 15 }}
        className="relative bg-[#0d0b07] border border-[#2e2a1e] rounded-[2rem] w-full max-w-5xl p-5 md:p-7 flex flex-col lg:flex-row gap-6 md:gap-8 shadow-gold-intense overflow-y-auto max-h-[96vh] lg:max-h-[90vh] z-10"
      >
        {/* Close Studio btn */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-[#16130f] border border-[#2e2a1e] text-[#807664] hover:text-[#f4efe2] hover:border-[#c9a84c]/50 transition duration-150 cursor-pointer z-50"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ================= COLUMN 1: LIVE CANVAS IMAGE PREVIEW ================= */}
        <div className="flex-1 flex flex-col items-center justify-between space-y-4 lg:border-r lg:border-[#2e2a1e]/45 lg:pr-8">
          <div className="text-left w-full">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#c9a84c]" />
              <span className="text-[9px] font-mono tracking-widest text-[#807664] uppercase block font-black">DESIGNER DE VERSETS SACRÉS</span>
            </div>
            <h2 className="font-serif font-extrabold text-[#c9a84c] text-xl uppercase tracking-wide">Studio d'Enluminure</h2>
          </div>

          {/* Real Hidden Render Canvas */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Interactive Responsive Preview Node */}
          <div className="w-full flex-1 flex items-center justify-center bg-[#070604] border border-[#2e2a1e] rounded-2.5xl p-4 md:p-6 relative min-h-[300px] max-h-[500px]">
            <div 
              style={{
                aspectRatio: aspectRatio === 'square' ? '1/1' : aspectRatio === 'story' ? '9/16' : '16/9',
              }}
              className="w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[340px] relative shadow-2xl rounded-2xl border border-white/5 overflow-hidden transition-all duration-300 self-center"
            >
              {/* Simulated visual card in high-fidelity styled CSS matching current canvas configuration */}
              <div 
                className={`absolute inset-0 bg-gradient-to-b ${THEME_CONFIGS[selectedTheme].bgGradient[0]} ${THEME_CONFIGS[selectedTheme].bgGradient[1]} p-6 flex flex-col justify-between text-center select-text selection:bg-[#c9a84c]/20`}
                style={{
                  border: borderStyle === 'double' ? `8px double ${THEME_CONFIGS[selectedTheme].borderColor}` : borderStyle === 'simple' ? `1.5px solid ${THEME_CONFIGS[selectedTheme].borderColor}` : 'none'
                }}
              >
                {/* Simulated Starry Sky and Parchment stains via CSS overlay */}
                <div className="absolute inset-0 opacity-40 pointers-events-none mix-blend-screen overflow-hidden">
                  {(selectedTheme === 'heavenly' || selectedTheme === 'nebula') && (
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
                  )}
                  {selectedTheme === 'parchment' && (
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,_#8b5a2b_0%,_transparent_50%)]"></div>
                  )}
                </div>

                {/* Simulated SACRED EXQUISITE EMISSARY HEADER */}
                <div className="flex flex-col items-center pt-2 relative z-10">
                  {ornament !== 'none' && (
                    <div 
                      className="text-sm font-bold opacity-80"
                      style={{ color: THEME_CONFIGS[selectedTheme].referenceColor }}
                    >
                      {ornament === 'cross' ? '†' : ornament === 'dove' ? '🕊' : '♦'}
                    </div>
                  )}
                  {ornament !== 'none' && (
                    <div className="w-12 h-[1px] mt-1.5 opacity-40" style={{ backgroundColor: THEME_CONFIGS[selectedTheme].referenceColor }}></div>
                  )}
                </div>

                {/* Simulated Central Core Text Container */}
                <div className="my-auto py-2 relative z-10">
                  <p 
                    className="leading-[1.4] transition-all duration-200"
                    style={{ 
                      color: THEME_CONFIGS[selectedTheme].textColor,
                      fontSize: `${fontSize / 2.7}px`,
                      lineHeight: lineHeight,
                      textAlign: textAlignment,
                      fontFamily: FONTS.find(f => f.id === selectedFont)?.family,
                      textShadow: textShadow ? '0 1px 4px rgba(0,0,0,0.6)' : 'none'
                    }}
                  >
                    {selectedFont === 'alex' ? customText : `« ${customText} »`}
                  </p>
                  
                  <p 
                    className="font-serif font-bold tracking-tight mt-4 text-[11px] uppercase"
                    style={{ color: THEME_CONFIGS[selectedTheme].referenceColor }}
                  >
                    {verse.book_name} {verse.chapter}:{verse.verse}
                  </p>
                  <p 
                    className="text-[7px] font-mono uppercase tracking-widest mt-1 opacity-50 block"
                    style={{ color: THEME_CONFIGS[selectedTheme].textColor }}
                  >
                    L. SEGOND 1910
                  </p>
                </div>

                {/* Simulated WATERMARK AT DEEP BASE */}
                <div className="flex flex-col items-center pb-2 relative z-10">
                  {withWatermark ? (
                    <>
                      <div className="w-10 h-[1px] opacity-25 mb-2" style={{ backgroundColor: THEME_CONFIGS[selectedTheme].textColor }}></div>
                      <span className="text-[6.5px] font-mono tracking-widest font-bold" style={{ color: THEME_CONFIGS[selectedTheme].referenceColor }}>
                        📖 BIBLE PROFONDE
                      </span>
                    </>
                  ) : (
                    <div className="h-4"></div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick redraw force trigger */}
          <button 
            onClick={drawCanvas}
            className="text-[10px] font-mono text-[#807664] hover:text-[#c9a84c] flex items-center gap-1.5 transition uppercase"
            title="Rafraîchir les polices et l'agencement graphique sur le canvas"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Actualiser le dessin</span>
          </button>
        </div>

        {/* ================= COLUMN 2: INTERACTIVE CUSTOMIZER PANEL ================= */}
        <div className="flex-1 flex flex-col justify-between space-y-6 overflow-y-auto pr-0 lg:pr-1">
          
          <div className="space-y-6">
            
            {/* Aspect Ratio Format Options */}
            <div className="space-y-2 text-left">
              <label className="text-[9.5px] font-mono tracking-widest text-[#807664] uppercase block font-black flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#c9a84c]" /> 1. Format & Dimensions du Réseau
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['square', 'story', 'landscape'] as AspectRatio[]).map((format) => {
                  const label = format === 'square' ? 'Carré (1:1)' : format === 'story' ? 'Story (9:16)' : 'Bannière (16:9)';
                  const isSel = aspectRatio === format;
                  return (
                    <button
                      key={format}
                      type="button"
                      onClick={() => setAspectRatio(format)}
                      className={`py-2 px-1 rounded-xl border text-[10px] sm:text-xs font-mono font-bold flex flex-col items-center gap-1 transition-all duration-150 cursor-pointer ${
                        isSel
                          ? 'bg-[#1a1712] border-[#c9a84c] text-[#c9a84c] shadow-soft'
                          : 'bg-[#0f0d09] border-[#2e2a1e] text-[#807664] hover:text-[#f4efe2]'
                      }`}
                    >
                      <span className={`border border-current rounded-sm ${
                        format === 'square' ? 'w-3.5 h-3.5' : format === 'story' ? 'w-2.5 h-4' : 'w-4 h-2.5'
                      }`}></span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Typography Selection List */}
            <div className="space-y-2 text-left">
              <label className="text-[9.5px] font-mono tracking-widest text-[#807664] uppercase block font-black flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-[#c9a84c]" /> 2. Style Typographique & Caractère
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto p-0.5 border border-[#2e2a1e]/40 rounded-xl bg-[#070604]">
                {FONTS.map((font) => {
                  const isSel = selectedFont === font.id;
                  return (
                    <button
                      key={font.id}
                      onClick={() => setSelectedFont(font.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-left cursor-pointer transition ${
                        isSel
                          ? 'bg-[#1a1712] border-[#c9a84c] text-[#f4efe2]'
                          : 'bg-transparent border-transparent text-[#807664] hover:text-[#f4efe2]'
                      }`}
                    >
                      <span className={`text-[11px] leading-tight ${font.cssName}`} style={{ fontFamily: font.id === 'alex' || font.id === 'cinzel' || font.id === 'garamond' ? font.family : undefined }}>
                        {font.name}
                      </span>
                      {isSel && <Check className="w-3 h-3 text-[#c9a84c] flex-shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Colors and Themes */}
            <div className="space-y-2 text-left">
              <label className="text-[9.5px] font-mono tracking-widest text-[#807664] uppercase block font-black flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#c9a84c]" /> 3. Nuances Chromatiques & Sombres
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(THEME_CONFIGS) as ThemePreset[]).map((key) => {
                  const cfg = THEME_CONFIGS[key];
                  const isCur = selectedTheme === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedTheme(key)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left cursor-pointer transition duration-150 ${
                        isCur
                          ? 'bg-[#1a1712] border-[#c9a84c] text-[#f4efe2]'
                          : 'bg-[#0f0d09] border-[#2e2a1e] text-[#807664] hover:text-[#f4efe2]'
                      }`}
                    >
                      {/* Gradient preview sphere */}
                      <span 
                        className="w-4.5 h-4.5 rounded-full border border-white/20 flex-shrink-0 flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${cfg.bgCanvasGradient[0]} 0%, ${cfg.bgCanvasGradient[1]} 100%)` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.referenceColor }} />
                      </span>
                      <span className="text-[10.5px] font-serif font-bold leading-none truncate">{cfg.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Spacing, Size and Sliders settings panel */}
            <div className="bg-[#070604] border border-[#2e2a1e]/60 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-1 mb-1 border-b border-[#2e2a1e]/40 pb-2">
                <Sliders className="w-3.5 h-3.5 text-[#c9a84c]" />
                <span className="text-[9.5px] font-mono tracking-widest text-[#807664] uppercase block font-bold">Réglages Typographiques fins</span>
              </div>

              {/* Slider for Font Size */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10.5px] font-mono text-[#807664]">
                  <span>Tilleur & Zoom de Police</span>
                  <span className="text-[#c9a84c] font-bold">{fontSize}px</span>
                </div>
                <input 
                  type="range" 
                  min="24" 
                  max="62" 
                  value={fontSize} 
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full accent-[#c9a84c] bg-[#1a1712] h-1 rounded-lg outline-none cursor-pointer"
                />
              </div>

              {/* Slider for Line Height */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10.5px] font-mono text-[#807664]">
                  <span>Espacement des lignes</span>
                  <span className="text-[#c9a84c] font-bold">{lineHeight.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="1.25" 
                  max="2.10" 
                  step="0.05"
                  value={lineHeight} 
                  onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                  className="w-full accent-[#c9a84c] bg-[#1a1712] h-1 rounded-lg outline-none cursor-pointer"
                />
              </div>

              {/* Intensity of procedural background texture pattern overlays */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10.5px] font-mono text-[#807664]">
                  <span>Saturations des motifs du fond</span>
                  <span className="text-[#c9a84c] font-bold">{bgTextureIntensity}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={bgTextureIntensity} 
                  onChange={(e) => setBgTextureIntensity(parseInt(e.target.value))}
                  className="w-full accent-[#c9a84c] bg-[#1a1712] h-1 rounded-lg outline-none cursor-pointer"
                />
              </div>

              {/* Alignments, Borders and Ornaments switches */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                {/* Text Alignment */}
                <div className="space-y-1 text-left">
                  <span className="text-[9px] font-mono text-[#807664] uppercase block">Alignement</span>
                  <div className="flex gap-1 bg-[#120f0b] p-1 border border-[#2e2a1e] rounded-lg">
                    {(['left', 'center', 'right'] as TextAlignment[]).map((align) => {
                      const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
                      return (
                        <button
                          key={align}
                          onClick={() => setTextAlignment(align)}
                          className={`flex-1 py-1.5 flex items-center justify-center rounded transition-all cursor-pointer ${
                            textAlignment === align ? 'bg-[#c9a84c] text-[#0d0b07]' : 'text-[#807664] hover:text-[#f4efe2]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Symmetrical ornament choosing */}
                <div className="space-y-1 text-left">
                  <span className="text-[9px] font-mono text-[#807664] uppercase block">Ornement</span>
                  <select
                    value={ornament}
                    onChange={(e) => setOrnament(e.target.value as OrnamentType)}
                    className="w-full bg-[#120f0b] text-xs text-[#f4efe2] border border-[#2e2a1e] px-2 py-1.5 rounded-lg focus:outline-none focus:border-[#c9a84c]"
                  >
                    <option value="cross">✞ Croix Sacrée</option>
                    <option value="dove">🕊 Sainte Colombe</option>
                    <option value="classic">♣ Fleuron Classique</option>
                    <option value="none">∅ Aucun</option>
                  </select>
                </div>

                {/* Frame border style select */}
                <div className="space-y-1 text-left">
                  <span className="text-[9px] font-mono text-[#807664] uppercase block">Encadrement</span>
                  <select
                    value={borderStyle}
                    onChange={(e) => setBorderStyle(e.target.value as BorderStyle)}
                    className="w-full bg-[#120f0b] text-xs text-[#f4efe2] border border-[#2e2a1e] px-2 py-1.5 rounded-lg focus:outline-none focus:border-[#c9a84c]"
                  >
                    <option value="double">══ Double Tradition</option>
                    <option value="simple">─ Sleek Simple</option>
                    <option value="borderless">∅ Sans Bordure</option>
                  </select>
                </div>

                {/* Checklist options */}
                <div className="space-y-1 text-left flex flex-col justify-end">
                  <div className="flex items-center gap-2 mb-1.5">
                    <input 
                      type="checkbox" 
                      id="shadow"
                      checked={textShadow}
                      onChange={(e) => setTextShadow(e.target.checked)}
                      className="w-3.5 h-3.5 bg-[#120f0b] border border-[#2e2a1e] text-[#c9a84c] rounded cursor-pointer accent-[#c9a84c]"
                    />
                    <label htmlFor="shadow" className="text-[10px] font-mono text-[#807664] cursor-pointer select-none">
                      Ombre portée
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="watermark"
                      checked={withWatermark}
                      onChange={(e) => setWithWatermark(e.target.checked)}
                      className="w-3.5 h-3.5 bg-[#120f0b] border border-[#2e2a1e] text-[#c9a84c] rounded cursor-pointer accent-[#c9a84c]"
                    />
                    <label htmlFor="watermark" className="text-[10px] font-mono text-[#807664] cursor-pointer select-none">
                      Filigrane Signature
                    </label>
                  </div>
                </div>
              </div>

            </div>

            {/* Live scripture word editor */}
            <div className="space-y-2 text-left">
              <label className="text-[9.5px] font-mono tracking-widest text-[#807664] uppercase block font-black">
                4. Personnaliser le texte du verset
              </label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                maxLength={450}
                placeholder="Rédigez ou éditez le verset pour l'ajuster..."
                className="w-full h-20 bg-[#0f0d09] border border-[#2e2a1e] rounded-xl p-3 text-xs text-[#f4efe2] focus:outline-none focus:border-[#c9a84c] resize-none font-reading leading-relaxed shadow-inner"
              />
              <div className="flex justify-between items-center text-[10px] font-mono text-[#807664]">
                <span>{customText.length} / 450 symboles</span>
                <button 
                  onClick={() => setCustomText(cleanText)}
                  className="hover:text-[#c9a84c] transition"
                  title="Revenir au verset biblique original de Louis Segond"
                >
                  Réinitialiser le verset original
                </button>
              </div>
            </div>

          </div>

          {/* Social triggers and Main Export action */}
          <div className="space-y-3 pt-4 border-t border-[#2e2a1e]/40">
            <div className="grid grid-cols-2 gap-3">
              {/* WhatsApp Text message style */}
              <button
                onClick={handleWhatsappShare}
                className="py-3 px-4 rounded-xl bg-[#0f0d09] hover:bg-[#15120e] border border-[#2e2a1e] text-emerald-400 hover:border-emerald-400/40 font-mono text-[9.5px] font-extrabold tracking-widest uppercase flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Citation WhatsApp</span>
              </button>

              {/* Clipboard text and dynamic deep link */}
              <button
                onClick={handleCopyLink}
                className="py-3 px-4 rounded-xl bg-[#0f0d09] hover:bg-[#15120e] border border-[#2e2a1e] text-[#f4efe2] hover:border-[#c9a84c]/40 font-mono text-[9.5px] font-extrabold tracking-widest uppercase flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-[#c9a84c]" />
                    <span className="text-[#c9a84c]">Texte copié ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#807664]" />
                    <span>Copier Citation</span>
                  </>
                )}
              </button>
            </div>

            {/* GENERATE STYLISH HIGH RESOLUTION JPG SHARE EXPORTER */}
            <button
              onClick={handleDownload}
              className="w-full py-3.5 rounded-xl bg-gold-gradient text-[#0d0b07] hover:opacity-95 font-mono text-[11px] font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
            >
              <Download className="w-4.5 h-4.5 text-[#0d0b07]" />
              <span>Générer et Télécharger l'Image</span>
            </button>
          </div>

        </div>

      </motion.div>
    </div>
  );
};
