"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { DICTIONARIES, LOCALES, type Dictionary, type Locale } from "./dictionary";

const STORAGE_KEY = "apple-motion:locale";

/**
 * The chosen language is external state, not component state.
 *
 * It has to be, to stay hydration-safe: the server has no idea what the visitor
 * picked last time, so the first HTML must be English and the stored choice
 * must be adopted on the client. Reading localStorage inside an effect and
 * calling setState would work, but it renders the page twice and trips React's
 * cascading-render rule. `useSyncExternalStore` is built for exactly this: it
 * has a server snapshot and a client snapshot, and React reconciles them.
 */
let current: Locale = "en";
let hydrated = false;
const listeners = new Set<() => void>();

function read(): Locale {
  if (!hydrated) {
    hydrated = true;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && (LOCALES as readonly string[]).includes(stored)) {
        current = stored as Locale;
      } else if (navigator.language.toLowerCase().startsWith("fr")) {
        current = "fr";
      }
    } catch {
      // Private browsing or blocked storage: English it is.
    }
  }
  return current;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function write(next: Locale) {
  if (current === next) return;
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // The choice simply will not survive a reload.
  }
  for (const listener of listeners) listener();
}

type I18nValue = {
  locale: Locale;
  t: Dictionary;
  setLocale: (next: Locale) => void;
  toggle: () => void;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, read, () => "en" as Locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => write(next), []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      t: DICTIONARIES[locale],
      setLocale,
      toggle: () => setLocale(locale === "en" ? "fr" : "en"),
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
