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
    const created = await healthcareApi.createAppointment(payload);
    setAppointments((previous) => [created, ...previous]);
    return created;
  };

  const handleRescheduleAppointment = async (appointmentId, payload) => {
    const updated = await healthcareApi.updateAppointment(appointmentId, payload);

    setAppointments((previous) => {
      return previous.map((appointment) => {
        if (appointment.id !== appointmentId) {
          return appointment;
        }

        return {
          ...appointment,
          ...updated,
          status: updated.status || "rescheduled",
        };
      });
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

        return {
          ...appointment,
          ...updated,
          status: "cancelled",
        };
      });
    });

    return updated;
  };

  const handleCreateRecord = async (payload) => {
    const created = await healthcareApi.createRecord(payload);
    setRecords((previous) => [{ ...created }, ...previous]);
    return created;
  };

  const handleDeleteRecord = async (recordId) => {
    await healthcareApi.deleteRecord(recordId);

    setRecords((previous) => {
      const record = previous.find((item) => item.id === recordId);
      if (record?.fileUrl && record.fileUrl.startsWith("blob:")) {
        URL.revokeObjectURL(record.fileUrl);
      }

      return previous.filter((item) => item.id !== recordId);
    });
  };

  const handleDownloadRecord = async (record) => {
    if (!record?.id) {
      return;
    }
    const result = await healthcareApi.getRecordDownloadLink(record.id, record.fileUrl || "");
    const downloadUrl = result?.downloadUrl || record.fileUrl;
    if (downloadUrl) {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handlePayAppointment = async (appointment) => {
    if (!appointment?.id) {
      return;
    }
    const initiated = await healthcareApi.initiateAppointmentPayment(appointment.id, "simulated");
    const updated = await healthcareApi.verifyAppointmentPayment(appointment.id, initiated.paymentReference, "success");
    setAppointments((previous) => previous.map((item) => (item.id === appointment.id ? { ...item, ...updated } : item)));
    setNotifications((previous) => [
      {
        id: `local-notification-${Date.now()}`,
        title: "Appointment payment successful",
        message: `Payment completed for ${appointment.doctorName}.`,
        notificationType: "appointment",
        createdAt: new Date().toISOString(),
      },
      ...previous,
    ]);
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
    const created = await healthcareApi.createPharmacyOrder({ order, prescriptionFile });
    setPharmacyOrders((previous) => [created, ...previous]);
    return created;
  };

  const handleVerifyPharmacyPayment = async (orderId, paymentReference, paymentStatus) => {
    const updated = await healthcareApi.verifyPharmacyPayment(orderId, paymentReference, paymentStatus);
    setPharmacyOrders((previous) => previous.map((item) => (item.id === orderId ? { ...item, ...updated } : item)));
    return updated;
  };

  const handleMarkNotificationRead = async (notificationId) => {
    const updated = await healthcareApi.markNotificationRead(notificationId);
    setNotifications((previous) => previous.map((item) => (item.id === notificationId ? { ...item, ...updated } : item)));
  };

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
        />
      ) : null}

      {activeSection === "lab" ? (
        <LabBooking
          labTests={labTests}
          healthPackages={healthPackages}
          loading={loading}
          onCreateAppointment={handleCreateAppointment}
        />
      ) : null}

      {activeSection === "records" ? (
        <RecordsVault
          records={records}
          familyMembers={familyMemberOptions}
          loading={loading}
          onCreateRecord={handleCreateRecord}
          onDeleteRecord={handleDeleteRecord}
          onDownloadRecord={handleDownloadRecord}
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
