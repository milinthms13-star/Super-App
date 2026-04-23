import { API_ORIGIN } from "../../utils/api";

const IMAGE_URL_PATTERN = /^(https?:|data:|blob:)/i;

const resolveStringImage = (image) => {
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

export const resolveProductImageSrc = (image, variants = null, preferredVariant = "medium") => {
  const variantSource =
    typeof variants === "object" && variants
      ? variants[preferredVariant] || variants.webp || variants.large || variants.original || ""
      : "";

  if (variantSource) {
    return resolveStringImage(variantSource);
  }

  if (image && typeof image === "object") {
    return resolveStringImage(
      image[preferredVariant] || image.webp || image.large || image.original || image.url || ""
    );
  }

  return resolveStringImage(image);
};

export const hasProductImage = (image, variants = null) => Boolean(resolveProductImageSrc(image, variants));
