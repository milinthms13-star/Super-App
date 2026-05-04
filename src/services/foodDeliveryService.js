import axios from 'axios';

const API_BASE_URL = '/api/fooddelivery';

const getAuthHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
  },
});

export default {
  getRestaurants: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const { data } = await axios.get(`${API_BASE_URL}/restaurants?${params}`, getAuthHeaders());
    return data.data;
  },

  getMenu: async (restaurantId, category = '') => {
    const params = new URLSearchParams({ category });
    const { data } = await axios.get(`${API_BASE_URL}/${restaurantId}/menu?${params}`, getAuthHeaders());
    return data.data;
  },

  addToCart: async (restaurantId, itemId, quantity) => {
    const { data } = await axios.post(`${API_BASE_URL}/${restaurantId}/cart`, { itemId, quantity }, getAuthHeaders());
    return data.data;
  },

  getCart: async (restaurantId) => {
    const { data } = await axios.get(`${API_BASE_URL}/${restaurantId}/cart`, getAuthHeaders());
    return data.data;
  },

  checkout: async (restaurantId, cart, paymentMethod) => {
    const { data } = await axios.post(`${API_BASE_URL}/${restaurantId}/order`, { cart, paymentMethod }, getAuthHeaders());
    return data.data;
  },

  getMyOrders: async () => {
    const { data } = await axios.get(`${API_BASE_URL}/my-orders`, getAuthHeaders());
    return data.data;
  },

  updateOrderStatus: async (orderId, status) => {
    const { data } = await axios.put(`${API_BASE_URL}/orders/${orderId}/status`, { status }, getAuthHeaders());
    return data.data;
  },
};

