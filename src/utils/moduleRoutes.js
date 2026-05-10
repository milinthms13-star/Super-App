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
  fooddelivery: "/fooddelivery",
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
