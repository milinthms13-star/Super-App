import React, { useCallback, useEffect, useState } from "react";
import "./Healthcare.css";

import DoctorConsultation from "./components/DoctorConsultation";
import ElderlyCare from "./components/ElderlyCare";
import EmergencySOS from "./components/EmergencySOS";
import FamilyProfiles from "./components/FamilyProfiles";
import HealthcareHero from "./components/HealthcareHero";
import HealthcareNav from "./components/HealthcareNav";
import LabBooking from "./components/LabBooking";
import NotificationsCenter from "./components/NotificationsCenter";
import PartnerDashboard from "./components/PartnerDashboard";
import PharmacyDelivery from "./components/PharmacyDelivery";
import RefillReminders from "./components/RefillReminders";
import RecordsVault from "./components/RecordsVault";
import {
  ELDERLY_CARE_PLANS,
  GOVERNMENT_SCHEMES,
  HEALTHCARE_SECTIONS,
} from "./data/healthcareMockData";
import { healthcareApi } from "./services/healthcareApi";

const Healthcare = () => {
  const [activeSection, setActiveSection] = useState("consultation");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [doctors, setDoctors] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [healthPackages, setHealthPackages] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [records, setRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [familyProfiles, setFamilyProfiles] = useState([]);
  const [refillReminders, setRefillReminders] = useState([]);
  const [emergencyIncidents, setEmergencyIncidents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [partnerApplications, setPartnerApplications] = useState([]);
  const [partnerDashboard, setPartnerDashboard] = useState(null);
  const [pharmacyOrders, setPharmacyOrders] = useState([]);
  const [adminApplications, setAdminApplications] = useState([]);
  const [recordAuditLog, setRecordAuditLog] = useState([]);

  const pushNotification = useCallback((notification) => {
    setNotifications((previous) => [
      {
        id: `local-notification-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        ...notification,
      },
      ...previous,
    ]);
  }, []);

  const appendRecordAudit = useCallback((eventType, record, details = "") => {
    if (!record?.id) {
      return;
    }

    setRecordAuditLog((previous) => [
      {
        id: `record-audit-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
        eventType,
        recordId: record.id,
        recordTitle: record.title || record.fileName || "Medical record",
        actor: "Current user",
        details,
        createdAt: new Date().toISOString(),
      },
      ...previous,
    ]);
  }, []);

  const loadHealthcareData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await healthcareApi.getInitialData();
      setDoctors(Array.isArray(response.doctors) ? response.doctors : []);
      setLabTests(Array.isArray(response.labTests) ? response.labTests : []);
      setHealthPackages(Array.isArray(response.healthPackages) ? response.healthPackages : []);
      setMedicines(Array.isArray(response.medicines) ? response.medicines : []);
      setRecords(Array.isArray(response.records) ? response.records : []);
      setAppointments(Array.isArray(response.appointments) ? response.appointments : []);
      setFamilyProfiles(Array.isArray(response.familyProfiles) ? response.familyProfiles : []);
      setRefillReminders(Array.isArray(response.refillReminders) ? response.refillReminders : []);
      setEmergencyIncidents(Array.isArray(response.emergencyIncidents) ? response.emergencyIncidents : []);
      setNotifications(Array.isArray(response.notifications) ? response.notifications : []);
      setPartnerApplications(Array.isArray(response.partnerApplications) ? response.partnerApplications : []);
      setPharmacyOrders(Array.isArray(response.pharmacyOrders) ? response.pharmacyOrders : []);
      setPartnerDashboard(response.partnerDashboard || null);
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Unable to load healthcare data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealthcareData();
  }, [loadHealthcareData]);

  const isAdmin = useCallback(() => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (!currentUser || typeof currentUser !== "object") {
        return false;
      }
      if (currentUser.role === "admin" || currentUser.registrationType === "admin") {
        return true;
      }
      if (Array.isArray(currentUser.roles) && currentUser.roles.includes("admin")) {
        return true;
      }
      return false;
    } catch (_error) {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!isAdmin()) {
      setAdminApplications([]);
      return;
    }
    healthcareApi.getPartnerAdminApplications().then((rows) => {
      setAdminApplications(Array.isArray(rows) ? rows : []);
    });
  }, [isAdmin]);

  const handleCreateAppointment = async (payload) => {
    const lifecycleSeed =
      payload.category === "lab"
        ? {
            ...payload,
            status: payload.status || "booked",
            labStatusTimeline: [
              {
                status: "booked",
                at: new Date().toISOString(),
              },
            ],
          }
        : {
            ...payload,
            status: payload.status || "requested",
            consultationTimeline: [
              {
                status: "requested",
                at: new Date().toISOString(),
              },
            ],
          };

    const created = await healthcareApi.createAppointment(lifecycleSeed);
    setAppointments((previous) => [created, ...previous]);

    pushNotification({
      title: payload.category === "lab" ? "Lab booking created" : "Consultation requested",
      message:
        payload.category === "lab"
          ? `${payload.reason || "Lab test"} is booked for ${payload.patientName || "patient"}.`
          : `Appointment requested with ${payload.doctorName || "doctor"}.`,
      notificationType: payload.category === "lab" ? "lab" : "appointment",
      actionType: payload.category === "lab" ? "open_lab_bookings" : "open_appointments",
      actionLabel: payload.category === "lab" ? "View booking" : "View appointment",
    });

    return created;
  };

  const handleRescheduleAppointment = async (appointmentId, payload) => {
    const updated = await healthcareApi.updateAppointment(appointmentId, payload);

    setAppointments((previous) => {
      return previous.map((appointment) => {
        if (appointment.id !== appointmentId) {
          return appointment;
        }

        const nextTimeline = Array.isArray(appointment.consultationTimeline)
          ? [
              ...appointment.consultationTimeline,
              {
                status: "rescheduled",
                at: new Date().toISOString(),
              },
            ]
          : appointment.consultationTimeline;

        return {
          ...appointment,
          ...updated,
          status: updated.status || "rescheduled",
          consultationTimeline: nextTimeline,
        };
      });
    });

    pushNotification({
      title: "Appointment rescheduled",
      message: `${payload.doctorName || "Doctor"} consultation moved to ${payload.appointmentDate} ${payload.appointmentTime}.`,
      notificationType: "appointment",
      actionType: "open_appointments",
      actionLabel: "View schedule",
    });

    return updated;
  };

  const handleCancelAppointment = async (appointmentId) => {
    const updated = await healthcareApi.cancelAppointment(appointmentId);

    setAppointments((previous) => {
      return previous.map((appointment) => {
        if (appointment.id !== appointmentId) {
          return appointment;
        }

        const nextTimeline = Array.isArray(appointment.consultationTimeline)
          ? [
              ...appointment.consultationTimeline,
              {
                status: "cancelled",
                at: new Date().toISOString(),
              },
            ]
          : appointment.consultationTimeline;

        return {
          ...appointment,
          ...updated,
          status: "cancelled",
          consultationTimeline: nextTimeline,
        };
      });
    });

    const cancelledAppointment = appointments.find((item) => item.id === appointmentId);
    pushNotification({
      title: "Appointment cancelled",
      message: `Cancelled consultation with ${cancelledAppointment?.doctorName || "doctor"}.`,
      notificationType: "appointment",
    });

    return updated;
  };

  const handleUpdateAppointmentLifecycle = async (appointmentId, status, extraPayload = {}) => {
    const updated = await healthcareApi.updateAppointment(appointmentId, {
      status,
      ...extraPayload,
    });

    setAppointments((previous) =>
      previous.map((item) => {
        if (item.id !== appointmentId) {
          return item;
        }

        const timelineKey = item.category === "lab" ? "labStatusTimeline" : "consultationTimeline";
        const currentTimeline = Array.isArray(item[timelineKey]) ? item[timelineKey] : [];

        return {
          ...item,
          ...updated,
          status,
          [timelineKey]: [
            ...currentTimeline,
            {
              status,
              at: new Date().toISOString(),
            },
          ],
        };
      })
    );

    pushNotification({
      title: status === "results_ready" ? "Lab results ready" : "Appointment status updated",
      message: `Status changed to ${status.replaceAll("_", " ")}.`,
      notificationType: status === "results_ready" ? "lab" : "appointment",
      actionType: status === "results_ready" ? "open_lab_bookings" : "open_appointments",
      actionLabel: "Open",
    });

    return updated;
  };

  const handleCreateRecord = async (payload) => {
    const recordMeta = payload?.meta || {};
    const versionSeed = records
      .filter((item) => {
        return (
          !item.deletedAt &&
          item.title === recordMeta.title &&
          item.category === recordMeta.category &&
          item.familyMember === recordMeta.familyMember
        );
      })
      .reduce((maxVersion, item) => Math.max(maxVersion, Number(item.version || 1)), 0);

    const enrichedPayload = {
      ...payload,
      meta: {
        ...recordMeta,
        version: versionSeed + 1,
        consentGrantedAt: recordMeta.consentGrantedAt || new Date().toISOString(),
      },
    };

    const created = await healthcareApi.createRecord(enrichedPayload);
    const normalizedRecord = {
      ...created,
      ...enrichedPayload.meta,
      fileName: created?.fileName || payload?.file?.name || recordMeta.fileName || "",
      fileType: created?.fileType || payload?.file?.type || recordMeta.fileType || "application/octet-stream",
      deletedAt: null,
    };

    setRecords((previous) => [normalizedRecord, ...previous]);
    appendRecordAudit(
      versionSeed > 0 ? "version_uploaded" : "record_uploaded",
      normalizedRecord,
      versionSeed > 0 ? `Uploaded v${versionSeed + 1}` : "Initial upload"
    );
    pushNotification({
      title: "Record uploaded",
      message: `${normalizedRecord.title || normalizedRecord.fileName} saved in vault.`,
      notificationType: "record",
      actionType: "open_records",
      actionLabel: "Open records",
    });
    return created;
  };

  const handleDeleteRecord = async (recordId) => {
    await healthcareApi.deleteRecord(recordId);
    const record = records.find((item) => item.id === recordId);
    appendRecordAudit("delete_requested", record, "Record moved to archive (soft delete).");
    pushNotification({
      title: "Record archived",
      message: `${record?.title || record?.fileName || "Record"} moved to archive.`,
      notificationType: "record",
      actionType: "open_records",
      actionLabel: "View records",
    });

    setRecords((previous) =>
      previous.map((item) =>
        item.id === recordId
          ? {
              ...item,
              deletedAt: new Date().toISOString(),
              status: "archived",
            }
          : item
      )
    );
  };

  const handlePreviewRecord = async (record) => {
    if (!record?.fileUrl) {
      return;
    }
    window.open(record.fileUrl, "_blank", "noopener,noreferrer");
    appendRecordAudit("previewed", record, "Record preview opened.");
  };

  const handleDownloadRecord = async (record) => {
    if (!record?.id) {
      return;
    }
    const result = await healthcareApi.getRecordDownloadLink(record.id, record.fileUrl || "");
    const downloadUrl = result?.downloadUrl || record.fileUrl;
    if (downloadUrl) {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
      appendRecordAudit("downloaded", record, "Secure download opened.");
    }
  };

  const handleSaveLabResultToRecord = async (appointment) => {
    if (!appointment?.id) {
      return;
    }

    const now = new Date().toISOString();
    const fileName = `${String(appointment.reason || "lab-result")
      .toLowerCase()
      .replaceAll(" ", "-")}-${appointment.id}.pdf`;
    const category = appointment.mode === "lab-visit" && String(appointment.reason || "").toLowerCase().includes("scan")
      ? "Scan Report"
      : "Lab Report";

    await handleCreateRecord({
      meta: {
        title: `${appointment.reason} Result`,
        category,
        doctorName: appointment.doctorName || "Lab Partner",
        familyMember: appointment.patientName || "Self",
        recordDate: now.split("T")[0],
        sourceAppointmentId: appointment.id,
        consentGrantedAt: now,
        fileName,
        fileType: "application/pdf",
      },
      file: null,
    });

    await handleUpdateAppointmentLifecycle(appointment.id, "delivered");
  };

  const handlePayAppointment = async (appointment) => {
    if (!appointment?.id) {
      return;
    }
    const initiated = await healthcareApi.initiateAppointmentPayment(appointment.id, "simulated");
    const updated = await healthcareApi.verifyAppointmentPayment(appointment.id, initiated.paymentReference, "success");
    setAppointments((previous) => previous.map((item) => (item.id === appointment.id ? { ...item, ...updated } : item)));
    pushNotification({
      title: "Appointment payment successful",
      message: `Payment completed for ${appointment.doctorName}.`,
      notificationType: "appointment",
      actionType: "open_appointments",
      actionLabel: "View appointment",
    });
  };

  const handleCreateFamilyProfile = async (payload) => {
    const created = await healthcareApi.createFamilyProfile(payload);
    setFamilyProfiles((previous) => [created, ...previous]);
    return created;
  };

  const handleUpdateFamilyProfile = async (profileId, payload) => {
    const updated = await healthcareApi.updateFamilyProfile(profileId, payload);
    setFamilyProfiles((previous) => previous.map((item) => (item.id === profileId ? { ...item, ...updated } : item)));
    return updated;
  };

  const handleDeleteFamilyProfile = async (profileId) => {
    await healthcareApi.deleteFamilyProfile(profileId);
    setFamilyProfiles((previous) => previous.filter((item) => item.id !== profileId));
  };

  const handleCreateReminder = async (payload) => {
    const created = await healthcareApi.createRefillReminder(payload);
    setRefillReminders((previous) => [created, ...previous]);
    return created;
  };

  const handleUpdateReminder = async (reminderId, payload) => {
    const updated = await healthcareApi.updateRefillReminder(reminderId, payload);
    setRefillReminders((previous) => previous.map((item) => (item.id === reminderId ? { ...item, ...updated } : item)));
    return updated;
  };

  const handleDeleteReminder = async (reminderId) => {
    await healthcareApi.deleteRefillReminder(reminderId);
    setRefillReminders((previous) => previous.filter((item) => item.id !== reminderId));
  };

  const handleCreateIncident = async (payload) => {
    const created = await healthcareApi.createEmergencyIncident(payload);
    setEmergencyIncidents((previous) => [created, ...previous]);
    return created;
  };

  const handleUpdateIncidentLocation = async (payload) => {
    const updated = await healthcareApi.updateEmergencyLocation(payload);
    setEmergencyIncidents((previous) =>
      previous.map((item) => (item.id === payload.incidentId ? { ...item, ...updated } : item))
    );
    return updated;
  };

  const handleCreatePharmacyOrder = async ({ order, prescriptionFile }) => {
    const totalAmount = (order?.items || []).reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0
    );
    const created = await healthcareApi.createPharmacyOrder({
      order: {
        ...order,
        totalAmount,
        orderStatus: "placed",
        orderTimeline: [
          {
            status: "placed",
            at: new Date().toISOString(),
          },
        ],
      },
      prescriptionFile,
    });
    setPharmacyOrders((previous) => [created, ...previous]);
    pushNotification({
      title: "Pharmacy order placed",
      message: `Order ${created?.id || ""} has been placed.`,
      notificationType: "pharmacy",
      actionType: "open_pharmacy",
      actionLabel: "Track order",
    });
    return created;
  };

  const handleVerifyPharmacyPayment = async (orderId, paymentReference, paymentStatus) => {
    const updated = await healthcareApi.verifyPharmacyPayment(orderId, paymentReference, paymentStatus);
    setPharmacyOrders((previous) => previous.map((item) => (item.id === orderId ? { ...item, ...updated } : item)));
    pushNotification({
      title: paymentStatus === "success" ? "Pharmacy payment successful" : "Pharmacy payment failed",
      message: `Payment status updated for ${orderId}.`,
      notificationType: "pharmacy",
      actionType: "open_pharmacy",
      actionLabel: "Open pharmacy",
    });
    return updated;
  };

  const handleUpdatePharmacyOrderStatus = async (orderId, nextStatus) => {
    const updated = await healthcareApi.updatePharmacyOrder(orderId, { orderStatus: nextStatus });
    setPharmacyOrders((previous) =>
      previous.map((item) => {
        if (item.id !== orderId) {
          return item;
        }
        const timeline = Array.isArray(item.orderTimeline) ? item.orderTimeline : [];
        return {
          ...item,
          ...updated,
          orderStatus: nextStatus,
          orderTimeline: [
            ...timeline,
            {
              status: nextStatus,
              at: new Date().toISOString(),
            },
          ],
        };
      })
    );
    pushNotification({
      title: "Order tracking update",
      message: `Pharmacy order ${orderId} is now ${nextStatus.replaceAll("_", " ")}.`,
      notificationType: "pharmacy",
      actionType: "open_pharmacy",
      actionLabel: "Track order",
    });
    return updated;
  };

  const handleMarkNotificationRead = async (notificationId) => {
    const updated = await healthcareApi.markNotificationRead(notificationId);
    setNotifications((previous) => previous.map((item) => (item.id === notificationId ? { ...item, ...updated } : item)));
  };

  const handleNotificationAction = useCallback((notification) => {
    if (!notification) {
      return;
    }

    if (notification.actionType === "open_appointments") {
      setActiveSection("consultation");
      return;
    }
    if (notification.actionType === "open_lab_bookings") {
      setActiveSection("lab");
      return;
    }
    if (notification.actionType === "open_records") {
      setActiveSection("records");
      return;
    }
    if (notification.actionType === "open_pharmacy") {
      setActiveSection("pharmacy");
      return;
    }
  }, []);

  const handleCreatePartnerApplication = async ({ payload, documents }) => {
    const created = await healthcareApi.createPartnerApplication({ payload, documents });
    setPartnerApplications((previous) => [created, ...previous]);
    const dashboard = await healthcareApi.getPartnerDashboard();
    setPartnerDashboard(dashboard);
    return created;
  };

  const handleReviewPartnerApplication = async (applicationId, status) => {
    const updated = await healthcareApi.reviewPartnerApplication(applicationId, status);
    setAdminApplications((previous) => previous.map((item) => (item.id === applicationId ? { ...item, ...updated } : item)));
    setPartnerApplications((previous) => previous.map((item) => (item.id === applicationId ? { ...item, ...updated } : item)));
    const dashboard = await healthcareApi.getPartnerDashboard();
    setPartnerDashboard(dashboard);
  };

  const familyMemberOptions = [
    "Self",
    ...familyProfiles.map((profile) => profile.name || profile.relation).filter(Boolean),
  ];

  return (
    <div className="healthcare-shell">
      <HealthcareHero onBookDoctor={() => setActiveSection("consultation")} onBookLab={() => setActiveSection("lab")} />

      <HealthcareNav sections={HEALTHCARE_SECTIONS} activeSection={activeSection} onChange={setActiveSection} />

      {errorMessage ? (
        <div className="healthcare-inline-alert healthcare-error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      {activeSection === "consultation" ? (
        <DoctorConsultation
          doctors={doctors}
          appointments={appointments.filter((item) => (item.category || "doctor") === "doctor")}
          loading={loading}
          onCreateAppointment={handleCreateAppointment}
          onCancelAppointment={handleCancelAppointment}
          onRescheduleAppointment={handleRescheduleAppointment}
          onPayAppointment={handlePayAppointment}
          onUpdateAppointmentLifecycle={handleUpdateAppointmentLifecycle}
        />
      ) : null}

      {activeSection === "lab" ? (
        <LabBooking
          labTests={labTests}
          healthPackages={healthPackages}
          loading={loading}
          onCreateAppointment={handleCreateAppointment}
          labAppointments={appointments.filter((item) => item.category === "lab")}
          onUpdateAppointmentStatus={handleUpdateAppointmentLifecycle}
          onSaveResultToRecord={handleSaveLabResultToRecord}
        />
      ) : null}

      {activeSection === "records" ? (
        <RecordsVault
          records={records.filter((item) => !item.deletedAt)}
          familyMembers={familyMemberOptions}
          loading={loading}
          onCreateRecord={handleCreateRecord}
          onDeleteRecord={handleDeleteRecord}
          onDownloadRecord={handleDownloadRecord}
          onPreviewRecord={handlePreviewRecord}
          auditLog={recordAuditLog}
        />
      ) : null}

      {activeSection === "family" ? (
        <FamilyProfiles
          profiles={familyProfiles}
          loading={loading}
          onCreateProfile={handleCreateFamilyProfile}
          onUpdateProfile={handleUpdateFamilyProfile}
          onDeleteProfile={handleDeleteFamilyProfile}
        />
      ) : null}

      {activeSection === "pharmacy" ? (
        <PharmacyDelivery
          medicines={medicines}
          loading={loading}
          orders={pharmacyOrders}
          onCreateOrder={handleCreatePharmacyOrder}
          onVerifyPayment={handleVerifyPharmacyPayment}
          onUpdateOrderStatus={handleUpdatePharmacyOrderStatus}
        />
      ) : null}

      {activeSection === "reminders" ? (
        <RefillReminders
          reminders={refillReminders}
          loading={loading}
          familyMembers={familyMemberOptions}
          onCreateReminder={handleCreateReminder}
          onUpdateReminder={handleUpdateReminder}
          onDeleteReminder={handleDeleteReminder}
        />
      ) : null}

      {activeSection === "emergency" ? (
        <EmergencySOS
          familyMembers={familyMemberOptions}
          incidents={emergencyIncidents}
          onCreateIncident={handleCreateIncident}
          onUpdateIncidentLocation={handleUpdateIncidentLocation}
        />
      ) : null}

      {activeSection === "notifications" ? (
        <NotificationsCenter
          notifications={notifications}
          loading={loading}
          onMarkRead={handleMarkNotificationRead}
          onAction={handleNotificationAction}
        />
      ) : null}

      {activeSection === "elderly" ? (
        <ElderlyCare carePlans={ELDERLY_CARE_PLANS} governmentSchemes={GOVERNMENT_SCHEMES} />
      ) : null}

      {activeSection === "partner" ? (
        <PartnerDashboard
          dashboard={partnerDashboard}
          applications={partnerApplications}
          adminApplications={adminApplications}
          loading={loading}
          isAdmin={isAdmin()}
          onCreateApplication={handleCreatePartnerApplication}
          onReviewApplication={handleReviewPartnerApplication}
        />
      ) : null}
    </div>
  );
};

export default Healthcare;
