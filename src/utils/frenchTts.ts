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
export function getSortedFrenchVoices(allVoices?: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  const list = allVoices || window.speechSynthesis.getVoices() || [];
  
  const frenchOnly = list.filter(isStrictlyFrenchVoice);

  return [...frenchOnly].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    // Natural / Neural / Premium / High quality voices first
    const aIsNatural = aName.includes('natural') || aName.includes('neural') || aName.includes('premium') || aName.includes('online');
    const bIsNatural = bName.includes('natural') || bName.includes('neural') || bName.includes('premium') || bName.includes('online');
    if (aIsNatural && !bIsNatural) return -1;
    if (!aIsNatural && bIsNatural) return 1;

    // Google / Cloud voices next
    const aIsGoogle = aName.includes('google');
    const bIsGoogle = bName.includes('google');
    if (aIsGoogle && !bIsGoogle) return -1;
    if (!aIsGoogle && bIsGoogle) return 1;

    // fr-FR preferred over other variants
    const aIsFrFr = (a.lang || '').toLowerCase().includes('fr-fr');
    const bIsFrFr = (b.lang || '').toLowerCase().includes('fr-fr');
    if (aIsFrFr && !bIsFrFr) return -1;
    if (!aIsFrFr && bIsFrFr) return 1;

    return a.name.localeCompare(b.name);
  });
}

export interface VoiceResolutionResult {
  voice: SpeechSynthesisVoice | null;
  genderRequested: 'auto' | 'male' | 'female';
  genderResolved: 'male' | 'female' | 'unknown' | 'none';
  genderMatched: boolean;
  fallbackApplied: boolean;
  warningMessage: string | null;
  recommendedPitch: number;
}

/**
 * Strictly resolves the best French voice based on user configuration.
 * Never returns a non-French voice.
 * Never falls back to English.
 */
export function resolveStrictFrenchVoice(options: {
  gender: 'auto' | 'male' | 'female';
  preferredVoiceURI?: string;
  basePitch?: number;
  availableVoices?: SpeechSynthesisVoice[];
}): VoiceResolutionResult {
  const { gender, preferredVoiceURI, basePitch = 1.0, availableVoices } = options;
  const sortedFr = getSortedFrenchVoices(availableVoices);

  // If no French voice is available at all on the device
  if (sortedFr.length === 0) {
    return {
      voice: null,
      genderRequested: gender,
      genderResolved: 'none',
      genderMatched: false,
      fallbackApplied: true,
      warningMessage: "Aucune voix française n'a été détectée sur votre appareil. La lecture est suspendue pour éviter une prononciation erronée en anglais. Veuillez activer une voix française dans les réglages système.",
      recommendedPitch: basePitch
    };
  }

  // 1. If user explicitly picked a preferred voiceURI, verify that it is indeed French
  if (preferredVoiceURI) {
    const manualVoice = sortedFr.find(v => v.voiceURI === preferredVoiceURI);
    if (manualVoice) {
      const manualGender = classifyFrenchVoiceGender(manualVoice);
      return {
        voice: manualVoice,
        genderRequested: gender,
        genderResolved: manualGender,
        genderMatched: gender === 'auto' || manualGender === gender,
        fallbackApplied: false,
        warningMessage: null,
        recommendedPitch: basePitch
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
        fallbackApplied: false,
        warningMessage: null,
        recommendedPitch: Math.max(basePitch, 1.05) // Ensure clear, pleasant feminine tone
      };
    }

    // Fallback: If no explicit female French voice is installed on device
    // Pick the best available French voice and apply pitch shifting for female tone
    const fallbackFrVoice = sortedFr[0];
    const resolvedGender = classifyFrenchVoiceGender(fallbackFrVoice);

    return {
      voice: fallbackFrVoice,
      genderRequested: 'female',
      genderResolved: resolvedGender,
      genderMatched: false,
      fallbackApplied: true,
      warningMessage: "Votre appareil ne possède pas de voix féminine française native. La lecture est adaptée avec un timbre féminin ajusté sur la voix française disponible.",
      recommendedPitch: 1.25 // Slightly elevated pitch creates an authentic female voice timbre
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
        fallbackApplied: false,
        warningMessage: null,
        recommendedPitch: Math.min(basePitch, 0.95) // Deep, solemn masculine tone
      };
    }

    // Fallback: Pick best available French voice and adjust pitch slightly lower
    const fallbackFrVoice = sortedFr[0];
    const resolvedGender = classifyFrenchVoiceGender(fallbackFrVoice);

    return {
      voice: fallbackFrVoice,
      genderRequested: 'male',
      genderResolved: resolvedGender,
      genderMatched: false,
      fallbackApplied: true,
      warningMessage: "Votre appareil ne possède pas de voix masculine française explicite. La lecture est adaptée avec un timbre masculin ajusté.",
      recommendedPitch: 0.88 // Deep masculine timbre
    };
  }

  // 4. 'auto' mode: Prioritize high-quality French voice (male/deep preferred for solemn biblical reading)
  const solemnMaleVoice = sortedFr.find(v => classifyFrenchVoiceGender(v) === 'male');
  const chosenVoice = solemnMaleVoice || sortedFr[0];
  const chosenGender = classifyFrenchVoiceGender(chosenVoice);

  return {
    voice: chosenVoice,
    genderRequested: 'auto',
    genderResolved: chosenGender,
    genderMatched: true,
    fallbackApplied: false,
    warningMessage: null,
    recommendedPitch: basePitch
  };
}
