import type { ThemedRoute } from '../types';

export const ROUTES: ThemedRoute[] = [
  {
    id: 1,
    title: 'Guldaldervandring',
    subtitle: 'Assistens Kirkegård',
    stops: 5,
    duration: '45 min',
    distance: '1.2 km',
    category: 'writers',
    emoji: '✍️',
  },
  {
    id: 2,
    title: 'Flådeheltene',
    subtitle: 'Holmens Kirkegård',
    stops: 4,
    duration: '35 min',
    distance: '0.8 km',
    category: 'naval',
    emoji: '⚓',
  },
  {
    id: 3,
    title: 'Videnskabens pionerer',
    subtitle: 'Assistens Kirkegård',
    stops: 6,
    duration: '55 min',
    distance: '1.5 km',
    category: 'science',
    emoji: '🔬',
  },
  {
    id: 4,
    title: 'Kongernes Roskilde',
    subtitle: 'Roskilde Domkirke',
    stops: 8,
    duration: '60 min',
    distance: '0.9 km',
    category: 'royals',
    emoji: '👑',
  },
];
