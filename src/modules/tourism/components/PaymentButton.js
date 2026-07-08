import React, { useState } from 'react';
import { tourismService } from '../../../services/tourismService';

const PaymentButton = ({ booking, onPaymentSuccess, onPaymentFailure }) => {
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);
    try {
      // Calculate amount to pay
      const totalAmount = booking.amountSummary?.totalAmount || 0;
      const paidAmount = booking.amountSummary?.paidAmount || 0;
      const balanceAmount = totalAmount - paidAmount;
      
      if (balanceAmount <= 0) {
        if (onPaymentFailure) {
          onPaymentFailure(new Error('No balance amount due'));
        }
        setProcessing(false);
        return;
      }

      // Create payment intent
      const paymentOrder = await tourismService.createPaymentIntent({
        bookingId: booking._id,
        amount: balanceAmount,
        paymentType: 'balance',
      });

      // Initiate Razorpay
      await tourismService.initiateRazorpayPayment(
        booking,
        paymentOrder,
        (response) => {
          if (onPaymentSuccess) onPaymentSuccess(response, booking);
          setProcessing(false);
        },
        (error) => {
          if (onPaymentFailure) onPaymentFailure(error);
          setProcessing(false);
        }
      );
    } catch (error) {
      if (onPaymentFailure) onPaymentFailure(error);
      setProcessing(false);
    }
  };

  const totalAmount = booking.amountSummary?.totalAmount || 0;
  const paidAmount = booking.amountSummary?.paidAmount || 0;
  const balanceAmount = totalAmount - paidAmount;

  if (balanceAmount <= 0) {
    return (
      <span className="tourism-success-badge" style={{ fontSize: '12px' }}>
        ✓ Fully Paid
      </span>
    );
  }

  return (
    <button
      type="button"
      className="tourism-primary-button"
      onClick={handlePayment}
      disabled={processing}
      style={{ fontSize: '12px', padding: '6px 12px' }}
    >
      {processing ? 'Processing...' : `Pay ₹${balanceAmount.toLocaleString('en-IN')}`}
    </button>
  );
};

export default PaymentButton;
