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
      'nilaaihub.badge': 'Nila AI Hub',
      'nilaaihub.hero.title': 'Your AI Assistant for Local & Gulf Services',
      'nilaaihub.hero.subtitle': 'Get personalized recommendations, instant answers, and smart assistance for travel, finance, jobs, and more.',
      'nilaaihub.getStarted': 'Get Started',
      'nilaaihub.insight.servicematches': 'Service Matches',
      'nilaaihub.insight.growthtips': 'Growth Tips',
      'nilaaihub.insight.loanoptions': 'Loan Options',
      'nilaaihub.search.title': 'Ask Nila AI',
      'nilaaihub.search.subtitle': 'Get instant answers and personalized recommendations',
      'nilaaihub.search.placeholder': 'Ask anything about local services, Gulf visas, loans...',
      'nilaaihub.search.button': 'Ask AI',
      'nilaaihub.topic.gulfvisaguidance': 'Gulf visa guidance',
      'nilaaihub.topic.businessminiappideas': 'Business mini app ideas',
      'nilaaihub.topic.localservicepricing': 'Local service pricing',
      'nilaaihub.topic.jobopportunities': 'Job opportunities',
      'nilaaihub.topic.dailyreminders': 'Daily reminders',
      'nilaaihub.topic.healthtravelsupport': 'Health & travel support',
      'nilaaihub.quickActions.title': 'Quick Actions',
      'nilaaihub.quickActions.askquestion.title': 'Ask a Question',
      'nilaaihub.quickActions.askquestion.subtitle': 'Get instant answers for travel, services, finance, and more.',
      'nilaaihub.quickActions.plantrip.title': 'Plan a Trip',
      'nilaaihub.quickActions.plantrip.subtitle': 'Create travel plans with visa, flight, and itinerary suggestions.',
      'nilaaihub.quickActions.managetasks.title': 'Manage Tasks',
      'nilaaihub.quickActions.managetasks.subtitle': 'Set reminders, follow up on requests, and track your day.',
      'nilaaihub.quickActions.searchservices.title': 'Search Services',
      'nilaaihub.quickActions.searchservices.subtitle': 'Find local vendors, agents, jobs, and support quickly.',
      'nilaaihub.assistants.title': 'AI Assistants',
      'nilaaihub.assistants.subtitle': 'Specialized AI helpers for your specific needs',
      'nilaaihub.assistants.loan.title': 'Loan & Government Scheme Assistant',
      'nilaaihub.assistants.loan.description': 'Get eligibility checks, scheme comparisons, and application support.',
      'nilaaihub.assistants.gulf.title': 'Gulf Services Assistant',
      'nilaaihub.assistants.gulf.description': 'Find visa, immigration, and travel service recommendations tailored to your profile.',
      'nilaaihub.assistants.gulfjobs.title': 'Gulf Jobs Assistant',
      'nilaaihub.assistants.gulfjobs.description': 'Search jobs, verify employer details, and understand visa-linked hiring support.',
      'nilaaihub.assistants.localjobs.title': 'Local Jobs Assistant',
      'nilaaihub.assistants.localjobs.description': 'Discover local hiring leads, contract work, and community-based job options.',
      'nilaaihub.assistants.healthtravel.title': 'Health & Travel Assistant',
      'nilaaihub.assistants.healthtravel.description': 'Plan safe travel, insurance, and healthcare services for your journey.',
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
      'error': 'कुछ गलत हो गया',

      // NilaAIHub
      'nilaaihub.badge': 'AI-संचालित',
      'nilaaihub.hero.title': 'स्थानीय और गल्फ सेवाओं के लिए आपका AI सहायक',
      'nilaaihub.hero.subtitle': 'यात्रा, वित्त, नौकरियों और अधिक के लिए व्यक्तिगत सिफारिशें, त्वरित उत्तर और स्मार्ट सहायता प्राप्त करें।',
      'nilaaihub.getStarted': 'शुरू करें',
      'nilaaihub.insights.serviceMatches': 'सेवा मिलान',
      'nilaaihub.insights.growthTips': 'वृद्धि युक्तियाँ',
      'nilaaihub.insights.loanOptions': 'ऋण विकल्प',
      'nilaaihub.search.title': 'निला AI से पूछें',
      'nilaaihub.search.subtitle': 'त्वरित उत्तर और व्यक्तिगत सिफारिशें प्राप्त करें',
      'nilaaihub.search.placeholder': 'स्थानीय सेवाओं, गल्फ वीजा, ऋण आदि के बारे में कुछ भी पूछें...',
      'nilaaihub.search.button': 'AI से पूछें',
      'nilaaihub.topics.title': 'लोकप्रिय विषय',
      'nilaaihub.quickActions.title': 'त्वरित कार्य',
      'nilaaihub.quickActions.askQuestion.title': 'एक प्रश्न पूछें',
      'nilaaihub.quickActions.askQuestion.subtitle': 'यात्रा, सेवाओं, वित्त और अधिक के लिए त्वरित उत्तर प्राप्त करें।',
      'nilaaihub.quickActions.planTrip.title': 'यात्रा की योजना बनाएं',
      'nilaaihub.quickActions.planTrip.subtitle': 'वीजा, उड़ान और यात्रा कार्यक्रम सुझावों के साथ यात्रा योजनाएँ बनाएं।',
      'nilaaihub.quickActions.manageTasks.title': 'कार्य प्रबंधित करें',
      'nilaaihub.quickActions.manageTasks.subtitle': 'अनुस्मारक सेट करें, अनुरोधों का पालन करें और अपना दिन ट्रैक करें।',
      'nilaaihub.quickActions.searchServices.title': 'सेवाएँ खोजें',
      'nilaaihub.quickActions.searchServices.subtitle': 'स्थानीय विक्रेताओं, एजेंटों, नौकरियों और सहायता को जल्दी ढूंढें।',
      'nilaaihub.assistants.title': 'AI सहायक',
      'nilaaihub.assistants.subtitle': 'आपकी विशिष्ट आवश्यकताओं के लिए विशेषीकृत AI सहायक',
      'nilaaihub.assistants.loan.title': 'ऋण और सरकारी योजना सहायक',
      'nilaaihub.assistants.loan.description': 'पात्रता जांच, योजना तुलना और आवेदन सहायता प्राप्त करें।',
      'nilaaihub.assistants.gulf.title': 'गल्फ सेवाएँ सहायक',
      'nilaaihub.assistants.gulf.description': 'आपकी प्रोफ़ाइल के अनुरूप वीजा, प्रवास और यात्रा सेवा सिफारिशें ढूंढें।',
      'nilaaihub.chat.title': 'AI चैट सत्र',
      'nilaaihub.chat.subtitle': 'निला AI के साथ आपकी बातचीत',
      'nilaaihub.chat.placeholder': 'अपना संदेश टाइप करें...',
      'nilaaihub.chat.send': 'भेजें',
      'nilaaihub.chat.copy': 'कॉपी',
      'nilaaihub.chat.suggestions': 'सुझाए गए प्रॉम्प्ट',
      'nilaaihub.recommendations.title': 'व्यक्तिगत सिफारिशें',
      'nilaaihub.recommendations.subtitle': 'आपकी प्रोफ़ाइल और हाल की गतिविधि के आधार पर',
      'nilaaihub.loading': 'AI प्रतिक्रिया लोड हो रही है...',
      'nilaaihub.error': 'AI प्रतिक्रिया प्राप्त करने में विफल। कृपया पुनः प्रयास करें।',
      'nilaaihub.empty': 'इस समय कोई सिफारिशें उपलब्ध नहीं हैं।'
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
      'error': 'ஏதோ தவறு',

      // NilaAIHub
      'nilaaihub.badge': 'AI-இயக்கப்படுகிறது',
      'nilaaihub.hero.title': 'உள்ளூரிய மற்றும் கல்ப் சேவைகளுக்கு உங்கள் AI உதவியாளர்',
      'nilaaihub.hero.subtitle': 'பயணம், நிதி, வேலைகள் மற்றும் மேலும் வழங்குவதற்கு தனிப்பயன் பரிந்துரைகள், உடனடி பதில்கள் மற்றும் ஸ்மார்ட் உதவி பெறுங்கள்.',
      'nilaaihub.getStarted': 'தொடங்கு',
      'nilaaihub.insights.serviceMatches': 'சேவை பொருத்தங்கள்',
      'nilaaihub.insights.growthTips': 'வளர்ச்சி குறிப்புகள்',
      'nilaaihub.insights.loanOptions': 'கடன் விருப்பங்கள்',
      'nilaaihub.search.title': 'நிலா AI-யிடம் கேளுங்கள்',
      'nilaaihub.search.subtitle': 'உடனடி பதில்கள் மற்றும் தனிப்பயன் பரிந்துரைகள் பெறுங்கள்',
      'nilaaihub.search.placeholder': 'உள்ளூரிய சேவைகள், கல்ப் விசா, கடன்கள் போன்றவற்றைப் பற்றி எதையும் கேளுங்கள்...',
      'nilaaihub.search.button': 'AI-யிடம் கேளுங்கள்',
      'nilaaihub.topics.title': 'பிரபலமான தலைப்புகள்',
      'nilaaihub.quickActions.title': 'விரைவு செயல்கள்',
      'nilaaihub.quickActions.askQuestion.title': 'ஒரு கேள்வி கேளுங்கள்',
      'nilaaihub.quickActions.askQuestion.subtitle': 'பயணம், சேவைகள், நிதி மற்றும் மேலும் உடனடி பதில்கள் பெறுங்கள்.',
      'nilaaihub.quickActions.planTrip.title': 'பயணத்தைத் திட்டமிடுங்கள்',
      'nilaaihub.quickActions.planTrip.subtitle': 'விசா, விமானம் மற்றும் பயண அட்டவணை பரிந்துரைகளுடன் பயணத் திட்டங்களை உருவாக்குங்கள்.',
      'nilaaihub.quickActions.manageTasks.title': 'பணிகளை நிர்வகிக்கவும்',
      'nilaaihub.quickActions.manageTasks.subtitle': 'நினைவூட்டல்களை அமைக்கவும், கோரிக்கைகளை பின்தொடரவும், உங்கள் நாளை கண்காணிக்கவும்.',
      'nilaaihub.quickActions.searchServices.title': 'சேவைகளைத் தேடுங்கள்',
      'nilaaihub.quickActions.searchServices.subtitle': 'உள்ளூரிய விற்பனையாளர்கள், முகவர்கள், வேலைகள் மற்றும் உதவியை விரைவாகக் கண்டறியவும்.',
      'nilaaihub.assistants.title': 'AI உதவியாளர்கள்',
      'nilaaihub.assistants.subtitle': 'உங்கள் குறிப்பிட்ட தேவைகளுக்கு சிறப்பாக்கப்பட்ட AI உதவியாளர்கள்',
      'nilaaihub.assistants.loan.title': 'கடன் மற்றும் அரசு திட்ட உதவியாளர்',
      'nilaaihub.assistants.loan.description': 'தகுதி சரிபார்ப்புகள், திட்ட ஒப்பீடுகள் மற்றும் விண்ணப்ப உதவி பெறுங்கள்.',
      'nilaaihub.assistants.gulf.title': 'கல்ப் சேவைகள் உதவியாளர்',
      'nilaaihub.assistants.gulf.description': 'உங்கள் சுயவிவரத்திற்கு ஏற்ற விசா, குடியேற்றம் மற்றும் பயண சேவை பரிந்துரைகளைக் கண்டறியவும்.',
      'nilaaihub.chat.title': 'AI அரட்டை அமர்வு',
      'nilaaihub.chat.subtitle': 'நிலா AI-யுடன் உங்கள் உரையாடல்',
      'nilaaihub.chat.placeholder': 'உங்கள் செய்தியைத் தட்டச்சு செய்யுங்கள்...',
      'nilaaihub.chat.send': 'அனுப்பு',
      'nilaaihub.chat.copy': 'நகலெடு',
      'nilaaihub.chat.suggestions': 'பரிந்துரைக்கப்பட்ட ப்ராம்ப்டுகள்',
      'nilaaihub.recommendations.title': 'தனிப்பயன் பரிந்துரைகள்',
      'nilaaihub.recommendations.subtitle': 'உங்கள் சுயவிவரம் மற்றும் சமீபத்திய செயல்பாட்டின் அடிப்படையில்',
      'nilaaihub.loading': 'AI பதில் ஏற்றப்படுகிறது...',
      'nilaaihub.error': 'AI பதில் பெறுவதில் தோல்வி. மீண்டும் முயற்சிக்கவும்.',
      'nilaaihub.empty': 'இப்போது பரிந்துரைகள் எதுவும் கிடைக்கவில்லை.'
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
      'error': 'حدث خطأ ما',

      // NilaAIHub
      'nilaaihub.badge': 'مدعوم بالذكاء الاصطناعي',
      'nilaaihub.hero.title': 'مساعد الذكاء الاصطناعي الخاص بك للخدمات المحلية والخليجية',
      'nilaaihub.hero.subtitle': 'احصل على توصيات مخصصة، إجابات فورية، ومساعدة ذكية للسفر، المال، الوظائف، والمزيد.',
      'nilaaihub.getStarted': 'ابدأ',
      'nilaaihub.insights.serviceMatches': 'تطابقات الخدمات',
      'nilaaihub.insights.growthTips': 'نصائح النمو',
      'nilaaihub.insights.loanOptions': 'خيارات القروض',
      'nilaaihub.search.title': 'اسأل نيلاء AI',
      'nilaaihub.search.subtitle': 'احصل على إجابات فورية وتوصيات مخصصة',
      'nilaaihub.search.placeholder': 'اسأل عن أي شيء حول الخدمات المحلية، تأشيرات الخليج، القروض...',
      'nilaaihub.search.button': 'اسأل AI',
      'nilaaihub.topics.title': 'المواضيع الشائعة',
      'nilaaihub.quickActions.title': 'الإجراءات السريعة',
      'nilaaihub.quickActions.askQuestion.title': 'اطرح سؤالاً',
      'nilaaihub.quickActions.askQuestion.subtitle': 'احصل على إجابات فورية للسفر، الخدمات، المال، والمزيد.',
      'nilaaihub.quickActions.planTrip.title': 'خطط لرحلة',
      'nilaaihub.quickActions.planTrip.subtitle': 'أنشئ خطط سفر مع اقتراحات التأشيرات، الرحلات، وجدول الرحلة.',
      'nilaaihub.quickActions.manageTasks.title': 'إدارة المهام',
      'nilaaihub.quickActions.manageTasks.subtitle': 'ضع تذكيرات، تابِع الطلبات، وتتبع يومك.',
      'nilaaihub.quickActions.searchServices.title': 'البحث عن الخدمات',
      'nilaaihub.quickActions.searchServices.subtitle': 'ابحث بسرعة عن البائعين المحليين، الوكلاء، الوظائف، والدعم.',
      'nilaaihub.assistants.title': 'مساعدو الذكاء الاصطناعي',
      'nilaaihub.assistants.subtitle': 'مساعدو ذكاء اصطناعي متخصصون لاحتياجاتك الخاصة',
      'nilaaihub.assistants.loan.title': 'مساعد القروض والبرامج الحكومية',
      'nilaaihub.assistants.loan.description': 'احصل على فحوصات الأهلية، مقارنات البرامج، ودعم الطلبات.',
      'nilaaihub.assistants.gulf.title': 'مساعد خدمات الخليج',
      'nilaaihub.assistants.gulf.description': 'ابحث عن توصيات خدمات التأشيرات، الهجرة، والسفر المخصصة لملفك الشخصي.',
      'nilaaihub.chat.title': 'جلسة الدردشة بالذكاء الاصطناعي',
      'nilaaihub.chat.subtitle': 'محادثتك مع نيلاء AI',
      'nilaaihub.chat.placeholder': 'اكتب رسالتك...',
      'nilaaihub.chat.send': 'إرسال',
      'nilaaihub.chat.copy': 'نسخ',
      'nilaaihub.chat.suggestions': 'الاقتراحات المقترحة',
      'nilaaihub.recommendations.title': 'التوصيات الشخصية',
      'nilaaihub.recommendations.subtitle': 'بناءً على ملفك الشخصي ونشاطك الأخير',
      'nilaaihub.loading': 'جارٍ تحميل رد الذكاء الاصطناعي...',
      'nilaaihub.error': 'فشل في الحصول على رد الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.',
      'nilaaihub.empty': 'لا توجد توصيات متاحة في الوقت الحالي.'
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

