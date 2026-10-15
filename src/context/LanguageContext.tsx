"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Language, translations } from "@/lib/i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: keyof typeof translations.ms, params?: Record<string, string | number>) => string;
}

const defaultContext: LanguageContextType = {
  language: "ms",
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key, params) => {
    let text = (translations.ms as any)[key] || String(key);
    if (params) {
      Object.entries(params).forEach(([pKey, pVal]) => {
        text = text.replace(new RegExp(`{{${pKey}}}`, "g"), String(pVal));
      });
    }
    return text;
  },
};

const LanguageContext = createContext<LanguageContextType>(defaultContext);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ms");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("quenombo_lang") as Language;
      if (saved === "ms" || saved === "en") {
        setLanguageState(saved);
      }
    } catch {
      // Ignore SSR/localStorage disabled
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("quenombo_lang", lang);
    } catch {
      // Ignore
    }
  };

  const toggleLanguage = () => {
    const next = language === "ms" ? "en" : "ms";
    setLanguage(next);
  };

  const t = (key: keyof typeof translations.ms, params?: Record<string, string | number>): string => {
    const dict = translations[language] || translations.ms;
    let text = (dict as any)[key] || (translations.ms as any)[key] || String(key);

    if (params) {
      Object.entries(params).forEach(([pKey, pVal]) => {
        text = text.replace(new RegExp(`{{${pKey}}}`, "g"), String(pVal));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  return context || defaultContext;
}
