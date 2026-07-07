import React, { useEffect, useState } from "react";
import { healthcareApi } from "../services/healthcareApi";
import "./HealthcareAdminPanel.css";

const HealthcareAdminPanel = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState({
    pendingDoctors: [],
    pendingPrescriptions: [],
    criticalEmergencies: [],
    metrics: {},
  });

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const data = await healthcareApi.getAdminDashboard();
      setAdminData(data);
    } catch (error) {
      console.error("Failed to load admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorApproval = async (doctorId, status, notes) => {
    try {
      await healthcareApi.updateDoctorApproval(doctorId, status, notes);
      await loadAdminData();
    } catch (error) {
      console.error("Doctor approval failed:", error);
    }
  };

  const handlePrescriptionReview = async (prescriptionId, status, notes) => {
    try {
      await healthcareApi.reviewPrescription(prescriptionId, status, notes);
      await loadAdminData();
    } catch (error) {
      console.error("Prescription review failed:", error);
    }
  };

  const handleEmergencyEscalation = async (incidentId, action) => {
    try {
      await healthcareApi.escalateEmergency(incidentId, action);
      await loadAdminData();
    } catch (error) {
      console.error("Emergency escalation failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="healthcare-admin-panel">
        <div className="admin-loading">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="healthcare-admin-panel" data-testid="healthcare-admin-panel">
      <div className="admin-header">
        <h1>Healthcare Administration Panel</h1>
        <p>Manage doctors, prescriptions, emergencies, and system operations</p>
      </div>

      <div className="admin-tabs">
        <button
          className={activeTab === "overview" ? "tab-active" : ""}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={activeTab === "doctors" ? "tab-active" : ""}
          onClick={() => setActiveTab("doctors")}
        >
          Doctor Approvals ({adminData.pendingDoctors?.length || 0})
        </button>
        <button
          className={activeTab === "prescriptions" ? "tab-active" : ""}
          onClick={() => setActiveTab("prescriptions")}
        >
          Prescription Reviews ({adminData.pendingPrescriptions?.length || 0})
        </button>
        <button
          className={activeTab === "emergencies" ? "tab-active" : ""}
          onClick={() => setActiveTab("emergencies")}
        >
          Critical Emergencies ({adminData.criticalEmergencies?.length || 0})
        </button>
        <button
          className={activeTab === "analytics" ? "tab-active" : ""}
          onClick={() => setActiveTab("analytics")}
        >
          Analytics
        </button>
        <button
          className={activeTab === "settings" ? "tab-active" : ""}
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
      </div>

      <div className="admin-content">
        {activeTab === "overview" && (
          <OverviewTab metrics={adminData.metrics} onRefresh={loadAdminData} />
        )}
        
        {activeTab === "doctors" && (
          <DoctorApprovalsTab
            doctors={adminData.pendingDoctors}
            onApprove={handleDoctorApproval}
            onRefresh={loadAdminData}
          />
        )}

        {activeTab === "prescriptions" && (
          <PrescriptionReviewsTab
            prescriptions={adminData.pendingPrescriptions}
            onReview={handlePrescriptionReview}
            onRefresh={loadAdminData}
          />
        )}

        {activeTab === "emergencies" && (
          <EmergenciesTab
            emergencies={adminData.criticalEmergencies}
            onEscalate={handleEmergencyEscalation}
            onRefresh={loadAdminData}
          />
        )}

        {activeTab === "analytics" && <AnalyticsTab />}

        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ metrics, onRefresh }) => {
  return (
    <div className="overview-tab">
      <h2>System Overview</h2>
      
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Doctors</h3>
          <p className="metric-value">{metrics?.totalDoctors || 0}</p>
          <span className="metric-label">Active: {metrics?.activeDoctors || 0}</span>
        </div>

        <div className="metric-card">
          <h3>Appointments Today</h3>
          <p className="metric-value">{metrics?.appointmentsToday || 0}</p>
          <span className="metric-label">Completed: {metrics?.completedToday || 0}</span>
        </div>

        <div className="metric-card">
          <h3>Pharmacy Orders</h3>
          <p className="metric-value">{metrics?.pharmacyOrders || 0}</p>
          <span className="metric-label">Pending: {metrics?.pendingOrders || 0}</span>
        </div>

        <div className="metric-card critical">
          <h3>Active Emergencies</h3>
          <p className="metric-value">{metrics?.activeEmergencies || 0}</p>
          <span className="metric-label">Critical: {metrics?.criticalEmergencies || 0}</span>
        </div>

        <div className="metric-card">
          <h3>Lab Reports</h3>
          <p className="metric-value">{metrics?.labReportsProcessed || 0}</p>
          <span className="metric-label">This month</span>
        </div>

        <div className="metric-card">
          <h3>Revenue</h3>
          <p className="metric-value">₹{(metrics?.revenue || 0).toLocaleString()}</p>
          <span className="metric-label">This month</span>
        </div>
      </div>

      <button className="admin-refresh-btn" onClick={onRefresh}>
        Refresh Data
      </button>
    </div>
  );
};

// Doctor Approvals Tab Component
const DoctorApprovalsTab = ({ doctors, onApprove, onRefresh }) => {
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const handleApprove = async (doctorId, status) => {
    await onApprove(doctorId, status, reviewNotes);
    setSelectedDoctor(null);
    setReviewNotes("");
  };

  return (
    <div className="doctor-approvals-tab">
      <h2>Doctor Approval Queue</h2>

      {!doctors || doctors.length === 0 ? (
        <div className="empty-state">No pending doctor approvals</div>
      ) : (
        <div className="approvals-list">
          {doctors.map((doctor) => (
            <div key={doctor.id} className="approval-card">
              <div className="approval-header">
                <h3>{doctor.name}</h3>
                <span className="specialty-badge">{doctor.specialty}</span>
              </div>

              <div className="approval-details">
                <p><strong>Qualifications:</strong> {doctor.qualifications}</p>
                <p><strong>Experience:</strong> {doctor.experienceYears} years</p>
                <p><strong>License:</strong> {doctor.licenseNumber || "Not provided"}</p>
                <p><strong>Clinic:</strong> {doctor.clinicAddress}</p>
                <p><strong>Consultation Fee:</strong> ₹{doctor.consultationFee}</p>
              </div>

              {selectedDoctor === doctor.id && (
                <div className="approval-actions">
                  <textarea
                    placeholder="Review notes (optional)"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                  <div className="action-buttons">
                    <button
                      className="approve-btn"
                      onClick={() => handleApprove(doctor.id, "approved")}
                    >
                      Approve
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => handleApprove(doctor.id, "rejected")}
                    >
                      Reject
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={() => setSelectedDoctor(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {selectedDoctor !== doctor.id && (
                <button
                  className="review-btn"
                  onClick={() => setSelectedDoctor(doctor.id)}
                >
                  Review Application
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Prescription Reviews Tab Component
const PrescriptionReviewsTab = ({ prescriptions, onReview, onRefresh }) => {
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const handleReview = async (prescriptionId, status) => {
    await onReview(prescriptionId, status, reviewNotes);
    setSelectedPrescription(null);
    setReviewNotes("");
  };

  return (
    <div className="prescription-reviews-tab">
      <h2>Prescription Review Queue</h2>

      {!prescriptions || prescriptions.length === 0 ? (
        <div className="empty-state">No pending prescription reviews</div>
      ) : (
        <div className="reviews-list">
          {prescriptions.map((prescription) => (
            <div key={prescription.id} className="review-card">
              <div className="review-header">
                <h3>Order #{prescription.orderNumber}</h3>
                <span className={`status-badge ${prescription.riskLevel}`}>
                  {prescription.riskLevel} Risk
                </span>
              </div>

              <div className="review-details">
                <p><strong>Patient:</strong> {prescription.patientName}</p>
                <p><strong>Doctor:</strong> {prescription.doctorName || "Not specified"}</p>
                <p><strong>Medications:</strong></p>
                <ul>
                  {prescription.medications?.map((med, idx) => (
                    <li key={idx}>
                      {med.name} - {med.dosage} ({med.requiresPrescription ? "Rx" : "OTC"})
                    </li>
                  ))}
                </ul>

                {prescription.interactionAlerts && prescription.interactionAlerts.length > 0 && (
                  <div className="alert-box warning">
                    <strong>Interaction Alerts:</strong>
                    <ul>
                      {prescription.interactionAlerts.map((alert, idx) => (
                        <li key={idx}>{alert}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {selectedPrescription === prescription.id && (
                <div className="review-actions">
                  <textarea
                    placeholder="Review notes (required for high-risk orders)"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    required
                  />
                  <div className="action-buttons">
                    <button
                      className="approve-btn"
                      onClick={() => handleReview(prescription.id, "approved")}
                      disabled={!reviewNotes.trim()}
                    >
                      Approve Order
                    </button>
                    <button
                      className="reject-btn"
                      onClick={() => handleReview(prescription.id, "rejected")}
                      disabled={!reviewNotes.trim()}
                    >
                      Reject Order
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={() => setSelectedPrescription(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {selectedPrescription !== prescription.id && (
                <button
                  className="review-btn"
                  onClick={() => setSelectedPrescription(prescription.id)}
                >
                  Review Prescription
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Emergencies Tab Component
const EmergenciesTab = ({ emergencies, onEscalate, onRefresh }) => {
  return (
    <div className="emergencies-tab">
      <h2>Critical Emergency Incidents</h2>

      {!emergencies || emergencies.length === 0 ? (
        <div className="empty-state">No critical emergencies at the moment</div>
      ) : (
        <div className="emergencies-list">
          {emergencies.map((emergency) => (
            <div key={emergency.id} className="emergency-card critical">
              <div className="emergency-header">
                <h3>{emergency.incidentType.toUpperCase()}</h3>
                <span className={`escalation-badge ${emergency.escalationLevel}`}>
                  {emergency.escalationLevel}
                </span>
                <span className="time-badge">
                  {new Date(emergency.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="emergency-details">
                <p><strong>Patient:</strong> {emergency.patientName || emergency.familyMember}</p>
                <p><strong>Message:</strong> {emergency.message}</p>
                <p><strong>Location:</strong> {emergency.location?.address || "Not available"}</p>
                <p><strong>Status:</strong> {emergency.status}</p>
                
                {emergency.ackDueAt && (
                  <p className="ack-time">
                    <strong>Acknowledgment Due:</strong>{" "}
                    {new Date(emergency.ackDueAt).toLocaleTimeString()}
                  </p>
                )}
              </div>

              <div className="emergency-actions">
                <button
                  className="escalate-btn"
                  onClick={() => onEscalate(emergency.id, "acknowledge")}
                  disabled={emergency.status !== "open"}
                >
                  Acknowledge
                </button>
                <button
                  className="resolve-btn"
                  onClick={() => onEscalate(emergency.id, "resolve")}
                  disabled={emergency.status === "resolved"}
                >
                  Mark Resolved
                </button>
                <button className="contact-btn">Contact Patient</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="refresh-emergencies-btn" onClick={onRefresh}>
        Refresh Emergency List
      </button>
    </div>
  );
};

// Analytics Tab Component
const AnalyticsTab = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await healthcareApi.getAnalytics();
      setAnalyticsData(data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  return (
    <div className="analytics-tab">
      <h2>Healthcare Analytics</h2>

      <div className="analytics-section">
        <h3>Appointment Trends</h3>
        <div className="chart-placeholder">
          <p>Appointments over time: {analyticsData?.appointmentTrend || "No data"}</p>
        </div>
      </div>

      <div className="analytics-section">
        <h3>Revenue Analysis</h3>
        <div className="chart-placeholder">
          <p>Total Revenue: ₹{(analyticsData?.totalRevenue || 0).toLocaleString()}</p>
          <p>Average per Appointment: ₹{(analyticsData?.avgRevenue || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="analytics-section">
        <h3>Popular Services</h3>
        <div className="services-list">
          {analyticsData?.popularServices?.map((service, idx) => (
            <div key={idx} className="service-item">
              <span>{service.name}</span>
              <span>{service.count} bookings</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Settings Tab Component
const SettingsTab = () => {
  const [settings, setSettings] = useState({
    emergencyAutoEscalation: true,
    prescriptionReviewRequired: true,
    doctorAutoApproval: false,
    emailNotifications: true,
    smsNotifications: false,
  });

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    try {
      await healthcareApi.updateAdminSettings(settings);
      alert("Settings saved successfully");
    } catch (error) {
      alert("Failed to save settings");
    }
  };

  return (
    <div className="settings-tab">
      <h2>System Settings</h2>

      <div className="settings-section">
        <h3>Emergency Management</h3>
        <label className="setting-item">
          <input
            type="checkbox"
            checked={settings.emergencyAutoEscalation}
            onChange={(e) => handleSettingChange("emergencyAutoEscalation", e.target.checked)}
          />
          <span>Enable automatic emergency escalation</span>
        </label>
      </div>

      <div className="settings-section">
        <h3>Prescription Management</h3>
        <label className="setting-item">
          <input
            type="checkbox"
            checked={settings.prescriptionReviewRequired}
            onChange={(e) => handleSettingChange("prescriptionReviewRequired", e.target.checked)}
          />
          <span>Require admin review for high-risk prescriptions</span>
        </label>
      </div>

      <div className="settings-section">
        <h3>Doctor Management</h3>
        <label className="setting-item">
          <input
            type="checkbox"
            checked={settings.doctorAutoApproval}
            onChange={(e) => handleSettingChange("doctorAutoApproval", e.target.checked)}
          />
          <span>Auto-approve doctors with verified licenses</span>
        </label>
      </div>

      <div className="settings-section">
        <h3>Notifications</h3>
        <label className="setting-item">
          <input
            type="checkbox"
            checked={settings.emailNotifications}
            onChange={(e) => handleSettingChange("emailNotifications", e.target.checked)}
          />
          <span>Send email notifications</span>
        </label>
        <label className="setting-item">
          <input
            type="checkbox"
            checked={settings.smsNotifications}
            onChange={(e) => handleSettingChange("smsNotifications", e.target.checked)}
          />
          <span>Send SMS notifications</span>
        </label>
      </div>

      <button className="save-settings-btn" onClick={saveSettings}>
        Save Settings
      </button>
    </div>
  );
};

export default HealthcareAdminPanel;
