import { useCallback, useEffect, useState } from "react";
import { astrologyService } from "../../../services/astrologyService";

const loadRazorpaySdk = () =>
  new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const sortBookingsByRecent = (bookings = []) =>
  [...bookings].sort(
    (left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)
  );

const hydrateConsultationSlots = (consultants = [], currentSlots = {}) =>
  consultants.reduce((acc, consultant) => {
    const consultantKey = consultant.id || consultant.name;
    const firstSlotId = consultant?.availableSlots?.[0]?.id || "";
    const existing = currentSlots[consultantKey];
    return {
      ...acc,
      [consultantKey]: existing || firstSlotId,
    };
  }, {});

const formatStatusLabel = (value) =>
  String(value || "pending")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getStatusClassName = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "completed" || normalized === "confirmed") {
    return "astrology-status-success";
  }
  if (normalized === "cancelled" || normalized === "failed") {
    return "astrology-status-danger";
  }
  return "astrology-status-warning";
};

export const useAstrologyConsultations = ({
  activeSection,
  currentUser,
  setSaveState,
  ensureSignedIn,
}) => {
  const [consultants, setConsultants] = useState([]);
  const [consultationSlots, setConsultationSlots] = useState({});
  const [bookingLoadingId, setBookingLoadingId] = useState("");
  const [lastBooking, setLastBooking] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [consultationHistoryLoading, setConsultationHistoryLoading] = useState(false);
  const [consultationActionLoadingId, setConsultationActionLoadingId] = useState("");
  const [paymentRefreshLoadingId, setPaymentRefreshLoadingId] = useState("");
  const [rescheduleTargetId, setRescheduleTargetId] = useState("");

  useEffect(() => {
    let active = true;

    const loadConsultants = async () => {
      try {
        const nextConsultants = await astrologyService.getConsultants();
        if (!active) {
          return;
        }

        setConsultants(nextConsultants);
        setConsultationSlots((currentSlots) =>
          hydrateConsultationSlots(nextConsultants, currentSlots)
        );
      } catch (error) {
        if (!active) {
          return;
        }

        const fallbackConsultants = error.fallbackData || [];
        setConsultants(fallbackConsultants);
        setConsultationSlots((currentSlots) =>
          hydrateConsultationSlots(fallbackConsultants, currentSlots)
        );
      }
    };

    void loadConsultants();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeSection !== "consult") {
      return;
    }

    let active = true;

    const loadConsultationHistory = async () => {
      if (!currentUser?.id && !currentUser?.name) {
        setConsultationHistory([]);
        return;
      }

      setConsultationHistoryLoading(true);
      try {
        const bookings = await astrologyService.getConsultationHistory();
        if (!active) {
          return;
        }

        const sortedBookings = sortBookingsByRecent(bookings);
        setConsultationHistory(sortedBookings);
        setLastBooking((currentBooking) => currentBooking || sortedBookings[0] || null);
      } catch (error) {
        if (!active) {
          return;
        }
        setConsultationHistory(error.fallbackData || []);
      } finally {
        if (active) {
          setConsultationHistoryLoading(false);
        }
      }
    };

    void loadConsultationHistory();

    return () => {
      active = false;
    };
  }, [activeSection, currentUser?.id, currentUser?.name]);

  const handleConsultationSlotChange = useCallback((consultantKey, slotId) => {
    setConsultationSlots((currentSlots) => ({
      ...currentSlots,
      [consultantKey]: slotId,
    }));
  }, []);

  const handleBookConsultation = useCallback(
    async (consultant) => {
      if (!ensureSignedIn()) {
        return;
      }

      const consultantKey = consultant.id || consultant.name;
      const slotId = consultationSlots[consultantKey] || consultant?.availableSlots?.[0]?.id;

      if (!slotId) {
        setSaveState({
          type: "error",
          message: "Please choose an available slot before booking.",
        });
        return;
      }

      setBookingLoadingId(consultantKey);
      setSaveState({ type: "", message: "" });

      try {
        const booking = await astrologyService.createConsultationBooking({
          consultantId: consultant.id,
          slotId,
        });

        setLastBooking(booking);
        setConsultationHistory((currentItems) =>
          sortBookingsByRecent([booking, ...currentItems.filter((item) => item.id !== booking.id)])
        );
        setRescheduleTargetId("");
        setPaymentOrder(null);
        setSaveState({
          type: "success",
          message: `Consultation booked: ${booking.confirmationCode}`,
        });
      } catch (error) {
        setSaveState({
          type: "error",
          message: error.message || "Unable to book consultation.",
        });
      } finally {
        setBookingLoadingId("");
      }
    },
    [consultationSlots, ensureSignedIn, setSaveState]
  );

  const handleCreateConsultationPaymentOrder = useCallback(async () => {
    if (!lastBooking?.id) {
      return;
    }

    setPaymentLoading(true);
    setSaveState({ type: "", message: "" });

    try {
      const bookingId = lastBooking.id;
      const order = await astrologyService.createConsultationPaymentOrder(bookingId);
      setPaymentOrder(order);
      setLastBooking((currentBooking) =>
        currentBooking
          ? {
              ...currentBooking,
              paymentOrderId: order.orderId,
              paymentStatus: "pending",
            }
          : currentBooking
      );
      const isRazorpayReady = await loadRazorpaySdk();

      if (!isRazorpayReady || !window.Razorpay) {
        setSaveState({
          type: "success",
          message: `Payment order created: ${order.orderId}. Complete payment in your gateway console.`,
        });
        return;
      }

      const paymentOptions = {
        key: order.keyId,
        amount: Number(order.amountInr || 0) * 100,
        currency: order.currency || "INR",
        name: "AstroNila",
        description: "Consultation booking payment",
        order_id: order.orderId,
        prefill: {
          name: currentUser?.name || "Astrology User",
          email: currentUser?.email || "",
        },
        handler: async (response) => {
          try {
            const verifiedBooking = await astrologyService.verifyConsultationPayment(bookingId, {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            setLastBooking(verifiedBooking);
            setConsultationHistory((currentItems) =>
              sortBookingsByRecent([
                verifiedBooking,
                ...currentItems.filter((item) => item.id !== verifiedBooking.id),
              ])
            );
            setSaveState({
              type: "success",
              message: `Payment verified: ${verifiedBooking.confirmationCode}`,
            });
          } catch (verificationError) {
            setSaveState({
              type: "error",
              message: verificationError.message || "Payment verification failed.",
            });
          }
        },
        modal: {
          ondismiss: () => {
            setSaveState({
              type: "warning",
              message: "Payment window closed before completion.",
            });
          },
        },
      };

      const razorpay = new window.Razorpay(paymentOptions);
      razorpay.open();
    } catch (error) {
      setSaveState({
        type: "error",
        message: error.message || "Unable to create payment order.",
      });
    } finally {
      setPaymentLoading(false);
    }
  }, [currentUser?.email, currentUser?.name, lastBooking?.id, setSaveState]);

  const handleUpdateConsultationStatus = useCallback(
    async (bookingId, nextStatus) => {
      if (!bookingId || !nextStatus) {
        return;
      }

      setConsultationActionLoadingId(bookingId);
      setSaveState({ type: "", message: "" });

      try {
        const updatedBooking = await astrologyService.updateConsultationBookingStatus(
          bookingId,
          nextStatus
        );
        setConsultationHistory((currentItems) =>
          sortBookingsByRecent([
            updatedBooking,
            ...currentItems.filter((item) => item.id !== updatedBooking.id),
          ])
        );
        setLastBooking((currentBooking) =>
          currentBooking?.id === updatedBooking.id ? updatedBooking : currentBooking
        );
        setSaveState({
          type: "success",
          message: `Booking ${
            updatedBooking.confirmationCode || updatedBooking.id
          } moved to ${formatStatusLabel(nextStatus)}.`,
        });
      } catch (error) {
        setSaveState({
          type: "error",
          message: error.message || "Unable to update consultation booking status.",
        });
      } finally {
        setConsultationActionLoadingId("");
      }
    },
    [setSaveState]
  );

  const handleRefreshPaymentStatus = useCallback(
    async (booking) => {
      if (!booking?.id) {
        return;
      }

      setPaymentRefreshLoadingId(booking.id);
      setSaveState({ type: "", message: "" });

      try {
        const paymentStatus = await astrologyService.getConsultationPaymentStatus(booking.id);
        const updatedBooking = {
          ...booking,
          paymentStatus: paymentStatus.paymentStatus || booking.paymentStatus,
          paymentOrderId: paymentStatus.paymentOrderId || booking.paymentOrderId,
          paymentId: paymentStatus.paymentId || booking.paymentId,
        };

        setConsultationHistory((currentItems) =>
          sortBookingsByRecent([
            updatedBooking,
            ...currentItems.filter((item) => item.id !== updatedBooking.id),
          ])
        );
        setLastBooking((currentBooking) =>
          currentBooking?.id === updatedBooking.id ? updatedBooking : currentBooking
        );
        setSaveState({
          type: "success",
          message: `Payment status: ${formatStatusLabel(updatedBooking.paymentStatus)}.`,
        });
      } catch (error) {
        setSaveState({
          type: "error",
          message: error.message || "Unable to refresh payment status.",
        });
      } finally {
        setPaymentRefreshLoadingId("");
      }
    },
    [setSaveState]
  );

  const toggleRescheduleTarget = useCallback((bookingId) => {
    setRescheduleTargetId((currentId) => (currentId === bookingId ? "" : bookingId));
  }, []);

  useEffect(() => {
    if (!lastBooking?.id || lastBooking.paymentStatus === "completed") {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }

    let stopped = false;
    const bookingId = lastBooking.id;
    const timer = window.setInterval(async () => {
      if (stopped) {
        return;
      }

      try {
        const paymentStatus = await astrologyService.getConsultationPaymentStatus(bookingId);
        if (stopped || paymentStatus?.paymentStatus !== "completed") {
          return;
        }

        setLastBooking((currentBooking) => {
          if (!currentBooking || currentBooking.id !== bookingId) {
            return currentBooking;
          }

          const updatedBooking = {
            ...currentBooking,
            paymentStatus: paymentStatus.paymentStatus,
            paymentOrderId: paymentStatus.paymentOrderId || currentBooking.paymentOrderId,
            paymentId: paymentStatus.paymentId || currentBooking.paymentId,
          };

          setConsultationHistory((currentItems) =>
            sortBookingsByRecent([
              updatedBooking,
              ...currentItems.filter((item) => item.id !== updatedBooking.id),
            ])
          );
          return updatedBooking;
        });
      } catch (error) {
        // Silent polling failure.
      }
    }, 12000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [lastBooking?.id, lastBooking?.paymentStatus]);

  return {
    consultants,
    consultationSlots,
    bookingLoadingId,
    lastBooking,
    paymentOrder,
    paymentLoading,
    consultationHistory,
    consultationHistoryLoading,
    consultationActionLoadingId,
    paymentRefreshLoadingId,
    rescheduleTargetId,
    handleConsultationSlotChange,
    handleBookConsultation,
    handleCreateConsultationPaymentOrder,
    handleUpdateConsultationStatus,
    handleRefreshPaymentStatus,
    toggleRescheduleTarget,
    formatStatusLabel,
    getStatusClassName,
  };
};
