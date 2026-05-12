const profilesByUserId = new Map();
const bookingsByUserId = new Map();

const cloneValue = (value) => JSON.parse(JSON.stringify(value));

const findProfile = async (userId) => {
  const profile = profilesByUserId.get(String(userId)) || null;
  return profile ? cloneValue(profile) : null;
};

const saveProfile = async (profile = {}) => {
  const userId = String(profile.userId || '');
  const existingProfile = profilesByUserId.get(userId) || null;
  const nextProfile = {
    ...(existingProfile ? cloneValue(existingProfile) : {}),
    ...cloneValue(profile),
    userId,
    createdAt: existingProfile?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  profilesByUserId.set(userId, nextProfile);
  return cloneValue(nextProfile);
};

const resetStore = async () => {
  profilesByUserId.clear();
  bookingsByUserId.clear();
};

const createBooking = async (booking = {}) => {
  const userId = String(booking.userId || '');
  const existingBookings = bookingsByUserId.get(userId) || [];
  const nextBooking = {
    ...cloneValue(booking),
    userId,
    id: booking.id || `booking-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  bookingsByUserId.set(userId, [nextBooking, ...existingBookings]);
  return cloneValue(nextBooking);
};

const listBookings = async (userId) => {
  const bookings = bookingsByUserId.get(String(userId)) || [];
  return cloneValue(bookings);
};

const listAllBookings = async () => {
  const allBookings = [];

  bookingsByUserId.forEach((bookings) => {
    allBookings.push(...bookings);
  });

  return cloneValue(
    allBookings.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
  );
};

const findBookingById = async (bookingId) => {
  const normalizedId = String(bookingId || '');
  if (!normalizedId) {
    return null;
  }

  for (const bookings of bookingsByUserId.values()) {
    const booking = bookings.find((entry) => String(entry.id) === normalizedId);
    if (booking) {
      return cloneValue(booking);
    }
  }

  return null;
};

const updateBookingById = async (bookingId, updates = {}) => {
  const normalizedId = String(bookingId || '');
  if (!normalizedId) {
    return null;
  }

  for (const [userId, bookings] of bookingsByUserId.entries()) {
    const bookingIndex = bookings.findIndex((entry) => String(entry.id) === normalizedId);
    if (bookingIndex === -1) {
      continue;
    }

    const nextBooking = {
      ...bookings[bookingIndex],
      ...cloneValue(updates),
      userId,
      updatedAt: new Date().toISOString(),
    };

    bookings[bookingIndex] = nextBooking;
    bookingsByUserId.set(userId, bookings);
    return cloneValue(nextBooking);
  }

  return null;
};

module.exports = {
  findProfile,
  saveProfile,
  createBooking,
  listBookings,
  listAllBookings,
  findBookingById,
  updateBookingById,
  resetStore,
};
