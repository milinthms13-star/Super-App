# 🚀 Ride-Sharing Module: Phase 1 Implementation Quickstart

**Status:** Ready to Code  
**Priority:** CRITICAL - MVP Foundation  
**Duration:** Weeks 1-4  
**Team Size Recommended:** 3-4 developers

---

## ⚡ Phase 1 Overview

The MVP phase establishes the core ride-sharing functionality:
- User authentication & profiles
- Driver registration & KYC
- Ride booking engine
- Driver matching & acceptance
- Live tracking (WebSocket)
- Payments integration
- Rating system

**Success Criteria:**
- ✅ 100+ test rides completed
- ✅ 50+ driver registrations
- ✅ <5% ride cancellation
- ✅ 4.5+ average rating

---

## 📋 Week 1: Authentication & User Profile

### 1.1 Database Models

**Create:** `backend/models/RiderProfile.js`
```javascript
const mongoose = require('mongoose');

const riderProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  phone: {
    type: String,
    required: true,
    index: true
  },
  profilePhoto: String,
  profileCompletion: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Addresses
  savedAddresses: [{
    label: {
      type: String,
      enum: ['home', 'work', 'other'],
      required: true
    },
    address: String,
    lat: Number,
    lng: Number,
    isPrimary: Boolean
  }],

  // Language Preferences
  preferredLanguage: {
    type: String,
    enum: ['en', 'ml', 'ta', 'hi'],
    default: 'en'
  },
  spokenLanguages: [{
    type: String,
    enum: ['en', 'ml', 'ta', 'hi']
  }],

  // Emergency Contacts (max 5)
  emergencyContacts: [{
    name: String,
    phone: {
      type: String,
      required: true
    },
    relationship: String,
    isPrimary: Boolean
  }],

  // Wallet Integration
  walletBalance: {
    type: Number,
    default: 0
  },

  // Preferences
  preferences: {
    shareContactWithDriver: { type: Boolean, default: true },
    shareLocationHistory: { type: Boolean, default: false },
    allowCashPayment: { type: Boolean, default: true },
    receiveFareNotifications: { type: Boolean, default: true },
    receiveSafetyAlerts: { type: Boolean, default: true }
  },

  // Rating & Trust
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  trustScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },

  // Account Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'deactivated'],
    default: 'active'
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update completion percentage
riderProfileSchema.pre('save', function(next) {
  let completionItems = 0;
  let completedItems = 0;

  const items = [
    this.profilePhoto ? true : false,
    this.savedAddresses.length > 0 ? true : false,
    this.emergencyContacts.length > 0 ? true : false,
    this.preferredLanguage ? true : false
  ];

  completionItems = items.length;
  completedItems = items.filter(Boolean).length;
  
  this.profileCompletion = Math.round((completedItems / completionItems) * 100);
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('RiderProfile', riderProfileSchema);
```

