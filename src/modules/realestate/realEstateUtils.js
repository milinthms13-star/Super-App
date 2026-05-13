import { LEAD_STAGE_OPTIONS, TITLE_DEED_OPTIONS } from "./realEstateConstants";

export const formatCompactNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

export const formatDateTime = (value) => {
  if (!value) {
    return "To be scheduled";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "To be scheduled";
  }

  return parsedDate.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const resolveErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message || error?.message || fallbackMessage;

export const calculateEMI = (amount, annualRate, tenureYears) => {
  const principalLakh = Number(amount);
  const principal = principalLakh * 100000;
  const months = Number(tenureYears) * 12;
  const monthlyRate = Number(annualRate) / 12 / 100;

  if (!principalLakh || !months || !monthlyRate) {
    return 0;
  }

  const monthlyPayment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);

  return Math.round(monthlyPayment);
};

export const getUserIdentity = (user) => {
  if (!user) {
    return {
      ownerId: "",
      sellerName: "New Partner",
    };
  }

  return {
    ownerId:
      user.id ||
      user.userId ||
      user.email ||
      user.phone ||
      user.username ||
      user.businessName ||
      user.name ||
      "",
    sellerName: user.businessName || user.name || "New Partner",
  };
};

export const getAllowedRoleModes = (user) => {
  if (!user) {
    return ["buyer"];
  }

  if (user.registrationType === "admin" || user.role === "admin") {
    return ["buyer", "admin"];
  }

  if (user.registrationType === "entrepreneur" || user.role === "business") {
    return ["buyer", "owner", "agent", "builder"];
  }

  return ["buyer"];
};

export const getPreferredRoleMode = (user) => {
  const allowedRoleModes = getAllowedRoleModes(user);

  if (allowedRoleModes.includes("admin")) {
    return "admin";
  }

  if (allowedRoleModes.includes("agent")) {
    return "agent";
  }

  return allowedRoleModes[0] || "buyer";
};

export const normalizeLeadStatus = (status) => {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "site_visit_scheduled") return "site_visit";
  if (normalized === "negotiating") return "negotiation";
  return normalized || "new";
};

const normalizeTitleDeedStatus = (value) => {
  const normalized = String(value || "").trim();
  return TITLE_DEED_OPTIONS.some((option) => option.value === normalized) ? normalized : "pending";
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return fallback;
};

