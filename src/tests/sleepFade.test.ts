import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SLEEP_FADE_WINDOW_SECONDS,
  getEffectiveSleepFadeWindow,
  isInSleepFadeWindow,
  computeSleepFadeFactor,
  computeEffectiveVoiceVolume,
} from '../utils/sleepFade';
import { AmbientMelodyGenerator } from '../utils/ambientSynth';
import { NatureSoundsSynthesizer } from '../utils/natureSounds';

function createMockAudioContextEnvironment() {
  const linearRamps: Array<{ value: number; endTime: number }> = [];
  const setValues: Array<{ value: number; startTime: number }> = [];
  let closed = false;

  const createMockGainParam = (initial = 1) => ({
    value: initial,
    cancelScheduledValues: () => {},
    setValueAtTime: (val: number, time: number) => {
      setValues.push({ value: val, startTime: time });
    },
    linearRampToValueAtTime: (val: number, time: number) => {
      linearRamps.push({ value: val, endTime: time });
    },
    exponentialRampToValueAtTime: () => {},
  });

  class MockAudioContext {
    currentTime = 10;
    sampleRate = 44100;
    state = 'running';
    destination = {};
    resume() {
      return Promise.resolve();
    }
    close() {
      closed = true;
      return Promise.resolve();
    }
    createGain() {
      return {
        gain: createMockGainParam(0.15),
        connect: () => {},
        disconnect: () => {},
      };
    }
    createBiquadFilter() {
      return {
        type: 'lowpass',
        frequency: createMockGainParam(500),
        Q: createMockGainParam(1),
        connect: () => {},
        disconnect: () => {},
      };
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: createMockGainParam(220),
        connect: () => {},
        disconnect: () => {},
        start: () => {},
        stop: () => {},
      };
    }
    createBuffer(channels: number, length: number) {
      return {
        numberOfChannels: channels,
        length,
        getChannelData: () => new Float32Array(length),
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        loop: false,
        connect: () => {},
        disconnect: () => {},
        start: () => {},
        stop: () => {},
      };
    }
  }

  return {
    MockAudioContext,
    linearRamps,
    setValues,
    wasClosed: () => closed,
  };
}

