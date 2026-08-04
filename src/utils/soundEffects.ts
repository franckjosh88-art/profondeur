import confetti from 'canvas-confetti';

/**
 * Web Audio API Sound Effects Engine
 * Generates pure, bell-like celestial chime tones for reading completion and accomplishments.
 */

export function playCompletionChime() {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;
    
    const ctx = new AudioCtxClass();

    // Sacred harmonic arpeggio: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.50Hz)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const startTime = ctx.currentTime;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Sine wave with a subtle secondary harmonic for a bell-like richness
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + index * 0.07);

      const noteStart = startTime + index * 0.07;
      const duration = 1.2 - index * 0.1;

      // Envelope setup
      gain.gain.setValueAtTime(0.0001, noteStart);
      // Fast attack
      gain.gain.exponentialRampToValueAtTime(0.22 - index * 0.03, noteStart + 0.025);
      // Natural exponential bell decay
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + duration + 0.05);
    });

    // Clean up AudioContext when done
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 2200);
  } catch (e) {
    console.warn("Could not play completion chime:", e);
  }
}

/**
 * Triggers a golden confetti spark explosion around a target button or screen center.
 */
export function triggerGoldenSparks(targetElement?: HTMLElement | null) {
  try {
    let origin = { x: 0.5, y: 0.7 };
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      origin = {
        x: Math.min(Math.max((rect.left + rect.width / 2) / window.innerWidth, 0.1), 0.9),
        y: Math.min(Math.max((rect.top + rect.height / 2) / window.innerHeight, 0.1), 0.9),
      };
    }

    const goldColors = ['#c9a84c', '#ffd700', '#f59e0b', '#e8e0d0', '#ffffff', '#10b981', '#34d399'];

    // Burst 1: Concentrated stars and circles
    confetti({
      origin,
      particleCount: 45,
      spread: 60,
      startVelocity: 35,
      ticks: 180,
      gravity: 0.8,
      scalar: 0.9,
      colors: goldColors,
      shapes: ['star', 'circle'],
      zIndex: 9999,
    });

    // Burst 2: Wider ambient sparkles
    setTimeout(() => {
      confetti({
        origin,
        particleCount: 30,
        spread: 100,
        startVelocity: 45,
        ticks: 220,
        gravity: 0.7,
        scalar: 1.1,
        colors: goldColors,
        shapes: ['circle', 'square'],
        zIndex: 9999,
      });
    }, 80);
  } catch (e) {
    console.warn("Could not trigger golden sparks:", e);
  }
}

