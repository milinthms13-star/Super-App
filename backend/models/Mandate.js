const mongoose = require("mongoose");

const mandateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
      required: true,
    },
    nickname: {
      type: String,
      required: true,
      maxlength: 100,
    },
    maxAmount: {
      type: Number,
      required: true,
      min: 1,
      max: 100000,
    },
    status: {
      type: String,
      enum: ["Active", "Paused", "Cancelled", "Expired"],
      default: "Active",
      index: true,
    },
    frequency: {
      type: String,
      enum: ["Monthly", "Quarterly", "Half-Yearly", "Yearly", "On-Demand"],
      default: "Monthly",
    },
    nextRunDate: {
      type: Date,
      required: true,
    },
    lastRunDate: {
      type: Date,
    },
    lastRunStatus: {
      type: String,
      enum: ["Success", "Failed", "Pending"],
    },
    lastRunAmount: {
      type: Number,
    },
    paymentMethod: {
      type: String,
      enum: ["UPI", "Card", "NetBanking", "Wallet"],
      required: true,
    },
    failureCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxFailureRetries: {
      type: Number,
      default: 3,
    },
    authorizedAt: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
    },
    pausedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    cancelReason: {
      type: String,
      maxlength: 500,
    },
    notifications: {
      enabled: {
        type: Boolean,
        default: true,
      },
      channels: {
        type: [String],
        enum: ["Email", "SMS", "Push"],
        default: ["Email", "SMS"],
      },
      reminderDaysBeforeDue: {
        type: Number,
        default: 2,
      },
    },
  },
  { timestamps: true }
);

// Index for efficient queries
mandateSchema.index({ userId: 1, status: 1 });
mandateSchema.index({ billId: 1 });
mandateSchema.index({ nextRunDate: 1 });
mandateSchema.index({ status: 1, nextRunDate: 1 });

module.exports = mongoose.model("Mandate", mandateSchema);