describe('Sleep Timer Automatic Fade-Out', () => {
  test('computeSleepFadeFactor keeps full volume until fade window and smoothly decays to 0', () => {
    const totalSeconds = 900; // 15 min
    assert.strictEqual(
      getEffectiveSleepFadeWindow(totalSeconds),
      DEFAULT_SLEEP_FADE_WINDOW_SECONDS
    );

    // Outside fade window -> 1.0
    assert.strictEqual(computeSleepFadeFactor(600, totalSeconds), 1);
    assert.strictEqual(computeSleepFadeFactor(15, totalSeconds), 1);
    assert.strictEqual(isInSleepFadeWindow(16, totalSeconds), false);

    // Inside fade window -> strictly decreasing toward 0
    assert.strictEqual(isInSleepFadeWindow(15, totalSeconds), true);
    const f12 = computeSleepFadeFactor(12, totalSeconds);
    const f8 = computeSleepFadeFactor(8, totalSeconds);
    const f4 = computeSleepFadeFactor(4, totalSeconds);
    const f1 = computeSleepFadeFactor(1, totalSeconds);
    const f0 = computeSleepFadeFactor(0, totalSeconds);

    assert.ok(f12 < 1 && f12 > f8);
    assert.ok(f8 > f4);
    assert.ok(f4 > f1);
    assert.ok(f1 > 0);
    assert.strictEqual(f0, 0);
  });

  test('computeSleepFadeFactor clamps fade window on short timers', () => {
    assert.strictEqual(getEffectiveSleepFadeWindow(8), 8);
    assert.strictEqual(computeSleepFadeFactor(8, 8), 1);
    const mid = computeSleepFadeFactor(4, 8);
    assert.ok(mid > 0 && mid < 0.5);
    assert.strictEqual(computeSleepFadeFactor(0, 8), 0);
  });

  test('computeEffectiveVoiceVolume scales SpeechSynthesis volume cleanly during fade-out', () => {
    assert.strictEqual(computeEffectiveVoiceVolume(0.8, 1.0), 0.8);
    const halfway = computeEffectiveVoiceVolume(0.8, 0.5);
    assert.strictEqual(halfway, 0.4);
    const nearEnd = computeEffectiveVoiceVolume(0.8, 0.01);
    assert.strictEqual(nearEnd, 0.04); // active floor prevents silent utterance before timer ends
    assert.strictEqual(computeEffectiveVoiceVolume(0.8, 0), 0);
    assert.strictEqual(computeEffectiveVoiceVolume(0, 0.5), 0);
  });

  test('AmbientMelodyGenerator attenuates gain via setFadeMultiplier and ramps to 0 on fadeOutAndStop', async () => {
    const env = createMockAudioContextEnvironment();
    const origWindow = (globalThis as Record<string, unknown>).window;
    (globalThis as Record<string, unknown>).window = {
      AudioContext: env.MockAudioContext,
    };

    try {
      const synth = new AmbientMelodyGenerator();
      synth.setVolume(0.4);
      synth.start('warm_pad');
      assert.strictEqual(synth.isActive(), true);
      assert.strictEqual(synth.getEffectiveVolume(), 0.4);

      synth.setFadeMultiplier(0.25, 1.0);
      assert.strictEqual(synth.getVolume(), 0.4); // configured volume stays untouched
      assert.strictEqual(synth.getEffectiveVolume(), 0.1);
      assert.ok(
        env.linearRamps.some((r) => Math.abs(r.value - 0.1) < 0.0001 && r.endTime === 11),
        'Master gain should ramp smoothly to 0.1 over 1.0s'
      );

      synth.fadeOutAndStop(180);
      assert.strictEqual(synth.isActive(), false);
      assert.ok(
        env.linearRamps.some((r) => r.value === 0),
        'fadeOutAndStop should ramp gain to 0'
      );

      await new Promise((resolve) => setTimeout(resolve, 420));
      assert.strictEqual(env.wasClosed(), true);
      assert.strictEqual(synth.getVolume(), 0.4);
      assert.strictEqual(synth.getEffectiveVolume(), 0.4); // reset multiplier after stopping
    } finally {
      if (origWindow === undefined) {
        delete (globalThis as Record<string, unknown>).window;
      } else {
        (globalThis as Record<string, unknown>).window = origWindow;
      }
    }
  });

  test('NatureSoundsSynthesizer attenuates gain via setFadeMultiplier and ramps to 0 before closing on fadeOutAndStop', async () => {
    const env = createMockAudioContextEnvironment();
    const origWindow = (globalThis as Record<string, unknown>).window;
    (globalThis as Record<string, unknown>).window = {
      AudioContext: env.MockAudioContext,
    };

    try {
      const nature = new NatureSoundsSynthesizer();
      nature.setVolume(0.5);
      nature.start('ocean');
      assert.strictEqual(nature.isPlaying(), true);
      assert.strictEqual(nature.getEffectiveVolume(), 0.5);

      nature.setFadeMultiplier(0.3, 1.0);
      assert.strictEqual(nature.getVolume(), 0.5);
      assert.strictEqual(nature.getEffectiveVolume(), 0.15);
      assert.ok(
        env.linearRamps.some((r) => Math.abs(r.value - 0.15) < 0.0001 && r.endTime === 11),
        'Nature master gain should ramp smoothly to 0.15 over 1.0s'
      );

      nature.fadeOutAndStop(180);
      assert.strictEqual(nature.isPlaying(), false);
      assert.strictEqual(env.wasClosed(), false, 'AudioContext should remain open while fade ramp finishes');
      assert.ok(
        env.linearRamps.some((r) => r.value === 0),
        'fadeOutAndStop should ramp nature gain to 0'
      );

      await new Promise((resolve) => setTimeout(resolve, 380));
      assert.strictEqual(env.wasClosed(), true);
      assert.strictEqual(nature.getVolume(), 0.5);
      assert.strictEqual(nature.getEffectiveVolume(), 0.5);
    } finally {
      if (origWindow === undefined) {
        delete (globalThis as Record<string, unknown>).window;
      } else {
        (globalThis as Record<string, unknown>).window = origWindow;
      }
    }
  });
});
