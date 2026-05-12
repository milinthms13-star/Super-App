const mongoose = require("mongoose");

const billpayTransactionSchema = new mongoose.Schema(
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
    billerName: {
      type: String,
      required: true,
      maxlength: 200,
    },
    category: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      max: 100000,
    },
    status: {
      type: String,
      enum: ["Pending", "Success", "Failed"],
      default: "Pending",
      index: true,
    },
    method: {
      type: String,
      enum: ["UPI", "Card", "NetBanking", "Wallet"],
      required: true,
    },
    authMode: {
      type: String,
      enum: ["PIN + OTP", "Biometric + OTP"],
      required: true,
    },
    otpUsed: {
      type: Boolean,
      default: false,
    },
    amountDeducted: {
      type: Boolean,
      default: false,
    },
    refundStatus: {
      type: String,
      enum: ["Not Applicable", "Refund Initiated", "Refund Failed", "Refund Completed"],
      default: "Not Applicable",
    },
    refundAmount: {
      type: Number,
      min: 0,
    },
    refundInitiatedAt: {
      type: Date,
    },
    refundCompletedAt: {
      type: Date,
    },
    billerReference: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
      index: true,
    },
    receiptId: {
      type: String,
      required: true,
      unique: true,
      maxlength: 50,
    },
    failureReason: {
      type: String,
      maxlength: 500,
    },
    razorpayOrderId: {
      type: String,
      maxlength: 50,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      maxlength: 50,
      index: true,
    },
    razorpaySignature: {
      type: String,
      maxlength: 100,
    },
    paidAt: {
      type: Date,
    },
    ipAddress: {
      type: String,
      maxlength: 45,
    },
    userAgent: {
      type: String,
      maxlength: 500,
    },
    isAutopay: {
      type: Boolean,
      default: false,
    },
    mandateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mandate",
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
billpayTransactionSchema.index({ userId: 1, createdAt: -1 });
billpayTransactionSchema.index({ billId: 1 });
billpayTransactionSchema.index({ status: 1 });
billpayTransactionSchema.index({ razorpayOrderId: 1 });
billpayTransactionSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("BillpayTransaction", billpayTransactionSchema);
