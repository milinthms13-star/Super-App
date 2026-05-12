import axios from "axios";
import { buildApiUrl } from "../utils/api";

const getStoredAuthToken = () =>
  localStorage.getItem("authToken") ||
  localStorage.getItem("accessToken") ||
  localStorage.getItem("token") ||
  "";

const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${getStoredAuthToken()}`,
  },
});

const getRequest = async (path, config = {}) => {
  const response = await axios.get(buildApiUrl(path), { ...getAuthConfig(), ...config });
  return response.data;
};

const postRequest = async (path, payload = {}, config = {}) => {
  const response = await axios.post(buildApiUrl(path), payload, { ...getAuthConfig(), ...config });
  return response.data;
};

const patchRequest = async (path, payload = {}, config = {}) => {
  const response = await axios.patch(buildApiUrl(path), payload, { ...getAuthConfig(), ...config });
  return response.data;
};

const billpayService = {
  getBills: () => getRequest("/billpay/bills"),
  updateBillAutopay: (billId, enabled) => patchRequest(`/billpay/bills/${billId}/autopay`, { enabled }),
  discoverBill: (payload) => postRequest("/billpay/discover", payload),
  createPaymentOrder: (payload) => postRequest("/billpay/pay/create-order", payload),
  verifyPayment: (payload) => postRequest("/billpay/pay/verify", payload),
  getHistory: (limit = 100, offset = 0) => getRequest(`/billpay/history?limit=${limit}&offset=${offset}`),
  getDisputes: (limit = 100, offset = 0) => getRequest(`/billpay/disputes?limit=${limit}&offset=${offset}`),
  createDispute: (payload) => postRequest("/billpay/disputes", payload),
  getMandates: () => getRequest("/billpay/mandates"),
  updateMandate: (mandateId, payload) => patchRequest(`/billpay/mandates/${mandateId}`, payload),
  getAdminAnalytics: (dateRange = "thisMonth") =>
    getRequest(`/billpay/admin/analytics?dateRange=${encodeURIComponent(dateRange)}`),
};

export default billpayService;
