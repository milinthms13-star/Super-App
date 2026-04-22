import { API_ORIGIN } from "../../utils/api";

const IMAGE_URL_PATTERN = /^(https?:|data:|blob:)/i;

export const resolveProductImageSrc = (image) => {
  const normalizedImage = String(image || "").trim();
  if (!normalizedImage) {
    return "";
  }

  if (IMAGE_URL_PATTERN.test(normalizedImage)) {
    return normalizedImage;
  }

  if (normalizedImage.startsWith("/")) {
    return `${API_ORIGIN}${normalizedImage}`;
  }

  if (normalizedImage.startsWith("uploads/")) {
    return `${API_ORIGIN}/${normalizedImage}`;
  }

  return "";
};

export const hasProductImage = (image) => Boolean(resolveProductImageSrc(image));
