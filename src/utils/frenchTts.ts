/**
 * French TTS (Text-to-Speech) Engine & Voice Resolution Utility
 * 
 * Guarantees:
 * 1. 100% French speech synthesis (fr-FR, fr-CA, fr-BE, fr-CH) - NEVER English or foreign default voice.
 * 2. Strict gender enforcement (Male / Female / Auto) with platform-specific heuristics (Chrome, Safari, iOS, Edge, Android).
 * 3. Graceful fallback on French voices with formant/pitch compensation if an exact gender is not installed natively.
 * 4. Pre-speech validation with user-facing warnings if no French voice is present.
 */

// Strictly English/foreign voice names that must never be used for French biblical reading
const EXCLUDED_NON_FRENCH_NAME_PATTERNS = [
  'samantha', 'zira', 'david', 'mark', 'alex', 'karen', 'victoria', 
  'george', 'susan', 'hazel', 'catherine', 'james', 'richard', 'linda', 
  'fiona', 'moira', 'tessa', 'daniel (en', 'oliver', 'serena', 'fred'
];

// French Female Voice Names & Identifiers across browsers
const FEMALE_NAMES_AND_TOKENS = [
  // Microsoft / Windows / Edge
  'denise', 'eloise', 'éloïse', 'hortense', 'julie', 'sylvie', 'brigitte', 
  'ariane', 'jacqueline', 'corinne', 'marie',
  // Apple / Safari / macOS / iOS
  'amélie', 'amelie', 'chloé', 'chloe', 'aurélie', 'aurelie', 'audrey', 
  'virginie', 'céline', 'celine', 'lucie', 'mathilde', 'justine', 'alice', 
  'charlotte', 'hélène', 'helene',
  // General French female names
  'margaux', 'claire', 'louise', 'manon', 'camille', 'élise', 'elise', 
  'léa', 'lea', 'emma', 'sarah', 'zoé', 'zoe', 'renée', 'renee', 'valérie', 
  'valerie', 'monique', 'sophie', 'isabelle', 'clara', 'laura', 'fanny', 'mireille',
  // Android Google TTS specific female codes
  'x-fra', 'x-frc', 'x-fre', 'x-frg', 'x-frj', 'x-caa', 'x-cac',
  'vca', 'vcc', 'vce', 'vcf', 'vcg',
  // Explicit gender keywords
  'female', 'femme', 'woman', 'girl', 'dame'
];

// French Male Voice Names & Identifiers across browsers
const MALE_NAMES_AND_TOKENS = [
  // Microsoft / Windows / Edge
  'henri', 'paul', 'alain', 'mathieu', 'claude', 'antoine', 'jean', 
  'gérard', 'gerard', 'pierre', 'michel', 'jacques', 'olivier', 'christophe',
  // Apple / Safari / macOS / iOS
  'thomas', 'nicolas', 'sébastien', 'sebastien', 'julien',
  // General French male names
  'bruno', 'guy', 'bernard', 'nils', 'gilles', 'yves', 'luc', 'rené', 
  'rene', 'andré', 'andre', 'philippe', 'laurent', 'vincent', 'françois', 
  'francois', 'étienne', 'etienne', 'guillaume',
  // Android Google TTS specific male codes
  'x-frb', 'x-frd', 'x-frf', 'x-frh', 'x-fri', 'x-cab',
  'vcb', 'vcd', 'vch', 'vci', 'vcj', 'vck',
  // Chrome desktop default French voice is Male
  'google français',
  // Explicit gender keywords
  'male', 'homme', 'man', 'boy', 'monsieur'
];

/**
 * Checks whether a voice is strictly a French voice.
 * Never allows English or other languages to sneak in.
 */
