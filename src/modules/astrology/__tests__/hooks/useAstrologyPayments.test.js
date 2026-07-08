import { renderHook, act, waitFor } from '@testing-library/react';
import { useAstrologyPayments } from '../../hooks/useAstrologyPayments';
import { astrologyService } from '../../../../services/astrologyService';

jest.mock('../../../../services/astrologyService');

describe('useAstrologyPayments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentOrder', () => {
    it('should create payment order successfully', async () => {
      const mockOrderData = {
        bookingId: 'booking123',
        orderId: 'order_123',
        amountInr: 1000,
        currency: 'INR',
        keyId: 'rzp_test_123',
      };

      astrologyService.createConsultationPaymentOrder = jest.fn().mockResolvedValue(mockOrderData);

      const { result } = renderHook(() => useAstrologyPayments());

      let orderData;
      await act(async () => {
        orderData = await result.current.createPaymentOrder('booking123');
      });

      expect(orderData).toEqual(mockOrderData);
      expect(astrologyService.createConsultationPaymentOrder).toHaveBeenCalledWith('booking123');
    });

    it('should handle payment order creation error', async () => {
      astrologyService.createConsultationPaymentOrder = jest.fn().mockRejectedValue(
        new Error('Payment order creation failed')
      );

      const { result } = renderHook(() => useAstrologyPayments());

      await expect(
        act(async () => {
          await result.current.createPaymentOrder('booking123');
        })
      ).rejects.toThrow('Payment order creation failed');
    });
  });

  describe('verifyPayment', () => {
    it('should verify payment successfully', async () => {
      const mockBooking = {
        id: 'booking123',
        status: 'confirmed',
        paymentStatus: 'completed',
      };

      const paymentDetails = {
        orderId: 'order_123',
        paymentId: 'pay_123',
        signature: 'signature_123',
      };

      astrologyService.verifyConsultationPayment = jest.fn().mockResolvedValue(mockBooking);

      const { result } = renderHook(() => useAstrologyPayments());

      let booking;
      await act(async () => {
        booking = await result.current.verifyPayment('booking123', paymentDetails);
      });

      expect(booking).toEqual(mockBooking);
      expect(astrologyService.verifyConsultationPayment).toHaveBeenCalledWith(
        'booking123',
        paymentDetails
      );
    });
  });

  describe('requestRefund', () => {
    it('should request refund successfully', async () => {
      const mockRefundData = {
        refundId: 'rfnd_123',
        refundStatus: 'processing',
        refundAmount: 1000,
      };

      astrologyService.requestPaymentRefund = jest.fn().mockResolvedValue(mockRefundData);

      const { result } = renderHook(() => useAstrologyPayments());

      let refundData;
      await act(async () => {
        refundData = await result.current.requestRefund('booking123', 'Customer request');
      });

      expect(refundData).toEqual(mockRefundData);
      expect(astrologyService.requestPaymentRefund).toHaveBeenCalledWith(
        'booking123',
        'Customer request'
      );
    });
  });

  describe('downloadReceipt', () => {
    it('should download receipt successfully', async () => {
      astrologyService.downloadPaymentReceipt = jest.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() => useAstrologyPayments());

      await act(async () => {
        await result.current.downloadReceipt('booking123');
      });

      expect(astrologyService.downloadPaymentReceipt).toHaveBeenCalledWith('booking123');
    });
  });

  describe('getPaymentStatus', () => {
    it('should fetch payment status successfully', async () => {
      const mockStatus = {
        bookingId: 'booking123',
        paymentStatus: 'completed',
        bookingStatus: 'confirmed',
      };

      astrologyService.getConsultationPaymentStatus = jest.fn().mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useAstrologyPayments());

      let status;
      await act(async () => {
        status = await result.current.getPaymentStatus('booking123');
      });

      expect(status).toEqual(mockStatus);
      expect(astrologyService.getConsultationPaymentStatus).toHaveBeenCalledWith('booking123');
    });
  });
});
