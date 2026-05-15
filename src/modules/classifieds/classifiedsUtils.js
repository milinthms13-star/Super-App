export const formatDateTime = (dateString) => {
  if (!dateString) return "Recently";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return "Recently";
  }
};

export const normalizeListing = (listing, index) => ({
  id: listing?.id || `tp-${index + 1}`,
  title: listing?.title || "Marketplace Listing",
  description: listing?.description || "Trusted local listing with seller details, direct chat, and location-first discovery.",
  price: Number(listing?.price || 0),
  category: listing?.category || "Electronics",
  location: listing?.location || "Kerala",
  district: listing?.district || "Ernakulam",
  pincode: String(listing?.pincode || ""),
  locality: listing?.locality || listing?.location || "Prime area",
  condition: listing?.condition || "Used",
  seller: listing?.seller || "Trusted Seller",
  sellerRole: listing?.sellerRole || "Seller",
  sellerEmail: listing?.sellerEmail || "",
  posted: listing?.posted || "2026-05-10",
  expiresAt: listing?.expiresAt || "2026-06-10",
  image: listing?.image || "Ad listing",
  featured: Boolean(listing?.featured),
  urgent: Boolean(listing?.urgent),
  verified: listing?.verified !== false,
  views: Number(listing?.views || 0),
  favorites: Number(listing?.favorites || 0),
  chats: Number(listing?.chats || 0),
  moderationStatus: listing?.moderationStatus || "approved",
  languageSupport: Array.isArray(listing?.languageSupport) && listing.languageSupport.length > 0
    ? listing.languageSupport
    : ["English", "Malayalam"],
  tags: Array.isArray(listing?.tags) && listing.tags.length > 0
    ? listing.tags
    : [listing?.category || "General", listing?.condition || "Used"],
  mapLabel: listing?.mapLabel || `${listing?.location || "Kerala"} local discovery zone`,
  contactOptions: Array.isArray(listing?.contactOptions) && listing.contactOptions.length > 0
    ? listing.contactOptions
    : ["Chat"],
  mediaGallery: Array.isArray(listing?.mediaGallery) && listing.mediaGallery.length > 0
    ? listing.mediaGallery
    : ["Primary image"],
  monetizationPlan: listing?.monetizationPlan || (listing?.featured ? "Featured" : "Free"),
  spamScore: listing?.spamScore || 0,
  spamFlags: listing?.spamFlags || [],
  responseTimeMinutes: listing?.responseTimeMinutes || (listing?.verified ? 60 : 180),
  isOnline: listing?.isOnline || false,
  priceHistory: listing?.priceHistory || [],
  reviews: listing?.reviews || [],
  followers: listing?.followers || 0,
  messages: listing?.messages || [],
});