import React, { useState } from 'react';
import axios from 'axios';
import './LoginFlow.css';

const LoginFlow = ({ onLoginSuccess, role = 'rider' }) => {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'profile'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Format phone number (Indian format)
  const formatPhone = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.slice(-10);
    return formatted;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setError('');
  };

  // Step 1: Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();

    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/ridesharing/auth/otp-send', {
        phone: `91${phone}`,
      });

      if (response.data.success) {
        setOtpSent(true);
        setStep('otp');
        setResendCountdown(60);

        // Countdown timer
        const interval = setInterval(() => {
          setResendCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to send OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/ridesharing/auth/otp-verify', {
        phone: `91${phone}`,
        otp,
        role,
      });

      if (response.data.success) {
        // Store tokens
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('userRole', role);
        localStorage.setItem('userId', response.data.user._id);

        // Check if new user needs profile completion
        if (response.data.user.isNewUser) {
          setStep('profile');
        } else {
          // Login successful
          onLoginSuccess(response.data.user);
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to verify OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth
  const handleGoogleLogin = async (googleToken) => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/ridesharing/auth/google', {
        googleToken,
        role,
      });

      if (response.data.success) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('userRole', role);
        localStorage.setItem('userId', response.data.user._id);
        onLoginSuccess(response.data.user);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Google login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Apple OAuth
  const handleAppleLogin = async (appleToken) => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/ridesharing/auth/apple', {
        appleToken,
        role,
      });

      if (response.data.success) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('userRole', role);
        localStorage.setItem('userId', response.data.user._id);
        onLoginSuccess(response.data.user);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Apple login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-flow">
      <div className="login-container">
        <div className="login-header">
          <h1>Welcome to RideShare</h1>
          <p>Sign in as {role === 'rider' ? 'Passenger' : 'Driver'}</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* Phone Entry Step */}
        {step === 'phone' && (
          <form onSubmit={handleSendOTP} className="login-form">
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <div className="phone-input-wrapper">
                <span className="country-code">🇮🇳 +91</span>
                <input
                  id="phone"
                  type="tel"
                  placeholder="Enter 10-digit number"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength="10"
                  disabled={loading}
                  autoFocus
                />
              </div>
              <small>We'll send an OTP to this number</small>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              className="primary-button"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>

            <div className="divider">
              <span>Or continue with</span>
            </div>

            <div className="social-buttons">
              <button
                type="button"
                className="social-button google"
                onClick={() => handleGoogleLogin('google-token-placeholder')}
                disabled={loading}
              >
                <span>🔵</span>
                Google
              </button>
              <button
                type="button"
                className="social-button apple"
                onClick={() => handleAppleLogin('apple-token-placeholder')}
                disabled={loading}
              >
                <span>🍎</span>
                Apple
              </button>
            </div>

            <p className="terms">
              By signing in, you agree to our Terms & Conditions and Privacy Policy
            </p>
          </form>
        )}

        {/* OTP Verification Step */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="login-form">
            <div className="otp-header">
              <button
                type="button"
                className="back-button"
                onClick={() => setStep('phone')}
              >
                ← Back
              </button>
              <span>Enter OTP sent to +91{phone}</span>
            </div>

            <div className="form-group">
              <label htmlFor="otp">6-Digit OTP</label>
              <input
                id="otp"
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setOtp(val.slice(0, 6));
                  setError('');
                }}
                maxLength="6"
                disabled={loading}
                autoFocus
                className="otp-input"
              />
              <small>Check your SMS for the code</small>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="primary-button"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <div className="resend-section">
              {resendCountdown > 0 ? (
                <p>Didn't receive OTP? Resend in {resendCountdown}s</p>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOTP}
                  className="resend-button"
                  disabled={loading}
                >
                  Resend OTP
                </button>
              )}
            </div>
          </form>
        )}

        {/* Profile Completion Step */}
        {step === 'profile' && (
          <ProfileCompletion
            phone={phone}
            role={role}
            onComplete={(userData) => {
              onLoginSuccess(userData);
            }}
          />
        )}
      </div>
    </div>
  );
};

// Profile Completion Component
const ProfileCompletion = ({ phone, role, onComplete }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.put(
        '/api/ridesharing/auth/profile',
        {
          firstName,
          lastName,
          email,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      );

      if (response.data.success) {
        onComplete({
          ...response.data.user,
          firstName,
          email,
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to complete profile'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="profile-form">
      <h2>Complete Your Profile</h2>

      {error && <div className="error-banner">{error}</div>}

      <div className="form-group">
        <label htmlFor="firstName">First Name *</label>
        <input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="John"
          disabled={loading}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="lastName">Last Name</label>
        <input
          id="lastName"
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Doe"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@example.com"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="primary-button"
      >
        {loading ? 'Completing...' : 'Continue to App'}
      </button>

      <p className="terms">
        {role === 'driver' && 'You will be directed to complete KYC verification'}
      </p>
    </form>
  );
};

export default LoginFlow;
