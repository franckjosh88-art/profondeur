import React from 'react';
import { 
  Sun, Heart, Compass, CloudRain, AlertCircle, Award, Sparkles, FileText
} from 'lucide-react';

export interface EmotionMeta {
  iconName: string;
  colorClass: string;
  badgeBg: string;
  borderClass: string;
  label: string;
  key: string;
}

export const EMOTIONS_LIST: EmotionMeta[] = [
  {
    key: 'joie',
    iconName: 'Sun',
    colorClass: 'text-amber-400',
    badgeBg: 'bg-amber-500/10',
    borderClass: 'border-amber-500/20',
    label: 'Joie & Célébration'
  },
  {
    key: 'gratitude',
    iconName: 'Heart',
    colorClass: 'text-rose-400',
    badgeBg: 'bg-rose-500/10',
    borderClass: 'border-rose-500/20',
    label: 'Gratitude & Louange'
  },
  {
    key: 'paix',
    iconName: 'Compass',
    colorClass: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/20',
    label: 'Paix & Sérénité'
  },
  {
    key: 'espoir',
    iconName: 'Sparkles',
    colorClass: 'text-yellow-400',
    badgeBg: 'bg-yellow-500/10',
    borderClass: 'border-yellow-500/20',
    label: 'Espoir & Confiance'
  },
  {
    key: 'tristesse',
    iconName: 'CloudRain',
    colorClass: 'text-blue-400',
    badgeBg: 'bg-blue-500/10',
    borderClass: 'border-blue-500/20',
    label: 'Tristesse & Doléance'
  },
  {
    key: 'anxiete',
    iconName: 'AlertCircle',
    colorClass: 'text-orange-400',
    badgeBg: 'bg-orange-500/10',
    borderClass: 'border-orange-500/20',
    label: 'Crainte & Épreuve'
  },
  {
    key: 'repentance',
    iconName: 'Award',
    colorClass: 'text-purple-400',
    badgeBg: 'bg-purple-500/10',
    borderClass: 'border-purple-500/20',
    label: 'Repentance & Regret'
  }
];

export const getEmotionMeta = (emotion: string | undefined): EmotionMeta => {
  const norm = (emotion || '').toLowerCase().trim();
  
  if (norm.includes('joie') || norm.includes('joy') || norm.includes('heureux') || norm.includes('gai') || norm.includes('allégresse')) {
    return EMOTIONS_LIST[0];
  }
  if (norm.includes('gratitude') || norm.includes('reconnoiss') || norm.includes('merci') || norm.includes('thanks') || norm.includes('louange') || norm.includes('adoration')) {
    return EMOTIONS_LIST[1];
  }
  if (norm.includes('paix') || norm.includes('peace') || norm.includes('calme') || norm.includes('seren') || norm.includes('tranquil')) {
    return EMOTIONS_LIST[2];
  }
  if (norm.includes('espoir') || norm.includes('hope') || norm.includes('esper') || norm.includes('attente') || norm.includes('confiance') || norm.includes('foi')) {
    return EMOTIONS_LIST[3];
  }
  if (norm.includes('tristesse') || norm.includes('sad') || norm.includes('deuil') || norm.includes('pleur') || norm.includes('peine') || norm.includes('melanc') || norm.includes('affliction')) {
    return EMOTIONS_LIST[4];
  }
  if (norm.includes('crainte') || norm.includes('peur') || norm.includes('anxi') || norm.includes('anxiety') || norm.includes('inquiet') || norm.includes('doute') || norm.includes('tourment') || norm.includes('effroi')) {
    return EMOTIONS_LIST[5];
  }
  if (norm.includes('repentance') || norm.includes('regret') || norm.includes('confess') || norm.includes('remord') || norm.includes('pardon') || norm.includes('brisement') || norm.includes('honte')) {
    return EMOTIONS_LIST[6];
  }
  
  // Default - Neutral Meditation
  return {
    key: 'meditation',
    iconName: 'FileText',
    colorClass: 'text-[#c9a84c]',
    badgeBg: 'bg-[#c9a84c]/10',
    borderClass: 'border-[#c9a84c]/20',
    label: 'Méditation & Pensée'
  };
};

export const renderEmotionIcon = (iconName: string, className = "w-3.5 h-3.5") => {
  switch (iconName) {
    case 'Sun': return <Sun className={className} />;
    case 'Heart': return <Heart className={className} />;
    case 'Compass': return <Compass className={className} />;
    case 'CloudRain': return <CloudRain className={className} />;
    case 'AlertCircle': return <AlertCircle className={className} />;
    case 'Award': return <Award className={className} />;
    case 'Sparkles': return <Sparkles className={className} />;
    default: return <FileText className={className} />;
  }
};
