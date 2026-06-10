// lib/theme.ts

export const Colors = {
  // Fonds
  background: '#0d0b07',        // Noir profond chaud (fond principal)
  surface: '#1a1712',           // Carte / panel légèrement plus clair
  surfaceElevated: '#252018',   // Modal, bottom sheet
  border: '#2e2a1e',            // Bordures subtiles

  // Textes
  textPrimary: '#e8e0d0',       // Blanc cassé chaud — corps de texte
  textVerse: '#c9a84c',         // Or — citations bibliques et versets
  textMuted: '#6b6355',         // Gris chaud — références, labels
  textAccent: '#d4a843',        // Or vif — mots grecs/hébreux cliquables

  // Accents
  gold: '#c9a84c',              // Or principal
  goldLight: '#e8c97a',         // Or clair — hover/focus
  goldDark: '#8a6f2e',          // Or sombre — ombre, bordure card
  dot: '#c9a84c',               // Petit point indicateur (• ANALYSE)

  // Interactif
  buttonBg: 'rgba(201,168,76,0.12)',   // Fond bouton doré transparent
  buttonBorder: '#c9a84c',             // Bordure bouton
  buttonText: '#c9a84c',              // Texte bouton

  // Transparences utiles
  overlay: 'rgba(13,11,7,0.85)',
  cardShadow: 'rgba(0,0,0,0.6)',
};

export const Typography = {
  fonts: {
    serif: 'Playfair Display, Georgia, serif',        // Versets, titres
    sans: 'Inter, system-ui, sans-serif',               // Corps de texte, UI
    mono: 'JetBrains Mono, monospace',            // Labels, références
  },

  sizes: {
    verseQuote: '28px',      // Grande citation verset (style image)
    verseBody: '18px',       // Lecture normale
    reference: '12px',       // "JEAN · 1 : 5" — espacé, small caps
    sectionLabel: '11px',    // "• ANALYSE LINGUISTIQUE" — uppercase
    body: '15px',            // Texte analyse/contexte
    bodySmall: '13px',       // Texte secondaire
    heading: '22px',         // Titres de page
  },

  lineHeights: {
    verseQuote: '40px',
    verseBody: '30px',
    body: '24px',
  },

  letterSpacing: {
    reference: '0.15em',    // JEAN · 1 : 5 — très espacé
    label: '0.12em',        // ANALYSE LINGUISTIQUE
    normal: '0.02em',
  },
};

export const Spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
  screenPadding: '20px',
};

export const Radius = {
  sm: '4px',
  md: '8px',      // Cards — pas trop rond
  lg: '16px',
  pill: '24px',   // Badges
};
