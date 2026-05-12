const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BillpayTransaction",
      required: true,
    },
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
    },
    type: {
      type: String,
      enum: [
        "Paid but bill not updated",
        "Wrong amount",
        "Refund delay",
        "Duplicate payment",
        "Other",
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
      minlength: 20,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["Open", "In Review", "Resolved", "Closed", "Escalated"],
      default: "Open",
      index: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    resolution: {
      type: String,
      maxlength: 1000,
    },
    refundAmount: {
      type: Number,
      min: 0,
    },
    refundProcessed: {
      type: Boolean,
      default: false,
    },
    slaBreachedAt: {
      type: Date,
    },
    assignedTo: {
      type: String,
      maxlength: 100,
    },
    notes: [{
      text: String,
      addedBy: String,
      addedAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  { timestamps: true }
);

// Index for efficient queries
disputeSchema.index({ userId: 1, status: 1 });
disputeSchema.index({ transactionId: 1 });
disputeSchema.index({ status: 1 });
disputeSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Dispute", disputeSchema);
