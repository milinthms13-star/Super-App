import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import { useApp } from "../../contexts/AppContext";
import "./BusinessServices.css";
import { BACKEND_BASE_URL } from "../../utils/api";

const ORDER_STATUSES = [
  { id: "submitted", label: "Request submitted", color: "#f59e0b", icon: "📝" },
  { id: "under-review", label: "Under review", color: "#3b82f6", icon: "🔍" },
  { id: "pending-docs", label: "Pending documents", color: "#f97316", icon: "📎" },
  { id: "processing", label: "Processing", color: "#0ea5e9", icon: "⚙️" },
  { id: "completed", label: "Completed", color: "#10b981", icon: "✅" },
  { id: "rejected", label: "Rejected", color: "#ef4444", icon: "⛔" },
];

const ORDER_STATUS_ALIASES = {
  "documents-pending": "pending-docs",
  "assigned-to-expert": "under-review",
  "work-in-progress": "processing",
  "approval-pending": "processing",
  "invoice-generated": "completed",
};

const MAX_ORDER_DOCUMENTS = 10;
const MAX_ORDER_DOCUMENT_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_ORDER_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

const DEFAULT_ORDER_FORM = {
  name: "",
  email: "",
  phone: "",
  businessName: "",
  businessType: "",
  packageTier: "Standard",
  documents: [],
  requirements: "",
  preferredDate: "",
  budget: "",
  address: "",
  gstin: "",
};

const revokeDocumentUrls = (documents = []) => {
  for (const doc of documents) {
    if (doc?.url && typeof doc.url === "string") {
      URL.revokeObjectURL(doc.url);
    }
  }
};

