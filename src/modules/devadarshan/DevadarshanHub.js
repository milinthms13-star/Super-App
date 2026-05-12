import React, { useEffect, useMemo, useState } from "react";
import "../../styles/DevadarshanHub.css";

const STORAGE_KEYS = {
  temples: "devadarshan_temples_v2",
  bookings: "devadarshan_bookings_v2",
  donations: "devadarshan_donations_v2",
  favorites: "devadarshan_favorites_v2",
  profile: "devadarshan_profile_v2",
  family: "devadarshan_family_v2",
  notifications: "devadarshan_notifications_v2",
  calendarNotify: "devadarshan_calendar_notify_v2",
  liveSaved: "devadarshan_live_saved_v2",
};

const NAKSHATRAS = [
  "Ashwathi",
  "Bharani",
  "Karthika",
  "Rohini",
  "Makayiram",
  "Thiruvathira",
  "Punartham",
  "Pooyam",
  "Ayilyam",
  "Makam",
  "Pooram",
  "Uthram",
  "Atham",
  "Chithira",
  "Chothi",
  "Vishakham",
  "Anizham",
  "Thrikketta",
  "Moolam",
  "Pooradam",
  "Uthradam",
  "Thiruvonam",
  "Avittam",
  "Chathayam",
  "Pooruruttathi",
  "Uthrattathi",
  "Revathi",
];

const DONATION_CATEGORIES = [
  "Annadanam",
  "Temple Maintenance",
  "Festival Fund",
  "Special Seva Donation",
];

const EVENT_TYPES = [
  "Ulsavam",
  "Ekadashi",
  "Pradosham",
  "Shivaratri",
  "Navaratri",
  "Temple Special Pooja",
];

const TEMPLE_SEED = [
  {
    id: "tmp-padmanabha",
    name: "Sree Padmanabhaswamy Temple",
    district: "Thiruvananthapuram",
    deity: "Lord Vishnu",
    templeType: "Ancient Temple",
    timings: "03:30 AM - 12:00 PM, 05:00 PM - 07:20 PM",
    contact: "+91 471 2450 233",
    officialContact: "admin@padmanabha-temple.org",
    festivals: ["Alpashy Festival", "Painkuni Festival", "Ekadashi"],
    photos: ["Sanctum Entrance", "East Fort View"],
    mapUrl: "https://maps.google.com/?q=Padmanabhaswamy+Temple",
    rules: "No mobile phones inside sanctum. Men in mundu, women in traditional attire.",
    dressCode: "Traditional Kerala attire mandatory",
    distanceKm: 3,
    popularity: 5,
    verified: true,
    liveDarshanUrl: "https://www.youtube.com/results?search_query=padmanabhaswamy+temple+live",
    poojas: [
      { name: "Archana", price: 50, prasadamSupported: true },
      { name: "Pushpanjali", price: 75, prasadamSupported: true },
      { name: "Neyvilakku", price: 100, prasadamSupported: false },
    ],
  },
  {
    id: "tmp-ganapathy-kottarakara",
    name: "Kottarakkara Mahaganapathy Temple",
    district: "Kollam",
    deity: "Lord Ganesha",
    templeType: "Maha Ganapathy Temple",
    timings: "04:00 AM - 11:00 AM, 05:00 PM - 08:00 PM",
    contact: "+91 474 2450 022",
    officialContact: "office@kottarakaraganapathy.in",
    festivals: ["Vinayaka Chaturthi", "Pradosham", "Ulsavam"],
    photos: ["Main Sreekovil", "Temple Deepasthambham"],
    mapUrl: "https://maps.google.com/?q=Kottarakkara+Mahaganapathy+Temple",
    rules: "Queue discipline mandatory. Outside food not allowed.",
    dressCode: "Decent traditional wear",
    distanceKm: 27,
    popularity: 4,
    verified: true,
    liveDarshanUrl: "https://www.youtube.com/results?search_query=kottarakkara+mahaganapathy+temple+live",
    poojas: [
      { name: "Ganapathy Homam", price: 600, prasadamSupported: true },
      { name: "Archana", price: 50, prasadamSupported: true },
      { name: "Neyvilakku", price: 120, prasadamSupported: false },
    ],
  },
  {
    id: "tmp-guruvayur",
    name: "Guruvayur Sri Krishna Temple",
    district: "Thrissur",
    deity: "Lord Krishna",
    templeType: "Krishna Temple",
    timings: "03:00 AM - 01:00 PM, 04:30 PM - 09:30 PM",
    contact: "+91 487 2556 333",
    officialContact: "info@guruvayurdevaswom.nic.in",
    festivals: ["Guruvayur Ekadashi", "Krishnashtami", "Ulsavam"],
    photos: ["Temple Entrance", "Dwajasthambam"],
    mapUrl: "https://maps.google.com/?q=Guruvayur+Temple",
    rules: "Darshan queue tokens may be required during peak season.",
    dressCode: "Traditional strict dress code",
    distanceKm: 92,
    popularity: 5,
    verified: true,
    liveDarshanUrl: "https://www.youtube.com/results?search_query=guruvayur+live+darshan",
    poojas: [
      { name: "Pushpanjali", price: 100, prasadamSupported: true },
      { name: "Palpayasam", price: 80, prasadamSupported: true },
      { name: "Special Darshan", price: 500, prasadamSupported: false },
    ],
  },
  {
    id: "tmp-ettumanoor",
    name: "Ettumanoor Mahadeva Temple",
    district: "Kottayam",
    deity: "Lord Shiva",
    templeType: "Mahadeva Temple",
    timings: "04:00 AM - 12:00 PM, 05:00 PM - 08:00 PM",
    contact: "+91 481 2532 555",
    officialContact: "ettumanoordevaswom@kerala.gov.in",
    festivals: ["Ezharaponnana", "Shivaratri", "Pradosham"],
    photos: ["Temple Front", "Festival Procession"],
    mapUrl: "https://maps.google.com/?q=Ettumanoor+Mahadeva+Temple",
    rules: "Photography restricted inside temple premises.",
    dressCode: "Mundu / saree preferred",
    distanceKm: 61,
    popularity: 4,
    verified: true,
    liveDarshanUrl: "https://www.youtube.com/results?search_query=ettumanoor+mahadeva+temple+live",
    poojas: [
      { name: "Mrityunjaya Homam", price: 900, prasadamSupported: true },
      { name: "Archana", price: 40, prasadamSupported: true },
      { name: "Rudrabhishekam", price: 1200, prasadamSupported: false },
    ],
  },
  {
    id: "tmp-chottanikkara",
    name: "Chottanikkara Bhagavathy Temple",
    district: "Ernakulam",
    deity: "Bhagavathy",
    templeType: "Devi Temple",
    timings: "04:00 AM - 12:00 PM, 04:00 PM - 08:00 PM",
    contact: "+91 484 2711 037",
    officialContact: "helpdesk@chottanikkaratemple.in",
    festivals: ["Makom Thozhal", "Navaratri", "Pradosham"],
    photos: ["Temple Gopuram", "Deeparadhana View"],
    mapUrl: "https://maps.google.com/?q=Chottanikkara+Temple",
    rules: "Separate queue for women/elderly during special days.",
    dressCode: "Traditional attire encouraged",
    distanceKm: 74,
    popularity: 5,
    verified: true,
    liveDarshanUrl: "https://www.youtube.com/results?search_query=chottanikkara+live",
    poojas: [
      { name: "Archana", price: 60, prasadamSupported: true },
      { name: "Pushpanjali", price: 120, prasadamSupported: true },
      { name: "Neyvilakku", price: 150, prasadamSupported: false },
    ],
  },
];

