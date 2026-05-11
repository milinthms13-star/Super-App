export const MODULE_PATHS = {
  dashboard: "/dashboard",
  "admin-dashboard": "/admin-dashboard",
  ecommerce: "/ecommerce",
  cart: "/cart",
  orders: "/orders",
  returns: "/returns",
  messaging: "/messaging",
  classifieds: "/classifieds",
  realestate: "/realestate",
  finance: "/finance",
  freelancer: "/freelancer",
  billpay: "/billpay",
  skilllearning: "/skilllearning",
  fooddelivery: "/fooddelivery",
  devadarshan: "/devadarshan",
  hyperlocal: "/hyperlocal",
  localmarket: "/localmarket",
  ridesharing: "/ridesharing",
  maps: "/maps",
  matrimonial: "/matrimonial",
  socialmedia: "/socialmedia",
  reminderalert: "/reminderalert",
  quicklinks: "/quicklinks",
  diary: "/diary",
  sosalert: "/sosalert",
  astrology: "/astrology",
  support: "/support",
};

const MODULE_ID_ALIASES = {
  quicklink: "quicklinks",
  "quick-links": "quicklinks",
  mydiary: "diary",
  personaldiary: "diary",
  map: "maps",
  loans: "finance",
  financehub: "finance",
  freelancers: "freelancer",
  worklink: "freelancer",
  nilaworks: "freelancer",
  proconnect: "freelancer",
  skillhub: "skilllearning",
  skills: "skilllearning",
  learning: "skilllearning",
  skillearning: "skilllearning",
  careerhub: "skilllearning",
  utility: "billpay",
  utilities: "billpay",
  bbps: "billpay",
  billpayment: "billpay",
  utilityhub: "billpay",
  hyperlocaldelivery: "hyperlocal",
  "hyperlocal-delivery": "hyperlocal",
  deliveryhub: "hyperlocal",
  instamart: "hyperlocal",
  dunzo: "hyperlocal",
  templebooking: "devadarshan",
  eventbooking: "devadarshan",
  hallbooking: "devadarshan",
  vazhipadu: "devadarshan",
  poojalink: "devadarshan",
  blessinghub: "devadarshan",
};

export const normalizeModuleId = (moduleId = "") => {
  const normalizedId = String(moduleId || "").trim().toLowerCase();
  return MODULE_ID_ALIASES[normalizedId] || normalizedId;
};

export const ROUTABLE_MODULES = new Set(Object.keys(MODULE_PATHS));

export const getProtectedModuleFromPathname = (pathname = "") =>
  normalizeModuleId(
    String(pathname)
    .split("/")
    .filter(Boolean)[0] || ""
  );

export const getPathForModule = (moduleId = "", fallbackPath = MODULE_PATHS.dashboard) =>
  MODULE_PATHS[normalizeModuleId(moduleId)] || fallbackPath;