**Create:** `backend/models/DriverProfile.js`
```javascript
const mongoose = require('mongoose');

const driverProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // Basic Info
  phone: String,
  profilePhoto: String,
  
  // Vehicle Information
  vehicle: {
    number: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    type: {
      type: String,
      enum: ['bike', 'auto', 'minicab', 'sedan', 'suv', 'premium', 'ev'],
      required: true,
      index: true
    },
    color: String,
    model: String,
    manufacturingYear: Number,
    registrationCertificate: {
      documentUrl: String,
      expiryDate: Date,
      verified: Boolean
    }
  },

  // Driver License
  license: {
    number: {
      type: String,
      required: true,
      unique: true
    },
    documentUrl: String,
    expiryDate: Date,
    verified: Boolean
  },

  // Insurance
  insurance: {
    policyNumber: String,
    documentUrl: String,
    expiryDate: Date,
    verified: Boolean
  },

  // Pollution Certificate
  pollutionCertificate: {
    documentUrl: String,
    expiryDate: Date,
    verified: Boolean
  },

  // KYC Status
  kycStatus: {
    type: String,
    enum: ['pending', 'submitted', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  kycSubmittedDate: Date,
  kycApprovedDate: Date,
  kycRejectionReason: String,

  // Background Check
  backgroundCheck: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'failed'],
      default: 'pending'
    },
    certificateUrl: String,
    completedDate: Date
  },

  // Face Verification
  faceVerification: {
    status: {
      type: String,
      enum: ['pending', 'verified', 'failed'],
      default: 'pending'
    },
    selfieUrl: String,
    matchScore: Number, // 0-100
    completedDate: Date
  },

  // Banking Details
  bankAccount: {
    holderName: String,
    accountNumber: String,
    ifscCode: String,
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'failed'],
      default: 'pending'
    }
  },

  // Service Area
  serviceAreas: [{
    type: String
  }],

  // Online Status
  isOnline: {
    type: Boolean,
    default: false,
    index: true
  },
  lastOnlineAt: Date,

  // Location
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      index: '2dsphere'
    }
  },
  lastLocationUpdate: Date,

  // Availability
  availabilityStatus: {
    type: String,
    enum: ['offline', 'available', 'busy', 'suspended'],
    default: 'offline',
    index: true
  },

  // Rating
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  ratingBreakdown: {
    5: { type: Number, default: 0 },
    4: { type: Number, default: 0 },
    3: { type: Number, default: 0 },
    2: { type: Number, default: 0 },
    1: { type: Number, default: 0 }
  },

  // Statistics
  statistics: {
    totalRides: {
      type: Number,
      default: 0,
      index: true
    },
    completedRides: { type: Number, default: 0 },
    cancelledRides: { type: Number, default: 0 },
    cancelRatePercent: Number,
    totalEarnings: { type: Number, default: 0 },
    averageEarningsPerRide: Number,
    totalDrivingHours: Number,
    acceptanceRate: Number
  },

  // Emergency Contact
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },

  // Account Status
  status: {
    type: String,
    enum: ['pending_kyc', 'active', 'suspended', 'deactivated', 'banned'],
    default: 'pending_kyc',
    index: true
  },
  suspensionReason: String,

  // Language Preferences
  spokenLanguages: [{
    type: String,
    enum: ['en', 'ml', 'ta', 'hi']
  }],

  // Preferences
  preferences: {
    acceptAutomaticAssignment: { type: Boolean, default: true },
    receiveNotifications: { type: Boolean, default: true }
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for geospatial queries
driverProfileSchema.index({ 'currentLocation': '2dsphere' });
driverProfileSchema.index({ 'isOnline': 1, 'availabilityStatus': 1 });

module.exports = mongoose.model('DriverProfile', driverProfileSchema);
```

### 1.2 Authentication Services

