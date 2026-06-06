import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Translation imports
import en from "./locales/en.json";
import id from "./locales/id.json";
import ar from "./locales/ar.json";
import ru from "./locales/ru.json";
import uk from "./locales/uk.json";
import zh from "./locales/zh.json";
import tr from "./locales/tr.json";
import hi from "./locales/hi.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import vi from "./locales/vi.json";
import ms from "./locales/ms.json";
import th from "./locales/en.json"; // Placeholder for th if needed, or use en
import fil from "./locales/fil.json";
import kk from "./locales/kk.json";
import tg from "./locales/tg.json";
import uz from "./locales/uz.json";
import az from "./locales/az.json";
import bg from "./locales/bg.json";
import cs from "./locales/cs.json";
import fa from "./locales/fa.json";
import he from "./locales/he.json";
import hr from "./locales/hr.json";
import hu from "./locales/hu.json";
import pl from "./locales/pl.json";
import ro from "./locales/ro.json";
import sk from "./locales/sk.json";
import sr from "./locales/sr.json";

export const SUPPORTED_LANGUAGES = [
  // Default
  { value: "en", label: "English (US)", region: "Default", flag: "🇺🇸", dir: "ltr" },
  // Southeast Asia
  { value: "id", label: "Indonesia", region: "Southeast Asia", flag: "🇮🇩", dir: "ltr" },
  { value: "ms", label: "Melayu", region: "Southeast Asia", flag: "🇲🇾", dir: "ltr" },
  { value: "vi", label: "Tiếng Việt", region: "Southeast Asia", flag: "🇻🇳", dir: "ltr" },
  { value: "fil", label: "Filipino", region: "Southeast Asia", flag: "🇵🇭", dir: "ltr" },
  // East Asia
  { value: "zh", label: "简体中文", region: "East Asia", flag: "🇨🇳", dir: "ltr" },
  { value: "ja", label: "日本語", region: "East Asia", flag: "🇯🇵", dir: "ltr" },
  { value: "ko", label: "한국어", region: "East Asia", flag: "🇰🇷", dir: "ltr" },
  // Europe & West Asia
  { value: "ru", label: "Русский", region: "Europe & West Asia", flag: "🇷🇺", dir: "ltr" },
  { value: "uk", label: "Українська", region: "Europe & West Asia", flag: "🇺🇦", dir: "ltr" },
  { value: "tr", label: "Türkçe", region: "Europe & West Asia", flag: "🇹🇷", dir: "ltr" },
  { value: "kk", label: "Қазақша", region: "Europe & West Asia", flag: "🇰🇿", dir: "ltr" },
  { value: "tg", label: "Тоҷикӣ", region: "Europe & West Asia", flag: "🇹🇯", dir: "ltr" },
  { value: "uz", label: "O'zbekcha", region: "Europe & West Asia", flag: "🇺🇿", dir: "ltr" },
  { value: "az", label: "Azərbaycanca", region: "Europe & West Asia", flag: "🇦🇿", dir: "ltr" },
  { value: "pl", label: "Polski", region: "Europe & West Asia", flag: "🇵🇱", dir: "ltr" },
  { value: "ro", label: "Română", region: "Europe & West Asia", flag: "🇷🇴", dir: "ltr" },
  { value: "bg", label: "Български", region: "Europe & West Asia", flag: "🇧🇬", dir: "ltr" },
  { value: "cs", label: "Čeština", region: "Europe & West Asia", flag: "🇨🇿", dir: "ltr" },
  { value: "hu", label: "Magyar", region: "Europe & West Asia", flag: "🇭🇺", dir: "ltr" },
  { value: "sk", label: "Slovenčina", region: "Europe & West Asia", flag: "🇸🇰", dir: "ltr" },
  { value: "sr", label: "Српски", region: "Europe & West Asia", flag: "🇷🇸", dir: "ltr" },
  { value: "hr", label: "Hrvatski", region: "Europe & West Asia", flag: "🇭🇷", dir: "ltr" },
  // South Asia
  { value: "hi", label: "हिन्दी", region: "South Asia", flag: "🇮🇳", dir: "ltr" },
  // Middle East
  { value: "ar", label: "Arabic", region: "Middle East", flag: "🇦🇪", dir: "rtl" },
  { value: "fa", label: "Persian", region: "Middle East", flag: "🇮🇷", dir: "rtl" },
  { value: "he", label: "Hebrew", region: "Middle East", flag: "🇮🇱", dir: "rtl" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["value"];

export const isRTL = (lang: string) => {
  const found = SUPPORTED_LANGUAGES.find(l => l.value === lang);
  return found?.dir === "rtl";
};

// Map regional codes back to base for translations
const getTranslationKey = (code: string) => {
  if (code.startsWith("ar")) return "ar";
  return code;
};

const resources: Record<string, { translation: Record<string, unknown> }> = {
  en: { translation: en },
  id: { translation: id },
  ar: { translation: ar },
  ru: { translation: ru },
  uk: { translation: uk },
  zh: { translation: zh },
  tr: { translation: tr },
  hi: { translation: hi },
  ja: { translation: ja },
  ko: { translation: ko },
  vi: { translation: vi },
  ms: { translation: ms },
  fil: { translation: fil },
  kk: { translation: kk },
  tg: { translation: tg },
  uz: { translation: uz },
  az: { translation: az },
  bg: { translation: bg },
  cs: { translation: cs },
  fa: { translation: fa },
  he: { translation: he },
  hr: { translation: hr },
  hu: { translation: hu },
  pl: { translation: pl },
  ro: { translation: ro },
  sk: { translation: sk },
  sr: { translation: sr },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "reseller_language",
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

// Handle RTL direction
i18n.on('languageChanged', (lng) => {
  document.dir = isRTL(lng) ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

// Initial set
if (typeof document !== 'undefined') {
  const initialLang = i18n.language || 'en';
  document.dir = isRTL(initialLang) ? 'rtl' : 'ltr';
  document.documentElement.lang = initialLang;
}

export default i18n;
