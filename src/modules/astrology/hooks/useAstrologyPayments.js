import { useState, useCallback } from "react";
import { astrologyService } from "../../../services/astrologyService";

export const useAstrologyPayments = ({ currentUser, consultApi }) => {
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentRefreshLoadingId, setPaymentRefreshLoadingId] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [activePaymentOrder, setActivePaymentOrder] = useState(null);

  const handleCreatePaymentOrder = useCallback(async (bookingId) => {
    if (!currentUser?.id && !currentUser?.name) {
      setPaymentError("Please sign in to proceed with payment.");
      return null;
    }

    setPaymentLoading(true);
    setPaymentError("");

    try {
      const orderData = await astrologyService.createConsultationPaymentOrder(bookingId);
      setActivePaymentOrder(orderData);

      // Initialize Razorpay payment
      if (window.Razorpay) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amountInr * 100,
          currency: orderData.currency,
          name: "AstroNila Consultation",
          description: "Astrology Consultation Booking",
          order_id: orderData.orderId,
          handler: async (response) => {
            await handleVerifyPayment(bookingId, {
              orderId: orderData.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
          },
          prefill: {
            name: currentUser?.name || "",
            email: currentUser?.email || "",
            contact: currentUser?.phone || currentUser?.mobile || "",
          },
          theme: {
            color: "#6c8f4e",
          },
          modal: {
            ondismiss: () => {
              setPaymentLoading(false);
              setPaymentError("Payment cancelled by user.");
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } else {
        throw new Error("Payment gateway not loaded. Please refresh the page.");
      }

      return orderData;
    } catch (error) {
      setPaymentError(error.message || "Unable to create payment order.");
      return null;
    } finally {
      setPaymentLoading(false);
    }
  }, [currentUser]);

  const handleVerifyPayment = useCallback(async (bookingId, paymentDetails) => {
    setPaymentLoading(true);
    setPaymentError("");

    try {
      const verifiedBooking = await astrologyService.verifyConsultationPayment(
        bookingId,
        paymentDetails
      );

      // Refresh consultation history
      if (consultApi?.refreshConsultationHistory) {
        await consultApi.refreshConsultationHistory();
      }

      setActivePaymentOrder(null);
      return verifiedBooking;
    } catch (error) {
      setPaymentError(error.message || "Payment verification failed.");
      return null;
    } finally {
      setPaymentLoading(false);
    }
  }, [consultApi]);

  const handleRefreshPaymentStatus = useCallback(async (booking) => {
    if (!booking?.id) return;

    setPaymentRefreshLoadingId(booking.id);
    setPaymentError("");

    try {
      const paymentStatus = await astrologyService.getConsultationPaymentStatus(booking.id);

      // Refresh consultation history to reflect updated status
      if (consultApi?.refreshConsultationHistory) {
        await consultApi.refreshConsultationHistory();
      }

      return paymentStatus;
    } catch (error) {
      setPaymentError(error.message || "Unable to refresh payment status.");
      return null;
    } finally {
      setPaymentRefreshLoadingId("");
    }
  }, [consultApi]);

  const handleRequestRefund = useCallback(async (bookingId, reason = "") => {
    if (!currentUser?.id && !currentUser?.name) {
      setPaymentError("Please sign in to request a refund.");
      return null;
    }

    setPaymentLoading(true);
    setPaymentError("");

    try {
      const refundResult = await astrologyService.requestPaymentRefund(bookingId, reason);

      // Refresh consultation history
      if (consultApi?.refreshConsultationHistory) {
        await consultApi.refreshConsultationHistory();
      }

      return refundResult;
    } catch (error) {
      setPaymentError(error.message || "Unable to request refund.");
      return null;
    } finally {
      setPaymentLoading(false);
    }
  }, [currentUser, consultApi]);

  const handleDownloadReceipt = useCallback(async (bookingId) => {
    if (!bookingId) return;

    try {
      await astrologyService.downloadPaymentReceipt(bookingId);
    } catch (error) {
      setPaymentError(error.message || "Unable to download receipt.");
    }
  }, []);

  const clearPaymentError = useCallback(() => {
    setPaymentError("");
  }, []);

  return {
    paymentLoading,
    paymentRefreshLoadingId,
    paymentError,
    activePaymentOrder,
    handleCreatePaymentOrder,
    handleVerifyPayment,
    handleRefreshPaymentStatus,
    handleRequestRefund,
    handleDownloadReceipt,
    clearPaymentError,
  };
};
