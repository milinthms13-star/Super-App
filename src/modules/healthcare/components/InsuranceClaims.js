import React, { useEffect, useState } from "react";
import { healthcareApi } from "../services/healthcareApi";
import "./InsuranceClaims.css";

const InsuranceClaims = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    insuranceProvider: "",
    policyNumber: "",
    policyHolderName: "",
    patientName: "",
    patientRelation: "Self",
    claimType: "hospitalization",
    claimAmount: "",
    treatmentDate: "",
    hospitalName: "",
    doctorName: "",
    diagnosis: "",
  });
  const [documents, setDocuments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const data = await healthcareApi.getInsuranceClaims();
      setClaims(data);
    } catch (error) {
      console.error("Failed to load claims:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setDocuments(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await healthcareApi.submitInsuranceClaim({
        ...formData,
        documents,
      });

      alert("Claim submitted successfully!");
      setShowForm(false);
      resetForm();
      await loadClaims();
    } catch (error) {
      alert("Failed to submit claim: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      insuranceProvider: "",
      policyNumber: "",
      policyHolderName: "",
      patientName: "",
      patientRelation: "Self",
      claimType: "hospitalization",
      claimAmount: "",
      treatmentDate: "",
      hospitalName: "",
      doctorName: "",
      diagnosis: "",
    });
    setDocuments([]);
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: "gray",
      submitted: "blue",
      under_review: "orange",
      approved: "green",
      rejected: "red",
      settled: "green",
      appealed: "purple",
    };
    return colors[status] || "gray";
  };

  if (loading) {
    return <div className="insurance-claims">Loading claims...</div>;
  }

  return (
    <div className="insurance-claims" data-testid="insurance-claims">
      <div className="claims-header">
        <h2>Insurance Claims</h2>
        <button className="new-claim-btn" onClick={() => setShowForm(true)}>
          + New Claim
        </button>
      </div>

      {showForm && (
        <div className="claim-form-modal">
          <div className="modal-content">
            <h3>Submit Insurance Claim</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Insurance Provider *</label>
                  <input
                    type="text"
                    value={formData.insuranceProvider}
                    onChange={(e) => handleChange("insuranceProvider", e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Policy Number *</label>
                  <input
                    type="text"
                    value={formData.policyNumber}
                    onChange={(e) => handleChange("policyNumber", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Policy Holder Name *</label>
                <input
                  type="text"
                  value={formData.policyHolderName}
                  onChange={(e) => handleChange("policyHolderName", e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Patient Name *</label>
                  <input
                    type="text"
                    value={formData.patientName}
                    onChange={(e) => handleChange("patientName", e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Relation *</label>
                  <select
                    value={formData.patientRelation}
                    onChange={(e) => handleChange("patientRelation", e.target.value)}
                  >
                    <option value="Self">Self</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Parent">Parent</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Claim Type *</label>
                  <select
                    value={formData.claimType}
                    onChange={(e) => handleChange("claimType", e.target.value)}
                  >
                    <option value="hospitalization">Hospitalization</option>
                    <option value="consultation">Consultation</option>
                    <option value="lab_test">Lab Test</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="surgery">Surgery</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Claim Amount (₹) *</label>
                  <input
                    type="number"
                    value={formData.claimAmount}
                    onChange={(e) => handleChange("claimAmount", e.target.value)}
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Treatment Date *</label>
                <input
                  type="date"
                  value={formData.treatmentDate}
                  onChange={(e) => handleChange("treatmentDate", e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Hospital Name</label>
                <input
                  type="text"
                  value={formData.hospitalName}
                  onChange={(e) => handleChange("hospitalName", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Doctor Name</label>
                <input
                  type="text"
                  value={formData.doctorName}
                  onChange={(e) => handleChange("doctorName", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Diagnosis *</label>
                <textarea
                  value={formData.diagnosis}
                  onChange={(e) => handleChange("diagnosis", e.target.value)}
                  rows="3"
                  required
                />
              </div>

              <div className="form-group">
                <label>Upload Documents *</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  required
                />
                <small>Upload bills, prescriptions, reports (PDF, JPG, PNG)</small>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Claim"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="claims-list">
        {claims.length === 0 ? (
          <div className="empty-state">
            <p>No insurance claims yet</p>
            <button onClick={() => setShowForm(true)}>Submit Your First Claim</button>
          </div>
        ) : (
          claims.map((claim) => (
            <div key={claim.id} className="claim-card">
              <div className="claim-header">
                <div>
                  <h3>{claim.claimNumber}</h3>
                  <p className="claim-provider">{claim.insuranceProvider}</p>
                </div>
                <span
                  className="claim-status"
                  style={{ backgroundColor: getStatusColor(claim.status) }}
                >
                  {claim.status.replace("_", " ").toUpperCase()}
                </span>
              </div>

              <div className="claim-details">
                <div className="detail-row">
                  <span>Patient:</span>
                  <strong>{claim.patientName}</strong>
                </div>
                <div className="detail-row">
                  <span>Claim Type:</span>
                  <strong>{claim.claimType.replace("_", " ")}</strong>
                </div>
                <div className="detail-row">
                  <span>Claim Amount:</span>
                  <strong>₹{claim.claimAmount.toLocaleString()}</strong>
                </div>
                {claim.approvedAmount > 0 && (
                  <div className="detail-row">
                    <span>Approved Amount:</span>
                    <strong className="approved-amount">
                      ₹{claim.approvedAmount.toLocaleString()}
                    </strong>
                  </div>
                )}
                <div className="detail-row">
                  <span>Treatment Date:</span>
                  <strong>{new Date(claim.treatmentDate).toLocaleDateString()}</strong>
                </div>
                <div className="detail-row">
                  <span>Submitted:</span>
                  <strong>
                    {claim.submittedAt
                      ? new Date(claim.submittedAt).toLocaleDateString()
                      : "Not submitted"}
                  </strong>
                </div>
              </div>

              {claim.rejectionReason && (
                <div className="rejection-notice">
                  <strong>Rejection Reason:</strong> {claim.rejectionReason}
                </div>
              )}

              <div className="claim-actions">
                <button>View Details</button>
                {claim.status === "rejected" && (
                  <button className="appeal-btn">Appeal</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InsuranceClaims;
