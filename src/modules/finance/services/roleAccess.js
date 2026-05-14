// Role normalization and permission checks

const toToken = (value) => String(value || "").trim().toLowerCase();

export function normalizeRoleTokens(user = {}) {
  const tokenSet = new Set();

  const add = (value) => {
    const token = toToken(value);
    if (token) {
      tokenSet.add(token);
    }
  };

  add(user.role);
  add(user.registrationType);
  add(user.userType);

  if (Array.isArray(user.roles)) {
    user.roles.forEach(add);
  }

  if (Array.isArray(user.permissions)) {
    user.permissions.forEach(add);
  }

  if (Array.isArray(user.roleTokens)) {
    user.roleTokens.forEach(add);
  }

  if (tokenSet.has("finance_admin") || tokenSet.has("finance")) {
    tokenSet.add("admin");
  }
  if (tokenSet.has("finance_consultant")) {
    tokenSet.add("consultant");
  }
  if (tokenSet.has("institution_partner")) {
    tokenSet.add("institution");
  }

  return Array.from(tokenSet);
}

export function hasAnyRole(roleTokens = [], roles = []) {
  if (!Array.isArray(roleTokens) || !Array.isArray(roles)) {
    return false;
  }

  const available = new Set(roleTokens.map(toToken));
  return roles.some((role) => available.has(toToken(role)));
}
