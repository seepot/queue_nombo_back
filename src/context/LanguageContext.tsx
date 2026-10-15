"use client";

import React, { createContext, useContext, useSyncExternalStore } from "react";
import { Language, TranslationKey, translations } from "@/lib/i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

function applyParams(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  let result = text;
  Object.entries(params).forEach(([pKey, pVal]) => {
    result = result.replace(new RegExp(`{{${pKey}}}`, "g"), String(pVal));
  });
  return result;
}

const defaultContext: LanguageContextType = {
  language: "ms",
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key, params) => applyParams(translations.ms[key] || String(key), params),
};

const LanguageContext = createContext<LanguageContextType>(defaultContext);

// -----------------------------------------------------------------------------
// Stor bahasa: nilai dalam memori + localStorage, dibaca melalui useSyncExternalStore supaya
// render pelayan/penghidratan sentiasa "ms" dan pilihan tersimpan dipakai selepas penghidratan
// (tanpa setState di dalam effect).
// -----------------------------------------------------------------------------
const STORAGE_KEY = "quenombo_lang";
const listeners = new Set<() => void>();
let currentLanguage: Language | null = null;

function readStoredLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ms" || saved === "en") return saved;
  } catch {
    // localStorage tidak tersedia
  }
  return "ms";
}

function getLanguageSnapshot(): Language {
  if (currentLanguage === null) currentLanguage = readStoredLanguage();
  return currentLanguage;
}

function getServerLanguageSnapshot(): Language {
  return "ms";
}

function subscribeLanguage(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function storeLanguage(lang: Language) {
  currentLanguage = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Ignore
  }
  listeners.forEach((notify) => notify());
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore(subscribeLanguage, getLanguageSnapshot, getServerLanguageSnapshot);

  const setLanguage = (lang: Language) => {
    storeLanguage(lang);
  };

  const toggleLanguage = () => {
    const next = language === "ms" ? "en" : "ms";
    setLanguage(next);
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const dict: Record<TranslationKey, string> = translations[language] || translations.ms;
    return applyParams(dict[key] || translations.ms[key] || String(key), params);
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