const FESTIVAL_SEED = [
  { id: "evt-001", templeId: "tmp-guruvayur", title: "Guruvayur Ekadashi", type: "Ekadashi", date: "2026-11-20", details: "Full-day special pooja, deepam, and bhajanam." },
  { id: "evt-002", templeId: "tmp-ettumanoor", title: "Shivaratri Special", type: "Shivaratri", date: "2026-02-15", details: "All-night Shiva pooja and cultural programs." },
  { id: "evt-003", templeId: "tmp-chottanikkara", title: "Navaratri Utsavam", type: "Navaratri", date: "2026-10-10", details: "Nine-day pooja, vidyarambham support." },
  { id: "evt-004", templeId: "tmp-padmanabha", title: "Painkuni Festival", type: "Ulsavam", date: "2026-03-25", details: "Traditional procession and special offerings." },
  { id: "evt-005", templeId: "tmp-ganapathy-kottarakara", title: "Pradosham Pooja", type: "Pradosham", date: "2026-06-03", details: "Evening special pooja with prasadam." },
];

const INITIAL_PROFILE = {
  primaryNakshatra: "",
  preferredPooja: "Archana",
  phone: "",
  reminderBirthday: true,
  reminderMonthly: true,
  reminderYearly: true,
};

const INITIAL_BOOKING_FORM = {
  templeId: "",
  poojaType: "Archana",
  devoteeName: "",
  familyMember: "",
  nakshatra: "",
  bookingDate: "",
  quantity: 1,
  prasadamOption: "No prasadam",
  deliveryMode: "Temple Pickup",
  deliveryAddress: "",
  paymentMethod: "UPI",
  notes: "",
};

const INITIAL_DONATION_FORM = {
  templeId: "",
  category: DONATION_CATEGORIES[0],
  amount: 500,
  purpose: "",
  paymentMethod: "UPI",
};

const INITIAL_ADMIN_TEMPLE_FORM = {
  name: "",
  district: "",
  deity: "",
  contact: "",
  timings: "",
  dressCode: "",
  poojaName: "",
  poojaPrice: "",
};

const INITIAL_ADMIN_EVENT_FORM = {
  templeId: "",
  title: "",
  type: EVENT_TYPES[0],
  date: "",
  details: "",
};

const SECTION_ORDER = [
  { id: "dashboard", label: "Dashboard" },
  { id: "directory", label: "Temples" },
  { id: "booking", label: "Vazhipadu" },
  { id: "calendar", label: "Calendar" },
  { id: "donation", label: "Donation" },
  { id: "my", label: "My Devadarshan" },
  { id: "profile", label: "Profile" },
  { id: "live", label: "Live Darshan" },
  { id: "admin", label: "Admin" },
];

