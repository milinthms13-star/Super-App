const devadarshanRouter = require('../routes/devadarshan');

const {
  bookingCreateSchema,
  donationCreateSchema,
  profileSchema,
  paymentInitiateSchema,
  adminStatusSchema,
  canTransitionBookingStatus,
  createBookingReceiptText,
} = devadarshanRouter.__private__;

describe('devadarshan route schemas', () => {
  test('bookingCreateSchema validates a valid booking payload', () => {
    const { error } = bookingCreateSchema.validate({
      templeId: 'tmp-padmanabha',
      poojaType: 'Archana',
      devoteeName: 'Dhanya',
      bookingDate: '2026-05-20',
      quantity: 2,
      paymentMethod: 'UPI',
    });

    expect(error).toBeUndefined();
  });

  test('donationCreateSchema rejects invalid category', () => {
    const { error } = donationCreateSchema.validate({
      templeId: 'tmp-padmanabha',
      category: 'Invalid Category',
      amount: 500,
      paymentMethod: 'UPI',
    });

    expect(error).toBeDefined();
  });

  test('profileSchema defaults reminder flags', () => {
    const { error, value } = profileSchema.validate({
      primaryNakshatra: 'Ashwathi',
      preferredPooja: 'Archana',
      phone: '+91-99999-00000',
    });

    expect(error).toBeUndefined();
    expect(value.reminderBirthday).toBe(true);
    expect(value.reminderMonthly).toBe(true);
    expect(value.reminderYearly).toBe(true);
  });

  test('paymentInitiateSchema only allows configured gateways', () => {
    const valid = paymentInitiateSchema.validate({ gateway: 'razorpay', paymentMethod: 'upi' });
    const invalid = paymentInitiateSchema.validate({ gateway: 'cash' });

    expect(valid.error).toBeUndefined();
    expect(invalid.error).toBeDefined();
  });

  test('adminStatusSchema accepts only supported booking statuses', () => {
    const good = adminStatusSchema.validate({ status: 'Confirmed' });
    const bad = adminStatusSchema.validate({ status: 'in-review' });

    expect(good.error).toBeUndefined();
    expect(bad.error).toBeDefined();
  });

  test('canTransitionBookingStatus enforces lifecycle transitions', () => {
    expect(canTransitionBookingStatus('Pending', 'Confirmed')).toBe(true);
    expect(canTransitionBookingStatus('Confirmed', 'Completed')).toBe(true);
    expect(canTransitionBookingStatus('Completed', 'Pending')).toBe(false);
    expect(canTransitionBookingStatus('Cancelled', 'Confirmed')).toBe(false);
  });

  test('createBookingReceiptText includes booking and receipt identifiers', () => {
    const receiptText = createBookingReceiptText({
      receiptNumber: 'RCPT-001',
      bookingCode: 'BK-001',
      templeName: 'Sample Temple',
      poojaType: 'Archana',
      devoteeName: 'Anu',
      paymentMethod: 'UPI',
      paymentStatus: 'Paid',
      amount: 500,
      adminApprovalStatus: 'Approved',
      status: 'Confirmed',
    });

    expect(receiptText).toContain('Receipt No: RCPT-001');
    expect(receiptText).toContain('Booking ID: BK-001');
    expect(receiptText).toContain('Temple: Sample Temple');
  });
});
