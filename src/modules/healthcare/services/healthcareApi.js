import axios from "axios";
import { buildApiUrl } from "../../../utils/api";
import {
  enqueueHealthcareAction,
  flushHealthcareQueue,
  getDeadLetterHealthcareActions,
  getQueuedHealthcareActions,
  requeueAllDeadLetterHealthcareActions,
} from "./offlineActionQueue";
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
  recordsAudit: buildApiUrl("/records/audit"),
  emergencyIncidentUpdate: buildApiUrl("/emergency/incidents"),
  opsMetrics: buildApiUrl("/ops/metrics"),
  retentionPurge: buildApiUrl("/ops/retention/purge"),
  aiAssist: buildApiUrl("/ai/assist"),
};

const authHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  },
});

const unwrap = (response) => response?.data?.data ?? response?.data;
const generateIdempotencyKey = (scope = "healthcare") =>
  `${scope}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
const withIdempotency = (config = {}, providedKey = "", scope = "healthcare") => {
  const key = String(providedKey || "").trim() || generateIdempotencyKey(scope);
  return {
    ...config,
    headers: {
      ...(config?.headers || {}),
      "x-idempotency-key": key,
    },
    idempotencyKey: key,
  };
};
const isAuthError = (error) => [401, 403].includes(Number(error?.response?.status));
const isQueueEligibleError = (error) => {
  if (isAuthError(error)) {
    return false;
  }
  const status = Number(error?.response?.status || 0);
  if (!status) {
    return true;
  }
  return status >= 500 || status === 429;
};

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

const withOfflineQueue = async ({
  actionType,
  execute,
  queuePayload,
  fallbackValue,
  canQueue = true,
}) => {
  try {
    return await execute();
  } catch (error) {
    if (!canQueue || !isQueueEligibleError(error)) {
      throw error;
    }
    const queued = enqueueHealthcareAction({ type: actionType, payload: queuePayload });
    const fallback = typeof fallbackValue === "function" ? fallbackValue() : fallbackValue;
    return {
      ...fallback,
      syncStatus: "queued",
      queuedActionId: queued.id,
    };
  }
};

export const healthcareApi = {
  getDoctors: async (specialty = "") => {
    return getWithFallback(async () => {
      const params = specialty ? { specialty } : {};
      const response = await axios.get(endpoints.doctors, { ...authHeaders(), params });
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => MOCK_DOCTORS, { fallbackStatuses: [404] });
  },

  getLabTests: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.labTests, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => MOCK_LAB_TESTS, { fallbackStatuses: [404] });
  },

  getHealthPackages: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.healthPackages, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => MOCK_HEALTH_PACKAGES, { fallbackStatuses: [404] });
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
    }), { fallbackStatuses: [404] });
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
    }, { fallbackStatuses: [404] });
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
    }), { fallbackStatuses: [404] });
  },

  getRecords: async ({ includeDeleted = false } = {}) => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.records, {
        ...authHeaders(),
        params: includeDeleted ? { includeDeleted: "true" } : {},
      });
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => MOCK_RECORDS);
  },

  createRecord: async ({ meta = {}, file = null }) => {
    const idempotencyKey = generateIdempotencyKey("hc-record");
    return withOfflineQueue({
      actionType: "create_record",
      canQueue: false,
      queuePayload: { meta },
      execute: async () => {
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
        formData.append("idempotencyKey", idempotencyKey);
        const response = await axios.post(endpoints.records, formData, {
          ...withIdempotency(authHeaders(), idempotencyKey, "hc-record"),
          headers: {
            ...withIdempotency(authHeaders(), idempotencyKey, "hc-record").headers,
            "Content-Type": "multipart/form-data",
          },
        });
        return unwrap(response);
      },
      fallbackValue: () => ({
        ...meta,
        fileName: file?.name || meta?.fileName || "",
        fileType: file?.type || meta?.fileType || "application/octet-stream",
        fileSize: file?.size || Number(meta?.fileSize || 0),
        fileUrl: file ? URL.createObjectURL(file) : meta?.fileUrl || "",
        id: `record-${Date.now()}`,
      }),
    });
  },

  deleteRecord: async (recordId) => {
    return withOfflineQueue({
      actionType: "archive_record",
      queuePayload: { recordId },
      execute: async () => {
        const response = await axios.delete(`${endpoints.records}/${recordId}`, authHeaders());
        return unwrap(response);
      },
      fallbackValue: () => ({ id: recordId, status: "archived" }),
    });
  },

  restoreRecord: async (recordId) => {
    return withOfflineQueue({
      actionType: "restore_record",
      queuePayload: { recordId },
      execute: async () => {
        const response = await axios.patch(`${endpoints.records}/${recordId}/restore`, {}, authHeaders());
        return unwrap(response);
      },
      fallbackValue: () => ({ id: recordId, isDeleted: false, syncStatus: "queued" }),
    });
  },

  renewRecordConsent: async (recordId, payload) => {
    return withOfflineQueue({
      actionType: "renew_record_consent",
      queuePayload: { recordId, payload },
      execute: async () => {
        const response = await axios.patch(`${endpoints.records}/${recordId}/consent`, payload, authHeaders());
        return unwrap(response);
      },
      fallbackValue: () => ({ id: recordId, ...payload }),
    });
  },

  getRecordDownloadLink: async (recordId, fallbackUrl = "") => {
    return getWithFallback(async () => {
      const response = await axios.get(`${endpoints.records}/${recordId}/download`, authHeaders());
      return unwrap(response);
    }, () => ({
      downloadUrl: fallbackUrl,
      fileName: "",
    }), { fallbackStatuses: [404] });
  },

  getAppointments: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.appointments, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => MOCK_APPOINTMENTS);
  },

  createAppointment: async (payload) => {
    const idempotencyKey = generateIdempotencyKey("hc-appointment");
    return withOfflineQueue({
      actionType: "create_appointment",
      queuePayload: { payload, idempotencyKey },
      execute: async () => {
        const response = await axios.post(
          endpoints.appointments,
          { ...payload, idempotencyKey },
          withIdempotency(authHeaders(), idempotencyKey, "hc-appointment")
        );
        return unwrap(response);
      },
      fallbackValue: () => ({
        ...payload,
        id: `appointment-${Date.now()}`,
        status: payload.status || "booked",
      }),
    });
  },

  updateAppointment: async (appointmentId, payload) => {
    return withOfflineQueue({
      actionType: "update_appointment",
      queuePayload: { appointmentId, payload },
      execute: async () => {
        const response = await axios.patch(`${endpoints.appointments}/${appointmentId}`, payload, authHeaders());
        return unwrap(response);
      },
      fallbackValue: () => ({
        id: appointmentId,
        ...payload,
      }),
    });
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
    }, () => FAMILY_MEMBERS.map((member, index) => ({ id: `family-${index + 1}`, name: member, relation: member })));
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
    const hasBinaryAttachment = Boolean(prescriptionFile);
    const idempotencyKey = generateIdempotencyKey("hc-pharmacy");
    return withOfflineQueue({
      actionType: "create_pharmacy_order",
      canQueue: false,
      queuePayload: { order },
      execute: async () => {
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
        formData.append("idempotencyKey", idempotencyKey);
        const response = await axios.post(endpoints.pharmacyOrders, formData, {
          ...withIdempotency(authHeaders(), idempotencyKey, "hc-pharmacy"),
          headers: {
            ...withIdempotency(authHeaders(), idempotencyKey, "hc-pharmacy").headers,
            "Content-Type": "multipart/form-data",
          },
        });
        return unwrap(response);
      },
      fallbackValue: () => ({
        id: `pharmacy-order-${Date.now()}`,
        ...order,
        paymentStatus: "pending",
        orderStatus: "placed",
        paymentProvider: order.paymentProvider || "simulated",
        paymentReference: `PHARM-MOCK-${Date.now()}`,
        requiresAttachmentSync: hasBinaryAttachment,
      }),
    });
  },

  getPharmacyOrders: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.pharmacyOrders, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => []);
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
    return withOfflineQueue({
      actionType: "update_pharmacy_order",
      queuePayload: { orderId, payload },
      execute: async () => {
        const response = await axios.patch(`${endpoints.pharmacyOrders}/${orderId}`, payload, authHeaders());
        return unwrap(response);
      },
      fallbackValue: () => ({
        id: orderId,
        ...payload,
      }),
    });
  },

  getRefillReminders: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.refillReminders, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => []);
  },

  createRefillReminder: async (payload) => {
    const idempotencyKey = generateIdempotencyKey("hc-refill");
    return withOfflineQueue({
      actionType: "create_refill_reminder",
      canQueue: false,
      queuePayload: { payload },
      execute: async () => {
        const response = await axios.post(
          endpoints.refillReminders,
          { ...payload, idempotencyKey },
          withIdempotency(authHeaders(), idempotencyKey, "hc-refill")
        );
        return unwrap(response);
      },
      fallbackValue: () => ({
        ...payload,
        id: `refill-${Date.now()}`,
      }),
    });
  },

  updateRefillReminder: async (reminderId, payload) => {
    return withOfflineQueue({
      actionType: "update_refill_reminder",
      queuePayload: { reminderId, payload },
      execute: async () => {
        const response = await axios.patch(`${endpoints.refillReminders}/${reminderId}`, payload, authHeaders());
        return unwrap(response);
      },
      fallbackValue: () => ({
        id: reminderId,
        ...payload,
      }),
    });
  },

  deleteRefillReminder: async (reminderId) => {
    return getWithFallback(async () => {
      const response = await axios.delete(`${endpoints.refillReminders}/${reminderId}`, authHeaders());
      return unwrap(response);
    }, () => ({ id: reminderId }));
  },

  createEmergencyIncident: async (payload) => {
    const idempotencyKey = generateIdempotencyKey("hc-emergency");
    return withOfflineQueue({
      actionType: "create_emergency_incident",
      canQueue: false,
      queuePayload: { payload },
      execute: async () => {
        const response = await axios.post(
          endpoints.emergencySos,
          { ...payload, idempotencyKey },
          withIdempotency(authHeaders(), idempotencyKey, "hc-emergency")
        );
        return unwrap(response);
      },
      fallbackValue: () => ({
        ...payload,
        id: `incident-${Date.now()}`,
        status: "open",
      }),
    });
  },

  updateEmergencyLocation: async (payload) => {
    return withOfflineQueue({
      actionType: "update_emergency_location",
      queuePayload: { payload },
      execute: async () => {
        const response = await axios.post(endpoints.emergencyLocation, payload, authHeaders());
        return unwrap(response);
      },
      fallbackValue: () => ({
        ...payload,
        id: payload.incidentId,
      }),
    });
  },

  updateEmergencyIncident: async (incidentId, payload = {}) => {
    return withOfflineQueue({
      actionType: "update_emergency_incident",
      queuePayload: { incidentId, payload },
      execute: async () => {
        const response = await axios.patch(`${endpoints.emergencyIncidentUpdate}/${incidentId}`, payload, authHeaders());
        return unwrap(response);
      },
      fallbackValue: () => ({
        id: incidentId,
        ...payload,
      }),
    });
  },

  getEmergencyIncidents: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.emergencyIncidents, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => []);
  },

  getNotifications: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.notifications, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => []);
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
    }, () => []);
  },

  getPartnerAdminApplications: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.partnerAdminApplications, authHeaders());
      return Array.isArray(unwrap(response)) ? unwrap(response) : [];
    }, () => []);
  },

  createPartnerApplication: async ({ payload = {}, documents = [] }) => {
    const idempotencyKey = generateIdempotencyKey("hc-partner");
    return withOfflineQueue({
      actionType: "create_partner_application",
      canQueue: false,
      queuePayload: { payload },
      execute: async () => {
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
        formData.append("idempotencyKey", idempotencyKey);
        const response = await axios.post(endpoints.partnerApplications, formData, {
          ...withIdempotency(authHeaders(), idempotencyKey, "hc-partner"),
          headers: {
            ...withIdempotency(authHeaders(), idempotencyKey, "hc-partner").headers,
            "Content-Type": "multipart/form-data",
          },
        });
        return unwrap(response);
      },
      fallbackValue: () => ({
        ...payload,
        id: `partner-${Date.now()}`,
        documents: (documents || []).map((file) => ({
          fileName: file?.name || "",
          fileType: file?.type || "application/octet-stream",
          fileUrl: "",
        })),
        status: "pending",
        requiresAttachmentSync: (documents || []).length > 0,
      }),
    });
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
    }), { fallbackStatuses: [] });
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
    }, { fallbackStatuses: [404] });
  },

  getRecordAuditLogs: async ({ page = 1, limit = 25, action = "", from = "", to = "" } = {}) => {
    return getWithFallback(async () => {
      const params = {
        page: Number(page) || 1,
        limit: Number(limit) || 25,
      };
      if (action) {
        params.action = action;
      }
      if (from) {
        params.from = from;
      }
      if (to) {
        params.to = to;
      }
      const response = await axios.get(endpoints.recordsAudit, {
        ...authHeaders(),
        params,
      });
      const rows = Array.isArray(unwrap(response)) ? unwrap(response) : [];
      const pagination = response?.data?.pagination || null;
      return { rows, pagination };
    }, () => ({ rows: [], pagination: null }), { fallbackStatuses: [404] });
  },

  getQueuedOfflineActions: () => {
    return getQueuedHealthcareActions();
  },

  getDeadLetterOfflineActions: () => {
    return getDeadLetterHealthcareActions();
  },

  retryDeadLetterOfflineActions: async () => {
    const { movedCount } = requeueAllDeadLetterHealthcareActions();
    if (!movedCount) {
      return { movedCount: 0, processed: 0, failed: 0, deadLettered: 0 };
    }
    const result = await flushHealthcareQueue({
      create_record: async ({ meta, idempotencyKey }) =>
        axios.post(
          endpoints.records,
          { ...(meta || {}), ...(idempotencyKey ? { idempotencyKey } : {}) },
          withIdempotency(authHeaders(), idempotencyKey, "hc-record")
        ),
      archive_record: async ({ recordId }) => axios.delete(`${endpoints.records}/${recordId}`, authHeaders()),
      restore_record: async ({ recordId }) => axios.patch(`${endpoints.records}/${recordId}/restore`, {}, authHeaders()),
      renew_record_consent: async ({ recordId, payload }) =>
        axios.patch(`${endpoints.records}/${recordId}/consent`, payload, authHeaders()),
      create_appointment: async ({ payload, idempotencyKey }) =>
        axios.post(
          endpoints.appointments,
          { ...(payload || {}), ...(idempotencyKey ? { idempotencyKey } : {}) },
          withIdempotency(authHeaders(), idempotencyKey, "hc-appointment")
        ),
      update_appointment: async ({ appointmentId, payload }) =>
        axios.patch(`${endpoints.appointments}/${appointmentId}`, payload, authHeaders()),
      create_pharmacy_order: async ({ order, idempotencyKey }) =>
        axios.post(
          endpoints.pharmacyOrders,
          { ...(order || {}), ...(idempotencyKey ? { idempotencyKey } : {}) },
          withIdempotency(authHeaders(), idempotencyKey, "hc-pharmacy")
        ),
      create_refill_reminder: async ({ payload, idempotencyKey }) =>
        axios.post(
          endpoints.refillReminders,
          { ...(payload || {}), ...(idempotencyKey ? { idempotencyKey } : {}) },
          withIdempotency(authHeaders(), idempotencyKey, "hc-refill")
        ),
      update_refill_reminder: async ({ reminderId, payload }) =>
        axios.patch(`${endpoints.refillReminders}/${reminderId}`, payload, authHeaders()),
      create_emergency_incident: async ({ payload, idempotencyKey }) =>
        axios.post(
          endpoints.emergencySos,
          { ...(payload || {}), ...(idempotencyKey ? { idempotencyKey } : {}) },
          withIdempotency(authHeaders(), idempotencyKey, "hc-emergency")
        ),
      update_emergency_location: async ({ payload }) => axios.post(endpoints.emergencyLocation, payload, authHeaders()),
      update_emergency_incident: async ({ incidentId, payload }) =>
        axios.patch(`${endpoints.emergencyIncidentUpdate}/${incidentId}`, payload, authHeaders()),
      update_pharmacy_order: async ({ orderId, payload }) =>
        axios.patch(`${endpoints.pharmacyOrders}/${orderId}`, payload, authHeaders()),
      create_partner_application: async ({ payload, idempotencyKey }) =>
        axios.post(
          endpoints.partnerApplications,
          { ...(payload || {}), ...(idempotencyKey ? { idempotencyKey } : {}) },
          withIdempotency(authHeaders(), idempotencyKey, "hc-partner")
        ),
    });
    return { movedCount, ...result };
  },

  getOpsMetrics: async () => {
    return getWithFallback(async () => {
      const response = await axios.get(endpoints.opsMetrics, authHeaders());
      return unwrap(response) || {};
    }, () => ({
      pendingPrescriptionReviews: 0,
      criticalIncidents: 0,
      openIncidents: 0,
      archivedRecordsPendingPurge: 0,
      archivedRecordsExpiredPurge: 0,
      generatedAt: new Date().toISOString(),
    }), { fallbackStatuses: [403, 404] });
  },

  runRetentionPurge: async (limit = 200) => {
    return getWithFallback(async () => {
      const response = await axios.post(endpoints.retentionPurge, { limit }, authHeaders());
      return unwrap(response) || {};
    }, () => ({
      scanned: 0,
      purged: 0,
      s3Deleted: 0,
      s3DeleteFailed: 0,
      triggeredAt: new Date().toISOString(),
    }), { fallbackStatuses: [400, 403, 404] });
  },

  askHealthcareAssistant: async ({ question, context = {} }) => {
    return getWithFallback(async () => {
      const response = await axios.post(
        endpoints.aiAssist,
        { question, context },
        authHeaders()
      );
      return unwrap(response) || {};
    }, () => ({
      answer: "Healthcare assistant is currently unavailable. Please try again.",
      carePlan: [],
      riskFlags: [],
      disclaimer: "Informational support only.",
      provider: "fallback",
      model: "fallback",
      generatedAt: new Date().toISOString(),
    }));
  },

  getInitialData: async () => {
    // Fire-and-forget sync so initial render is not blocked by retry work.
    try {
      void flushHealthcareQueue({
        create_record: async ({ meta, idempotencyKey }) =>
          axios.post(
            endpoints.records,
            { ...(meta || {}), ...(idempotencyKey ? { idempotencyKey } : {}) },
            withIdempotency(authHeaders(), idempotencyKey, "hc-record")
          ),
        archive_record: async ({ recordId }) => axios.delete(`${endpoints.records}/${recordId}`, authHeaders()),
        restore_record: async ({ recordId }) => axios.patch(`${endpoints.records}/${recordId}/restore`, {}, authHeaders()),
        renew_record_consent: async ({ recordId, payload }) =>
          axios.patch(`${endpoints.records}/${recordId}/consent`, payload, authHeaders()),
        create_appointment: async ({ payload, idempotencyKey }) =>
          axios.post(
            endpoints.appointments,
            { ...(payload || {}), ...(idempotencyKey ? { idempotencyKey } : {}) },
            withIdempotency(authHeaders(), idempotencyKey, "hc-appointment")
          ),
        update_appointment: async ({ appointmentId, payload }) =>
          axios.patch(`${endpoints.appointments}/${appointmentId}`, payload, authHeaders()),
        create_pharmacy_order: async ({ order, idempotencyKey }) =>
          axios.post(
            endpoints.pharmacyOrders,
            { ...(order || {}), ...(idempotencyKey ? { idempotencyKey } : {}) },
            withIdempotency(authHeaders(), idempotencyKey, "hc-pharmacy")
          ),
        create_refill_reminder: async ({ payload, idempotencyKey }) =>
          axios.post(
            endpoints.refillReminders,
            { ...(payload || {}), ...(idempotencyKey ? { idempotencyKey } : {}) },
            withIdempotency(authHeaders(), idempotencyKey, "hc-refill")
          ),
        update_refill_reminder: async ({ reminderId, payload }) =>
          axios.patch(`${endpoints.refillReminders}/${reminderId}`, payload, authHeaders()),
        create_emergency_incident: async ({ payload, idempotencyKey }) =>
          axios.post(
            endpoints.emergencySos,
            { ...(payload || {}), ...(idempotencyKey ? { idempotencyKey } : {}) },
            withIdempotency(authHeaders(), idempotencyKey, "hc-emergency")
          ),
        update_emergency_location: async ({ payload }) => axios.post(endpoints.emergencyLocation, payload, authHeaders()),
        update_emergency_incident: async ({ incidentId, payload }) =>
          axios.patch(`${endpoints.emergencyIncidentUpdate}/${incidentId}`, payload, authHeaders()),
        update_pharmacy_order: async ({ orderId, payload }) =>
          axios.patch(`${endpoints.pharmacyOrders}/${orderId}`, payload, authHeaders()),
        create_partner_application: async ({ payload, idempotencyKey }) =>
          axios.post(
            endpoints.partnerApplications,
            { ...(payload || {}), ...(idempotencyKey ? { idempotencyKey } : {}) },
            withIdempotency(authHeaders(), idempotencyKey, "hc-partner")
          ),
      }).catch(() => ({}));
    } catch (_error) {
      // Queue flush failures are non-blocking. We continue with normal data fetch.
    }

    const safeLoad = async (loader, fallbackValue) => {
      try {
        return await loader();
      } catch (error) {
        if (isAuthError(error)) {
          throw error;
        }
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
      safeLoad(() => healthcareApi.getRecords({ includeDeleted: true }), MOCK_RECORDS),
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
