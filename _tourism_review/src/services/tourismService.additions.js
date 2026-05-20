// Add these methods inside tourismService object in src/services/tourismService.js

async createCustomRequest(payload) {
  const response = await axios.post(`${endpoint}/custom-requests`, payload);
  return response.data?.data?.lead;
},

async createPaymentIntent(payload) {
  const response = await axios.post(`${endpoint}/payments/intent`, payload);
  return response.data?.data;
},

async reportPackageIssue(packageId, payload) {
  const response = await axios.post(`${endpoint}/packages/${encodeURIComponent(packageId)}/report`, payload);
  return response.data?.data?.complaint;
},
