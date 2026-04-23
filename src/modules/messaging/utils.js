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
