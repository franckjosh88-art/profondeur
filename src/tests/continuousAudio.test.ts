import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BOOKS } from '../data/bibleData';
import {
  getNextChapter,
  getPreviousChapter,
  shouldContinueOnChapterChange,
  shouldAdvanceOnSpeechError,
  formatSleepCountdown,
} from '../utils/chapterNavigation';

describe('Continuous Chapter & Book Audio Navigation', () => {
  const jeremie = BOOKS.find((b) => b.id === 24)!;
  const lamentations = BOOKS.find((b) => b.id === 25)!;
  const apocalypse = BOOKS.find((b) => b.id === 66)!;
  const genese = BOOKS.find((b) => b.id === 1)!;

  test('getNextChapter advances seamlessly through chapters (Jérémie 32 -> 33 -> 34)', () => {
    const step1 = getNextChapter(jeremie, 32);
    assert.ok(step1 !== null);
    assert.strictEqual(step1.book.id, jeremie.id);
    assert.strictEqual(step1.chapter, 33);

    const step2 = getNextChapter(step1.book, step1.chapter);
    assert.ok(step2 !== null);
    assert.strictEqual(step2.book.id, jeremie.id);
    assert.strictEqual(step2.chapter, 34);
  });

  test('getNextChapter crosses book boundary at end of book (Jérémie 52 -> Lamentations 1)', () => {
    assert.strictEqual(jeremie.chapters_count, 52);
    const next = getNextChapter(jeremie, 52);
    assert.ok(next !== null);
    assert.strictEqual(next.book.id, lamentations.id);
    assert.strictEqual(next.book.name, 'Lamentations');
    assert.strictEqual(next.chapter, 1);
  });

  test('getNextChapter returns null at Apocalypse 22 (end of Bible)', () => {
    assert.strictEqual(apocalypse.chapters_count, 22);
    const next = getNextChapter(apocalypse, 22);
    assert.strictEqual(next, null);
  });

  test('getPreviousChapter handles reverse transitions and stops at Genèse 1', () => {
    const prevFromLamentations = getPreviousChapter(lamentations, 1);
    assert.ok(prevFromLamentations !== null);
    assert.strictEqual(prevFromLamentations.book.id, jeremie.id);
    assert.strictEqual(prevFromLamentations.chapter, 52);

    const prevFromGenese = getPreviousChapter(genese, 1);
    assert.strictEqual(prevFromGenese, null);
  });

  test('shouldContinueOnChapterChange preserves active playback and respects pause state', () => {
    assert.strictEqual(shouldContinueOnChapterChange(true, false, true), true);
    assert.strictEqual(shouldContinueOnChapterChange(true, false, false), true);
    assert.strictEqual(shouldContinueOnChapterChange(false, false, true), true);
    assert.strictEqual(shouldContinueOnChapterChange(true, true, true), false);
    assert.strictEqual(shouldContinueOnChapterChange(false, false, false), false);
  });

  test('shouldAdvanceOnSpeechError skips transient segment errors and triggers circuit breaker', () => {
    assert.strictEqual(shouldAdvanceOnSpeechError('interrupted', 0), 'ignore');
    assert.strictEqual(shouldAdvanceOnSpeechError('canceled', 2), 'ignore');
    assert.strictEqual(shouldAdvanceOnSpeechError('synthesis-failed', 0), 'skip');
    assert.strictEqual(shouldAdvanceOnSpeechError('audio-busy', 3), 'skip');
    assert.strictEqual(shouldAdvanceOnSpeechError('synthesis-failed', 4), 'stop');
  });

  test('formatSleepCountdown formats remaining minutes and seconds', () => {
    assert.strictEqual(formatSleepCountdown(900), '15:00');
    assert.strictEqual(formatSleepCountdown(65), '01:05');
    assert.strictEqual(formatSleepCountdown(0), '00:00');
  });
});