export function isStrictlyFrenchVoice(voice: SpeechSynthesisVoice): boolean {
  if (!voice) return false;
  
  const lang = (voice.lang || '').toLowerCase().trim();
  const name = (voice.name || '').toLowerCase().trim();

  // Reject foreign language codes
  const isFrenchLang = lang.startsWith('fr') || lang.includes('fr-') || lang.includes('fr_');
  if (!isFrenchLang) return false;

  // Reject explicitly known English voice names even if the system reports mixed lang
  const hasExcludedForeignName = EXCLUDED_NON_FRENCH_NAME_PATTERNS.some(pat => name.includes(pat));
  if (hasExcludedForeignName && !name.includes('français') && !name.includes('french')) {
    return false;
  }

  return true;
}

/**
 * Classifies a French voice into male, female, or unknown.
 */
export function classifyFrenchVoiceGender(voice: SpeechSynthesisVoice): 'male' | 'female' | 'unknown' {
  const name = (voice.name || '').toLowerCase();
  const uri = (voice.voiceURI || '').toLowerCase();
  const combined = `${name} ${uri}`;

  // 1. Check explicit gender tokens in name or URI
  const isFemale = FEMALE_NAMES_AND_TOKENS.some(token => combined.includes(token));
  const isMale = MALE_NAMES_AND_TOKENS.some(token => combined.includes(token));

  // If both match (unlikely, but e.g. "Google français (femme)")
  if (isFemale && !isMale) return 'female';
  if (isMale && !isFemale) return 'male';

  if (isFemale && isMale) {
    // Prefer explicit "femme" / "female" over general tokens
    if (combined.includes('female') || combined.includes('femme')) return 'female';
    if (combined.includes('male') || combined.includes('homme')) return 'male';
    // If it mentions google français and a female token
    if (combined.includes('google français') && combined.includes('x-fra')) return 'female';
    return 'male';
  }

  // 2. iOS Siri voice detection
  if (combined.includes('siri')) {
    if (combined.includes('2') || combined.includes('voix 2')) return 'female';
    if (combined.includes('1') || combined.includes('voix 1')) return 'male';
  }

  return 'unknown';
}

/**
 * Asynchronously wait for browser SpeechSynthesis voices to be populated.
 * Solves the Chrome/iOS issue where getVoices() returns [] on initial page load.
 */
export function waitForSpeechVoices(timeoutMs: number = 800): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return resolve([]);
    }

    const currentVoices = window.speechSynthesis.getVoices();
    if (currentVoices && currentVoices.length > 0) {
      return resolve(currentVoices);
    }

    let resolved = false;
    const cleanup = () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      }
    };

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
      }
    }, timeoutMs);

    const onVoicesChanged = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        cleanup();
        resolve(window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
  });
}

/**
 * Filter and sort available French voices with priority for high-fidelity/natural voices.
 */
export function isHighQualityVoice(voice: SpeechSynthesisVoice): boolean {
  if (!voice) return false;
  const name = voice.name.toLowerCase();
  return (
    name.includes('natural') || 
    name.includes('neural') || 
    name.includes('online') || 
    name.includes('premium') || 
    name.includes('enhanced') || 
    name.includes('siri') ||
    name.includes('google')
  );
}

export function isNaturalOrNeuralVoice(voice: SpeechSynthesisVoice): boolean {
  if (!voice || !voice.name) return false;
  return /natural|neural/i.test(voice.name);
}

