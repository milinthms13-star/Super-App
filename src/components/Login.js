import React, { useMemo, useState } from "react";
import axios from "axios";
import { getTranslation } from "../data/translations";
import useVoice from "../hooks/useVoice";
import "../styles/Login.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const ADMIN_EMAIL = "mgdhanyamohan@gmail.com";
const IDENTITY_OPTIONS = [
  { value: "pan", label: "PAN Card" },
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "passport", label: "Passport" },
  { value: "driving-licence", label: "Driving Licence" },
  { value: "voter-id", label: "Voter ID" },
  { value: "other", label: "Other Identity Proof" },
];

const Login = ({
  language = "en",
  registrationType = "user",
  businessCategories = [],
  registeredAccounts = [],
  onBackToLaunch,
  onLoginSuccess,
  onRegistrationSubmit,
}) => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loginRole, setLoginRole] = useState("user");
  const {
    recognitionSupported,
    speechSupported,
    listeningKey,
    speaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  } = useVoice(language);
  const [registrationForm, setRegistrationForm] = useState({
    fullName: "",
    phone: "",
    location: "",
    accountType: "business",
    businessName: "",
    selectedBusinessCategories: [],
    licenseNumber: "",
    identityType: "pan",
    identityNumber: "",
    foodLicenseNumber: "",
    foodLicenseAuthority: "",
    profilePhotoName: "",
    profilePhotoFile: null,
    licenseDocumentName: "",
    licenseDocumentFile: null,
    identityDocumentName: "",
    identityDocumentFile: null,
    foodLicenseDocumentName: "",
    foodLicenseDocumentFile: null,
    registrationFeeAccepted: false,
    agreeToTerms: false,
  });
  const normalizedEmail = email.trim().toLowerCase();
  const isAdminEmail = normalizedEmail === ADMIN_EMAIL;
  const isAdminFlow = registrationType === "admin" || (registrationType === "entrepreneur" && isAdminEmail);
  const isUserRegistrationFlow = registrationType === "user";
  const isEntrepreneurRegistrationFlow = registrationType === "entrepreneur" && !isAdminFlow;
  const isBusinessRegistrationFlow = isEntrepreneurRegistrationFlow;
  const isLoginFlow = registrationType === "login";
  const registeredAccount = registeredAccounts.find((account) => account.email === normalizedEmail);
  const businessCategoryCount = businessCategories.length;

  const selectedCategoryRecords = useMemo(
    () => businessCategories.filter((category) => registrationForm.selectedBusinessCategories.includes(category.id)),
    [businessCategories, registrationForm.selectedBusinessCategories]
  );

  const totalRegistrationFee = selectedCategoryRecords.reduce(
    (total, category) => total + Number(category.fee || 0),
    0
  );

  const requiresFoodLicense = selectedCategoryRecords.some((category) => category.requiresFoodLicense);

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validatePhone = (value) => /^\+?[0-9]{10,15}$/.test(value.replace(/\s+/g, ""));

  const updateRegistrationForm = (field, value) => {
    setRegistrationForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const updateEmail = (value) => {
    setEmail(value);
    clearMessages();
  };

  const updateLoginRole = (role) => {
    setLoginRole(role);
    clearMessages();
  };

  const updateOtp = (value) => {
    setOtp(value);
    clearMessages();
  };

  const handleRegistrationFileChange = (nameField, fileField, file) => {
    setRegistrationForm((currentForm) => ({
      ...currentForm,
      [nameField]: file?.name || "",
      [fileField]: file || null,
    }));
  };

  const toggleBusinessCategory = (categoryId) => {
    setRegistrationForm((currentForm) => {
      const alreadySelected = currentForm.selectedBusinessCategories.includes(categoryId);
      const selectedBusinessCategories = alreadySelected
        ? currentForm.selectedBusinessCategories.filter((item) => item !== categoryId)
        : [...currentForm.selectedBusinessCategories, categoryId];

      return {
        ...currentForm,
        selectedBusinessCategories,
        registrationFeeAccepted: false,
      };
    });
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setDevOtp("");

    if (isUserRegistrationFlow) {
      if (!registrationForm.fullName.trim()) {
        setError("Please enter your full name");
        return;
      }

      if (!registrationForm.phone.trim()) {
        setError("Please enter your phone number");
        return;
      }

      if (!validatePhone(registrationForm.phone)) {
        setError("Please enter a valid phone number");
        return;
      }

      if (!registrationForm.agreeToTerms) {
        setError("Please accept the terms to continue");
        return;
      }
    }

    if (isEntrepreneurRegistrationFlow) {
      if (!registrationForm.fullName.trim()) {
        setError("Please enter your full name");
        return;
      }

      if (!registrationForm.phone.trim()) {
        setError("Please enter your phone number");
        return;
      }

      if (!validatePhone(registrationForm.phone)) {
        setError("Please enter a valid phone number");
        return;
      }

      if (!registrationForm.location.trim()) {
        setError("Please enter your city or location");
        return;
      }

      if (!registrationForm.businessName.trim()) {
        setError("Please enter your business name");
        return;
      }

      if (registrationForm.selectedBusinessCategories.length === 0) {
        setError("Please choose at least one business category");
        return;
      }

      if (!registrationForm.licenseNumber.trim()) {
        setError("Please enter your licence number");
        return;
      }

      if (!registrationForm.profilePhotoName) {
        setError("Please upload your photo");
        return;
      }

      if (!registrationForm.licenseDocumentName) {
        setError("Please upload your licence document");
        return;
      }

      if (!registrationForm.identityNumber.trim()) {
        setError("Please enter your identity number");
        return;
      }

      if (!registrationForm.identityDocumentName) {
        setError("Please upload your identity document");
        return;
      }

      if (requiresFoodLicense) {
        if (!registrationForm.foodLicenseNumber.trim()) {
          setError("Please enter your food licence number");
          return;
        }

        if (!registrationForm.foodLicenseAuthority.trim()) {
          setError("Please enter the food licence authority");
          return;
        }

        if (!registrationForm.foodLicenseDocumentName) {
          setError("Please upload your food licence document");
          return;
        }
      }

      if (!registrationForm.registrationFeeAccepted) {
        setError("Please confirm the registration fee to continue");
        return;
      }

      if (!registrationForm.agreeToTerms) {
        setError("Please accept the terms to continue");
        return;
      }
    }

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (isAdminFlow && !isAdminEmail) {
      setError(`Use ${ADMIN_EMAIL} to access the admin dashboard`);
      return;
    }

    if (isLoginFlow) {
      const isAdminEntrepreneurLogin = isAdminEmail && loginRole === "entrepreneur";
      if (!isAdminEntrepreneurLogin && (!registeredAccount || !registeredAccount.roles.includes(loginRole))) {
        setError(`This email is not registered as a ${loginRole}.`);
        return;
      }
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/send-otp`, { email });

      if (response.data.success) {
        setOtpSent(true);
        setSuccess(response.data.message || "OTP sent to your email");
        setDevOtp(response.data.devOtp || "");
      } else {
        setError(response.data.message || "Failed to send OTP");
      }
    } catch (err) {
      if (!err.response) {
        setError("Backend is not running. Please start the API server and try again.");
      } else {
        setError(err.response.data?.message || "Unable to send OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!otp) {
      setError("Please enter the OTP");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-otp`, {
        email,
        otp,
      });

      if (response.data.success && response.data.token && response.data.user) {
        let mergedUser = response.data.user;

        if (isEntrepreneurRegistrationFlow) {
          mergedUser = {
            ...response.data.user,
            name: registrationForm.fullName.trim() || response.data.user.name,
            phone: registrationForm.phone.trim(),
            location: registrationForm.location.trim(),
            accountType: registrationForm.accountType,
            businessName: registrationForm.businessName.trim(),
            selectedBusinessCategories: registrationForm.selectedBusinessCategories,
            selectedCategoryDetails: selectedCategoryRecords,
            licenseNumber: registrationForm.licenseNumber.trim(),
            identityType: registrationForm.identityType,
            identityNumber: registrationForm.identityNumber.trim(),
            foodLicenseNumber: registrationForm.foodLicenseNumber.trim(),
            foodLicenseAuthority: registrationForm.foodLicenseAuthority.trim(),
            profilePhotoName: registrationForm.profilePhotoName,
            licenseDocumentName: registrationForm.licenseDocumentName,
            identityDocumentName: registrationForm.identityDocumentName,
            foodLicenseDocumentName: registrationForm.foodLicenseDocumentName,
            registrationFee: totalRegistrationFee,
            role: "business",
            registrationType,
          };

          if (onRegistrationSubmit) {
            await onRegistrationSubmit({
              applicantName: registrationForm.fullName.trim(),
              businessName: registrationForm.businessName.trim(),
              email,
              registrationType,
              phone: registrationForm.phone.trim(),
              location: registrationForm.location.trim(),
              selectedBusinessCategories: selectedCategoryRecords,
              registrationFee: totalRegistrationFee,
              licenseNumber: registrationForm.licenseNumber.trim(),
              identityType: registrationForm.identityType,
              identityNumber: registrationForm.identityNumber.trim(),
              profilePhotoName: registrationForm.profilePhotoName,
              licenseDocumentName: registrationForm.licenseDocumentName,
              identityDocumentName: registrationForm.identityDocumentName,
              foodLicenseNumber: registrationForm.foodLicenseNumber.trim(),
              foodLicenseAuthority: registrationForm.foodLicenseAuthority.trim(),
              foodLicenseDocumentName: registrationForm.foodLicenseDocumentName,
              foodLicenseRequired: requiresFoodLicense,
              status: "Pending Review",
              files: {
                profilePhoto: registrationForm.profilePhotoFile,
                licenseDocument: registrationForm.licenseDocumentFile,
                identityDocument: registrationForm.identityDocumentFile,
                foodLicenseDocument: registrationForm.foodLicenseDocumentFile,
              },
            });
          }
        } else if (isUserRegistrationFlow) {
          mergedUser = {
            ...response.data.user,
            name: registrationForm.fullName.trim() || response.data.user.name,
            phone: registrationForm.phone.trim(),
            role: "user",
            registrationType: "user",
          };

          if (onRegistrationSubmit) {
            await onRegistrationSubmit({
              applicantName: registrationForm.fullName.trim(),
              email,
              phone: registrationForm.phone.trim(),
              registrationType: "user",
            });
          }
        } else if (isAdminFlow || (isLoginFlow && isAdminEmail && loginRole === "entrepreneur")) {
          mergedUser = {
            ...response.data.user,
            name: "MalabarBazaar Admin",
            email: ADMIN_EMAIL,
            avatar: "A",
            role: "admin",
            registrationType: "admin",
          };
        } else if (isLoginFlow) {
          mergedUser = {
            ...response.data.user,
            name: registeredAccount?.name || response.data.user.name,
            role: loginRole === "entrepreneur" ? "business" : "user",
            registrationType: loginRole,
          };
        }

        onLoginSuccess(
          mergedUser,
          response.data.token,
          mergedUser.registrationType === "admin" ? "admin" : isLoginFlow ? loginRole : mergedUser.registrationType
        );
      } else {
        setError(response.data.message || "Failed to verify OTP");
      }
    } catch (err) {
      if (!err.response) {
        setError("Backend is not running. Please start the API server and try again.");
      } else {
        setError(err.response.data?.message || "Unable to verify OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const resetOtpFlow = () => {
    setOtpSent(false);
    setOtp("");
    setError("");
    setSuccess("");
    setDevOtp("");
  };

  const { login: loginCopy, direction } = getTranslation(language);
  const registrationLabel = registrationType === "entrepreneur"
    ? isAdminFlow ? "Admin" : loginCopy.entrepreneur
    : registrationType === "admin"
      ? "Admin"
      : registrationType === "login"
        ? loginCopy.login
        : loginCopy.user;
  const loginSubtitle = registrationType === "entrepreneur"
    ? isAdminFlow
      ? "Verify the admin email to manage category fees and registrations"
      : `Choose from the ${businessCategoryCount} available business categories and verify your email to continue.`
    : registrationType === "admin"
      ? "Verify the admin email to manage category fees and registrations"
    : registrationType === "login"
        ? "Choose whether you want to log in as a user or entrepreneur."
        : loginCopy.userSubtitle;
  const headerKicker = registrationType === "login"
    ? loginCopy.welcomeBack
    : `${loginCopy.registerAs} ${registrationLabel}`;
  const formTitle = isBusinessRegistrationFlow
    ? "Create your business account"
    : isUserRegistrationFlow
      ? "Create your user account"
    : isAdminFlow
      ? "Admin access"
      : "Verify your email";
  const formDescription = isBusinessRegistrationFlow
    ? `Choose one or more of the ${businessCategoryCount} available business categories, upload your documents, and verify your email to create your account.`
    : isUserRegistrationFlow
      ? "Enter your name, verify your email, and create your user account."
    : isAdminFlow
      ? `Use ${ADMIN_EMAIL} to sign in and manage admin-controlled category fees.`
      : isLoginFlow
        ? "Only roles you have already registered for can be used during login."
        : "Enter your email and confirm the one-time password to continue.";

  const handleVoiceFill = (fieldKey, updateValue) => {
    if (listeningKey === fieldKey) {
      stopListening();
      return;
    }

    startListening(fieldKey, updateValue);
  };

  const renderFieldVoiceActions = (fieldKey, speakText, onVoiceResult) => (
    <span className="field-actions">
      {recognitionSupported && (
        <button
          type="button"
          className={`voice-btn ${listeningKey === fieldKey ? "active" : ""}`}
          onClick={() => handleVoiceFill(fieldKey, onVoiceResult)}
          aria-label={listeningKey === fieldKey ? "Stop voice input" : "Start voice input"}
          title={listeningKey === fieldKey ? "Stop voice input" : "Start voice input"}
        >
          {listeningKey === fieldKey ? "Stop Mic" : "Mic"}
        </button>
      )}
      {speechSupported && (
        <button
          type="button"
          className={`voice-btn ${speaking ? "active" : ""}`}
          onClick={() => (speaking ? stopSpeaking() : speak(speakText))}
          aria-label={speaking ? "Stop voice playback" : "Read aloud"}
          title={speaking ? "Stop voice playback" : "Read aloud"}
        >
          {speaking ? "Stop Audio" : "Speak"}
        </button>
      )}
    </span>
  );

  return (
    <div className="login-container" dir={direction}>
      <div className="login-card">
        {!otpSent && onBackToLaunch && (
          <div className="login-topbar">
            <button
              type="button"
              className="btn btn-outline login-home-btn"
              onClick={onBackToLaunch}
              disabled={loading}
            >
              Home
            </button>
          </div>
        )}

        <div className="login-header">
          <img src="/logo.png" alt="MalabarBazaar" className="login-logo" />
          <p className="login-kicker">{headerKicker}</p>
          <h1>MalabarBazaar</h1>
          <p className="login-subtitle">{loginSubtitle}</p>
        </div>

        <form className="login-form" onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
          <div className="form-intro">
            <div className="intro-heading-row">
              <h2>{formTitle}</h2>
              {(recognitionSupported || speechSupported) && renderFieldVoiceActions(
                "form-intro",
                `${formTitle}. ${formDescription}`,
                () => {}
              )}
            </div>
            <p>{formDescription}</p>
          </div>

          {isLoginFlow && !otpSent && (
            <fieldset className="form-group category-group">
              <legend>Login As</legend>
              <div className="category-options">
                <label className="category-option" htmlFor="login-role-user">
                  <input
                    id="login-role-user"
                    type="radio"
                    name="loginRole"
                    checked={loginRole === "user"}
                    onChange={() => updateLoginRole("user")}
                  />
                  <span>User</span>
                </label>
                <label className="category-option" htmlFor="login-role-entrepreneur">
                  <input
                    id="login-role-entrepreneur"
                    type="radio"
                    name="loginRole"
                    checked={loginRole === "entrepreneur"}
                    onChange={() => updateLoginRole("entrepreneur")}
                  />
                  <span>Entrepreneur</span>
                </label>
              </div>
            </fieldset>
          )}

          {isUserRegistrationFlow && !otpSent && (
            <>
              <div className="form-group">
                <label htmlFor="fullName">
                  <span>Full Name</span>
                  {renderFieldVoiceActions("fullName", registrationForm.fullName || "Full Name", (value) => updateRegistrationForm("fullName", value))}
                </label>
                <input
                  type="text"
                  id="fullName"
                  placeholder="Enter your full name"
                  value={registrationForm.fullName}
                  onChange={(event) => updateRegistrationForm("fullName", event.target.value)}
                  className="form-input"
                  autoComplete="name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">
                  <span>Phone Number</span>
                  {renderFieldVoiceActions("phone", registrationForm.phone || "Phone Number", (value) => updateRegistrationForm("phone", value.replace(/[^\d+\s-]/g, "")))}
                </label>
                <input
                  type="tel"
                  id="phone"
                  placeholder="Enter your phone number"
                  value={registrationForm.phone}
                  onChange={(event) => updateRegistrationForm("phone", event.target.value)}
                  className="form-input"
                  autoComplete="tel"
                />
              </div>
            </>
          )}

          {isEntrepreneurRegistrationFlow && !otpSent && (
            <>
              <div className="form-group">
                <label htmlFor="fullName">
                  <span>Full Name</span>
                  {renderFieldVoiceActions("business-fullName", registrationForm.fullName || "Full Name", (value) => updateRegistrationForm("fullName", value))}
                </label>
                <input
                  type="text"
                  id="fullName"
                  placeholder="Enter your full name"
                  value={registrationForm.fullName}
                  onChange={(event) => updateRegistrationForm("fullName", event.target.value)}
                  className="form-input"
                  autoComplete="name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="accountType">Account Type</label>
                <select
                  id="accountType"
                  value={registrationForm.accountType}
                  onChange={(event) => updateRegistrationForm("accountType", event.target.value)}
                  className="form-input"
                >
                  <option value="business">Business Account</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="businessName">
                  <span>Business Name</span>
                  {renderFieldVoiceActions("businessName", registrationForm.businessName || "Business Name", (value) => updateRegistrationForm("businessName", value))}
                </label>
                <input
                  type="text"
                  id="businessName"
                  placeholder="Enter your business name"
                  value={registrationForm.businessName}
                  onChange={(event) => updateRegistrationForm("businessName", event.target.value)}
                  className="form-input"
                  autoComplete="organization"
                />
              </div>

              <fieldset className="form-group category-group">
                <legend>Business Categories</legend>
                <div className="category-options">
                  {businessCategories.map((category) => (
                    <label className="category-option" key={category.id} htmlFor={`category-${category.id}`}>
                      <input
                        id={`category-${category.id}`}
                        type="checkbox"
                        checked={registrationForm.selectedBusinessCategories.includes(category.id)}
                        onChange={() => toggleBusinessCategory(category.id)}
                      />
                      <span>{category.name}</span>
                      <strong>INR {category.fee}</strong>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="form-group">
                <label htmlFor="phone">
                  <span>Phone Number</span>
                  {renderFieldVoiceActions("business-phone", registrationForm.phone || "Phone Number", (value) => updateRegistrationForm("phone", value.replace(/[^\d+\s-]/g, "")))}
                </label>
                <input
                  type="tel"
                  id="phone"
                  placeholder="Enter your phone number"
                  value={registrationForm.phone}
                  onChange={(event) => updateRegistrationForm("phone", event.target.value)}
                  className="form-input"
                  autoComplete="tel"
                />
              </div>

              <div className="form-group">
                <label htmlFor="location">
                  <span>City or Location</span>
                  {renderFieldVoiceActions("location", registrationForm.location || "City or Location", (value) => updateRegistrationForm("location", value))}
                </label>
                <input
                  type="text"
                  id="location"
                  placeholder="Enter your city or location"
                  value={registrationForm.location}
                  onChange={(event) => updateRegistrationForm("location", event.target.value)}
                  className="form-input"
                  autoComplete="address-level2"
                />
              </div>

              <div className="form-group">
                <label htmlFor="licenseNumber">
                  <span>Licence Number</span>
                  {renderFieldVoiceActions("licenseNumber", registrationForm.licenseNumber || "Licence Number", (value) => updateRegistrationForm("licenseNumber", value))}
                </label>
                <input
                  type="text"
                  id="licenseNumber"
                  placeholder="Enter your licence number"
                  value={registrationForm.licenseNumber}
                  onChange={(event) => updateRegistrationForm("licenseNumber", event.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="profilePhoto">Photo of the User</label>
                <input
                  type="file"
                  id="profilePhoto"
                  accept="image/*"
                  capture="user"
                  className="form-input file-input"
                  onChange={(event) =>
                    handleRegistrationFileChange(
                      "profilePhotoName",
                      "profilePhotoFile",
                      event.target.files?.[0] || null
                    )
                  }
                />
                <span className="helper-text">
                  On mobile, this opens your camera or photo library.
                </span>
                {registrationForm.profilePhotoName && (
                  <span className="file-name">{registrationForm.profilePhotoName}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="licenseDocument">Licence Document Upload</label>
                <input
                  type="file"
                  id="licenseDocument"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="form-input file-input"
                  onChange={(event) =>
                    handleRegistrationFileChange(
                      "licenseDocumentName",
                      "licenseDocumentFile",
                      event.target.files?.[0] || null
                    )
                  }
                />
                {registrationForm.licenseDocumentName && (
                  <span className="file-name">{registrationForm.licenseDocumentName}</span>
                )}
              </div>

              <div className="supporting-panel">
                <h3>Registration Fee</h3>
                <div className="fee-summary" aria-label="Business registration fee">
                  <span>Total for selected categories</span>
                  <strong>INR {totalRegistrationFee}</strong>
                </div>
                <p className="helper-text">
                  Fees are set by the admin for each category. You can register for multiple business categories at once.
                </p>
                <label className="checkbox-row" htmlFor="registrationFeeAccepted">
                  <input
                    type="checkbox"
                    id="registrationFeeAccepted"
                    checked={registrationForm.registrationFeeAccepted}
                    onChange={(event) => updateRegistrationForm("registrationFeeAccepted", event.target.checked)}
                  />
                  <span>I understand that the total registration fee is INR {totalRegistrationFee}.</span>
                </label>
              </div>

              <div className="supporting-panel">
                <h3>Identity Details</h3>
                <div className="form-group">
                  <label htmlFor="identityType">Identity Proof Type</label>
                  <select
                    id="identityType"
                    value={registrationForm.identityType}
                    onChange={(event) => updateRegistrationForm("identityType", event.target.value)}
                    className="form-input"
                  >
                    {IDENTITY_OPTIONS.map((identity) => (
                      <option key={identity.value} value={identity.value}>
                        {identity.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="identityNumber">
                    <span>Identity Number</span>
                    {renderFieldVoiceActions("identityNumber", registrationForm.identityNumber || "Identity Number", (value) => updateRegistrationForm("identityNumber", value))}
                  </label>
                  <input
                    type="text"
                    id="identityNumber"
                    placeholder="Enter your PAN or other identity number"
                    value={registrationForm.identityNumber}
                    onChange={(event) => updateRegistrationForm("identityNumber", event.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="identityDocument">Identity Document Upload</label>
                  <input
                    type="file"
                    id="identityDocument"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="form-input file-input"
                    onChange={(event) =>
                      handleRegistrationFileChange(
                        "identityDocumentName",
                        "identityDocumentFile",
                        event.target.files?.[0] || null
                      )
                    }
                  />
                  {registrationForm.identityDocumentName && (
                    <span className="file-name">{registrationForm.identityDocumentName}</span>
                  )}
                </div>
              </div>

              {requiresFoodLicense && (
                <div className="supporting-panel">
                  <h3>Food Licence Details</h3>
                  <div className="form-group">
                    <label htmlFor="foodLicenseNumber">
                      <span>Food Licence Number</span>
                      {renderFieldVoiceActions("foodLicenseNumber", registrationForm.foodLicenseNumber || "Food Licence Number", (value) => updateRegistrationForm("foodLicenseNumber", value))}
                    </label>
                    <input
                      type="text"
                      id="foodLicenseNumber"
                      placeholder="Enter your food licence number"
                      value={registrationForm.foodLicenseNumber}
                      onChange={(event) => updateRegistrationForm("foodLicenseNumber", event.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="foodLicenseAuthority">
                      <span>Food Licence Authority</span>
                      {renderFieldVoiceActions("foodLicenseAuthority", registrationForm.foodLicenseAuthority || "Food Licence Authority", (value) => updateRegistrationForm("foodLicenseAuthority", value))}
                    </label>
                    <input
                      type="text"
                      id="foodLicenseAuthority"
                      placeholder="Enter the issuing authority"
                      value={registrationForm.foodLicenseAuthority}
                      onChange={(event) => updateRegistrationForm("foodLicenseAuthority", event.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="foodLicenseDocument">Food Licence Document Upload</label>
                    <input
                      type="file"
                      id="foodLicenseDocument"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="form-input file-input"
                      onChange={(event) =>
                        handleRegistrationFileChange(
                          "foodLicenseDocumentName",
                          "foodLicenseDocumentFile",
                          event.target.files?.[0] || null
                        )
                      }
                    />
                    {registrationForm.foodLicenseDocumentName && (
                      <span className="file-name">{registrationForm.foodLicenseDocumentName}</span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">
              <span>Email Address</span>
              {renderFieldVoiceActions("email", email || "Email Address", (value) => updateEmail(value.toLowerCase().replace(/\s+/g, "")))}
            </label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => updateEmail(event.target.value)}
              disabled={otpSent || loading}
              className="form-input"
              autoComplete="email"
            />
          </div>

          {(registrationType === "entrepreneur" || isAdminFlow) && !otpSent && (
            <p className="helper-text admin-helper">
              The {businessCategoryCount} available business categories are used for registration here. Admin access is included with <strong>{ADMIN_EMAIL}</strong>.
            </p>
          )}

          {isLoginFlow && !otpSent && registeredAccount && (
            <p className="helper-text admin-helper">
              Registered roles for this email: <strong>{registeredAccount.roles.join(", ")}</strong>
            </p>
          )}

          {(isUserRegistrationFlow || isEntrepreneurRegistrationFlow) && !otpSent && (
            <label className="checkbox-row" htmlFor="agreeToTerms">
              <input
                type="checkbox"
                id="agreeToTerms"
                checked={registrationForm.agreeToTerms}
                onChange={(event) => updateRegistrationForm("agreeToTerms", event.target.checked)}
              />
              <span>I agree to receive verification messages and continue with registration.</span>
            </label>
          )}

          {otpSent && (
            <div className="form-group">
              <label htmlFor="otp">
                <span>Enter OTP sent to your email</span>
                <span className="field-actions">
                  {renderFieldVoiceActions("otp", otp || "OTP", (value) => updateOtp(value.replace(/\D/g, "").slice(0, 6)))}
                  <button
                    type="button"
                    className="resend-otp"
                    onClick={handleSendOtp}
                    disabled={loading}
                  >
                    Resend
                  </button>
                </span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                id="otp"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(event) => updateOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="form-input"
                maxLength="6"
                autoComplete="one-time-code"
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          {devOtp && (
            <div className="dev-otp-message">
              <span>Development OTP</span>
              <strong>{devOtp}</strong>
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {otpSent
                ? loading ? "Verifying..." : "Verify OTP"
                : loading
                  ? "Sending OTP..."
                  : isUserRegistrationFlow || isEntrepreneurRegistrationFlow
                    ? "Continue to Verification"
                    : isLoginFlow
                      ? "Send Login OTP"
                    : isAdminFlow
                      ? "Send Admin OTP"
                      : "Send OTP"}
            </button>

            {otpSent && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={resetOtpFlow}
                disabled={loading}
              >
                Back
              </button>
            )}

          </div>
        </form>

        <div className="login-footer">
          <p className="security-info">{loginCopy.footer}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
