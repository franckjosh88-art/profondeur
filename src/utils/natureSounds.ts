// Native iPhone-style Nature Sound Synthesizer using Web Audio API
// High-fidelity, zero-dependency, works completely offline & inside iframes
// Provides realistic ambient background textures (Rain, Ocean, Stream, Wind, Forest with bird chirps)

export type NatureSoundType = 'none' | 'rain' | 'ocean' | 'stream' | 'wind' | 'forest';

export interface NatureSoundOption {
  id: NatureSoundType;
  name: string;
  description: string;
  icon: string;
}

export const NATURE_SOUNDS: NatureSoundOption[] = [
  {
    id: 'none',
    name: 'Aucun',
    description: 'Pas de bruit de fond de la nature',
    icon: '🔇'
  },
  {
    id: 'rain',
    name: 'Pluie Sous L\'Orage',
    description: 'Averse douce et crépitement de gouttes sur les feuilles',
    icon: '🌧️'
  },
  {
    id: 'ocean',
    name: 'Vagues de l\'Océan',
    description: 'Flot apaisant des marées montantes et descendantes',
    icon: '🌊'
  },
  {
    id: 'stream',
    name: 'Ruisseau Paisible',
    description: 'Cours d\'eau de montagne murmurant et bulles cristallines',
    icon: '💧'
  },
  {
    id: 'wind',
    name: 'Souffle du Vent',
    description: 'Brise de montagne dans les grands pins',
    icon: '🌬️'
  },
  {
    id: 'forest',
    name: 'Forêt Spirituelle',
    description: 'Bruissement de feuilles et chants d\'oiseaux sauvages',
    icon: '🌳'
  }
];

class NatureSoundsSynthesizer {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentType: NatureSoundType = 'none';
  private currentVolume = 0.15; // 0.0 to 1.0
  private isActive = false;

  // Active audio nodes to cleanup on stop
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private lfoNode: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  
  // Schedulers and intervals
  private dropTimeout: any = null;
  private birdTimeout: any = null;

  constructor() {
    // Lazy loaded in start()
  }

  // Pink noise generator (Paul Kellet's refined method)
  private getPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;