const parseStorage = (value, fallback) => {
  try {
    if (!value) return fallback;
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const generateId = (prefix) => `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
const formatINR = (value) => `INR ${Number(value || 0).toLocaleString("en-IN")}`;

const downloadText = (filename, content) => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const DevadarshanHub = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [searchTemple, setSearchTemple] = useState("");
  const [selectedTempleId, setSelectedTempleId] = useState(TEMPLE_SEED[0].id);

  const [districtFilter, setDistrictFilter] = useState("All");
  const [deityFilter, setDeityFilter] = useState("All");
  const [templeTypeFilter, setTempleTypeFilter] = useState("All");
  const [poojaFilter, setPoojaFilter] = useState("All");
  const [festivalFilter, setFestivalFilter] = useState("All");
  const [distanceFilter, setDistanceFilter] = useState(200);
  const [minPopularity, setMinPopularity] = useState(1);

  const [temples, setTemples] = useState(() =>
    parseStorage(window.localStorage.getItem(STORAGE_KEYS.temples), TEMPLE_SEED)
  );
  const [bookings, setBookings] = useState(() =>
    parseStorage(window.localStorage.getItem(STORAGE_KEYS.bookings), [])
  );
  const [donations, setDonations] = useState(() =>
    parseStorage(window.localStorage.getItem(STORAGE_KEYS.donations), [])
  );
  const [favoriteTempleIds, setFavoriteTempleIds] = useState(() =>
    parseStorage(window.localStorage.getItem(STORAGE_KEYS.favorites), [])
  );
  const [profile, setProfile] = useState(() =>
    parseStorage(window.localStorage.getItem(STORAGE_KEYS.profile), INITIAL_PROFILE)
  );
  const [familyMembers, setFamilyMembers] = useState(() =>
    parseStorage(window.localStorage.getItem(STORAGE_KEYS.family), [])
  );
  const [notifications, setNotifications] = useState(() =>
    parseStorage(window.localStorage.getItem(STORAGE_KEYS.notifications), [])
  );
  const [notifyEventIds, setNotifyEventIds] = useState(() =>
    parseStorage(window.localStorage.getItem(STORAGE_KEYS.calendarNotify), [])
  );
  const [savedLiveTempleIds, setSavedLiveTempleIds] = useState(() =>
    parseStorage(window.localStorage.getItem(STORAGE_KEYS.liveSaved), [])
  );

  const [festivalEvents, setFestivalEvents] = useState(FESTIVAL_SEED);
  const [bookingForm, setBookingForm] = useState(INITIAL_BOOKING_FORM);
  const [donationForm, setDonationForm] = useState(INITIAL_DONATION_FORM);
  const [familyForm, setFamilyForm] = useState({ name: "", nakshatra: "" });
  const [adminTempleForm, setAdminTempleForm] = useState(INITIAL_ADMIN_TEMPLE_FORM);
  const [adminEventForm, setAdminEventForm] = useState(INITIAL_ADMIN_EVENT_FORM);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.temples, JSON.stringify(temples));
  }, [temples]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.bookings, JSON.stringify(bookings));
  }, [bookings]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.donations, JSON.stringify(donations));
  }, [donations]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favoriteTempleIds));
  }, [favoriteTempleIds]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
  }, [profile]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.family, JSON.stringify(familyMembers));
  }, [familyMembers]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notifications));
  }, [notifications]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.calendarNotify, JSON.stringify(notifyEventIds));
  }, [notifyEventIds]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.liveSaved, JSON.stringify(savedLiveTempleIds));
  }, [savedLiveTempleIds]);

  const showStatus = (message) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(""), 5000);
  };

  const districtOptions = useMemo(
    () => ["All", ...new Set(temples.map((item) => item.district))],
    [temples]
  );
  const deityOptions = useMemo(
    () => ["All", ...new Set(temples.map((item) => item.deity))],
    [temples]
  );
  const templeTypeOptions = useMemo(
    () => ["All", ...new Set(temples.map((item) => item.templeType))],
    [temples]
  );
  const poojaOptions = useMemo(
    () => ["All", ...new Set(temples.flatMap((item) => item.poojas.map((pooja) => pooja.name)))],
    [temples]
  );
  const festivalOptions = useMemo(
    () => ["All", ...new Set(temples.flatMap((item) => item.festivals))],
    [temples]
  );

  const filteredTemples = useMemo(() => {
    const query = searchTemple.trim().toLowerCase();
    return temples.filter((temple) => {
      const districtMatch = districtFilter === "All" || temple.district === districtFilter;
      const deityMatch = deityFilter === "All" || temple.deity === deityFilter;
      const typeMatch = templeTypeFilter === "All" || temple.templeType === templeTypeFilter;
      const poojaMatch =
        poojaFilter === "All" || temple.poojas.some((pooja) => pooja.name === poojaFilter);
      const festivalMatch =
        festivalFilter === "All" || temple.festivals.includes(festivalFilter);
      const distanceMatch = temple.distanceKm <= Number(distanceFilter);
      const popularityMatch = temple.popularity >= Number(minPopularity);
      const textMatch =
        !query ||
        `${temple.name} ${temple.district} ${temple.deity}`.toLowerCase().includes(query);
      return (
        districtMatch &&
        deityMatch &&
        typeMatch &&
        poojaMatch &&
        festivalMatch &&
        distanceMatch &&
        popularityMatch &&
        textMatch
      );
    });
  }, [
    temples,
    searchTemple,
    districtFilter,
    deityFilter,
    templeTypeFilter,
    poojaFilter,
    festivalFilter,
    distanceFilter,
    minPopularity,
  ]);

  const selectedTemple = useMemo(
    () => temples.find((item) => item.id === selectedTempleId) || temples[0],
    [temples, selectedTempleId]
  );

  const selectedTemplePoojas = useMemo(
    () => selectedTemple?.poojas || [],
    [selectedTemple]
  );
  const availablePoojaNames = useMemo(
    () => selectedTemplePoojas.map((item) => item.name),
    [selectedTemplePoojas]
  );

  useEffect(() => {
    if (!selectedTemple) return;
    setBookingForm((current) => {
      const safeTempleId = current.templeId || selectedTemple.id;
      const safePooja = availablePoojaNames.includes(current.poojaType)
        ? current.poojaType
        : selectedTemplePoojas[0]?.name || "Archana";
      return { ...current, templeId: safeTempleId, poojaType: safePooja };
    });
    setDonationForm((current) => ({ ...current, templeId: current.templeId || selectedTemple.id }));
  }, [selectedTemple, selectedTemplePoojas, availablePoojaNames]);

  const nearbyTemples = useMemo(
    () => [...temples].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 4),
    [temples]
  );

  const upcomingBookings = useMemo(
    () =>
      bookings.filter(
        (item) => item.status !== "Cancelled" && new Date(item.bookingDate).getTime() >= Date.now() - 86400000
      ),
    [bookings]
  );

  const completedBookings = useMemo(
    () => bookings.filter((item) => item.status === "Completed" || item.status === "Confirmed"),
    [bookings]
  );

  const upcomingEvents = useMemo(
    () =>
      [...festivalEvents]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .filter((item) => new Date(item.date).getTime() >= Date.now() - 86400000),
    [festivalEvents]
  );

  const dashboardCards = [
    { id: "daily-darshan", title: "Daily Darshan", value: `${upcomingEvents.length} upcoming events`, action: () => setActiveSection("calendar") },
    { id: "nearby-temples", title: "Nearby Temples", value: `${nearbyTemples.length} found nearby`, action: () => setActiveSection("directory") },
    { id: "vazhipadu", title: "Vazhipadu Booking", value: `${upcomingBookings.length} active bookings`, action: () => setActiveSection("booking") },
    { id: "events", title: "Temple Events", value: `${festivalEvents.length} events listed`, action: () => setActiveSection("calendar") },
    { id: "live", title: "Live Pooja", value: `${temples.filter((item) => item.liveDarshanUrl).length} temples live-ready`, action: () => setActiveSection("live") },
    { id: "my-bookings", title: "My Bookings", value: `${bookings.length} total records`, action: () => setActiveSection("my") },
    { id: "notifications", title: "Notifications", value: `${notifications.length} updates`, action: () => setActiveSection("dashboard") },
  ];

  const toggleFavoriteTemple = (templeId) => {
    setFavoriteTempleIds((current) =>
      current.includes(templeId)
        ? current.filter((item) => item !== templeId)
        : [templeId, ...current]
    );
  };

  const toggleEventNotification = (eventId) => {
    const enabled = notifyEventIds.includes(eventId);
    const next = enabled
      ? notifyEventIds.filter((id) => id !== eventId)
      : [eventId, ...notifyEventIds];
    setNotifyEventIds(next);
    showStatus(enabled ? "Festival reminder removed." : "Festival reminder enabled.");
  };

  const toggleLiveSaved = (templeId) => {
    const enabled = savedLiveTempleIds.includes(templeId);
    setSavedLiveTempleIds((current) =>
      enabled ? current.filter((id) => id !== templeId) : [templeId, ...current]
    );
    showStatus(enabled ? "Live darshan removed from saved list." : "Live darshan saved.");
  };

  const createReceiptText = (record, type) => {
    if (type === "BOOKING") {
      return [
        "DEVADARSHAN RECEIPT",
        `Receipt No: ${record.receiptNumber}`,
        `Booking ID: ${record.id}`,
        `Temple: ${record.templeName}`,
        `Pooja: ${record.poojaType}`,
        `Devotee: ${record.devoteeName}`,
        `Nakshatra: ${record.nakshatra || "N/A"}`,
        `Date: ${record.bookingDate}`,
        `Payment: ${record.paymentMethod} (${record.paymentStatus})`,
        `Amount: ${formatINR(record.amount)}`,
        `Transaction Ref: ${record.transactionRef}`,
        `Admin Approval: ${record.adminApprovalStatus}`,
      ].join("\n");
    }

    return [
      "DEVADARSHAN DONATION RECEIPT",
      `Receipt No: ${record.receiptNumber}`,
      `Donation ID: ${record.id}`,
      `Temple: ${record.templeName}`,
      `Category: ${record.category}`,
      `Purpose: ${record.purpose || "N/A"}`,
      `Amount: ${formatINR(record.amount)}`,
      `Payment: ${record.paymentMethod}`,
      `Transaction Ref: ${record.transactionRef}`,
      `Date: ${record.createdAt}`,
    ].join("\n");
  };

  const downloadReceipt = (record, type) => {
    const text = createReceiptText(record, type);
    downloadText(`${record.receiptNumber}.txt`, text);
  };

  const handleBookingSubmit = (event) => {
    event.preventDefault();
    const temple = temples.find((item) => item.id === bookingForm.templeId);
    if (!temple) {
      showStatus("Select a valid temple.");
      return;
    }
    if (!bookingForm.devoteeName.trim() || !bookingForm.bookingDate) {
      showStatus("Enter devotee name and booking date.");
      return;
    }
    if (!availablePoojaNames.includes(bookingForm.poojaType)) {
      showStatus("Selected pooja is not available for this temple.");
      return;
    }

    const pooja = temple.poojas.find((item) => item.name === bookingForm.poojaType);
    const quantity = Number(bookingForm.quantity || 1);
    const amount = (pooja?.price || 0) * Math.max(quantity, 1);
    const booking = {
      id: generateId("BK"),
      templeId: temple.id,
      templeName: temple.name,
      poojaType: bookingForm.poojaType,
      devoteeName: bookingForm.devoteeName.trim(),
      familyMember: bookingForm.familyMember,
      nakshatra: bookingForm.nakshatra,
      bookingDate: bookingForm.bookingDate,
      quantity,
      amount,
      prasadamOption: bookingForm.prasadamOption,
      deliveryMode: bookingForm.deliveryMode,
      deliveryAddress: bookingForm.deliveryMode === "Local Delivery" ? bookingForm.deliveryAddress : "",
      notes: bookingForm.notes,
      paymentMethod: bookingForm.paymentMethod,
      paymentStatus: "Paid",
      transactionRef: generateId("TXN"),
      receiptNumber: generateId("RCPT"),
      adminApprovalStatus: temple.verified ? "Auto Approved (Verified Temple)" : "Pending Admin Approval",
      status: temple.verified ? "Confirmed" : "Pending Approval",
      createdAt: new Date().toISOString(),
    };

    setBookings((current) => [booking, ...current]);
    setNotifications((current) => [
      {
        id: generateId("NTF"),
        message: `Booking ${booking.id} confirmed for ${booking.poojaType} at ${temple.name}.`,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    showStatus(`Booking ${booking.id} completed. Receipt ${booking.receiptNumber} generated.`);
    setBookingForm((current) => ({
      ...INITIAL_BOOKING_FORM,
      templeId: current.templeId,
      poojaType: temple.poojas[0]?.name || "Archana",
      paymentMethod: "UPI",
    }));
  };

  const handleDonationSubmit = (event) => {
    event.preventDefault();
    const temple = temples.find((item) => item.id === donationForm.templeId);
    const amount = Number(donationForm.amount || 0);
    if (!temple || amount <= 0) {
      showStatus("Select temple and valid donation amount.");
      return;
    }

    const donation = {
      id: generateId("DN"),
      templeId: temple.id,
      templeName: temple.name,
      category: donationForm.category,
      amount,
      purpose: donationForm.purpose,
      paymentMethod: donationForm.paymentMethod,
      transactionRef: generateId("TXN"),
      receiptNumber: generateId("DRCPT"),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setDonations((current) => [donation, ...current]);
    setNotifications((current) => [
      {
        id: generateId("NTF"),
        message: `Donation ${donation.receiptNumber} received for ${donation.category}.`,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    showStatus("Donation completed and receipt generated.");
    setDonationForm((current) => ({ ...INITIAL_DONATION_FORM, templeId: current.templeId }));
  };

  const addFamilyMember = (event) => {
    event.preventDefault();
    if (!familyForm.name.trim() || !familyForm.nakshatra) {
      showStatus("Enter family member name and nakshatra.");
      return;
    }
    setFamilyMembers((current) => [
      { id: generateId("FM"), name: familyForm.name.trim(), nakshatra: familyForm.nakshatra },
      ...current,
    ]);
    setFamilyForm({ name: "", nakshatra: "" });
    showStatus("Family star profile updated.");
  };

  const removeFamilyMember = (id) => {
    setFamilyMembers((current) => current.filter((item) => item.id !== id));
  };

  const saveProfile = (event) => {
    event.preventDefault();
    showStatus("Personal devotional preferences saved.");
  };

  const addTempleFromAdmin = (event) => {
    event.preventDefault();
    if (!adminTempleForm.name.trim() || !adminTempleForm.district.trim() || !adminTempleForm.deity.trim()) {
      showStatus("Temple name, district, and deity are required.");
      return;
    }

    const newTemple = {
      id: generateId("TMP"),
      name: adminTempleForm.name.trim(),
      district: adminTempleForm.district.trim(),
      deity: adminTempleForm.deity.trim(),
      templeType: "Temple",
      timings: adminTempleForm.timings || "04:00 AM - 12:00 PM, 05:00 PM - 08:00 PM",
      contact: adminTempleForm.contact || "Not updated",
      officialContact: adminTempleForm.contact || "Not updated",
      festivals: ["Temple Special Pooja"],
      photos: ["Temple Photo"],
      mapUrl: "https://maps.google.com",
      rules: "Follow temple rules and queue discipline.",
      dressCode: adminTempleForm.dressCode || "Traditional attire preferred",
      distanceKm: 99,
      popularity: 3,
      verified: false,
      liveDarshanUrl: "https://www.youtube.com",
      poojas: [],
    };

    if (adminTempleForm.poojaName && Number(adminTempleForm.poojaPrice) > 0) {
      newTemple.poojas.push({
        name: adminTempleForm.poojaName,
        price: Number(adminTempleForm.poojaPrice),
        prasadamSupported: true,
      });
    } else {
      newTemple.poojas.push({
        name: "Archana",
        price: 50,
        prasadamSupported: true,
      });
    }

    setTemples((current) => [newTemple, ...current]);
    setAdminTempleForm(INITIAL_ADMIN_TEMPLE_FORM);
    showStatus("Temple added in pending verification state.");
  };

  const addEventFromAdmin = (event) => {
    event.preventDefault();
    if (!adminEventForm.templeId || !adminEventForm.title.trim() || !adminEventForm.date) {
      showStatus("Temple, event title, and date are required.");
      return;
    }
    const newEvent = {
      id: generateId("EVT"),
      templeId: adminEventForm.templeId,
      title: adminEventForm.title.trim(),
      type: adminEventForm.type,
      date: adminEventForm.date,
      details: adminEventForm.details || "Temple event update",
    };
    setFestivalEvents((current) => [newEvent, ...current]);
    setAdminEventForm(INITIAL_ADMIN_EVENT_FORM);
    showStatus("Event calendar updated.");
  };

  const toggleTempleVerification = (templeId) => {
    setTemples((current) =>
      current.map((temple) =>
        temple.id === templeId ? { ...temple, verified: !temple.verified } : temple
      )
    );
  };

  const updateBookingStatus = (bookingId, status) => {
    setBookings((current) =>
      current.map((item) => {
        if (item.id !== bookingId) return item;
        return {
          ...item,
          status,
          adminApprovalStatus: status === "Confirmed" ? "Approved by Admin" : item.adminApprovalStatus,
        };
      })
    );
  };

  const templeById = (templeId) => temples.find((item) => item.id === templeId);

  return (
    <div className="devadarshan-page">
      <header className="devadarshan-hero">
        <div>
          <p className="devadarshan-kicker">Kerala Devotional Service Hub</p>
          <h1>Devadarshan</h1>
          <p className="devadarshan-subtitle">
            Trusted temple directory, vazhipadu booking, donation receipts, festival reminders, and daily devotional engagement.
          </p>
        </div>
        <div className="devadarshan-hero-controls">
          <input
            type="text"
            value={searchTemple}
            onChange={(event) => setSearchTemple(event.target.value)}
            placeholder="Search by temple, district, deity..."
          />
          <button type="button" onClick={() => setActiveSection("booking")}>
            Quick Book Vazhipadu
          </button>
          <button type="button" onClick={() => setActiveSection("donation")} className="secondary">
            Quick Donate
          </button>
        </div>
        <nav className="devadarshan-nav">
          {SECTION_ORDER.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={activeSection === section.id ? "active" : ""}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </header>

      {statusMessage ? <p className="devadarshan-status">{statusMessage}</p> : null}

      {activeSection === "dashboard" && (
        <section className="devadarshan-section">
          <h2>Home Dashboard</h2>
          <div className="devadarshan-quick-grid">
            {dashboardCards.map((card) => (
              <button type="button" key={card.id} className="quick-card" onClick={card.action}>
                <strong>{card.title}</strong>
                <span>{card.value}</span>
              </button>
            ))}
          </div>

          <div className="devadarshan-grid">
            <article className="devadarshan-panel">
              <h3>Daily Darshan & Notifications</h3>
              {notifications.length === 0 ? <p>No alerts yet.</p> : (
                <ul className="devadarshan-list">
                  {notifications.slice(0, 8).map((item) => (
                    <li key={item.id}>{new Date(item.createdAt).toLocaleString()} | {item.message}</li>
                  ))}
                </ul>
              )}
            </article>
            <article className="devadarshan-panel">
              <h3>Nearby Verified Temples</h3>
              <ul className="devadarshan-list">
                {nearbyTemples.map((temple) => (
                  <li key={temple.id}>
                    {temple.name} ({temple.distanceKm} km) {temple.verified ? " | Verified" : " | Pending verification"}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      )}

      {activeSection === "directory" && (
        <section className="devadarshan-section">
          <h2>Temple Directory</h2>
          <div className="directory-filters sticky">
            <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)}>
              {districtOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={deityFilter} onChange={(event) => setDeityFilter(event.target.value)}>
              {deityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={templeTypeFilter} onChange={(event) => setTempleTypeFilter(event.target.value)}>
              {templeTypeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={poojaFilter} onChange={(event) => setPoojaFilter(event.target.value)}>
              {poojaOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={festivalFilter} onChange={(event) => setFestivalFilter(event.target.value)}>
              {festivalOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <label>
              Distance
              <input type="range" min="5" max="200" value={distanceFilter} onChange={(event) => setDistanceFilter(event.target.value)} />
            </label>
            <label>
              Popularity
              <input type="range" min="1" max="5" value={minPopularity} onChange={(event) => setMinPopularity(event.target.value)} />
            </label>
          </div>

          <div className="devadarshan-cards">
            {filteredTemples.map((temple) => (
              <article key={temple.id} className={`devadarshan-card ${selectedTempleId === temple.id ? "selected" : ""}`}>
                <div className="card-top-row">
                  <h3>{temple.name}</h3>
                  <span className={`badge ${temple.verified ? "verified" : "pending"}`}>
                    {temple.verified ? "Verified Temple" : "Pending Verification"}
                  </span>
                </div>
                <p>{temple.district} | {temple.deity} | {temple.templeType}</p>
                <p>Timings: {temple.timings}</p>
                <p>Contact: {temple.contact}</p>
                <p>Dress code: {temple.dressCode}</p>
                <p>Rules: {temple.rules}</p>
                <p>Festivals: {temple.festivals.join(", ")}</p>
                <p>Distance: {temple.distanceKm} km | Popularity: {"★".repeat(temple.popularity)}</p>
                <div className="card-actions">
                  <button type="button" onClick={() => { setSelectedTempleId(temple.id); setActiveSection("booking"); }}>
                    Book Vazhipadu
                  </button>
                  <button type="button" className="secondary" onClick={() => toggleFavoriteTemple(temple.id)}>
                    {favoriteTempleIds.includes(temple.id) ? "Remove Favourite" : "Save Favourite"}
                  </button>
                  <a href={temple.mapUrl} target="_blank" rel="noreferrer">Map Direction</a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeSection === "booking" && (
        <section className="devadarshan-section">
          <h2>Vazhipadu / Pooja Booking</h2>
          <div className="devadarshan-grid">
            <article className="devadarshan-panel">
              <h3>Book Vazhipadu</h3>
              <form className="devadarshan-form" onSubmit={handleBookingSubmit}>
                <label>
                  Temple
                  <select value={bookingForm.templeId} onChange={(event) => {
                    const templeId = event.target.value;
                    const temple = temples.find((item) => item.id === templeId);
                    setBookingForm((current) => ({
                      ...current,
                      templeId,
                      poojaType: temple?.poojas[0]?.name || "Archana",
                    }));
                    setSelectedTempleId(templeId);
                  }}>
                    {temples.map((temple) => <option key={temple.id} value={temple.id}>{temple.name}</option>)}
                  </select>
                </label>
                <label>
                  Pooja / Vazhipadu
                  <select value={bookingForm.poojaType} onChange={(event) => setBookingForm((current) => ({ ...current, poojaType: event.target.value }))}>
                    {(templeById(bookingForm.templeId)?.poojas || []).map((pooja) => (
                      <option key={pooja.name} value={pooja.name}>
                        {pooja.name} ({formatINR(pooja.price)})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Devotee Name
                  <input type="text" value={bookingForm.devoteeName} onChange={(event) => setBookingForm((current) => ({ ...current, devoteeName: event.target.value }))} />
                </label>
                <label>
                  Family Member
                  <select value={bookingForm.familyMember} onChange={(event) => {
                    const member = familyMembers.find((item) => item.name === event.target.value);
                    setBookingForm((current) => ({
                      ...current,
                      familyMember: event.target.value,
                      nakshatra: member?.nakshatra || current.nakshatra,
                    }));
                  }}>
                    <option value="">Select (optional)</option>
                    {familyMembers.map((member) => <option key={member.id} value={member.name}>{member.name}</option>)}
                  </select>
                </label>
                <label>
                  Nakshatra
                  <select value={bookingForm.nakshatra} onChange={(event) => setBookingForm((current) => ({ ...current, nakshatra: event.target.value }))}>
                    <option value="">Select (optional)</option>
                    {NAKSHATRAS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  Booking Date
                  <input type="date" value={bookingForm.bookingDate} onChange={(event) => setBookingForm((current) => ({ ...current, bookingDate: event.target.value }))} />
                </label>
                <label>
                  Quantity
                  <input type="number" min="1" value={bookingForm.quantity} onChange={(event) => setBookingForm((current) => ({ ...current, quantity: Number(event.target.value || 1) }))} />
                </label>
                <label>
                  Prasadam
                  <select value={bookingForm.prasadamOption} onChange={(event) => setBookingForm((current) => ({ ...current, prasadamOption: event.target.value }))}>
                    <option>No prasadam</option>
                    <option>Standard prasadam</option>
                    <option>Special prasadam pack</option>
                  </select>
                </label>
                <label>
                  Delivery / Pickup
                  <select value={bookingForm.deliveryMode} onChange={(event) => setBookingForm((current) => ({ ...current, deliveryMode: event.target.value }))}>
                    <option>Temple Pickup</option>
                    <option>Local Delivery</option>
                  </select>
                </label>
                {bookingForm.deliveryMode === "Local Delivery" && (
                  <label>
                    Delivery Address
                    <textarea rows={2} value={bookingForm.deliveryAddress} onChange={(event) => setBookingForm((current) => ({ ...current, deliveryAddress: event.target.value }))} />
                  </label>
                )}
                <label>
                  Payment Method
                  <select value={bookingForm.paymentMethod} onChange={(event) => setBookingForm((current) => ({ ...current, paymentMethod: event.target.value }))}>
                    <option>UPI</option>
                    <option>Card</option>
                    <option>Net Banking</option>
                    <option>Wallet</option>
                  </select>
                </label>
                <label>
                  Notes
                  <textarea rows={2} value={bookingForm.notes} onChange={(event) => setBookingForm((current) => ({ ...current, notes: event.target.value }))} />
                </label>
                <button type="submit">Confirm Booking + Payment</button>
              </form>
            </article>

            <article className="devadarshan-panel">
              <h3>Trust & Verification</h3>
              <p><strong>Temple:</strong> {selectedTemple?.name}</p>
              <p><strong>Verification:</strong> {selectedTemple?.verified ? "Verified temple badge active" : "Pending temple verification"}</p>
              <p><strong>Official contact:</strong> {selectedTemple?.officialContact}</p>
              <p><strong>Receipt:</strong> Generated after payment confirmation</p>
              <p><strong>Admin approval:</strong> Auto for verified temples, manual for pending temples</p>
              <h4>Available Poojas & Rates</h4>
              <ul className="devadarshan-list">
                {selectedTemplePoojas.map((pooja) => (
                  <li key={pooja.name}>
                    {pooja.name} | {formatINR(pooja.price)} | {pooja.prasadamSupported ? "Prasadam supported" : "No prasadam"}
                  </li>
                ))}
              </ul>
              <button type="button" className="secondary" onClick={() => setActiveSection("my")}>
                View My Bookings
              </button>
            </article>
          </div>
        </section>
      )}

      {activeSection === "calendar" && (
        <section className="devadarshan-section">
          <h2>Event & Festival Calendar</h2>
          <div className="devadarshan-cards">
            {upcomingEvents.map((eventItem) => {
              const temple = templeById(eventItem.templeId);
              return (
                <article key={eventItem.id} className="devadarshan-card">
                  <div className="card-top-row">
                    <h3>{eventItem.title}</h3>
                    <span className="badge event">{eventItem.type}</span>
                  </div>
                  <p>{temple?.name || "Temple update"}</p>
                  <p>Date: {eventItem.date}</p>
                  <p>{eventItem.details}</p>
                  <button type="button" onClick={() => toggleEventNotification(eventItem.id)}>
                    {notifyEventIds.includes(eventItem.id) ? "Notify Me Enabled" : "Notify Me"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activeSection === "donation" && (
        <section className="devadarshan-section">
          <h2>Online Donation</h2>
          <div className="devadarshan-grid">
            <article className="devadarshan-panel">
              <h3>Donate to Temple Services</h3>
              <form className="devadarshan-form" onSubmit={handleDonationSubmit}>
                <label>
                  Temple
                  <select value={donationForm.templeId} onChange={(event) => setDonationForm((current) => ({ ...current, templeId: event.target.value }))}>
                    {temples.map((temple) => <option key={temple.id} value={temple.id}>{temple.name}</option>)}
                  </select>
                </label>
                <label>
                  Donation category
                  <select value={donationForm.category} onChange={(event) => setDonationForm((current) => ({ ...current, category: event.target.value }))}>
                    {DONATION_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  Amount
                  <input type="number" min="10" value={donationForm.amount} onChange={(event) => setDonationForm((current) => ({ ...current, amount: Number(event.target.value || 0) }))} />
                </label>
                <label>
                  Purpose
                  <textarea rows={2} value={donationForm.purpose} onChange={(event) => setDonationForm((current) => ({ ...current, purpose: event.target.value }))} />
                </label>
                <label>
                  Payment method
                  <select value={donationForm.paymentMethod} onChange={(event) => setDonationForm((current) => ({ ...current, paymentMethod: event.target.value }))}>
                    <option>UPI</option>
                    <option>Card</option>
                    <option>Net Banking</option>
                    <option>Wallet</option>
                  </select>
                </label>
                <button type="submit">Donate + Generate Receipt</button>
              </form>
            </article>
            <article className="devadarshan-panel">
              <h3>Donation History</h3>
              {donations.length === 0 ? <p>No donations yet.</p> : (
                <ul className="devadarshan-list">
                  {donations.map((entry) => (
                    <li key={entry.id}>
                      {entry.createdAt} | {entry.templeName} | {entry.category} | {formatINR(entry.amount)}
                      <button type="button" className="inline-btn" onClick={() => downloadReceipt(entry, "DONATION")}>Download Receipt</button>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </section>
      )}

      {activeSection === "my" && (
        <section className="devadarshan-section">
          <h2>My Devadarshan</h2>
          <div className="devadarshan-grid">
            <article className="devadarshan-panel">
              <h3>Upcoming Bookings</h3>
              {upcomingBookings.length === 0 ? <p>No upcoming bookings.</p> : (
                <ul className="devadarshan-list">
                  {upcomingBookings.map((entry) => (
                    <li key={entry.id}>
                      {entry.bookingDate} | {entry.templeName} | {entry.poojaType} | {entry.status}
                      <button type="button" className="inline-btn" onClick={() => downloadReceipt(entry, "BOOKING")}>Receipt</button>
                    </li>
                  ))}
                </ul>
              )}
            </article>
            <article className="devadarshan-panel">
              <h3>Completed / Confirmed Poojas</h3>
              {completedBookings.length === 0 ? <p>No completed entries yet.</p> : (
                <ul className="devadarshan-list">
                  {completedBookings.map((entry) => (
                    <li key={entry.id}>
                      {entry.id} | {entry.templeName} | {entry.poojaType} | {formatINR(entry.amount)}
                    </li>
                  ))}
                </ul>
              )}
              <h3>Cancelled / Refunded</h3>
              <ul className="devadarshan-list">
                {bookings.filter((entry) => entry.status === "Cancelled").length === 0 ? (
                  <li>No cancelled bookings.</li>
                ) : (
                  bookings.filter((entry) => entry.status === "Cancelled").map((entry) => (
                    <li key={entry.id}>{entry.id} | {entry.templeName} | Cancelled</li>
                  ))
                )}
              </ul>
            </article>
            <article className="devadarshan-panel">
              <h3>Favourites & Saved Live</h3>
              <p><strong>Favourite temples:</strong></p>
              <ul className="devadarshan-list">
                {favoriteTempleIds.length === 0 ? <li>No favourites yet.</li> : favoriteTempleIds.map((id) => {
                  const temple = templeById(id);
                  return <li key={id}>{temple?.name || id}</li>;
                })}
              </ul>
              <p><strong>Saved live darshan:</strong></p>
              <ul className="devadarshan-list">
                {savedLiveTempleIds.length === 0 ? <li>No saved live links.</li> : savedLiveTempleIds.map((id) => {
                  const temple = templeById(id);
                  return <li key={id}>{temple?.name || id}</li>;
                })}
              </ul>
            </article>
          </div>
        </section>
      )}

      {activeSection === "profile" && (
        <section className="devadarshan-section">
          <h2>User Personalization</h2>
          <div className="devadarshan-grid">
            <article className="devadarshan-panel">
              <h3>Family Star Profile</h3>
              <form className="devadarshan-form" onSubmit={addFamilyMember}>
                <label>
                  Family member name
                  <input type="text" value={familyForm.name} onChange={(event) => setFamilyForm((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <label>
                  Nakshatra
                  <select value={familyForm.nakshatra} onChange={(event) => setFamilyForm((current) => ({ ...current, nakshatra: event.target.value }))}>
                    <option value="">Select</option>
                    {NAKSHATRAS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <button type="submit">Add Member</button>
              </form>
              <ul className="devadarshan-list">
                {familyMembers.length === 0 ? <li>No family members added.</li> : familyMembers.map((member) => (
                  <li key={member.id}>
                    {member.name} | {member.nakshatra}
                    <button type="button" className="inline-btn" onClick={() => removeFamilyMember(member.id)}>Remove</button>
                  </li>
                ))}
              </ul>
            </article>
            <article className="devadarshan-panel">
              <h3>Reminder Preferences</h3>
              <form className="devadarshan-form" onSubmit={saveProfile}>
                <label>
                  Primary Nakshatra
                  <select value={profile.primaryNakshatra} onChange={(event) => setProfile((current) => ({ ...current, primaryNakshatra: event.target.value }))}>
                    <option value="">Select</option>
                    {NAKSHATRAS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  Preferred Pooja
                  <input type="text" value={profile.preferredPooja} onChange={(event) => setProfile((current) => ({ ...current, preferredPooja: event.target.value }))} />
                </label>
                <label>
                  Phone
                  <input type="text" value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} />
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={profile.reminderBirthday} onChange={(event) => setProfile((current) => ({ ...current, reminderBirthday: event.target.checked }))} />
                  Birthday pooja reminder
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={profile.reminderMonthly} onChange={(event) => setProfile((current) => ({ ...current, reminderMonthly: event.target.checked }))} />
                  Monthly pooja reminder
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" checked={profile.reminderYearly} onChange={(event) => setProfile((current) => ({ ...current, reminderYearly: event.target.checked }))} />
                  Yearly vazhipadu reminder
                </label>
                <button type="submit">Save Preferences</button>
              </form>
              <h3>Temple Helpdesk</h3>
              <p>For pooja booking and festival queries:</p>
              <p>Call: +91 471 100 2020</p>
              <p>WhatsApp: +91 94470 12345</p>
            </article>
          </div>
        </section>
      )}

      {activeSection === "live" && (
        <section className="devadarshan-section">
          <h2>Live Darshan / Video Integration</h2>
          <div className="devadarshan-cards">
            {temples.map((temple) => (
              <article key={temple.id} className="devadarshan-card">
                <h3>{temple.name}</h3>
                <p>{temple.district}</p>
                <p>Live source: YouTube / official stream</p>
                <div className="card-actions">
                  <a href={temple.liveDarshanUrl} target="_blank" rel="noreferrer">Open Live Link</a>
                  <button type="button" className="secondary" onClick={() => toggleLiveSaved(temple.id)}>
                    {savedLiveTempleIds.includes(temple.id) ? "Saved" : "Save Live"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeSection === "admin" && (
        <section className="devadarshan-section">
          <h2>Admin Temple Management</h2>
          <div className="devadarshan-grid">
            <article className="devadarshan-panel">
              <h3>Add / Update Temple</h3>
              <form className="devadarshan-form" onSubmit={addTempleFromAdmin}>
                <label>
                  Temple name
                  <input type="text" value={adminTempleForm.name} onChange={(event) => setAdminTempleForm((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <label>
                  District
                  <input type="text" value={adminTempleForm.district} onChange={(event) => setAdminTempleForm((current) => ({ ...current, district: event.target.value }))} />
                </label>
                <label>
                  Deity
                  <input type="text" value={adminTempleForm.deity} onChange={(event) => setAdminTempleForm((current) => ({ ...current, deity: event.target.value }))} />
                </label>
                <label>
                  Contact
                  <input type="text" value={adminTempleForm.contact} onChange={(event) => setAdminTempleForm((current) => ({ ...current, contact: event.target.value }))} />
                </label>
                <label>
                  Timings
                  <input type="text" value={adminTempleForm.timings} onChange={(event) => setAdminTempleForm((current) => ({ ...current, timings: event.target.value }))} />
                </label>
                <label>
                  Dress code
                  <input type="text" value={adminTempleForm.dressCode} onChange={(event) => setAdminTempleForm((current) => ({ ...current, dressCode: event.target.value }))} />
                </label>
                <label>
                  Pooja name
                  <input type="text" value={adminTempleForm.poojaName} onChange={(event) => setAdminTempleForm((current) => ({ ...current, poojaName: event.target.value }))} />
                </label>
                <label>
                  Pooja price
                  <input type="number" min="1" value={adminTempleForm.poojaPrice} onChange={(event) => setAdminTempleForm((current) => ({ ...current, poojaPrice: event.target.value }))} />
                </label>
                <button type="submit">Add Temple</button>
              </form>
            </article>

            <article className="devadarshan-panel">
              <h3>Festival / Event Update</h3>
              <form className="devadarshan-form" onSubmit={addEventFromAdmin}>
                <label>
                  Temple
                  <select value={adminEventForm.templeId} onChange={(event) => setAdminEventForm((current) => ({ ...current, templeId: event.target.value }))}>
                    <option value="">Select temple</option>
                    {temples.map((temple) => <option key={temple.id} value={temple.id}>{temple.name}</option>)}
                  </select>
                </label>
                <label>
                  Event title
                  <input type="text" value={adminEventForm.title} onChange={(event) => setAdminEventForm((current) => ({ ...current, title: event.target.value }))} />
                </label>
                <label>
                  Event type
                  <select value={adminEventForm.type} onChange={(event) => setAdminEventForm((current) => ({ ...current, type: event.target.value }))}>
                    {EVENT_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>
                  Date
                  <input type="date" value={adminEventForm.date} onChange={(event) => setAdminEventForm((current) => ({ ...current, date: event.target.value }))} />
                </label>
                <label>
                  Details
                  <textarea rows={2} value={adminEventForm.details} onChange={(event) => setAdminEventForm((current) => ({ ...current, details: event.target.value }))} />
                </label>
                <button type="submit">Publish Event</button>
              </form>
            </article>

            <article className="devadarshan-panel">
              <h3>Booking Approvals & Reports</h3>
              <ul className="devadarshan-list">
                {bookings.length === 0 ? <li>No bookings yet.</li> : bookings.map((booking) => (
                  <li key={booking.id}>
                    {booking.id} | {booking.templeName} | {booking.poojaType} | {booking.status}
                    <button type="button" className="inline-btn" onClick={() => updateBookingStatus(booking.id, "Confirmed")}>Approve</button>
                    <button type="button" className="inline-btn" onClick={() => updateBookingStatus(booking.id, "Completed")}>Mark Complete</button>
                    <button type="button" className="inline-btn" onClick={() => updateBookingStatus(booking.id, "Cancelled")}>Cancel</button>
                  </li>
                ))}
              </ul>
              <h4>Donation report</h4>
              <p>Total donations: {formatINR(donations.reduce((sum, item) => sum + Number(item.amount), 0))}</p>
              <h4>Temple verification</h4>
              <ul className="devadarshan-list">
                {temples.map((temple) => (
                  <li key={temple.id}>
                    {temple.name} | {temple.verified ? "Verified" : "Pending"}
                    <button type="button" className="inline-btn" onClick={() => toggleTempleVerification(temple.id)}>
                      Toggle
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      )}

      <nav className="devadarshan-bottom-nav">
        {SECTION_ORDER.slice(0, 6).map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveSection(section.id)}
            className={activeSection === section.id ? "active" : ""}
          >
            {section.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default DevadarshanHub;
