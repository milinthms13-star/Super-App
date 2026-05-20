export const TOURISM_QUICK_ACTIONS = [
  { id: "family", label: "Family Trip", filters: { travelerType: "Family", category: "Family" } },
  { id: "honeymoon", label: "Honeymoon", filters: { travelerType: "Couple", category: "Honeymoon" } },
  { id: "houseboat", label: "Houseboat", filters: { category: "Houseboat", destination: "Alleppey" } },
  { id: "pilgrimage", label: "Pilgrimage", filters: { category: "Pilgrimage" } },
  { id: "weekend", label: "Weekend", filters: { maxDays: 3 } },
  { id: "ai-planner", label: "AI Itinerary", filters: { openPlanner: true } },
  { id: "custom", label: "Custom Plan", filters: { openCustomRequest: true } },
];

const DESTINATION_SPOTS = {
  Munnar: {
    attractions: ["Top Station", "Mattupetty Dam", "Tea Museum", "Echo Point"],
    food: ["Kerala veg meals", "Malabar parotta", "Cardamom tea tasting"],
    stays: ["Tea estate villa", "4-star hill view stay", "Budget nature cottage"],
    transport: ["Private cab", "Shared sightseeing cab", "Self-drive route"],
  },
  Alleppey: {
    attractions: ["Punnamada Lake", "Kuttanad village canals", "Beach sunset point", "Local coir market"],
    food: ["Karimeen pollichathu", "Houseboat seafood menu", "Traditional sadya"],
    stays: ["Premium AC houseboat", "Backwater homestay", "Boutique lakeside resort"],
    transport: ["Houseboat boarding transfer", "Local auto + ferry", "Cab from Kochi"],
  },
  Wayanad: {
    attractions: ["Edakkal Caves", "Banasura Sagar Dam", "Pookode Lake", "Soochipara Falls"],
    food: ["Malabar biryani", "Tribal cuisine tasting", "Local spice tea"],
    stays: ["Jungle resort", "Coffee estate homestay", "Family cottage"],
    transport: ["Cab from Kozhikode", "Bike rental loops", "Day-trip shared vehicle"],
  },
  Kovalam: {
    attractions: ["Lighthouse Beach", "Hawa Beach", "Vizhinjam harbor", "Sunset promenade"],
    food: ["Beachside seafood", "Kerala fish curry", "Fresh coconut snacks"],
    stays: ["Beach view hotel", "Luxury spa resort", "Budget surf stay"],
    transport: ["Airport transfer cab", "Local tuk-tuk commute", "Coastal sightseeing cab"],
  },
};

const DEFAULT_SPOTS = {
  attractions: ["Main city highlights", "Local market walk", "Sunset point", "Cultural center visit"],
  food: ["Regional meal", "Street-food trial", "Cafe break"],
  stays: ["3-star city stay", "Homestay option", "Premium upgrade on request"],
  transport: ["Private cab", "Public + cab mix", "Self-drive route"],
};

export const buildAiTourItinerary = ({
  destination = "",
  days = 3,
  travelerType = "Family",
  budget = 0,
}) => {
  const normalizedDestination = String(destination || "").trim();
  const spotBook = DESTINATION_SPOTS[normalizedDestination] || DEFAULT_SPOTS;
  const tripDays = Math.max(1, Math.min(10, Number(days || 1)));
  const normalizedTraveler = String(travelerType || "Family").trim();
  const normalizedBudget = Math.max(0, Number(budget || 0));

  const dayPlan = Array.from({ length: tripDays }).map((_, index) => {
    const day = index + 1;
    const attraction = spotBook.attractions[index % spotBook.attractions.length];
    const meal = spotBook.food[index % spotBook.food.length];
    const stay = spotBook.stays[index % spotBook.stays.length];
    const transport = spotBook.transport[index % spotBook.transport.length];

    return {
      day,
      title: `Day ${day} Plan`,
      summary: `${attraction} with ${meal}.`,
      details: [
        `Morning: ${attraction}`,
        `Afternoon: Local experience and ${meal}`,
        `Evening: Relaxation + ${stay}`,
      ],
      transport,
      travelerNote:
        normalizedTraveler === "Couple"
          ? "Add sunset/private moments and lighter schedule."
          : normalizedTraveler === "Family"
            ? "Keep child-friendly timing with frequent breaks."
            : "Keep flexible slots for solo/group interests.",
    };
  });

  const perDayBudget = tripDays > 0 ? Math.round(normalizedBudget / tripDays) : 0;
  const confidence = normalizedDestination ? 92 : 75;

  return {
    destination: normalizedDestination || "Selected destination",
    days: tripDays,
    travelerType: normalizedTraveler,
    confidence,
    budgetSummary: {
      totalBudget: normalizedBudget,
      perDayBudget,
      recommendation:
        normalizedBudget > 0
          ? `Plan around INR ${perDayBudget.toLocaleString("en-IN")} per day including local commute and food.`
          : "Set a budget to get tighter stay + transport recommendations.",
    },
    nearby: spotBook,
    dayPlan,
  };
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