export function getSortedFrenchVoices(
  allVoices?: SpeechSynthesisVoice[],
  highQualityOnly: boolean = false
): SpeechSynthesisVoice[] {
  let list: SpeechSynthesisVoice[] = [];
  if (allVoices) {
    list = allVoices;
  } else if (typeof window !== 'undefined' && window.speechSynthesis) {
    list = window.speechSynthesis.getVoices() || [];
  } else {
    return [];
  }

  let frenchOnly = list.filter(isStrictlyFrenchVoice);
  if (highQualityOnly) {
    frenchOnly = frenchOnly.filter(isNaturalOrNeuralVoice);
  }

  return [...frenchOnly].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    // 1. Demote robotic legacy eSpeak voices to the very bottom
    const aIsEspeak = aName.includes('espeak') || aName.includes('mbrola');
    const bIsEspeak = bName.includes('espeak') || bName.includes('mbrola');
    if (aIsEspeak && !bIsEspeak) return 1;
    if (!aIsEspeak && bIsEspeak) return -1;

    // 2. Natural / Neural / Studio / Premium voices first (e.g. Edge Natural, Apple Enhanced)
    const aIsNatural = aName.includes('natural') || aName.includes('neural') || aName.includes('premium') || aName.includes('enhanced') || aName.includes('online');
    const bIsNatural = bName.includes('natural') || bName.includes('neural') || bName.includes('premium') || bName.includes('enhanced') || bName.includes('online');
    if (aIsNatural && !bIsNatural) return -1;
    if (!aIsNatural && bIsNatural) return 1;

    // 3. Google Cloud / Siri voices next
    const aIsGoogleOrSiri = aName.includes('google') || aName.includes('siri');
    const bIsGoogleOrSiri = bName.includes('google') || bName.includes('siri');
    if (aIsGoogleOrSiri && !bIsGoogleOrSiri) return -1;
    if (!aIsGoogleOrSiri && bIsGoogleOrSiri) return 1;

    // 4. fr-FR preferred over other variants
    const aIsFrFr = (a.lang || '').toLowerCase().includes('fr-fr');
    const bIsFrFr = (b.lang || '').toLowerCase().includes('fr-fr');
    if (aIsFrFr && !bIsFrFr) return -1;
    if (!aIsFrFr && bIsFrFr) return 1;

    return a.name.localeCompare(b.name);
  });
}

/**
 * Diagnostic utility to verify that `highQualityAudioOnly` is working on the current device.
 * Attempts to fetch available SpeechSynthesis voices, logs the count of voices containing
 * 'Neural', 'Natural', or 'Google' in their names, verifies `getSortedFrenchVoices` filtering,
 * and returns a boolean indicating whether at least one such high-quality voice is available.
 */
export async function verifyHighQualityAudioDiagnostic(options?: {
  availableVoices?: SpeechSynthesisVoice[];
  highQualityAudioOnly?: boolean;
  timeoutMs?: number;
  logger?: (message: string) => void;
}): Promise<boolean> {
  const {
    availableVoices,
    highQualityAudioOnly = true,
    timeoutMs = 800,
    logger = (msg: string) => console.log(msg),
  } = options || {};

  let voices: SpeechSynthesisVoice[] = [];
  if (availableVoices) {
    voices = availableVoices;
  } else if (typeof window !== 'undefined' && window.speechSynthesis) {
    voices = window.speechSynthesis.getVoices() || [];
    if (voices.length === 0) {
      voices = await waitForSpeechVoices(timeoutMs);
    }
  }

  const highQualityNamedVoices = voices.filter((v) =>
    /neural|natural|google/i.test(v?.name || '')
  );
  const filteredFrenchVoices = getSortedFrenchVoices(voices, highQualityAudioOnly);

  logger(
    `[TTS Diagnostic] High-quality voices ('Neural' | 'Natural' | 'Google') count: ${highQualityNamedVoices.length} (total: ${voices.length}, highQualityAudioOnly=${highQualityAudioOnly} French match count: ${filteredFrenchVoices.length})`
  );

  return highQualityNamedVoices.length > 0;
}

/**
 * Clean and format biblical scripture for crystal-clear, fluid, melodious French speech.
 * Eliminates typographical artifacts, Strong codes, ligatures that cause TTS crashes,
 * and handles natural orator pauses so the reading flows peacefully like a sacred audiobook.
 */
