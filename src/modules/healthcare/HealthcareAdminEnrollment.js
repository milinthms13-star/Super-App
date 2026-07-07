import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HealthcareAdminEnrollment.css";

const HealthcareAdminEnrollment = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Info
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    
    // Professional Info
    role: "healthcare_admin",
    organizationName: "",
    designation: "",
    employeeId: "",
    department: "",
    
    // Verification
    licenseNumber: "",
    idProofType: "passport",
    idProofNumber: "",
    
    // Access Level
    accessLevel: "full",
    permissions: {
      manageDoctors: true,
      manageAppointments: true,
      managePrescriptions: true,
      manageEmergencies: true,
      viewAnalytics: true,
      manageSettings: false,
    },
    
    // Terms
    agreedToTerms: false,
    agreedToPrivacy: false,
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handlePermissionChange = (permission, value) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: value,
      },
    }));
  };

  const validateStep = (stepNumber) => {
    const newErrors = {};

    if (stepNumber === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
      if (!formData.email.trim()) newErrors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Invalid email format";
      }
      if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
      else if (!/^\+?[\d\s-()]+$/.test(formData.phone)) {
        newErrors.phone = "Invalid phone number";
      }
      if (!formData.password) newErrors.password = "Password is required";
      else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    if (stepNumber === 2) {
      if (!formData.organizationName.trim()) {
        newErrors.organizationName = "Organization name is required";
      }
      if (!formData.designation.trim()) {
        newErrors.designation = "Designation is required";
      }
      if (!formData.department.trim()) {
        newErrors.department = "Department is required";
      }
    }

    if (stepNumber === 3) {
      if (!formData.idProofNumber.trim()) {
        newErrors.idProofNumber = "ID proof number is required";
      }
    }

    if (stepNumber === 4) {
      if (!formData.agreedToTerms) {
        newErrors.agreedToTerms = "You must agree to the terms and conditions";
      }
      if (!formData.agreedToPrivacy) {
        newErrors.agreedToPrivacy = "You must agree to the privacy policy";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep(4)) {
      return;
    }

    setSubmitting(true);

    try {
      // Simulate API call
      const response = await fetch("/api/healthcare/admin/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("Admin enrollment submitted successfully! Your application will be reviewed within 24-48 hours.");
        navigate("/healthcare/admin/pending");
      } else {
        const error = await response.json();
        alert(`Enrollment failed: ${error.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Enrollment error:", error);
      alert("An error occurred during enrollment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="healthcare-admin-enrollment">
      <div className="enrollment-container">
        <div className="enrollment-header">
          <h1>Healthcare Administrator Enrollment</h1>
          <p>Join our healthcare management team</p>
        </div>

        <div className="enrollment-progress">
          <div className={`progress-step ${step >= 1 ? "active" : ""} ${step > 1 ? "completed" : ""}`}>
            <div className="step-circle">1</div>
            <span>Personal Info</span>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step >= 2 ? "active" : ""} ${step > 2 ? "completed" : ""}`}>
            <div className="step-circle">2</div>
            <span>Professional Info</span>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step >= 3 ? "active" : ""} ${step > 3 ? "completed" : ""}`}>
            <div className="step-circle">3</div>
            <span>Verification</span>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step >= 4 ? "active" : ""}`}>
            <div className="step-circle">4</div>
            <span>Review</span>
          </div>
        </div>

        <form className="enrollment-form" onSubmit={handleSubmit}>
          {step === 1 && (
            <div className="form-step">
              <h2>Personal Information</h2>

              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  placeholder="Enter your full name"
                />
                {errors.fullName && <span className="error-message">{errors.fullName}</span>}
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="admin@example.com"
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+91 1234567890"
                />
                {errors.phone && <span className="error-message">{errors.phone}</span>}
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="Minimum 8 characters"
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label>Confirm Password *</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  placeholder="Re-enter password"
                />
                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-step">
              <h2>Professional Information</h2>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => handleChange("role", e.target.value)}
                >
                  <option value="healthcare_admin">Healthcare Administrator</option>
                  <option value="operations_manager">Operations Manager</option>
                  <option value="medical_reviewer">Medical Reviewer</option>
                  <option value="emergency_coordinator">Emergency Coordinator</option>
                </select>
              </div>

              <div className="form-group">
                <label>Organization Name *</label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => handleChange("organizationName", e.target.value)}
                  placeholder="Your hospital or organization"
                />
                {errors.organizationName && <span className="error-message">{errors.organizationName}</span>}
              </div>

              <div className="form-group">
                <label>Designation *</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => handleChange("designation", e.target.value)}
                  placeholder="e.g., Healthcare Administrator, Manager"
                />
                {errors.designation && <span className="error-message">{errors.designation}</span>}
              </div>

              <div className="form-group">
                <label>Employee ID</label>
                <input
                  type="text"
                  value={formData.employeeId}
                  onChange={(e) => handleChange("employeeId", e.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="form-group">
                <label>Department *</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => handleChange("department", e.target.value)}
                  placeholder="e.g., Healthcare Operations, Medical Services"
                />
                {errors.department && <span className="error-message">{errors.department}</span>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-step">
              <h2>Verification & Access</h2>

              <div className="form-group">
                <label>Professional License Number (if applicable)</label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => handleChange("licenseNumber", e.target.value)}
                  placeholder="Medical or Healthcare License"
                />
              </div>

              <div className="form-group">
                <label>ID Proof Type *</label>
                <select
                  value={formData.idProofType}
                  onChange={(e) => handleChange("idProofType", e.target.value)}
                >
                  <option value="passport">Passport</option>
                  <option value="driving_license">Driving License</option>
                  <option value="aadhar">Aadhar Card</option>
                  <option value="pan">PAN Card</option>
                </select>
              </div>

              <div className="form-group">
                <label>ID Proof Number *</label>
                <input
                  type="text"
                  value={formData.idProofNumber}
                  onChange={(e) => handleChange("idProofNumber", e.target.value)}
                  placeholder="Enter your ID number"
                />
                {errors.idProofNumber && <span className="error-message">{errors.idProofNumber}</span>}
              </div>

              <div className="form-group">
                <label>Access Level</label>
                <select
                  value={formData.accessLevel}
                  onChange={(e) => handleChange("accessLevel", e.target.value)}
                >
                  <option value="full">Full Access</option>
                  <option value="limited">Limited Access</option>
                  <option value="view_only">View Only</option>
                </select>
              </div>

              <div className="form-group">
                <label>Permissions</label>
                <div className="permissions-grid">
                  <label className="permission-item">
                    <input
                      type="checkbox"
                      checked={formData.permissions.manageDoctors}
                      onChange={(e) => handlePermissionChange("manageDoctors", e.target.checked)}
                    />
                    <span>Manage Doctors</span>
                  </label>
                  <label className="permission-item">
                    <input
                      type="checkbox"
                      checked={formData.permissions.manageAppointments}
                      onChange={(e) => handlePermissionChange("manageAppointments", e.target.checked)}
                    />
                    <span>Manage Appointments</span>
                  </label>
                  <label className="permission-item">
                    <input
                      type="checkbox"
                      checked={formData.permissions.managePrescriptions}
                      onChange={(e) => handlePermissionChange("managePrescriptions", e.target.checked)}
                    />
                    <span>Manage Prescriptions</span>
                  </label>
                  <label className="permission-item">
                    <input
                      type="checkbox"
                      checked={formData.permissions.manageEmergencies}
                      onChange={(e) => handlePermissionChange("manageEmergencies", e.target.checked)}
                    />
                    <span>Manage Emergencies</span>
                  </label>
                  <label className="permission-item">
                    <input
                      type="checkbox"
                      checked={formData.permissions.viewAnalytics}
                      onChange={(e) => handlePermissionChange("viewAnalytics", e.target.checked)}
                    />
                    <span>View Analytics</span>
                  </label>
                  <label className="permission-item">
                    <input
                      type="checkbox"
                      checked={formData.permissions.manageSettings}
                      onChange={(e) => handlePermissionChange("manageSettings", e.target.checked)}
                    />
                    <span>Manage Settings</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="form-step">
              <h2>Review & Submit</h2>

              <div className="review-section">
                <h3>Personal Information</h3>
                <p><strong>Name:</strong> {formData.fullName}</p>
                <p><strong>Email:</strong> {formData.email}</p>
                <p><strong>Phone:</strong> {formData.phone}</p>
              </div>

              <div className="review-section">
                <h3>Professional Information</h3>
                <p><strong>Role:</strong> {formData.role}</p>
                <p><strong>Organization:</strong> {formData.organizationName}</p>
                <p><strong>Designation:</strong> {formData.designation}</p>
                <p><strong>Department:</strong> {formData.department}</p>
              </div>

              <div className="review-section">
                <h3>Verification</h3>
                <p><strong>ID Proof:</strong> {formData.idProofType} - {formData.idProofNumber}</p>
                <p><strong>Access Level:</strong> {formData.accessLevel}</p>
              </div>

              <div className="terms-section">
                <label className="terms-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.agreedToTerms}
                    onChange={(e) => handleChange("agreedToTerms", e.target.checked)}
                  />
                  <span>
                    I agree to the <a href="/terms" target="_blank">Terms and Conditions</a>
                  </span>
                </label>
                {errors.agreedToTerms && <span className="error-message">{errors.agreedToTerms}</span>}

                <label className="terms-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.agreedToPrivacy}
                    onChange={(e) => handleChange("agreedToPrivacy", e.target.checked)}
                  />
                  <span>
                    I agree to the <a href="/privacy" target="_blank">Privacy Policy</a>
                  </span>
                </label>
                {errors.agreedToPrivacy && <span className="error-message">{errors.agreedToPrivacy}</span>}
              </div>

              <div className="info-box">
                <p>
                  <strong>Note:</strong> Your application will be reviewed by our admin team within 24-48 hours.
                  You will receive an email notification once your account is approved.
                </p>
              </div>
            </div>
          )}

          <div className="form-navigation">
            {step > 1 && (
              <button type="button" className="btn-secondary" onClick={prevStep}>
                Previous
              </button>
            )}
            
            {step < 4 && (
              <button type="button" className="btn-primary" onClick={nextStep}>
                Next
              </button>
            )}
            
            {step === 4 && (
              <button type="submit" className="btn-submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default HealthcareAdminEnrollment;
