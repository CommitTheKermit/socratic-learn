import { getLanguage, saveLanguage, type Language } from "../i18n/language";
import "../styles/language.css";

export function LanguageSelector() {
  return (
    <label className="language-selector">
      <span>{getLanguage() === "ko" ? "언어" : "Language"}</span>
      <select
        aria-label="Language / 언어"
        value={getLanguage()}
        onChange={(event) => {
          saveLanguage(event.target.value as Language);
          // Reload static translated copy as well as React state without touching saved lessons.
          window.location.reload();
        }}
      >
        <option value="ko" lang="ko">한국어</option>
        <option value="en" lang="en">English</option>
      </select>
    </label>
  );
}
