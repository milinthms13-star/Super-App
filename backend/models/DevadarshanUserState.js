const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    nakshatra: { type: String, required: true, trim: true },
    createdAt: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    createdAt: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const devadarshanUserStateSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    favoriteTempleIds: [{ type: String, trim: true }],
    notifyEventIds: [{ type: String, trim: true }],
    savedLiveTempleIds: [{ type: String, trim: true }],
    profile: {
      primaryNakshatra: { type: String, default: '', trim: true },
      preferredPooja: { type: String, default: 'Archana', trim: true },
      phone: { type: String, default: '', trim: true },
      reminderBirthday: { type: Boolean, default: true },
      reminderMonthly: { type: Boolean, default: true },
      reminderYearly: { type: Boolean, default: true },
    },
    familyMembers: { type: [familyMemberSchema], default: [] },
    notifications: { type: [notificationSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DevadarshanUserState', devadarshanUserStateSchema);

