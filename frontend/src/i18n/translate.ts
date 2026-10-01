import { getLanguage } from "./language";
import { english } from "./english";

/** Only application copy is translated. User content and saved AI responses stay untouched. */
export function t(source: string): string {
  return getLanguage() === "en" ? english[source] ?? source : source;
}
