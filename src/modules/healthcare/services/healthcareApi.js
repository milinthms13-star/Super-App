import axios from "axios";
import { buildApiUrl } from "../../../utils/api";
import {
  MOCK_APPOINTMENTS,
  MOCK_DOCTORS,
  FAMILY_MEMBERS,
  MOCK_HEALTH_PACKAGES,
  MOCK_LAB_TESTS,
  MOCK_MEDICINES,
  MOCK_RECORDS,
} from "../data/healthcareMockData";

const endpoints = {
  doctors: buildApiUrl("/doctors"),
  labTests: buildApiUrl("/lab-tests"),
  labTestsInfo: buildApiUrl("/lab-tests/info"),
  healthPackages: buildApiUrl("/health-packages"),
  medicines: buildApiUrl("/medicines"),
  medicinesInfo: buildApiUrl("/medicines/info"),
  records: buildApiUrl("/records"),
  appointments: buildApiUrl("/appointments"),
  familyProfiles: buildApiUrl("/family-profiles"),
  pharmacyOrders: buildApiUrl("/pharmacy/orders"),
  refillReminders: buildApiUrl("/refill-reminders"),
  emergencySos: buildApiUrl("/emergency/sos"),
  emergencyLocation: buildApiUrl("/emergency/location"),
  emergencyIncidents: buildApiUrl("/emergency/incidents"),
  notifications: buildApiUrl("/notifications"),
  partnerApplications: buildApiUrl("/partner/applications"),
  partnerAdminApplications: buildApiUrl("/partner/applications/admin"),
  partnerDashboard: buildApiUrl("/partner/dashboard"),
  dashboardSummary: buildApiUrl("/dashboard/summary"),
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
    }, () => MOCK_DOCTORS, { fallbackStatuses: [401, 403, 404] });
  },

  getLabTests: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.labTests, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => MOCK_LAB_TESTS, { fallbackStatuses: [401, 403, 404] });
  },

  getHealthPackages: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.healthPackages, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => MOCK_HEALTH_PACKAGES, { fallbackStatuses: [401, 403, 404] });
  },

  getLabTestInfo: async (query = "") => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.labTestsInfo, {
        ...authHeaders(),
        params: query ? { q: query } : {},
      });
      const data = unwrap(response) || {};
      return {
        query: data.query || query,
        matches: Array.isArray(data.matches) ? data.matches : [],
        fallback: data.fallback || null,
      };
    }, () => ({
      query,
      matches: [],
      fallback: query
        ? {
            purpose: `${query} test body condition assess cheyyan doctor suggest cheyyunna diagnostic test aanu.`,
            usedFor: "Symptoms, screening, follow-up, or doctor recommendation based evaluation.",
            preparation: "Booking before lab preparation/fasting instruction confirm cheyyuka.",
          }
        : null,
    }), { fallbackStatuses: [401, 403, 404] });
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
    }, { fallbackStatuses: [401, 403, 404] });
  },

  getMedicineInfo: async (query = "") => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.medicinesInfo, {
        ...authHeaders(),
        params: query ? { q: query } : {},
      });
      const data = unwrap(response) || {};
      return {
        query: data.query || query,
        matches: Array.isArray(data.matches) ? data.matches : [],
        fallback: data.fallback || null,
      };
    }, () => ({
      query,
      matches: [],
      fallback: query
        ? {
            purpose: `${query} medicine doctor/pharmacist advice anusarich use cheyyenda medicine aanu.`,
            ingredients: "Exact ingredients brand/strip label anusarich verify cheyyuka.",
            warning: "Self-medication avoid cheyyuka. Doctor/pharmacist advice follow cheyyuka.",
          }
        : null,
    }), { fallbackStatuses: [401, 403, 404] });
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

  verifyAppointmentPayment: async (appointmentId, paymentReference, paymentStatus = "success", paymentProvider = "simulated") => {
    return getWithFallback(async () => {
      const response = await axios.post(
        `${endpoints.appointments}/${appointmentId}/payment/verify`,
        { paymentReference, paymentStatus, paymentProvider },
        authHeaders()
      );
      return unwrap(response);
    }, () => ({
      id: appointmentId,
      paymentReference,
      paymentStatus: paymentStatus === "success" ? "paid" : "failed",
      paymentProvider,
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
      paymentProvider: order.paymentProvider || "simulated",
      paymentReference: `PHARM-MOCK-${Date.now()}`,
    }));
  },

  getPharmacyOrders: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.pharmacyOrders, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => [], { fallbackStatuses: [401, 403] });
  },

  verifyPharmacyPayment: async (orderId, paymentReference, paymentStatus = "success", paymentProvider = "simulated") => {
    return getWithFallback(async () => {
      const response = await axios.post(
        `${endpoints.pharmacyOrders}/${orderId}/payment/verify`,
        { paymentReference, paymentStatus, paymentProvider },
        authHeaders()
      );
      return unwrap(response);
    }, () => ({
      id: orderId,
      paymentReference,
      paymentStatus: paymentStatus === "success" ? "paid" : "failed",
      paymentProvider,
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
        paidAppointmentsRevenue: 0,
        paidPharmacyOrdersRevenue: 0,
        totalRevenue: 0,
      },
    }), { fallbackStatuses: [401, 403] });
  },

  getHealthcareSummary: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.dashboardSummary, authHeaders());
      const data = unwrap(response) || {};
      return {
        appointments: Number(data.appointments ?? 0),
        pharmacyOrders: Number(data.pharmacyOrders ?? 0),
        records: Number(data.records ?? 0),
        reminders: Number(data.reminders ?? 0),
        emergencyCases: Number(data.emergencyCases ?? 0),
        pendingApprovals: Number(data.pendingApprovals ?? 0),
        healthScore: Number(data.healthScore ?? 42),
      };
    }, {
      appointments: 0,
      pharmacyOrders: 0,
      records: 0,
      reminders: 0,
      emergencyCases: 0,
      pendingApprovals: 0,
      healthScore: 42,
    }, { fallbackStatuses: [401, 403, 404] });
  },

  getInitialData: async () => {
    const safeLoad = async (loader, fallbackValue) => {
      try {
        return await loader();
      } catch (_error) {
        return typeof fallbackValue === "function" ? fallbackValue() : fallbackValue;
      }
    };

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
      safeLoad(() => healthcareApi.getDoctors(), MOCK_DOCTORS),
      safeLoad(() => healthcareApi.getLabTests(), MOCK_LAB_TESTS),
      safeLoad(() => healthcareApi.getHealthPackages(), MOCK_HEALTH_PACKAGES),
      safeLoad(() => healthcareApi.getMedicines(), MOCK_MEDICINES),
      safeLoad(() => healthcareApi.getRecords(), MOCK_RECORDS),
      safeLoad(() => healthcareApi.getAppointments(), MOCK_APPOINTMENTS),
      safeLoad(
        () => healthcareApi.getFamilyProfiles(),
        () => FAMILY_MEMBERS.map((member, index) => ({ id: `family-${index + 1}`, name: member, relation: member }))
      ),
      safeLoad(() => healthcareApi.getRefillReminders(), []),
      safeLoad(() => healthcareApi.getEmergencyIncidents(), []),
      safeLoad(() => healthcareApi.getNotifications(), []),
      safeLoad(() => healthcareApi.getPartnerApplications(), []),
      safeLoad(() => healthcareApi.getPharmacyOrders(), []),
      safeLoad(() => healthcareApi.getPartnerDashboard(), {
        applications: [],
        stats: {
          pendingApplications: 0,
          approvedApplications: 0,
          totalAppointments: 0,
          totalPharmacyOrders: 0,
          paidAppointmentsRevenue: 0,
          paidPharmacyOrdersRevenue: 0,
          totalRevenue: 0,
        },
      }),
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
