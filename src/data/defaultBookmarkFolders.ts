import { BookmarkFolder } from '../types/bible';

export const DEFAULT_BOOKMARK_FOLDERS: BookmarkFolder[] = [
  {
    id: 'paix',
    name: 'Paix & Sérénité',
    color: 'emerald',
    icon: 'feather',
    description: "Versets apportant la quiétude, l'apaisement de l'esprit et la paix de Dieu.",
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'foi',
    name: 'Foi & Espérance',
    color: 'gold',
    icon: 'sparkles',
    description: 'Passages inspirants fortifiant la certitude des promesses et la foi inébranlable.',
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'combat',
    name: 'Combat Spirituel & Victoire',
    color: 'amber',
    icon: 'shield',
    description: "Versets d'autorité, persévérance dans l'épreuve et triomphe dans la grâce.",
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'guerison',
    name: 'Guérison & Réconfort',
    color: 'rose',
    icon: 'heart',
    description: 'Consolation divine, restauration du cœur blessé et tendresse du Père céleste.',
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'louange',
    name: 'Louange & Gratitude',
    color: 'indigo',
    icon: 'star',
    description: "Actions de grâces, magnificence de la création et cantiques d'adoration.",
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'sagesse',
    name: 'Sagesse & Discernement',
    color: 'cyan',
    icon: 'book',
    description: 'Conseils pratiques, prudence sainte et clarté pour les choix de vie.',
    created_at: '2026-01-01T00:00:00.000Z'
  }
];
