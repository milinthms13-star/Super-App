const mongoose = require('mongoose');

const normalizeUsername = (value = '') => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9_-]/g, '_')
  .replace(/_+/g, '_')
  .replace(/^_+|_+$/g, '');

const deriveUsername = ({ username, email, name }) => {
  const explicitUsername = normalizeUsername(username);
  if (explicitUsername.length >= 3) {
    return explicitUsername.slice(0, 20);
  }

  const emailLocalPart = String(email || '').split('@')[0];
  const namePart = String(name || '').replace(/\s+/g, '_');
  const baseCandidate = normalizeUsername(emailLocalPart || namePart || 'user');
  const safeBase = baseCandidate.length >= 3 ? baseCandidate : `${baseCandidate}usr`;

  return safeBase.slice(0, 20);
};

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-zA-Z0-9_-]+$/,
      default: function defaultUsername() {
        return deriveUsername(this);
      },
    },
    chatUsername: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-zA-Z0-9_-]+$/,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: 'User',
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerifiedAt: {
      type: Date,
      default: null,
    },
    authMethod: {
      type: String,
      default: 'email_otp',
      trim: true,
    },
    mpinHash: {
      type: String,
      default: '',
      select: false,
    },
    mpinEnabled: {
      type: Boolean,
      default: false,
    },
    mpinFailedAttempts: {
      type: Number,
      default: 0,
    },
    mpinBlockedUntil: {
      type: Date,
      default: null,
    },
    mpinUpdatedAt: {
      type: Date,
      default: null,
    },
    age: {
      type: Number,
      default: null,
    },
    gender: {
      type: String,
      default: '',
      trim: true,
    },
    religion: {
      type: String,
      default: '',
      trim: true,
    },
    caste: {
      type: String,
      default: '',
      trim: true,
    },
    community: {
      type: String,
      default: '',
      trim: true,
    },
    education: {
      type: String,
      default: '',
      trim: true,
    },
    profession: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    maritalStatus: {
      type: String,
      default: '',
      trim: true,
    },
    familyDetails: {
      type: String,
      default: '',
      trim: true,
    },
    bio: {
      type: String,
      default: '',
      trim: true,
    },
    languages: {
      type: [String],
      default: [],
    },
    hobbies: {
      type: [String],
      default: [],
    },
    privacy: {
      hidePhone: {
        type: Boolean,
        default: false,
      },
      hidePhotos: {
        type: Boolean,
        default: false,
      },
    },
    visibility: {
      visibleViaPhone: {
        type: Boolean,
        default: true,
      },
      visibleViaEmail: {
        type: Boolean,
        default: true,
      },
      visibleViaUsername: {
        type: Boolean,
        default: true,
      },
    },
    contactMeans: {
      availableForChat: {
        type: Boolean,
        default: true,
      },
      availableForVoiceCall: {
        type: Boolean,
        default: true,
      },
      availableForVideoCall: {
        type: Boolean,
        default: true,
      },
    },
    premiumOnlyContact: {
      type: Boolean,
      default: false,
    },
    businessName: {
      type: String,
      default: '',
      trim: true,
    },
    registrationType: {
      type: String,
      default: 'user',
      trim: true,
    },
    role: {
      type: String,
      default: 'user',
      trim: true,
    },
    roles: {
      type: [String],
      default: ['user'],
    },
    selectedBusinessCategories: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    selectedCategoryDetails: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    cart: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    favorites: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    ecommerceSavedSearches: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    ecommerceRecentlyViewed: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    ecommerceSearchHistory: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    ecommerceRefillReminders: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    classifiedsSavedSearches: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    classifiedsRecentlyViewed: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    savedAddresses: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    preferences: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        language: 'en',
      }),
    },
    classifiedsTotalRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5.0
    },
    classifiedsReviewCount: {
      type: Number,
      min: 0,
      default: 0
    },
    matrimonialTotalRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5.0
    },
    matrimonialReviewCount: {
      type: Number,
      min: 0,
      default: 0
    },
    matrimonialInterestsSent: {
      type: Number,
      default: 0
    },
    matrimonialInterestsReceived: {
      type: Number,
      default: 0
    },
    invitationsSent: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invitation',
      }
    ],
    invitationsReceived: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invitation',
      }
    ],
    googleId: {
      type: String,
      sparse: true,
      index: true
    },
    googleEmails: [{
      type: String,
      lowercase: true,
      trim: true
    }],

    // KYC fields
    kycStatus: {
      type: String,
      enum: ['not_submitted', 'pending', 'approved', 'rejected'],
      default: 'not_submitted',
      index: true
    },
    kycDocuments: [{
      type: mongoose.Schema.Types.Mixed, // {type, url, uploadedAt, status, remarks}
      default: []
    }],
    kycHistory: [{
      status: String,
      changedAt: Date,
      remarks: String,
      adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    kycLastChecked: Date
  },
  {
    timestamps: true,
  }

);

UserSchema.index({ classifiedsTotalRating: -1 });
UserSchema.index({ classifiedsReviewCount: 1 });

UserSchema.pre('validate', function ensureUsername(next) {
  if (!this.username || String(this.username).trim().length === 0) {
    this.username = deriveUsername(this);
  } else {
    this.username = normalizeUsername(this.username).slice(0, 20);
  }

  if (this.username.length < 3) {
    this.username = `${this.username}usr`.slice(0, 20);
  }

  next();
});


// Profile completion score (virtual)
UserSchema.virtual('profileCompletionScore').get(function () {
  // List of important fields for scoring
  const fields = [
    'name', 'avatar', 'phone', 'age', 'gender', 'religion', 'caste', 'community',
    'education', 'profession', 'location', 'maritalStatus', 'familyDetails', 'bio',
    'languages', 'hobbies', 'privacy', 'businessName', 'registrationType', 'role',
    'cart', 'favorites', 'savedAddresses', 'preferences'
  ];
  let filled = 0;
  fields.forEach(f => {
    const val = this[f];
    if (Array.isArray(val)) {
      if (val.length > 0) filled++;
    } else if (val && typeof val === 'object') {
      if (Object.keys(val).length > 0) filled++;
    } else if (val !== undefined && val !== null && val !== '') {
      filled++;
    }
  });
  return Math.round((filled / fields.length) * 100);
});

UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', UserSchema);
