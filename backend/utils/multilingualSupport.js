/**
 * Multilingual Support for Matrimonial Module
 * Supports 10+ languages for UI, messages, and API responses
 */

const translations = {
  en: {
    // Profile
    'profile.title': 'Marriage Profile',
    'profile.edit': 'Edit Profile',
    'profile.complete': 'Complete Your Profile',
    'profile.basicDetails': 'Basic Details',
    'profile.professional': 'Professional Information',
    'profile.lifestyle': 'Lifestyle',
    'profile.family': 'Family Details',
    'profile.preferences': 'Partner Preferences',
    
    // Features
    'feature.search': 'Search Profiles',
    'feature.interests': 'Interest Requests',
    'feature.messages': 'Messages',
    'feature.matches': 'Matches',
    'feature.horoscope': 'Horoscope Matching',
    
    // Subscription
    'subscription.free': 'Free',
    'subscription.gold': 'Gold - ₹499/month',
    'subscription.premium': 'Premium - ₹999/month',
    'subscription.vip': 'VIP - ₹2999/month',
    'subscription.upgrade': 'Upgrade Now',
    'subscription.active': 'Active',
    'subscription.expired': 'Expired',
    
    // Actions
    'action.sendInterest': 'Send Interest',
    'action.viewProfile': 'View Profile',
    'action.message': 'Send Message',
    'action.block': 'Block User',
    'action.report': 'Report Profile',
    'action.accept': 'Accept',
    'action.decline': 'Decline',
    
    // Verification
    'verification.pending': 'Pending',
    'verification.verified': 'Verified',
    'verification.rejected': 'Rejected',
    'verification.uploadDocument': 'Upload Document',
    'verification.takeSelfie': 'Take Selfie',
    
    // Messages
    'message.kycRequired': 'KYC verification is required to use this feature',
    'message.premiumRequired': 'Premium subscription required',
    'message.userBlocked': 'This user has blocked you',
    'message.preferencesIncomplete': 'Please complete your partner preferences first',
    'message.limitReached': 'Daily limit reached',
    'message.success': 'Operation completed successfully',
    'message.error': 'An error occurred. Please try again.',
    
    // Errors
    'error.profileNotFound': 'Profile not found',
    'error.unauthorized': 'You are not authorized to perform this action',
    'error.serverError': 'Server error. Please try again later',
    'error.invalidInput': 'Invalid input provided',
    'error.rateLimit': 'Too many requests. Please try again later'
  },
  
  hi: {
    'profile.title': 'विवाह प्रोफाइल',
    'profile.edit': 'प्रोफाइल संपादित करें',
    'profile.complete': 'अपनी प्रोफाइल पूरी करें',
    'profile.basicDetails': 'बुनियादी विवरण',
    'profile.professional': 'व्यावसायिक जानकारी',
    'profile.lifestyle': 'जीवन शैली',
    'profile.family': 'पारिवारिक विवरण',
    'profile.preferences': 'साथी की पसंद',
    
    'feature.search': 'प्रोफाइल खोजें',
    'feature.interests': 'ब्याज के अनुरोध',
    'feature.messages': 'संदेश',
    'feature.matches': 'मैच',
    'feature.horoscope': 'राशि मिलान',
    
    'subscription.free': 'निःशुल्क',
    'subscription.gold': 'गोल्ड - ₹499/महीना',
    'subscription.premium': 'प्रीमियम - ₹999/महीना',
    'subscription.vip': 'VIP - ₹2999/महीना',
    
    'action.sendInterest': 'ब्याज भेजें',
    'action.viewProfile': 'प्रोफाइल देखें',
    'action.message': 'संदेश भेजें',
    'action.block': 'उपयोगकर्ता को ब्लॉक करें',
    'action.report': 'प्रोफाइल की रिपोर्ट करें',
    
    'message.premiumRequired': 'प्रीमियम सदस्यता आवश्यक है'
  },
  
  ta: {
    'profile.title': 'திருமண சுயவிவரம்',
    'profile.edit': 'சுயவிவரத்தைத் திருத்து',
    'feature.search': 'சுயவிவரங்களைத் தேடுக',
    'subscription.gold': 'தங்கம் - ₹499/மாதம்',
    'action.sendInterest': 'ஆர்வம் அனுப்பு'
  },
  
  te: {
    'profile.title': 'వివాహ ప్రొఫైల్',
    'profile.edit': 'ప్రొఫైల్‌ను సవరించండి',
    'feature.search': 'ప్రొఫైల్‌లను వెతకండి',
    'subscription.gold': 'గోల్డ్ - ₹499/నెల'
  },
  
  kn: {
    'profile.title': 'ಮದುವೆ ಪ್ರೊಫೈಲ್',
    'profile.edit': 'ಪ್ರೊಫೈಲ್ ಸಂಪಾದಿಸಿ',
    'feature.search': 'ಪ್ರೊಫೈಲ್ ಹುಡುಕಿ',
    'subscription.gold': 'ಗೋಲ್ಡ್ - ₹499/ತಿಂಗಳು'
  },
  
  ml: {
    'profile.title': 'വിവാഹ പ്രൊഫൈൽ',
    'profile.edit': 'പ്രൊഫൈൽ തിരുത്തുക',
    'feature.search': 'പ്രൊഫൈലുകൾ തിരയുക',
    'subscription.gold': 'സ്വർണ്ണം - ₹499/മാസം'
  },
  
  gu: {
    'profile.title': 'લગ્નની પ્રોફાઇલ',
    'profile.edit': 'પ્રોફાઇલ સંપાદિત કરો',
    'feature.search': 'પ્રોફાઇલ શોધો',
    'subscription.gold': 'ગોલ્ડ - ₹499/મહિનો'
  },
  
  bn: {
    'profile.title': 'বিবাহ প্রোফাইল',
    'profile.edit': 'প্রোফাইল সম্পাদনা করুন',
    'feature.search': 'প্রোফাইল খুঁজুন',
    'subscription.gold': 'সোনা - ₹499/মাস'
  }
};

