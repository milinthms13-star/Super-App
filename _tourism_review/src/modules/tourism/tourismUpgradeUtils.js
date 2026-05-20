export const TOURISM_QUICK_ACTIONS = [
  { id: "family", label: "Family Trip", icon: "👨‍👩‍👧", filters: { travelerType: "Family", category: "Family" } },
  { id: "honeymoon", label: "Honeymoon", icon: "💑", filters: { travelerType: "Couple", category: "Honeymoon" } },
  { id: "houseboat", label: "Houseboat", icon: "🛶", filters: { category: "Houseboat", destination: "Alleppey" } },
  { id: "pilgrimage", label: "Pilgrimage", icon: "🛕", filters: { category: "Pilgrimage" } },
  { id: "weekend", label: "Weekend", icon: "🌿", filters: { maxDays: 3 } },
  { id: "custom", label: "Custom Plan", icon: "✨", filters: { openCustomRequest: true } },
];

export const TRUST_FLAGS = {
  verifiedVendor: "Verified vendor",
  insuranceSupport: "Insurance support",
  emergencyContact: "Emergency contact",
  clearCancellation: "Clear cancellation",
  gstIncluded: "GST/service shown",
};

export const calculateTourismAdvance = (startPrice = 0, travelerCount = 1, paymentType = "advance") => {
  const total = Number(startPrice || 0) * Math.max(1, Number(travelerCount || 1));
  const payableNow = paymentType === "full" ? total : Math.round(total * 0.3);
  return { total, payableNow, balance: Math.max(0, total - payableNow) };
};

export const buildTourismWhatsAppMessage = (pkg, bookingForm = {}) => {
  const lines = [
    `Hi, I need details for ${pkg?.title || "this tourism package"}.`,
    pkg?.destination ? `Destination: ${pkg.destination}` : "",
    pkg?.durationDays ? `Duration: ${pkg.durationDays} days` : "",
    bookingForm.travelDate ? `Travel date: ${bookingForm.travelDate}` : "",
    bookingForm.travelerCount ? `Travelers: ${bookingForm.travelerCount}` : "",
  ].filter(Boolean);
  return encodeURIComponent(lines.join("\n"));
};

export const getPackageTrustScore = (pkg = {}) => {
  const checks = [
    Boolean(pkg.vendorVerified),
    Boolean(pkg.insuranceSupport),
    Boolean(pkg.emergencyContact),
    Boolean(pkg.cancellationPolicy),
    Boolean(pkg.gstAndServiceCharge),
  ];
  const score = checks.filter(Boolean).length;
  if (score >= 5) return { score, label: "High trust", tone: "high" };
  if (score >= 3) return { score, label: "Good trust", tone: "good" };
  return { score, label: "Trust pending", tone: "pending" };
};

export const getTourismLeadPriority = (lead = {}) => {
  const budget = Number(lead.budget || lead.estimatedBudget || 0);
  const daysToTravel = lead.startDate ? Math.ceil((new Date(lead.startDate) - new Date()) / 86400000) : 99;
  if (budget >= 50000 || daysToTravel <= 7) return { label: "Hot Lead", tone: "hot" };
  if (["negotiation", "proposal_shared"].includes(lead.status)) return { label: "Follow-up", tone: "follow" };
  return { label: "New Lead", tone: "new" };
};

export const validateTourismBooking = (form = {}) => {
  const errors = {};
  const name = String(form.customerName || "").trim();
  const email = String(form.customerEmail || "").trim();
  const phone = String(form.customerPhone || "").replace(/\D/g, "");
  const travelDate = String(form.travelDate || "").trim();

  if (name.length < 2 || name.length > 80) errors.customerName = "Enter traveler name";
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.customerEmail = "Enter valid email";
  if (phone.length < 10 || phone.length > 13) errors.customerPhone = "Enter valid phone";
  if (!travelDate) errors.travelDate = "Select travel date";
  if (travelDate && new Date(travelDate) < new Date(new Date().toDateString())) {
    errors.travelDate = "Travel date cannot be in the past";
  }
  if (Number(form.travelerCount || 0) < 1) errors.travelerCount = "At least 1 traveler required";
  return errors;
};
