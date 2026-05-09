import { signInWithPhoneNumber, signOut } from 'firebase/auth';
import { auth, setupRecaptcha, cleanupRecaptcha } from '../config/firebaseConfig';

/**
 * Firebase Phone OTP Authentication Service
 * Handles phone number verification and OTP-based login
 */

let confirmationResult = null;

/**
 * Send OTP to phone number
 * @param {string} phoneNumber - Phone number in international format (e.g., "+919876543210")
 * @param {string} recaptchaContainerId - ID of reCAPTCHA container element
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const sendPhoneOTP = async (phoneNumber, recaptchaContainerId = 'recaptcha-container') => {
  try {
    // Validate phone number format
    if (!phoneNumber || !/^\+\d{1,3}\d{1,14}$/.test(phoneNumber)) {
      throw new Error('Invalid phone number format. Use international format (e.g., +919876543210)');
    }

    // Setup reCAPTCHA
    setupRecaptcha(recaptchaContainerId);

    // Wait for reCAPTCHA to be ready
    let retries = 0;
    while (!window.recaptchaVerifier && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }

    if (!window.recaptchaVerifier) {
      throw new Error('Failed to initialize reCAPTCHA');
    }

    // Sign in with phone number
    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);

    return {
      success: true,
      message: 'OTP sent successfully. Check your phone for the verification code.',
    };
  } catch (error) {
    console.error('Error sending OTP:', error);
    cleanupRecaptcha();
    return {
      success: false,
      message: error.message || 'Failed to send OTP. Please try again.',
      error: error.code,
    };
  }
};

/**
 * Verify OTP and complete phone authentication
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{ success: boolean, message: string, user?: Object }>}
 */
export const verifyPhoneOTP = async (otp) => {
  try {
    if (!confirmationResult) {
      throw new Error('No OTP request found. Please send OTP first.');
    }

    if (!otp || !/^\d{6}$/.test(otp)) {
      throw new Error('Invalid OTP format. Please enter 6 digits.');
    }

    // Verify OTP
    const result = await confirmationResult.confirm(otp);
    const user = result.user;

    // Extract user information
    const userData = {
      uid: user.uid,
      phoneNumber: user.phoneNumber,
      email: user.email || null,
      displayName: user.displayName || null,
      metadata: {
        creationTime: user.metadata?.creationTime,
        lastSignInTime: user.metadata?.lastSignInTime,
      },
      isNewUser: result.additionalUserInfo?.isNewUser || false,
    };

    // Store auth token
    const idToken = await user.getIdToken();

    return {
      success: true,
      message: 'Phone number verified successfully!',
      user: userData,
      idToken: idToken,
      isNewUser: userData.isNewUser,
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      message: error.message || 'Invalid OTP. Please try again.',
      error: error.code,
    };
  }
};

/**
 * Resend OTP to phone number
 * @param {string} phoneNumber - Phone number in international format
 * @param {string} recaptchaContainerId - ID of reCAPTCHA container element
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const resendPhoneOTP = async (phoneNumber, recaptchaContainerId = 'recaptcha-container') => {
  try {
    // Reset reCAPTCHA and send new OTP
    cleanupRecaptcha();
    return await sendPhoneOTP(phoneNumber, recaptchaContainerId);
  } catch (error) {
    console.error('Error resending OTP:', error);
    return {
      success: false,
      message: 'Failed to resend OTP. Please try again.',
      error: error.code,
    };
  }
};

/**
 * Sign out current user
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const signOutUser = async () => {
  try {
    await signOut(auth);
    cleanupRecaptcha();
    confirmationResult = null;

    return {
      success: true,
      message: 'Signed out successfully.',
    };
  } catch (error) {
    console.error('Error signing out:', error);
    return {
      success: false,
      message: 'Failed to sign out.',
      error: error.code,
    };
  }
};

/**
 * Get current authenticated user
 * @returns {Object|null} Current user or null
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Get current user's ID token
 * @returns {Promise<string|null>} ID token or null
 */
export const getCurrentUserToken = async () => {
  const user = getCurrentUser();
  if (user) {
    return await user.getIdToken();
  }
  return null;
};

/**
 * Listen to authentication state changes
 * @param {Function} callback - Function called with user object when auth state changes
 * @returns {Function} Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
  return auth.onAuthStateChanged(callback);
};

/**
 * Format phone number for Firebase (add +91 for India)
 * @param {string} phoneNumber - 10-digit phone number
 * @returns {string} International format phone number
 */
export const formatPhoneForFirebase = (phoneNumber) => {
  const cleaned = phoneNumber.replace(/\D/g, '').slice(-10);
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  return phoneNumber;
};

export default {
  sendPhoneOTP,
  verifyPhoneOTP,
  resendPhoneOTP,
  signOutUser,
  getCurrentUser,
  getCurrentUserToken,
  onAuthStateChange,
  formatPhoneForFirebase,
};
