import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, Download, Share2, Palette, Image as ImageIcon, Copy, Check, MessageSquare 
} from 'lucide-react';
import { Verse } from '../types/bible';

interface VerseShareModalProps {
  verse: Verse;
  onClose: () => void;
}

type ThemePreset = 'solemn' | 'parchment' | 'heavenly' | 'emerald';
type AspectRatio = 'square' | 'story';

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
    name: 'Solemn Slate',
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
    borderColor: 'rgba(122, 90, 31, 0.2)',
    accentColor: '#b0913e'
  },
  heavenly: {
    id: 'heavenly',
    name: 'Lumière Céleste',
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
  }
};

export const VerseShareModal: React.FC<VerseShareModalProps> = ({ verse, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>('solemn');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('square');
  const [customText, setCustomText] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Strip strong tags [H1234] from text for the clean image card
  const cleanText = verse.text.replace(/\[[HG]\d+\]/g, '').trim();

  useEffect(() => {
    setCustomText(cleanText);
  }, [verse]);

  // Hook to draw card dynamically whenever inputs change
  useEffect(() => {
    drawCanvas();
  }, [selectedTheme, aspectRatio, customText]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set resolutions optimized for high-DPI social media uploads
    const width = 1080;
    const height = aspectRatio === 'square' ? 1080 : 1920;
    
    canvas.width = width;
    canvas.height = height;

    const config = THEME_CONFIGS[selectedTheme];

    // 1. Draw Background Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, config.bgCanvasGradient[0]);
    gradient.addColorStop(1, config.bgCanvasGradient[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Elegant Margin Borders (Filigree lines)
    ctx.lineWidth = 4;
    ctx.strokeStyle = config.borderColor;
    const margin = 50;
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

    // Inner thin border
    ctx.lineWidth = 1;
    ctx.strokeStyle = config.borderColor;
    const innerMargin = 62;
    ctx.strokeRect(innerMargin, innerMargin, width - innerMargin * 2, height - innerMargin * 2);

    // Ornament Corner accents in gold / accent color
    const drawCorners = (offset: number, size: number) => {
      ctx.strokeStyle = config.borderColor;
      ctx.lineWidth = 2.5;

      const corners = [
        { x: offset, y: offset, dx: 1, dy: 1 }, // top-left
        { x: width - offset, y: offset, dx: -1, dy: 1 }, // top-right
        { x: offset, y: height - offset, dx: 1, dy: -1 }, // bottom-left
        { x: width - offset, y: height - offset, dx: -1, dy: -1 } // bottom-right
      ];

      corners.forEach(c => {
        ctx.beginPath();
        ctx.moveTo(c.x + c.dx * size, c.y);
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(c.x, c.y + c.dy * size);
        ctx.stroke();
      });
    };
    drawCorners(margin, 24);

    // 3. Draw Decorative Header Sacrament Ornament (Cross or Lotus motif)
    const centerX = width / 2;
    const ornamentStartY = aspectRatio === 'square' ? 180 : 340;

    ctx.strokeStyle = config.referenceColor;
    ctx.lineWidth = 2;
    
    // Draw cross outline
    ctx.beginPath();
    ctx.moveTo(centerX, ornamentStartY - 15);
    ctx.lineTo(centerX, ornamentStartY + 15);
    ctx.moveTo(centerX - 10, ornamentStartY - 5);
    ctx.lineTo(centerX + 10, ornamentStartY - 5);
    ctx.stroke();

    // Side decorative lines extending from cross
    ctx.beginPath();
    ctx.moveTo(centerX - 90, ornamentStartY);
    ctx.lineTo(centerX - 25, ornamentStartY);
    ctx.moveTo(centerX + 25, ornamentStartY);
    ctx.lineTo(centerX + 90, ornamentStartY);
    ctx.stroke();

    // Small dots
    ctx.fillStyle = config.referenceColor;
    ctx.beginPath();
    ctx.arc(centerX - 95, ornamentStartY, 3, 0, Math.PI * 2);
    ctx.arc(centerX + 95, ornamentStartY, 3, 0, Math.PI * 2);
    ctx.fill();

    // 4. Draw selection text beautifully centered
    ctx.fillStyle = config.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Handle premium quotes and text wrapping
    const textToShow = `« ${customText} »`;
    
    // Auto-calculating sizing based on text length to avoid overflow
    let fontSize = 38;
    if (textToShow.length < 100) fontSize = 44;
    else if (textToShow.length > 250) fontSize = 32;

    ctx.font = `italic ${fontSize}px 'Lora', Georgia, serif`;
    
    // Wrap Text Algorithm
    const wrapMaxWidth = width - 180;
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

    // Calculate dynamic vertical center start point
    const lineHeight = fontSize * 1.5;
    const totalTextHeight = lines.length * lineHeight;
    let textStartY = (height / 2) - (totalTextHeight / 2) + 20;

    // Render each text line
    lines.forEach((line, index) => {
      ctx.fillText(line, centerX, textStartY + index * lineHeight);
    });

    // 5. Draw Scripture Reference beautifully styled
    const refY = textStartY + totalTextHeight + 65;
    ctx.fillStyle = config.referenceColor;
    ctx.font = "bold 28px 'Playfair Display', Georgia, serif";
    const bibleReference = `${verse.book_name.toUpperCase()} ${verse.chapter}:${verse.verse}`;
    ctx.fillText(bibleReference, centerX, refY);

    // Subtitle translation label
    ctx.fillStyle = config.textColor + '80'; // 50% opacity
    ctx.font = "bold 15px 'JetBrains Mono', monospace";
    ctx.fillText("BIBLE LOUIS SEGOND 1910", centerX, refY + 45);

    // 6. Draw "Bible Profonde" Watermark at bottom
    const bottomY = height - (aspectRatio === 'square' ? 120 : 200);

    // Ornament line
    ctx.strokeStyle = config.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 120, bottomY - 30);
    ctx.lineTo(centerX + 120, bottomY - 30);
    ctx.stroke();

    ctx.fillStyle = config.referenceColor;
    ctx.font = "bold 14px 'JetBrains Mono', monospace";
    ctx.fillText("📖 BIBLE PROFONDE", centerX, bottomY);

    ctx.fillStyle = config.textColor + '40'; // 25% opacity
    ctx.font = "normal 11px sans-serif";
    ctx.fillText("Études d'étymologies originales & Sagesse IA", centerX, bottomY + 22);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `BibleProfonde_${verse.book_id}_${verse.chapter}_${verse.verse}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Error downloading shared image:", e);
    }
  };

  const handleCopyLink = () => {
    const cleanTextNoBrackets = customText;
    const shareText = `📖 "${cleanTextNoBrackets}"\n\n👉 *${verse.book_name} ${verse.chapter}:${verse.verse}* (Louis Segond 1910) - Étudié en profondeur sur Bible Profonde.\n🔗 ${window.location.origin}`;
    navigator.clipboard.writeText(shareText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsappShare = () => {
    const shareText = `📖 "« ${customText} »"\n\n👉 *${verse.book_name} ${verse.chapter}:${verse.verse}* (Louis Segond 1910)\n\nConsulter les langues d'origine hébreu/grec et l'exégèse IA :\n🔗 ${window.location.origin}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      {/* Outer Click Closer */}
      <div className="absolute inset-0 cursor-default" onClick={onClose}></div>

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-[#0d0b07] border border-[#2e2a1e] rounded-[2.5rem] w-full max-w-lg md:max-w-4xl p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 shadow-gold-glow overflow-y-auto max-h-[90vh] md:max-h-none z-10"
      >
        {/* Close Button Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#16130f] border border-[#2e2a1e] text-[#6b6355] hover:text-[#e8e0d0] hover:border-[#c9a84c]/40 transition duration-200 cursor-pointer"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Column 1: Image Canvas Real-Time Preview Rendering */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="text-left w-full">
            <span className="text-[9px] font-mono tracking-widest text-[#6b6355] uppercase block font-black mb-1">APERÇU DE LA CARTE</span>
            <h2 className="font-serif font-extrabold text-[#c9a84c] text-lg uppercase">Partage Stylisé</h2>
          </div>

          <div className="w-full flex items-center justify-center bg-[#070604] border border-[#2e2a1e] rounded-3xl p-4 md:p-6 overflow-hidden min-h-[300px] max-w-[340px] md:max-w-[360px] self-center shadow-inner relative">
            {/* The hidden render canvas used for actual export */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Scale aspect-ratio container used to display the card nicely in modern CSS */}
            <div 
              style={{
                aspectRatio: aspectRatio === 'square' ? '1/1' : '9/16',
              }}
              className="w-full relative shadow-2xl rounded-2xl border border-white/5 overflow-hidden transition-all duration-300"
            >
              {/* Draw in real-time visual via simulated styles as a fallback to see instantly */}
              <div 
                className={`absolute inset-0 bg-gradient-to-b ${THEME_CONFIGS[selectedTheme].bgGradient[0]} ${THEME_CONFIGS[selectedTheme].bgGradient[1]} p-6 flex flex-col justify-between text-center select-text selection:bg-[#c9a84c]/20`}
                style={{
                  border: `10px double ${THEME_CONFIGS[selectedTheme].borderColor}`
                }}
              >
                {/* Simulated Header */}
                <div className="flex flex-col items-center pt-2">
                  <div 
                    className="w-6 h-6 border flex items-center justify-center rounded-sm text-[8px] font-mono rotate-45 mb-1.5 opacity-60"
                    style={{ borderColor: THEME_CONFIGS[selectedTheme].referenceColor, color: THEME_CONFIGS[selectedTheme].referenceColor }}
                  >
                    <span className="-rotate-45 font-bold">†</span>
                  </div>
                  <div className="w-16 h-[1px] opacity-40" style={{ backgroundColor: THEME_CONFIGS[selectedTheme].referenceColor }}></div>
                </div>

                {/* Simulated Core Verse content block */}
                <div className="my-auto py-2">
                  <p 
                    className="font-reading italic leading-[1.5] text-center px-1"
                    style={{ 
                      color: THEME_CONFIGS[selectedTheme].textColor,
                      fontSize: customText.length > 150 ? '11px' : customText.length > 70 ? '13px' : '15px'
                    }}
                  >
                    « {customText} »
                  </p>
                  
                  <p 
                    className="font-serif font-bold tracking-tight mt-4 text-[11px] uppercase"
                    style={{ color: THEME_CONFIGS[selectedTheme].referenceColor }}
                  >
                    {verse.book_name} {verse.chapter}:{verse.verse}
                  </p>
                  <p 
                    className="text-[7.5px] font-mono uppercase tracking-widest mt-1 opacity-50"
                    style={{ color: THEME_CONFIGS[selectedTheme].textColor }}
                  >
                    L. SEGOND 1910
                  </p>
                </div>

                {/* Simulated Footer */}
                <div className="flex flex-col items-center pb-2">
                  <div className="w-12 h-[1px] opacity-20 mb-2" style={{ backgroundColor: THEME_CONFIGS[selectedTheme].textColor }}></div>
                  <span className="text-[7px] font-mono tracking-widest font-bold" style={{ color: THEME_CONFIGS[selectedTheme].referenceColor }}>
                    📖 BIBLE PROFONDE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Interactive Controls & Configuration Options */}
        <div className="flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Aspect Ratio choice */}
            <div className="space-y-2.5 text-left">
              <span className="text-[9px] font-mono tracking-widest text-[#6b6355] uppercase block font-black flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" /> Format Dimensionnel
              </span>
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => setAspectRatio('square')}
                  className={`py-3 px-4 rounded-2xl border text-xs font-mono font-bold flex flex-col items-center gap-1.5 transition duration-200 cursor-pointer ${
                    aspectRatio === 'square'
                      ? 'bg-[#1a1712] border-[#c9a84c] text-[#c9a84c] shadow-soft'
                      : 'bg-[#0f0d09] border-[#2e2a1e] text-[#6b6355] hover:text-[#e8e0d0] hover:border-[#2e2a1e]/80'
                  }`}
                >
                  <span className="w-4.5 h-4.5 border border-current rounded-sm"></span>
                  <span>Post Carré (1:1)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('story')}
                  className={`py-3 px-4 rounded-2xl border text-xs font-mono font-bold flex flex-col items-center gap-1.5 transition duration-200 cursor-pointer ${
                    aspectRatio === 'story'
                      ? 'bg-[#1a1712] border-[#c9a84c] text-[#c9a84c] shadow-soft'
                      : 'bg-[#0f0d09] border-[#2e2a1e] text-[#6b6355] hover:text-[#e8e0d0] hover:border-[#2e2a1e]/80'
                  }`}
                >
                  <span className="w-3.5 h-5 border border-current rounded-sm"></span>
                  <span>Story Vertical (9:16)</span>
                </button>
              </div>
            </div>

            {/* Elegant Theme presets with preview dot */}
            <div className="space-y-2.5 text-left">
              <span className="text-[9px] font-mono tracking-widest text-[#6b6355] uppercase block font-black flex items-center gap-1">
                <Palette className="w-3.5 h-3.5" /> Enluminure & Palette de Couleurs
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {(Object.keys(THEME_CONFIGS) as ThemePreset[]).map((key) => {
                  const cfg = THEME_CONFIGS[key];
                  const isCur = selectedTheme === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedTheme(key)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left cursor-pointer transition duration-150 ${
                        isCur
                          ? 'bg-[#1a1712] border-[#c9a84c] text-[#e8e0d0]'
                          : 'bg-[#0f0d09] border-[#2e2a1e] text-[#6b6355] hover:text-[#e8e0d0]'
                      }`}
                    >
                      {/* Miniature preview circle */}
                      <span 
                        className="w-4.5 h-4.5 rounded-full border border-white/20 shadow-md flex-shrink-0 flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${cfg.bgCanvasGradient[0]} 0%, ${cfg.bgCanvasGradient[1]} 100%)` }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.referenceColor }} />
                      </span>
                      <div className="text-left">
                        <p className="text-xs font-serif font-bold leading-none">{cfg.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customizer: Text Editor */}
            <div className="space-y-2 text-left">
              <span className="text-[9px] font-mono tracking-widest text-[#6b6355] uppercase block font-black">
                Édition du Texte de Partage
              </span>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                maxLength={450}
                placeholder="Personnalisez le verset avant de créer l'image..."
                className="w-full h-24 bg-[#0f0d09] border border-[#2e2a1e] rounded-2xl p-3.5 text-xs text-[#e8e0d0] focus:outline-none focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c]/20 resize-none font-reading leading-relaxed"
              />
              <div className="flex justify-between items-center text-[10px] font-mono text-[#6b6355]">
                <span>{customText.length} / 450 caractères</span>
                <button 
                  onClick={() => setCustomText(cleanText)}
                  className="hover:text-[#c9a84c] transition"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons list */}
          <div className="space-y-3 pt-4 border-t border-[#2e2a1e]/40">
            <div className="grid grid-cols-2 gap-3">
              {/* WhatsApp Text share */}
              <button
                onClick={handleWhatsappShare}
                className="py-3 px-4 rounded-2xl bg-[#0f0d09] hover:bg-[#15120e] border border-[#2e2a1e] text-emerald-400 hover:border-emerald-400/40 font-mono text-[10px] font-extrabold tracking-widest uppercase flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Texte WhatsApp</span>
              </button>

              {/* Copy Quote & Link */}
              <button
                onClick={handleCopyLink}
                className="py-3 px-4 rounded-2xl bg-[#0f0d09] hover:bg-[#15120e] border border-[#2e2a1e] text-[#e8e0d0] hover:border-[#c9a84c]/40 font-mono text-[10px] font-extrabold tracking-widest uppercase flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-[#c9a84c]" />
                    <span className="text-[#c9a84c]">Lieu copié✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#6b6355]" />
                    <span>Copier citation</span>
                  </>
                )}
              </button>
            </div>

            {/* HIGH QUALITY IMAGE GENERATION DOWNLOAD TRIGGER */}
            <button
              onClick={handleDownload}
              className="w-full py-4 rounded-2xl bg-gold-gradient text-[#0d0b07] font-mono text-[11px] font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition cursor-pointer hover:opacity-95 shadow-md"
            >
              <Download className="w-4.5 h-4.5 text-[#0d0b07]" />
              <span>Générer & Télécharger l'image</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
