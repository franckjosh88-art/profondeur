import { ChapterAudioMeditation } from '../types/bible';

export interface AudioGroup {
  book_id?: number;
  book_name?: string;
  label?: string;
  items: ChapterAudioMeditation[];
}

/**
 * Regroupe les audios par livre biblique avec tri des chapitres
 */
export function groupAudiosByBook(filteredAudios: ChapterAudioMeditation[]): AudioGroup[] {
  const groups: AudioGroup[] = [];
  const map = new Map<number, { book_id: number; book_name: string; items: ChapterAudioMeditation[] }>();

  filteredAudios.forEach(item => {
    if (!map.has(item.book_id)) {
      map.set(item.book_id, {
        book_id: item.book_id,
        book_name: item.book_name,
        items: []
      });
    }
    map.get(item.book_id)!.items.push(item);
  });

  const sortedBookIds = Array.from(map.keys()).sort((a, b) => a - b);
  sortedBookIds.forEach(id => {
    const g = map.get(id)!;
    // Sort items by chapter asc, then date desc
    g.items.sort((a, b) => {
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    groups.push(g);
  });

  return groups;
}

/**
 * Regroupe les audios par plages chronologiques ("Aujourd'hui", "Hier", "Cette semaine", "Ce mois-ci", mois passés)
 */
export function groupAudiosByDate(filteredAudios: ChapterAudioMeditation[]): AudioGroup[] {
  const sorted = [...filteredAudios].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const buckets: AudioGroup[] = [];
  const now = new Date();
  const todayStr = now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const bucketMap = new Map<string, ChapterAudioMeditation[]>();

  sorted.forEach(item => {
    const itemDate = new Date(item.created_at);
    const itemDateStr = itemDate.toDateString();

    let key = '';
    if (itemDateStr === todayStr) {
      key = "Aujourd'hui";
    } else if (itemDateStr === yesterdayStr) {
      key = 'Hier';
    } else if (itemDate >= sevenDaysAgo) {
      key = 'Cette semaine';
    } else if (itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()) {
      key = 'Ce mois-ci';
    } else {
      const monthName = itemDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      key = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    }

    if (!bucketMap.has(key)) {
      bucketMap.set(key, []);
    }
    bucketMap.get(key)!.push(item);
  });

  bucketMap.forEach((items, label) => {
    buckets.push({ label, items });
  });

  return buckets;
}