export const normalizeProperty = (property, index) => {
  const priceValue =
    typeof property?.priceValue === "number"
      ? property.priceValue
      : Number(String(property?.price || "").replace(/[^0-9.]/g, "")) || 0;
  const areaSqft =
    typeof property?.areaSqft === "number"
      ? property.areaSqft
      : Number(String(property?.area || "").replace(/[^0-9.]/g, "")) || 0;
  const bedrooms =
    typeof property?.bedrooms === "number"
      ? property.bedrooms
      : Number(property?.bedrooms) || 0;
  const bathrooms =
    typeof property?.bathrooms === "number"
      ? property.bathrooms
      : Number(property?.bathrooms) || 0;
  const reviews = Array.isArray(property?.reviews) ? property.reviews : [];
  const reviewCount =
    typeof property?.reviewCount === "number" ? property.reviewCount : reviews.length;
  const rating =
    typeof property?.rating === "number"
      ? property.rating
      : reviews.length > 0
        ? reviews.reduce((sum, review) => sum + Number(review?.score || 0), 0) / reviews.length
        : 0;
  const reports = Array.isArray(property?.reports) ? property.reports : [];
  const rawGallery = Array.isArray(property?.mediaGallery) ? property.mediaGallery : [];
  const mediaGallery = rawGallery
    .map((media, mediaIndex) => ({
      id: media?.id || `media-${mediaIndex + 1}`,
      type: media?.type || "image",
      label: media?.label || "",
      url: media?.url || "",
      thumbnailUrl: media?.thumbnailUrl || "",
      order: Number(media?.order || mediaIndex),
    }))
    .filter((media) => media.url);
  const image =
    property?.image ||
    mediaGallery.find((media) => media.type === "image")?.url ||
    mediaGallery[0]?.url ||
    "";
  const listedBy = property?.listedBy || property?.sellerRole || "Owner";

  return {
    id: property?.id || property?._id || `property-${index + 1}`,
    title: property?.title || "Verified Property",
    price: property?.price || property?.priceLabel || "Price on request",
    priceLabel: property?.priceLabel || property?.price || "Price on request",
    priceValue,
    location: property?.location || "Kerala",
    locality: property?.locality || property?.location || "Prime neighborhood",
    type: property?.type || "Flat",
    intent: property?.intent || "sale",
    area: property?.area || `${areaSqft || 1200} sq ft`,
    areaSqft: areaSqft || 1200,
    carpetAreaSqft: typeof property?.carpetAreaSqft === "number" ? property.carpetAreaSqft : null,
    builtUpAreaSqft: typeof property?.builtUpAreaSqft === "number" ? property.builtUpAreaSqft : null,
    landSizeSqft: typeof property?.landSizeSqft === "number" ? property.landSizeSqft : null,
    bedrooms,
    bathrooms,
    furnishing: property?.furnishing || "Semi Furnished",
    floorNumber: typeof property?.floorNumber === "number" ? property.floorNumber : null,
    totalFloors: typeof property?.totalFloors === "number" ? property.totalFloors : null,
    parkingSpots: typeof property?.parkingSpots === "number" ? property.parkingSpots : null,
    propertyAgeYears: typeof property?.propertyAgeYears === "number" ? property.propertyAgeYears : null,
    address: property?.address || "",
    landmark: property?.landmark || "",
    image,
    mediaGallery,
    videoTourUrl: property?.videoTourUrl || mediaGallery.find((item) => item.type === "video")?.url || "",
    floorPlanUrl:
      property?.floorPlanUrl || mediaGallery.find((item) => item.type === "floor-plan")?.url || "",
    brochureUrl:
      property?.brochureUrl || mediaGallery.find((item) => item.type === "brochure")?.url || "",
    mapPreviewUrl:
      property?.mapPreviewUrl || mediaGallery.find((item) => item.type === "map")?.url || "",
    mapLocationLat: typeof property?.mapLocationLat === "number" ? property.mapLocationLat : null,
    mapLocationLng: typeof property?.mapLocationLng === "number" ? property.mapLocationLng : null,
    description:
      property?.description ||
      "Verified listing with strong local demand, transparent pricing, and responsive seller communication.",
    amenities:
      Array.isArray(property?.amenities) && property.amenities.length > 0
        ? property.amenities
        : ["Parking", "Security", "Power Backup"],
    sellerName: property?.sellerName || "Trusted Seller",
    ownerId:
      property?.ownerId ||
      property?.sellerId ||
      property?.ownerEmail ||
      property?.sellerEmail ||
      property?.sellerName ||
      `owner-${index + 1}`,
    sellerEmail: property?.sellerEmail || "",
    contactPhone: property?.contactPhone || property?.phone || "",
    whatsappNumber: property?.whatsappNumber || property?.contactPhone || "",
    sellerRole: property?.sellerRole || "Owner",
    developer: property?.developer || property?.sellerName || "Malabar Estates",
    listedBy,
    verified: property?.verified !== false,
    verificationStatus:
      property?.verificationStatus || (property?.verified === false ? "Pending" : "Verified"),
    reraNumber: property?.reraNumber || "",
    titleDeedStatus: normalizeTitleDeedStatus(property?.titleDeedStatus),
    taxReceipt: parseBoolean(property?.taxReceipt, false),
    buildingPermit: parseBoolean(property?.buildingPermit, false),
    encumbranceCertificate: parseBoolean(property?.encumbranceCertificate, false),
    featured: Boolean(property?.featured),
    postedOn: property?.postedOn || "2026-04-18",
    possession: property?.possession || "Ready to move",
    readyToMove: parseBoolean(property?.readyToMove, false),
    underConstruction: parseBoolean(property?.underConstruction, false),
    nearbySchoolKm: typeof property?.nearbySchoolKm === "number" ? property.nearbySchoolKm : null,
    nearbyHospitalKm: typeof property?.nearbyHospitalKm === "number" ? property.nearbyHospitalKm : null,
    nearbyMetroKm: typeof property?.nearbyMetroKm === "number" ? property.nearbyMetroKm : null,
    mapLabel: property?.mapLabel || `${property?.location || "Kerala"} growth corridor`,
    rating,
    reviewCount,
    premiumPlan: property?.premiumPlan || "Featured Listing",
    projectUnits: typeof property?.projectUnits === "number" ? property.projectUnits : 1,
    leads: Array.isArray(property?.leads)
      ? property.leads.map((lead, leadIndex) => ({
          id: lead?.id || `lead-${leadIndex + 1}`,
          name: lead?.name || "Buyer",
          email: lead?.email || "",
          channel: lead?.channel || "Enquiry",
          priority: lead?.priority || "Warm",
          status: normalizeLeadStatus(lead?.status),
          message: lead?.message || "",
          followUpAt: lead?.followUpAt || null,
          followUpNote: lead?.followUpNote || "",
          assignedTo: lead?.assignedTo || "",
          lastContactedAt: lead?.lastContactedAt || null,
          createdAt: lead?.createdAt || new Date().toISOString(),
          updatedAt: lead?.updatedAt || lead?.createdAt || new Date().toISOString(),
        }))
      : [],
    visits: Array.isArray(property?.visits)
      ? property.visits.map((visit, visitIndex) => ({
          id: visit?.id || `visit-${visitIndex + 1}`,
          leadId: visit?.leadId || "",
          buyerName: visit?.buyerName || "Buyer",
          buyerEmail: visit?.buyerEmail || "",
          buyerPhone: visit?.buyerPhone || "",
          scheduledAt: visit?.scheduledAt || new Date().toISOString(),
          durationMinutes: Number(visit?.durationMinutes || 45),
          mode: visit?.mode || "onsite",
          note: visit?.note || "",
          status: visit?.status || "scheduled",
          reminderAt: visit?.reminderAt || null,
          createdAt: visit?.createdAt || new Date().toISOString(),
          updatedAt: visit?.updatedAt || visit?.createdAt || new Date().toISOString(),
        }))
      : [],
    chatPreview:
      Array.isArray(property?.chatPreview) && property.chatPreview.length > 0
        ? property.chatPreview
        : [
            {
              from: property?.sellerName || "Trusted Seller",
              text: "Hello, happy to share pricing, floor plan, and tour slots.",
            },
          ],
    similarTags:
      Array.isArray(property?.similarTags) && property.similarTags.length > 0
        ? property.similarTags
        : [property?.type || "Flat", property?.location || "Kerala"],
    mediaCount:
      typeof property?.mediaCount === "number" ? property.mediaCount : mediaGallery.length || 1,
    hasVideoTour: Boolean(property?.hasVideoTour || property?.videoTourUrl),
    reviews,
    reports,
    languageSupport:
      Array.isArray(property?.languageSupport) && property.languageSupport.length > 0
        ? property.languageSupport
        : ["English", "Malayalam"],
    disputeCount:
      typeof property?.disputeCount === "number" ? property.disputeCount : reports.length,
    status: property?.status || "available",
  };
};

