import axios from 'axios';

const API_BASE_URL = '/api/localmarket';

const getAuthHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
  },
});

export const localMarketService = {
  // Shops
  getShops: async (filters = {}) => {
    const params = new URLSearchParams(
      Object.entries(filters || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
    const query = params.toString();
    const { data } = await axios.get(
      `${API_BASE_URL}/shops${query ? `?${query}` : ''}`,
      getAuthHeaders()
    );
    return data.data;
  },

  getShop: async (shopId) => {
    const { data } = await axios.get(`${API_BASE_URL}/shops/${shopId}`, getAuthHeaders());
    return data.data;
  },

  createShop: async (shopData) => {
    const { data } = await axios.post(`${API_BASE_URL}/shops`, shopData, getAuthHeaders());
    return data.data;
  },

  // Products
  getShopProducts: async (shopId, category) => {
    const params = new URLSearchParams(
      category ? { category } : {}
    );
    const query = params.toString();
    const { data } = await axios.get(
      `${API_BASE_URL}/shops/${shopId}/products${query ? `?${query}` : ''}`,
      getAuthHeaders()
    );
    return data.data;
  },

  createProduct: async (shopId, productData) => {
    const { data } = await axios.post(`${API_BASE_URL}/shops/${shopId}/products`, productData, getAuthHeaders());
    return data.data;
  },

  updateProduct: async (productId, updates) => {
    const { data } = await axios.put(`${API_BASE_URL}/products/${productId}`, updates, getAuthHeaders());
    return data.data;
  },

  deleteProduct: async (productId) => {
    const { data } = await axios.delete(`${API_BASE_URL}/products/${productId}`, getAuthHeaders());
    return data;
  },

  // Orders
  createOrder: async (orderData) => {
    const { data } = await axios.post(`${API_BASE_URL}/orders`, orderData, getAuthHeaders());
    return data.data;
  },

  // List-based order request (no shop selected by buyer)
  createOrderRequest: async (orderRequestData) => {
    const { data } = await axios.post(
      `${API_BASE_URL}/orders/request`,
      orderRequestData,
      getAuthHeaders()
    );
    return data.data;
  },

  getMyOrders: async () => {
    const { data } = await axios.get(`${API_BASE_URL}/orders`, getAuthHeaders());
    return data.data;
  },

  getShopOrders: async (shopId) => {
    const { data } = await axios.get(`${API_BASE_URL}/shops/${shopId}/orders`, getAuthHeaders());
    return data.data;
  },

  updateOrderStatus: async (orderId, status) => {
    const { data } = await axios.put(`${API_BASE_URL}/orders/${orderId}/status`, { status }, getAuthHeaders());
    return data.data;
  },


  // Reviews
  addOrderReview: async (orderId, reviewData) => {
    const { data } = await axios.post(`${API_BASE_URL}/orders/${orderId}/review`, reviewData, getAuthHeaders());
    return data.data;
  },

  addShopReview: async (shopId, reviewData) => {
    const { data } = await axios.post(`${API_BASE_URL}/shops/${shopId}/review`, reviewData, getAuthHeaders());
    return data.data;
  },
};
