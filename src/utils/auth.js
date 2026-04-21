export const AUTH_TOKEN_STORAGE_KEY = "mb_auth_token";
export const LEGACY_AUTH_TOKEN_STORAGE_KEY = "token";

export const getStoredAuthToken = () =>
  localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || localStorage.getItem(LEGACY_AUTH_TOKEN_STORAGE_KEY) || "";

export const storeAuthToken = (token) => {
  if (!token) {
    return;
  }

  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  localStorage.setItem(LEGACY_AUTH_TOKEN_STORAGE_KEY, token);
};

export const clearStoredAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_STORAGE_KEY);
};
