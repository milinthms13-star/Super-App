const hotelBookingRouter = require('../routes/hotelbooking');

const { hotelSchema, bookingSchema, reviewSchema, commissionSchema, calculateNights } =
  hotelBookingRouter.__private__;

describe('hotelbooking route schemas', () => {
  test('hotelSchema validates a basic property payload', () => {
    const { error } = hotelSchema.validate({
      businessName: 'Green Valley Homestay',
      propertyType: 'Homestay',
      location: 'Munnar',
      rooms: [{ type: 'Deluxe', basePrice: 2500, totalInventory: 3 }],
    });
    expect(error).toBeUndefined();
  });

  test('bookingSchema rejects invalid date payload shape when missing fields', () => {
    const { error } = bookingSchema.validate({
      hotelId: 'abc123',
      guestName: 'User',
      guestPhone: '9999999999',
    });
    expect(error).toBeDefined();
  });

  test('reviewSchema requires rating in 1..5 range', () => {
    const valid = reviewSchema.validate({ bookingId: 'booking-1', rating: 4, comment: 'Great stay' });
    const invalid = reviewSchema.validate({ bookingId: 'booking-1', rating: 7 });
    expect(valid.error).toBeUndefined();
    expect(invalid.error).toBeDefined();
  });

  test('commissionSchema validates commission rates', () => {
    const { error } = commissionSchema.validate({
      defaultRate: 10,
      basicRate: 8,
      featuredRate: 12,
      premiumRate: 15,
    });
    expect(error).toBeUndefined();
  });

  test('calculateNights returns at least one and handles valid ranges', () => {
    expect(calculateNights('2026-05-20', '2026-05-22')).toBe(2);
    expect(calculateNights('2026-05-20', '2026-05-20')).toBe(1);
  });
});
