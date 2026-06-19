// High-fidelity Ambient Melodic Generator for Scripture Meditation
// Achieved via Web Audio API oscillators and filters to guarantee offline performance with zero dependencies

export type MelodyStyle = 'warm_pad' | 'celestial_air' | 'deep_peace';

export interface MelodyStyleOption {
  id: MelodyStyle;
  name: string;
  description: string;
  icon: string;
}

export const MELODY_STYLES: MelodyStyleOption[] = [
  {
    id: 'warm_pad',
    name: 'Temple Lumineux',
    description: 'Nappes d\'orgues chaleureuses, douces et réconfortantes',
    icon: '✨'
  },
  {
    id: 'celestial_air',
    name: 'Brise Céleste',
    description: 'Chp de harpe scintillant, léger et aérien',
    icon: '🌬️'
  },
  {
    id: 'deep_peace',
    name: 'Paix Intérieure',
    description: 'Méditation profonde, ondes de résonance graves et apaisantes',
    icon: '🧘'
  }
];

class AmbientMelodyGenerator {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private activeOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
  private chordInterval: any = null;
  private pluckInterval: any = null;
  private currentChordIndex = 0;
  private currentVolume = 0.15; // default volume level (0.0 to 1.0)
  private isMelodyActive = false;
  private currentStyle: MelodyStyle = 'warm_pad';

  // 1. Warm Pad: Temple Lumineux (Cmaj9, Am9, Fmaj9, Gadd9)
  private warmPadChords = [
    [130.81, 196.00, 246.94, 293.66, 329.63], // Cmaj9
    [110.00, 164.81, 196.00, 261.63, 493.88], // Am9
    [87.31, 130.81, 220.00, 329.63, 392.00],  // Fmaj9
    [98.00, 146.83, 246.94, 440.00, 587.33]   // Gadd9
  ];

  // 2. Celestial Air: Brise Céleste (Asus2, G6, Cmaj7, Dadd9) - elevated frequency and airy flow
  private celestialAirChords = [
    [220.00, 329.63, 440.00, 587.33, 659.25], // Asus2
    [196.00, 293.66, 392.00, 493.88, 587.33], // G6
    [261.63, 329.63, 392.00, 523.25, 659.25], // Cmaj7
    [293.66, 369.99, 440.00, 587.33, 739.99]  // Dadd9
  ];

  // 3. Deep Peace: Paix Intérieure (Amadd9, Fmaj7, Cmaj7, Em9) - rich, deep lower frequencies
  private deepPeaceChords = [
    [110.00, 164.81, 220.00, 293.66, 329.63],  // Amadd9
    [87.31, 130.81, 174.61, 261.63, 329.63],   // Fmaj7
    [130.81, 196.00, 261.63, 329.63, 392.00],  // Cmaj7
    [82.41, 146.83, 164.81, 246.94, 329.63]    // Em9
  ];

  constructor() {
    // Lazy instantiation of audio context is handled in start()
  }

  private getCurrentChords() {
    switch (this.currentStyle) {
      case 'celestial_air':
        return this.celestialAirChords;
      case 'deep_peace':
        return this.deepPeaceChords;
      case 'warm_pad':
      default:
        return this.warmPadChords;
    }
  }

  public setStyle(style: MelodyStyle) {
    this.currentStyle = style;
    if (this.isMelodyActive) {
      this.rebootLoop();
    }
  }

  public getStyle(): MelodyStyle {
    return this.currentStyle;
  }

  // Soft transition to another chord layout/style smoothly
  private rebootLoop() {
    if (!this.audioCtx) return;
    this.nextChordTransition();

    if (this.chordInterval) {
      clearInterval(this.chordInterval);
    }
    if (this.pluckInterval) {
      clearTimeout(this.pluckInterval);
    }

    const intervalTime = this.currentStyle === 'deep_peace' ? 8500 : (this.currentStyle === 'celestial_air' ? 7000 : 6000);
    this.chordInterval = setInterval(() => {
      this.nextChordTransition();
    }, intervalTime);

    this.scheduleHarpPluck();
  }

