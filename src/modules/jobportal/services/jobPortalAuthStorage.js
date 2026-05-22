import { getStoredAuthToken } from "../../../utils/auth";

let tokenCache = "";

const syncFromLegacyStore = () => {
  const legacyToken = String(getStoredAuthToken() || "").trim();
  if (legacyToken) {
    tokenCache = legacyToken;
  }
  return tokenCache;
};

export const jobPortalAuthStorage = {
  initialize: () => syncFromLegacyStore(),
  getToken: () => syncFromLegacyStore(),
  setToken: (value) => {
    tokenCache = String(value || "").trim();
  },
};

export default jobPortalAuthStorage;