    const bufferSize = 4 * ctx.sampleRate; // 4 seconds of unique noise
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.11;
      output[i] *= 0.28; // scale to a richer, fully audible amplitude
      b6 = white * 0.115926;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }

  public start(type: NatureSoundType) {
    this.currentType = type;
    
    if (type === 'none') {
      this.stop();
      return;
    }

    this.stopAudioGraph(); // stop any running nodes first

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      } else if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.currentVolume, ctx.currentTime);
      this.masterGain.connect(ctx.destination);

      this.isActive = true;

      // Start the specific sound generation graph
      switch (type) {
        case 'rain':
          this.buildRainGraph(ctx);
          break;
        case 'ocean':
          this.buildOceanGraph(ctx);
          break;
        case 'stream':
          this.buildStreamGraph(ctx);
          break;
        case 'wind':
          this.buildWindGraph(ctx);
          break;
        case 'forest':
          this.buildForestGraph(ctx);
          break;
        default:
          break;
      }
    } catch (e) {
      console.error("Failed to start Nature Sound Synthesizer:", e);
    }
  }

  // --- 1. RAIN SYNTHESIS ---
  private buildRainGraph(ctx: AudioContext) {
    if (!this.masterGain) return;

    // Pink noise is the core of rain
    const noise = ctx.createBufferSource();
    noise.buffer = this.getPinkNoiseBuffer(ctx);
    noise.loop = true;

    // Filter rain to sound soft and dark
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, ctx.currentTime);

    noise.connect(filter);
    filter.connect(this.masterGain);
    noise.start(0);

    this.noiseSource = noise;
    this.filterNode = filter;

    // Add random droplets falling crépitement
    const triggerRainDrop = () => {
      if (!this.isActive || this.currentType !== 'rain') return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const dropGain = ctx.createGain();

      osc.type = 'sine';
      // High-pitched tiny splash sound
      const baseFreq = 2200 + Math.random() * 1500;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.03);

      dropGain.gain.setValueAtTime(0, now);
      // Soft randomized volume
      dropGain.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.04, now + 0.002);
      dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc.connect(dropGain);
      if (this.masterGain) {
        dropGain.connect(this.masterGain);
      }

      osc.start(now);
      setTimeout(() => {
        try {
          osc.stop();
          osc.disconnect();
          dropGain.disconnect();
        } catch (_) {}
      }, 100);

      const nextDropDelay = 35 + Math.random() * 95; // fast crackles
      this.dropTimeout = setTimeout(triggerRainDrop, nextDropDelay);
    };

    triggerRainDrop();
  }

  // --- 2. OCEAN WAVES SYNTHESIS ---
  private buildOceanGraph(ctx: AudioContext) {
    if (!this.masterGain) return;

    const noise = ctx.createBufferSource();
    noise.buffer = this.getPinkNoiseBuffer(ctx);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, ctx.currentTime); // start darker

    // Wave Gain Node to automate swell/recede
    const waveGain = ctx.createGain();
    waveGain.gain.setValueAtTime(0.65, ctx.currentTime);

    noise.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(this.masterGain);
    noise.start(0);

    this.noiseSource = noise;
    this.filterNode = filter;

    // Create slow LFO (low-frequency oscillator) to modulate waves automatically
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.08, ctx.currentTime); // ~12.5 seconds per wave cycle

    const lfoGainNode = ctx.createGain();
    lfoGainNode.gain.setValueAtTime(0.45, ctx.currentTime); // volume range modifier

    // Modulate filter frequency (waves get brighter as they hit/crash)
    const filterMod = ctx.createGain();
    filterMod.gain.setValueAtTime(250, ctx.currentTime); // modulate up to 600Hz

    lfo.connect(lfoGainNode);
    // Connect to wave volume
    lfoGainNode.connect(waveGain.gain);

    lfo.connect(filterMod);
    filterMod.connect(filter.frequency);

    lfo.start(0);

    this.lfoNode = lfo;
    this.lfoGain = lfoGainNode;
  }

  // --- 3. STREAM (RUISSEAU) SYNTHESIS ---
  private buildStreamGraph(ctx: AudioContext) {
    if (!this.masterGain) return;

    const noise = ctx.createBufferSource();
    noise.buffer = this.getPinkNoiseBuffer(ctx);
    noise.loop = true;

    // Bandpass gives that organic water flow hollow sound
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(750, ctx.currentTime);
    filter.Q.setValueAtTime(1.2, ctx.currentTime);

    // Fast minor LFO for bubbling shimmer
    const bubbleLfo = ctx.createOscillator();
    bubbleLfo.type = 'sine';
    bubbleLfo.frequency.setValueAtTime(3.8, ctx.currentTime); // 3.8Hz bubble rate

    const bubbleGain = ctx.createGain();
    bubbleGain.gain.setValueAtTime(0.22, ctx.currentTime);

    const streamGain = ctx.createGain();
    streamGain.gain.setValueAtTime(0.85, ctx.currentTime);

    noise.connect(filter);
    filter.connect(streamGain);
    streamGain.connect(this.masterGain);
    noise.start(0);

    bubbleLfo.connect(bubbleGain);
    bubbleGain.connect(streamGain.gain);
    bubbleLfo.start(0);

    this.noiseSource = noise;
    this.filterNode = filter;
    this.lfoNode = bubbleLfo;
    this.lfoGain = bubbleGain;

    // Add crystalline water plucks for gurgling streams
    const triggerBubblePluck = () => {
      if (!this.isActive || this.currentType !== 'stream') return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const pluckGain = ctx.createGain();

      osc.type = 'sine';
      const f = 850 + Math.random() * 900;
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.5, now + 0.06); // upward swoop for bubbles!

      pluckGain.gain.setValueAtTime(0, now);
      pluckGain.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.04, now + 0.01);
      pluckGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

      osc.connect(pluckGain);
      if (this.masterGain) {
        pluckGain.connect(this.masterGain);
      }

      osc.start(now);
      setTimeout(() => {
        try {
          osc.stop();
          osc.disconnect();
          pluckGain.disconnect();
        } catch (_) {}
      }, 150);

      const nextPluck = 60 + Math.random() * 180;
      this.dropTimeout = setTimeout(triggerBubblePluck, nextPluck);
    };

    triggerBubblePluck();
  }

  // --- 4. WIND SYNTHESIS ---
  private buildWindGraph(ctx: AudioContext) {
    if (!this.masterGain) return;

    const noise = ctx.createBufferSource();
    noise.buffer = this.getPinkNoiseBuffer(ctx);
    noise.loop = true;

    // High Q bandpass gives that whistle / wind blow
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(380, ctx.currentTime);
    filter.Q.setValueAtTime(3.2, ctx.currentTime);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(1.0, ctx.currentTime);

    noise.connect(filter);
    filter.connect(windGain);
    windGain.connect(this.masterGain);
    noise.start(0);

    this.noiseSource = noise;
    this.filterNode = filter;

    // Slow wind gusts modulator LFO
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.14, ctx.currentTime); // ~7 seconds cycles

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(220, ctx.currentTime); // sweep range in Hz

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(0);

    this.lfoNode = lfo;
    this.lfoGain = lfoGain;
  }

  // --- 5. FOREST & BIRDS SYNTHESIS ---
  private buildForestGraph(ctx: AudioContext) {
    if (!this.masterGain) return;

    // Base background leaf rustle (pink noise deeply lowpassed)
    const noise = ctx.createBufferSource();
    noise.buffer = this.getPinkNoiseBuffer(ctx);
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, ctx.currentTime);

    const forestGain = ctx.createGain();
    forestGain.gain.setValueAtTime(0.65, ctx.currentTime);

    noise.connect(filter);
    filter.connect(forestGain);
    forestGain.connect(this.masterGain);
    noise.start(0);

    this.noiseSource = noise;
    this.filterNode = filter;

    // Chirping birds scheduler
    const triggerBirdCall = () => {
      if (!this.isActive || this.currentType !== 'forest') return;

      const now = ctx.currentTime;
      const type = Math.floor(Math.random() * 3); // 3 types of bird calls

      if (type === 0) {
        // High rapid chirps (3 rapid notes)
        let delay = 0;
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          const startFreq = 2600 + Math.random() * 400;
          osc.frequency.setValueAtTime(startFreq, now + delay);
          osc.frequency.exponentialRampToValueAtTime(startFreq + 600, now + delay + 0.08);

          gain.gain.setValueAtTime(0, now + delay);
          gain.gain.linearRampToValueAtTime(0.045, now + delay + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.08);

          osc.connect(gain);
          if (this.masterGain) gain.connect(this.masterGain);

          osc.start(now + delay);
          osc.stop(now + delay + 0.09);

          delay += 0.12;
        }
      } else if (type === 1) {
        // Double sweet sweep
        let delay = 0;
        for (let i = 0; i < 2; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          const f = 1900 + Math.random() * 200;
          osc.frequency.setValueAtTime(f, now + delay);
          osc.frequency.exponentialRampToValueAtTime(f - 500, now + delay + 0.14);

          gain.gain.setValueAtTime(0, now + delay);
          gain.gain.linearRampToValueAtTime(0.055, now + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.14);

          osc.connect(gain);
          if (this.masterGain) gain.connect(this.masterGain);

          osc.start(now + delay);
          osc.stop(now + delay + 0.15);

          delay += 0.25;
        }
      } else {
        // Long vibrato whistle
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const vibrato = ctx.createOscillator();
        const vibratoGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(2200, now);

        vibrato.frequency.setValueAtTime(14, now); // 14Hz vibrato
        vibratoGain.gain.setValueAtTime(150, now); // depth 150Hz

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.048, now + 0.05);
        gain.gain.setValueAtTime(0.008, now + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        osc.connect(gain);
        if (this.masterGain) gain.connect(this.masterGain);

        vibrato.start(now);
        osc.start(now);

        vibrato.stop(now + 0.46);
        osc.stop(now + 0.46);
      }

      // Schedule next bird chirp between 3 and 7.5 seconds
      const nextCall = 3000 + Math.random() * 4500;
      this.birdTimeout = setTimeout(triggerBirdCall, nextCall);
    };

    // Delay first bird chirp slightly so it isn't immediate
    this.birdTimeout = setTimeout(triggerBirdCall, 1800);
  }

  // Stop running scheduled items
  private stopAudioGraph() {
    if (this.dropTimeout) {
      clearTimeout(this.dropTimeout);
      this.dropTimeout = null;
    }
    if (this.birdTimeout) {
      clearTimeout(this.birdTimeout);
      this.birdTimeout = null;
    }

    try {
      if (this.noiseSource) {
        this.noiseSource.stop();
        this.noiseSource.disconnect();
        this.noiseSource = null;
      }
      if (this.filterNode) {
        this.filterNode.disconnect();
        this.filterNode = null;
      }
      if (this.lfoNode) {
        this.lfoNode.stop();
        this.lfoNode.disconnect();
        this.lfoNode = null;
      }
      if (this.lfoGain) {
        this.lfoGain.disconnect();
        this.lfoGain = null;
      }
    } catch (_) {}
  }

  public stop() {
    this.isActive = false;
    this.stopAudioGraph();

    if (this.masterGain && this.audioCtx) {
      try {
        this.masterGain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.8);
      } catch (_) {}
    }

    setTimeout(() => {
      if (this.audioCtx && !this.isActive) {
        try {
          this.audioCtx.close();
        } catch (_) {}
        this.audioCtx = null;
        this.masterGain = null;
      }
    }, 900);
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.audioCtx) {
      try {
        this.masterGain.gain.linearRampToValueAtTime(this.currentVolume, this.audioCtx.currentTime + 0.25);
      } catch (_) {}
    }
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public getType(): NatureSoundType {
    return this.currentType;
  }
}

export const natureSounds = new NatureSoundsSynthesizer();
