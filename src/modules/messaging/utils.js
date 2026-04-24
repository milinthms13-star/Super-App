export const getEntityId = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (value._id) {
    return getEntityId(value._id);
  }

  if (value.id) {
    return getEntityId(value.id);
  }

  return "";
};

export const getEntityEmail = (value) => {
  if (!value || typeof value === "string") {
    return "";
  }

  if (value.email) {
    return String(value.email).trim().toLowerCase();
  }

  return "";
};

export const isSameEntity = (left, right) => {
  const leftId = getEntityId(left);
  const rightId = getEntityId(right);

  if (leftId && rightId && leftId === rightId) {
    return true;
  }

  const leftEmail = getEntityEmail(left);
  const rightEmail = getEntityEmail(right);

  return Boolean(leftEmail && rightEmail && leftEmail === rightEmail);
};

const isUrlLike = (value = "") => /^(https?:\/\/|data:)/i.test(String(value || "").trim());

export const getAvatarLabel = (...values) => {
  for (const value of values) {
    const normalizedValue = String(value || "").trim();

    if (!normalizedValue || isUrlLike(normalizedValue)) {
      continue;
    }

    if (normalizedValue.length <= 2) {
      return normalizedValue.toUpperCase();
    }

    const initials = normalizedValue
      .replace(/[_@.+-]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((segment) => segment[0])
      .slice(0, 2)
      .join("");

    if (initials) {
      return initials.toUpperCase();
    }

    const compactValue = normalizedValue.replace(/[^a-zA-Z0-9]/g, "");
    if (compactValue) {
      return compactValue.slice(0, 2).toUpperCase();
    }

    return normalizedValue.slice(0, 2).toUpperCase();
  }

  return "U";
};

export const inferMessageTypeFromMimeType = (mimeType = "", { preferVoice = false } = {}) => {
  const normalizedMimeType = String(mimeType || "").toLowerCase();

  if (preferVoice && normalizedMimeType.startsWith("audio/")) {
    return "voice";
  }

  if (normalizedMimeType.startsWith("image/")) {
    return "image";
  }

  if (normalizedMimeType.startsWith("video/")) {
    return "video";
  }

  if (normalizedMimeType.startsWith("audio/")) {
    return "audio";
  }

  return "file";
};