export function cleanBiblicalTextForSpeech(
  rawText: string,
  options?: {
    verseNumber?: number;
    announceVerseNumber?: boolean;
    isChapterStart?: boolean;
    chapterNumber?: number;
  }
): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. Remove Strong concordance codes e.g. [H1234], [G5678]
  text = text.replace(/\[[HG]\d+\]/g, ' ');

  // 2. Remove editorial brackets e.g. [ou ...] or footnotes
  text = text.replace(/\[.*?\]/g, ' ');

  // 3. Normalize French ligatures that crash or cause phoneme stutter in SpeechSynthesis engines:
  // œ -> oe (cœur -> coeur, sœur -> soeur, vœu -> voeu, œuvre -> oeuvre)
  text = text.replace(/œ/g, 'oe').replace(/Œ/g, 'Oe');
  text = text.replace(/æ/g, 'ae').replace(/Æ/g, 'Ae');

  // 4. Handle musical / liturgical meditation pause "(Sélah)" in Psalms
  text = text.replace(/\(S[eé]lah\)/gi, ', pause de méditation, ');

  // 5. Replace French quotes « » and English curly quotes with soft pause punctuation
  text = text.replace(/[«»"“]/g, ' ');

  // 6. Replace long em-dashes and en-dashes with commas for natural orator breathing
  text = text.replace(/[—–]/g, ', ');

  // 7. Clean up weird punctuation repeats (e.g. "?!", "...", "::")
  text = text.replace(/\.{2,}/g, '.');
  text = text.replace(/\?{2,}/g, '?');
  text = text.replace(/!{2,}/g, '!');

  // 8. Clean up parentheses around cross-references
  text = text.replace(/\([A-Z][a-z]+ \d+:\d+\)/g, ' ');

  // 9. Replace abbreviations commonly stumbling in French TTS
  text = text.replace(/\b1er\b/gi, 'premier');
  text = text.replace(/\b1re\b/gi, 'première');
  text = text.replace(/\b2e\b/gi, 'deuxième');
  text = text.replace(/\b3e\b/gi, 'troisième');

  // 10. Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // 11. Format with or without verse announcement for fluid sacred listening
  if (options?.announceVerseNumber && options.verseNumber) {
    return `Verset ${options.verseNumber}. ${text}`;
  }

  // Fluid audiobook style: natural flow directly into the scripture text
  return text;
}

export interface VoiceResolutionResult {
  voice: SpeechSynthesisVoice | null;
  genderRequested: 'auto' | 'male' | 'female';
  genderResolved: 'male' | 'female' | 'unknown' | 'none';
  genderMatched: boolean;
  fallbackApplied: boolean;
  highQualityMissing?: boolean;
  warningMessage: string | null;
  recommendedPitch: number;
}

/**
 * Strictly resolves the best French voice based on user configuration.
 * Never returns a non-French voice.
 * Avoids aggressive pitch distortion that causes robotic crackling and clipping.
 */
export function resolveStrictFrenchVoice(options: {
  gender: 'auto' | 'male' | 'female';
  preferredVoiceURI?: string;
  basePitch?: number;
  availableVoices?: SpeechSynthesisVoice[];
  highQualityOnly?: boolean;
  highQualityNoVoicesWarning?: string;
}): VoiceResolutionResult {
  const {
    gender,
    preferredVoiceURI,
    basePitch = 1.0,
    availableVoices,
    highQualityOnly = false,
    highQualityNoVoicesWarning
  } = options;

  const sortedAllFr = getSortedFrenchVoices(availableVoices, false);
  const sortedHighQuality = highQualityOnly
    ? getSortedFrenchVoices(availableVoices, true)
    : sortedAllFr;

  // If no French voice is available at all on the device
  if (sortedAllFr.length === 0) {
    return {
      voice: null,
      genderRequested: gender,
      genderResolved: 'none',
      genderMatched: false,
      fallbackApplied: true,
      highQualityMissing: highQualityOnly,
      warningMessage:
        (highQualityOnly && highQualityNoVoicesWarning) ||
        "Aucune voix française n'a été détectée sur votre appareil. La lecture est suspendue pour éviter une prononciation erronée en anglais. Veuillez activer une voix française dans les réglages système.",
      recommendedPitch: basePitch
    };
  }

  const highQualityMissing = highQualityOnly && sortedHighQuality.length === 0;
  const sortedFr = highQualityMissing ? sortedAllFr : sortedHighQuality;
  const hqWarning = highQualityMissing
    ? highQualityNoVoicesWarning ||
      "Aucune voix française « Natural » ou « Neural » n'est détectée sur cet appareil. La lecture utilise une voix française standard."
    : null;

  // 1. If user explicitly picked a preferred voiceURI, verify that it is indeed French (and Natural/Neural when highQualityOnly is active)
  if (preferredVoiceURI) {
    const manualVoice = sortedFr.find(v => v.voiceURI === preferredVoiceURI);
    if (manualVoice) {
      const manualGender = classifyFrenchVoiceGender(manualVoice);
      return {
        voice: manualVoice,
        genderRequested: gender,
        genderResolved: manualGender,
        genderMatched: gender === 'auto' || manualGender === gender,
        fallbackApplied: highQualityMissing,
        highQualityMissing,
        warningMessage: hqWarning,
        recommendedPitch: Math.max(0.95, Math.min(1.05, basePitch))
      };
    }
  }

  // 2. User requested a FEMALE voice
  if (gender === 'female') {
    // Look for verified female French voice
    const femaleVoice = sortedFr.find(v => classifyFrenchVoiceGender(v) === 'female');
    if (femaleVoice) {
      return {
        voice: femaleVoice,
        genderRequested: 'female',
        genderResolved: 'female',
        genderMatched: true,
        fallbackApplied: highQualityMissing,
        highQualityMissing,
        warningMessage: hqWarning,
        // Keep pitch completely natural to preserve acoustic timbre without distortion
        recommendedPitch: Math.max(0.98, Math.min(1.02, basePitch))
      };
    }

    // Fallback: If no explicit female French voice is installed on device
    // Pick the best available French voice and keep pitch gentle (1.02 max, NOT 1.25 which causes crackling)
    const fallbackFrVoice = sortedFr[0];
    const resolvedGender = classifyFrenchVoiceGender(fallbackFrVoice);

    return {
      voice: fallbackFrVoice,
      genderRequested: 'female',
      genderResolved: resolvedGender,
      genderMatched: false,
      fallbackApplied: true,
      highQualityMissing,
      warningMessage:
        hqWarning ||
        "Votre appareil ne possède pas de voix féminine française native. La lecture utilise la meilleure voix française disponible avec une intonation naturelle.",
      recommendedPitch: 1.02
    };
  }

  // 3. User requested a MALE voice
  if (gender === 'male') {
    // Look for verified male French voice
    const maleVoice = sortedFr.find(v => classifyFrenchVoiceGender(v) === 'male');
    if (maleVoice) {
      return {
        voice: maleVoice,
        genderRequested: 'male',
        genderResolved: 'male',
        genderMatched: true,
        fallbackApplied: highQualityMissing,
        highQualityMissing,
        warningMessage: hqWarning,
        recommendedPitch: Math.max(0.96, Math.min(1.0, basePitch))
      };
    }

    // Fallback: Pick best available French voice with natural pitch (0.98, NOT 0.88 which muffles/distorts)
    const fallbackFrVoice = sortedFr[0];
    const resolvedGender = classifyFrenchVoiceGender(fallbackFrVoice);

    return {
      voice: fallbackFrVoice,
      genderRequested: 'male',
      genderResolved: resolvedGender,
      genderMatched: false,
      fallbackApplied: true,
      highQualityMissing,
      warningMessage:
        hqWarning ||
        "Votre appareil ne possède pas de voix masculine française explicite. La lecture utilise la voix française disponible avec son timbre naturel.",
      recommendedPitch: 0.98
    };
  }

  // 4. 'auto' mode: Prioritize high-quality natural/neural French voice
  const solemnMaleVoice = sortedFr.find(v => classifyFrenchVoiceGender(v) === 'male');
  const chosenVoice = sortedFr.find(v => isHighQualityVoice(v)) || solemnMaleVoice || sortedFr[0];
  const chosenGender = classifyFrenchVoiceGender(chosenVoice);

  return {
    voice: chosenVoice,
    genderRequested: 'auto',
    genderResolved: chosenGender,
    genderMatched: true,
    fallbackApplied: highQualityMissing,
    highQualityMissing,
    warningMessage: hqWarning,
    recommendedPitch: Math.max(0.96, Math.min(1.04, basePitch))
  };
}