**Create:** `backend/services/RideSharingAuthService.js`
```javascript
const User = require('../models/User');
const RiderProfile = require('../models/RiderProfile');
const DriverProfile = require('../models/DriverProfile');
const OtpToken = require('../models/OtpToken');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class RideSharingAuthService {
  // Send OTP
  static async sendOTP(phone) {
    try {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store in OtpToken collection with 10-minute expiry
      const otpToken = new OtpToken({
        phone,
        otp,
        type: 'ridesharing',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0
      });
      
      await otpToken.save();

      // TODO: Send SMS via MSG91 or Twilio
      // await SMSService.send(phone, `Your NilaHub OTP is: ${otp}`);

      return {
        success: true,
        message: 'OTP sent successfully',
        expiresIn: 600 // seconds
      };
    } catch (error) {
      throw new Error(`OTP send failed: ${error.message}`);
    }
  }

  // Verify OTP
  static async verifyOTP(phone, otp, userType = 'rider') {
    try {
      // Find valid OTP
      const otpRecord = await OtpToken.findOne({
        phone,
        otp,
        type: 'ridesharing',
        expiresAt: { $gt: new Date() }
      });

      if (!otpRecord) {
        throw new Error('Invalid or expired OTP');
      }

      // Check attempts (max 3)
      if (otpRecord.attempts >= 3) {
        throw new Error('Too many failed attempts. Please request a new OTP.');
      }

      // Find or create user
      let user = await User.findOne({ phone });
      
      if (!user) {
        user = new User({
          phone,
          registrationType: userType,
          authMethod: 'otp'
        });
        await user.save();
      }

      // Create or update profile based on type
      if (userType === 'rider') {
        const riderProfile = await RiderProfile.findOne({ userId: user._id });
        if (!riderProfile) {
          new RiderProfile({ userId: user._id }).save();
        }
      } else if (userType === 'driver') {
        const driverProfile = await DriverProfile.findOne({ userId: user._id });
        if (!driverProfile) {
          new DriverProfile({ userId: user._id }).save();
        }
      }

      // Mark OTP as verified
      otpRecord.verified = true;
      otpRecord.verifiedAt = new Date();
      await otpRecord.save();

      // Generate JWT tokens
      const accessToken = jwt.sign(
        { userId: user._id, role: userType, phone },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '30d' }
      );

      return {
        success: true,
        user: {
          id: user._id,
          phone: user.phone,
          role: userType
        },
        accessToken,
        refreshToken
      };
    } catch (error) {
      // Increment attempts
      const otpRecord = await OtpToken.findOne({ phone, otp, type: 'ridesharing' });
      if (otpRecord) {
        otpRecord.attempts += 1;
        await otpRecord.save();
      }

      throw new Error(`OTP verification failed: ${error.message}`);
    }
  }

  // Social login (Google/Apple)
  static async socialLogin(profile, provider) {
    try {
      let user = await User.findOne({
        [`${provider}Id`]: profile.id
      });

      if (!user) {
        user = new User({
          [`${provider}Id`]: profile.id,
          email: profile.email,
          name: profile.name,
          profilePhoto: profile.picture || profile.photos?.[0]?.value,
          registrationType: 'rider',
          authMethod: provider
        });
        await user.save();

        // Create rider profile
        await new RiderProfile({ userId: user._id }).save();
      }

      // Generate tokens
      const accessToken = jwt.sign(
        { userId: user._id, role: 'rider' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '30d' }
      );

      return {
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: 'rider'
        },
        accessToken,
        refreshToken
      };
    } catch (error) {
      throw new Error(`Social login failed: ${error.message}`);
    }
  }

  // Get user profile with completion status
  static async getUserProfile(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user.registrationType === 'rider') {
        const riderProfile = await RiderProfile.findOne({ userId });
        return {
          user,
          profile: riderProfile,
          profileCompletion: riderProfile.profileCompletion,
          profileType: 'rider'
        };
      } else if (user.registrationType === 'driver') {
        const driverProfile = await DriverProfile.findOne({ userId });
        return {
          user,
          profile: driverProfile,
          kycStatus: driverProfile.kycStatus,
          profileType: 'driver'
        };
      }
    } catch (error) {
      throw new Error(`Get profile failed: ${error.message}`);
    }
  }
}

module.exports = RideSharingAuthService;
```

### 1.3 Auth API Routes

**Create:** `backend/routes/rideSharingAuth.js`
```javascript
const express = require('express');
const router = express.Router();
const RideSharingAuthService = require('../services/RideSharingAuthService');
const { authenticate } = require('../middleware/auth');

// Send OTP
router.post('/otp-send', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const result = await RideSharingAuthService.sendOTP(phone);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify OTP
router.post('/otp-verify', async (req, res) => {
  try {
    const { phone, otp, userType } = req.body;

    const result = await RideSharingAuthService.verifyOTP(
      phone,
      otp,
      userType || 'rider'
    );

    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      user: result.user,
      accessToken: result.accessToken
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Google Login
router.post('/google', async (req, res) => {
  try {
    const { googleIdToken } = req.body;
    // TODO: Verify token with Google
    // const profile = await verifyGoogleToken(googleIdToken);
    
    const result = await RideSharingAuthService.socialLogin(profile, 'google');
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Apple Login
router.post('/apple', async (req, res) => {
  try {
    const { appleIdToken } = req.body;
    // TODO: Verify token with Apple
    // const profile = await verifyAppleToken(appleIdToken);
    
    const result = await RideSharingAuthService.socialLogin(profile, 'apple');
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Get profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const profile = await RideSharingAuthService.getUserProfile(req.userId);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 1.4 Frontend Authentication Components

**Create:** `src/modules/ridesharing/components/auth/LoginFlow.js`
```javascript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LoginFlow.css';

