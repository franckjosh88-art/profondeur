// Global browser API types for Web Speech, Web Audio, and WakeLock
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
    webkitAudioContext?: typeof AudioContext;
    _activeUtterances?: SpeechSynthesisUtterance[];
  }

  interface Navigator {
    wakeLock?: {
      request(type: 'screen'): Promise<WakeLockSentinel>;
    };
  }

  interface WakeLockSentinel extends EventTarget {
    released: boolean;
    type: 'screen';
    release(): Promise<void>;
    addEventListener(type: 'release', listener: EventListener): void;
    removeEventListener(type: 'release', listener: EventListener): void;
  }
}

export {};