/**
 * Get supported languages
 */
const getSupportedLanguages = () => {
  return Object.keys(translations).map(code => ({
    code,
    name: {
      'en': 'English',
      'hi': 'Hindi',
      'ta': 'Tamil',
      'te': 'Telugu',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'gu': 'Gujarati',
      'bn': 'Bengali'
    }[code]
  }));
};

/**
 * Get translation string
 */
const t = (key, language = 'en', defaultValue = null) => {
  const lang = translations[language] || translations['en'];
  return lang[key] || defaultValue || key;
};

/**
 * Translate entire object/response
 */
const translateResponse = (obj, language = 'en') => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => translateResponse(item, language));
  }

  const translated = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.startsWith('i18n.')) {
      const translationKey = value.substring(5);
      translated[key] = t(translationKey, language);
    } else if (typeof value === 'object' && value !== null) {
      translated[key] = translateResponse(value, language);
    } else {
      translated[key] = value;
    }
  }

  return translated;
};

/**
 * Detect language from request
 */
const detectLanguage = (req) => {
  const supported = Object.keys(translations);

  // Check header
  const langHeader = req.headers['accept-language']?.split(',')[0]?.split('-')[0];
  if (langHeader && supported.includes(langHeader)) {
    return langHeader;
  }

  // Check query param
  if (req.query.lang && supported.includes(req.query.lang)) {
    return req.query.lang;
  }

  // Check user preference (if stored)
  if (req.user?.language && supported.includes(req.user.language)) {
    return req.user.language;
  }

  return 'en';
};

/**
 * Middleware to attach translations to request
 */
const languageMiddleware = (req, res, next) => {
  req.language = detectLanguage(req);
  req.t = (key, defaultValue) => t(key, req.language, defaultValue);
  req.translateResponse = (obj) => translateResponse(obj, req.language);
  next();
};

/**
 * Get all messages in a language
 */
const getMessages = (language = 'en', category = null) => {
  const messages = translations[language] || translations['en'];
  if (category) {
    return Object.entries(messages)
      .filter(([key]) => key.startsWith(category + '.'))
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
  }
  return messages;
};

module.exports = {
  translations,
  getSupportedLanguages,
  t,
  translateResponse,
  detectLanguage,
  languageMiddleware,
  getMessages
};
