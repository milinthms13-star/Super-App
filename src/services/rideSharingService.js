import axios from 'axios';

const API_BASE_URL = '/api/ridesharing';

const getAuthHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
  },
});

export default {
  bookRide: async (pickup, dropoff, rideType) => {
    const { data } = await axios.post(`${API_BASE_URL}/rides`, { pickup, dropoff, rideType }, getAuthHeaders());
    return data.data;
  },

  getNearbyDrivers: async (lat, lng, radius = 5) => {
    const params = new URLSearchParams({ lat, lng, radius });
    const { data } = await axios.get(`${API_BASE_URL}/drivers/nearby?${params}`, getAuthHeaders());
    return data.data;
  },

  acceptRide: async (rideId) => {
    const { data } = await axios.post(`${API_BASE_URL}/rides/${rideId}/accept`, {}, getAuthHeaders());
    return data.data;
  },

  updateLocation: async (lat, lng) => {
    const { data } = await axios.post(`${API_BASE_URL}/location`, { lat, lng }, getAuthHeaders());
    return data.data;
  },

  getMyRides: async () => {
    const { data } = await axios.get(`${API_BASE_URL}/my-rides`, getAuthHeaders());
    return data.data;
  },

  completeRide: async (rideId) => {
    const { data } = await axios.post(`${API_BASE_URL}/rides/${rideId}/complete`, {}, getAuthHeaders());
    return data.data;
  },
};

