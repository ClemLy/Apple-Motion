"use client";

import { useI18n } from "@/lib/i18n/context";
import { LOCALES } from "@/lib/i18n/dictionary";

/**
 * Two labels and a pill that slides between them.
 *
 * Both labels are always rendered, so the control never changes width when the
 * language changes — a switch that resizes as you use it drags the whole
 * navigation bar with it.
 */
export function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n();
  const index = LOCALES.indexOf(locale);

  return (
    <div
      role="group"
      aria-label={t.a11y.languageSwitch}
      className="relative flex items-center rounded-full border border-hair bg-surface p-0.5 backdrop-blur-md"
    >
      <span
        aria-hidden="true"
        className="absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full bg-ink transition-transform duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={`relative z-10 w-11 rounded-full py-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase transition-colors duration-300 ${
            locale === code ? "text-white" : "text-ink-soft hover:text-ink"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
