import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

// Locales
const resources = {
  en: {
    translation: {
      // Ecommerce
      'products.title': 'GlobeMart Products',
      'addToCart': 'Add to Cart',
      'outOfStock': 'Out of Stock',
      'price': 'Price',
      'mrp': 'MRP',
      'discount': 'Save {{amount}} ({{percent}}%)',
      
      // Checkout
      'checkout.title': 'Checkout',
      'deliveryAddress': 'Delivery Address',
      'paymentMethod': 'Payment Method',
      'placeOrder': 'Place Order',
      
      // Common
      'wallet.balance': 'Wallet Balance: {{amount}}',
      'loading': 'Loading...',
      'error': 'Something went wrong',

      // NilaAIHub
      'nilaaihub.badge': 'AI-Powered',
      'nilaaihub.hero.title': 'Your AI Assistant for Local & Gulf Services',
      'nilaaihub.hero.subtitle': 'Get personalized recommendations, instant answers, and smart assistance for travel, finance, jobs, and more.',
      'nilaaihub.getStarted': 'Get Started',
      'nilaaihub.insights.serviceMatches': 'Service Matches',
      'nilaaihub.insights.growthTips': 'Growth Tips',
      'nilaaihub.insights.loanOptions': 'Loan Options',
      'nilaaihub.search.title': 'Ask Nila AI',
      'nilaaihub.search.subtitle': 'Get instant answers and personalized recommendations',
      'nilaaihub.search.placeholder': 'Ask anything about local services, Gulf visas, loans...',
      'nilaaihub.search.button': 'Ask AI',
      'nilaaihub.topics.title': 'Popular Topics',
      'nilaaihub.quickActions.title': 'Quick Actions',
      'nilaaihub.quickActions.askQuestion.title': 'Ask a Question',
      'nilaaihub.quickActions.askQuestion.subtitle': 'Get instant answers for travel, services, finance, and more.',
      'nilaaihub.quickActions.planTrip.title': 'Plan a Trip',
      'nilaaihub.quickActions.planTrip.subtitle': 'Create travel plans with visa, flight, and itinerary suggestions.',
      'nilaaihub.quickActions.manageTasks.title': 'Manage Tasks',
      'nilaaihub.quickActions.manageTasks.subtitle': 'Set reminders, follow up on requests, and track your day.',
      'nilaaihub.quickActions.searchServices.title': 'Search Services',
      'nilaaihub.quickActions.searchServices.subtitle': 'Find local vendors, agents, jobs, and support quickly.',
      'nilaaihub.assistants.title': 'AI Assistants',
      'nilaaihub.assistants.subtitle': 'Specialized AI helpers for your specific needs',
      'nilaaihub.assistants.loan.title': 'Loan & Government Scheme Assistant',
      'nilaaihub.assistants.loan.description': 'Get eligibility checks, scheme comparisons, and application support.',
      'nilaaihub.assistants.gulf.title': 'Gulf Services Assistant',
      'nilaaihub.assistants.gulf.description': 'Find visa, immigration, and travel service recommendations tailored to your profile.',
      'nilaaihub.chat.title': 'AI Chat Session',
      'nilaaihub.chat.subtitle': 'Your conversation with Nila AI',
      'nilaaihub.chat.placeholder': 'Type your message...',
      'nilaaihub.chat.send': 'Send',
      'nilaaihub.chat.copy': 'Copy',
      'nilaaihub.chat.suggestions': 'Suggested prompts',
      'nilaaihub.recommendations.title': 'Personalized Recommendations',
      'nilaaihub.recommendations.subtitle': 'Based on your profile and recent activity',
      'nilaaihub.loading': 'Loading AI response...',
      'nilaaihub.error': 'Failed to get AI response. Please try again.',
      'nilaaihub.empty': 'No recommendations available at the moment.'
    }
  },
  ml: {
    translation: {
      // Ecommerce  
      'products.title': 'ഗ്ലോബ്മാർട്ട് ഉൽപ്പന്നങ്ങൾ',
      'addToCart': 'കാർട്ടിലേക്ക് ചേർക്കുക',
      'outOfStock': 'സ്റ്റോക്ക് അല്ല',
      'price': 'വില',
      'mrp': 'MRP',
      'discount': '{{percent}}% കുറവ് ({{amount}} സേവ്)',
      
      // Checkout
      'checkout.title': 'ചെക്കൗട്ട്',
      'deliveryAddress': 'ഡെലിവറി വിലാസം',
      'paymentMethod': 'പേയ്മെന്റ് രീതി',
      'placeOrder': 'ഓർഡർ സ്ഥാപിക്കുക',
      
      // Common
      'wallet.balance': 'വാലറ്റ് ബാലൻസ്: {{amount}}',
      'loading': 'ലോഡ് ചെയ്യുന്നു...',
      'error': 'എന്തോ തെറ്റായി',

      // NilaAIHub
      'nilaaihub.badge': 'AI-പവർഡ്',
      'nilaaihub.hero.title': 'ലോക്കൽ & ഗൾഫ് സർവീസുകൾക്കായുള്ള നിങ്ങളുടെ AI അസിസ്റ്റന്റ്',
      'nilaaihub.hero.subtitle': 'ട്രാവൽ, ഫിനാൻസ്, ജോബ്സ് എന്നിവയ്ക്കായി വ്യക്തിഗതമാക്കിയ റെക്കമെൻഡേഷനുകൾ, ഇൻസ്റ്റന്റ് ഉത്തരങ്ങൾ, സ്മാർട്ട് അസിസ്റ്റൻസ് എന്നിവ നേടുക.',
      'nilaaihub.getStarted': 'ആരംഭിക്കുക',
      'nilaaihub.insights.serviceMatches': 'സർവീസ് മാച്ചുകൾ',
      'nilaaihub.insights.growthTips': 'ഗ്രോത്ത് ടിപ്പുകൾ',
      'nilaaihub.insights.loanOptions': 'ലോൺ ഓപ്ഷനുകൾ',
      'nilaaihub.search.title': 'നില എഐയോട് ചോദിക്കുക',
      'nilaaihub.search.subtitle': 'ഇൻസ്റ്റന്റ് ഉത്തരങ്ങൾ, വ്യക്തിഗതമാക്കിയ റെക്കമെൻഡേഷനുകൾ നേടുക',
      'nilaaihub.search.placeholder': 'ലോക്കൽ സർവീസുകൾ, ഗൾഫ് വിസകൾ, ലോണുകൾ എന്നിവയെക്കുറിച്ച് എന്തും ചോദിക്കുക...',
      'nilaaihub.search.button': 'എഐയോട് ചോദിക്കുക',
      'nilaaihub.topics.title': 'ജനപ്രിയ വിഷയങ്ങൾ',
      'nilaaihub.quickActions.title': 'ക്വിക്ക്ം ആക്ഷനുകൾ',
      'nilaaihub.quickActions.askQuestion.title': 'ഒരു ചോദ്യം ചോദിക്കുക',
      'nilaaihub.quickActions.askQuestion.subtitle': 'ട്രാവൽ, സർവീസുകൾ, ഫിനാൻസ് എന്നിവയ്ക്കായി ഇൻസ്റ്റന്റ് ഉത്തരങ്ങൾ നേടുക.',
      'nilaaihub.quickActions.planTrip.title': 'ഒരു യാത്ര പ്ലാൻ ചെയ്യുക',
      'nilaaihub.quickActions.planTrip.subtitle': 'വിസ, ഫ്ലൈറ്റ്, ഇറ്റിനററി സജെസ്റ്റനുകൾ ഉപയോഗിച്ച് യാത്ര പ്ലാനുകൾ സൃഷ്ടിക്കുക.',
      'nilaaihub.quickActions.manageTasks.title': 'ടാസ്കുകൾ മാനേജ് ചെയ്യുക',
      'nilaaihub.quickActions.manageTasks.subtitle': 'റിമൈൻഡറുകൾ സെറ്റ് ചെയ്യുക, റിക്വസ്റ്റുകൾ ഫോളോ അപ്പ് ചെയ്യുക, നിങ്ങളുടെ ദിവസം ട്രാക്ക് ചെയ്യുക.',
      'nilaaihub.quickActions.searchServices.title': 'സർവീസുകൾ തിരയുക',
      'nilaaihub.quickActions.searchServices.subtitle': 'ലോക്കൽ വെൻഡേഴ്സ്, ഏജന്റുകൾ, ജോബ്സ്, സപ്പോർട്ട് എന്നിവ വേഗത്തിൽ കണ്ടെത്തുക.',
      'nilaaihub.assistants.title': 'എഐ അസിസ്റ്റന്റുകൾ',
      'nilaaihub.assistants.subtitle': 'നിങ്ങളുടെ പ്രത്യേക ആവശ്യങ്ങൾക്കായുള്ള സ്പെഷലൈസ്ഡ് എഐ ഹെൽപ്പേഴ്സ്',
      'nilaaihub.assistants.loan.title': 'ലോൺ & ഗവൺമെന്റ് സ്കീം അസിസ്റ്റന്റ്',
      'nilaaihub.assistants.loan.description': 'എലിജിബിലിറ്റി ചെക്കുകൾ, സ്കീം കംപാരിസനുകൾ, അപ്ലിക്കേഷൻ സപ്പോർട്ട് നേടുക.',
      'nilaaihub.assistants.gulf.title': 'ഗൾഫ് സർവീസുകൾ അസിസ്റ്റന്റ്',
      'nilaaihub.assistants.gulf.description': 'നിങ്ങളുടെ പ്രൊഫൈലിന് അനുയോജ്യമായ വിസ, ഇമ്മിഗ്രേഷൻ, യാത്ര സർവീസ് റെക്കമെൻഡേഷനുകൾ കണ്ടെത്തുക.',
      'nilaaihub.chat.title': 'എഐ ചാറ്റ് സെഷൻ',
      'nilaaihub.chat.subtitle': 'നില എഐയുമായുള്ള നിങ്ങളുടെ സംഭാഷണം',
      'nilaaihub.chat.placeholder': 'നിങ്ങളുടെ സന്ദേശം ടൈപ്പ് ചെയ്യുക...',
      'nilaaihub.chat.send': 'അയയ്ക്കുക',
      'nilaaihub.chat.copy': 'കോപ്പി',
      'nilaaihub.chat.suggestions': 'സജെസ്റ്റഡ് പ്രോംപ്റ്റുകൾ',
      'nilaaihub.recommendations.title': 'വ്യക്തിഗതമാക്കിയ റെക്കമെൻഡേഷനുകൾ',
      'nilaaihub.recommendations.subtitle': 'നിങ്ങളുടെ പ്രൊഫൈൽ, റീസെന്റ് ആക്ടിവിറ്റി അടിസ്ഥാനമാക്കി',
      'nilaaihub.loading': 'എഐ റെസ്പോൺസ് ലോഡ് ചെയ്യുന്നു...',
      'nilaaihub.error': 'എഐ റെസ്പോൺസ് നേടാൻ പരാജയപ്പെട്ടു. ദയവായി വീണ്ടും ശ്രമിക്കുക.',
      'nilaaihub.empty': 'ഇപ്പോൾ റെക്കമെൻഡേഷനുകൾ ലഭ്യമല്ല.'
    }
  },
  hi: {
    translation: {
      // Ecommerce
      'products.title': 'ग्लोबमार्ट उत्पाद',
      'addToCart': 'कार्ट में जोड़ें',
      'outOfStock': 'स्टॉक में नहीं',
      'price': 'कीमत',
      'mrp': 'MRP',
      'discount': '{{percent}}% छूट ({{amount}} बचाएं)',
      
      // Checkout
      'checkout.title': 'चेकआउट',
      'deliveryAddress': 'डिलीवरी पता',
      'paymentMethod': 'भुगतान विधि',
      'placeOrder': 'ऑर्डर दें',
      
      // Common
      'wallet.balance': 'वॉलेट बैलेंस: {{amount}}',
      'loading': 'लोड हो रहा है...',
      'error': 'कुछ गलत हो गया'
    }
  },
  ta: {
    translation: {
      // Ecommerce
      'products.title': 'கிளோப்மார்ட் பொருட்கள்',
      'addToCart': 'கார்டில் சேர்க்கவும்',
      'outOfStock': 'பங்கு இல்லை',
      'price': 'விலை',
      'mrp': 'MRP',
      'discount': '{{percent}}% தள்ளுபடி ({{amount}} சேமிக்கவும்)',
      
      // Checkout
      'checkout.title': 'செக்அவுட்',
      'deliveryAddress': 'டெலிவரி முகவரி',
      'paymentMethod': 'பரிவர்த்தனை முறை',
      'placeOrder': 'ஆர்டரை பதிவு செய்யவும்',
      
      // Common
      'wallet.balance': 'வாலெட் இருப்பு: {{amount}}',
      'loading': 'ஏற்றுகிறது...',
      'error': 'ஏதோ தவறு'
    }
  },
  ar: {
    translation: {
      // Ecommerce
      'products.title': 'منتجات GlobeMart',
      'addToCart': 'إضافة إلى السلة',
      'outOfStock': 'نفد المخزون',
      'price': 'السعر',
      'mrp': 'MRP',
      'discount': 'وفر {{amount}} ({{percent}}%)',
      
      // Checkout
      'checkout.title': 'الدفع',
      'deliveryAddress': 'عنوان التوصيل',
      'paymentMethod': 'طريقة الدفع',
      'placeOrder': 'اطلب الآن',
      
      // Common
      'wallet.balance': 'رصيد المحفظة: {{amount}}',
      'loading': 'جار التحميل...',
      'error': 'حدث خطأ'
    }
  },
  te: {
    translation: {
      // Ecommerce
      'products.title': 'గ్లోబ్‌మార్ట్ ఉత్పత్తులు',
      'addToCart': 'కార్ట్‌లో జోడించండి',
      'outOfStock': 'స్టాక్ లేదు',
      'price': 'ధర',
      'mrp': 'MRP',
      'discount': '{{percent}}% డిస్కౌంట్ ({{amount}} సేవ్)',
      
      // Checkout
      'checkout.title': 'చెక్అవుట్',
      'deliveryAddress': 'డెలివరీ చిరునామా',
      'paymentMethod': 'చెల్లింపు పద్ధతి',
      'placeOrder': 'ఆర్డర్ ఇవ్వండి',
      
      // Common
      'wallet.balance': 'వాలెట్ బ్యాలెన్స్: {{amount}}',
      'loading': 'లోడ్ అవుతోంది...',
      'error': 'ఏదో తప్పు'
    }
  },
  kn: {
    translation: {
      // Ecommerce
      'products.title': 'GlobeMart ಉತ್ಪನ್ನಗಳು',
      'addToCart': 'ಕಾರ್ಟ್‌ಗೆ ಸೇರಿಸಿ',
      'outOfStock': 'ಸ್ಟಾಕ್ ಇಲ್ಲ',
      'price': 'ಬೆಲೆ',
      'mrp': 'MRP',
      'discount': '{{percent}}% ರಿಯಾಯಿತಿ ({{amount}} ಉಳಿಸಿ)',
      
      // Checkout
      'checkout.title': 'ಚೆಕ್‌ಔಟ್',
      'deliveryAddress': 'ಡೆಲಿವರಿ ವಿಳಾಸ',
      'paymentMethod': 'ಪಾವತಿ ವಿಧಾನ',
      'placeOrder': 'ಆರ್ಡರ್ ನೀಡಿ',
      
      // Common
      'wallet.balance': 'ವಾಲೆಟ್ ಶೇಖರಣೆ: {{amount}}',
      'loading': 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
      'error': 'ಏನಾದರೂ ತಪ್ಪು'
    }
  },
  bn: {
    translation: {
      // Ecommerce
      'products.title': 'গ্লোবমার্ট প্রোডাক্ট',
      'addToCart': 'কার্টে যোগ করুন',
      'outOfStock': 'স্টক নেই',
      'price': 'মূল্য',
      'mrp': 'MRP',
      'discount': '{{percent}}% ছাড় ({{amount}} সেভ)',
      
      // Checkout
      'checkout.title': 'চেকআউট',
      'deliveryAddress': 'ডেলিভারি ঠিকানা',
      'paymentMethod': 'পেমেন্ট পদ্ধতি',
      'placeOrder': 'অর্ডার করুন',
      
      // Common
      'wallet.balance': 'ওয়ালেট ব্যালেন্স: {{amount}}',
      'loading': 'লোড হচ্ছে...',
      'error': 'কিছু ভুল হয়েছে'
    }
  }
};

i18n
  .use(HttpBackend) // Load translations dynamically
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    lng: 'en', // Default
    interpolation: {
      escapeValue: false // React handles escaping
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage']
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json' // Optional remote loading
    }
  });

export default i18n;

