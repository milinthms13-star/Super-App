const memoryStore = {};

const canUseLocalStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const hyperlocalStorage = {
  getItem(key) {
    if (!key) return null;
    try {
      if (canUseLocalStorage()) return window.localStorage.getItem(key);
    } catch (_error) {
      // ignore
    }
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
  },
  setItem(key, value) {
    if (!key) return;
    const normalized = String(value);
    try {
      if (canUseLocalStorage()) {
        window.localStorage.setItem(key, normalized);
        return;
      }
    } catch (_error) {
      // ignore
    }
    memoryStore[key] = normalized;
  },
  removeItem(key) {
    if (!key) return;
    try {
      if (canUseLocalStorage()) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (_error) {
      // ignore
    }
    delete memoryStore[key];
  },
  getJSON(key, fallback = null) {
    const raw = this.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (_error) {
      return fallback;
    }
  },
  setJSON(key, value) {
    this.setItem(key, JSON.stringify(value));
  },
};
