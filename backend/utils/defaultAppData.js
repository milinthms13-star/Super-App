const DEFAULT_BUSINESS_CATEGORIES = [
  { id: 'astrology', name: 'AstroNila', fee: 999, requiresFoodLicense: false },
  { id: 'ecommerce', name: 'GlobeMart', fee: 799, requiresFoodLicense: false },
  { id: 'messaging', name: 'LinkUp', fee: 999, requiresFoodLicense: false },
  { id: 'classifieds', name: 'TradePost', fee: 1299, requiresFoodLicense: false },
  { id: 'realestate', name: 'HomeSphere', fee: 1499, requiresFoodLicense: false },
  { id: 'fooddelivery', name: 'Feastly', fee: 1999, requiresFoodLicense: true },
  { id: 'ridesharing', name: 'SwiftRide', fee: 1099, requiresFoodLicense: false },
  { id: 'matrimonial', name: 'SoulMatch', fee: 1599, requiresFoodLicense: false },
  { id: 'socialmedia', name: 'VibeHub', fee: 899, requiresFoodLicense: false },
  { id: 'reminderalert', name: 'ReminderAlert', fee: 1199, requiresFoodLicense: false },
  { id: 'sosalert', name: 'SOS FRS', fee: 1399, requiresFoodLicense: false },
];

const DEFAULT_MODULE_DATA = {
  ecommerceProducts: [],
  classifiedsListings: [],
  classifiedsMessages: [],
  classifiedsReports: [],
  realestateProperties: [],
  restaurants: [],
  rideOffers: [],
  conversations: [],
  matrimonialProfiles: [],
  socialMediaPosts: [],
  socialMediaStories: [],
};

const DEFAULT_APP_DATA = {
  businessCategories: DEFAULT_BUSINESS_CATEGORIES,
  globeMartCategories: [
    {
      id: 'electronics',
      name: 'Electronics',
      theme: 'Tech Essentials',
      accentColor: '#0f4c81',
      subcategories: [
        'Mobiles & Accessories',
        'Laptops & Accessories',
        'TV & Home Entertainment',
        'Audio',
        'Cameras',
        'Computer Peripherals',
      ],
    },
    {
      id: 'fashion',
      name: 'Fashion',
      theme: 'Everyday Style',
      accentColor: '#a63a50',
      subcategories: ['Men', 'Women', 'Kids', 'Footwear', 'Bags', 'Jewellery'],
    },
    {
      id: 'home',
      name: 'Home',
      theme: 'Warm Living',
      accentColor: '#7b5e3b',
      subcategories: ['Kitchen', 'Furniture', 'Decor', 'Lighting', 'Storage'],
    },
    {
      id: 'accessories',
      name: 'Accessories',
      theme: 'Daily Add-ons',
      accentColor: '#26734d',
      subcategories: ['Chargers', 'Cases', 'Cables', 'Wearables', 'Travel Gear'],
    },
  ],
  enabledModules: DEFAULT_BUSINESS_CATEGORIES.map((category) => category.id),
  registrationApplications: [],
  registeredAccounts: [],
  moduleData: DEFAULT_MODULE_DATA,
};

module.exports = {
  DEFAULT_APP_DATA,
  DEFAULT_BUSINESS_CATEGORIES,
};
