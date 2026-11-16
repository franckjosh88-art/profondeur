import React, { useEffect, useRef } from 'react';
import {
  TTS_TELEMETRY_EVENT,
  SpeechTelemetryEventDetail,
  computeSoundwaveBars,
} from '../utils/speechWaveform';

interface SpeechSoundwaveProps {
  isSpeaking: boolean;
  isPaused: boolean;
  speechRate?: number;
  speechVolume?: number;
  barCount?: number;
}

const DEFAULT_BAR_COUNT = 9;

export const SpeechSoundwave: React.FC<SpeechSoundwaveProps> = ({
  isSpeaking,
  isPaused,
  speechRate = 1.0,
  speechVolume = 1.0,
  barCount = DEFAULT_BAR_COUNT,
}) => {
  const barRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const telemetryRef = useRef<{
    wordEnergy: number;
    charIndex: number;
    lastBoundaryTs: number;
    rate: number;
    volume: number;
  }>({
    wordEnergy: 0.65,
    charIndex: 0,
    lastBoundaryTs: 0,
    rate: speechRate,
    volume: speechVolume,
  });

  useEffect(() => {
    telemetryRef.current.rate = speechRate;
    telemetryRef.current.volume = speechVolume;
  }, [speechRate, speechVolume]);

  // Listen to live SpeechSynthesis boundary / start / pause / resume / end events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleTelemetry = (event: Event) => {
      const customEvent = event as CustomEvent<SpeechTelemetryEventDetail>;
      const detail = customEvent.detail;
      if (!detail) return;

      if (detail.phase === 'start' || detail.phase === 'boundary' || detail.phase === 'resume') {
        telemetryRef.current.wordEnergy = detail.wordEnergy;
        telemetryRef.current.charIndex = detail.charIndex;
        telemetryRef.current.lastBoundaryTs = detail.timestamp;
        if (detail.rate > 0) telemetryRef.current.rate = detail.rate;
        if (detail.volume >= 0) telemetryRef.current.volume = detail.volume;
      } else if (detail.phase === 'fade') {
        if (detail.volume >= 0) telemetryRef.current.volume = detail.volume;
        if (detail.rate > 0) telemetryRef.current.rate = detail.rate;
      }
    };

    window.addEventListener(TTS_TELEMETRY_EVENT, handleTelemetry);
    return () => {
      window.removeEventListener(TTS_TELEMETRY_EVENT, handleTelemetry);
    };
  }, []);

  // Animate acoustic bars via compositor-only scaleY transforms synced to SpeechSynthesis
  useEffect(() => {
    const applyBars = (heights: number[]) => {
      for (let i = 0; i < barCount; i++) {
        const el = barRefs.current[i];
        if (!el) continue;
        const scale = heights[i] ?? 0.2;
        el.style.transform = `scaleY(${scale})`;
        el.style.opacity = isSpeaking && !isPaused ? String(Math.min(1, 0.45 + scale * 0.55)) : '0.45';
      }
    };

    const reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isSpeaking || isPaused || reducedMotion) {
      const staticBars = computeSoundwaveBars({
        barCount,
        timeMs: 0,
        isSpeaking,
        isPaused: isPaused || reducedMotion,
        wordEnergy: telemetryRef.current.wordEnergy,
        boundaryAgeMs: 400,
        charIndex: telemetryRef.current.charIndex,
        rate: telemetryRef.current.rate,
        volume: telemetryRef.current.volume,
      });
      applyBars(staticBars);
      return;
    }

    let rafId = 0;

    const tick = (now: number) => {
      const state = telemetryRef.current;
      const boundaryAgeMs = state.lastBoundaryTs > 0 ? Math.max(0, now - state.lastBoundaryTs) : 250;
      const bars = computeSoundwaveBars({
        barCount,
        timeMs: now,
        isSpeaking: true,
        isPaused: false,
        wordEnergy: state.wordEnergy,
        boundaryAgeMs,
        charIndex: state.charIndex,
        rate: state.rate,
        volume: state.volume,
      });
      applyBars(bars);
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [isSpeaking, isPaused, barCount]);

  return (
    <div
      aria-hidden="true"
      data-testid="speech-soundwave"
      data-state={!isSpeaking ? 'idle' : isPaused ? 'paused' : 'playing'}
      className={`pointer-events-none flex items-center justify-center gap-[3px] h-3 transition-all duration-200 select-none ${
        isSpeaking ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
      }`}
    >
      {Array.from({ length: barCount }).map((_, idx) => (
        <span
          key={idx}
          ref={(el) => {
            barRefs.current[idx] = el;
          }}
          className="w-[2.5px] h-3 rounded-full origin-center will-change-transform"
          style={{
            backgroundColor: 'var(--r-accent)',
            transform: 'scaleY(0.18)',
          }}
        />
      ))}
    </div>
  );
};
