import React, { useEffect, useState } from 'react';
import {
  sendPhoneOTP,
  verifyPhoneOTP,
  resendPhoneOTP,
  formatPhoneForFirebase,
  signOutUser,
} from '../../services/firebasePhoneAuthService';
import './FirebasePhoneOTPLogin.css';

const FirebasePhoneOTPLogin = ({ onLoginSuccess, role = 'user', onClose }) => {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [originalPhone, setOriginalPhone] = useState('');

  // Format phone input (10-digit Indian format)
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.slice(-10);
    setPhone(formatted);
    setError('');
  };

  // Handle phone submission
  const handleSendOTP = async (e) => {
    e.preventDefault();

    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formattedPhone = formatPhoneForFirebase(phone);
      const result = await sendPhoneOTP(formattedPhone, 'recaptcha-container');

      if (result.success) {
        setOriginalPhone(formattedPhone);
        setStep('otp');
        setSuccess('OTP sent! Check your phone for the verification code.');
        setResendCountdown(60);

        // Start countdown timer
        const interval = setInterval(() => {
          setResendCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(result.message || 'Failed to send OTP');
      }
    } catch (err) {
      console.error('Send OTP Error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP submission
  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await verifyPhoneOTP(otp);

      if (result.success) {
        setSuccess('Phone verified successfully!');

        // Store user data and token
        const userData = {
          ...result.user,
          role,
        };

        localStorage.setItem('firebaseUser', JSON.stringify(userData));
        localStorage.setItem('firebaseIdToken', result.idToken);
        localStorage.setItem('userRole', role);

        // Call success callback
        if (onLoginSuccess) {
          setTimeout(() => {
            onLoginSuccess(userData);
          }, 1500);
        }
      } else {
        setError(result.message || 'OTP verification failed');
      }
    } catch (err) {
      console.error('Verify OTP Error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP resend
  const handleResendOTP = async () => {
    if (resendCountdown > 0) return;

    setLoading(true);
    setError('');

    try {
      const result = await resendPhoneOTP(originalPhone, 'recaptcha-container');

      if (result.success) {
        setSuccess('OTP resent! Check your phone.');
        setResendCountdown(60);

        // Restart countdown
        const interval = setInterval(() => {
          setResendCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(result.message || 'Failed to resend OTP');
      }
    } catch (err) {
      console.error('Resend OTP Error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Go back to phone input
  const handleGoBack = async () => {
    await signOutUser();
    setStep('phone');
    setPhone('');
    setOtp('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="firebase-phone-otp-container">
      <div className="firebase-phone-otp-card">
        <div className="firebase-phone-otp-header">
          <h2>Phone Verification</h2>
          <p>Secure login with OTP</p>
        </div>

        {/* reCAPTCHA container */}
        <div id="recaptcha-container" className="recaptcha-container"></div>

        {error && <div className="firebase-phone-otp-error">{error}</div>}
        {success && <div className="firebase-phone-otp-success">{success}</div>}

        {step === 'phone' ? (
          <form onSubmit={handleSendOTP} className="firebase-phone-otp-form">
            <div className="firebase-phone-otp-group">
              <label htmlFor="phone">Phone Number</label>
              <div className="firebase-phone-input-wrapper">
                <span className="firebase-phone-prefix">+91</span>
                <input
                  id="phone"
                  type="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength="10"
                  disabled={loading}
                  className="firebase-phone-input"
                />
              </div>
              <p className="firebase-phone-hint">Enter 10-digit Indian mobile number</p>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              className="firebase-phone-otp-btn"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="firebase-phone-otp-form">
            <div className="firebase-phone-otp-group">
              <label htmlFor="otp">Enter OTP</label>
              <input
                id="otp"
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(value);
                  setError('');
                }}
                maxLength="6"
                disabled={loading}
                className="firebase-phone-input"
              />
              <p className="firebase-phone-hint">
                We've sent a 6-digit OTP to +91{originalPhone.slice(-10)}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="firebase-phone-otp-btn"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <div className="firebase-phone-otp-footer">
              <p>
                Didn't receive OTP?
                {resendCountdown > 0 ? (
                  <span className="resend-countdown"> Resend in {resendCountdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="resend-btn"
                  >
                    Resend
                  </button>
                )}
              </p>
              <button
                type="button"
                onClick={handleGoBack}
                disabled={loading}
                className="back-btn"
              >
                Back
              </button>
            </div>
          </form>
        )}

        {onClose && (
          <button onClick={onClose} className="firebase-phone-otp-close">
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default FirebasePhoneOTPLogin;
