import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { cleanMarkdownText, cleanBibleMarkdown, cleanTextForSpeech } from '../lib/bibleFormatter';
import { 
  isBookInPlan, 
  getPlanBooks, 
  getPlanTotalChapters, 
  calculatePlanProgress, 
  calculateReadingStreak, 
  formatReadingDuration 
} from '../utils/readingProgress';
import { BOOKS } from '../data/bibleData';

describe('1. Nettoyage du Markdown & Préparation pour la voix', () => {
  test('cleanMarkdownText supprime les astérisques et transforme les titres/puces', () => {
    const raw = `
### Contexte Historique
* **Auteur :** David
* Thème : La fidélité divine
Voici un passage avec **gras** et *italique*.
---
Fin du texte.
    `;
    const cleaned = cleanMarkdownText(raw);

    assert.ok(!cleaned.includes('###'));
    assert.ok(!cleaned.includes('**'));
    assert.ok(!cleaned.includes('---'));
    assert.ok(cleaned.includes('• Auteur : David'));
    assert.ok(cleaned.includes('• Thème : La fidélité divine'));
    assert.ok(cleaned.includes('Voici un passage avec gras et italique.'));
    assert.ok(cleaned.includes('Fin du texte.'));
  });

  test('cleanBibleMarkdown est un alias fidèle de cleanMarkdownText', () => {
    const raw = '# Titre\n* Item 1\n**Mot important**';
    assert.strictEqual(cleanBibleMarkdown(raw), cleanMarkdownText(raw));
  });

  test('cleanTextForSpeech élimine les balises Strong et les puces pour TTS', () => {
    const rawSpeech = '# PSAUME 23\n• [H3068] L\'Éternel est mon berger [H7462].\n**Rien** ne me manquera.';
    const speechReady = cleanTextForSpeech(rawSpeech);

    assert.ok(!speechReady.includes('[H3068]'));
    assert.ok(!speechReady.includes('[H7462]'));
    assert.ok(!speechReady.includes('•'));
    assert.ok(!speechReady.includes('#'));
    assert.ok(!speechReady.includes('**'));
    assert.ok(speechReady.includes('L\'Éternel est mon berger'));
    assert.ok(speechReady.includes('Rien ne me manquera'));
  });
});

describe('2. Calculs de la progression de lecture & défis', () => {
  test('isBookInPlan associe correctement les livres de l\'Ancien et du Nouveau Testament', () => {
    const genese = BOOKS.find(b => b.id === 1)!; // Ancien Testament / Pentateuque
    const matthieu = BOOKS.find(b => b.id === 40)!; // Nouveau Testament / Évangile
    const psaumes = BOOKS.find(b => b.id === 19)!; // Ancien Testament / Poétique

    assert.strictEqual(isBookInPlan(genese, 'pentateuque'), true);
    assert.strictEqual(isBookInPlan(genese, 'nt'), false);
    assert.strictEqual(isBookInPlan(genese, 'bible'), true);

    assert.strictEqual(isBookInPlan(matthieu, 'nt'), true);
    assert.strictEqual(isBookInPlan(matthieu, 'pentateuque'), false);
    assert.strictEqual(isBookInPlan(matthieu, 'bible'), true);

    assert.strictEqual(isBookInPlan(psaumes, 'poetique'), true);
    assert.strictEqual(isBookInPlan(psaumes, 'nt'), false);
  });

  test('getPlanTotalChapters calcule le nombre exact de chapitres du Nouveau Testament (260)', () => {
    const ntChapters = getPlanTotalChapters('nt');
    assert.strictEqual(ntChapters, 260);
  });

  test('calculatePlanProgress calcule correctement le pourcentage et les chapitres restants', () => {
    const progress = calculatePlanProgress(130, 260);
    assert.strictEqual(progress.percentage, 50);
    assert.strictEqual(progress.completed, 130);
    assert.strictEqual(progress.remaining, 130);
    assert.strictEqual(progress.isComplete, false);

    const complete = calculatePlanProgress(260, 260);
    assert.strictEqual(complete.percentage, 100);
    assert.strictEqual(complete.remaining, 0);
    assert.strictEqual(complete.isComplete, true);
  });

  test('calculateReadingStreak calcule la continuité de jours consécutifs', () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(now.getDate() - 2);

    const history = [
      { book_id: 1, book_name: 'Genèse', chapter: 1, timestamp: now.toISOString() },
      { book_id: 1, book_name: 'Genèse', chapter: 2, timestamp: yesterday.toISOString() },
      { book_id: 1, book_name: 'Genèse', chapter: 3, timestamp: twoDaysAgo.toISOString() }
    ];

    const streak = calculateReadingStreak(history);
    assert.strictEqual(streak, 3);
  });

  test('formatReadingDuration produit un formatage propre en heures, minutes et secondes', () => {
    assert.strictEqual(formatReadingDuration(0), '0 min');
    assert.strictEqual(formatReadingDuration(45), '45 s');
    assert.strictEqual(formatReadingDuration(120), '2 min');
    assert.strictEqual(formatReadingDuration(135), '2 min 15 s');
    assert.strictEqual(formatReadingDuration(3665), '1h 01m');
  });
});

describe('3. Écriture, lecture et validation des métadonnées audio', () => {
  test('Simulateur de stockage local audio en mémoire (Blob, durée, encodage)', async () => {
    // Structure de vérification du stockage audio local
    interface InMemoryAudioRecord {
      id: string;
      title: string;
      duration: number;
      mimeType: string;
      data: Uint8Array;
    }

    const memoryStorage = new Map<string, InMemoryAudioRecord>();

    function saveAudio(item: InMemoryAudioRecord) {
      if (!item.id || item.duration <= 0) {
        throw new Error("Données audio invalides");
      }
      memoryStorage.set(item.id, item);
      return { success: true };
    }

    function getAudio(id: string) {
      return memoryStorage.get(id) || null;
    }

    function deleteAudio(id: string) {
      return memoryStorage.delete(id);
    }

    const fakePayload: InMemoryAudioRecord = {
      id: 'audio_psaumes_23_1',
      title: 'Méditation Psaume 23',
      duration: 142,
      mimeType: 'audio/mp4',
      data: new Uint8Array([0, 1, 2, 3, 4, 5])
    };

    // Test d'écriture
    const writeResult = saveAudio(fakePayload);
    assert.strictEqual(writeResult.success, true);
    assert.strictEqual(memoryStorage.size, 1);

    // Test de lecture
    const retrieved = getAudio('audio_psaumes_23_1');
    assert.ok(retrieved !== null);
    assert.strictEqual(retrieved?.title, 'Méditation Psaume 23');
    assert.strictEqual(retrieved?.duration, 142);
    assert.strictEqual(retrieved?.data.length, 6);

    // Test de suppression
    const deleted = deleteAudio('audio_psaumes_23_1');
    assert.strictEqual(deleted, true);
    assert.strictEqual(getAudio('audio_psaumes_23_1'), null);
  });
});
