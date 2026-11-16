import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TTS_TELEMETRY_EVENT,
  SpeechTelemetryEventDetail,
  extractBoundaryWord,
  computeWordSyllableEnergy,
  computeSoundwaveBars,
  emitSpeechTelemetry,
} from '../utils/speechWaveform';

describe('SpeechSynthesis Soundwave Visualization Telemetry & Math', () => {
  test('extractBoundaryWord uses charLength when supplied and handles French accented words/apostrophes', () => {
    const verse = "Verset 1. Au commencement, l'Éternel créa les cieux et la terre.";

    assert.strictEqual(extractBoundaryWord(verse, 10, 2), 'Au');
    assert.strictEqual(extractBoundaryWord(verse, 27), "l'Éternel");
    assert.strictEqual(extractBoundaryWord(verse, 37), 'créa');
    assert.strictEqual(extractBoundaryWord(verse, -1), '');
    assert.strictEqual(extractBoundaryWord(verse, 999), '');
  });

  test('computeWordSyllableEnergy bounds output and responds to French vowel density and volume', () => {
    const richWordEnergy = computeWordSyllableEnergy('miséricorde', 1.0);
    const shortWordEnergy = computeWordSyllableEnergy('et', 1.0);
    const lowVolumeEnergy = computeWordSyllableEnergy('miséricorde', 0.2);
    const emptyEnergy = computeWordSyllableEnergy('', 1.0);

    assert.ok(richWordEnergy >= 0.25 && richWordEnergy <= 1.0);
    assert.ok(shortWordEnergy >= 0.25 && shortWordEnergy <= 1.0);
    assert.ok(richWordEnergy > shortWordEnergy, 'Multi-syllable words should produce stronger vocal energy');
    assert.ok(richWordEnergy > lowVolumeEnergy, 'Lower volume should reduce vocal energy');
    assert.strictEqual(emptyEnergy, 0.45);
  });

  test('computeSoundwaveBars returns collapsed idle bars when not speaking', () => {
    const bars = computeSoundwaveBars({
      barCount: 9,
      timeMs: 1200,
      isSpeaking: false,
      isPaused: false,
      wordEnergy: 0.9,
      boundaryAgeMs: 20,
      charIndex: 15,
      rate: 1.0,
      volume: 1.0,
    });

    assert.strictEqual(bars.length, 9);
    assert.ok(bars.every((b) => b === 0.16));
  });

  test('computeSoundwaveBars returns calm symmetric resting state when paused', () => {
    const bars = computeSoundwaveBars({
      barCount: 9,
      timeMs: 1200,
      isSpeaking: true,
      isPaused: true,
      wordEnergy: 0.9,
      boundaryAgeMs: 20,
      charIndex: 15,
      rate: 1.0,
      volume: 1.0,
    });

    assert.strictEqual(bars.length, 9);
    assert.strictEqual(bars[0], bars[8]);
    assert.strictEqual(bars[1], bars[7]);
    assert.ok(bars[4] > bars[0], 'Center bar should gently peak above outer bars when paused');
    assert.ok(bars.every((b) => b >= 0.18 && b <= 0.3));
  });

  test('computeSoundwaveBars animates dynamically on active SpeechSynthesis boundary & rate/volume changes', () => {
    const freshBoundary = computeSoundwaveBars({
      barCount: 9,
      timeMs: 420,
      isSpeaking: true,
      isPaused: false,
      wordEnergy: 0.95,
      boundaryAgeMs: 15,
      charIndex: 12,
      rate: 1.25,
      volume: 1.0,
    });

    const decayedBoundary = computeSoundwaveBars({
      barCount: 9,
      timeMs: 420,
      isSpeaking: true,
      isPaused: false,
      wordEnergy: 0.95,
      boundaryAgeMs: 700,
      charIndex: 12,
      rate: 1.25,
      volume: 1.0,
    });

    const shiftedWord = computeSoundwaveBars({
      barCount: 9,
      timeMs: 420,
      isSpeaking: true,
      isPaused: false,
      wordEnergy: 0.95,
      boundaryAgeMs: 15,
      charIndex: 23,
      rate: 1.25,
      volume: 1.0,
    });

    assert.strictEqual(freshBoundary.length, 9);
    assert.ok(freshBoundary.every((b) => b >= 0.2 && b <= 1.0));

    const freshSum = freshBoundary.reduce((acc, v) => acc + v, 0);
    const decayedSum = decayedBoundary.reduce((acc, v) => acc + v, 0);
    assert.ok(freshSum > decayedSum, 'Fresh SpeechSynthesis boundary impulse should boost bar amplitude');
    assert.notDeepStrictEqual(freshBoundary, shiftedWord, 'Different charIndex offsets should modulate harmonic contour');
  });

  test('emitSpeechTelemetry dispatches CustomEvent with computed word and energy when window exists', () => {
    const originalWindow = (globalThis as Record<string, unknown>).window;
    const originalCustomEvent = (globalThis as Record<string, unknown>).CustomEvent;
    const dispatched: Array<{ type: string; detail: SpeechTelemetryEventDetail }> = [];

    class MockCustomEvent<T> {
      type: string;
      detail: T;
      constructor(type: string, init?: { detail?: T }) {
        this.type = type;
        this.detail = init?.detail as T;
      }
    }

    (globalThis as Record<string, unknown>).CustomEvent = MockCustomEvent;
    (globalThis as Record<string, unknown>).window = {
      dispatchEvent(ev: { type: string; detail: SpeechTelemetryEventDetail }) {
        dispatched.push(ev);
        return true;
      },
    };

    try {
      emitSpeechTelemetry({
        phase: 'boundary',
        text: 'Verset 1. Dieu créa la lumière.',
        charIndex: 15,
        charLength: 4,
        rate: 1.1,
        volume: 0.9,
      });

      assert.strictEqual(dispatched.length, 1);
      assert.strictEqual(dispatched[0].type, TTS_TELEMETRY_EVENT);
      assert.strictEqual(dispatched[0].detail.phase, 'boundary');
      assert.strictEqual(dispatched[0].detail.word, 'créa');
      assert.strictEqual(dispatched[0].detail.rate, 1.1);
      assert.strictEqual(dispatched[0].detail.volume, 0.9);
      assert.ok(dispatched[0].detail.wordEnergy >= 0.25 && dispatched[0].detail.wordEnergy <= 1.0);
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as Record<string, unknown>).window;
      } else {
        (globalThis as Record<string, unknown>).window = originalWindow;
      }
      if (originalCustomEvent === undefined) {
        delete (globalThis as Record<string, unknown>).CustomEvent;
      } else {
        (globalThis as Record<string, unknown>).CustomEvent = originalCustomEvent;
      }
    }
  });
});
