/**
 * BillPay Service Layer
 * Business logic for bill discovery, payment processing, disputes, and mandates
 */

const Bill = require("../models/Bill");
const BillpayTransaction = require("../models/BillpayTransaction");
const Dispute = require("../models/Dispute");
const Mandate = require("../models/Mandate");
const crypto = require("crypto");

const BBPS_BILLERS = [
  { id: "KSEB", name: "Kerala State Electricity Board", category: "Electricity" },
  { id: "KWA", name: "Kerala Water Authority", category: "Water" },
  { id: "BSES-LPG", name: "Bharat LPG Utility", category: "LPG Gas" },
  { id: "AIRTEL-DTH", name: "Airtel DTH", category: "DTH" },
  { id: "JIO-BB", name: "JioFiber Broadband", category: "Broadband" },
  { id: "AXIS-INS", name: "Axis Insurance Services", category: "Insurance Premium" },
  { id: "HDFC-EMI", name: "HDFC Loan EMI", category: "Loan EMI" },
  { id: "SBI-CC", name: "SBI Card", category: "Credit Card" },
  { id: "KOCHI-MUNI", name: "Kochi Municipal Tax", category: "Municipal Tax" },
  { id: "FASTAG-NHAI", name: "NHAI FASTag Recharge", category: "FASTag" },
];

const BILLPAY_COMMISSION_RATE = 0.0045; // 0.45%

class BillPayService {
  /**
   * Get all bills for a user
   */
  async getUserBills(userId) {
    try {
      const bills = await Bill.find({ userId }).sort({ dueDate: 1 });
      return bills;
    } catch (error) {
      throw new Error(`Failed to fetch bills: ${error.message}`);
    }
  }

  /**
   * Update bill autopay flag
   */
  async updateBillAutopay(userId, billId, enabled) {
    try {
      const bill = await Bill.findOne({ _id: billId, userId });
      if (!bill) {
        throw new Error("Bill not found");
      }

      bill.autopayEnabled = Boolean(enabled);
      await bill.save();

      return bill;
    } catch (error) {
      throw new Error(`Failed to update bill autopay: ${error.message}`);
    }
  }

  /**
   * Discover bill by mobile number or consumer ID
   */
  async discoverBill(userId, identifierType, identifierValue, preferredCategory) {
    try {
      let query = { userId };

      if (identifierType === "Mobile Number") {
        query.mobile = identifierValue;
      } else if (identifierType === "Consumer ID") {
        query.consumerId = identifierValue;
      }

      // Check if bill already exists
      const existingBill = await Bill.findOne(query);
      if (existingBill) {
        return {
          status: "found",
          bill: existingBill,
          message: `Pending bill discovered for ${existingBill.billerName}.`,
        };
      }

      // Generate new bill from BBPS directory
      const selectedBiller = preferredCategory
        ? BBPS_BILLERS.find((b) => b.category === preferredCategory) || BBPS_BILLERS[0]
        : BBPS_BILLERS[Math.floor(Math.random() * BBPS_BILLERS.length)];

      const newBill = new Bill({
        userId,
        nickname: `${selectedBiller.category} Auto-Fetch`,
        billerId: selectedBiller.id,
        billerName: selectedBiller.name,
        category: selectedBiller.category,
        consumerId:
          identifierType === "Consumer ID"
            ? identifierValue
            : `${selectedBiller.id}-${Math.floor(100000 + Math.random() * 900000)}`,
        mobile:
          identifierType === "Mobile Number"
            ? identifierValue
            : `${Math.floor(9000000000 + Math.random() * 99999999)}`,
        amount: 500 + Math.floor(Math.random() * 2200),
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: "Due",
        autopayEnabled: false,
        familyMember: "Self",
        discoveredVia: "BBPS Directory",
      });

      await newBill.save();

      return {
        status: "created",
        bill: newBill,
        message: "Bill discovered via BBPS directory and added to Saved Bills.",
      };
    } catch (error) {
      throw new Error(`Bill discovery failed: ${error.message}`);
    }
  }

