import axios from "axios";
import {
  MOCK_APPOINTMENTS,
  MOCK_DOCTORS,
  FAMILY_MEMBERS,
  MOCK_HEALTH_PACKAGES,
  MOCK_LAB_TESTS,
  MOCK_MEDICINES,
  MOCK_RECORDS,
} from "../data/healthcareMockData";

const API_BASE = "/api";

const endpoints = {
  doctors: `${API_BASE}/doctors`,
  labTests: `${API_BASE}/lab-tests`,
  healthPackages: `${API_BASE}/health-packages`,
  medicines: `${API_BASE}/medicines`,
  records: `${API_BASE}/records`,
  appointments: `${API_BASE}/appointments`,
  familyProfiles: `${API_BASE}/family-profiles`,
  pharmacyOrders: `${API_BASE}/pharmacy/orders`,
  refillReminders: `${API_BASE}/refill-reminders`,
  emergencySos: `${API_BASE}/emergency/sos`,
  emergencyLocation: `${API_BASE}/emergency/location`,
  emergencyIncidents: `${API_BASE}/emergency/incidents`,
  notifications: `${API_BASE}/notifications`,
  partnerApplications: `${API_BASE}/partner/applications`,
  partnerAdminApplications: `${API_BASE}/partner/applications/admin`,
  partnerDashboard: `${API_BASE}/partner/dashboard`,
};

const authHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  },
});

const unwrap = (response) => response?.data?.data ?? response?.data;

const getWithFallback = async (requestFn, fallbackValue, options = {}) => {
  const fallbackStatuses = Array.isArray(options.fallbackStatuses) ? options.fallbackStatuses : [];

  try {
    return await requestFn();
  } catch (error) {
    const status = error?.response?.status;
    if (status && fallbackStatuses.includes(status)) {
      return typeof fallbackValue === "function" ? fallbackValue() : fallbackValue;
    }

    if (error?.response?.status && error.response.status < 500) {
      throw error;
    }
    return typeof fallbackValue === "function" ? fallbackValue() : fallbackValue;
  }
};

