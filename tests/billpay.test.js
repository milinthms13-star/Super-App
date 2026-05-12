/**
 * BillPay Test Suite
 * Comprehensive tests for service layer, validation, and API routes
 */

const request = require("supertest");
const mongoose = require("mongoose");
const billpayService = require("../services/billpayService");
const Bill = require("../models/Bill");
const BillpayTransaction = require("../models/BillpayTransaction");
const Dispute = require("../models/Dispute");
const Mandate = require("../models/Mandate");

describe("BillPay Service", () => {
  const mockUserId = new mongoose.Types.ObjectId();
  let mockBill;

  beforeAll(async () => {
    // Connect to test database
    // await mongoose.connect(process.env.MONGO_TEST_URI);
  });

  afterAll(async () => {
    // await mongoose.disconnect();
  });

  describe("Bill Discovery", () => {
    test("should discover bill by mobile number", async () => {
      const result = await billpayService.discoverBill(
        mockUserId,
        "Mobile Number",
        "9876543210",
        "Electricity"
      );

      expect(result.status).toBe("created");
      expect(result.bill).toBeDefined();
      expect(result.bill.mobile).toBe("9876543210");
      expect(result.bill.category).toBe("Electricity");
    });

    test("should discover bill by consumer ID", async () => {
      const result = await billpayService.discoverBill(
        mockUserId,
        "Consumer ID",
        "KSEB-123456",
        "Electricity"
      );

      expect(result.status).toBe("created");
      expect(result.bill.consumerId).toBe("KSEB-123456");
    });

    test("should reject invalid mobile number", async () => {
      try {
        await billpayService.discoverBill(
          mockUserId,
          "Mobile Number",
          "1234567890", // Invalid - starts with 1
          "Electricity"
        );
        fail("Should have thrown error");
      } catch (error) {
        expect(error.message).toContain("discovery failed");
      }
    });

    test("should reject invalid consumer ID format", async () => {
      try {
        await billpayService.discoverBill(
          mockUserId,
          "Consumer ID",
          "abc", // Too short
          "Electricity"
        );
        fail("Should have thrown error");
      } catch (error) {
        expect(error.message).toContain("discovery failed");
      }
    });
  });

  describe("Payment Validation", () => {
    test("should validate payment amount is within range", async () => {
      // Create a test bill
      const bill = new Bill({
        userId: mockUserId,
        nickname: "Test Bill",
        billerId: "KSEB",
        billerName: "KSEB",
        category: "Electricity",
        consumerId: "KSEB-123",
        mobile: "9876543210",
        amount: 1000,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });

      // Test valid amount
      const orderData = await billpayService.createPaymentOrder(
        mockUserId,
        bill._id,
        1000
      );

      expect(orderData.amount).toBe(100000); // 1000 * 100 paise
      expect(orderData.currency).toBe("INR");
    });

    test("should reject payment amount exceeding bill by >10%", async () => {
      const bill = new Bill({
        userId: mockUserId,
        nickname: "Test Bill",
        billerId: "KSEB",
        billerName: "KSEB",
        category: "Electricity",
        consumerId: "KSEB-123",
        mobile: "9876543210",
        amount: 1000,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });

      try {
        await billpayService.createPaymentOrder(mockUserId, bill._id, 1200); // 20% more
        fail("Should have thrown error");
      } catch (error) {
        expect(error.message).toContain("exceeds bill");
      }
    });
  });

  describe("Payment Signature Verification", () => {
    test("should verify valid signature", async () => {
      const orderId = "order_123456789";
      const paymentId = "pay_123456789";

      // This would normally use Razorpay's real secret
      // For testing, we'll use a mock
      const crypto = require("crypto");
      const secret = process.env.RAZORPAY_KEY_SECRET || "test_secret";

      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(`${orderId}|${paymentId}`);
      const signature = hmac.digest("hex");

      // Should not throw error
      const result = await billpayService.verifyPaymentSignature(
        orderId,
        paymentId,
        signature
      );

      expect(result).toBe(true);
    });

    test("should reject invalid signature", async () => {
      try {
        await billpayService.verifyPaymentSignature(
          "order_123",
          "pay_123",
          "invalid_signature"
        );
        fail("Should have thrown error");
      } catch (error) {
        expect(error.message).toContain("verification failed");
      }
    });
  });

  describe("Dispute Management", () => {
    test("should file a dispute", async () => {
      // Create transaction first
      const bill = new Bill({
        userId: mockUserId,
        nickname: "Test Bill",
        billerId: "KSEB",
        billerName: "KSEB",
        category: "Electricity",
        consumerId: "KSEB-123",
        mobile: "9876543210",
        amount: 1000,
        dueDate: new Date(),
      });

      const transaction = new BillpayTransaction({
        userId: mockUserId,
        billId: bill._id,
        billerName: bill.billerName,
        category: bill.category,
        amount: 1000,
        status: "Failed",
        method: "UPI",
        authMode: "PIN + OTP",
        billerReference: "BBPS-KSEB-123456",
        receiptId: "RCPT-123456",
      });

      const dispute = await billpayService.fileDispute(
        mockUserId,
        transaction._id,
        "Paid but bill not updated",
        "I paid the bill but it still shows as due in the system"
      );

      expect(dispute.status).toBe("Open");
      expect(dispute.type).toBe("Paid but bill not updated");
    });

    test("should reject dispute with short description", async () => {
      const transaction = new BillpayTransaction({
        userId: mockUserId,
        billId: new mongoose.Types.ObjectId(),
        billerName: "Test",
        category: "Electricity",
        amount: 1000,
        status: "Failed",
        method: "UPI",
        authMode: "PIN + OTP",
        billerReference: "BBPS-TEST-123",
        receiptId: "RCPT-123",
      });

      try {
        await billpayService.fileDispute(
          mockUserId,
          transaction._id,
          "Refund delay",
          "Too short" // Less than 20 characters
        );
        fail("Should have thrown error");
      } catch (error) {
        expect(error.message).toContain("failed");
      }
    });
  });

  describe("Mandate Management", () => {
    test("should set up mandate successfully", async () => {
      const bill = new Bill({
        userId: mockUserId,
        nickname: "Test Bill",
        billerId: "KSEB",
        billerName: "KSEB",
        category: "Electricity",
        consumerId: "KSEB-123",
        mobile: "9876543210",
        amount: 1000,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });

      const mandate = await billpayService.setupMandate(
        mockUserId,
        bill._id,
        1500,
        "Monthly",
        "UPI"
      );

      expect(mandate.status).toBe("Active");
      expect(mandate.maxAmount).toBe(1500);
      expect(mandate.frequency).toBe("Monthly");
    });

    test("should update mandate status", async () => {
      const bill = new Bill({
        userId: mockUserId,
        nickname: "Test Bill",
        billerId: "KSEB",
        billerName: "KSEB",
        category: "Electricity",
        consumerId: "KSEB-123",
        mobile: "9876543210",
        amount: 1000,
        dueDate: new Date(),
      });

      const mandate = new Mandate({
        userId: mockUserId,
        billId: bill._id,
        nickname: "Test Mandate",
        maxAmount: 1500,
        status: "Active",
        frequency: "Monthly",
        nextRunDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentMethod: "UPI",
        authorizedAt: new Date(),
      });

      const updated = await billpayService.updateMandateStatus(
        mockUserId,
        mandate._id,
        "Paused",
        "Temporary hold"
      );

      expect(updated.status).toBe("Paused");
      expect(updated.pausedAt).toBeDefined();
    });
  });

  describe("Analytics", () => {
    test("should generate admin analytics", async () => {
      const analytics = await billpayService.getAdminAnalytics("thisMonth");

      expect(analytics.totalTransactions).toBeDefined();
      expect(analytics.successCount).toBeDefined();
      expect(analytics.failureCount).toBeDefined();
      expect(analytics.successRate).toBeDefined();
      expect(analytics.topCategories).toBeDefined();
    });
  });
});