  /**
   * Create Razorpay order for payment
   */
  async createPaymentOrder(userId, billId, amount) {
    try {
      // Verify bill ownership
      const bill = await Bill.findOne({ _id: billId, userId });
      if (!bill) {
        throw new Error("Bill not found or unauthorized");
      }

      // Validate amount doesn't exceed bill amount by 10%
      if (amount > bill.amount * 1.1) {
        throw new Error("Payment amount exceeds bill by more than 10%");
      }

      // Create Razorpay order (will be handled by route)
      // This service just prepares the data
      const orderData = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: "INR",
        receipt: `billpay-${billId}-${Date.now()}`,
        notes: {
          userId: userId.toString(),
          billId: billId.toString(),
          billerName: bill.billerName,
          category: bill.category,
        },
      };

      return orderData;
    } catch (error) {
      throw new Error(`Order creation failed: ${error.message}`);
    }
  }

  /**
   * Verify payment signature and process
   */
  async verifyPaymentSignature(orderId, paymentId, signature) {
    try {
      const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "test_secret";

      const hmac = crypto.createHmac("sha256", razorpayKeySecret);
      hmac.update(`${orderId}|${paymentId}`);
      const expectedSignature = hmac.digest("hex");

      if (signature !== expectedSignature) {
        throw new Error("Payment signature verification failed");
      }

      return true;
    } catch (error) {
      throw new Error(`Signature verification failed: ${error.message}`);
    }
  }

  /**
   * Record successful payment and update bill status
   */
  async recordPayment(userId, billId, amount, paymentData) {
    try {
      const bill = await Bill.findOne({ _id: billId, userId });
      if (!bill) {
        throw new Error("Bill not found");
      }

      const txnId = `TXN-${Date.now().toString().slice(-6)}`;
      const billerReference = `BBPS-${bill.billerId}-${Math.floor(100000 + Math.random() * 900000)}`;
      const receiptId = `RCPT-${txnId.slice(-6)}`;

      // Create transaction record
      const transaction = new BillpayTransaction({
        userId,
        billId,
        billerName: bill.billerName,
        category: bill.category,
        amount,
        status: "Success",
        method: paymentData.method,
        authMode: paymentData.authMode,
        otpUsed: true,
        amountDeducted: true,
        refundStatus: "Not Applicable",
        billerReference,
        receiptId,
        razorpayOrderId: paymentData.razorpayOrderId,
        razorpayPaymentId: paymentData.razorpayPaymentId,
        razorpaySignature: paymentData.razorpaySignature,
        paidAt: new Date(),
        ipAddress: paymentData.ipAddress,
        userAgent: paymentData.userAgent,
      });

      await transaction.save();

      // Update bill status
      bill.status = "Paid";
      bill.lastPaidDate = new Date();
      bill.lastPaidAmount = amount;
      await bill.save();

      return {
        transactionId: transaction._id,
        txnId,
        receiptId,
        billerReference,
        amount,
      };
    } catch (error) {
      throw new Error(`Payment recording failed: ${error.message}`);
    }
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(userId, limit = 50, offset = 0) {
    try {
      const transactions = await BillpayTransaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .populate("billId", "nickname billerName");

      const total = await BillpayTransaction.countDocuments({ userId });

      return { transactions, total, limit, offset };
    } catch (error) {
      throw new Error(`Failed to fetch transaction history: ${error.message}`);
    }
  }

  /**
   * Get receipt details
   */
  async getReceipt(userId, transactionId) {
    try {
      const transaction = await BillpayTransaction.findOne({
        _id: transactionId,
        userId,
      }).populate("billId");

      if (!transaction) {
        throw new Error("Receipt not found");
      }

      return transaction;
    } catch (error) {
      throw new Error(`Failed to fetch receipt: ${error.message}`);
    }
  }

  /**
   * File a dispute
   */
  async fileDispute(userId, transactionId, type, description) {
    try {
      const transaction = await BillpayTransaction.findOne({
        _id: transactionId,
        userId,
      });

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      const dispute = new Dispute({
        userId,
        transactionId,
        billId: transaction.billId,
        type,
        description,
        status: "Open",
        priority: transaction.amount >= 5000 ? "High" : "Medium",
      });

      await dispute.save();

      return dispute;
    } catch (error) {
      throw new Error(`Failed to file dispute: ${error.message}`);
    }
  }

  /**
   * Get disputes for a user
   */
  async getUserDisputes(userId, limit = 20, offset = 0) {
    try {
      const disputes = await Dispute.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .populate("transactionId");

      const total = await Dispute.countDocuments({ userId });

      return { disputes, total, limit, offset };
    } catch (error) {
      throw new Error(`Failed to fetch disputes: ${error.message}`);
    }
  }

  /**
   * Set up autopay mandate
   */
  async setupMandate(userId, billId, maxAmount, frequency, paymentMethod) {
    try {
      const bill = await Bill.findOne({ _id: billId, userId });
      if (!bill) {
        throw new Error("Bill not found");
      }

      // Check if mandate already exists
      const existingMandate = await Mandate.findOne({
        userId,
        billId,
        status: { $in: ["Active", "Paused"] },
      });

      if (existingMandate) {
        throw new Error("Active mandate already exists for this bill");
      }

      const nextRunDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const mandate = new Mandate({
        userId,
        billId,
        nickname: bill.nickname,
        maxAmount,
        status: "Active",
        frequency,
        nextRunDate,
        paymentMethod,
        authorizedAt: new Date(),
      });

      await mandate.save();

      return mandate;
    } catch (error) {
      throw new Error(`Mandate setup failed: ${error.message}`);
    }
  }

  /**
   * Get active mandates for a user
   */
  async getUserMandates(userId) {
    try {
      const mandates = await Mandate.find({
        userId,
        status: { $in: ["Active", "Paused"] },
      }).populate("billId", "nickname billerName");

      return mandates;
    } catch (error) {
      throw new Error(`Failed to fetch mandates: ${error.message}`);
    }
  }

  /**
   * Update mandate status
   */
  async updateMandateStatus(userId, mandateId, newStatus, reason = null, maxAmount = null) {
    try {
      const mandate = await Mandate.findOne({ _id: mandateId, userId });
      if (!mandate) {
        throw new Error("Mandate not found");
      }

      if (newStatus) {
        const validStatuses = ["Active", "Paused", "Cancelled"];
        if (!validStatuses.includes(newStatus)) {
          throw new Error("Invalid mandate status");
        }

        mandate.status = newStatus;

        if (newStatus === "Paused") {
          mandate.pausedAt = new Date();
        } else if (newStatus === "Cancelled") {
          mandate.cancelledAt = new Date();
          mandate.cancelReason = reason;
        } else if (newStatus === "Active") {
          mandate.pausedAt = null;
        }
      }

      if (maxAmount !== null && maxAmount !== undefined) {
        if (typeof maxAmount !== "number" || maxAmount < 1 || maxAmount > 100000) {
          throw new Error("Invalid max amount");
        }
        mandate.maxAmount = maxAmount;
      }

      await mandate.save();

      return mandate;
    } catch (error) {
      throw new Error(`Failed to update mandate: ${error.message}`);
    }
  }

  /**
   * Get admin analytics
   */
  async getAdminAnalytics(dateRange = "thisMonth") {
    try {
      const now = new Date();
      let startDate;

      switch (dateRange) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "thisWeek":
          startDate = new Date(now.setDate(now.getDate() - now.getDay()));
          break;
        case "thisMonth":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "last30Days":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
          break;
        case "quarter":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 90);
          break;
        case "thisYear":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const transactions = await BillpayTransaction.find({
        createdAt: { $gte: startDate },
      });

      const successCount = transactions.filter((t) => t.status === "Success").length;
      const failureCount = transactions.filter((t) => t.status === "Failed").length;
      const successRate =
        transactions.length > 0 ? ((successCount / transactions.length) * 100).toFixed(1) : "0.0";

      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      const commissionEarned = transactions
        .filter((t) => t.status === "Success")
        .reduce((sum, t) => sum + t.amount * BILLPAY_COMMISSION_RATE, 0);

      const categoryBreakdown = transactions.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      }, {});

      const topCategories = Object.entries(categoryBreakdown)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const billerWise = Object.entries(
        transactions.reduce((acc, transaction) => {
          if (!acc[transaction.billerName]) {
            acc[transaction.billerName] = { volume: 0, success: 0, failed: 0, amount: 0 };
          }
          acc[transaction.billerName].volume += 1;
          acc[transaction.billerName].amount += Number(transaction.amount || 0);
          if (transaction.status === "Success") {
            acc[transaction.billerName].success += 1;
          } else if (transaction.status === "Failed") {
            acc[transaction.billerName].failed += 1;
          }
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, ...value }));

      const pendingRefunds = transactions.filter(
        (t) => t.status === "Failed" && t.amountDeducted && t.refundStatus !== "Refund Completed"
      ).length;

      const disputes = await Dispute.countDocuments({
        createdAt: { $gte: startDate },
      });

      return {
        totalTransactions: transactions.length,
        successCount,
        failureCount,
        successRate,
        totalAmount,
        commissionEarned,
        topCategories,
        billerWise,
        pendingRefunds,
        disputeTickets: disputes,
        dateRange,
        startDate,
        endDate: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to generate analytics: ${error.message}`);
    }
  }
}

module.exports = new BillPayService();
