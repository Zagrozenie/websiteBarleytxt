import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('barley_lang');
    if (saved && ['pl', 'en', 'de'].includes(saved)) return saved;
    const browserLang = navigator.language.slice(0, 2);
    if (['pl', 'de'].includes(browserLang)) return browserLang;
    return 'pl';
  });

  useEffect(() => {
    localStorage.setItem('barley_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = translations[lang] || translations.pl;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