const LoginFlow = () => {
  const [step, setStep] = useState('phone'); // phone, otp, userType, profile
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/ridesharing/auth/otp-send', { phone });
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/ridesharing/auth/otp-verify', {
        phone,
        otp,
        userType
      });

      // Store token
      localStorage.setItem('accessToken', response.data.accessToken);
      
      // Navigate based on role
      if (userType === 'driver') {
        navigate('/ridesharing/driver/kyc');
      } else {
        navigate('/ridesharing/rides');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {step === 'phone' && (
        <form onSubmit={handlePhoneSubmit} className="login-form">
          <h2>Welcome to NilaHub Rides</h2>
          <input
            type="tel"
            placeholder="Enter 10-digit phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            pattern="[0-9]{10}"
            required
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading || phone.length !== 10}>
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleOTPSubmit} className="login-form">
          <h2>Enter OTP</h2>
          <p>We've sent a 6-digit code to {phone}</p>
          <input
            type="text"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength="6"
            required
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading || otp.length !== 6}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
          <button type="button" onClick={() => setStep('phone')}>
            Change Phone Number
          </button>
        </form>
      )}
    </div>
  );
};

export default LoginFlow;
```

---

## 📦 Week 2: Driver Registration & KYC

### 2.1 KYC Upload Service

**Create:** `backend/services/DriverKYCService.js`
```javascript
const DriverProfile = require('../models/DriverProfile');
const aws = require('aws-sdk');
const s3 = new aws.S3();

class DriverKYCService {
  // Upload document to S3
  static async uploadDocument(file, documentType, driverId) {
    try {
      const fileName = `kyc/${driverId}/${documentType}/${Date.now()}-${file.originalname}`;
      
      const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'private'
      };

      const result = await s3.upload(params).promise();
      return result.Location;
    } catch (error) {
      throw new Error(`Document upload failed: ${error.message}`);
    }
  }

  // Submit KYC documents
  static async submitKYC(driverId, documents) {
    try {
      const driverProfile = await DriverProfile.findOne({ userId: driverId });

      if (!driverProfile) {
        throw new Error('Driver profile not found');
      }

      // Update documents
      if (documents.license) {
        driverProfile.license.documentUrl = documents.license;
        driverProfile.license.verified = false;
      }

      if (documents.vehicle) {
        driverProfile.vehicle.registrationCertificate.documentUrl = documents.vehicle;
        driverProfile.vehicle.registrationCertificate.verified = false;
      }

      if (documents.insurance) {
        driverProfile.insurance.documentUrl = documents.insurance;
        driverProfile.insurance.verified = false;
      }

      if (documents.pollution) {
        driverProfile.pollutionCertificate.documentUrl = documents.pollution;
        driverProfile.pollutionCertificate.verified = false;
      }

      if (documents.selfie) {
        driverProfile.faceVerification.selfieUrl = documents.selfie;
      }

      driverProfile.kycStatus = 'submitted';
      driverProfile.kycSubmittedDate = new Date();

      await driverProfile.save();

      // TODO: Trigger background verification job
      // await BackgroundVerificationQueue.add({ driverId });

      return {
        success: true,
        message: 'KYC submitted successfully',
        status: 'submitted'
      };
    } catch (error) {
      throw new Error(`KYC submission failed: ${error.message}`);
    }
  }

  // Check KYC status
  static async checkKYCStatus(driverId) {
    try {
      const driverProfile = await DriverProfile.findOne({ userId: driverId });

      if (!driverProfile) {
        throw new Error('Driver profile not found');
      }

      return {
        kycStatus: driverProfile.kycStatus,
        backgroundCheck: driverProfile.backgroundCheck.status,
        faceVerification: driverProfile.faceVerification.status,
        documentsVerified: {
          license: driverProfile.license.verified,
          vehicle: driverProfile.vehicle.registrationCertificate.verified,
          insurance: driverProfile.insurance.verified,
          pollution: driverProfile.pollutionCertificate.verified
        },
        rejectionReason: driverProfile.kycRejectionReason || null
      };
    } catch (error) {
      throw new Error(`Failed to check KYC status: ${error.message}`);
    }
  }
}

