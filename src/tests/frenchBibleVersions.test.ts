import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_BIBLE_TRANSLATION,
  TRANSLATION_CATALOG,
  fetchOnlineChapter,
  detectUnexpectedEnglishInFrenchVerses,
  isFrenchTranslation,
  normalizeTranslationId,
  querySqliteChapter
} from '../data/bibleData';

const ENGLISH_FORBIDDEN_REGEX = /(?<![a-zA-ZÀ-ÿ])(the|and|of|who)(?![a-zA-ZÀ-ÿ])/i;

describe('Versions bibliques françaises (LSG, Darby, Martin 1744, Ostervald)', () => {
  test('La version par défaut est bien le français (lsg)', () => {
    assert.strictEqual(DEFAULT_BIBLE_TRANSLATION, 'lsg');
    assert.strictEqual(isFrenchTranslation(DEFAULT_BIBLE_TRANSLATION), true);
    assert.strictEqual(normalizeTranslationId('web'), null);
  });

  test('Le détecteur de régression linguistique rejette les mots anglais et accepte le français', () => {
    assert.strictEqual(
      detectUnexpectedEnglishInFrenchVerses([
        { text: 'Paul, a servant of Jesus Christ, called to be an apostle, set apart for the Good News of God,' }
      ]),
      true
    );
    assert.strictEqual(
      detectUnexpectedEnglishInFrenchVerses([
        { text: 'Paul, serviteur de Jésus-Christ, appelé à être apôtre, mis à part pour annoncer l’Évangile de Dieu,' }
      ]),
      false
    );
    // Vérifier l'absence de faux positifs sur les accents français (thème, thé, grand)
    assert.strictEqual(
      detectUnexpectedEnglishInFrenchVerses([
        { text: 'Le thème de ce grand psaume et le thé préparé devant toi.' }
      ]),
      false
    );
  });

  test('Les versions non supportées (ex: web) lèvent une erreur explicite sans fallback silencieux', async () => {
    await assert.rejects(
      () => fetchOnlineChapter(45, 'Romains', 1, 'web'),
      /non disponible|non supportée/i
    );
  });

  test('Le corpus local complet (bible-lsg1910-complete.json) contient 1 189 chapitres en français sans anglais', () => {
    const corpusPath = path.join(process.cwd(), 'bible-lsg1910-complete.json');
    assert.ok(fs.existsSync(corpusPath), 'bible-lsg1910-complete.json doit exister');

    const data = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));
    const chapters = Object.entries(data.verses || {}) as Array<[string, Array<{ verse: number; text: string }>]>;
    assert.strictEqual(chapters.length, 1189);

    for (const [chKey, verses] of chapters) {
      for (const v of verses) {
        assert.ok(
          !ENGLISH_FORBIDDEN_REGEX.test(v.text),
          `Texte anglais détecté dans le corpus LSG (${chKey}:${v.verse}) : "${v.text}"`
        );
      }
    }

    const romains1 = data.verses['45_1'];
    assert.ok(romains1[0].text.includes('Paul, serviteur de Jésus-Christ'));
    const jean3 = data.verses['43_3'];
    assert.ok(jean3.find(v => v.verse === 16)?.text.includes('Car Dieu a tant aimé le monde'));
  });

  test('querySqliteChapter retourne du français authentique pour Genèse 1', () => {
    const gen1 = querySqliteChapter(1, 'Genèse', 1);
    assert.ok(gen1 && gen1.length > 0);
    assert.ok(gen1[0].text.includes('Au commencement, Dieu créa'));
    for (const v of gen1) {
      assert.ok(!ENGLISH_FORBIDDEN_REGEX.test(v.text), `Anglais détecté dans Genèse 1:${v.verse}`);
    }
  });

  test('Chaque version française (lsg, darby, martin, ostervald) charge Romains 1:1-4 et Jean 3:16 en français sans aucun mot anglais', async () => {
    const frenchIds: Array<'lsg' | 'darby' | 'martin' | 'ostervald'> = ['lsg', 'darby', 'martin', 'ostervald'];

    for (const id of frenchIds) {
      assert.strictEqual(TRANSLATION_CATALOG[id].language, 'fr');

      const romains1 = await fetchOnlineChapter(45, 'Romains', 1, id);
      assert.ok(romains1.length >= 4, `${id}: Romains 1 doit contenir au moins 4 versets`);
      for (const v of romains1) {
        assert.ok(
          !ENGLISH_FORBIDDEN_REGEX.test(v.text),
          `ÉCHEC [${id}] Romains 1:${v.verse} contient un mot anglais : "${v.text}"`
        );
      }
      assert.ok(
        /Paul.*(serviteur|esclave).*Jésus[- ]Christ/i.test(romains1[0].text),
        `[${id}] Romains 1:1 inattendu : "${romains1[0].text}"`
      );

      const jean3 = await fetchOnlineChapter(43, 'Jean', 3, id);
      const j316 = jean3.find(v => v.verse === 16);
      assert.ok(j316, `${id}: Jean 3:16 introuvable`);
      for (const v of jean3) {
        assert.ok(
          !ENGLISH_FORBIDDEN_REGEX.test(v.text),
          `ÉCHEC [${id}] Jean 3:${v.verse} contient un mot anglais : "${v.text}"`
        );
      }
      assert.ok(
        /Car Dieu a tant aimé le monde/i.test(j316.text),
        `[${id}] Jean 3:16 inattendu : "${j316.text}"`
      );
    }
  });
});