  public start(style?: MelodyStyle) {
    if (style) {
      this.currentStyle = style;
    }
    
    if (this.isMelodyActive) {
      this.rebootLoop();
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.audioCtx.currentTime);

      // Lowpass filter frequency adapts according to the preset vibe
      const filterFreq = this.currentStyle === 'deep_peace' ? 320 : (this.currentStyle === 'celestial_air' ? 650 : 450);

      this.filterNode = this.audioCtx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(filterFreq, this.audioCtx.currentTime);
      this.filterNode.Q.setValueAtTime(1.0, this.audioCtx.currentTime);

      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(this.audioCtx.destination);

      this.isMelodyActive = true;
      this.currentChordIndex = 0;

      this.playCurrentChord();

      const intervalTime = this.currentStyle === 'deep_peace' ? 8500 : (this.currentStyle === 'celestial_air' ? 7000 : 6000);
      this.chordInterval = setInterval(() => {
        this.nextChordTransition();
      }, intervalTime);

      this.scheduleHarpPluck();
    } catch (err) {
      console.error("Failed to start Ambient Scripture Melody:", err);
    }
  }

  private playCurrentChord() {
    if (!this.audioCtx || !this.filterNode) return;

    const chords = this.getCurrentChords();
    const freqs = chords[this.currentChordIndex];
    const now = this.audioCtx.currentTime;

    // Create a slow pad of multiple synth voice layers
    freqs.forEach((freq, index) => {
      if (!this.audioCtx || !this.filterNode) return;

      const osc = this.audioCtx.createOscillator();
      const voiceGain = this.audioCtx.createGain();

      // Form oscillator shapes according to style to create custom timbres
      if (this.currentStyle === 'deep_peace') {
        osc.type = 'triangle'; // low rich organ tones
      } else if (this.currentStyle === 'celestial_air') {
        osc.type = 'sine'; // super pure breathy tone
      } else {
        osc.type = index % 2 === 0 ? 'sine' : 'triangle'; // standard warm mix
      }

      osc.frequency.setValueAtTime(freq, now);

      voiceGain.gain.setValueAtTime(0, now);
      
      // In deep peace style, let the attack be even slower and warmer
      const attackTime = this.currentStyle === 'deep_peace' ? 3.0 : 2.2;
      voiceGain.gain.linearRampToValueAtTime(0.06, now + attackTime);

      osc.connect(voiceGain);
      voiceGain.connect(this.filterNode);
      osc.start(now);

      this.activeOscillators.push({ osc, gain: voiceGain });
    });
  }

  private nextChordTransition() {
    if (!this.audioCtx || !this.isMelodyActive) return;

    const now = this.audioCtx.currentTime;
    const oldOscillators = [...this.activeOscillators];
    this.activeOscillators = [];

    // Ethereal slow crossfade releases
    const releaseTime = this.currentStyle === 'deep_peace' ? 3.2 : 2.5;

    oldOscillators.forEach(({ osc, gain }) => {
      try {
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + releaseTime);
        
        setTimeout(() => {
          try {
            osc.stop();
            osc.disconnect();
            gain.disconnect();
          } catch (_) {}
        }, (releaseTime + 0.5) * 1000);
      } catch (_) {}
    });

    const chords = this.getCurrentChords();
    this.currentChordIndex = (this.currentChordIndex + 1) % chords.length;
    
    this.playCurrentChord();
  }

  private scheduleHarpPluck() {
    const triggerNextPluck = () => {
      if (!this.isMelodyActive) return;

      // Base timing changes depending on style
      const baseDelay = this.currentStyle === 'deep_peace' ? 3000 : (this.currentStyle === 'celestial_air' ? 1200 : 1500);
      const varDelay = this.currentStyle === 'deep_peace' ? 2000 : (this.currentStyle === 'celestial_air' ? 1500 : 2000);

      const delay = baseDelay + Math.random() * varDelay;
      this.pluckInterval = setTimeout(() => {
        this.pluckHarpNote();
        triggerNextPluck();
      }, delay);
    };

    triggerNextPluck();
  }

  private pluckHarpNote() {
    if (!this.audioCtx || !this.masterGain || !this.isMelodyActive) return;

    const chords = this.getCurrentChords();
    const currentChordFreqs = chords[this.currentChordIndex];
    if (!currentChordFreqs) return;

    const baseFreq = currentChordFreqs[Math.floor(Math.random() * currentChordFreqs.length)];
    
    // Pitch shift multiplier for plucking
    // Celestial Air sparkles very high (3x), Warm Pad (2x), Deep Peace stays warmer (1.5x)
    let pitchMultiplier = 2.0;
    if (this.currentStyle === 'celestial_air') {
      pitchMultiplier = Math.random() > 0.4 ? 3.0 : 2.0;
    } else if (this.currentStyle === 'deep_peace') {
      pitchMultiplier = 1.5;
    }

    const harpFreq = baseFreq * pitchMultiplier;
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const harpGain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(harpFreq, now);

    // Ethereal bell pluck velocity
    harpGain.gain.setValueAtTime(0, now);
    const pluckAttack = 0.04;
    harpGain.gain.linearRampToValueAtTime(0.04, now + pluckAttack);
    
    const decayDuration = this.currentStyle === 'deep_peace' ? 2.5 : 1.8;
    harpGain.gain.exponentialRampToValueAtTime(0.0001, now + decayDuration);

    const harpFilter = this.audioCtx.createBiquadFilter();
    harpFilter.type = 'lowpass';
    
    // Higher high-cut in celestial air for crystal bell shines
    const pluckCutoff = this.currentStyle === 'celestial_air' ? 2200 : 1500;
    harpFilter.frequency.setValueAtTime(pluckCutoff, now);

    osc.connect(harpGain);
    harpGain.connect(harpFilter);
    harpFilter.connect(this.masterGain);

    osc.start(now);
    
    setTimeout(() => {
      try {
        osc.stop();
        osc.disconnect();
        harpGain.disconnect();
        harpFilter.disconnect();
      } catch (_) {}
    }, (decayDuration + 0.5) * 1000);
  }

  public stop() {
    this.isMelodyActive = false;

    if (this.chordInterval) {
      clearInterval(this.chordInterval);
      this.chordInterval = null;
    }
    if (this.pluckInterval) {
      clearTimeout(this.pluckInterval);
      this.pluckInterval = null;
    }

    const now = this.audioCtx ? this.audioCtx.currentTime : 0;

    this.activeOscillators.forEach(({ osc, gain }) => {
      try {
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + 1.2);
        setTimeout(() => {
          try {
            osc.stop();
            osc.disconnect();
            gain.disconnect();
          } catch (_) {}
        }, 1500);
      } catch (_) {
        try {
          osc.stop();
        } catch (__) {}
      }
    });

    this.activeOscillators = [];

    if (this.masterGain && this.audioCtx) {
      try {
        this.masterGain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 1.0);
      } catch (_) {}
    }

    setTimeout(() => {
      if (this.audioCtx && !this.isMelodyActive) {
        try {
          this.audioCtx.close();
        } catch (_) {}
        this.audioCtx = null;
        this.masterGain = null;
        this.filterNode = null;
      }
    }, 1200);
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.audioCtx) {
      try {
        this.masterGain.gain.linearRampToValueAtTime(this.currentVolume, this.audioCtx.currentTime + 0.2);
      } catch (_) {}
    }
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public isActive(): boolean {
    return this.isMelodyActive;
  }

  public triggerTransitPluck() {
    if (this.isMelodyActive) {
      try {
        this.pluckHarpNote();
      } catch (_) {}
    }
  }
}

export const ambientMelody = new AmbientMelodyGenerator();
