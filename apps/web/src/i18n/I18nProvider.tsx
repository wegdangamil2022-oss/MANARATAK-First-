import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DEFAULT_LOCALE,
  getLocaleDirection,
  isSupportedLocale,
  type SupportedLocale,
} from '@manaratak/shared';
import { resolvePublicLocationLocale } from './localeRouting';
import { en } from './en';
import { ar } from './ar';

type Translations = typeof en;

interface I18nContextType {
  language: SupportedLocale;
  t: (key: keyof Translations | (string & {})) => string;
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
    const saved = localStorage.getItem('manaratak_lang');
    return resolvePublicLocationLocale({
      pathname: window.location.pathname,
      persistedBrowserLocale: saved,
    });
  });

  const setLanguage = (lang: SupportedLocale) => {
    setLanguageState(lang);
    localStorage.setItem('manaratak_lang', lang);
  };

  const dir = getLocaleDirection(language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const t = (key: string): string => {
    return (dictionaries[language] as Record<string, string>)[key] || key;
  };

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
