import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DEFAULT_LOCALE,
  getLocaleDirection,
  isSupportedLocale,
  type SupportedLocale,
} from '@manaratak/shared';
import { en } from './en';
import { ar } from './ar';

type Translations = typeof en;

interface I18nContextType {
  language: SupportedLocale;
  t: (key: keyof Translations) => string;
  setLanguage: (lang: SupportedLocale) => void;
  dir: 'rtl' | 'ltr';
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const dictionaries = {
  ar,
  en,
};

const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    try {
      return window.localStorage?.getItem(key) || null;
    } catch {
      return null;
    }
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    try {
      window.localStorage?.setItem(key, value);
    } catch {}
  }
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLocale>(() => {
    const saved = safeGetItem('manaratak_admin_lang');
    if (isSupportedLocale(saved)) {
      return saved;
    }
    return DEFAULT_LOCALE;
  });

  const setLanguage = (lang: SupportedLocale) => {
    setLanguageState(lang);
    safeSetItem('manaratak_admin_lang', lang);
  };

  const dir = getLocaleDirection(language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const t = (key: keyof Translations): string => {
    return dictionaries[language][key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, t, setLanguage, dir }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    const savedLang = safeGetItem('manaratak_admin_lang') || safeGetItem('manaratak_lang');
    const language = isSupportedLocale(savedLang) ? savedLang : DEFAULT_LOCALE;
    const dict = dictionaries[language] || dictionaries.ar;
    return {
      language,
      t: (key: keyof Translations): string => dict[key] || dictionaries.en[key] || (key as string),
      setLanguage: () => {},
      dir: getLocaleDirection(language),
    };
  }
  return context;
};
