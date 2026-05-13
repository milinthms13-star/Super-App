import React, { useCallback, useEffect, useMemo, useState } from "react";
import "./LocalServicesMarketplace.css";
import { localServicesService } from "../../services/localServicesService";
import {
  CATEGORY_GROUPS,
  COMPLETE_PACKAGE_ITEMS,
  CITIES,
  EVENT_TYPES,
  FALLBACK_PROVIDERS,
  INITIAL_BOOKING,
  INITIAL_PACKAGE_FORM,
  INITIAL_SEARCH,
  INITIAL_VENDOR_FORM,
  SORT_OPTIONS,
  toLocalServiceRequestHistory,
} from "./localServicesData";
import ProviderSearch from "./components/ProviderSearch";
import ProviderList from "./components/ProviderList";
import BookingForm from "./components/BookingForm";
import VendorForm from "./components/VendorForm";
import PackageBuilder from "./components/PackageBuilder";
import RequestHistory from "./components/RequestHistory";
import ProviderDetailsModal from "./components/ProviderDetailsModal";
import VendorDashboard from "./components/VendorDashboard";
import AdminModerationPanel from "./components/AdminModerationPanel";
import { StatusToast } from "./components/FormControls";

const phoneRegex = /^\+?[0-9]{8,15}$/;
const REQUEST_HISTORY_KEY = "localservices-request-history";

const formatInr = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

const toIsoDate = (value) => new Date(value).toISOString().slice(0, 10);
const tomorrowIsoDate = () => {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 1);
  return toIsoDate(nextDate);
};

