import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, translations, CATEGORY_TRANSLATIONS } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  tCategory: (categoryName: string) => string;
}

const LANGUAGE_STORAGE_KEY = 'pantry_language';

const getInitialLanguage = (): Language => {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'pl' || saved === 'en') {
      return saved;
    }
    if (typeof navigator !== 'undefined' && navigator.language?.startsWith('en')) {
      return 'en';
    }
  } catch {
    // ignore
  }
  return 'en';
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split('.');
      let current: any = translations[language];

      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          // Fallback to Polish
          let fallback: any = translations.pl;
          for (const fbKey of keys) {
            if (fallback && typeof fallback === 'object' && fbKey in fallback) {
              fallback = fallback[fbKey];
            } else {
              fallback = null;
              break;
            }
          }
          current = fallback || path;
          break;
        }
      }

      if (typeof current !== 'string') {
        return path;
      }

      let result = current;
      if (params) {
        for (const [pKey, pVal] of Object.entries(params)) {
          result = result.replace(new RegExp(`{${pKey}}`, 'g'), String(pVal));
        }
      }

      return result;
    },
    [language]
  );

  const tCategory = useCallback(
    (categoryName: string): string => {
      if (!categoryName) return '';
      const mapped = CATEGORY_TRANSLATIONS[categoryName];
      if (mapped) {
        return mapped[language] || categoryName;
      }
      return categoryName;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tCategory }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Also export alias useTranslation for convenience
export const useTranslation = useLanguage;
