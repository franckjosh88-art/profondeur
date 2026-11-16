export const DEFAULT_SLEEP_FADE_WINDOW_SECONDS = 15;

/**
 * Returns the effective fade-out window in seconds, clamped cleanly when a short
 * timer duration is used.
 */
export function getEffectiveSleepFadeWindow(
  totalSeconds: number,
  fadeWindowSeconds: number = DEFAULT_SLEEP_FADE_WINDOW_SECONDS
): number {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return 0;
  }
  const safeWindow = Math.max(1, fadeWindowSeconds);
  return Math.min(safeWindow, Math.max(1, totalSeconds));
}

/**
 * Returns true when the countdown has entered the automatic sleep fade-out window.
 */
export function isInSleepFadeWindow(
  remainingSeconds: number,
  totalSeconds: number,
  fadeWindowSeconds: number = DEFAULT_SLEEP_FADE_WINDOW_SECONDS
): boolean {
  if (!Number.isFinite(remainingSeconds) || remainingSeconds <= 0 || totalSeconds <= 0) {
    return false;
  }
  const effectiveWindow = getEffectiveSleepFadeWindow(totalSeconds, fadeWindowSeconds);
  return remainingSeconds <= effectiveWindow;
}

/**
 * Computes a smooth perceptual fade multiplier in [0, 1] as remainingSeconds
 * approaches 0. Uses a 1.5-power taper so volume descends gently to silence
 * without a sudden drop at the start or an abrupt cutoff at the end.
 */
export function computeSleepFadeFactor(
  remainingSeconds: number,
  totalSeconds: number,
  fadeWindowSeconds: number = DEFAULT_SLEEP_FADE_WINDOW_SECONDS
): number {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return 0;
  }
  if (!Number.isFinite(remainingSeconds) || remainingSeconds <= 0) {
    return 0;
  }

  const effectiveWindow = getEffectiveSleepFadeWindow(totalSeconds, fadeWindowSeconds);
  if (remainingSeconds >= effectiveWindow) {
    return 1;
  }

  const progress = Math.max(0, Math.min(1, remainingSeconds / effectiveWindow));
  const perceptual = Math.pow(progress, 1.5);
  return Number(Math.max(0, Math.min(1, perceptual)).toFixed(4));
}

/**
 * Applies the sleep fade multiplier to a configured SpeechSynthesis voice volume
 * while keeping active utterances audible until timer expiration.
 */
export function computeEffectiveVoiceVolume(
  baseVolume: number,
  fadeFactor: number,
  minActiveFloor: number = 0.04
): number {
  const safeBase = Number.isFinite(baseVolume) ? Math.max(0, Math.min(1, baseVolume)) : 1.0;
  const safeFade = Number.isFinite(fadeFactor) ? Math.max(0, Math.min(1, fadeFactor)) : 1.0;

  if (safeBase === 0 || safeFade <= 0) {
    return 0;
  }

  const scaled = safeBase * safeFade;
  if (safeFade < 1) {
    return Number(Math.min(safeBase, Math.max(minActiveFloor, scaled)).toFixed(4));
  }
  return Number(scaled.toFixed(4));
}
