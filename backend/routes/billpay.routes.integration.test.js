const express = require("express");
const request = require("supertest");

jest.mock("razorpay", () =>
  jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn(async (payload) => ({
        id: `order_test_${Date.now()}`,
        amount: payload.amount,
        currency: payload.currency,
      })),
    },
  }))
);

jest.mock("../middleware/auth", () => ({
  authenticate: (req, _res, next) => {
    req.user = {
      _id: "billpay-user-1",
      id: "billpay-user-1",
      role: req.headers["x-test-role"] || "user",
      email: "billpay@example.com",
    };
    next();
  },
  verifyAdmin: (req, res, next) => {
    if ((req.user?.role || "").toLowerCase() !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }
    return next();
  },
}));

jest.mock("../services/billpayService", () => ({
  getUserBills: jest.fn(),
  updateBillAutopay: jest.fn(),
  discoverBill: jest.fn(),
  createPaymentOrder: jest.fn(),
  getProviderName: jest.fn(() => "razorpay"),
  verifyPaymentSignature: jest.fn(),
  verifySetuPaymentStatus: jest.fn(),
  recordPayment: jest.fn(),
  getTransactionHistory: jest.fn(),
  getReceipt: jest.fn(),
  fileDispute: jest.fn(),
  getUserDisputes: jest.fn(),
  setupMandate: jest.fn(),
  getUserMandates: jest.fn(),
  updateMandateStatus: jest.fn(),
  getAdminAnalytics: jest.fn(),
  getProviderDiagnostics: jest.fn(),
}));

const billpayService = require("../services/billpayService");
const billpayRouter = require("./billpay");