export const healthcareApi = {
  getDoctors: async (specialty = "") => {
    return getWithFallback(async () => {
      const params = specialty ? { specialty } : {};
      const response = await axios.get(endpoints.doctors, { ...authHeaders(), params });
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => MOCK_DOCTORS);
  },

  getLabTests: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.labTests, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => MOCK_LAB_TESTS);
  },

  getHealthPackages: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.healthPackages, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => MOCK_HEALTH_PACKAGES);
  },

  getMedicines: async (query = "") => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.medicines, {
        ...authHeaders(),
        params: query ? { q: query } : {},
      });
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => {
      if (!query) {
        return MOCK_MEDICINES;
      }
      const normalizedQuery = query.toLowerCase();
      return MOCK_MEDICINES.filter((item) => {
        return item.name.toLowerCase().includes(normalizedQuery) || item.category.toLowerCase().includes(normalizedQuery);
      });
    });
  },

  getRecords: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.records, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => MOCK_RECORDS, { fallbackStatuses: [401, 403] });
  },

  createRecord: async ({ meta = {}, file = null }) => {
    return getWithFallback(async () => {
      const formData = new FormData();
      Object.entries(meta || {}).forEach(([key, value]) => {
        if (value == null) {
          return;
        }
        formData.append(key, String(value));
      });
      if (file) {
        formData.append("file", file);
      }
      const response = await axios.post(endpoints.records, formData, {
        ...authHeaders(),
        headers: {
          ...authHeaders().headers,
          "Content-Type": "multipart/form-data",
        },
      });
      return unwrap(response);
    }, () => ({
      ...meta,
      fileName: file?.name || meta?.fileName || "",
      fileType: file?.type || meta?.fileType || "application/octet-stream",
      fileSize: file?.size || Number(meta?.fileSize || 0),
      fileUrl: file ? URL.createObjectURL(file) : meta?.fileUrl || "",
      id: `record-${Date.now()}`,
    }));
  },

  deleteRecord: async (recordId) => {
    return getWithFallback(async () => {
      const response = await axios.delete(`${endpoints.records}/${recordId}`, authHeaders());
      return unwrap(response);
    }, () => ({ success: true }));
  },

  getRecordDownloadLink: async (recordId, fallbackUrl = "") => {
    return getWithFallback(async () => {
      const response = await axios.get(`${endpoints.records}/${recordId}/download`, authHeaders());
      return unwrap(response);
    }, () => ({
      downloadUrl: fallbackUrl,
      fileName: "",
    }), { fallbackStatuses: [401, 403, 404] });
  },

  getAppointments: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.appointments, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => MOCK_APPOINTMENTS, { fallbackStatuses: [401, 403] });
  },

  createAppointment: async (payload) => {
    return getWithFallback(async () => {
      const response = await axios.post(endpoints.appointments, payload, authHeaders());
      return unwrap(response);
    }, () => ({
      ...payload,
      id: `appointment-${Date.now()}`,
      status: payload.status || "booked",
    }));
  },

  updateAppointment: async (appointmentId, payload) => {
    return getWithFallback(async () => {
      const response = await axios.patch(`${endpoints.appointments}/${appointmentId}`, payload, authHeaders());
      return unwrap(response);
    }, () => ({
      id: appointmentId,
      ...payload,
    }));
  },

  cancelAppointment: async (appointmentId, reason = "Cancelled by user") => {
    return healthcareApi.updateAppointment(appointmentId, {
      status: "cancelled",
      cancellationReason: reason,
    });
  },

  initiateAppointmentPayment: async (appointmentId, paymentProvider = "simulated") => {
    return getWithFallback(async () => {
      const response = await axios.post(
        `${endpoints.appointments}/${appointmentId}/payment/initiate`,
        { paymentProvider },
        authHeaders()
      );
      return unwrap(response);
    }, () => ({
      appointmentId,
      paymentReference: `APT-MOCK-${Date.now()}`,
      paymentProvider,
      amountDue: 0,
      paymentStatus: "pending",
    }));
  },

  verifyAppointmentPayment: async (appointmentId, paymentReference, paymentStatus = "success") => {
    return getWithFallback(async () => {
      const response = await axios.post(
        `${endpoints.appointments}/${appointmentId}/payment/verify`,
        { paymentReference, paymentStatus },
        authHeaders()
      );
      return unwrap(response);
    }, () => ({
      id: appointmentId,
      paymentReference,
      paymentStatus: paymentStatus === "success" ? "paid" : "failed",
    }));
  },

  getFamilyProfiles: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.familyProfiles, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => FAMILY_MEMBERS.map((member, index) => ({ id: `family-${index + 1}`, name: member, relation: member })), {
      fallbackStatuses: [401, 403],
    });
  },

  createFamilyProfile: async (payload) => {
    return getWithFallback(async () => {
      const response = await axios.post(endpoints.familyProfiles, payload, authHeaders());
      return unwrap(response);
    }, () => ({
      ...payload,
      id: `family-${Date.now()}`,
      isActive: true,
    }));
  },

  updateFamilyProfile: async (profileId, payload) => {
    return getWithFallback(async () => {
      const response = await axios.patch(`${endpoints.familyProfiles}/${profileId}`, payload, authHeaders());
      return unwrap(response);
    }, () => ({
      id: profileId,
      ...payload,
    }));
  },

  deleteFamilyProfile: async (profileId) => {
    return getWithFallback(async () => {
      const response = await axios.delete(`${endpoints.familyProfiles}/${profileId}`, authHeaders());
      return unwrap(response);
    }, () => ({ id: profileId }));
  },

  createPharmacyOrder: async ({ order = {}, prescriptionFile = null }) => {
    return getWithFallback(async () => {
      const formData = new FormData();
      formData.append("items", JSON.stringify(order.items || []));
      formData.append("deliveryAddress", String(order.deliveryAddress || ""));
      formData.append("phone", String(order.phone || ""));
      formData.append("customerName", String(order.customerName || ""));
      formData.append("paymentMethod", String(order.paymentMethod || "upi"));
      if (order.notes) {
        formData.append("notes", String(order.notes));
      }
      if (order.prescriptionVerified) {
        formData.append("prescriptionVerified", "true");
      }
      if (prescriptionFile) {
        formData.append("prescriptionFile", prescriptionFile);
      }
      const response = await axios.post(endpoints.pharmacyOrders, formData, {
        ...authHeaders(),
        headers: {
          ...authHeaders().headers,
          "Content-Type": "multipart/form-data",
        },
      });
      return unwrap(response);
    }, () => ({
      id: `pharmacy-order-${Date.now()}`,
      ...order,
      paymentStatus: "pending",
      orderStatus: "placed",
    }));
  },

  getPharmacyOrders: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.pharmacyOrders, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => [], { fallbackStatuses: [401, 403] });
  },

  verifyPharmacyPayment: async (orderId, paymentReference, paymentStatus = "success") => {
    return getWithFallback(async () => {
      const response = await axios.post(
        `${endpoints.pharmacyOrders}/${orderId}/payment/verify`,
        { paymentReference, paymentStatus },
        authHeaders()
      );
      return unwrap(response);
    }, () => ({
      id: orderId,
      paymentReference,
      paymentStatus: paymentStatus === "success" ? "paid" : "failed",
    }));
  },

  updatePharmacyOrder: async (orderId, payload) => {
    return getWithFallback(async () => {
      const response = await axios.patch(`${endpoints.pharmacyOrders}/${orderId}`, payload, authHeaders());
      return unwrap(response);
    }, () => ({
      id: orderId,
      ...payload,
    }));
  },

  getRefillReminders: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.refillReminders, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => [], { fallbackStatuses: [401, 403] });
  },

  createRefillReminder: async (payload) => {
    return getWithFallback(async () => {
      const response = await axios.post(endpoints.refillReminders, payload, authHeaders());
      return unwrap(response);
    }, () => ({
      ...payload,
      id: `refill-${Date.now()}`,
    }));
  },

  updateRefillReminder: async (reminderId, payload) => {
    return getWithFallback(async () => {
      const response = await axios.patch(`${endpoints.refillReminders}/${reminderId}`, payload, authHeaders());
      return unwrap(response);
    }, () => ({
      id: reminderId,
      ...payload,
    }));
  },

  deleteRefillReminder: async (reminderId) => {
    return getWithFallback(async () => {
      const response = await axios.delete(`${endpoints.refillReminders}/${reminderId}`, authHeaders());
      return unwrap(response);
    }, () => ({ id: reminderId }));
  },

  createEmergencyIncident: async (payload) => {
    return getWithFallback(async () => {
      const response = await axios.post(endpoints.emergencySos, payload, authHeaders());
      return unwrap(response);
    }, () => ({
      ...payload,
      id: `incident-${Date.now()}`,
      status: "open",
    }));
  },

  updateEmergencyLocation: async (payload) => {
    return getWithFallback(async () => {
      const response = await axios.post(endpoints.emergencyLocation, payload, authHeaders());
      return unwrap(response);
    }, () => ({
      ...payload,
      id: payload.incidentId,
    }));
  },

  getEmergencyIncidents: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.emergencyIncidents, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => [], { fallbackStatuses: [401, 403] });
  },

  getNotifications: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.notifications, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => [], { fallbackStatuses: [401, 403] });
  },

  markNotificationRead: async (notificationId) => {
    return getWithFallback(async () => {
      const response = await axios.patch(`${endpoints.notifications}/${notificationId}/read`, {}, authHeaders());
      return unwrap(response);
    }, () => ({ id: notificationId, readAt: new Date().toISOString() }));
  },

  getPartnerApplications: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.partnerApplications, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => [], { fallbackStatuses: [401, 403] });
  },

  getPartnerAdminApplications: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.partnerAdminApplications, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => [], { fallbackStatuses: [401, 403] });
  },

  createPartnerApplication: async ({ payload = {}, documents = [] }) => {
    return getWithFallback(async () => {
      const formData = new FormData();
      Object.entries(payload || {}).forEach(([key, value]) => {
        if (value == null) {
          return;
        }
        formData.append(key, String(value));
      });
      (documents || []).forEach((file) => {
        formData.append("documents", file);
      });
      const response = await axios.post(endpoints.partnerApplications, formData, {
        ...authHeaders(),
        headers: {
          ...authHeaders().headers,
          "Content-Type": "multipart/form-data",
        },
      });
      return unwrap(response);
    }, () => ({
      ...payload,
      id: `partner-${Date.now()}`,
      documents: (documents || []).map((file) => ({
        fileName: file?.name || "",
        fileType: file?.type || "application/octet-stream",
        fileUrl: "",
      })),
      status: "pending",
    }));
  },

  reviewPartnerApplication: async (applicationId, status, reviewNotes = "") => {
    return getWithFallback(async () => {
      const response = await axios.patch(
        `${endpoints.partnerApplications}/${applicationId}/review`,
        { status, reviewNotes },
        authHeaders()
      );
      return unwrap(response);
    }, () => ({
      id: applicationId,
      status,
      reviewNotes,
    }));
  },

  getPartnerDashboard: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.partnerDashboard, authHeaders());
      return unwrap(response);
    }, () => ({
      applications: [],
      stats: {
        pendingApplications: 0,
        approvedApplications: 0,
        totalAppointments: 0,
        totalPharmacyOrders: 0,
      },
    }), { fallbackStatuses: [401, 403] });
  },

  getInitialData: async () => {
    const [
      doctors,
      labTests,
      healthPackages,
      medicines,
      records,
      appointments,
      familyProfiles,
      refillReminders,
      emergencyIncidents,
      notifications,
      partnerApplications,
      pharmacyOrders,
      partnerDashboard,
    ] = await Promise.all([
      healthcareApi.getDoctors(),
      healthcareApi.getLabTests(),
      healthcareApi.getHealthPackages(),
      healthcareApi.getMedicines(),
      healthcareApi.getRecords(),
      healthcareApi.getAppointments(),
      healthcareApi.getFamilyProfiles(),
      healthcareApi.getRefillReminders(),
      healthcareApi.getEmergencyIncidents(),
      healthcareApi.getNotifications(),
      healthcareApi.getPartnerApplications(),
      healthcareApi.getPharmacyOrders(),
      healthcareApi.getPartnerDashboard(),
    ]);

    return {
      doctors,
      labTests,
      healthPackages,
      medicines,
      records,
      appointments,
      familyProfiles,
      refillReminders,
      emergencyIncidents,
      notifications,
      partnerApplications,
      pharmacyOrders,
      partnerDashboard,
    };
  },
};
