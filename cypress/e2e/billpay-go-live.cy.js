describe("BillPay go-live regression", () => {
  let billsState;
  let transactionsState;
  let disputesState;
  let mandatesState;

  const publicAppData = {
    businessCategories: [{ id: "billpay", name: "Nila Utility Hub", fee: 1199, requiresFoodLicense: false }],
    globeMartCategories: [],
    enabledModules: ["billpay"],
    registeredAccounts: [],
    moduleData: {},
  };

  const authUser = {
    id: "billpay-user-1",
    email: "billpay.user@example.com",
    name: "BillPay User",
    role: "admin",
    registrationType: "admin",
    preferences: { language: "en" },
  };

  const setupAppInterceptors = () => {
    cy.intercept("GET", "**/api/app-data/public", {
      statusCode: 200,
      body: { success: true, data: publicAppData },
    }).as("getPublicAppData");

    cy.intercept("GET", "**/api/auth/me", {
      statusCode: 200,
      body: { success: true, user: authUser },
    }).as("getAuthMe");

    cy.intercept("POST", "**/api/auth/logout", {
      statusCode: 200,
      body: { success: true },
    });

    cy.intercept("GET", "**/api/billpay/bills", () => ({
      statusCode: 200,
      body: { success: true, count: billsState.length, bills: billsState },
    })).as("getBills");

    cy.intercept("GET", "**/api/billpay/history*", () => ({
      statusCode: 200,
      body: {
        success: true,
        transactions: transactionsState,
        total: transactionsState.length,
        limit: 200,
        offset: 0,
      },
    })).as("getHistory");

    cy.intercept("GET", "**/api/billpay/disputes*", () => ({
      statusCode: 200,
      body: {
        success: true,
        disputes: disputesState,
        total: disputesState.length,
        limit: 100,
        offset: 0,
      },
    })).as("getDisputes");

    cy.intercept("GET", "**/api/billpay/mandates", () => ({
      statusCode: 200,
      body: {
        success: true,
        count: mandatesState.length,
        mandates: mandatesState,
      },
    })).as("getMandates");

    cy.intercept("POST", "**/api/billpay/discover", (req) => {
      const createdBill = {
        _id: "bill-2002",
        nickname: "Water Auto-Fetch",
        billerId: "KWA",
        billerName: "Kerala Water Authority",
        category: "Water",
        consumerId: req.body.identifierType === "Consumer ID" ? req.body.identifierValue : "KWA-990011",
        mobile: req.body.identifierType === "Mobile Number" ? req.body.identifierValue : "9895000011",
        amount: 740,
        dueDate: "2026-06-10T00:00:00.000Z",
        status: "Due",
        autopayEnabled: false,
        familyMember: "Self",
      };
      billsState = [createdBill, ...billsState];
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          status: "created",
          bill: createdBill,
          message: "Bill discovered via BBPS directory and added to Saved Bills.",
        },
      });
    }).as("discoverBill");

    cy.intercept("PATCH", "**/api/billpay/bills/*/autopay", (req) => {
      const billId = req.url.split("/").slice(-2)[0];
      billsState = billsState.map((bill) =>
        bill._id === billId ? { ...bill, autopayEnabled: Boolean(req.body.enabled) } : bill
      );
      const updatedBill = billsState.find((bill) => bill._id === billId);
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          bill: updatedBill,
        },
      });
    }).as("toggleAutopay");

    cy.intercept("POST", "**/api/billpay/pay/create-order", {
      statusCode: 200,
      body: {
        success: true,
        orderId: "order_test_1001",
        amount: 142000,
        currency: "INR",
        razorpayKeyId: "test_key",
      },
    }).as("createOrder");

    cy.intercept("POST", "**/api/billpay/pay/verify", (req) => {
      const billId = req.body.billId;
      const amount = Number(req.body.amount || 0);
      const transaction = {
        _id: "txn-9001",
        billId,
        billerName: "Kerala State Electricity Board",
        category: "Electricity",
        amount,
        status: "Success",
        paidAt: "2026-05-12T09:30:00.000Z",
        method: req.body.method,
        authMode: req.body.authMode,
        otpUsed: true,
        amountDeducted: true,
        refundStatus: "Not Applicable",
        billerReference: "BBPS-KSEB-900123",
        receiptId: "RCPT-900123",
      };

      transactionsState = [transaction, ...transactionsState];
      billsState = billsState.map((bill) =>
        bill._id === billId
          ? {
              ...bill,
              status: "Paid",
              amount,
            }
          : bill
      );

      req.reply({
        statusCode: 200,
        body: {
          success: true,
          message: "Payment successful",
          transactionId: "txn-9001",
          txnId: "TXN-900123",
          receiptId: "RCPT-900123",
          billerReference: "BBPS-KSEB-900123",
          amount,
        },
      });
    }).as("verifyPayment");

    cy.intercept("POST", "**/api/billpay/disputes", (req) => {
      const dispute = {
        _id: "dsp-5001",
        transactionId: req.body.transactionId,
        type: req.body.type,
        description: req.body.description,
        status: "Open",
        createdAt: "2026-05-12T10:00:00.000Z",
      };
      disputesState = [dispute, ...disputesState];
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          message: "Dispute filed successfully",
          dispute,
        },
      });
    }).as("raiseDispute");

    cy.intercept("GET", "**/api/billpay/admin/analytics*", {
      statusCode: 200,
      body: {
        success: true,
        totalTransactions: 12,
        successCount: 11,
        failureCount: 1,
        successRate: "91.7",
        pendingRefunds: 1,
        disputeTickets: 2,
        commissionEarned: 115.2,
        topCategories: [{ category: "Electricity", count: 5 }],
        billerWise: [{ name: "Kerala State Electricity Board", volume: 5, success: 5, failed: 0, amount: 7800 }],
      },
    }).as("getAdminAnalytics");
  };

  const bootBillPayPage = () => {
    setupAppInterceptors();
    cy.visit("/billpay", {
      onBeforeLoad: (win) => {
        win.localStorage.setItem("mb_auth_token", "test-token");
        win.localStorage.setItem("token", "test-token");
      },
    });

    cy.wait("@getPublicAppData");
    cy.wait("@getAuthMe");
    cy.wait("@getBills");
    cy.wait("@getHistory");
    cy.wait("@getDisputes");
    cy.wait("@getMandates");
    cy.contains("h1", "BillPay Revenue Engine").should("be.visible");
  };

  beforeEach(() => {
    billsState = [
      {
        _id: "bill-1001",
        nickname: "Home Current",
        billerId: "KSEB",
        billerName: "Kerala State Electricity Board",
        category: "Electricity",
        consumerId: "KSEB-183920",
        mobile: "9876543210",
        amount: 1420,
        dueDate: "2026-05-18T00:00:00.000Z",
        status: "Due",
        autopayEnabled: false,
        familyMember: "Self",
      },
    ];

    transactionsState = [
      {
        _id: "txn-1001",
        billId: "bill-1001",
        billerName: "Kerala State Electricity Board",
        category: "Electricity",
        amount: 990,
        status: "Success",
        paidAt: "2026-05-10T10:00:00.000Z",
        method: "UPI",
        authMode: "PIN + OTP",
        otpUsed: true,
        amountDeducted: true,
        refundStatus: "Not Applicable",
        billerReference: "BBPS-KSEB-100001",
        receiptId: "RCPT-100001",
      },
    ];

    disputesState = [];
    mandatesState = [
      {
        _id: "man-2001",
        billId: "bill-1001",
        nickname: "Home Current",
        maxAmount: 2500,
        status: "Active",
        nextRunDate: "2026-06-01T00:00:00.000Z",
        frequency: "Monthly",
      },
    ];
  });

  it("runs key billpay journeys with backend sync", () => {
    bootBillPayPage();

    cy.contains("button", "Saved Bills").click();
    cy.contains("Home Current").should("be.visible");
    cy.contains("button", "Enable Autopay").click();
    cy.wait("@toggleAutopay");
    cy.contains("Sync").should("be.visible");

    cy.contains("button", "Dashboard").click();
    cy.get('input[placeholder="9876543210 or KSEB-183920"]').clear().type("9895000011");
    cy.contains("button", "Discover Pending Bill").click();
    cy.wait("@discoverBill");
    cy.contains("Bill discovered via BBPS directory").should("be.visible");

    cy.contains("button", "Pay Bill").click();
    cy.get('input[placeholder="4-6 digit PIN"]').type("1234");
    cy.get('input[placeholder="6 digit OTP"]').type("123456");
    cy.contains("button", "Pay Now").click();
    cy.wait("@createOrder");
    cy.wait("@verifyPayment");
    cy.wait("@getBills");
    cy.wait("@getHistory");
    cy.contains("success", { matchCase: false }).should("be.visible");

    cy.contains("button", "Payment History").click();
    cy.contains("Kerala State Electricity Board").should("be.visible");

    cy.contains("button", "Disputes").click();
    cy.get('input[placeholder="TXN-xxxxxx"]').type("txn-9001");
    cy.get("textarea").type("Amount deducted and I need confirmation from biller update flow.");
    cy.contains("button", "Raise Complaint").click();
    cy.wait("@raiseDispute");
    cy.contains("raised successfully", { matchCase: false }).should("be.visible");

    cy.contains("button", "Admin Reports").click();
    cy.wait("@getAdminAnalytics");
    cy.contains("Total Transactions").should("be.visible");
  });
});