const REQUIRED_FORM_FIELDS = {
  title: (value) => String(value || "").trim().length >= 3,
  priceLabel: (value) => String(value || "").trim().length >= 2,
  location: (value) => String(value || "").trim().length >= 2,
  type: (value) => String(value || "").trim().length >= 2,
  areaSqft: (value) => Number(value || 0) >= 100,
};

export const validateListingForm = (formValues = {}) => {
  const fieldErrors = {};

  Object.entries(REQUIRED_FORM_FIELDS).forEach(([fieldName, validator]) => {
    if (!validator(formValues[fieldName])) {
      fieldErrors[fieldName] = "Required";
    }
  });

  if (formValues.reraNumber && String(formValues.reraNumber).trim().length < 6) {
    fieldErrors.reraNumber = "RERA number looks too short";
  }

  if (
    formValues.floorNumber &&
    formValues.totalFloors &&
    Number(formValues.floorNumber) > Number(formValues.totalFloors)
  ) {
    fieldErrors.floorNumber = "Floor cannot be greater than total floors";
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
};

export const parseMediaGalleryInput = (value = "") =>
  String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((url, index) => ({
      id: `media-input-${index + 1}`,
      type: "image",
      label: `Photo ${index + 1}`,
      url,
      order: index,
    }));

export const parseAmenitiesInput = (value = "") =>
  [...new Set(
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  )];

export const mapLeadStatusLabel = (status) =>
  LEAD_STAGE_OPTIONS.find((option) => option.value === normalizeLeadStatus(status))?.label || "New";

export const buildListingPayloadFromForm = (form, roleMode) => ({
  title: String(form.title || "").trim(),
  intent: form.intent || "sale",
  priceLabel: String(form.priceLabel || "").trim(),
  location: String(form.location || "").trim(),
  locality: String(form.locality || form.location || "").trim(),
  type: form.type || "Flat",
  areaSqft: Number(form.areaSqft) || 0,
  carpetAreaSqft: form.carpetAreaSqft ? Number(form.carpetAreaSqft) : null,
  builtUpAreaSqft: form.builtUpAreaSqft ? Number(form.builtUpAreaSqft) : null,
  landSizeSqft: form.landSizeSqft ? Number(form.landSizeSqft) : null,
  bedrooms: Number(form.bedrooms) || 0,
  bathrooms: Number(form.bathrooms) || 0,
  furnishing: form.furnishing || "Semi Furnished",
  floorNumber: form.floorNumber !== "" ? Number(form.floorNumber) : null,
  totalFloors: form.totalFloors !== "" ? Number(form.totalFloors) : null,
  parkingSpots: form.parkingSpots !== "" ? Number(form.parkingSpots) : null,
  propertyAgeYears: form.propertyAgeYears !== "" ? Number(form.propertyAgeYears) : null,
  possession: form.possession || "Ready to move",
  address: String(form.address || "").trim(),
  landmark: String(form.landmark || "").trim(),
  contactPhone: String(form.contactPhone || "").trim(),
  whatsappNumber: String(form.whatsappNumber || "").trim(),
  mapLocationLat: form.mapLocationLat !== "" ? Number(form.mapLocationLat) : null,
  mapLocationLng: form.mapLocationLng !== "" ? Number(form.mapLocationLng) : null,
  mapPreviewUrl: String(form.mapPreviewUrl || "").trim(),
  mediaGallery: parseMediaGalleryInput(form.mediaGalleryInput),
  videoTourUrl: String(form.videoTourUrl || "").trim(),
  floorPlanUrl: String(form.floorPlanUrl || "").trim(),
  brochureUrl: String(form.brochureUrl || "").trim(),
  amenities: parseAmenitiesInput(form.amenitiesInput),
  nearbySchoolKm: form.nearbySchoolKm !== "" ? Number(form.nearbySchoolKm) : null,
  nearbyHospitalKm: form.nearbyHospitalKm !== "" ? Number(form.nearbyHospitalKm) : null,
  nearbyMetroKm: form.nearbyMetroKm !== "" ? Number(form.nearbyMetroKm) : null,
  readyToMove: Boolean(form.readyToMove),
  underConstruction: Boolean(form.underConstruction),
  reraNumber: String(form.reraNumber || "").trim(),
  titleDeedStatus: form.titleDeedStatus || "pending",
  taxReceipt: Boolean(form.taxReceipt),
  buildingPermit: Boolean(form.buildingPermit),
  encumbranceCertificate: Boolean(form.encumbranceCertificate),
  description: String(form.description || "").trim(),
  roleMode,
});
