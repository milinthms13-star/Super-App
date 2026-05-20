export const TOURISM_QUICK_ACTIONS = [
  { id: "family", label: "Family Trip", filters: { travelerType: "Family", category: "Family" } },
  { id: "honeymoon", label: "Honeymoon", filters: { travelerType: "Couple", category: "Honeymoon" } },
  { id: "houseboat", label: "Houseboat", filters: { category: "Houseboat", destination: "Alleppey" } },
  { id: "pilgrimage", label: "Pilgrimage", filters: { category: "Pilgrimage" } },
  { id: "weekend", label: "Weekend", filters: { maxDays: 3 } },
  { id: "custom", label: "Custom Plan", filters: { openCustomRequest: true } },
];

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

export const validateTourismBooking = (form = {}) => {
  const errors = {};
  const name = String(form.customerName || "").trim();
  const email = String(form.customerEmail || "").trim();
  const phone = String(form.customerPhone || "").replace(/\D/g, "");
  const travelDate = String(form.travelDate || "").trim();
  const travelerCount = Number(form.travelerCount || 0);

  if (name.length < 2 || name.length > 80) {
    errors.customerName = "Enter traveler name";
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.customerEmail = "Enter valid email";
  }
  if (phone.length < 10 || phone.length > 13) {
    errors.customerPhone = "Enter valid phone";
  }
  if (!travelDate) {
    errors.travelDate = "Select travel date";
  }
  if (travelDate && new Date(travelDate) < new Date(new Date().toDateString())) {
    errors.travelDate = "Travel date cannot be in the past";
  }
  if (travelerCount < 1 || travelerCount > 20) {
    errors.travelerCount = "Travelers must be between 1 and 20";
  }

  return errors;
};
