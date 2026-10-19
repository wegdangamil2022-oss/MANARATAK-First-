import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getLocaleDirection,
  type SupportedLocale,
} from '@absheer/shared';
import { readStoredLocale, writeStoredLocale } from './browserStorage';
import { localizeLocation, getPathLocale } from './localeRouting';
import { resolvePublicLocationLocale } from './localeRouting';
import { en } from './en';
import { ar } from './ar';
import { formatTranslation, type TranslationValues } from './formatTranslation';

type Translations = typeof en;

interface I18nContextType {
  language: SupportedLocale;
  t: (key: keyof Translations | (string & {}), values?: TranslationValues) => string;
  setLanguage: (lang: SupportedLocale) => void;
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const dictionaries = {
  ar,
  en,
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLocale>(() => {
    const saved = readStoredLocale();
    return resolvePublicLocationLocale({
      pathname: typeof window === 'undefined' ? '/ar' : window.location.pathname,
      persistedBrowserLocale: saved,
    });
  });

  const setLanguage = useCallback((lang: SupportedLocale) => {
    writeStoredLocale(lang);
    if (typeof window !== 'undefined' && getPathLocale(window.location.pathname) !== lang) {
      // One navigation changes URL, UI initialization and API request locale together.
      window.location.assign(localizeLocation(window.location, lang));
      return;
    }
    setLanguageState(lang);
  }, []);

  const dir = getLocaleDirection(language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const t = useCallback((key: string, values?: TranslationValues): string => {
    const copy = (dictionaries[language] as Record<string, string>)[key] || key;
    return formatTranslation(copy, values);
  }, [language]);

  const isRTL = dir === 'rtl';

  return (
    <I18nContext.Provider value={{ language, t, setLanguage, dir, isRTL }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};
