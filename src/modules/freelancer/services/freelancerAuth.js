import { getStoredAuthToken } from "../../../utils/auth";

const parseJwtPayload = (token = "") => {
  const raw = String(token || "").trim();
  const parts = raw.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + "=".repeat(padLength);
    const json = typeof atob === "function" ? atob(padded) : "";
    return json ? JSON.parse(json) : null;
  } catch (_error) {
    return null;
  }
};

export const getFreelancerAuthToken = () => {
  try {
    return getStoredAuthToken();
  } catch (_error) {
    return "";
  }
};

export const getFreelancerAuthRole = () => {
  const token = getFreelancerAuthToken();
  const payload = parseJwtPayload(token);

  const role = String(
    payload?.role || payload?.registrationType || payload?.userType || payload?.scope || ""
  )
    .trim()
    .toLowerCase();

  if (role.includes("admin")) return "admin";
  if (role.includes("provider") || role.includes("freelancer")) return "provider";
  if (role.includes("customer") || role.includes("user")) return "customer";
  return "customer";
};
