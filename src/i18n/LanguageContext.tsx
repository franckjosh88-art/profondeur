import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SupportedLanguage, SUPPORTED_LANGUAGES, LanguageOption } from './types';
import { fr } from './translations/fr';
import { en } from './translations/en';
import { BOOK_MAPPING_TO_ENGLISH } from '../data/bibleData';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  getBookTitle: (book: { id: number; name: string } | null | undefined) => string;
  isFrench: boolean;
  isEnglish: boolean;
  supportedLanguages: LanguageOption[];
}

const translations: Record<SupportedLanguage, any> = {
  fr,
  en,
};

const STORAGE_KEY = 'bible_app_language';

/**
 * Détecte la langue initiale :
 * 1. Préférence stockée localement dans localStorage
 * 2. Détection de la langue du navigateur (si anglais -> 'en', sinon 'fr')
 * 3. Défaut sécurisé : 'fr'
 */
function getInitialLanguage(): SupportedLanguage {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'fr' || saved === 'en') {
        return saved;
      }
    } catch (_) {}

    try {
      if (typeof navigator !== 'undefined' && navigator.language) {
        const browserLang = navigator.language.toLowerCase();
        if (browserLang.startsWith('en')) {
          return 'en';
        }
      }
    } catch (_) {}
  }
  return 'fr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(getInitialLanguage);

  // Met à jour la balise <html lang="...">
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  // Synchronisation avec Firebase Auth et Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data?.language === 'fr' || data?.language === 'en') {
              if (data.language !== language) {
                setLanguageState(data.language);
                try {
                  localStorage.setItem(STORAGE_KEY, data.language);
                } catch (_) {}
              }
              return;
            }
          }
          // Si le profil utilisateur n'a pas encore de langue enregistrée, sauvegarder la langue courante
          await setDoc(userDocRef, { language }, { merge: true });
        } catch (err) {
          console.warn("Could not sync user language with Firestore:", err);
        }
      }
    });

    return () => unsubscribe();
  }, [language]);

  // Changement de langue instantané avec persistance locale et cloud
  const setLanguage = useCallback((newLang: SupportedLanguage) => {
    if (newLang !== 'fr' && newLang !== 'en') return;

    // Mise à jour synchrone de l'état React (0 ms)
    setLanguageState(newLang);

    // Persistance localStorage
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch (_) {}

    // Persistance Firestore si l'utilisateur est connecté
    if (auth.currentUser) {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      setDoc(userDocRef, { language: newLang }, { merge: true }).catch((err) => {
        console.warn("Could not save language to Firestore:", err);
      });
    }
  }, []);

  /**
   * Fonction de traduction avec interpolation de variables et gestion des pluriels.
   * Ex: t('home.streakCount', { count: 3 })
   */
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const currentDict = translations[language] || translations.fr;
    const fallbackDict = translations.fr;

    // Résolution de la clé imbriquée (ex: "settings.title")
    const resolveKey = (dict: any, path: string) => {
      const parts = path.split('.');
      let cur = dict;
      for (const part of parts) {
        if (cur && typeof cur === 'object' && part in cur) {
          cur = cur[part];
        } else {
          return undefined;
        }
      }
      return typeof cur === 'string' ? cur : undefined;
    };

    // Gestion de pluriel automatique si params.count est présent
    let targetKey = key;
    if (params && typeof params.count === 'number' && params.count > 1) {
      const pluralKey = `${key}_plural`;
      if (resolveKey(currentDict, pluralKey) || resolveKey(fallbackDict, pluralKey)) {
        targetKey = pluralKey;
      }
    }

    let template = resolveKey(currentDict, targetKey) || resolveKey(fallbackDict, targetKey);

    if (!template) {
      // Clé manquante : retourner la dernière partie de la clé ou la clé elle-même
      return key.split('.').pop() || key;
    }

    // Remplacement des paramètres {{variable}}
    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        const regex = new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g');
        template = template!.replace(regex, String(val));
      });
    }

    return template;
  }, [language]);

  /**
   * Retourne le nom du livre dans la langue active (Français / Anglais).
   */
  const getBookTitle = useCallback((book: { id: number; name: string } | null | undefined): string => {
    if (!book) return '';
    if (language === 'en') {
      return BOOK_MAPPING_TO_ENGLISH[book.id] || book.name;
    }
    return book.name;
  }, [language]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    getBookTitle,
    isFrench: language === 'fr',
    isEnglish: language === 'en',
    supportedLanguages: SUPPORTED_LANGUAGES,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Alias pour flexibilité et clarté
export const useTranslation = useLanguage;
