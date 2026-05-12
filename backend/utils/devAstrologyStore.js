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

module.exports = {
  findProfile,
  saveProfile,
  createBooking,
  listBookings,
  resetStore,
};
