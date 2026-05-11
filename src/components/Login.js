import React, { useMemo, useState } from "react";
import axios from "axios";
import { getTranslation } from "../data/translations";
import useVoice from "../hooks/useVoice";
import { API_BASE_URL } from "../utils/api";

import "../styles/Login.css";

const ADMIN_EMAIL = "mgdhanyamohan@gmail.com";
const OTP_REQUEST_TIMEOUT_MS = 45000;

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
  const [registrationOtpChannel, setRegistrationOtpChannel] = useState("email");
  const [needsUsernameSetup, setNeedsUsernameSetup] = useState(false);
  const [authMethod, setAuthMethod] = useState("email"); // default to email so tests land on Verify flow quickly
  const [deviceToken, setDeviceToken] = useState("");
  const [setupUsername, setSetupUsername] = useState("");
  const [setupUsernameStatus, setSetupUsernameStatus] = useState(null); // 'available', 'taken', 'checking', null
  const [setupUsernameError, setSetupUsernameError] = useState("");
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [verifiedToken, setVerifiedToken] = useState(null);
  const [mpinPassword, setMpinPassword] = useState("");
  const [loginStep, setLoginStep] = useState("input"); // "method", "input", "verify"
  const [voiceAssistantActive, setVoiceAssistantActive] = useState(false);
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
    username: "",
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
  const [usernameCheckStatus, setUsernameCheckStatus] = useState(null); // 'available', 'taken', 'checking', null
  const [usernameError, setUsernameError] = useState("");
  const normalizedRegistrationType = registrationType === "entrepreneur" ? "user" : registrationType;
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhoneInput = String(email || "").replace(/\D/g, "");
  const isAdminEmail = normalizedEmail === ADMIN_EMAIL;
  const isAdminFlow = normalizedRegistrationType === "admin";
  const isUserRegistrationFlow = normalizedRegistrationType === "user";
  const isEntrepreneurRegistrationFlow = false;
  const isBusinessRegistrationFlow = isEntrepreneurRegistrationFlow;
  const isLoginFlow = normalizedRegistrationType === "login";
  const loginFlowClass = isLoginFlow ? "login-flow" : "";
  const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
  const registeredAccountByEmail = registeredAccounts.find(
    (account) => String(account.email || "").trim().toLowerCase() === normalizedEmail
  );
  const registeredAccountByPhone = registeredAccounts.find((account) => {
    const accountPhone = normalizePhone(account.phone);
    if (!accountPhone || normalizedPhoneInput.length < 10) {
      return false;
    }
    return (
      accountPhone === normalizedPhoneInput ||
      accountPhone.endsWith(normalizedPhoneInput) ||
      normalizedPhoneInput.endsWith(accountPhone)
    );
  });
  const registeredAccount = registeredAccountByEmail || registeredAccountByPhone;
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

  const validateUsername = (value) => /^[a-zA-Z0-9_-]+$/.test(value) && value.length >= 3 && value.length <= 20;

  const checkUsernameAvailability = async (username) => {
    if (!username || username.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      setUsernameCheckStatus(null);
      return false;
    }

    if (!validateUsername(username)) {
      setUsernameError("Username can only contain letters, numbers, underscores, and dashes");
      setUsernameCheckStatus(null);
      return false;
    }

    try {
      setUsernameCheckStatus("checking");
      setUsernameError("");
      
      const response = await axios.get(`${API_BASE_URL}/auth/check-username?username=${encodeURIComponent(username)}`);

      if (response.data.available) {
        setUsernameCheckStatus("available");
        setUsernameError("");
        return true;
      } else {
        setUsernameCheckStatus("taken");
        setUsernameError(response.data.message || "Username is already taken");
        return false;
      }
    } catch (err) {
      setUsernameCheckStatus(null);
      setUsernameError("Error checking username availability");
      return false;
    }
  };

  const checkSetupUsernameAvailability = async (username) => {
    if (!username || username.length < 3) {
      setSetupUsernameError("Username must be at least 3 characters");
      setSetupUsernameStatus(null);
      return false;
    }

    if (!validateUsername(username)) {
      setSetupUsernameError("Username can only contain letters, numbers, underscores, and dashes");
      setSetupUsernameStatus(null);
      return false;
    }

    try {
      setSetupUsernameStatus("checking");
      setSetupUsernameError("");
      
      const response = await axios.get(`${API_BASE_URL}/auth/check-username?username=${encodeURIComponent(username)}`);

      if (response.data.available) {
        setSetupUsernameStatus("available");
        setSetupUsernameError("");
        return true;
      } else {
        setSetupUsernameStatus("taken");
        setSetupUsernameError(response.data.message || "Username is already taken");
        return false;
      }
    } catch (err) {
      setSetupUsernameStatus(null);
      setSetupUsernameError("Error checking username availability");
      return false;
    }
  };

  const updateRegistrationForm = (field, value) => {
    setRegistrationForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    // Check username availability if username field changes
    if (field === "username" && (isUserRegistrationFlow || isEntrepreneurRegistrationFlow)) {
      if (value) {
        checkUsernameAvailability(value);
      } else {
        setUsernameCheckStatus(null);
        setUsernameError("");
      }
    }
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleSelectAuthMethod = (method) => {
    setAuthMethod(method);
    setEmail("");
    setMpinPassword("");
    setOtp("");
    setOtpSent(false);
    clearMessages();
    
    if (method === "gmail") {
      const authIntent = isLoginFlow ? "login" : "register";
      window.location.href = `${API_BASE_URL}/auth/google?authIntent=${authIntent}`;
    } else {
      // Show input field for email, phone, or mpin
      setLoginStep("input");
    }
  };

  const updateEmail = (value) => {
    setEmail(value);
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

      if (!registrationForm.username.trim()) {
        setError("Please enter a unique username");
        return;
      }

      if (!validateUsername(registrationForm.username)) {
        setError("Username can only contain letters, numbers, underscores, and dashes (3-20 characters)");
        return;
      }

      if (usernameCheckStatus !== "available") {
        setError("Please choose an available username");
        return;
      }

      if (!registrationForm.agreeToTerms) {
        setError("Please accept the terms to continue");
        return;
      }

      if (!email.trim() || !validateEmail(email.trim().toLowerCase())) {
        setError("Please enter a valid email for account registration");
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

      if (!registrationForm.username.trim()) {
        setError("Please enter a unique username");
        return;
      }

      if (!validateUsername(registrationForm.username)) {
        setError("Username can only contain letters, numbers, underscores, and dashes (3-20 characters)");
        return;
      }

      if (usernameCheckStatus !== "available") {
        setError("Please choose an available username");
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

    // MPIN Direct Validation - No OTP needed
    if (isLoginFlow && authMethod === "mpin") {
      if (!mpinPassword.trim()) {
        setError("Please enter your MPIN");
        return;
      }
      if (!/^\d{4}$/.test(mpinPassword)) {
        setError("Please enter a valid 4-digit MPIN");
        return;
      }
      setLoading(true);
      try {
        const response = await axios.post(`${API_BASE_URL}/auth/verify-mpin`, {
          mpin: mpinPassword,
          authMethod: "mpin",
        });

        if (response.data.success && response.data.token && response.data.user) {
          const mergedUser = {
            ...response.data.user,
            name: response.data.user.name,
            phone: response.data.user.phone || "",
            email: response.data.user.email || "",
            role: response.data.user.role || "user",
            registrationType: "user",
          };

          onLoginSuccess(mergedUser, response.data.token, "user");
        } else {
          setError(response.data.message || "Invalid MPIN");
        }
      } catch (err) {
        if (!err.response) {
          setError("Backend is not running. Please start the API server and try again.");
        } else {
          setError(err.response.data?.message || "Unable to verify MPIN. Please try again.");
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    const effectiveAuthMethod = isLoginFlow
      ? authMethod
      : registrationOtpChannel === "sms"
        ? "phone"
        : "email";
    const otpEmail = isLoginFlow ? (effectiveAuthMethod === "email" ? email : "") : email;
    const otpPhone = isLoginFlow
      ? (effectiveAuthMethod === "phone" ? email : "")
      : registrationForm.phone;
    const authIntent = isLoginFlow ? "login" : "register";

    // Email/Phone OTP Flow
    if (effectiveAuthMethod !== "mpin" && !otpEmail && !otpPhone) {
      setError(
        `Please enter your ${effectiveAuthMethod === "phone" ? "phone number" : "email address"}`
      );
      return;
    }

    if (isLoginFlow && effectiveAuthMethod === "phone") {
      if (!validatePhone(otpPhone)) {
        setError("Please enter a valid phone number");
        return;
      }
    } else if (isLoginFlow && effectiveAuthMethod === "email") {
      if (!validateEmail(otpEmail)) {
        setError("Please enter a valid email address");
        return;
      }

      if (isAdminFlow && !isAdminEmail) {
        setError("Use the configured admin account to access the admin dashboard");
        return;
      }
    }

    if (!isLoginFlow && effectiveAuthMethod === "phone" && !validatePhone(otpPhone)) {
      setError("Please enter a valid phone number for SMS OTP");
      return;
    }

    if (isLoginFlow && effectiveAuthMethod !== "mpin" && !registeredAccount && !isAdminEmail) {
      setError("Account not found. Please register first before logging in.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/send-otp`,
        { 
          email: otpEmail || undefined,
          phone: otpPhone || undefined,
          authMethod: effectiveAuthMethod,
          authIntent,
          registrationType: normalizedRegistrationType,
          fullName: registrationForm.fullName?.trim() || undefined,
          username: registrationForm.username?.trim()?.toLowerCase() || undefined,
        },
        { timeout: OTP_REQUEST_TIMEOUT_MS }
      );

      if (response.data.success) {
        setOtpSent(true);
        setLoginStep("verify");
        setAuthMethod(effectiveAuthMethod);
        let method = "email";
        if (effectiveAuthMethod === "phone") method = "phone";
        setSuccess(response.data.message || `OTP sent to your ${method}`);
        setDevOtp(response.data.devOtp || "");
      } else {
        setError(response.data.message || "Failed to send OTP");
      }
    } catch (err) {
      if (err.code === "ECONNABORTED") {
        setError("OTP request timed out while contacting the backend. Please try again in a moment.");
      } else if (!err.response) {
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
      const verifyEmail =
        authMethod === "email" ? email : isLoginFlow ? undefined : email;
      const verifyPhone =
        authMethod === "phone"
          ? (isLoginFlow ? email : registrationForm.phone)
          : isLoginFlow
            ? undefined
            : registrationForm.phone;
      const response = await axios.post(`${API_BASE_URL}/auth/verify-otp`, {
        email: verifyEmail,
        phone: verifyPhone,
        mpin: authMethod === "mpin" ? mpinPassword : undefined,
        deviceToken: authMethod === "device" ? deviceToken : undefined,
        otp,
        authMethod: authMethod,
        authIntent: isLoginFlow ? "login" : "register",
      });

      if (response.data.success && response.data.token && response.data.user) {
        // Check if username setup is needed for first-time login users
        if (response.data.needsUsernameSetup && isLoginFlow) {
          setVerifiedUser(response.data.user);
          setVerifiedToken(response.data.token);
          setNeedsUsernameSetup(true);
          setSuccess("OTP verified! Now please create your username.");
          setLoading(false);
          return;
        }

        let mergedUser = response.data.user;

        if (isEntrepreneurRegistrationFlow) {
          mergedUser = {
            ...response.data.user,
            name: registrationForm.fullName.trim() || response.data.user.name,
            phone: registrationForm.phone.trim(),
            username: registrationForm.username.trim().toLowerCase(),
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
              username: registrationForm.username.trim().toLowerCase(),
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
            username: registrationForm.username.trim().toLowerCase(),
            role: "user",
            registrationType: "user",
          };

          if (onRegistrationSubmit) {
            await onRegistrationSubmit({
              applicantName: registrationForm.fullName.trim(),
              email,
              username: registrationForm.username.trim().toLowerCase(),
              phone: registrationForm.phone.trim(),
              registrationType: "user",
            });
          }
        } else if (isAdminFlow || (isLoginFlow && isAdminEmail)) {
          mergedUser = {
            ...response.data.user,
            name: "NilaHub Admin",
            email: ADMIN_EMAIL,
            avatar: "A",
            role: "admin",
            registrationType: "admin",
          };
        } else if (isLoginFlow) {
          mergedUser = {
            ...response.data.user,
            name: registeredAccount?.name || response.data.user.name,
            role: response.data.user.role || "user",
            registrationType: "user",
          };
        }

        onLoginSuccess(
          mergedUser,
          response.data.token,
          mergedUser.registrationType === "admin" ? "admin" : "user"
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
    setMpinPassword("");
    setLoginStep("input");
  };

  const handleSetUsername = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!setupUsername) {
      setSetupUsernameError("Please enter a username");
      return;
    }

    if (!validateUsername(setupUsername)) {
      setSetupUsernameError("Username can only contain letters, numbers, underscores, and dashes (3-20 characters)");
      return;
    }

    if (setupUsernameStatus !== "available") {
      setSetupUsernameError("Please choose an available username");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/set-username`,
        { username: setupUsername.trim().toLowerCase() },
        {
          headers: {
            Authorization: `Bearer ${verifiedToken}`,
          },
        }
      );

      if (response.data.success) {
        const isSetupAdmin =
          String(verifiedUser?.email || email || "")
            .trim()
            .toLowerCase() === ADMIN_EMAIL;
        const mergedUser = {
          ...verifiedUser,
          username: response.data.user.username,
          name: registeredAccount?.name || response.data.user.name,
          role: isSetupAdmin ? "admin" : response.data.user.role || "user",
          registrationType: isSetupAdmin ? "admin" : "user",
        };

        onLoginSuccess(
          mergedUser,
          verifiedToken,
          isSetupAdmin ? "admin" : "user"
        );
      } else {
        setSetupUsernameError(response.data.message || "Failed to set username");
      }
    } catch (err) {
      if (!err.response) {
        setSetupUsernameError("Backend is not running. Please start the API server and try again.");
      } else {
        setSetupUsernameError(err.response.data?.message || "Unable to set username. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const { login: loginCopy, direction } = getTranslation(language);
  const registrationLabel = normalizedRegistrationType === "admin"
      ? "Admin"
      : normalizedRegistrationType === "login"
        ? loginCopy.login
        : loginCopy.user;
  const loginSubtitle = normalizedRegistrationType === "admin"
      ? "Verify the admin email to manage category fees and registrations"
    : normalizedRegistrationType === "login"
        ? "Continue securely with your preferred method"
        : loginCopy.userSubtitle;
  const headerKicker = normalizedRegistrationType === "login"
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
      ? "Use the admin account to sign in and manage admin-controlled category fees."
      : isLoginFlow
        ? "Sign in only with a registered account using OTP."
        : "Enter your email and confirm the one-time password to continue.";

  const handleVoiceFill = (fieldKey, updateValue) => {
    if (listeningKey === fieldKey) {
      stopListening();
      return;
    }

    startListening(fieldKey, updateValue);
  };

  return (
    <div className={`login-container ${loginFlowClass}`} dir={direction}>
      <div className={`login-card ${isLoginFlow ? "login-card-compact" : ""}`}>
        {!otpSent && onBackToLaunch && (
          <div className="login-topbar">
            <button
              type="button"
              className="back-link"
              onClick={onBackToLaunch}
              disabled={loading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
          </div>
        )}

        <div className={`login-header ${isLoginFlow ? "login-header-compact" : ""}`}>
          <img src="/logo.svg" alt="NilaHub" className="login-logo" />
          <p className="login-kicker">{headerKicker}</p>
          <h1>NilaHub</h1>
          <p className="login-subtitle">{loginSubtitle}</p>
        </div>

        <form
          className={`login-form ${isLoginFlow ? "login-form-compact" : ""}`}
          onSubmit={needsUsernameSetup ? handleSetUsername : (otpSent ? handleVerifyOtp : handleSendOtp)}
        >
          {/* Registration/Admin Flow */}
          {!isLoginFlow && (
            <>
              {/* Google Auth Section (moved to top) */}
              {!otpSent && !needsUsernameSetup && (
                <div className="form-google-section">
                  <a href={`${API_BASE_URL}/auth/google?authIntent=register`} className="btn btn-google">
                    <img src="/google-icon.svg" alt="Google" width="20" height="20" />
                    Continue with Google
                  </a>
                  <div className="form-divider">OR</div>
                </div>
              )}

              <div className="form-manual-section">
              {/* Registration form fields */}
              {isUserRegistrationFlow && !otpSent && (
                <>
                  <div className="form-group">
                    <label htmlFor="fullName">
                      <span>Full Name</span>
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
                    <label htmlFor="username">
                      <span>Choose your NilaHub ID</span>
                    </label>
                    <input
                      type="text"
                      id="username"
                      placeholder="Enter a unique username (3-20 characters)"
                      value={registrationForm.username}
                      onChange={(event) => updateRegistrationForm("username", event.target.value)}
                      className="form-input"
                      autoComplete="username"
                    />
                    {usernameCheckStatus === "checking" && (
                      <p className="helper-text" style={{ color: "#FF9500" }}>Checking availability...</p>
                    )}
                    {usernameCheckStatus === "available" && (
                      <p className="helper-text" style={{ color: "#4CAF50" }}>✓ Username is available</p>
                    )}
                    {usernameCheckStatus === "taken" && (
                      <p className="helper-text" style={{ color: "#F44336" }}>✗ {usernameError}</p>
                    )}
                    {usernameError && usernameCheckStatus !== "taken" && usernameCheckStatus !== "available" && (
                      <p className="helper-text" style={{ color: "#F44336" }}>{usernameError}</p>
                    )}
                  </div>
                </>
              )}

              {/* Entrepreneur registration fields */}
              {isEntrepreneurRegistrationFlow && !otpSent && (
                <>
                  {/* (Keep all entrepreneur fields as before) */}
                  <div className="form-group">
                    <label htmlFor="fullName">
                      <span>Full Name</span>
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
                  {/* ... rest of entrepreneur fields ... */}
                </>
              )}

              {/* OTP channel for registration */}
              {!otpSent && (
                <div className="form-group">
                  <label>
                    <span>OTP Channel</span>
                  </label>
                  <div className="login-methods-grid">
                    <button
                      type="button"
                      className={`login-method-card ${registrationOtpChannel === "email" ? "selected" : ""}`}
                      onClick={() => setRegistrationOtpChannel("email")}
                      disabled={loading}
                    >
                      <span>Email OTP</span>
                    </button>
                    <button
                      type="button"
                      className={`login-method-card ${registrationOtpChannel === "sms" ? "selected" : ""}`}
                      onClick={() => setRegistrationOtpChannel("sms")}
                      disabled={loading}
                    >
                      <span>SMS OTP</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Email input for registration */}
              <div className="form-group">
                <label htmlFor="contactField">
                  <span>Email Address (required)</span>
                </label>
                <input
                  type="email"
                  id="contactField"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(event) => updateEmail(event.target.value)}
                  disabled={otpSent || loading}
                  className="form-input"
                  autoComplete="email"
                />
              </div>

              {otpSent && !needsUsernameSetup && (
                <div className="form-group">
                  <label htmlFor="otp">
                    <span>
                      Enter OTP sent to your {authMethod === "phone" ? "phone" : "email"}
                    </span>
                    <button
                      type="button"
                      className="resend-otp"
                      onClick={handleSendOtp}
                      disabled={loading}
                    >
                      Resend
                    </button>
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

              {needsUsernameSetup && (
                <div className="form-group">
                  <label htmlFor="setupUsername">
                    <span>Create your global username</span>
                  </label>
                  <input
                    type="text"
                    id="setupUsername"
                    placeholder="Enter a unique username (3-20 characters)"
                    value={setupUsername}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSetupUsername(value);
                      if (value) {
                        checkSetupUsernameAvailability(value);
                      } else {
                        setSetupUsernameStatus(null);
                        setSetupUsernameError("");
                      }
                    }}
                    className="form-input"
                    autoComplete="username"
                  />
                  {setupUsernameStatus === "checking" && (
                    <div className="username-status checking">Checking availability...</div>
                  )}
                  {setupUsernameStatus === "available" && (
                    <div className="username-status available">✓ Username is available</div>
                  )}
                  {setupUsernameStatus === "taken" && (
                    <div className="username-status taken">✗ Username is taken</div>
                  )}
                  {setupUsernameError && (
                    <div className="username-error">{setupUsernameError}</div>
                  )}
                </div>
              )}
              </div>
            </>
          )}

          {/* LOGIN FLOW - Progressive Disclosure */}
          {isLoginFlow && loginStep === "method" && !otpSent && (
            <>
              <div className={`form-intro ${isLoginFlow ? "form-intro-compact" : ""}`}>
                <div className="intro-heading-row centered">
                  <h2>Choose login method</h2>
                </div>
              </div>

              <div className="login-methods-grid">
                <button
                  type="button"
                  className={`login-method-card login-method-gmail ${authMethod === "gmail" ? "selected" : ""}`}
                  onClick={() => handleSelectAuthMethod("gmail")}
                  disabled={loading}
                >
                  <img src="/google-icon.svg" alt="Google" width="32" height="32" />
                  <span>Gmail</span>
                </button>

                <button
                  type="button"
                  className={`login-method-card ${authMethod === "email" ? "selected" : ""}`}
                  onClick={() => handleSelectAuthMethod("email")}
                  disabled={loading}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <span>Email</span>
                </button>

                <button
                  type="button"
                  className={`login-method-card ${authMethod === "phone" ? "selected" : ""}`}
                  onClick={() => handleSelectAuthMethod("phone")}
                  disabled={loading}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  <span>Phone</span>
                </button>

                <button
                  type="button"
                  className={`login-method-card ${authMethod === "mpin" ? "selected" : ""}`}
                  onClick={() => handleSelectAuthMethod("mpin")}
                  disabled={loading}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a5 5 0 0 0-5 5v6a5 5 0 0 0 10 0V6a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zm0 4a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0v-3a1 1 0 0 1 1-1z"/>
                  </svg>
                  <span>MPIN</span>
                </button>
              </div>

              <div className="trust-indicators">
                <div className="trust-indicator">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-.997-15h2v9h-2v-9zm.5-5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/>
                  </svg>
                  Secure authentication
                </div>
                <div className="trust-indicator">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 15.172l9.192-9.193 1.415 1.414L10 18 .393 8.393 1.808 6.979z"/>
                  </svg>
                  OTP verified
                </div>
                <div className="trust-indicator">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 11h2v2H3v-2zm4-7h2v9H7V4zm4-2h2v11h-2V2zm4 3h2v8h-2V5zm4-2h2v10h-2V3z"/>
                  </svg>
                  Encrypted access
                </div>
              </div>
              
              <div className="product-proof-line">
                Trusted access for users, vendors, creators, and businesses.
              </div>
            </>
          )}

          {/* LOGIN FLOW - Input Stage */}
          {isLoginFlow && loginStep === "input" && !otpSent && (
            <>
              <div className={`form-intro ${isLoginFlow ? "form-intro-compact" : ""}`}>
                <h2>
                  {authMethod === "email" && "Enter your email"}
                  {authMethod === "phone" && "Enter your phone number"}
                  {authMethod === "mpin" && "Enter your MPIN"}
                </h2>
              </div>

              {(authMethod === "email" || authMethod === "phone") && (
                <div className="form-group">
                  <label htmlFor="loginInput">
                    <span>{authMethod === "phone" ? "Phone Number" : "Email Address"}</span>
                  </label>
                  <input
                    type={authMethod === "phone" ? "tel" : "email"}
                    id="loginInput"
                    placeholder={authMethod === "phone" ? "Enter your phone number" : "Enter your email"}
                    value={email}
                    onChange={(event) => updateEmail(event.target.value)}
                    disabled={loading}
                    className="form-input"
                    autoComplete={authMethod === "phone" ? "tel" : "email"}
                    autoFocus
                  />
                </div>
              )}

              {authMethod === "mpin" && (
                <div className="form-group">
                  <label htmlFor="mpinInput">
                    <span>MPIN (4-digit)</span>
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    id="mpinInput"
                    placeholder="Enter your 4-digit MPIN"
                    value={mpinPassword}
                    onChange={(event) => setMpinPassword(event.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="form-input"
                    maxLength="4"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
              )}

              <div className="form-actions form-actions-compact">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {authMethod === "mpin"
                    ? loading ? "Verifying MPIN..." : "Login with MPIN"
                    : loading ? "Sending OTP..." : "Send OTP"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setLoginStep("method");
                    setAuthMethod(null);
                    setEmail("");
                    setMpinPassword("");
                    clearMessages();
                  }}
                  disabled={loading}
                >
                  Back to methods
                </button>
              </div>
            </>
          )}

          {/* OTP Verification Stage */}
          {isLoginFlow && loginStep === "verify" && otpSent && (
            <>
              <div className={`form-intro ${isLoginFlow ? "form-intro-compact" : ""}`}>
                <h2>Verify your {authMethod}</h2>
                <p>Enter the OTP sent to your {authMethod === "phone" ? "phone" : "email"}</p>
              </div>

              <div className="form-group">
                <label htmlFor="otp">
                  <span>OTP</span>
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
                  autoFocus
                />
              </div>

              <div className="form-actions form-actions-compact">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    resetOtpFlow();
                    setLoginStep("input");
                  }}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={handleSendOtp}
                  disabled={loading}
                >
                  Resend OTP
                </button>
              </div>
            </>
          )}

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          {devOtp && (
            <div className="dev-otp-message">
              <span>Development OTP</span>
              <strong>{devOtp}</strong>
            </div>
          )}

          {/* Form actions for registration flow */}
          {!isLoginFlow && (
            <div className={`form-actions ${isLoginFlow ? "form-actions-compact" : ""}`}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {needsUsernameSetup
                  ? loading ? "Setting username..." : "Complete Profile"
                  : otpSent
                    ? loading ? "Verifying..." : "Verify OTP"
                    : loading
                      ? "Sending OTP..."
                      : isUserRegistrationFlow
                        ? "Continue to Verification"
                        : isLoginFlow
                          ? "Send Login OTP"
                        : isAdminFlow
                          ? "Send Admin OTP"
                          : "Send OTP"}
              </button>

              {(otpSent || needsUsernameSetup) && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={needsUsernameSetup ? () => {
                    setNeedsUsernameSetup(false);
                    setSetupUsername("");
                    setSetupUsernameStatus(null);
                    setSetupUsernameError("");
                  } : resetOtpFlow}
                  disabled={loading}
                >
                  Back
                </button>
              )}
            </div>
          )}
        </form>

        <div className={`login-footer ${isLoginFlow ? "login-footer-compact" : ""}`}>
          <p className="security-info">{loginCopy.footer}</p>
        </div>
      </div>

      {/* Global Voice Assistant Button */}
      {(recognitionSupported || speechSupported) && !isLoginFlow && (
        <button
          type="button"
          className={`voice-assistant-btn ${voiceAssistantActive ? "active" : ""}`}
          onClick={() => setVoiceAssistantActive(!voiceAssistantActive)}
          aria-label={voiceAssistantActive ? "Stop voice assistant" : "Start voice assistant"}
          title={voiceAssistantActive ? "Stop voice assistant" : "Start voice assistant"}
          data-tooltip="Voice Assisted Registration"
        >
          🎤
        </button>
      )}
    </div>
  );
};

export default Login;
