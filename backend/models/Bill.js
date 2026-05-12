const mongoose = require("mongoose");

const billSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    nickname: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true,
    },
    billerId: {
      type: String,
      required: true,
      enum: [
        "KSEB",
        "KWA",
        "BSES-LPG",
        "AIRTEL-DTH",
        "JIO-BB",
        "AXIS-INS",
        "HDFC-EMI",
        "SBI-CC",
        "KOCHI-MUNI",
        "FASTAG-NHAI",
      ],
    },
    billerName: {
      type: String,
      required: true,
      maxlength: 200,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Electricity",
        "Water",
        "LPG Gas",
        "DTH",
        "Broadband",
        "Mobile Postpaid",
        "FASTag",
        "Insurance Premium",
        "Loan EMI",
        "Education Fees",
        "Municipal Tax",
        "Piped Gas",
        "Housing Society",
        "Hospital",
        "Credit Card",
        "Cable TV",
        "Subscription",
        "Clubs and Associations",
        "Landline",
        "Municipality Services",
        "NCMC Recharge",
        "Recurring Deposits",
        "Donations",
        "Rental Collection",
        "OTT Services",
      ],
    },
    consumerId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      validate: {
        validator: function (v) {
          return /^[A-Z0-9\-]{3,50}$/.test(v);
        },
        message: "Consumer ID must be 3-50 alphanumeric characters",
      },
    },
    mobile: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^[6-9]\d{9}$/.test(v);
        },
        message: "Invalid Indian mobile number",
      },
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      max: 100000,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Due", "Paid", "Overdue", "Cancelled"],
      default: "Due",
    },
    autopayEnabled: {
      type: Boolean,
      default: false,
    },
    familyMember: {
      type: String,
      enum: ["Self", "Spouse", "Mother", "Father", "Child", "Other"],
      default: "Self",
    },
    discoveredVia: {
      type: String,
      enum: ["Manual", "BBPS Directory", "Auto-Fetch"],
      default: "Manual",
    },
    lastPaidDate: {
      type: Date,
    },
    lastPaidAmount: {
      type: Number,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
billSchema.index({ userId: 1, status: 1 });
billSchema.index({ userId: 1, dueDate: 1 });
billSchema.index({ consumerId: 1 });
billSchema.index({ mobile: 1 });

module.exports = mongoose.model("Bill", billSchema);