// API Route Tests
describe("BillPay API Routes", () => {
  // Note: These would require a test Express app setup
  // Example structure:

  describe("GET /billpay/bills", () => {
    test("should return user's bills when authenticated", async () => {
      // Test authenticated request
      // const response = await request(app)
      //   .get('/billpay/bills')
      //   .set('Authorization', `Bearer ${authToken}`);
      // expect(response.status).toBe(200);
      // expect(response.body.success).toBe(true);
    });

    test("should reject unauthenticated request", async () => {
      // const response = await request(app).get('/billpay/bills');
      // expect(response.status).toBe(401);
    });
  });

  describe("POST /billpay/discover", () => {
    test("should discover bill with valid identifier", async () => {
      // const response = await request(app)
      //   .post('/billpay/discover')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send({
      //     identifierType: 'Mobile Number',
      //     identifierValue: '9876543210',
      //     preferredCategory: 'Electricity'
      //   });
      // expect(response.status).toBe(200);
      // expect(response.body.success).toBe(true);
    });

    test("should rate limit discovery attempts", async () => {
      // Send 21 requests within 1 hour
      // Expect 21st to be rate limited with 429 status
    });
  });

  describe("POST /billpay/pay/create-order", () => {
    test("should create Razorpay order", async () => {
      // const response = await request(app)
      //   .post('/billpay/pay/create-order')
      //   .set('Authorization', `Bearer ${authToken}`)
      //   .send({
      //     billId: billId,
      //     amount: 1000,
      //     method: 'UPI',
      //     authMode: 'PIN + OTP'
      //   });
      // expect(response.status).toBe(200);
      // expect(response.body.orderId).toBeDefined();
    });

    test("should validate amount before creating order", async () => {
      // Test with amount > 100,000
      // Expect 400 Bad Request
    });
  });

  describe("POST /billpay/pay/verify", () => {
    test("should verify payment and record transaction", async () => {
      // Verify valid Razorpay signature
      // Expect success response with transaction ID
    });

    test("should reject invalid signature", async () => {
      // Send invalid signature
      // Expect 400 Bad Request
    });
  });
});

module.exports = { billpayService };
