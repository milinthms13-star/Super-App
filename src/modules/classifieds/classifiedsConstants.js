export const DEFAULT_AD_FORM = {
  title: "",
  description: "",
  price: "",
  category: "Electronics",
  location: "",
  district: "Ernakulam",
  pincode: "",
  condition: "Used",
  mediaCount: "4",
  plan: "free",
};

export const TRADEPOST_SEED_LISTINGS = [
  {
    id: "tp-1",
    title: "iPhone 13 Pro Max 256GB",
    description: "Excellent condition, single owner, all accessories included. Battery health 95%.",
    price: 65000,
    category: "Electronics",
    location: "Kochi",
    district: "Ernakulam",
    pincode: "682001",
    condition: "Used",
    seller: "Tech Hub Kerala",
    sellerEmail: "techhub@example.com",
    posted: "2026-05-10",
    image: "iPhone 13 Pro Max",
    featured: true,
    verified: true,
    views: 245,
    favorites: 12,
    chats: 8,
    reviews: [
      { author: "Rajesh", score: 5, comment: "Great phone, exactly as described!" },
      { author: "Priya", score: 4, comment: "Good condition, fast delivery." }
    ]
  },
  {
    id: "tp-2",
    title: "Honda Activa 5G 2022 Model",
    description: "Well maintained scooter, low mileage, insurance valid till 2027.",
    price: 75000,
    category: "Vehicles",
    location: "Thrissur",
    district: "Thrissur",
    pincode: "680001",
    condition: "Used",
    seller: "Auto Sales Kerala",
    sellerEmail: "autosales@example.com",
    posted: "2026-05-08",
    image: "Honda Activa",
    featured: false,
    verified: true,
    views: 189,
    favorites: 15,
    chats: 6,
    reviews: [
      { author: "Suresh", score: 5, comment: "Excellent bike, very honest seller." }
    ]
  },
  {
    id: "tp-3",
    title: "2BHK Apartment for Rent",
    description: "Modern 2BHK apartment in prime location, fully furnished, parking included.",
    price: 25000,
    category: "Properties",
    location: "Kozhikode",
    district: "Kozhikode",
    pincode: "673001",
    condition: "New",
    seller: "Property Solutions",
    sellerEmail: "property@example.com",
    posted: "2026-05-05",
    image: "2BHK Apartment",
    featured: true,
    verified: true,
    views: 312,
    favorites: 28,
    chats: 15,
    reviews: [
      { author: "Anjali", score: 5, comment: "Beautiful apartment, great location!" },
      { author: "Vijay", score: 4, comment: "Good amenities, responsive owner." }
    ]
  }
];