module.exports = DriverKYCService;
```

### 2.2 KYC Upload Component

**Create:** `src/modules/ridesharing/components/driver/KYCUpload.js`
```javascript
import React, { useState } from 'react';
import axios from 'axios';
import './KYCUpload.css';

const KYCUpload = ({ driverId, onComplete }) => {
  const [documents, setDocuments] = useState({
    license: null,
    vehicle: null,
    insurance: null,
    pollution: null,
    selfie: null
  });
  const [uploading, setUploading] = useState({});
  const [errors, setErrors] = useState({});

  const handleFileSelect = (e, docType) => {
    const file = e.target.files[0];
    
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) { // 5MB
      setErrors({ ...errors, [docType]: 'File size exceeds 5MB' });
      return;
    }

    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      setErrors({ ...errors, [docType]: 'Invalid file type' });
      return;
    }

    uploadDocument(file, docType);
  };

  const uploadDocument = async (file, docType) => {
    try {
      setUploading({ ...uploading, [docType]: true });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', docType);

      const response = await axios.post(
        `/api/ridesharing/driver/${driverId}/kyc-upload`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      setDocuments({ ...documents, [docType]: response.data.url });
      setErrors({ ...errors, [docType]: null });
    } catch (error) {
      setErrors({ ...errors, [docType]: error.response?.data?.error || 'Upload failed' });
    } finally {
      setUploading({ ...uploading, [docType]: false });
    }
  };

  const handleSubmit = async () => {
    try {
      setUploading({ submit: true });

      const response = await axios.post(
        `/api/ridesharing/driver/${driverId}/kyc-submit`,
        { documents }
      );

      onComplete();
    } catch (error) {
      setErrors({ submit: error.response?.data?.error || 'Submission failed' });
    } finally {
      setUploading({ submit: false });
    }
  };

  return (
    <div className="kyc-upload-container">
      <h2>Driver Verification</h2>

      {/* License Upload */}
      <div className="upload-section">
        <label>Driving License</label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => handleFileSelect(e, 'license')}
          disabled={uploading.license}
        />
        {documents.license && <div className="success">✓ Uploaded</div>}
        {errors.license && <div className="error">{errors.license}</div>}
      </div>

      {/* Vehicle RC Upload */}
      <div className="upload-section">
        <label>Vehicle Registration Certificate (RC)</label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => handleFileSelect(e, 'vehicle')}
          disabled={uploading.vehicle}
        />
        {documents.vehicle && <div className="success">✓ Uploaded</div>}
        {errors.vehicle && <div className="error">{errors.vehicle}</div>}
      </div>

      {/* Insurance Upload */}
      <div className="upload-section">
        <label>Insurance Certificate</label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => handleFileSelect(e, 'insurance')}
          disabled={uploading.insurance}
        />
        {documents.insurance && <div className="success">✓ Uploaded</div>}
        {errors.insurance && <div className="error">{errors.insurance}</div>}
      </div>

      {/* Pollution Certificate */}
      <div className="upload-section">
        <label>Pollution Certificate</label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => handleFileSelect(e, 'pollution')}
          disabled={uploading.pollution}
        />
        {documents.pollution && <div className="success">✓ Uploaded</div>}
        {errors.pollution && <div className="error">{errors.pollution}</div>}
      </div>

      {/* Selfie Upload */}
      <div className="upload-section">
        <label>Selfie for Verification</label>
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={(e) => handleFileSelect(e, 'selfie')}
          disabled={uploading.selfie}
        />
        {documents.selfie && <div className="success">✓ Uploaded</div>}
        {errors.selfie && <div className="error">{errors.selfie}</div>}
      </div>

      {errors.submit && <div className="error full-width">{errors.submit}</div>}

      <button
        className="submit-btn"
        onClick={handleSubmit}
        disabled={uploading.submit || !Object.values(documents).every(d => d)}
      >
        {uploading.submit ? 'Submitting...' : 'Submit for Verification'}
      </button>
    </div>
  );
};

