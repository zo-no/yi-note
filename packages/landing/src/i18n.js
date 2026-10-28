import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/translations.json';
import enHeader from './locales/en/header.json';
import zhCN from './locales/zh-CN/translations.json';
import zhCNHeader from './locales/zh-CN/header.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translations: en, header: enHeader },
      'zh-CN': { translations: zhCN, header: zhCNHeader }
    },
    // Match Gatsby's server HTML before applying the browser preference.
    lng: 'en',
    fallbackLng: 'en',
    initImmediate: false,
    ns: ['translations', 'header'],
    defaultNS: 'translations',

    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'wildframeLanguage',
      caches: []
    },

    interpolation: {
      escapeValue: false // not needed for react!!
    },

    react: {
      useSuspense: false
    }
  });

export const setLanguage = language => {
  const selected = /^zh(?:-|$)/i.test(language || '') ? 'zh-CN' : 'en';
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem('wildframeLanguage', selected);
    } catch (error) {
      // Language switching also works when browser storage is unavailable.
    }
  }
  return i18n.changeLanguage(selected);
};

export const detectLanguage = () => {
  let detected;
  try {
    detected = i18n.services.languageDetector.detect();
  } catch (error) {
    detected = i18n.services.languageDetector.detect(['navigator']);
  }
  return setLanguage(Array.isArray(detected) ? detected[0] : detected);
};

export default i18n;
