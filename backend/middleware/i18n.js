const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Load translation files
const translations = {};
const localesDir = path.join(__dirname, '../locales');

try {
  const files = fs.readdirSync(localesDir);
  files.forEach((file) => {
    if (file.endsWith('.json')) {
      const locale = file.replace('.json', '');
      translations[locale] = JSON.parse(
        fs.readFileSync(path.join(localesDir, file), 'utf8')
      );
    }
  });
  logger.info(`Loaded translations for: ${Object.keys(translations).join(', ')}`);
} catch (error) {
  logger.error(`Failed to load translations: ${error.message}`);
}

const DEFAULT_LOCALE = 'en';
const SUPPORTED_LOCALES = Object.keys(translations);

/**
 * i18n middleware - adds translation helper to request
 */
const i18nMiddleware = (req, res, next) => {
  // Detect language from header, query param, or user preference
  let locale =
    req.query.lang ||
    req.headers['accept-language']?.split(',')[0]?.split('-')[0] ||
    req.user?.preferredLanguage ||
    DEFAULT_LOCALE;

  // Validate locale
  if (!SUPPORTED_LOCALES.includes(locale)) {
    locale = DEFAULT_LOCALE;
  }

  req.locale = locale;
  req.t = (key, defaultValue = key) => translate(locale, key, defaultValue);

  next();
};

/**
 * Translate a key
 */
const translate = (locale, key, defaultValue) => {
  const keys = key.split('.');
  let value = translations[locale];

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      break;
    }
  }

  if (typeof value === 'string') {
    return value;
  }

  // Fallback to English
  if (locale !== DEFAULT_LOCALE) {
    let fallback = translations[DEFAULT_LOCALE];
    for (const k of keys) {
      if (fallback && typeof fallback === 'object') {
        fallback = fallback[k];
      } else {
        break;
      }
    }
    if (typeof fallback === 'string') {
      return fallback;
    }
  }

  return defaultValue || key;
};

/**
 * Get all translations for a locale
 */
const getTranslations = (locale = DEFAULT_LOCALE) => {
  return translations[locale] || translations[DEFAULT_LOCALE];
};

/**
 * Get supported locales
 */
const getSupportedLocales = () => {
  return SUPPORTED_LOCALES.map((code) => ({
    code,
    name: getLocaleName(code),
    nativeName: getNativeLocaleName(code),
  }));
};

/**
 * Get locale display name in English
 */
const getLocaleName = (code) => {
  const names = {
    en: 'English',
    ml: 'Malayalam',
    te: 'Telugu',
    ta: 'Tamil',
    hi: 'Hindi',
    kn: 'Kannada',
  };
  return names[code] || code;
};

/**
 * Get locale display name in native language
 */
const getNativeLocaleName = (code) => {
  const names = {
    en: 'English',
    ml: 'മലയാളം',
    te: 'తెలుగు',
    ta: 'தமிழ்',
    hi: 'हिन्दी',
    kn: 'ಕನ್ನಡ',
  };
  return names[code] || code;
};

module.exports = {
  i18nMiddleware,
  translate,
  getTranslations,
  getSupportedLocales,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
};
