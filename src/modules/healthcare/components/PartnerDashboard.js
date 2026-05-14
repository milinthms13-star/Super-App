import React, { useState } from "react";

const INITIAL_APPLICATION = {
  entityType: "doctor",
  vendorName: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  licenseNumber: "",
  specialtyOrService: "",
  notes: "",
};

const PARTNER_REQUIREMENTS = {
  doctor: ["Medical license", "KYC ID", "Clinic address proof"],
  lab: ["Lab accreditation", "KYC ID", "Equipment checklist"],
  pharmacy: ["Drug license", "KYC ID", "Delivery zone declaration"],
};

const PartnerDashboard = ({
  dashboard,
  applications,
  adminApplications,
  loading,
  isAdmin,
  onCreateApplication,
  onReviewApplication,
}) => {
  const [form, setForm] = useState(INITIAL_APPLICATION);
  const [documents, setDocuments] = useState([]);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const submitApplication = async (event) => {
    event.preventDefault();

    if (!form.vendorName || !form.contactName || !form.phone || !form.email) {
      setFeedbackMessage("Please complete mandatory partner fields.");
      return;
    }

    setSubmitting(true);

    try {
      await onCreateApplication({
        payload: form,
        documents,
      });

      setFeedbackMessage("Partner application submitted for admin review.");
      setForm(INITIAL_APPLICATION);
      setDocuments([]);
    } catch (error) {
      setFeedbackMessage(error?.message || "Unable to submit partner application.");
    } finally {
      setSubmitting(false);
    }
  };

  const stats = dashboard?.stats || {};

  return (
    <section className="healthcare-section">
      <div className="healthcare-section-heading">
        <h2>Partner Dashboard And Admin Approval</h2>
        <p>Doctor, lab, and pharmacy onboarding with approval lifecycle and operational metrics.</p>
      </div>

      {feedbackMessage ? (
        <div className="healthcare-inline-alert" role="status">
          {feedbackMessage}
        </div>
      ) : null}

      <div className="healthcare-elderly-grid">
        <article className="healthcare-care-card">
          <h3>Pending Applications</h3>
          <p>{stats.pendingApplications || 0}</p>
        </article>
        <article className="healthcare-care-card">
          <h3>Approved Applications</h3>
          <p>{stats.approvedApplications || 0}</p>
        </article>
        <article className="healthcare-care-card">
          <h3>Total Appointments (system)</h3>
          <p>{stats.totalAppointments || 0}</p>
        </article>
        <article className="healthcare-care-card">
          <h3>Total Pharmacy Orders</h3>
          <p>{stats.totalPharmacyOrders || 0}</p>
        </article>
      </div>

      <div className="healthcare-records-grid">
        <form className="healthcare-record-card" onSubmit={submitApplication}>
          <h3>Apply As Partner</h3>

          <label className="healthcare-field">
            <span>Entity Type</span>
            <select value={form.entityType} onChange={(event) => updateField("entityType", event.target.value)}>
              <option value="doctor">Doctor</option>
              <option value="lab">Lab</option>
              <option value="pharmacy">Pharmacy</option>
            </select>
          </label>

          <label className="healthcare-field">
            <span>Vendor Name</span>
            <input type="text" value={form.vendorName} onChange={(event) => updateField("vendorName", event.target.value)} required />
          </label>

          <label className="healthcare-field">
            <span>Contact Name</span>
            <input type="text" value={form.contactName} onChange={(event) => updateField("contactName", event.target.value)} required />
          </label>

          <label className="healthcare-field">
            <span>Phone</span>
            <input type="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} required />
          </label>

          <label className="healthcare-field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required />
          </label>

          <label className="healthcare-field">
            <span>License Number</span>
            <input type="text" value={form.licenseNumber} onChange={(event) => updateField("licenseNumber", event.target.value)} />
          </label>

          <label className="healthcare-field healthcare-field-full">
            <span>Address</span>
            <input type="text" value={form.address} onChange={(event) => updateField("address", event.target.value)} />
          </label>

          <label className="healthcare-field healthcare-field-full">
            <span>Specialty / Service</span>
            <input
              type="text"
              value={form.specialtyOrService}
              onChange={(event) => updateField("specialtyOrService", event.target.value)}
            />
          </label>

          <label className="healthcare-field healthcare-field-full">
            <span>Notes</span>
            <input type="text" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
          </label>

          <label className="healthcare-field healthcare-field-full">
            <span>Supporting Documents</span>
            <input
              type="file"
              multiple
              onChange={(event) => setDocuments(Array.from(event.target.files || []))}
            />
          </label>

          <div className="healthcare-disclaimer">
            <strong>Required checklist:</strong> {(PARTNER_REQUIREMENTS[form.entityType] || []).join(", ")}
          </div>

          <button type="submit" className="healthcare-primary-button" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>

        <div className="healthcare-record-list-card">
          <h3>My Applications</h3>
          {loading ? <p>Loading applications...</p> : null}
          {!loading && (applications || []).length === 0 ? <p>No applications yet.</p> : null}

          {(applications || []).map((application) => (
            <article key={application.id} className="healthcare-record-item">
              <div className="healthcare-record-meta">
                <strong>{application.vendorName}</strong>
                <span>
                  {application.entityType} | {application.contactName}
                </span>
                <span>{application.email}</span>
                <span className={application.status === "approved" ? "healthcare-success-text" : "healthcare-warning-text"}>
                  {application.status}
                </span>
                <span>
                  Workflow: submitted -> review -> {application.status === "approved" ? "onboarded" : application.status}
                </span>
                {application.reviewNotes ? <span>Review: {application.reviewNotes}</span> : null}
              </div>
            </article>
          ))}
        </div>
      </div>

      {isAdmin ? (
        <div className="healthcare-record-list-card">
          <h3>Admin Review Queue</h3>
          {(adminApplications || []).length === 0 ? <p>No pending partner applications.</p> : null}

          {(adminApplications || []).map((application) => (
            <article key={application.id} className="healthcare-record-item">
              <div className="healthcare-record-meta">
                <strong>{application.vendorName}</strong>
                <span>
                  {application.entityType} | {application.contactName} | {application.phone}
                </span>
                <span>{application.email}</span>
                <span>Status: {application.status}</span>
              </div>

              <div className="healthcare-record-actions">
                <button
                  type="button"
                  className="healthcare-secondary-button"
                  onClick={() => {
                    const confirmed = window.confirm("Approve this partner application?");
                    if (confirmed) {
                      void onReviewApplication(application.id, "approved");
                    }
                  }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="healthcare-danger-button"
                  onClick={() => {
                    const confirmed = window.confirm("Reject this partner application?");
                    if (confirmed) {
                      void onReviewApplication(application.id, "rejected");
                    }
                  }}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="healthcare-secondary-button"
                  onClick={() => onReviewApplication(application.id, "revision_requested")}
                >
                  Ask Revision
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default PartnerDashboard;
