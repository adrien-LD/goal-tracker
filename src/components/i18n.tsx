"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import zh from "@/locales/zh.json";
import en from "@/locales/en.json";

export type Locale = "zh" | "en";

type Dictionary = typeof zh;

const dictionaries: Record<Locale, Dictionary> = {
  zh,
  en,
};

type I18nContextValue = {
  locale: Locale;
  t: (key: keyof Dictionary) => string;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "zh";
  const stored = window.localStorage.getItem("locale");
  if (stored === "en" || stored === "zh") return stored;
  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("locale="));
  if (cookie) {
    const value = cookie.split("=")[1];
    if (value === "en" || value === "zh") return value;
  }
  return "zh";
}

function persistLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("locale", locale);
  document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      t: (key) => dictionaries[locale][key] ?? String(key),
      setLocale: (next) => {
        setLocaleState(next);
        persistLocale(next);
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
