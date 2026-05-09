/**
 * InternationalizationService.js
 * Multi-language support, currency conversion, localization
 */

const logger = require('../config/logger');
const User = require('../models/User');
const Product = require('../models/Product');
const localeData = require('../config/locales.json'); // Locale strings

const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'hi', 'ja', 'zh', 'ar'];
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CNY', 'AED'];
const EXCHANGE_RATES = {
  'USD': 1,
  'EUR': 0.92,
  'GBP': 0.79,
  'INR': 83.12,
  'JPY': 149.50,
  'CNY': 7.24,
  'AED': 3.67
}; // Cached rates

class InternationalizationService {
  /**
   * Set user language preference
   */
  static async setUserLanguage(userId, language) {
    try {
      if (!SUPPORTED_LANGUAGES.includes(language)) {
        throw new Error(`Language ${language} not supported`);
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { preferredLanguage: language },
        { new: true }
      );

      logger.info(`User ${userId} language set to ${language}`);
      return { success: true, user };
    } catch (error) {
      logger.error(`Set language error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set user currency preference
   */
  static async setUserCurrency(userId, currency) {
    try {
      if (!SUPPORTED_CURRENCIES.includes(currency)) {
        throw new Error(`Currency ${currency} not supported`);
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { preferredCurrency: currency },
        { new: true }
      );

      logger.info(`User ${userId} currency set to ${currency}`);
      return { success: true, user };
    } catch (error) {
      logger.error(`Set currency error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get localized strings for UI
   */
  static async getLocaleStrings(language) {
    try {
      if (!SUPPORTED_LANGUAGES.includes(language)) {
        language = 'en'; // Fallback
      }

      const strings = localeData[language] || localeData['en'];
      
      return {
        success: true,
        language,
        strings
      };
    } catch (error) {
      logger.error(`Get locale strings error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert product price to target currency
   */
  static async convertPrice(priceUSD, targetCurrency) {
    try {
      if (!SUPPORTED_CURRENCIES.includes(targetCurrency)) {
        throw new Error(`Currency ${targetCurrency} not supported`);
      }

      const rate = EXCHANGE_RATES[targetCurrency] || 1;
      const convertedPrice = (priceUSD * rate).toFixed(2);

      return {
        success: true,
        originalPrice: priceUSD,
        originalCurrency: 'USD',
        convertedPrice: parseFloat(convertedPrice),
        targetCurrency,
        exchangeRate: rate
      };
    } catch (error) {
      logger.error(`Convert price error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get product with localized content
   */
  static async getLocalizedProduct(productId, language) {
    try {
      const product = await Product.findById(productId);
      if (!product) throw new Error('Product not found');

      // Get localized descriptions (stored in product)
      const localizedContent = {
        name: product.localizedNames?.[language] || product.name,
        description: product.localizedDescriptions?.[language] || product.description,
        category: product.localizedCategories?.[language] || product.category
      };

      return {
        success: true,
        product: { ...product.toObject(), ...localizedContent },
        language
      };
    } catch (error) {
      logger.error(`Get localized product error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format date/time based on locale
   */
  static formatDateTime(date, language) {
    try {
      const locales = {
        'en': 'en-US',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'hi': 'hi-IN',
        'ja': 'ja-JP',
        'zh': 'zh-CN',
        'ar': 'ar-SA'
      };

      const locale = locales[language] || 'en-US';
      const formatted = new Date(date).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return { success: true, formatted, language };
    } catch (error) {
      logger.error(`Format datetime error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format currency based on locale
   */
  static formatCurrency(amount, currency, language) {
    try {
      const locales = {
        'en': 'en-US',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'hi': 'hi-IN',
        'ja': 'ja-JP',
        'zh': 'zh-CN',
        'ar': 'ar-SA'
      };

      const locale = locales[language] || 'en-US';
      const formatted = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency
      }).format(amount);

      return { success: true, formatted, currency, language };
    } catch (error) {
      logger.error(`Format currency error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect user language from request headers
   */
  static detectLanguageFromRequest(req) {
    try {
      const acceptLanguage = req.headers['accept-language'] || 'en';
      const preferredLanguage = acceptLanguage.split(',')[0].split('-')[0];

      if (SUPPORTED_LANGUAGES.includes(preferredLanguage)) {
        return preferredLanguage;
      }

      return 'en'; // Default
    } catch (error) {
      logger.error(`Detect language error: ${error.message}`);
      return 'en';
    }
  }

  /**
   * Get translation management (admin)
   */
  static async getTranslationStatus() {
    try {
      const status = SUPPORTED_LANGUAGES.map(lang => ({
        language: lang,
        locale: localeData[lang] ? 'complete' : 'missing',
        stringCount: localeData[lang] ? Object.keys(localeData[lang]).length : 0
      }));

      return {
        success: true,
        supportedLanguages: SUPPORTED_LANGUAGES,
        supportedCurrencies: SUPPORTED_CURRENCIES,
        translationStatus: status
      };
    } catch (error) {
      logger.error(`Get translation status error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Bulk currency conversion
   */
  static async bulkConvertPrices(prices, targetCurrency) {
    try {
      if (!SUPPORTED_CURRENCIES.includes(targetCurrency)) {
        throw new Error(`Currency ${targetCurrency} not supported`);
      }

      const rate = EXCHANGE_RATES[targetCurrency] || 1;
      const converted = prices.map(price => ({
        originalPrice: price,
        convertedPrice: (price * rate).toFixed(2),
        currency: targetCurrency
      }));

      return { success: true, converted, exchangeRate: rate };
    } catch (error) {
      logger.error(`Bulk convert error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = InternationalizationService;
