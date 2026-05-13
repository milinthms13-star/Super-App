const devadarshanRouter = require('../routes/devadarshan');

const {
  bookingCreateSchema,
  donationCreateSchema,
  profileSchema,
  paymentInitiateSchema,
  adminStatusSchema,
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
});

