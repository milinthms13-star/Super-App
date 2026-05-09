/**
 * OTPLogin.jsx
 * Phone number based OTP login component
 * Features: Country code selection, OTP generation, timer, resend with rate limiting
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import './OTPLogin.css';

const OTPLogin = ({ onSuccess, onError }) => {
  const [step, setStep] = useState('phone'); // phone | otp | verifying
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [medium, setMedium] = useState('sms'); // sms | whatsapp
  const [sessionId, setSessionId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const otpInputRef = useRef([]);

  // Timer effect for OTP expiry and resend delay
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Validate phone number
  const validatePhone = (phone) => {
    const indianPhoneRegex = /^[6-9]\d{9}$/;
    return indianPhoneRegex.test(phone);
  };

  // Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setPhoneError('');
    setError('');

    if (!validatePhone(phoneNumber)) {
      setPhoneError('Please enter a valid 10-digit Indian phone number starting with 6-9');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/otp/request-code`, {
        phoneNumber,
        medium,
        deviceInfo: {
          deviceName: navigator.userAgent.split('(')[1]?.split(')')[0] || 'Browser',
          deviceType: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
        }
      });

      setSessionId(response.data.data.sessionId);
      setStep('otp');
      setTimer(300); // 5 minutes
      setCanResend(false);

      if (process.env.NODE_ENV === 'development') {
        console.log('Dev OTP:', response.data.data.otpCode);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP with rate limiting
  const handleResendOTP = async (e) => {
    e.preventDefault();
    if (!canResend || timer > 0) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/otp/resend-code`, {
        sessionId,
        medium
      });

      setTimer(300);
      setCanResend(false);
      setError('');

      if (process.env.NODE_ENV === 'development') {
        console.log('Dev OTP:', response.data.data.otpCode);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP input with auto-focus
  const handleOTPChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = otpCode.split('');
    newOtp[index] = value;
    const newOtpString = newOtp.join('');
    setOtpCode(newOtpString);

    // Auto-focus next field
    if (value && index < 5) {
      otpInputRef.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRef.current[index - 1]?.focus();
    }
  };

  // Verify OTP and login
  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (otpCode.length !== 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }

    setLoading(true);
    setStep('verifying');

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/otp/verify-code-login`, {
        sessionId,
        otpCode,
        deviceInfo: {
          deviceName: navigator.userAgent.split('(')[1]?.split(')')[0] || 'Browser',
          deviceType: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
        }
      });

      // Store tokens
      localStorage.setItem('accessToken', response.data.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));

      onSuccess?.(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
      setStep('otp');
    } finally {
      setLoading(false);
    }
  };

  // Cancel and go back
  const handleCancel = async () => {
    if (sessionId && step === 'otp') {
      try {
        await axios.delete(`${API_BASE_URL}/auth/otp/cancel`, { data: { sessionId } });
      } catch (err) {
        console.error('Failed to cancel session:', err);
      }
    }
    setStep('phone');
    setPhoneNumber('');
    setOtpCode('');
    setSessionId('');
    setError('');
    setPhoneError('');
  };

  return (
    <div className="otp-login-container">
      <div className="otp-login-card">
        <h2 className="otp-title">Welcome to NilaHub</h2>
        <p className="otp-subtitle">
          {step === 'phone' && 'Enter your phone number to continue'}
          {step === 'otp' && 'Enter the OTP sent to your phone'}
          {step === 'verifying' && 'Verifying your OTP...'}
        </p>

        {error && <div className="otp-error-message">{error}</div>}

        {step === 'phone' && (
          <form onSubmit={handleRequestOTP}>
            <div className="otp-form-group">
              <label htmlFor="phone-number">Phone Number</label>
              <div className="otp-phone-input-group">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="otp-country-code"
                  disabled={loading}
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+86">🇨🇳 +86</option>
                </select>
                <input
                  id="phone-number"
                  type="tel"
                  placeholder="Enter 10-digit number"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setPhoneError('');
                  }}
                  maxLength="10"
                  disabled={loading}
                  className={phoneError ? 'error' : ''}
                  autoFocus
                />
              </div>
              {phoneError && <p className="otp-field-error">{phoneError}</p>}
            </div>

            <div className="otp-form-group">
              <label>Delivery Method</label>
              <div className="otp-delivery-options">
                <label className="otp-radio">
                  <input
                    type="radio"
                    value="sms"
                    checked={medium === 'sms'}
                    onChange={(e) => setMedium(e.target.value)}
                    disabled={loading}
                  />
                  <span>📱 SMS</span>
                </label>
                <label className="otp-radio">
                  <input
                    type="radio"
                    value="whatsapp"
                    checked={medium === 'whatsapp'}
                    onChange={(e) => setMedium(e.target.value)}
                    disabled={loading}
                  />
                  <span>💬 WhatsApp</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !phoneNumber}
              className="otp-submit-btn"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP}>
            <div className="otp-form-group">
              <label htmlFor="otp-code">Enter 6-digit OTP</label>
              <div className="otp-code-input">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputRef.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={otpCode[index] || ''}
                    onChange={(e) => handleOTPChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={loading}
                    className="otp-digit-input"
                  />
                ))}
              </div>
              <p className="otp-timer">
                {timer > 0 ? `OTP expires in ${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}` : 'OTP expired'}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="otp-submit-btn"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <div className="otp-actions">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={!canResend || loading || timer > 0}
                className="otp-resend-btn"
              >
                {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="otp-cancel-btn"
              >
                Change Number
              </button>
            </div>
          </form>
        )}

        {step === 'verifying' && (
          <div className="otp-verifying">
            <div className="spinner"></div>
            <p>Verifying your OTP...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OTPLogin;
