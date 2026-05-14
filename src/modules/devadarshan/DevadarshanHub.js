import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useApp } from "../../contexts/AppContext";
import "./DevadarshanHub.css";
import { BACKEND_BASE_URL } from "../../utils/api";

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

const generateId = (prefix) => `${prefix}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
const formatINR = (value) => `INR ${Number(value || 0).toLocaleString("en-IN")}`;

const downloadBlob = (filename, blob) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const statusToLabel = (status) => {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "pending") return "Awaiting payment or approval";
  if (normalized === "confirmed") return "Confirmed with temple";
  if (normalized === "completed") return "Pooja completed";
  if (normalized === "cancelled") return "Cancelled";
  return status || "Unknown";
};

const DevadarshanHub = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [searchTemple, setSearchTemple] = useState("");
  const [selectedTempleId, setSelectedTempleId] = useState("");

  const [districtFilter, setDistrictFilter] = useState("All");
  const [deityFilter, setDeityFilter] = useState("All");
  const [templeTypeFilter, setTempleTypeFilter] = useState("All");
  const [poojaFilter, setPoojaFilter] = useState("All");
  const [festivalFilter, setFestivalFilter] = useState("All");
  const [distanceFilter, setDistanceFilter] = useState(200);
  const [minPopularity, setMinPopularity] = useState(1);

  const [temples, setTemples] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [donations, setDonations] = useState([]);
  const [favoriteTempleIds, setFavoriteTempleIds] = useState([]);
  const [profile, setProfile] = useState(INITIAL_PROFILE);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notifyEventIds, setNotifyEventIds] = useState([]);
  const [savedLiveTempleIds, setSavedLiveTempleIds] = useState([]);

  const [festivalEvents, setFestivalEvents] = useState([]);
  const [bookingForm, setBookingForm] = useState(INITIAL_BOOKING_FORM);
  const [donationForm, setDonationForm] = useState(INITIAL_DONATION_FORM);
  const [familyForm, setFamilyForm] = useState({ name: "", nakshatra: "" });
  const [adminTempleForm, setAdminTempleForm] = useState(INITIAL_ADMIN_TEMPLE_FORM);
  const [adminEventForm, setAdminEventForm] = useState(INITIAL_ADMIN_EVENT_FORM);
  const { currentUser } = useApp();
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState("razorpay");
  const [bookingTimelines, setBookingTimelines] = useState({});
  const [expandedBookingId, setExpandedBookingId] = useState("");

  const apiBase = `${BACKEND_BASE_URL}/api/devadarshan`;

  const refreshBootstrap = useCallback(async () => {
    const response = await axios.get(`${apiBase}/bootstrap`);
    if (!response.data?.success) {
      throw new Error(response.data?.message || "Unable to load Devadarshan data.");
    }

    const data = response.data.data || {};
    setTemples(Array.isArray(data.temples) ? data.temples : []);
    setFestivalEvents(Array.isArray(data.festivalEvents) ? data.festivalEvents : []);
    setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    setDonations(Array.isArray(data.donations) ? data.donations : []);
    setFavoriteTempleIds(Array.isArray(data.favoriteTempleIds) ? data.favoriteTempleIds : []);
    setNotifyEventIds(Array.isArray(data.notifyEventIds) ? data.notifyEventIds : []);
    setSavedLiveTempleIds(Array.isArray(data.savedLiveTempleIds) ? data.savedLiveTempleIds : []);
    setProfile(data.profile || INITIAL_PROFILE);
    setFamilyMembers(Array.isArray(data.familyMembers) ? data.familyMembers : []);
    setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
  }, [apiBase]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        await refreshBootstrap();
      } catch (error) {
        if (mounted) {
          setStatusMessage(error?.response?.data?.message || error?.message || "Unable to sync Devadarshan data.");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [refreshBootstrap]);

  useEffect(() => {
    if (!temples.some((temple) => temple.id === selectedTempleId)) {
      setSelectedTempleId(temples[0]?.id || "");
    }
  }, [selectedTempleId, temples]);

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
        `${temple.name} ${temple.district} ${temple.deity} ${temple.festivals.join(" ")} ${temple.poojas
          .map((pooja) => pooja.name)
          .join(" ")} ${temple.rules} ${temple.officialContact}`
          .toLowerCase()
          .includes(query);
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

  const cancelledBookings = useMemo(
    () => bookings.filter((item) => item.status === "Cancelled"),
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
    { id: "my-bookings", title: "My Bookings", value: `${bookings.length + donations.length} total records`, action: () => setActiveSection("my") },
    { id: "notifications", title: "Notifications", value: `${notifications.length} updates`, action: () => setActiveSection("dashboard") },
  ];

  const getBookingNextAction = (entry) => {
    if (entry.status === "Cancelled") {
      return entry.refundStatus === "Requested"
        ? "Refund request is under review."
        : "Booking cancelled.";
    }
    if (entry.paymentStatus === "Pending") {
      return "Complete payment to confirm this pooja.";
    }
    if (entry.status === "Pending") {
      return "Awaiting temple/admin approval.";
    }
    if (entry.status === "Confirmed") {
      return "Track updates or contact temple.";
    }
    if (entry.status === "Completed") {
      return "Download receipt for records.";
    }
    return "Track timeline for latest update.";
  };

  const handleApiError = (error, fallbackMessage) => {
    showStatus(error?.response?.data?.message || error?.message || fallbackMessage);
  };

  const toggleFavoriteTemple = async (templeId) => {
    try {
      const response = await axios.post(`${apiBase}/preferences/favorites/${encodeURIComponent(templeId)}/toggle`);
      if (!response.data?.success) throw new Error(response.data?.message || "Unable to update favorites.");
      setFavoriteTempleIds(response.data.data?.favoriteTempleIds || []);
    } catch (error) {
      handleApiError(error, "Unable to update favorites.");
    }
  };

  const toggleEventNotification = async (eventId) => {
    try {
      const response = await axios.post(`${apiBase}/preferences/events/${encodeURIComponent(eventId)}/toggle`);
      if (!response.data?.success) throw new Error(response.data?.message || "Unable to update reminders.");
      const enabled = Boolean(response.data.data?.enabled);
      setNotifyEventIds(response.data.data?.notifyEventIds || []);
      showStatus(enabled ? "Festival reminder enabled." : "Festival reminder removed.");
    } catch (error) {
      handleApiError(error, "Unable to update reminders.");
    }
  };

  const toggleLiveSaved = async (templeId) => {
    try {
      const response = await axios.post(`${apiBase}/preferences/live/${encodeURIComponent(templeId)}/toggle`);
      if (!response.data?.success) throw new Error(response.data?.message || "Unable to update live list.");
      const enabled = Boolean(response.data.data?.enabled);
      setSavedLiveTempleIds(response.data.data?.savedLiveTempleIds || []);
      showStatus(enabled ? "Live darshan saved." : "Live darshan removed from saved list.");
    } catch (error) {
      handleApiError(error, "Unable to update live list.");
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      setIsSaving(true);
      const response = await axios.patch(`${apiBase}/bookings/${encodeURIComponent(bookingId)}/cancel`);
      if (!response.data?.success) throw new Error(response.data?.message || "Unable to cancel booking.");
      await refreshBootstrap();
      showStatus("Booking cancelled. Contact temple for refund details.");
    } catch (error) {
      handleApiError(error, "Unable to cancel booking.");
    } finally {
      setIsSaving(false);
    }
  };

  const loadRazorpayScript = () =>
    new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Unable to load Razorpay checkout script."));
      document.body.appendChild(script);
    });

  const verifyBookingPayment = async (bookingId, paymentId, payload) => {
    const response = await axios.post(
      `${apiBase}/bookings/${encodeURIComponent(bookingId)}/payments/verify`,
      {
        paymentId,
        ...payload,
      }
    );

    if (!response.data?.success) {
      throw new Error(response.data?.message || "Payment verification failed.");
    }
  };

  const openRazorpayCheckout = async (paymentData, bookingId) => {
    await loadRazorpayScript();
    if (!window.Razorpay) {
      throw new Error("Razorpay checkout is unavailable.");
    }

    const options = {
      key: paymentData.razorpayKeyId,
      amount: Math.round(Number(paymentData.amount || 0) * 100),
      currency: paymentData.currency || "INR",
      name: "Devadarshan",
      description: `Pooja booking ${bookingId}`,
      order_id: paymentData.gatewayOrderId,
      handler: async (result) => {
        try {
          await verifyBookingPayment(bookingId, paymentData.paymentId, {
            razorpay_payment_id: result.razorpay_payment_id,
            razorpay_order_id: result.razorpay_order_id,
            razorpay_signature: result.razorpay_signature,
          });
          await refreshBootstrap();
          showStatus("Payment verified. Booking confirmed.");
        } catch (error) {
          handleApiError(error, "Payment verification failed.");
        } finally {
          setIsSaving(false);
        }
      },
      prefill: {
        name: bookingForm.devoteeName || currentUser?.name || "",
        email: currentUser?.email || "",
        contact: profile.phone || "",
      },
      theme: { color: "#2563eb" },
    };

    const gateway = new window.Razorpay(options);
    gateway.on("payment.failed", () => {
      setIsSaving(false);
      showStatus("Razorpay payment failed.");
    });
    gateway.open();
  };

  const markBookingPaid = async (bookingId) => {
    try {
      setIsSaving(true);
      const booking = bookings.find((item) => item.id === bookingId);
      if (!booking) {
        throw new Error("Booking not found.");
      }

      const response = await axios.post(
        `${apiBase}/bookings/${encodeURIComponent(bookingId)}/payments/initiate`,
        {
          gateway: selectedPaymentGateway,
          paymentMethod: booking.paymentMethod || "upi",
        }
      );
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to start payment.");
      }

      const paymentData = response.data.data;
      if (paymentData.gateway === "razorpay") {
        await openRazorpayCheckout(paymentData, bookingId);
        return;
      }

      showStatus("Payment initialized. Complete payment in your configured gateway flow.");
      setIsSaving(false);
    } catch (error) {
      setIsSaving(false);
      handleApiError(error, "Unable to start payment.");
    }
  };

  const downloadReceipt = async (record, type) => {
    try {
      const endpoint =
        type === "BOOKING"
          ? `${apiBase}/bookings/${encodeURIComponent(record.id)}/receipt`
          : `${apiBase}/donations/${encodeURIComponent(record.id)}/receipt`;
      const response = await axios.get(endpoint, { responseType: "blob" });
      const filename = `${record.receiptNumber || record.id || "receipt"}.txt`;
      downloadBlob(filename, response.data);
      showStatus("Receipt downloaded.");
    } catch (error) {
      handleApiError(error, "Unable to download receipt.");
    }
  };

  const toggleBookingTimeline = async (bookingId) => {
    try {
      const isExpanded = expandedBookingId === bookingId;
      if (isExpanded) {
        setExpandedBookingId("");
        return;
      }

      if (!bookingTimelines[bookingId]) {
        const response = await axios.get(
          `${apiBase}/bookings/${encodeURIComponent(bookingId)}/timeline`
        );
        if (!response.data?.success) {
          throw new Error(response.data?.message || "Unable to load booking timeline.");
        }
        setBookingTimelines((current) => ({
          ...current,
          [bookingId]: response.data.data,
        }));
      }
      setExpandedBookingId(bookingId);
    } catch (error) {
      handleApiError(error, "Unable to load booking timeline.");
    }
  };

  const handleBookingSubmit = async (event) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      const response = await axios.post(`${apiBase}/bookings`, bookingForm);
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Booking could not be created.");
      }

      const createdBooking = response.data.data?.booking;
      await refreshBootstrap();
      showStatus(`Booking ${createdBooking?.id || ""} created. Receipt ${createdBooking?.receiptNumber || ""} is ready.`);
      setBookingForm((current) => ({
        ...INITIAL_BOOKING_FORM,
        templeId: current.templeId || selectedTemple?.id || "",
        poojaType: selectedTemple?.poojas?.[0]?.name || "Archana",
        paymentMethod: "UPI",
      }));
    } catch (error) {
      handleApiError(error, "Unable to create booking.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDonationSubmit = async (event) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      const response = await axios.post(`${apiBase}/donations`, donationForm);
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Donation could not be processed.");
      }
      await refreshBootstrap();
      showStatus("Donation completed and receipt generated.");
      setDonationForm((current) => ({ ...INITIAL_DONATION_FORM, templeId: current.templeId }));
    } catch (error) {
      handleApiError(error, "Unable to complete donation.");
    } finally {
      setIsSaving(false);
    }
  };

  const addFamilyMember = async (event) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      const response = await axios.post(`${apiBase}/family`, familyForm);
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to add family member.");
      }
      setFamilyMembers(response.data.data?.familyMembers || []);
      setFamilyForm({ name: "", nakshatra: "" });
      await refreshBootstrap();
      showStatus("Family star profile updated.");
    } catch (error) {
      handleApiError(error, "Unable to add family member.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeFamilyMember = async (id) => {
    try {
      setIsSaving(true);
      const response = await axios.delete(`${apiBase}/family/${encodeURIComponent(id)}`);
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to remove family member.");
      }
      setFamilyMembers(response.data.data?.familyMembers || []);
    } catch (error) {
      handleApiError(error, "Unable to remove family member.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      const response = await axios.post(`${apiBase}/profile`, profile);
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to save profile.");
      }
      setProfile(response.data.data?.profile || profile);
      showStatus("Personal devotional preferences saved.");
    } catch (error) {
      handleApiError(error, "Unable to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const addTempleFromAdmin = async (event) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      const payload = {
        ...adminTempleForm,
        poojaPrice: Number(adminTempleForm.poojaPrice || 50),
      };
      const response = await axios.post(`${apiBase}/admin/temples`, payload);
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to add temple.");
      }
      setAdminTempleForm(INITIAL_ADMIN_TEMPLE_FORM);
      await refreshBootstrap();
      showStatus("Temple added in pending verification state.");
    } catch (error) {
      handleApiError(error, "Unable to add temple.");
    } finally {
      setIsSaving(false);
    }
  };

  const addEventFromAdmin = async (event) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      const response = await axios.post(`${apiBase}/admin/events`, adminEventForm);
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to publish event.");
      }
      setAdminEventForm(INITIAL_ADMIN_EVENT_FORM);
      await refreshBootstrap();
      showStatus("Event calendar updated.");
    } catch (error) {
      handleApiError(error, "Unable to publish event.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTempleVerification = async (templeId) => {
    try {
      setIsSaving(true);
      const response = await axios.patch(`${apiBase}/admin/temples/${encodeURIComponent(templeId)}/verify`);
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to update verification.");
      }
      await refreshBootstrap();
    } catch (error) {
      handleApiError(error, "Unable to update verification.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      setIsSaving(true);
      const response = await axios.patch(`${apiBase}/admin/bookings/${encodeURIComponent(bookingId)}/status`, { status });
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to update booking status.");
      }
      await refreshBootstrap();
    } catch (error) {
      handleApiError(error, "Unable to update booking status.");
    } finally {
      setIsSaving(false);
    }
  };

  const templeById = (templeId) => temples.find((item) => item.id === templeId);
  const isAdminView =
    currentUser?.role === "admin" ||
    String(currentUser?.email || "").trim().toLowerCase() === "mgdhanyamohan@gmail.com";

  const headerSections = isAdminView ? SECTION_ORDER : SECTION_ORDER.filter((section) => section.id !== "admin");

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
            placeholder="Search by temple, district, deity, festival, pooja..."
          />
          <button type="button" onClick={() => setActiveSection("booking")}>
            Quick Book Vazhipadu
          </button>
          <button type="button" onClick={() => setActiveSection("donation")} className="secondary">
            Quick Donate
          </button>
        </div>
        <nav className="devadarshan-nav">
          {headerSections.map((section) => (
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
      {isLoading ? <p className="devadarshan-status">Syncing Devadarshan data from DB...</p> : null}
      {!isLoading && isSaving ? <p className="devadarshan-status">Saving updates...</p> : null}

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
                  <button type="button" className="secondary" onClick={() => setSelectedTempleId(temple.id)}>
                    View Details
                  </button>
                  <button type="button" className="secondary" onClick={() => toggleFavoriteTemple(temple.id)}>
                    {favoriteTempleIds.includes(temple.id) ? "Remove Favourite" : "Save Favourite"}
                  </button>
                  <a href={temple.mapUrl} target="_blank" rel="noreferrer">Map Direction</a>
                </div>
              </article>
            ))}
          </div>
          <div className="devadarshan-details">
            <article className="devadarshan-panel">
              <h3>Selected Temple Details</h3>
              <p><strong>Temple:</strong> {selectedTemple?.name}</p>
              <p><strong>District:</strong> {selectedTemple?.district}</p>
              <p><strong>Deity:</strong> {selectedTemple?.deity}</p>
              <p><strong>Timings:</strong> {selectedTemple?.timings}</p>
              <p><strong>Contact:</strong> {selectedTemple?.contact}</p>
              <p><strong>Official contact:</strong> {selectedTemple?.officialContact}</p>
              <p><strong>Verified:</strong> {selectedTemple?.verified ? "Yes" : "No"}</p>
              <p><strong>Festivals:</strong> {selectedTemple?.festivals.join(", ")}</p>
              <p><strong>Photos:</strong> {selectedTemple?.photos.join(" | ")}</p>
              {selectedTemple?.liveDarshanUrl ? (
                <p>
                  <a href={selectedTemple.liveDarshanUrl} target="_blank" rel="noreferrer">Open live darshan</a>
                </p>
              ) : (
                <p>No live darshan available for this temple.</p>
              )}
              <p><strong>Rules:</strong> {selectedTemple?.rules}</p>
              <p><strong>Dress code:</strong> {selectedTemple?.dressCode}</p>
              <button type="button" onClick={() => setActiveSection("booking")}>Book this Temple</button>
            </article>
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
                  Payment Gateway
                  <select value={selectedPaymentGateway} onChange={(event) => setSelectedPaymentGateway(event.target.value)}>
                    <option value="razorpay">Razorpay</option>
                    <option value="stripe">Stripe</option>
                  </select>
                </label>
                <label>
                  Notes
                  <textarea rows={2} value={bookingForm.notes} onChange={(event) => setBookingForm((current) => ({ ...current, notes: event.target.value }))} />
                </label>
                <button type="submit" disabled={isSaving}>Confirm Booking + Payment</button>
              </form>
            </article>

            <article className="devadarshan-panel">
              <h3>Trust & Verification</h3>
              <p><strong>Temple:</strong> {selectedTemple?.name}</p>
              <p><strong>Verification:</strong> {selectedTemple?.verified ? "Verified temple badge active" : "Pending temple verification"}</p>
              <p><strong>Official contact:</strong> {selectedTemple?.officialContact}</p>
              <p><strong>Receipt:</strong> Generated after payment confirmation</p>
              <p><strong>Admin approval:</strong> Auto for verified temples, manual for pending temples</p>
              <p className="devadarshan-note">Payments are processed via backend gateway integration. Configure active Razorpay/Stripe credentials in backend for production.</p>
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
                    <li key={entry.id} className="booking-row">
                      <div>
                        <strong>{entry.bookingDate}</strong> | {entry.templeName} | {entry.poojaType}
                      </div>
                      <div>
                        Payment: {entry.paymentStatus} | Status: {entry.status}
                      </div>
                      <p className="booking-next-action">{getBookingNextAction(entry)}</p>
                      <button type="button" className="inline-btn" onClick={() => downloadReceipt(entry, "BOOKING")}>Receipt</button>
                      <button type="button" className="inline-btn" onClick={() => toggleBookingTimeline(entry.id)}>
                        {expandedBookingId === entry.id ? "Hide Timeline" : "Track Timeline"}
                      </button>
                      {entry.paymentStatus === "Pending" && (
                        <button type="button" className="inline-btn" onClick={() => markBookingPaid(entry.id)} disabled={isSaving}>
                          Pay Now
                        </button>
                      )}
                      {entry.status !== "Cancelled" && (
                        <button type="button" className="inline-btn" onClick={() => cancelBooking(entry.id)}>
                          Cancel
                        </button>
                      )}
                      {expandedBookingId === entry.id && (
                        <div className="booking-timeline">
                          {(bookingTimelines[entry.id]?.timeline || []).length === 0 ? (
                            <p>No timeline entries yet.</p>
                          ) : (
                            <ul>
                              {(bookingTimelines[entry.id]?.timeline || []).map((item, index) => (
                                <li key={`${entry.id}-timeline-${index}`}>
                                  <span className={`badge ${String(item.status || "").toLowerCase()}`}>
                                    {statusToLabel(item.status)}
                                  </span>
                                  <span>{new Date(item.at).toLocaleString("en-IN")}</span>
                                  <span>{item.note || "-"}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
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
                      {entry.id} | {entry.templeName} | {entry.poojaType} | {formatINR(entry.amount)} | {entry.paymentStatus}
                      <button type="button" className="inline-btn" onClick={() => downloadReceipt(entry, "BOOKING")}>Receipt</button>
                    </li>
                  ))}
                </ul>
              )}
              <h3>Donation History</h3>
              {donations.length === 0 ? <p>No donations yet.</p> : (
                <ul className="devadarshan-list">
                  {donations.map((item) => (
                    <li key={item.id}>
                      {item.createdAt} | {item.templeName} | {item.category} | {formatINR(item.amount)}
                      <button type="button" className="inline-btn" onClick={() => downloadReceipt(item, "DONATION")}>Receipt</button>
                    </li>
                  ))}
                </ul>
              )}
              <h3>Cancelled / Refunded</h3>
              <ul className="devadarshan-list">
                {cancelledBookings.length === 0 ? (
                  <li>No cancelled bookings.</li>
                ) : (
                  cancelledBookings.map((entry) => (
                    <li key={entry.id}>
                      {entry.id} | {entry.templeName} | Cancelled | Refund: {entry.refundStatus || "Not Requested"}
                    </li>
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
          {isAdminView ? (
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
          ) : (
            <article className="devadarshan-panel">
              <p>Admin access is required to manage temples, events, and booking approvals.</p>
            </article>
          )}
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
export const __private__ = {
  generateId,
  formatINR,
  DONATION_CATEGORIES,
};