export default KYCUpload;
```

---

## 🚗 Week 3: Ride Booking Engine

### 3.1 Fare Calculation Service

**Create:** `backend/services/FareCalculationService.js`
```javascript
class FareCalculationService {
  // Base fare configuration
  static RIDE_TYPES = {
    bike: { baseFare: 28, pricePerKm: 6, pricePerMin: 0.5 },
    auto: { baseFare: 42, pricePerKm: 9, pricePerMin: 1 },
    minicab: { baseFare: 54, pricePerKm: 12, pricePerMin: 1.2 },
    sedan: { baseFare: 74, pricePerKm: 14, pricePerMin: 1.5 },
    suv: { baseFare: 98, pricePerKm: 18, pricePerMin: 2 },
    premium: { baseFare: 120, pricePerKm: 22, pricePerMin: 2.5 },
    ev: { baseFare: 60, pricePerKm: 10, pricePerMin: 1.2 }
  };

  // Calculate distance using Haversine formula (fallback if Google Maps not available)
  static calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  // Estimate fare
  static estimateFare(rideType, distance, estimatedDuration = null) {
    const config = this.RIDE_TYPES[rideType];

    if (!config) {
      throw new Error(`Invalid ride type: ${rideType}`);
    }

    // Calculate based on distance
    let baseFare = config.baseFare;
    let distanceFare = distance * config.pricePerKm;
    let timeFare = 0;

    // Add time-based fare if available
    if (estimatedDuration) {
      const durationMinutes = estimatedDuration / 60;
      timeFare = durationMinutes * config.pricePerMin;
    }

    // Use higher of distance or time-based fare
    const fare = baseFare + Math.max(distanceFare, timeFare || 0);

    return {
      baseFare: Math.round(baseFare * 100) / 100,
      distanceFare: Math.round(distanceFare * 100) / 100,
      timeFare: Math.round(timeFare * 100) / 100,
      subtotal: Math.round(fare * 100) / 100,
      tax: Math.round(fare * 0.05 * 100) / 100, // 5% tax
      total: Math.round((fare + fare * 0.05) * 100) / 100,
      surgeFactor: 1,
      discount: 0
    };
  }

