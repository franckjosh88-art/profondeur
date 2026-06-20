// Scripture Audio Enhancement & Sound Purifier Pipeline
// Integrates an inline AudioWorklet (Noise Gate + Gain Normalization) with a Biquad EQ & Dynamics Compressor fallback
// Designed to eliminate digital background artifacts ('debruil') and provide clean, warm, crystal-clear playback.

const deNoiseWorkletCode = `
class DeNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.noiseThreshold = 0.003; // Squelch noise gate threshold for digital floor hums
    this.masterGain = 1.25; // Balanced crystal vocal normalization multiplier
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || input.length === 0) return true;

    for (let channel = 0; channel < input.length; ++channel) {
      const inputChannel = input[channel];
      // Fallback in case output channel is missing
      const outputChannel = output[channel] || output[0];
      if (!inputChannel || !outputChannel) continue;

      for (let i = 0; i < inputChannel.length; ++i) {
        let sample = inputChannel[i];
        
        // 1. Squelch noise gate (removes low-volume digital hums & white-noise "debruil")
        if (Math.abs(sample) < this.noiseThreshold) {
          // Soft knee gating
          sample = sample * 0.1;
        }
        
        // 2. Crystal gain normalization & peak limiter
        let outputSample = sample * this.masterGain;
        if (outputSample > 0.99) outputSample = 0.99;
        if (outputSample < -0.99) outputSample = -0.99;

        outputChannel[i] = outputSample;
      }
    }
    return true;
  }
}

registerProcessor('denoise-processor', DeNoiseProcessor);
`;

export class ScriptureAudioPurifier {
  private audioCtx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private lowPassFilter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private outputGainNode: GainNode | null = null;
  private isInitialized = false;

  constructor() {}

  /**
   * Initializes the AudioContext, registers the AudioWorklet and configures the hardware filters.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        console.warn("Web Audio API not supported in this browser.");
        return;
      }

      this.audioCtx = new AudioCtxClass();
      const now = this.audioCtx.currentTime;

      // 1. Create a Biquad Highpass Filter to cut off low-end background rumble and microphone hum (< 80Hz)
      this.highPassFilter = this.audioCtx.createBiquadFilter();
      this.highPassFilter.type = 'highpass';
      this.highPassFilter.frequency.setValueAtTime(80, now);

      // 2. Create a Biquad Lowpass Filter to cut off high-frequency digital aliasing or static sizzles (> 7500Hz)
      this.lowPassFilter = this.audioCtx.createBiquadFilter();
      this.lowPassFilter.type = 'lowpass';
      this.lowPassFilter.frequency.setValueAtTime(7500, now);

      // 3. Create a Dynamics Compressor for master gain normalization (compresses high peaks, boosts silent phrases)
      this.compressor = this.audioCtx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-18, now); // start compressing above -18dB
      this.compressor.knee.setValueAtTime(10, now);       // smooth transition knee
      this.compressor.ratio.setValueAtTime(3.5, now);     // solid compression ratio for voice
      this.compressor.attack.setValueAtTime(0.015, now);  // fast voice response
      this.compressor.release.setValueAtTime(0.18, now);  // natural decay release

      // 4. Output gain control
      this.outputGainNode = this.audioCtx.createGain();
      this.outputGainNode.gain.setValueAtTime(1.1, now);

      // Connect standard baseline chain
      // Source -> HighPass -> LowPass -> Compressor -> OutputGain -> Destination
      this.highPassFilter.connect(this.lowPassFilter);
      this.lowPassFilter.connect(this.compressor);
      this.compressor.connect(this.outputGainNode);
      this.outputGainNode.connect(this.audioCtx.destination);

      // 5. Try to load the AudioWorklet dynamically via blob (prevents external network blocking in sandbox)
      if (this.audioCtx.audioWorklet) {
        try {
          const blob = new Blob([deNoiseWorkletCode], { type: 'application/javascript' });
          const workletUrl = URL.createObjectURL(blob);
          await this.audioCtx.audioWorklet.addModule(workletUrl);
          
          // Instantiate Worklet
          this.workletNode = new AudioWorkletNode(this.audioCtx, 'denoise-processor');
          
          // Re-route the chain to insert the Worklet processor:
          // Source -> WorkletNode -> HighPass -> LowPass -> Compressor -> OutputGain -> Destination
          this.workletNode.connect(this.highPassFilter);
          console.log("Scripture Sound Purifier: AudioWorklet successfully loaded and active.");
        } catch (workletErr) {
          console.warn("AudioWorklet failed to load, falling back to pure Biquad filter + Compressor pipeline:", workletErr);
        }
      }

      this.isInitialized = true;
    } catch (e) {
      console.error("Failed to initialize Scripture Audio Purifier:", e);
    }
  }

  /**
   * Triggers a subtle, pristine digital "chime" to test output, notify successful voice/audio setup,
   * and calibrate the audio compressor gain levels.
   */
  public async playTestChime(): Promise<void> {
    await this.initialize();
    if (!this.audioCtx) return;

    // Wake context if suspended (browser security restriction on cold start)
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const chimeGain = this.audioCtx.createGain();

    osc.type = 'sine';
    // Deep, pure bell tones (F5 followed by C6)
    osc.frequency.setValueAtTime(698.46, now); // F5
    osc.frequency.setValueAtTime(1046.50, now + 0.15); // C6

    chimeGain.gain.setValueAtTime(0.0001, now);
    chimeGain.gain.exponentialRampToValueAtTime(0.08, now + 0.05);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    // Route chime into the purifier chain
    if (this.workletNode) {
      osc.connect(chimeGain);
      chimeGain.connect(this.workletNode);
    } else if (this.highPassFilter) {
      osc.connect(chimeGain);
      chimeGain.connect(this.highPassFilter);
    } else {
      osc.connect(chimeGain);
      chimeGain.connect(this.audioCtx.destination);
    }

    osc.start(now);
    osc.stop(now + 1.3);
  }

  /**
   * Gets the active AudioContext if needed.
   */
  public getContext(): AudioContext | null {
    return this.audioCtx;
  }
}

// Export singleton instance
export const audioPurifier = new ScriptureAudioPurifier();
