// Icon and colours per person category (used by tiles, pills, avatars).

import {
  Anchor,
  Crown,
  Drama,
  Feather,
  FlaskConical,
  Landmark,
  Lightbulb,
  Music,
  Palette,
  Sparkles,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import type { PersonCategory } from '../types';

interface CategoryStyle {
  icon: LucideIcon;
  /** Strong colour for icons and text. */
  color: string;
  /** Soft tint for backgrounds. */
  soft: string;
}

export const CATEGORY_STYLE: Record<PersonCategory, CategoryStyle> = {
  writers: { icon: Feather, color: '#4c5fd5', soft: '#e9ecfb' },
  art: { icon: Palette, color: '#c4497a', soft: '#fae7ef' },
  music: { icon: Music, color: '#8a4fd1', soft: '#f1e9fb' },
  science: { icon: FlaskConical, color: '#1f8a7e', soft: '#e0f2ef' },
  thinkers: { icon: Lightbulb, color: '#c26d14', soft: '#fbeedd' },
  royals: { icon: Crown, color: '#a8831a', soft: '#f8efd3' },
  naval: { icon: Anchor, color: '#2a62a8', soft: '#e3ecf7' },
  politics: { icon: Landmark, color: '#b44a35', soft: '#f8e6e1' },
  stage: { icon: Drama, color: '#bd479e', soft: '#f8e5f2' },
  sports: { icon: Trophy, color: '#2f8a4b', soft: '#e2f2e7' },
  other: { icon: Sparkles, color: '#6f6b64', soft: '#ecebe6' },
};
