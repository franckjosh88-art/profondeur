export const TTS_TELEMETRY_EVENT = 'tts-speech-telemetry';

export type SpeechTelemetryPhase = 'start' | 'boundary' | 'pause' | 'resume' | 'fade' | 'end' | 'stop';

export interface SpeechTelemetryEventDetail {
  phase: SpeechTelemetryPhase;
  charIndex: number;
  charLength: number;
  textLength: number;
  word?: string;
  wordEnergy: number;
  progress: number;
  rate: number;
  volume: number;
  timestamp: number;
}

/**
 * Extracts the word currently being spoken by SpeechSynthesis from a character offset.
 */
export function extractBoundaryWord(text: string, charIndex: number, charLength?: number): string {
  if (!text || charIndex < 0 || charIndex >= text.length) {
    return '';
  }

  if (typeof charLength === 'number' && charLength > 0) {
    return text.slice(charIndex, charIndex + charLength).trim();
  }

  const tail = text.slice(charIndex);
  const match = tail.match(/^[\p{L}\p{N}'’-]+/u);
  return match ? match[0] : tail.slice(0, 1).trim();
}

/**
 * Derives acoustic energy (0.25 .. 1.0) from a spoken word's phonetic density and configured volume.
 */
export function computeWordSyllableEnergy(word: string, baseVolume: number = 1.0): number {
  const safeVol = Math.min(1, Math.max(0.1, baseVolume));
  const clean = (word || '').trim();
  if (!clean) {
    return Number((0.45 * safeVol).toFixed(3));
  }

  // Punctuation or very short particles get softer peaks; longer words with vowels produce richer vocal emphasis
  const vowelMatches = clean.match(/[aeiouyàâäéèêëîïôöùûüÿœæ]/gi);
  const vowelCount = vowelMatches ? vowelMatches.length : 0;
  const lengthScore = Math.min(1, clean.length / 8);
  const syllableScore = Math.min(1, vowelCount / 4);

  const rawEnergy = 0.42 + lengthScore * 0.3 + syllableScore * 0.28;
  const scaled = Math.min(1, Math.max(0.25, rawEnergy * (0.45 + 0.55 * safeVol)));
  return Number(scaled.toFixed(3));
}

/**
 * Dispatches SpeechSynthesis telemetry without triggering parent React re-renders.
 */
export function emitSpeechTelemetry(params: {
  phase: SpeechTelemetryPhase;
  text?: string;
  charIndex?: number;
  charLength?: number;
  rate?: number;
  volume?: number;
}): void {
  if (typeof window === 'undefined') return;

  const text = params.text || '';
  const charIndex = Math.max(0, params.charIndex ?? 0);
  const charLength = Math.max(0, params.charLength ?? 0);
  const textLength = text.length;
  const word = text ? extractBoundaryWord(text, charIndex, charLength || undefined) : '';
  const volume = typeof params.volume === 'number' ? params.volume : 1.0;
  const rate = typeof params.rate === 'number' ? params.rate : 1.0;
  const wordEnergy =
    params.phase === 'pause' || params.phase === 'stop' || params.phase === 'end'
      ? 0.2
      : computeWordSyllableEnergy(word, volume);
  const progress = textLength > 0 ? Math.min(1, charIndex / textLength) : 0;

  const detail: SpeechTelemetryEventDetail = {
    phase: params.phase,
    charIndex,
    charLength,
    textLength,
    word,
    wordEnergy,
    progress,
    rate,
    volume,
    timestamp: typeof performance !== 'undefined' ? performance.now() : Date.now(),
  };

  window.dispatchEvent(new CustomEvent<SpeechTelemetryEventDetail>(TTS_TELEMETRY_EVENT, { detail }));
}

export interface ComputeSoundwaveBarsParams {
  barCount: number;
  timeMs: number;
  isSpeaking: boolean;
  isPaused: boolean;
  wordEnergy: number;
  boundaryAgeMs: number;
  charIndex: number;
  rate: number;
  volume: number;
}

/**
 * Computes normalized vertical scales [0.16 .. 1.0] for harmonic bars using live SpeechSynthesis state.
 */
export function computeSoundwaveBars({
  barCount,
  timeMs,
  isSpeaking,
  isPaused,
  wordEnergy,
  boundaryAgeMs,
  charIndex,
  rate,
  volume,
}: ComputeSoundwaveBarsParams): number[] {
  const count = Math.max(1, barCount);

  if (!isSpeaking) {
    return Array.from({ length: count }, () => 0.16);
  }

  if (isPaused) {
    const center = (count - 1) / 2;
    return Array.from({ length: count }, (_, idx) => {
      const dist = center > 0 ? Math.abs(idx - center) / center : 0;
      return Number((0.28 - dist * 0.08).toFixed(3));
    });
  }

  const safeVol = Math.min(1, Math.max(0.15, volume));
  const safeRate = Math.min(2, Math.max(0.6, rate));

  // Boundary impulse decays organically over ~380ms after each spoken word event
  const clampedAge = Math.max(0, boundaryAgeMs);
  const boundaryImpulse = Math.exp(-clampedAge / 210);
  const cadenceFreq = 0.0085 * safeRate;
  const center = (count - 1) / 2;

  return Array.from({ length: count }, (_, idx) => {
    const normalizedDist = center > 0 ? Math.abs(idx - center) / center : 0;
    const bellEnvelope = 1 - normalizedDist * 0.42;

    // Seed harmonic phases per bar and active word character offset so every word produces a distinct contour
    const phaseA = timeMs * cadenceFreq + idx * 0.95 + (charIndex % 17) * 0.42;
    const phaseB = timeMs * cadenceFreq * 1.65 - idx * 0.65 + (charIndex % 11) * 0.57;

    const waveMix = 0.5 + 0.32 * Math.sin(phaseA) + 0.18 * Math.cos(phaseB);
    const activeDrive = 0.38 + wordEnergy * 0.34 + boundaryImpulse * wordEnergy * 0.48;
    const rawHeight = bellEnvelope * waveMix * activeDrive * (0.45 + 0.55 * safeVol);

    return Number(Math.min(1, Math.max(0.2, rawHeight)).toFixed(3));
  });
}
