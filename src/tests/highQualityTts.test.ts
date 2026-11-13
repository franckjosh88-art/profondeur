import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSortedFrenchVoices,
  isNaturalOrNeuralVoice,
  resolveStrictFrenchVoice,
  verifyHighQualityAudioDiagnostic,
} from '../utils/frenchTts';

function makeMockVoice(
  name: string,
  lang: string = 'fr-FR',
  localService: boolean = false
): SpeechSynthesisVoice {
  return {
    name,
    lang,
    localService,
    voiceURI: `mock://${name.replace(/\s+/g, '_')}`,
    default: false,
  } as SpeechSynthesisVoice;
}

describe('High Quality TTS (Natural / Neural) Voice Filtering', () => {
  const mixedVoices: SpeechSynthesisVoice[] = [
    makeMockVoice('eSpeak French', 'fr-FR', true),
    makeMockVoice('Microsoft Hortense - French (France)', 'fr-FR', true),
    makeMockVoice('Google français', 'fr-FR', false),
    makeMockVoice('Microsoft Denise Online (Natural) - French (France)', 'fr-FR', false),
    makeMockVoice('fr-FR-HenriNeural', 'fr-FR', false),
    makeMockVoice('Microsoft Jenny Online (Natural) - English (United States)', 'en-US', false),
    makeMockVoice('Google US English Neural', 'en-US', false),
  ];

  test('isNaturalOrNeuralVoice detects only Natural or Neural voice names', () => {
    assert.strictEqual(
      isNaturalOrNeuralVoice(makeMockVoice('Microsoft Denise Online (Natural) - French (France)')),
      true
    );
    assert.strictEqual(
      isNaturalOrNeuralVoice(makeMockVoice('fr-FR-HenriNeural')),
      true
    );
    assert.strictEqual(isNaturalOrNeuralVoice(makeMockVoice('Google français')), false);
    assert.strictEqual(isNaturalOrNeuralVoice(makeMockVoice('Microsoft Hortense - French')), false);
    assert.strictEqual(isNaturalOrNeuralVoice(makeMockVoice('eSpeak French')), false);
  });

  test('getSortedFrenchVoices returns all French voices when highQualityOnly is false', () => {
    const result = getSortedFrenchVoices(mixedVoices, false);
    assert.strictEqual(result.length, 5);
    assert.ok(result.every((v) => v.lang.toLowerCase().startsWith('fr')));
    // Natural/Neural voices are ranked at the top, eSpeak at the bottom
    assert.ok(isNaturalOrNeuralVoice(result[0]));
    assert.strictEqual(result[result.length - 1].name, 'eSpeak French');
  });

  test('getSortedFrenchVoices filters strictly for Natural or Neural French voices when highQualityOnly is true', () => {
    const result = getSortedFrenchVoices(mixedVoices, true);
    assert.strictEqual(result.length, 2);
    assert.deepStrictEqual(
      result.map((v) => v.name).sort(),
      [
        'Microsoft Denise Online (Natural) - French (France)',
        'fr-FR-HenriNeural',
      ].sort()
    );
    // Foreign Natural/Neural voices must never leak in
    assert.ok(result.every((v) => v.lang.toLowerCase().startsWith('fr')));
  });

  test('getSortedFrenchVoices returns empty array when highQualityOnly is true and device has only standard French voices', () => {
    const standardOnlyVoices: SpeechSynthesisVoice[] = [
      makeMockVoice('eSpeak French', 'fr-FR', true),
      makeMockVoice('Microsoft Hortense - French (France)', 'fr-FR', true),
      makeMockVoice('Google français', 'fr-FR', false),
      makeMockVoice('Microsoft Jenny Online (Natural) - English (United States)', 'en-US', false),
    ];

    const result = getSortedFrenchVoices(standardOnlyVoices, true);
    assert.strictEqual(result.length, 0);
  });

  test('resolveStrictFrenchVoice reports highQualityMissing and returns warningMessage when no Natural/Neural voices exist', () => {
    const standardOnlyVoices: SpeechSynthesisVoice[] = [
      makeMockVoice('Google français', 'fr-FR', false),
      makeMockVoice('Microsoft Hortense - French (France)', 'fr-FR', true),
    ];

    const res = resolveStrictFrenchVoice({
      gender: 'auto',
      availableVoices: standardOnlyVoices,
      highQualityOnly: true,
      highQualityNoVoicesWarning: 'No Natural or Neural French voice detected.',
    });

    assert.strictEqual(res.highQualityMissing, true);
    assert.strictEqual(res.fallbackApplied, true);
    assert.strictEqual(res.warningMessage, 'No Natural or Neural French voice detected.');
    assert.ok(res.voice !== null);
  });

  test('resolveStrictFrenchVoice resolves matching Natural/Neural voice cleanly without warning when available', () => {
    const res = resolveStrictFrenchVoice({
      gender: 'female',
      availableVoices: mixedVoices,
      highQualityOnly: true,
      highQualityNoVoicesWarning: 'No Natural or Neural French voice detected.',
    });

    assert.strictEqual(res.highQualityMissing, false);
    assert.strictEqual(res.fallbackApplied, false);
    assert.strictEqual(res.warningMessage, null);
    assert.strictEqual(res.voice?.name, 'Microsoft Denise Online (Natural) - French (France)');
  });

  test('verifyHighQualityAudioDiagnostic logs count of Neural/Natural/Google voices and returns true when present', async () => {
    const logs: string[] = [];
    const hasHighQuality = await verifyHighQualityAudioDiagnostic({
      availableVoices: mixedVoices,
      highQualityAudioOnly: true,
      logger: (msg) => logs.push(msg),
    });

    assert.strictEqual(hasHighQuality, true);
    assert.strictEqual(logs.length, 1);
    // mixedVoices has 5 voices containing 'Neural', 'Natural', or 'Google'
    assert.ok(logs[0].includes('5'));
    assert.ok(logs[0].includes('French match count: 2'));
  });

  test('verifyHighQualityAudioDiagnostic logs 0 and returns false when no Neural/Natural/Google voices exist', async () => {
    const basicVoices: SpeechSynthesisVoice[] = [
      makeMockVoice('eSpeak French', 'fr-FR', true),
      makeMockVoice('Microsoft Hortense - French (France)', 'fr-FR', true),
    ];

    const logs: string[] = [];
    const hasHighQuality = await verifyHighQualityAudioDiagnostic({
      availableVoices: basicVoices,
      highQualityAudioOnly: true,
      logger: (msg) => logs.push(msg),
    });

    assert.strictEqual(hasHighQuality, false);
    assert.strictEqual(logs.length, 1);
    assert.ok(logs[0].includes('count: 0'));
  });
});
