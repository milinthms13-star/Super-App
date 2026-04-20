const mongoose = require('mongoose');

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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', UserSchema);