const parseINRToNumber = (priceText = "") => {
  const numeric = Number(String(priceText).replace(/[^0-9]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeOrderStatus = (status) => {
  const normalized = String(status || "").trim().toLowerCase();
  if (ORDER_STATUSES.some((item) => item.id === normalized)) return normalized;
  return ORDER_STATUS_ALIASES[normalized] || "submitted";
};

const getStatusLabel = (status) => {
  const normalized = normalizeOrderStatus(status);
  return ORDER_STATUSES.find((item) => item.id === normalized)?.label || normalized;
};

const getMissingRequiredFields = (formValues = {}) => {
  const requiredFields = [
    { key: "name", label: "full name" },
    { key: "email", label: "email address" },
    { key: "phone", label: "phone number" },
    { key: "businessName", label: "business name" },
    { key: "businessType", label: "business type" },
  ];

  return requiredFields
    .filter((item) => !String(formValues[item.key] || "").trim())
    .map((item) => item.label);
};

const BusinessServices = () => {
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  const [serviceOrders, setServiceOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);

  const [showOrderForm, setShowOrderForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [catalog, setCatalog] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [orderForm, setOrderForm] = useState(DEFAULT_ORDER_FORM);
  const { currentUser } = useApp();
  const userRole = currentUser?.role;
  const [selectedPaymentGateway, setSelectedPaymentGateway] = useState("razorpay");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderInteractions, setSelectedOrderInteractions] = useState([]);
  const [selectedOrderLoading, setSelectedOrderLoading] = useState(false);
  const [orderNotifications, setOrderNotifications] = useState([]);
  const [orderMessageDraft, setOrderMessageDraft] = useState("");
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [deliverableUploadLoading, setDeliverableUploadLoading] = useState(false);
  const [deliverableActionError, setDeliverableActionError] = useState("");
  const [completionApproveLoading, setCompletionApproveLoading] = useState(false);
  const [callScheduleLoading, setCallScheduleLoading] = useState(false);
  const [callScheduleForm, setCallScheduleForm] = useState({
    interactionId: "",
    scheduledFor: "",
    callProvider: "manual",
    callLink: "",
    callDuration: 30,
  });
  const [consultantQueue, setConsultantQueue] = useState([]);
  const [adminAlerts, setAdminAlerts] = useState([]);
  const [adminAlertsLoading, setAdminAlertsLoading] = useState(false);
  const orderDocumentsRef = useRef([]);
  const orderSnapshotRef = useRef({});

  const launchJourney = [
    {
      id: "brief",
      title: "Share Your Business Brief",
      desc: "Tell us what you want to launch and upload basic documents in one guided step.",
    },
    {
      id: "match",
      title: "Get Matched With Experts",
      desc: "We route your request to the right compliance, legal, and growth specialists.",
    },
    {
      id: "go-live",
      title: "Track Progress to Go-Live",
      desc: "Monitor timeline updates and receive invoice + completion artifacts in one place.",
    },
  ];

  const launchTrust = [
    "No local memory dependencies",
    "DB-backed order tracking",
    "Expert-led business launch",
    "Transparent package pricing",
  ];

  const serviceCategories = catalog?.categories || [];
  const serviceDetailsMap = useMemo(() => catalog?.serviceDetails || {}, [catalog]);
  const defaultServiceDetails = useMemo(() => catalog?.defaultServiceDetails || {}, [catalog]);
  const starterPackage = catalog?.starterPackage || null;
  const consultationOptions = catalog?.consultationOptions || [];

  const refreshOrders = async () => {
    try {
      const response = await axios.get(`${BACKEND_BASE_URL}/api/business-services/orders/me`);
      if (response.data?.success && response.data.data?.orders) {
        const nextOrders = response.data.data.orders;
        const previousSnapshot = orderSnapshotRef.current || {};
        const nextSnapshot = {};

        nextOrders.forEach((order) => {
          const orderId = String(order._id || order.id || "");
          if (!orderId) return;
          const nextStatus = normalizeOrderStatus(order.status);
          const nextPayment = String(order.paymentStatus || "pending").toLowerCase();
          const prev = previousSnapshot[orderId];

          if (prev && prev.status !== nextStatus) {
            addNotification(`Order #${orderId.slice(-6)} is now ${getStatusLabel(nextStatus)}.`);
          }
          if (prev && prev.paymentStatus !== nextPayment && nextPayment === "paid") {
            addNotification(`Payment confirmed for order #${orderId.slice(-6)}.`);
          }
          if (
            prev &&
            (prev.status !== nextStatus || prev.paymentStatus !== nextPayment) &&
            nextStatus === "completed" &&
            nextPayment === "paid"
          ) {
            addNotification(`Invoice is now ready for order #${orderId.slice(-6)}.`);
          }

          nextSnapshot[orderId] = { status: nextStatus, paymentStatus: nextPayment };
        });

        orderSnapshotRef.current = nextSnapshot;
        setServiceOrders(nextOrders);
      } else {
        setServiceOrders([]);
        orderSnapshotRef.current = {};
      }
    } catch (err) {
      // keep UI stable; show empty list
      setServiceOrders([]);
      orderSnapshotRef.current = {};
    }
  };

  const addNotification = (message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setOrderNotifications((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setOrderNotifications((prev) => prev.filter((item) => item.id !== id));
    }, 6500);
  };

  const fetchOrderDetails = async (orderId) => {
    setSelectedOrderLoading(true);
    try {
      const response = await axios.get(`${BACKEND_BASE_URL}/api/business-services/orders/${encodeURIComponent(orderId)}`);
      if (response.data?.success) {
        setSelectedOrder(response.data.data.order);
        setSelectedOrderInteractions(response.data.data.interactions || []);
      }
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || "Unable to fetch order details.");
    } finally {
      setSelectedOrderLoading(false);
    }
  };

  const openOrderDetail = async (order) => {
    setSelectedOrder(order);
    await fetchOrderDetails(order._id || order.id);
    setActiveSection("orders");
  };

  const fetchConsultantQueue = useCallback(async () => {
    if (!currentUser?.email) return;
    try {
      const response = await axios.get(
        `${BACKEND_BASE_URL}/api/business-services/orders/consultant/${encodeURIComponent(currentUser.email)}/queue`
      );
      if (response.data?.success) {
        setConsultantQueue(response.data.data.orders || []);
      }
    } catch (_err) {
      // ignore silently
    }
  }, [currentUser?.email]);

  const fetchAdminAlerts = useCallback(async () => {
    if (userRole !== "admin") {
      return;
    }
    setAdminAlertsLoading(true);
    try {
      const response = await axios.get(`${BACKEND_BASE_URL}/api/business-services/analytics/alerts`);
      if (response.data?.success) {
        setAdminAlerts(response.data.data?.alerts || []);
      }
    } catch (_error) {
      setAdminAlerts([]);
    } finally {
      setAdminAlertsLoading(false);
    }
  }, [userRole]);

  const updateOrderStatus = async (orderId, nextStatus, note = "") => {
    setStatusUpdateLoading(true);
    try {
      const response = await axios.patch(
        `${BACKEND_BASE_URL}/api/business-services/orders/${encodeURIComponent(orderId)}/status`,
        { status: nextStatus, note }
      );
      if (response.data?.success) {
        addNotification(`Order status updated to ${nextStatus}.`);
        await refreshOrders();
        if (selectedOrder && String(selectedOrder._id || selectedOrder.id) === String(orderId)) {
          await fetchOrderDetails(orderId);
        }
      }
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || "Unable to update order status.");
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const submitOrderInteraction = async (orderId, type, notes) => {
    const trimmedNotes = String(notes || "").trim();
    if (!trimmedNotes) {
      setSubmitError("Please type a message before sending.");
      return;
    }

    try {
      const normalizedType = String(type || "").toLowerCase();
      const existingThread = (selectedOrderInteractions || []).find((interaction) => {
        const threadType = String(interaction?.interactionType || "").toLowerCase();
        if (normalizedType === "chat-request") {
          return threadType === "chat-request" || threadType === "chat";
        }
        if (normalizedType === "call-request") {
          return threadType === "call-request" || threadType === "call";
        }
        return false;
      });

      if (existingThread?._id || existingThread?.id) {
        await axios.post(
          `${BACKEND_BASE_URL}/api/business-services/interactions/${encodeURIComponent(
            existingThread._id || existingThread.id
          )}/messages`,
          { text: trimmedNotes }
        );
      } else {
        await axios.post(`${BACKEND_BASE_URL}/api/business-services/interactions`, {
          interactionType: type,
          orderId,
          categoryId: selectedOrder?.categoryId || "",
          serviceId: selectedOrder?.serviceId || "",
          notes: trimmedNotes,
        });
      }

      addNotification("Message sent to your consultant.");
      setOrderMessageDraft("");
      await fetchOrderDetails(orderId);
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || "Unable to send message.");
    }
  };

  const uploadDeliverablesForOrder = async (orderId, files) => {
    if (!files || files.length === 0) return;
    setDeliverableUploadLoading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("deliverables", file));
      const response = await axios.patch(
        `${BACKEND_BASE_URL}/api/business-services/orders/${encodeURIComponent(orderId)}/deliverables/upload`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (response.data?.success) {
        addNotification("Deliverables uploaded successfully.");
        await refreshOrders();
        await fetchOrderDetails(orderId);
      }
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || "Unable to upload deliverables.");
    } finally {
      setDeliverableUploadLoading(false);
    }
  };

  const setDeliverableStatus = async (orderId, deliverableId, status) => {
    setDeliverableActionError("");
    try {
      const response = await axios.patch(
        `${BACKEND_BASE_URL}/api/business-services/orders/${encodeURIComponent(orderId)}/deliverables/${encodeURIComponent(
          deliverableId
        )}/status`,
        { status }
      );
      if (response.data?.success) {
        addNotification(`Deliverable marked ${status}.`);
        await refreshOrders();
        await fetchOrderDetails(orderId);
      }
    } catch (err) {
      setDeliverableActionError(err?.response?.data?.message || err?.message || "Unable to update deliverable.");
    }
  };

  const approveOrderCompletion = async (orderId, note = "") => {
    setCompletionApproveLoading(true);
    try {
      const response = await axios.post(
        `${BACKEND_BASE_URL}/api/business-services/orders/${encodeURIComponent(orderId)}/completion-approve`,
        { note }
      );
      if (response.data?.success) {
        addNotification("Order marked as completed and approved.");
        await refreshOrders();
        await fetchOrderDetails(orderId);
      }
    } catch (err) {
      setDeliverableActionError(err?.response?.data?.message || err?.message || "Unable to approve completion.");
    } finally {
      setCompletionApproveLoading(false);
    }
  };

  const scheduleInteractionCall = async (orderId) => {
    const interactionId = String(callScheduleForm.interactionId || "").trim();
    const scheduledFor = String(callScheduleForm.scheduledFor || "").trim();
    if (!interactionId || !scheduledFor) {
      setSubmitError("Choose an interaction and call date/time.");
      return;
    }

    setCallScheduleLoading(true);
    setSubmitError("");
    try {
      const response = await axios.post(
        `${BACKEND_BASE_URL}/api/business-services/interactions/${encodeURIComponent(interactionId)}/schedule-call`,
        {
          scheduledFor: new Date(scheduledFor).toISOString(),
          callProvider: callScheduleForm.callProvider,
          callLink: callScheduleForm.callLink,
          callDuration: Number(callScheduleForm.callDuration || 30),
        }
      );
      if (response.data?.success) {
        addNotification("Call scheduled successfully.");
        await fetchOrderDetails(orderId);
      }
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || "Unable to schedule call.");
    } finally {
      setCallScheduleLoading(false);
    }
  };

  const getOrderStatusOptions = (order) => {
    const normalized = normalizeOrderStatus(order?.status);
    if (!currentUser) return [];
    const role = String(currentUser.role || "").toLowerCase();
    const allowed = [];
    if (role === "admin") {
      if (normalized === "submitted") allowed.push("under-review", "rejected");
      if (normalized === "under-review") allowed.push("processing", "rejected", "pending-docs");
      if (normalized === "processing") allowed.push("completed", "rejected", "pending-docs");
      if (normalized === "pending-docs") allowed.push("under-review", "rejected");
    } else if (role === "consultant") {
      if (normalized === "under-review") allowed.push("processing", "pending-docs");
      if (normalized === "processing") allowed.push("completed", "pending-docs");
    }
    return allowed;
  };

  const renderOrderHistory = (order) => {
    return (order?.history || []).map((entry, index) => (
      <div key={`${entry.changedAt || index}-${entry.status}`} className="timeline-entry">
        <div className="timeline-entry-top">
          <span className="timeline-status-label">{entry.status}</span>
          <span>{entry.changedBy || "System"}</span>
          <span>{entry.changedAt ? new Date(entry.changedAt).toLocaleString() : ""}</span>
        </div>
        {entry.note ? <div className="timeline-note">{entry.note}</div> : null}
      </div>
    ));
  };

  const callCapableInteractions = useMemo(
    () =>
      (selectedOrderInteractions || []).filter((interaction) => {
        const type = String(interaction?.interactionType || "").toLowerCase();
        return type.includes("call") || type.includes("consultation") || type.includes("chat");
      }),
    [selectedOrderInteractions]
  );

  const orderHasPendingPayment = (order) => order?.paymentStatus !== "paid";

  useEffect(() => {
    if (userRole === "admin" || userRole === "consultant") {
      void fetchConsultantQueue();
    }
  }, [fetchConsultantQueue, userRole]);

  useEffect(() => {
    if (userRole === "admin") {
      void fetchAdminAlerts();
    }
  }, [fetchAdminAlerts, userRole]);

  useEffect(() => {
    const intervalMs = selectedOrder ? 20000 : 45000;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void refreshOrders();
      if (selectedOrder) {
        void fetchOrderDetails(selectedOrder._id || selectedOrder.id);
      }
      if (userRole === "admin") {
        void fetchAdminAlerts();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [fetchAdminAlerts, selectedOrder, userRole]);

  useEffect(() => {
    orderDocumentsRef.current = orderForm.documents;
  }, [orderForm.documents]);

  useEffect(() => {
    if (!callCapableInteractions.length) {
      setCallScheduleForm((prev) => ({ ...prev, interactionId: "" }));
      return;
    }
    const selectedExists = callCapableInteractions.some(
      (interaction) => String(interaction._id || interaction.id) === String(callScheduleForm.interactionId || "")
    );
    if (!selectedExists) {
      const firstInteraction = callCapableInteractions[0];
      setCallScheduleForm((prev) => ({
        ...prev,
        interactionId: String(firstInteraction?._id || firstInteraction?.id || ""),
      }));
    }
  }, [callCapableInteractions, callScheduleForm.interactionId]);

  useEffect(() => {
    return () => {
      revokeDocumentUrls(orderDocumentsRef.current);
    };
  }, []);

  const navSections = useMemo(
    () => {
      const baseSections = [
        { id: "overview", label: "Overview", icon: "🏠" },
        { id: "services", label: "All Services", icon: "📋" },
        { id: "business-starter", label: "Business Starter", icon: "🚀" },
        { id: "orders", label: "My Orders", icon: "📦" },
        { id: "consultation", label: "Consultation", icon: "💬" },
      ];
      if (userRole === "admin" || userRole === "consultant") {
        return [...baseSections, { id: "consultant-queue", label: "My Assignments", icon: "🧑‍💼" }];
      }
      return baseSections;
    },
    [userRole]
  );

  useEffect(() => {
    const fetchCatalog = async () => {
      setCatalogLoading(true);
      try {
        const response = await axios.get(`${BACKEND_BASE_URL}/api/business-services/catalog`);
        if (!response.data?.success || !response.data?.data?.catalog) {
          throw new Error("Catalog is not available.");
        }
        setCatalog(response.data.data.catalog);
      } catch (err) {
        setSubmitError(err?.response?.data?.message || err?.message || "Unable to load business services catalog.");
        setCatalog(null);
      } finally {
        setCatalogLoading(false);
      }
    };

    void fetchCatalog();
  }, []);

  const handleOpenServiceDetail = (category, service) => {
    setSelectedCategory(category);
    setSelectedService(service);
    setActiveSection("service-detail");
    setSubmitError("");
  };

  const handleServiceSelect = (category, service) => {
    setSelectedCategory(category);
    setSelectedService(service);
    setShowOrderForm(true);
    setSubmitError("");
  };

  const openBusinessStarterOrderForm = () => {
    if (!starterPackage) {
      setSubmitError("Business starter package is not available in DB catalog.");
      return;
    }
    const starterCategory = { id: "business-starter", name: "Business Starter Package" };
    const starterService = {
      id: "business-starter",
      name: starterPackage.name,
      price: starterPackage.price,
      duration: "7 days",
    };
    handleServiceSelect(starterCategory, starterService);
  };

  const openConsultationOrderForm = (typeLabel) => {
    const consultationCategory =
      serviceCategories.find((category) => category.id === "legal-consultation") || {
        id: "legal-consultation",
        name: "Legal Consultation",
      };
    const consultationService = {
      id: "company-law-consultation",
      name: `${typeLabel} Consultation`,
      price: "₹500",
      duration: "1 hour",
    };
    handleServiceSelect(consultationCategory, consultationService);
  };

  const handleFileUpload = (files) => {
    const incomingFiles = Array.from(files || []);
    if (!incomingFiles.length) {
      return;
    }

    const unsupported = incomingFiles.find((file) => !ALLOWED_ORDER_DOCUMENT_TYPES.includes((file.type || "").toLowerCase()));
    if (unsupported) {
      setSubmitError("Only PDF, JPG, and PNG documents are supported.");
      return;
    }

    const oversized = incomingFiles.find((file) => Number(file.size || 0) > MAX_ORDER_DOCUMENT_SIZE_BYTES);
    if (oversized) {
      setSubmitError("Each document must be 8MB or smaller.");
      return;
    }

    setSubmitError("");
    setOrderForm((prev) => {
      const remainingSlots = Math.max(0, MAX_ORDER_DOCUMENTS - prev.documents.length);
      const acceptedFiles = incomingFiles.slice(0, remainingSlots);
      const fileList = acceptedFiles.map((file) => ({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
      }));

      if (!fileList.length) {
        setSubmitError(`You can upload up to ${MAX_ORDER_DOCUMENTS} documents.`);
        return prev;
      }

      return { ...prev, documents: [...prev.documents, ...fileList] };
    });
  };

  const removeUploadedDocument = (index) => {
    setOrderForm((prev) => {
      const nextDocuments = [...prev.documents];
      const [removed] = nextDocuments.splice(index, 1);
      if (removed?.url) {
        URL.revokeObjectURL(removed.url);
      }
      return { ...prev, documents: nextDocuments };
    });
  };

  const loadRazorpayScript = () =>
    new Promise((resolve, reject) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Unable to load Razorpay checkout script."));
      document.head.appendChild(script);
    });

  const verifyBusinessServicePayment = async (orderId, paymentId, payload) => {
    setPaymentLoading(true);
    setPaymentError("");
    setPaymentMessage("Verifying payment...");

    try {
      const response = await axios.post(
        `${BACKEND_BASE_URL}/api/business-services/orders/${encodeURIComponent(orderId)}/payments/verify`,
        {
          paymentId,
          ...payload,
        }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Verification failed.");
      }

      setPaymentMessage("Payment completed successfully.");
      setCurrentOrder(response.data.data?.order || currentOrder);
      await refreshOrders();
    } catch (err) {
      setPaymentError(err?.response?.data?.message || err?.message || "Payment verification failed.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const openRazorpayCheckout = async (paymentData, orderId) => {
    try {
      await loadRazorpayScript();

      const options = {
        key: paymentData.razorpayKeyId,
        amount: Math.round(paymentData.amount * 100),
        currency: "INR",
        name: "Business Services Order",
        description: `Payment for order #${String(orderId).slice(-6)}`,
        order_id: paymentData.gatewayOrderId,
        handler: async (response) => {
          await verifyBusinessServicePayment(orderId, paymentData.paymentId, {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        prefill: {
          name: currentUser?.name || orderForm.name || "",
          email: currentUser?.email || orderForm.email || "",
          contact: currentUser?.phone || orderForm.phone || "",
        },
        notes: {
          orderId,
          serviceName: currentOrder?.serviceName || selectedService?.name || "Business Service",
        },
      };

      if (!window.Razorpay) {
        throw new Error("Razorpay checkout is unavailable.");
      }

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (error) => {
        setPaymentError(error.error?.description || "Razorpay payment failed.");
        setPaymentLoading(false);
      });
      rzp.open();
    } catch (error) {
      setPaymentError(error?.message || "Unable to open payment checkout.");
      setPaymentLoading(false);
    }
  };

  const initializeOrderPayment = async (orderId) => {
    setPaymentLoading(true);
    setPaymentError("");
    setPaymentMessage("Initializing payment...");

    try {
      const response = await axios.post(
        `${BACKEND_BASE_URL}/api/business-services/orders/${encodeURIComponent(orderId)}/payments/initiate`,
        {
          gateway: selectedPaymentGateway,
          paymentMethod: "upi",
        }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to initiate payment.");
      }

      const paymentData = response.data.data;
      setPaymentMessage("Payment initialized. Opening checkout...");

      if (paymentData.gateway === "razorpay") {
        await openRazorpayCheckout(paymentData, orderId);
      } else {
        setPaymentMessage("Payment initialized. Follow the gateway instructions to complete the payment.");
      }
    } catch (error) {
      setPaymentError(error?.response?.data?.message || error?.message || "Unable to start payment.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const selectedServiceDetails = useMemo(
    () => (selectedService ? serviceDetailsMap[selectedService.id] || defaultServiceDetails : null),
    [selectedService, serviceDetailsMap, defaultServiceDetails]
  );

  const requiredDocuments = selectedServiceDetails?.requiredDocuments || [];

  const missingDocuments = requiredDocuments.filter((required) =>
    !orderForm.documents.some((doc) =>
      doc.name.toLowerCase().includes(required.toLowerCase().split(" ")[0])
    )
  );

  const selectedPackageDetails = selectedServiceDetails?.packages?.find(
    (pkg) => pkg.tier === orderForm.packageTier
  );

  const serviceVendor = selectedServiceDetails?.vendor || {};
  const isSelectedOrderOwner =
    String(selectedOrder?.customerEmail || "").toLowerCase() === String(currentUser?.email || "").toLowerCase();
  const canReviewDeliverables = currentUser?.role === "admin" || isSelectedOrderOwner;
  const canUploadDeliverables = currentUser?.role === "admin" || currentUser?.role === "consultant";

  const createInteractionRequest = async ({
    interactionType,
    orderId = "",
    categoryId = "",
    serviceId = "",
    notes = "",
    metadata = {},
  }) => {
    try {
      await axios.post(`${BACKEND_BASE_URL}/api/business-services/interactions`, {
        interactionType,
        orderId,
        categoryId,
        serviceId,
        notes,
        metadata,
      });
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || "Unable to submit interaction request.");
    }
  };

  const handleOrderSubmit = async () => {
    if (!selectedService || !selectedCategory) return;

    const missingFields = getMissingRequiredFields(orderForm);
    if (missingFields.length > 0) {
      setSubmitError(`Please provide: ${missingFields.join(", ")}.`);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const isStarterPackage = selectedService.id === "business-starter" || selectedCategory.id === "business-starter";
      const effectivePackageTier = isStarterPackage ? "Starter" : orderForm.packageTier;
      const effectivePrice = selectedPackageDetails?.price || selectedService.price;

      const formData = new FormData();
      formData.append("categoryId", selectedCategory.id);
      formData.append("categoryName", selectedCategory.name || "");
      formData.append("serviceId", selectedService.id);
      formData.append("serviceName", selectedService.name || "");
      formData.append("isStarterPackage", String(isStarterPackage));

      formData.append(
        "pricing",
        JSON.stringify({
          priceText: effectivePrice,
          priceNumber: parseINRToNumber(effectivePrice),
          durationText: selectedService.duration,
          packageTier: effectivePackageTier,
        })
      );

      formData.append(
        "formData",
        JSON.stringify({
          name: orderForm.name,
          email: orderForm.email,
          phone: orderForm.phone,
          businessName: orderForm.businessName,
          businessType: orderForm.businessType,
          address: orderForm.address,
          gstin: orderForm.gstin,
        })
      );

      formData.append("packageTier", effectivePackageTier);
      formData.append("requirements", orderForm.requirements || "");
      formData.append("estimatedCompletion", orderForm.preferredDate ? `${orderForm.preferredDate}T00:00:00.000Z` : "");

      for (const doc of orderForm.documents) {
        if (doc?.file) {
          formData.append("documents", doc.file);
        }
      }

      const response = await axios.post(
        `${BACKEND_BASE_URL}/api/business-services/orders`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Order could not be created.");
      }

      const order = response.data.data?.order;
      setCurrentOrder(order);
      setShowOrderForm(false);

      revokeDocumentUrls(orderForm.documents);
      setOrderForm(DEFAULT_ORDER_FORM);

      await refreshOrders();
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || "Request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const normalizedStatus = normalizeOrderStatus(status);
    const statusObj = ORDER_STATUSES.find((s) => s.id === normalizedStatus);
    return statusObj ? statusObj.color : "#6b7280";
  };

  const getStatusIcon = (status) => {
    const normalizedStatus = normalizeOrderStatus(status);
    const statusObj = ORDER_STATUSES.find((s) => s.id === normalizedStatus);
    return statusObj ? statusObj.icon : "❓";
  };

  const getAlertTone = (severity = "") => {
    const normalized = String(severity || "").toLowerCase();
    if (normalized === "critical") {
      return { backgroundColor: "#fee2e2", color: "#991b1b" };
    }
    if (normalized === "warning") {
      return { backgroundColor: "#fef3c7", color: "#92400e" };
    }
    return { backgroundColor: "#dcfce7", color: "#166534" };
  };

  const downloadInvoice = async (orderId) => {
    try {
      const response = await axios.get(
        `${BACKEND_BASE_URL}/api/business-services/orders/${encodeURIComponent(orderId)}/invoice/pdf`,
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `business_service_invoice_${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || "Invoice download failed.");
    }
  };

  const assignConsultant = async (orderId, consultantEmail, consultantName) => {
    try {
      const response = await axios.patch(
        `${BACKEND_BASE_URL}/api/business-services/orders/${encodeURIComponent(orderId)}/consultant`,
        { consultantEmail, consultantName },
        { withCredentials: true }
      );

      if (response.data.success) {
        // Refresh orders to show updated consultant info
        await refreshOrders();
        alert(`Consultant ${consultantName} assigned successfully!`);
      } else {
        alert(response.data.message || "Failed to assign consultant.");
      }
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "Failed to assign consultant.");
    }
  };

  return (
    <div className="business-services-shell">
      <div className="business-services-hero">
        <div className="business-services-hero-copy">
          <span className="launch-eyebrow">Launch-ready Business OS</span>
          <h1>Launch Your Business Faster With One Unified Service Desk</h1>
          <p>
            From registration to compliance to launch support, manage your full business setup journey in one
            DB-backed flow with expert help at every step.
          </p>
          <div className="launch-cta-row">
            <button className="primary-button launch-primary" onClick={openBusinessStarterOrderForm} type="button">
              Launch In 7 Days
            </button>
            <button className="secondary-button launch-secondary" onClick={() => setActiveSection("services")} type="button">
              Explore Services
            </button>
          </div>
          <div className="business-services-hero-tags">
            <span>Business Registration</span>
            <span>GST & Tax Services</span>
            <span>Legal Consultation</span>
            <span>Digital Marketing</span>
          </div>
        </div>
        <div className="business-services-hero-stats">
          <div className="stat-card">
            <span className="stat-number">500+</span>
            <span className="stat-label">Businesses Served</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">98%</span>
            <span className="stat-label">Client Satisfaction</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">7 Days</span>
            <span className="stat-label">Starter Go-Live Target</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">24/7</span>
            <span className="stat-label">Order Visibility</span>
          </div>
        </div>
      </div>

      {orderNotifications.length > 0 && (
        <div className="business-services-notifications">
          {orderNotifications.map((notification) => (
            <div key={notification.id} className="business-services-notification-item">
              {notification.message}
            </div>
          ))}
        </div>
      )}

      <div className="business-services-nav">
        {navSections.map((section) => (
          <button
            key={section.id}
            className={`business-services-nav-item ${activeSection === section.id ? "active" : ""}`}
            onClick={() => setActiveSection(section.id)}
            type="button"
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      {submitError ? <div className="app-loading" style={{ color: "#ef4444" }}>{submitError}</div> : null}

      <div className="business-services-content">
        {catalogLoading ? (
          <div className="business-services-section">
            <div className="empty-orders">
              <h3>Loading services catalog...</h3>
            </div>
          </div>
        ) : null}

        {!catalogLoading && !catalog ? (
          <div className="business-services-section">
            <div className="empty-orders">
              <h3>Business services catalog is not configured in DB</h3>
              <p>Please seed `business_services_catalog` and reload.</p>
            </div>
          </div>
        ) : null}

        {!catalogLoading && catalog && activeSection === "overview" && (
          <div className="business-services-section">
            <div className="launch-trust-strip">
              {launchTrust.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>

            <div className="overview-grid">
              <div className="overview-card business-starter-highlight">
                <div className="card-header">
                  <h3>🚀 Start Your Business in 7 Days</h3>
                  <div className="pricing">
                    <span className="current-price">{starterPackage?.price || "—"}</span>
                    <span className="original-price">{starterPackage?.originalPrice || "—"}</span>
                    <span className="discount-badge">{starterPackage?.discount || "—"}</span>
                  </div>
                </div>
                <p>Get everything you need to start your business: GST, Udyam, Trade License, Logo, Website, and Digital Presence.</p>
                <div className="package-services">
                  {(starterPackage?.services || []).map((service, i) => (
                    <span key={i} className="service-item">
                      ✓ {service}
                    </span>
                  ))}
                </div>
                <button className="primary-button" onClick={openBusinessStarterOrderForm} type="button">
                  Get Started Now
                </button>
              </div>

              {[
                {
                  title: "📊 GST & Tax Services",
                  desc: "Complete compliance solutions for GST filing, tax returns, and business accounting.",
                  highlights: ["GST Registration", "Monthly Filing", "Tax Consultation"],
                },
                {
                  title: "🏢 Company Registration",
                  desc: "Register your business as proprietorship, partnership, LLP, or private limited company.",
                  highlights: ["Proprietorship", "LLP Registration", "MSME Registration"],
                },
                {
                  title: "⚖️ Legal Consultation",
                  desc: "Expert legal advice, agreement drafting, and business law consultation.",
                  highlights: ["Agreement Drafting", "Legal Notice", "Trademark"],
                },
                {
                  title: "📱 Digital Marketing",
                  desc: "Build your online presence with logo design, website creation, and social media marketing.",
                  highlights: ["Logo Design", "Website Creation", "Social Media Setup"],
                },
              ].map((card) => (
                <div key={card.title} className="overview-card">
                  <h3>{card.title}</h3>
                  <p>{card.desc}</p>
                  <div className="service-highlights">
                    {card.highlights.map((h) => (
                      <span key={h}>{h}</span>
                    ))}
                  </div>
                  <button className="secondary-button" onClick={() => setActiveSection("services")} type="button">
                    View All Services
                  </button>
                </div>
              ))}
            </div>

            <div className="launch-journey-grid">
              {launchJourney.map((item, index) => (
                <div key={item.id} className="launch-journey-card">
                  <span className="launch-step-number">0{index + 1}</span>
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>

            {userRole === "admin" && (
              <div className="section-header" style={{ marginTop: "1.25rem" }}>
                <h3>Operations Alerts</h3>
                <p>Recent payment reliability indicators for BusinessServices.</p>
                {adminAlertsLoading ? (
                  <p>Loading alerts...</p>
                ) : (
                  <div className="service-highlights">
                    {(adminAlerts || []).map((alert) => (
                      <span
                        key={alert.key}
                        style={{
                          ...getAlertTone(alert.severity),
                          borderRadius: "999px",
                          padding: "0.4rem 0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        {alert.key}: {alert.count}
                      </span>
                    ))}
                    {(!adminAlerts || adminAlerts.length === 0) && <span>No alert data available.</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeSection === "services" && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>📋 All Business Services</h2>
              <p>Choose from our comprehensive range of business services</p>
            </div>

            <div className="services-categories">
              {serviceCategories.map((category) => (
                <div key={category.id} className="category-card">
                  <div className="category-header">
                    <span className="category-icon">{category.icon}</span>
                    <h3>{category.name}</h3>
                  </div>
                  <p>{category.description}</p>

                  <div className="category-services">
                    {category.services.slice(0, 4).map((service) => (
                      <div key={service.id} className="service-item">
                        <div className="service-info">
                          <h4>{service.name}</h4>
                          <div className="service-meta">
                            <span className="price">{service.price}</span>
                            <span className="duration">{service.duration}</span>
                          </div>
                        </div>
                        <div className="service-actions-inline">
                          <button className="secondary-button" onClick={() => handleOpenServiceDetail(category, service)} type="button">
                            View Details
                          </button>
                          <button className="select-service-btn" onClick={() => handleServiceSelect(category, service)} type="button">
                            Book Now
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="view-all-btn"
                    onClick={() => {
                      setSelectedCategory(category);
                      setActiveSection("category-detail");
                    }}
                    type="button"
                  >
                    View All Services ({category.services.length})
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "business-starter" && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>🚀 Start Your Business in 7 Days</h2>
              <p>Complete business setup package with everything you need to start your business</p>
            </div>

            <div className="business-starter-detail">
              <div className="package-overview">
                <div className="package-header">
                  <h3>{starterPackage?.name || "Business Starter Package"}</h3>
                  <div className="package-pricing">
                    <span className="current-price">{starterPackage?.price || "—"}</span>
                    <span className="original-price">{starterPackage?.originalPrice || "—"}</span>
                    <span className="discount">{starterPackage?.discount || "—"}</span>
                  </div>
                </div>

                <div className="package-services-grid">
                  <div className="services-included">
                    <h4>Services Included:</h4>
                    <ul>
                      {(starterPackage?.services || []).map((service, i) => (
                        <li key={i}>{service}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="package-features">
                    <h4>Additional Benefits:</h4>
                    <ul>
                      {(starterPackage?.features || []).map((feature, i) => (
                        <li key={i}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="package-actions">
                  <button className="primary-button" onClick={openBusinessStarterOrderForm} type="button">
                    Order Business Starter Package
                  </button>
                  <div className="package-meta">
                    <span>⚡ Processing in 7 days</span>
                    <span>🎯 Priority support</span>
                    <span>📞 Dedicated consultant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "orders" && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>📦 My Service Orders</h2>
              <p>Track your service requests and download completed documents</p>
            </div>

            {serviceOrders.length === 0 ? (
              <div className="empty-orders">
                <span className="empty-icon">📋</span>
                <h3>No orders yet</h3>
                <p>Start your business journey by ordering a service</p>
                <button className="primary-button" onClick={() => setActiveSection("services")} type="button">
                  Browse Services
                </button>
              </div>
            ) : (
              <div className="orders-list">
                {serviceOrders.map((order) => (
                  <div key={order._id || order.id} className="order-card">
                    <div className="order-header">
                      <div className="order-info">
                        <h4>{order.serviceName || order.service?.name || "Business Service"}</h4>
                        <p>Order #{String(order._id || order.id || "").slice(-6)}</p>
                        <p>Ordered on {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "—"}</p>
                      </div>
                      <div className="order-status">
                        <span className="status-badge" style={{ backgroundColor: getStatusColor(order.status) }}>
                          {getStatusIcon(order.status)} {getStatusLabel(order.status)}
                        </span>
                      </div>
                    </div>

                    <div className="order-details">
                      <div className="order-meta">
                        <span>
                          Estimated:{" "}
                          {order.estimatedCompletion ? new Date(order.estimatedCompletion).toLocaleDateString() : "—"}
                        </span>
                        <span>Price: {order.pricing?.priceText || "—"}</span>
                        <span>Payment: {order.paymentStatus === "paid" ? "Paid" : "Pending"}</span>
                      </div>

                      {order.consultant && (
                        <div className="consultant-info">
                          <span>
                            <strong>Consultant:</strong> {order.consultant.assignedName || "Assigned"} ({order.consultant.assignedEmail})
                          </span>
                        </div>
                      )}

                      {currentUser?.role === 'admin' && !order.consultant && (
                        <div className="consultant-assignment">
                          <button
                            className="assign-consultant-btn"
                            type="button"
                            onClick={() => {
                              const consultantEmail = prompt('Enter consultant email:');
                              const consultantName = prompt('Enter consultant name:');
                              if (consultantEmail && consultantName) {
                                assignConsultant(order._id || order.id, consultantEmail, consultantName);
                              }
                            }}
                          >
                            👤 Assign Consultant
                          </button>
                        </div>
                      )}

                      <div className="order-timeline">
                        {ORDER_STATUSES.map((step, index) => {
                          const currentIndex = ORDER_STATUSES.findIndex((status) => status.id === normalizeOrderStatus(order.status));
                          const isActive = currentIndex >= index;
                          return (
                            <div key={step.id} className={`timeline-step ${isActive ? "active" : ""}`}>
                              <span>{step.icon}</span>
                              <span>{step.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="order-actions">
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() => openOrderDetail(order)}
                        >
                          📄 View details
                        </button>
                        <button
                          className="chat-btn"
                          type="button"
                          onClick={async () => {
                            await createInteractionRequest({
                              interactionType: "chat-request",
                              orderId: String(order._id || order.id || ""),
                              categoryId: order.categoryId || "",
                              serviceId: order.serviceId || "",
                              notes: `Chat request for order #${String(order._id || order.id || "").slice(-6)}.`,
                            });
                            openConsultationOrderForm("Order Follow-up");
                          }}
                        >
                          💬 Chat with Consultant
                        </button>
                        <button
                          className="call-btn"
                          type="button"
                          onClick={async () => {
                            await createInteractionRequest({
                              interactionType: "call-request",
                              orderId: String(order._id || order.id || ""),
                              categoryId: order.categoryId || "",
                              serviceId: order.serviceId || "",
                              notes: `Call request for order #${String(order._id || order.id || "").slice(-6)}.`,
                            });
                            setOrderForm((prev) => ({
                              ...prev,
                              requirements: `Please call me regarding order #${String(order._id || order.id || "").slice(-6)}.`,
                            }));
                            openConsultationOrderForm("Callback Request");
                          }}
                        >
                          📞 Request Call
                        </button>
                        {order.paymentStatus !== "paid" && (
                          <button
                            className="primary-button"
                            type="button"
                            onClick={() => initializeOrderPayment(order._id || order.id)}
                          >
                            💳 Pay Now
                          </button>
                        )}
                        {normalizeOrderStatus(order.status) === "completed" && order.paymentStatus === "paid" && (
                          <button
                            className="download-btn"
                            type="button"
                            onClick={() => downloadInvoice(String(order._id || order.id))}
                          >
                            🧾 Download Invoice
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedOrder && (
              <div className="order-detail-panel">
                <div className="detail-panel-header">
                  <div>
                    <h3>Order #{String(selectedOrder._id || selectedOrder.id || "").slice(-6)}</h3>
                    <p>{selectedOrder.serviceName || selectedOrder.service?.name || "Business Service"}</p>
                  </div>
                  <div className="detail-panel-actions">
                    <button className="secondary-button" type="button" onClick={() => setSelectedOrder(null)}>
                      Close details
                    </button>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => fetchOrderDetails(selectedOrder._id || selectedOrder.id)}
                    >
                      Refresh
                    </button>
                  </div>
                </div>
                {selectedOrderLoading && (
                  <div className="order-loading">
                    Loading order details...
                  </div>
                )}

                <div className="order-detail-summary">
                  <div>
                    <strong>Status:</strong> {getStatusLabel(selectedOrder.status)}
                  </div>
                  <div>
                    <strong>Payment:</strong> {selectedOrder.paymentStatus === "paid" ? "Paid" : "Pending"}
                  </div>
                  <div>
                    <strong>Approval:</strong> {selectedOrder.approvalStatus || "pending"}
                  </div>
                  <div>
                    <strong>Estimated completion:</strong>{" "}
                    {selectedOrder.estimatedCompletion ? new Date(selectedOrder.estimatedCompletion).toLocaleDateString() : "—"}
                  </div>
                  <div>
                    <strong>Consultant:</strong> {selectedOrder.consultant?.assignedName || "Not assigned"}
                  </div>
                  {(currentUser?.role === "admin" || currentUser?.role === "consultant") && (
                    <div className="order-status-action">
                      <label htmlFor="order-status-select">Change status</label>
                      <select
                        id="order-status-select"
                        defaultValue={normalizeOrderStatus(selectedOrder.status)}
                        onChange={(e) => updateOrderStatus(selectedOrder._id || selectedOrder.id, e.target.value)}
                        disabled={statusUpdateLoading}
                      >
                        <option value={normalizeOrderStatus(selectedOrder.status)}>{getStatusLabel(selectedOrder.status)}</option>
                        {getOrderStatusOptions(selectedOrder).map((statusOption) => (
                          <option key={statusOption} value={statusOption}>
                            {getStatusLabel(statusOption)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="order-history-panel">
                  <h4>Order history</h4>
                  {renderOrderHistory(selectedOrder)}
                </div>

                <div className="order-interactions-panel">
                  <h4>Interaction thread</h4>
                  {(selectedOrderInteractions || []).length === 0 ? (
                    <p>No messages yet. Use the form below to message your consultant.</p>
                  ) : (
                    <div className="interaction-list">
                      {selectedOrderInteractions.map((interaction) => (
                        <div key={interaction._id || interaction.id} className="interaction-item">
                          <div className="interaction-meta">
                            <span>{interaction.interactionType}</span>
                            <span>{interaction.createdAt ? new Date(interaction.createdAt).toLocaleString() : ""}</span>
                          </div>
                          <div className="interaction-notes">{interaction.notes}</div>
                          {(interaction.messages || []).length > 0 && (
                            <div className="interaction-thread-preview">
                              {interaction.messages.slice(-3).map((message) => (
                                <div
                                  key={`${interaction._id || interaction.id}-${message._id || message.sentAt}-${message.text}`}
                                  className="interaction-thread-message"
                                >
                                  <strong>{message.senderRole || "member"}:</strong> {message.text}
                                </div>
                              ))}
                            </div>
                          )}
                          {interaction.scheduledFor && (
                            <div className="interaction-call-meta">
                              Call scheduled: {new Date(interaction.scheduledFor).toLocaleString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="interaction-form">
                    <textarea
                      value={orderMessageDraft}
                      onChange={(e) => setOrderMessageDraft(e.target.value)}
                      placeholder="Type a message to your consultant"
                    />
                    <div className="interaction-form-actions">
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => submitOrderInteraction(selectedOrder._id || selectedOrder.id, "chat-request", orderMessageDraft)}
                      >
                        Send message
                      </button>
                    </div>
                  </div>

                  {callCapableInteractions.length > 0 && (
                    <div className="interaction-call-scheduler">
                      <h5>Schedule a call</h5>
                      <div className="interaction-form-actions">
                        <select
                          value={callScheduleForm.interactionId}
                          onChange={(e) =>
                            setCallScheduleForm((prev) => ({
                              ...prev,
                              interactionId: e.target.value,
                            }))
                          }
                        >
                          {callCapableInteractions.map((interaction) => (
                            <option key={interaction._id || interaction.id} value={interaction._id || interaction.id}>
                              {interaction.interactionType} • {new Date(interaction.createdAt || Date.now()).toLocaleDateString()}
                            </option>
                          ))}
                        </select>
                        <input
                          type="datetime-local"
                          value={callScheduleForm.scheduledFor}
                          onChange={(e) =>
                            setCallScheduleForm((prev) => ({
                              ...prev,
                              scheduledFor: e.target.value,
                            }))
                          }
                        />
                        <select
                          value={callScheduleForm.callProvider}
                          onChange={(e) =>
                            setCallScheduleForm((prev) => ({
                              ...prev,
                              callProvider: e.target.value,
                            }))
                          }
                        >
                          <option value="manual">Manual</option>
                          <option value="zoom">Zoom</option>
                          <option value="google-meet">Google Meet</option>
                          <option value="twilio">Twilio</option>
                        </select>
                        <input
                          type="url"
                          placeholder="Call link (optional)"
                          value={callScheduleForm.callLink}
                          onChange={(e) =>
                            setCallScheduleForm((prev) => ({
                              ...prev,
                              callLink: e.target.value,
                            }))
                          }
                        />
                        <input
                          type="number"
                          min={5}
                          max={240}
                          value={callScheduleForm.callDuration}
                          onChange={(e) =>
                            setCallScheduleForm((prev) => ({
                              ...prev,
                              callDuration: e.target.value,
                            }))
                          }
                        />
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={callScheduleLoading}
                          onClick={() => scheduleInteractionCall(selectedOrder._id || selectedOrder.id)}
                        >
                          {callScheduleLoading ? "Scheduling..." : "Schedule Call"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="deliverables-panel">
                  <h4>Deliverables</h4>
                  {selectedOrder.deliverables?.length ? (
                    <div className="deliverable-list">
                          {selectedOrder.deliverables.map((deliverable) => (
                        <div key={deliverable._id || deliverable.id} className="deliverable-item">
                          <div>
                            <strong>{deliverable.name || "Deliverable"}</strong>
                            <p>{deliverable.description || "Uploaded file or document"}</p>
                          </div>
                          <div className="deliverable-status-row">
                            <span>Status: {deliverable.status || "pending"}</span>
                            {canReviewDeliverables && (
                              <div className="deliverable-status-actions">
                                {deliverable.status !== "approved" && (
                                  <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={() =>
                                      setDeliverableStatus(
                                        selectedOrder._id || selectedOrder.id,
                                        deliverable.fileId || deliverable._id || deliverable.id,
                                        "approved"
                                      )
                                    }
                                  >
                                    Approve
                                  </button>
                                )}
                                {deliverable.status !== "rejected" && (
                                  <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={() =>
                                      setDeliverableStatus(
                                        selectedOrder._id || selectedOrder.id,
                                        deliverable.fileId || deliverable._id || deliverable.id,
                                        "rejected"
                                      )
                                    }
                                  >
                                    Reject
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No deliverables uploaded yet.</p>
                  )}

                  {canUploadDeliverables && (
                    <div className="deliverable-upload-form">
                      <label htmlFor="deliverableUpload">Upload deliverables</label>
                      <input
                        id="deliverableUpload"
                        type="file"
                        multiple
                        onChange={(e) => uploadDeliverablesForOrder(selectedOrder._id || selectedOrder.id, e.target.files)}
                      />
                      {deliverableUploadLoading && <p>Uploading files...</p>}
                      {deliverableActionError && <p className="error-text">{deliverableActionError}</p>}
                    </div>
                  )}

                  {canReviewDeliverables &&
                    selectedOrder.paymentStatus === "paid" &&
                    selectedOrder.approvalStatus !== "approved" && (
                      <div className="deliverable-upload-form">
                        <button
                          className="primary-button"
                          type="button"
                          disabled={completionApproveLoading}
                          onClick={() => approveOrderCompletion(selectedOrder._id || selectedOrder.id)}
                        >
                          {completionApproveLoading ? "Approving..." : "Approve Completion"}
                        </button>
                        <p className="doc-vault-note">
                          Use this when consultant deliverables are satisfactory. This closes the order and unlocks invoice.
                        </p>
                      </div>
                    )}
                </div>

                {orderHasPendingPayment(selectedOrder) && (
                  <div className="order-payment-panel">
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => initializeOrderPayment(selectedOrder._id || selectedOrder.id)}
                    >
                      Retry payment
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeSection === "consultation" && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>💬 Business Consultation</h2>
              <p>Get expert advice for your business needs</p>
            </div>

            <div className="consultation-options">
              {consultationOptions.map((c) => (
                <div key={c.title} className="consultation-card">
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                  <div className="consultation-price">{c.price}</div>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={async () => {
                      await createInteractionRequest({
                        interactionType: "consultation-request",
                        categoryId: "legal-consultation",
                        serviceId: "company-law-consultation",
                        notes: `Consultation request: ${c.title}`,
                        metadata: { title: c.title, price: c.price },
                      });
                      openConsultationOrderForm(c.title.replace(/^[^A-Za-z0-9]+/, ""));
                    }}
                  >
                    Book Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "consultant-queue" && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>🧑‍💼 My Assignments</h2>
              <p>View orders assigned to you for review and delivery.</p>
            </div>
            {consultantQueue.length === 0 ? (
              <div className="empty-orders">
                <span className="empty-icon">🧾</span>
                <h3>No assignments yet</h3>
                <p>Assigned orders from the operations team will appear here.</p>
              </div>
            ) : (
              <div className="orders-list">
                {consultantQueue.map((order) => (
                  <div key={order._id || order.id} className="order-card">
                    <div className="order-header">
                      <div className="order-info">
                        <h4>{order.serviceName || order.service?.name || "Business Service"}</h4>
                        <p>Order #{String(order._id || order.id || "").slice(-6)}</p>
                      </div>
                      <div className="order-status">
                        <span className="status-badge" style={{ backgroundColor: getStatusColor(order.status) }}>
                          {getStatusIcon(order.status)} {getStatusLabel(order.status)}
                        </span>
                      </div>
                    </div>
                    <div className="order-details">
                      <div className="order-meta">
                        <span>Payment: {order.paymentStatus === "paid" ? "Paid" : "Pending"}</span>
                        <span>Client: {order.customerName || order.name || "-"}</span>
                      </div>
                      <button className="secondary-button" type="button" onClick={() => openOrderDetail(order)}>
                        View order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === "category-detail" && selectedCategory && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>
                {selectedCategory.icon} {selectedCategory.name}
              </h2>
              <p>{selectedCategory.description}</p>
              <button className="back-btn" onClick={() => setActiveSection("services")} type="button">
                ← Back to All Services
              </button>
            </div>

            <div className="services-grid">
              {selectedCategory.services.map((service) => (
                <div key={service.id} className="service-detail-card">
                  <div className="service-header">
                    <h4>{service.name}</h4>
                    <div className="service-pricing">
                      <span className="price">{service.price}</span>
                      <span className="duration">{service.duration}</span>
                    </div>
                  </div>
                  <div className="service-detail-actions">
                    <button className="secondary-button" onClick={() => handleOpenServiceDetail(selectedCategory, service)} type="button">
                      View Details
                    </button>
                    <button className="primary-button" onClick={() => handleServiceSelect(selectedCategory, service)} type="button">
                      Order This Service
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "service-detail" && selectedService && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>{selectedService.name}</h2>
              <p>{selectedServiceDetails?.overview}</p>
              <button className="back-btn" onClick={() => setActiveSection("category-detail")} type="button">
                ← Back to {selectedCategory?.name || "Services"}
              </button>
            </div>

            <div className="service-detail-grid">
              <div className="detail-left">
                <div className="detail-card">
                  <h4>What is included</h4>
                  <ul>
                    {(selectedServiceDetails?.included || []).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="detail-card">
                  <h4>Required documents</h4>
                  <ul>
                    {(selectedServiceDetails?.requiredDocuments || []).map((doc, index) => (
                      <li key={index}>{doc}</li>
                    ))}
                  </ul>
                  {missingDocuments.length > 0 && (
                    <div className="missing-docs-alert">
                      <strong>Missing documents:</strong> {missingDocuments.join(", ")}.
                    </div>
                  )}
                </div>

                <div className="detail-card">
                  <h4>Timeline</h4>
                  <ol>
                    {(selectedServiceDetails?.timeline || []).map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div className="detail-card">
                  <h4>FAQs</h4>
                  {(selectedServiceDetails?.faqs || []).map((faq, index) => (
                    <div key={index} className="faq-item">
                      <strong>{faq.question}</strong>
                      <p>{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="detail-right">
                <div className="detail-card consultant-card">
                  <h4>Consultant profile</h4>
                  <p className="consultant-name">{selectedServiceDetails?.consultant?.name}</p>
                  <p>{selectedServiceDetails?.consultant?.title}</p>
                  <p>{selectedServiceDetails?.consultant?.experience} experience</p>
                  <p>⭐ {selectedServiceDetails?.consultant?.rating} ({selectedServiceDetails?.consultant?.reviews} reviews)</p>
                  <button
                    className="chat-btn"
                    type="button"
                    onClick={async () => {
                      await createInteractionRequest({
                        interactionType: "chat-request",
                        categoryId: selectedCategory?.id || "",
                        serviceId: selectedService?.id || "",
                        notes: `Pre-booking chat request for ${selectedService?.name || "service"}.`,
                      });
                      openConsultationOrderForm(selectedService?.name || "Pre-booking");
                    }}
                  >
                    💬 Chat before booking
                  </button>
                </div>

                <div className="detail-card vendor-card">
                  <div className="vendor-badge">Verified Partner</div>
                  <h4>Expert vendor</h4>
                  <p className="vendor-name">{serviceVendor.name}</p>
                  <p>{serviceVendor.title}</p>
                  <div className="vendor-profile-tags">
                    <span>{serviceVendor.type}</span>
                    <span>{serviceVendor.location}</span>
                  </div>
                  <p>⭐ {serviceVendor.rating} ({serviceVendor.reviews} reviews)</p>
                  <p>Response: {serviceVendor.responseTime}</p>
                  {serviceVendor.highlights?.length > 0 && (
                    <ul className="vendor-highlights">
                      {serviceVendor.highlights.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  )}
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={async () => {
                      await createInteractionRequest({
                        interactionType: "vendor-contact-request",
                        categoryId: selectedCategory?.id || "",
                        serviceId: selectedService?.id || "",
                        notes: `Vendor contact requested for ${selectedService?.name || "service"}.`,
                        metadata: { vendorName: serviceVendor.name || "" },
                      });
                      window.location.href = "mailto:support@nilahub.com?subject=Business%20Services%20Vendor%20Contact";
                    }}
                  >
                    Contact Vendor
                  </button>
                </div>

                <div className="detail-card package-grid">
                  <h4>Package pricing</h4>
                  {(selectedServiceDetails?.packages || []).map((pkg) => (
                    <div key={pkg.tier} className={`package-card ${orderForm.packageTier === pkg.tier ? "selected" : ""}`}>
                      <div className="package-card-header">
                        <strong>{pkg.tier}</strong>
                        <span>{pkg.price}</span>
                      </div>
                      <p>{pkg.description}</p>
                      <ul>
                        {pkg.features.map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                      <button
                        className={`secondary-button ${orderForm.packageTier === pkg.tier ? "selected-action" : ""}`}
                        type="button"
                        onClick={() => setOrderForm((prev) => ({ ...prev, packageTier: pkg.tier }))}
                      >
                        {orderForm.packageTier === pkg.tier ? "Selected" : "Select"}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="detail-card refund-card">
                  <h4>Refund & cancellation</h4>
                  <p>{selectedServiceDetails?.refundPolicy}</p>
                </div>

                <div className="detail-card">
                  <h4>Ready to book?</h4>
                  <p>Choose a package and upload documents to start the order.</p>
                  <button className="primary-button" type="button" onClick={() => handleServiceSelect(selectedCategory, selectedService)}>
                    Book {selectedService.name}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>

      {showOrderForm && selectedService && (
        <div className="order-form-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Order {selectedService.name}</h3>
              <button className="close-btn" onClick={() => setShowOrderForm(false)} type="button">
                ×
              </button>
            </div>

            <div className="order-form">
              <div className="form-section">
                <h4>Personal Information</h4>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={orderForm.name}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={orderForm.email}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, email: e.target.value }))}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={orderForm.phone}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="form-section">
                <h4>Business Information</h4>
                <input
                  type="text"
                  placeholder="Business Name"
                  value={orderForm.businessName}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, businessName: e.target.value }))}
                />
                <select
                  value={orderForm.businessType}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, businessType: e.target.value }))}
                >
                  <option value="">Select Business Type</option>
                  <option value="proprietorship">Proprietorship</option>
                  <option value="partnership">Partnership</option>
                  <option value="llp">LLP</option>
                  <option value="private-limited">Private Limited</option>
                  <option value="other">Other</option>
                </select>
                {selectedServiceDetails?.packages && (
                  <select
                    value={orderForm.packageTier}
                    onChange={(e) => setOrderForm((prev) => ({ ...prev, packageTier: e.target.value }))}
                  >
                    {(selectedServiceDetails.packages || []).map((pkg) => (
                      <option key={pkg.tier} value={pkg.tier}>
                        {pkg.tier} — {pkg.price}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="form-section">
                <h4>Documents Upload</h4>
                <p className="doc-vault-note">Secure document vault: Your uploads are stored safely and only shared with your assigned consultant.</p>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                {selectedServiceDetails?.requiredDocuments?.length > 0 && (
                  <div className="document-checklist">
                    <h5>Checklist</h5>
                    <ul>
                      {selectedServiceDetails.requiredDocuments.map((doc, i) => (
                        <li key={i}>{doc}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {missingDocuments.length > 0 && (
                  <div className="missing-docs-alert">
                    <strong>Missing documents:</strong> {missingDocuments.join(", ")}.
                  </div>
                )}
                {orderForm.documents.length > 0 && (
                  <div className="uploaded-files">
                    {orderForm.documents.map((file, i) => (
                      <div key={i} className="file-item">
                        <span>{file.name}</span>
                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => removeUploadedDocument(i)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-section">
                <h4>Additional Requirements</h4>
                <textarea
                  placeholder="Describe your specific requirements..."
                  value={orderForm.requirements}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, requirements: e.target.value }))}
                  rows={4}
                />
                <input
                  type="date"
                  value={orderForm.preferredDate}
                  onChange={(e) => setOrderForm((prev) => ({ ...prev, preferredDate: e.target.value }))}
                />
              </div>

              <div className="order-summary">
                <h4>Order Summary</h4>
                <div className="summary-item">
                  <span>Service:</span>
                  <span>{selectedService.name}</span>
                </div>
                <div className="summary-item">
                  <span>Package:</span>
                  <span>{orderForm.packageTier}</span>
                </div>
                <div className="summary-item">
                  <span>Price:</span>
                  <span>{selectedPackageDetails?.price || selectedService.price}</span>
                </div>
                <div className="summary-item">
                  <span>Duration:</span>
                  <span>{selectedService.duration}</span>
                </div>
              </div>

              <div className="form-actions">
                <button className="secondary-button" onClick={() => setShowOrderForm(false)} type="button">
                  Cancel
                </button>
                <button className="primary-button" onClick={handleOrderSubmit} disabled={isSubmitting} type="button">
                  {isSubmitting ? "Placing..." : "Place Order"}
                </button>
              </div>

              {submitError ? <div style={{ color: "#ef4444" }}>{submitError}</div> : null}
            </div>
          </div>
        </div>
      )}

      {currentOrder && (
        <div className="order-confirmation-modal">
          <div className="modal-content">
            <div className="confirmation-header">
              <span className="success-icon">✅</span>
              <h3>Order Placed Successfully!</h3>
            </div>

            <div className="order-details">
              <p>
                <strong>Order ID:</strong> #{String(currentOrder._id || currentOrder.id || "").slice(-6)}
              </p>
              <p>
                <strong>Service:</strong> {currentOrder.serviceName || selectedService?.name || "Business Service"}
              </p>
              <p>
                <strong>Status:</strong> {getStatusLabel(currentOrder.status || "submitted")}
              </p>
              <p>
                <strong>Estimated Completion:</strong>{" "}
                {currentOrder.estimatedCompletion ? new Date(currentOrder.estimatedCompletion).toLocaleDateString() : "—"}
              </p>
              <p>
                <strong>Payment:</strong> {currentOrder.paymentStatus === "paid" ? "Paid" : "Pending"}
              </p>
              <div className="payment-method-row">
                <label htmlFor="paymentGateway">Payment gateway</label>
                <select
                  id="paymentGateway"
                  value={selectedPaymentGateway}
                  onChange={(e) => setSelectedPaymentGateway(e.target.value)}
                >
                  <option value="razorpay">Razorpay</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>
              {paymentMessage ? <p className="payment-message">{paymentMessage}</p> : null}
              {paymentError ? <p className="payment-error">{paymentError}</p> : null}
            </div>

            {currentOrder.paymentStatus !== "paid" && (
              <div className="payment-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => initializeOrderPayment(currentOrder._id || currentOrder.id)}
                  disabled={paymentLoading}
                >
                  {paymentLoading ? "Processing payment..." : "Pay Now"}
                </button>
              </div>
            )}

            <div className="confirmation-actions">
              <button className="primary-button" onClick={() => { setCurrentOrder(null); setActiveSection("orders"); }} type="button">
                Track Order
              </button>
              <button className="secondary-button" onClick={() => setCurrentOrder(null)} type="button">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const __private__ = {
  parseINRToNumber,
  normalizeOrderStatus,
  getMissingRequiredFields,
};

export default BusinessServices;