const readLocalHistory = () => {
  try {
    const raw = window.localStorage.getItem(REQUEST_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const LocalServicesMarketplace = () => {
  const [meta, setMeta] = useState({
    categories: CATEGORY_GROUPS.map((category) => ({ id: category.id, name: category.name })),
    cities: CITIES,
    eventTypes: EVENT_TYPES,
    sortOptions: SORT_OPTIONS,
  });

  const [search, setSearch] = useState(INITIAL_SEARCH);
  const [providers, setProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providersError, setProvidersError] = useState("");

  const [bookingForm, setBookingForm] = useState(INITIAL_BOOKING);
  const [bookingErrors, setBookingErrors] = useState({});
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const [vendorForm, setVendorForm] = useState(INITIAL_VENDOR_FORM);
  const [vendorErrors, setVendorErrors] = useState({});
  const [vendorSubmitting, setVendorSubmitting] = useState(false);

  const [packageForm, setPackageForm] = useState(INITIAL_PACKAGE_FORM);
  const [packageSubmitting, setPackageSubmitting] = useState(false);

  const [requestHistory, setRequestHistory] = useState(() => readLocalHistory());
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [vendorDashboardPhone, setVendorDashboardPhone] = useState("");
  const [vendorDashboardLoading, setVendorDashboardLoading] = useState(false);
  const [vendorDashboard, setVendorDashboard] = useState(null);
  const [adminModerationLoading, setAdminModerationLoading] = useState(false);

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [toast, setToast] = useState({ tone: "info", message: "" });

  const selectedProviderForBooking = useMemo(
    () => providers.find((provider) => provider.id === bookingForm.providerId) || null,
    [providers, bookingForm.providerId]
  );

  const showToast = (tone, message) => setToast({ tone, message });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setToast({ tone: "info", message: "" }), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    window.localStorage.setItem(REQUEST_HISTORY_KEY, JSON.stringify(requestHistory));
  }, [requestHistory]);

  const loadMeta = useCallback(async () => {
    try {
      const data = await localServicesService.getMeta();
      if (data?.categories?.length) {
        setMeta({
          categories: data.categories,
          cities: data.cities || CITIES,
          eventTypes: data.eventTypes || EVENT_TYPES,
          sortOptions: data.sortOptions || SORT_OPTIONS,
        });
      }
    } catch (error) {
      // keep frontend defaults
    }
  }, []);

  const loadProviders = useCallback(async () => {
    setProvidersLoading(true);
    setProvidersError("");
    try {
      const data = await localServicesService.getProviders(search);
      setProviders(data.length > 0 ? data : FALLBACK_PROVIDERS);
    } catch (error) {
      setProviders(FALLBACK_PROVIDERS);
      setProvidersError("Could not load providers from backend. Showing fallback listing.");
    } finally {
      setProvidersLoading(false);
    }
  }, [search]);

  const loadTrackingByPhone = async (phone) => {
    if (!phoneRegex.test(String(phone || "").trim())) {
      return;
    }
    setTrackingLoading(true);
    try {
      const data = await localServicesService.getTrackingByPhone(phone);
      const normalized = toLocalServiceRequestHistory(data);
      setRequestHistory((current) => {
        const merged = [...normalized, ...current];
        const dedupMap = new Map();
        merged.forEach((entry) => dedupMap.set(entry.id, entry));
        return Array.from(dedupMap.values()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      });
    } catch (error) {
      showToast("error", "Could not load request tracking from backend.");
    } finally {
      setTrackingLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const validateBooking = () => {
    const errors = {};
    const eventDate = bookingForm.eventDate ? new Date(bookingForm.eventDate) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const guests = Number(bookingForm.guests || 0);
    const budget = Number(bookingForm.budget || 0);

    if (!bookingForm.providerId) errors.providerId = "Select a provider.";
    if (!bookingForm.eventType) errors.eventType = "Select event type.";
    if (!bookingForm.eventDate) {
      errors.eventDate = "Select event date.";
    } else if (eventDate < today) {
      errors.eventDate = "Past dates are not allowed.";
    }

    if (!Number.isFinite(guests) || guests < 20 || guests > 5000) {
      errors.guests = "Guest count must be between 20 and 5000.";
    }

    if (!Number.isFinite(budget) || budget < 1000 || budget > 5000000) {
      errors.budget = "Budget must be between INR 1,000 and INR 50,00,000.";
    }

    if (selectedProviderForBooking) {
      if (budget < Number(selectedProviderForBooking.priceStart || 0)) {
        errors.budget = `Budget is below provider minimum ${formatInr(selectedProviderForBooking.priceStart)}.`;
      }
      if (budget > Number(selectedProviderForBooking.priceMax || Number.POSITIVE_INFINITY)) {
        errors.budget = `Budget is above provider maximum ${formatInr(selectedProviderForBooking.priceMax)}.`;
      }
    }

    if (!bookingForm.customerName.trim()) errors.customerName = "Customer name is required.";
    if (!phoneRegex.test(String(bookingForm.customerPhone || "").trim())) {
      errors.customerPhone = "Valid phone number is required.";
    }

    if (bookingForm.customerEmail && !String(bookingForm.customerEmail).includes("@")) {
      errors.customerEmail = "Invalid email format.";
    }

    setBookingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateVendor = () => {
    const errors = {};
    if (!vendorForm.businessName.trim()) errors.businessName = "Business name is required.";
    if (!vendorForm.category) errors.category = "Category is required.";
    if (!vendorForm.city) errors.city = "City is required.";
    if (!phoneRegex.test(String(vendorForm.phone || "").trim())) errors.phone = "Valid phone required.";
    if (vendorForm.whatsappNumber && !phoneRegex.test(String(vendorForm.whatsappNumber).trim())) {
      errors.whatsappNumber = "Invalid WhatsApp number.";
    }
    if (!vendorForm.packageName.trim()) errors.packageName = "Service package is required.";
    if (Number(vendorForm.packagePrice || 0) < 1000) errors.packagePrice = "Package price must be at least INR 1,000.";
    if (Number(vendorForm.portfolioItems || 0) < 0) errors.portfolioItems = "Portfolio count cannot be negative.";
    setVendorErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBookingSubmit = async (event) => {
    event.preventDefault();
    if (!validateBooking()) {
      showToast("error", "Fix booking validation errors.");
      return;
    }
    setBookingSubmitting(true);
    try {
      const booking = await localServicesService.createBooking({
        ...bookingForm,
        guests: Number(bookingForm.guests || 0),
        budget: Number(bookingForm.budget || 0),
      });

      setRequestHistory((current) => [
        {
          id: booking.bookingCode,
          type: "Booking request",
          target: booking.providerName,
          status: booking.status,
          createdAt: booking.createdAt,
          amount: Number(booking.payment?.totalAmount || 0),
        },
        ...current,
      ]);

      setBookingForm(INITIAL_BOOKING);
      setBookingErrors({});
      showToast("success", `${booking.bookingCode} sent successfully. Payment flow initialized.`);
      await loadTrackingByPhone(booking.customerPhone);
    } catch (error) {
      showToast("error", error?.response?.data?.message || "Unable to create booking request.");
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleQuoteRequest = async (provider) => {
    if (!bookingForm.customerName.trim() || !phoneRegex.test(String(bookingForm.customerPhone || "").trim())) {
      showToast("error", "Enter customer name and valid phone in booking form before quote request.");
      return;
    }
    try {
      const quote = await localServicesService.createQuoteRequest({
        providerId: provider.id,
        eventType: bookingForm.eventType || "Wedding",
        eventDate: bookingForm.eventDate || tomorrowIsoDate(),
        guests: Number(bookingForm.guests || 100),
        budget: Math.max(1000, Number(bookingForm.budget || provider.priceStart || 10000)),
        notes: bookingForm.notes || "",
        customerName: bookingForm.customerName,
        customerPhone: bookingForm.customerPhone,
        customerEmail: bookingForm.customerEmail || "",
      });
      setRequestHistory((current) => [
        {
          id: quote.quoteCode,
          type: "Quote request",
          target: quote.providerName,
          status: quote.status,
          createdAt: quote.createdAt,
          amount: 0,
        },
        ...current,
      ]);
      showToast("success", `${quote.quoteCode} quote request sent.`);
      await loadTrackingByPhone(bookingForm.customerPhone);
    } catch (error) {
      showToast("error", error?.response?.data?.message || "Unable to request quote.");
    }
  };

  const handleVendorSubmit = async (event) => {
    event.preventDefault();
    if (!validateVendor()) {
      showToast("error", "Fix vendor form validation errors.");
      return;
    }
    setVendorSubmitting(true);
    try {
      const vendor = await localServicesService.createVendor({
        ...vendorForm,
        packagePrice: Number(vendorForm.packagePrice || 0),
        portfolioItems: Number(vendorForm.portfolioItems || 0),
      });
      setVendorForm(INITIAL_VENDOR_FORM);
      setVendorErrors({});
      setRequestHistory((current) => [
        {
          id: vendor.vendorCode,
          type: "Vendor onboarding",
          target: vendor.businessName,
          status: vendor.approvalStatus,
          createdAt: vendor.createdAt,
          amount: 0,
        },
        ...current,
      ]);
      showToast("success", `${vendor.businessName} onboarded with pending moderation.`);
    } catch (error) {
      showToast("error", error?.response?.data?.message || "Unable to submit vendor profile.");
    } finally {
      setVendorSubmitting(false);
    }
  };

  const handlePackageSubmit = async (event) => {
    event.preventDefault();
    if (!packageForm.eventDate) {
      showToast("error", "Select event date for complete package.");
      return;
    }
    if (!phoneRegex.test(String(packageForm.customerPhone || "").trim())) {
      showToast("error", "Enter valid phone for package tracking.");
      return;
    }
    setPackageSubmitting(true);
    try {
      const selectedItems = Object.entries(packageForm.items)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name);
      const localId = `LSP-${Date.now().toString().slice(-6)}`;
      setRequestHistory((current) => [
        {
          id: localId,
          type: "Complete package",
          target: `${packageForm.eventType} (${selectedItems.length} services)`,
          status: "Coordinator assigned",
          createdAt: new Date().toISOString(),
          amount: Number(packageForm.budget || 0),
        },
        ...current,
      ]);
      setPackageForm(INITIAL_PACKAGE_FORM);
      showToast("success", `${localId} package request created and coordinator assigned.`);
    } finally {
      setPackageSubmitting(false);
    }
  };

  const handleProviderDetails = async (provider) => {
    try {
      const details = await localServicesService.getProviderById(provider.id);
      setSelectedProvider(details || provider);
    } catch (error) {
      setSelectedProvider(provider);
    }
  };

  const handleProviderCall = (provider) => {
    if (!provider.phone) {
      showToast("error", "Phone number unavailable for this provider.");
      return;
    }
    window.open(`tel:${provider.phone}`, "_self");
  };

  const handleProviderWhatsApp = (provider) => {
    const whatsappNumber = String(provider.whatsappNumber || provider.phone || "").replace(/[^\d]/g, "");
    if (!whatsappNumber) {
      showToast("error", "WhatsApp number unavailable for this provider.");
      return;
    }
    const text = encodeURIComponent(`Hi ${provider.name}, I need details for ${bookingForm.eventType} service.`);
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleEnquirySend = (provider, enquiry) => {
    if (!enquiry.customerName.trim() || !phoneRegex.test(String(enquiry.customerPhone || "").trim())) {
      showToast("error", "Name and valid phone are required for enquiry.");
      return;
    }
    setRequestHistory((current) => [
      {
        id: `ENQ-${Date.now().toString().slice(-6)}`,
        type: "Provider enquiry",
        target: provider.name,
        status: "Sent",
        createdAt: new Date().toISOString(),
        amount: 0,
      },
      ...current,
    ]);
    showToast("success", "Enquiry submitted to provider.");
    setSelectedProvider(null);
  };

  const handleVendorDashboardLoad = async () => {
    if (!phoneRegex.test(String(vendorDashboardPhone || "").trim())) {
      showToast("error", "Enter valid vendor phone.");
      return;
    }
    setVendorDashboardLoading(true);
    try {
      const data = await localServicesService.getVendorDashboard(vendorDashboardPhone);
      setVendorDashboard(data);
      showToast("success", "Vendor dashboard loaded.");
    } catch (error) {
      setVendorDashboard(null);
      showToast("error", error?.response?.data?.message || "Unable to load vendor dashboard.");
    } finally {
      setVendorDashboardLoading(false);
    }
  };

  const handleAdminModeration = async (payload) => {
    if (!payload.vendorId.trim()) {
      showToast("error", "Vendor ID is required.");
      return;
    }
    setAdminModerationLoading(true);
    try {
      await localServicesService.updateVendorModeration(payload.vendorId, {
        approvalStatus: payload.approvalStatus,
        featured: payload.featured,
        commissionPercent: Number(payload.commissionPercent || 0),
        moderationNote: payload.moderationNote,
      });
      showToast("success", "Vendor moderation updated.");
    } catch (error) {
      showToast("error", error?.response?.data?.message || "Admin moderation failed.");
    } finally {
      setAdminModerationLoading(false);
    }
  };

  return (
    <div className="local-services-page">
      <section className="local-services-hero">
        <p className="local-services-kicker">Local Services Marketplace</p>
        <h1>Book Trusted Local Event Providers Quickly</h1>
        <p className="local-services-subtitle">
          API-connected provider discovery, validated bookings, quote requests, vendor onboarding, and tracking in one flow.
        </p>
      </section>

      <StatusToast tone={toast.tone} message={toast.message} />

      <section className="local-services-section">
        <h2>Main Categories</h2>
        <div className="local-services-categories">
          {CATEGORY_GROUPS.map((group) => (
            <article key={group.id} className="local-services-card">
              <h3>{group.name}</h3>
              <ul className="local-services-list">
                {group.services.map((service) => (
                  <li key={service}>{service}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="local-services-grid">
        <ProviderSearch
          search={search}
          onSearchChange={(field, value) => setSearch((current) => ({ ...current, [field]: value }))}
          categories={meta.categories}
          cities={meta.cities}
          sortOptions={meta.sortOptions}
          loading={providersLoading}
          onRefresh={loadProviders}
        />
        <ProviderList
          providers={providers}
          loading={providersLoading}
          error={providersError}
          formatInr={formatInr}
          onSelectProvider={(provider) => {
            setBookingForm((current) => ({ ...current, providerId: provider.id }));
            showToast("info", `${provider.name} selected for booking.`);
          }}
          onRequestQuote={handleQuoteRequest}
          onCall={handleProviderCall}
          onWhatsApp={handleProviderWhatsApp}
          onViewDetails={handleProviderDetails}
        />
      </section>

      <section className="local-services-grid">
        <BookingForm
          bookingForm={bookingForm}
          providers={providers}
          eventTypes={meta.eventTypes}
          fieldErrors={bookingErrors}
          onChange={(field, value) => setBookingForm((current) => ({ ...current, [field]: value }))}
          onSubmit={handleBookingSubmit}
          formatInr={formatInr}
          loading={bookingSubmitting}
        />
        <VendorForm
          vendorForm={vendorForm}
          categories={meta.categories}
          cities={meta.cities}
          fieldErrors={vendorErrors}
          onChange={(field, value) => setVendorForm((current) => ({ ...current, [field]: value }))}
          onSubmit={handleVendorSubmit}
          submitting={vendorSubmitting}
        />
      </section>

      <section className="local-services-grid">
        <PackageBuilder
          packageForm={packageForm}
          completePackageItems={COMPLETE_PACKAGE_ITEMS}
          eventTypes={meta.eventTypes}
          onChange={(field, value) => setPackageForm((current) => ({ ...current, [field]: value }))}
          onToggleItem={(name, enabled) =>
            setPackageForm((current) => ({
              ...current,
              items: { ...current.items, [name]: enabled },
            }))
          }
          onSubmit={handlePackageSubmit}
          submitting={packageSubmitting}
        />

        <article className="local-services-panel">
          <h2>Monetization and Vendor Growth</h2>
          <ul className="local-services-list">
            <li>Commission per booking with automated payout tracking</li>
            <li>Paid vendor listing and featured provider boost</li>
            <li>Vendor subscription plans and lead purchase wallet</li>
            <li>Advance/full payment flow with refund status</li>
            <li>Invoice and receipt number generation</li>
            <li>Event package bundles and upsell controls</li>
          </ul>
          <h3>Vendor Operations</h3>
          <ul className="local-services-list">
            <li>Lead management and enquiry workflows</li>
            <li>Service availability calendar and request scheduling</li>
            <li>Payment tracking and commission dashboard</li>
            <li>Complaint handling and moderation controls</li>
          </ul>
        </article>
      </section>

      <section className="local-services-grid">
        <VendorDashboard
          vendorPhone={vendorDashboardPhone}
          onVendorPhoneChange={setVendorDashboardPhone}
          onLoadDashboard={handleVendorDashboardLoad}
          loading={vendorDashboardLoading}
          dashboard={vendorDashboard}
          formatInr={formatInr}
        />
        <AdminModerationPanel onSubmit={handleAdminModeration} loading={adminModerationLoading} />
      </section>

      <section className="local-services-panel">
        <h2>Track Requests by Phone</h2>
        <div className="local-services-row">
          <input
            type="text"
            placeholder="Customer phone"
            value={bookingForm.customerPhone}
            onChange={(event) => setBookingForm((current) => ({ ...current, customerPhone: event.target.value }))}
          />
          <button type="button" onClick={() => loadTrackingByPhone(bookingForm.customerPhone)} disabled={trackingLoading}>
            {trackingLoading ? "Loading..." : "Load Tracking"}
          </button>
        </div>
      </section>

      <RequestHistory entries={requestHistory} loading={trackingLoading} formatInr={formatInr} />

      {selectedProvider ? (
        <ProviderDetailsModal
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onSendEnquiry={handleEnquirySend}
          formatInr={formatInr}
        />
      ) : null}
    </div>
  );
};

export default LocalServicesMarketplace;