  // Apply surge pricing
  static applySurge(fareBreakdown, surgeFactor) {
    const surtotal = fareBreakdown.subtotal * surgeFactor;
    const tax = surtotal * 0.05;

    return {
      ...fareBreakdown,
      subtotal: Math.round(surtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round((surtotal + tax) * 100) / 100,
      surgeFactor
    };
  }

  // Apply coupon discount
  static applyCoupon(fareBreakdown, coupon) {
    let discount = 0;

    if (coupon.discountType === 'percentage') {
      discount = (fareBreakdown.subtotal * coupon.discountValue) / 100;
    } else {
      discount = coupon.discountValue;
    }

    // Ensure discount doesn't exceed fare
    discount = Math.min(discount, fareBreakdown.subtotal);

    const finalTotal = Math.max(0, fareBreakdown.total - discount);

    return {
      ...fareBreakdown,
      discount: Math.round(discount * 100) / 100,
      total: Math.round(finalTotal * 100) / 100,
      couponCode: coupon.code
    };
  }
}

module.exports = FareCalculationService;
```

### 3.2 Ride Booking API

**Create:** `backend/routes/rideSharingRides.js`
```javascript
const express = require('express');
const router = express.Router();
const RideRequest = require('../models/RideRequest');
const FareCalculationService = require('../services/FareCalculationService');
const { authenticate } = require('../middleware/auth');

// Estimate fare
router.post('/estimate-fare', authenticate, async (req, res) => {
  try {
    const { rideType, pickup, destination } = req.body;

    // Validate input
    if (!rideType || !pickup || !destination) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate distance
    const distance = FareCalculationService.calculateDistance(
      pickup.lat,
      pickup.lng,
      destination.lat,
      destination.lng
    );

    // Estimate fare
    const fareEstimate = FareCalculationService.estimateFare(rideType, distance);

    res.json({
      distance: Math.round(distance * 100) / 100,
      estimatedDuration: Math.round((distance / 20) * 60), // Assume 20 km/h average
      fareBreakdown: fareEstimate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Book ride
router.post('/book', authenticate, async (req, res) => {
  try {
    const {
      rideType,
      pickup,
      destination,
      paymentMethod,
      couponCode
    } = req.body;

    // Create ride request
    const distance = FareCalculationService.calculateDistance(
      pickup.lat,
      pickup.lng,
      destination.lat,
      destination.lng
    );

    const fareEstimate = FareCalculationService.estimateFare(rideType, distance);

    const rideRequest = new RideRequest({
      customerId: req.userId,
      pickup: {
        address: pickup.address,
        lat: pickup.lat,
        lng: pickup.lng
      },
      destination: {
        address: destination.address,
        lat: destination.lat,
        lng: destination.lng
      },
      vehicleType: rideType,
      estimatedFare: fareEstimate.total,
      paymentMethod,
      status: 'requested'
    });

    await rideRequest.save();

    // TODO: Trigger driver matching
    // await DriverMatchingQueue.add({ rideId: rideRequest._id });

    res.json({
      rideId: rideRequest._id,
      status: 'requested',
      estimatedFare: fareEstimate.total,
      eta: Math.round((distance / 20) * 60) // seconds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get ride details
router.get('/:rideId', authenticate, async (req, res) => {
  try {
    const ride = await RideRequest.findById(req.params.rideId)
      .populate('customerId', 'name phone')
      .populate('driverId', 'name phone rating vehicle');

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    res.json(ride);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel ride
router.put('/:rideId/cancel', authenticate, async (req, res) => {
  try {
    const ride = await RideRequest.findById(req.params.rideId);

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status === 'completed' || ride.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot cancel this ride' });
    }

    ride.status = 'cancelled';
    ride.cancelledBy = 'rider';
    ride.cancelReason = req.body.reason || 'User requested cancellation';
    await ride.save();

    res.json({ success: true, message: 'Ride cancelled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

## ⏱️ Quick Setup Checklist (Week 1-3)

### Database Setup
- [ ] Create MongoDB collections
- [ ] Add indexes for geospatial queries
- [ ] Create sample data

### Backend Services
- [ ] ✅ Authentication service
- [ ] ✅ KYC upload service
- [ ] ✅ Fare calculation service
- [ ] API routes setup

### Frontend Components
- [ ] ✅ Login flow
- [ ] ✅ KYC upload
- [ ] ✅ Ride booking UI
- [ ] Style CSS files

### Testing
- [ ] Unit tests for services
- [ ] Integration tests for APIs
- [ ] E2E tests for critical flows

---

## 🔧 Environment Variables

```env
# .env
NODE_ENV=development
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nilahub
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret

# AWS
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=nilahub-uploads
AWS_REGION=ap-south-1

# Google Maps
GOOGLE_MAPS_API_KEY=xxx

# Firebase (for OTP)
FIREBASE_PROJECT_ID=xxx
FIREBASE_PRIVATE_KEY=xxx
FIREBASE_CLIENT_EMAIL=xxx

# Razorpay (for payments)
RAZORPAY_KEY_ID=xxx
RAZORPAY_KEY_SECRET=xxx

# Frontend
REACT_APP_API_URL=http://localhost:5000
REACT_APP_GOOGLE_MAPS_API=xxx
```

---

## 📖 Next Steps

**Week 4:**
- [ ] Driver matching engine
- [ ] Live tracking with WebSocket
- [ ] Real-time notifications

**Week 5-6:**
- [ ] Rating system
- [ ] Payment integration (Razorpay)
- [ ] SOS emergency features

---

## 🎯 Success Criteria for Phase 1

✅ All 9 subphases complete  
✅ 100+ test rides executed  
✅ 50+ driver registrations  
✅ <5% ride cancellation rate  
✅ 4.5+ average rating  
✅ All APIs tested  
✅ Frontend fully functional  

**Estimated effort:** 3-4 weeks, 3-4 developers

---

**Last Updated:** May 9, 2026  
**Status:** Ready for Development
