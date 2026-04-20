export const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
export const PROFILES_PER_PAGE = 10;

export const DEFAULT_PREFERENCES = {
  ageMin: 24,
  ageMax: 31,
  religion: "Any",
  caste: "Any",
  location: "Any",
  education: "Any",
  profession: "Any",
};

export const DEFAULT_PROFILE_FORM = {
  name: "",
  email: "",
  phone: "",
  age: 29,
  gender: "Man",
  religion: "Hindu",
  caste: "Any",
  community: "Malayali",
  education: "B.Tech",
  profession: "Product Manager",
  location: "Kochi",
  maritalStatus: "Never Married",
  familyDetails: "",
  bio: "",
  languages: "Malayalam, English",
  hobbies: "Travel, Classical music, Cooking",
  hidePhone: false,
  hidePhotos: false,
  premiumOnlyContact: false,
};

export const MATCH_SCORE_WEIGHTS = {
  AGE: 25,
  RELIGION: 20,
  CASTE: 10,
  LOCATION: 15,
  EDUCATION: 15,
  PROFESSION: 15,
};

export const PROFILE_FIELD_CONSTRAINTS = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  BIO_MAX_LENGTH: 500,
  FAMILY_DETAILS_MAX_LENGTH: 1000,
  PHONE_MIN_DIGITS: 10,
  AGE_MIN: 18,
  AGE_MAX: 100,
};

export const PROFILE_ENRICHMENTS = [
  {
    community: "Malayali",
    education: "B.Tech",
    familyDetails: "Parents are retired teachers. One younger sibling settled abroad.",
    maritalStatus: "Never Married",
    phone: "+91 98765 41001",
    languages: ["Malayalam", "English", "Hindi"],
    hobbies: ["Travel", "Classical music", "Cooking"],
    privacy: { hidePhone: false, hidePhotos: false },
    premiumOnlyContact: true,
  },
  {
    community: "Punjabi",
    education: "MBBS, MD",
    familyDetails: "Close-knit family with strong emphasis on education and service.",
    maritalStatus: "Never Married",
    phone: "+91 98765 41002",
    languages: ["Hindi", "English", "Punjabi"],
    hobbies: ["Fitness", "Reading", "Community service"],
    privacy: { hidePhone: true, hidePhotos: true },
    premiumOnlyContact: true,
  },
  {
    community: "Gujarati",
    education: "LLB",
    familyDetails: "Business-oriented family that values ambition and integrity.",
    maritalStatus: "Never Married",
    phone: "+91 98765 41003",
    languages: ["Gujarati", "Hindi", "English"],
    hobbies: ["Debate", "Travel", "Cinema"],
    privacy: { hidePhone: true, hidePhotos: false },
    premiumOnlyContact: false,
  },
  {
    community: "Telugu",
    education: "B.Arch",
    familyDetails: "Warm family based in Hyderabad with roots in design and construction.",
    maritalStatus: "Never Married",
    phone: "+91 98765 41004",
    languages: ["Telugu", "English", "Hindi"],
    hobbies: ["Sketching", "Architecture", "Road trips"],
    privacy: { hidePhone: false, hidePhotos: false },
    premiumOnlyContact: false,
  },
  {
    community: "Malayali",
    education: "M.Com",
    familyDetails: "Family-first household with a balance of tradition and independence.",
    maritalStatus: "Never Married",
    phone: "+91 98765 41005",
    languages: ["Malayalam", "English"],
    hobbies: ["Temple visits", "Books", "Finance planning"],
    privacy: { hidePhone: true, hidePhotos: false },
    premiumOnlyContact: true,
  },
];
