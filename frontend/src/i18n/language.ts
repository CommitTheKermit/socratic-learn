export type Language = "ko" | "en";
export const LANGUAGE_STORAGE_KEY = "socratic.language";

export function resolveLanguage(saved: string | null, browserLanguage: string): Language {
  if (saved === "ko" || saved === "en") return saved;
  return /^ko(?:-|$)/i.test(browserLanguage) ? "ko" : "en";
}

export function getLanguage(): Language {
  let saved: string | null = null;
  try { saved = localStorage.getItem(LANGUAGE_STORAGE_KEY); } catch { /* Private browsing may block storage. */ }
  return resolveLanguage(saved, typeof navigator === "undefined" ? "ko" : navigator.language);
}

export function saveLanguage(language: Language): void {
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); } catch { /* Keep navigation usable without storage. */ }
}
