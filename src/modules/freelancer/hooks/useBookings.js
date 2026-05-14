// useBookings.js - Custom hook for fetching bookings (scaffold)
import { useState, useEffect } from 'react';
import { getBookings } from '../freelancerApi';
export default function useBookings() {
  const [bookings, setBookings] = useState([]);
  useEffect(() => {
    getBookings().then(setBookings);
  }, []);
  return bookings;
}