describe("billpay routes integration", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/billpay", billpayRouter);
  });

  test("GET /api/billpay/bills returns authenticated user bills", async () => {
    billpayService.getUserBills.mockResolvedValue([
      { _id: "bill-1", nickname: "Home Current", amount: 1200 },
    ]);

    const response = await request(app).get("/api/billpay/bills").expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(billpayService.getUserBills).toHaveBeenCalledWith("billpay-user-1");
  });

  test("PATCH /api/billpay/bills/:billId/autopay validates enabled boolean", async () => {
    const response = await request(app)
      .patch("/api/billpay/bills/bill-1/autopay")
      .send({ enabled: "yes" })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain("enabled must be boolean");
  });

  test("PATCH /api/billpay/bills/:billId/autopay updates bill autopay", async () => {
    billpayService.updateBillAutopay.mockResolvedValue({
      _id: "bill-1",
      autopayEnabled: true,
    });

    const response = await request(app)
      .patch("/api/billpay/bills/bill-1/autopay")
      .send({ enabled: true })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.bill.autopayEnabled).toBe(true);
    expect(billpayService.updateBillAutopay).toHaveBeenCalledWith("billpay-user-1", "bill-1", true);
  });

  test("POST /api/billpay/pay/create-order returns Razorpay order payload", async () => {
    billpayService.createPaymentOrder.mockResolvedValue({
      amount: 125000,
      currency: "INR",
      receipt: "billpay-bill-1-1",
      notes: {
        userId: "billpay-user-1",
        billId: "bill-1",
      },
    });

    const response = await request(app)
      .post("/api/billpay/pay/create-order")
      .send({
        billId: "bill-1",
        amount: 1250,
        method: "UPI",
        authMode: "PIN + OTP",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.orderId).toMatch(/^order_test_/);
    expect(response.body.amount).toBe(125000);
    expect(response.body.currency).toBe("INR");
  });

  test("POST /api/billpay/pay/create-order returns Setu payload when provider is setu", async () => {
    billpayService.createPaymentOrder.mockResolvedValue({
      gateway: "setu",
      orderId: "SETU_REF_123",
      amount: 125000,
      currency: "INR",
      paymentRefId: "MBBP-123",
    });

    const response = await request(app)
      .post("/api/billpay/pay/create-order")
      .send({
        billId: "bill-1",
        amount: 1250,
        method: "UPI",
        authMode: "PIN + OTP",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.gateway).toBe("setu");
    expect(response.body.orderId).toBe("SETU_REF_123");
    expect(response.body.paymentRefId).toBe("MBBP-123");
  });

  test("POST /api/billpay/pay/verify verifies signature and records transaction", async () => {
    billpayService.verifyPaymentSignature.mockResolvedValue(true);
    billpayService.recordPayment.mockResolvedValue({
      transactionId: "txn-1",
      txnId: "TXN-123456",
      receiptId: "RCPT-123456",
      billerReference: "BBPS-KSEB-123456",
      amount: 1250,
    });

    const response = await request(app)
      .post("/api/billpay/pay/verify")
      .send({
        orderId: "order_123",
        paymentId: "pay_123",
        signature: "signature_123",
        billId: "bill-1",
        amount: 1250,
        method: "UPI",
        authMode: "PIN + OTP",
        otp: "123456",
        pin: "1234",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.txnId).toBe("TXN-123456");
    expect(billpayService.verifyPaymentSignature).toHaveBeenCalledWith(
      "order_123",
      "pay_123",
      "signature_123"
    );
    expect(billpayService.recordPayment).toHaveBeenCalledWith(
      "billpay-user-1",
      "bill-1",
      1250,
      expect.objectContaining({
        method: "UPI",
        authMode: "PIN + OTP",
      })
    );
  });

  test("POST /api/billpay/pay/verify uses Setu verification when gateway is setu", async () => {
    billpayService.verifySetuPaymentStatus.mockResolvedValue({
      status: "success",
      refId: "SETU_REF_123",
    });
    billpayService.recordPayment.mockResolvedValue({
      transactionId: "txn-2",
      txnId: "TXN-222222",
      receiptId: "RCPT-222222",
      billerReference: "BBPS-KSEB-222222",
      amount: 1250,
    });

    const response = await request(app)
      .post("/api/billpay/pay/verify")
      .send({
        gateway: "setu",
        orderId: "SETU_REF_123",
        paymentId: "PAY_REF_123",
        signature: "not-applicable",
        billId: "bill-1",
        amount: 1250,
        method: "UPI",
        authMode: "PIN + OTP",
        otp: "123456",
        pin: "1234",
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(billpayService.verifySetuPaymentStatus).toHaveBeenCalledWith("SETU_REF_123");
    expect(billpayService.recordPayment).toHaveBeenCalledWith(
      "billpay-user-1",
      "bill-1",
      1250,
      expect.objectContaining({
        provider: "setu",
      })
    );
  });

  test("GET /api/billpay/admin/analytics blocks non-admin users", async () => {
    const response = await request(app)
      .get("/api/billpay/admin/analytics")
      .set("x-test-role", "user")
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Admin access required");
  });

  test("GET /api/billpay/admin/analytics returns metrics for admin users", async () => {
    billpayService.getAdminAnalytics.mockResolvedValue({
      totalTransactions: 7,
      successCount: 6,
      failureCount: 1,
      successRate: "85.7",
      topCategories: [{ category: "Electricity", count: 3 }],
      billerWise: [{ name: "Kerala State Electricity Board", volume: 3 }],
    });

    const response = await request(app)
      .get("/api/billpay/admin/analytics?dateRange=thisMonth")
      .set("x-test-role", "admin")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.totalTransactions).toBe(7);
    expect(billpayService.getAdminAnalytics).toHaveBeenCalledWith("thisMonth");
  });

  test("GET /api/billpay/health/provider blocks non-admin users", async () => {
    const response = await request(app)
      .get("/api/billpay/health/provider")
      .set("x-test-role", "user")
      .expect(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("Admin access required");
  });

  test("GET /api/billpay/health/provider returns provider diagnostics for admin users", async () => {
    billpayService.getProviderDiagnostics.mockReturnValue({
      provider: "setu",
      setuEnabled: true,
      configured: true,
      strictMode: false,
      baseUrl: "https://dg.setu.co",
      apiVersion: "v1",
      maxPollAttempts: 5,
      pollIntervalMs: 1200,
      missingConfig: [],
    });

    const response = await request(app)
      .get("/api/billpay/health/provider")
      .set("x-test-role", "admin")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.provider).toBe("setu");
    expect(billpayService.getProviderDiagnostics).toHaveBeenCalledTimes(1);
  });
});
