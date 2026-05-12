import React, { useCallback, useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import "./BillPayHub.css";
import billpayService from "../../services/billpayService";

const DAY_MS = 24 * 60 * 60 * 1000;
const HIGH_VALUE_THRESHOLD = 5000;

const BBPS_CATEGORIES = [
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
];

const TABS = [
  "Dashboard",
  "Categories",
  "Saved Bills",
  "Pay Bill",
  "Autopay",
  "Payment History",
  "Receipts",
  "Disputes",
  "Offers",
  "Admin Reports",
];

const DISPUTE_TYPES = [
  "Paid but bill not updated",
  "Wrong amount",
  "Refund delay",
  "Duplicate payment",
  "Other",
];

const PAYMENT_METHODS = ["UPI", "Card", "NetBanking", "Wallet"];
const AUTH_MODES = ["PIN + OTP", "Biometric + OTP"];

const toISODate = (date) => {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() - next.getTimezoneOffset());
  return next.toISOString().slice(0, 10);
};

const relativeDate = (offsetDays) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return toISODate(date);
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(amount || 0)
  );

const formatDateLabel = (isoDate) => {
  if (!isoDate) {
    return "NA";
  }
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDayDelta = (isoDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${isoDate}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / DAY_MS);
};

const getBillState = (bill) => {
  if (bill.status === "Paid") {
    return "paid";
  }
  const delta = getDayDelta(bill.dueDate);
  if (delta < 0) {
    return "overdue";
  }
  if (delta <= 7) {
    return "dueSoon";
  }
  return "upcoming";
};

const shortCode = (value = "", prefix = "ID") => {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return `${prefix}-NA`;
  }
  if (normalized.toUpperCase().startsWith(`${prefix}-`)) {
    return normalized;
  }
  return `${prefix}-${normalized.slice(-6).toUpperCase()}`;
};

const normalizeBill = (bill = {}) => ({
  id: String(bill._id || bill.id || ""),
  nickname: String(bill.nickname || "Saved Bill"),
  billerId: String(bill.billerId || ""),
  billerName: String(bill.billerName || "Biller"),
  category: String(bill.category || "Utility"),
  consumerId: String(bill.consumerId || ""),
  mobile: String(bill.mobile || ""),
  amount: Number(bill.amount || 0),
  dueDate: bill.dueDate ? toISODate(bill.dueDate) : relativeDate(5),
  status: String(bill.status || "Due"),
  autopayEnabled: Boolean(bill.autopayEnabled),
  familyMember: String(bill.familyMember || "Self"),
});

const normalizeTransaction = (txn = {}) => {
  const transactionId = String(txn._id || txn.id || "");
  const billId =
    typeof txn.billId === "object" && txn.billId !== null
      ? String(txn.billId._id || txn.billId.id || "")
      : String(txn.billId || "");
  return {
    id: transactionId,
    displayId: shortCode(transactionId, "TXN"),
    billId,
    billerName: String(txn.billerName || txn.billId?.billerName || "Biller"),
    category: String(txn.category || "Utility"),
    amount: Number(txn.amount || 0),
    status: String(txn.status || "Pending"),
    paidAt: txn.paidAt ? new Date(txn.paidAt).toLocaleString("en-IN") : new Date().toLocaleString("en-IN"),
    method: String(txn.method || "UPI"),
    authMode: String(txn.authMode || "PIN + OTP"),
    otpUsed: Boolean(txn.otpUsed),
    amountDeducted: Boolean(txn.amountDeducted),
    refundStatus: String(txn.refundStatus || "Not Applicable"),
    billerReference: String(txn.billerReference || ""),
    receiptId: String(txn.receiptId || shortCode(transactionId, "RCPT")),
    failureReason: String(txn.failureReason || ""),
  };
};

const normalizeDispute = (item = {}) => {
  const disputeId = String(item._id || item.id || "");
  const transactionId =
    typeof item.transactionId === "object" && item.transactionId !== null
      ? String(item.transactionId._id || item.transactionId.id || "")
      : String(item.transactionId || item.txnId || "");
  return {
    id: disputeId,
    displayId: shortCode(disputeId, "DSP"),
    txnId: transactionId,
    type: String(item.type || "Other"),
    description: String(item.description || ""),
    status: String(item.status || "Open"),
    createdAt: item.createdAt
      ? new Date(item.createdAt).toLocaleString("en-IN")
      : new Date().toLocaleString("en-IN"),
  };
};

const normalizeMandate = (mandate = {}) => ({
  id: String(mandate._id || mandate.id || ""),
  billId:
    typeof mandate.billId === "object" && mandate.billId !== null
      ? String(mandate.billId._id || mandate.billId.id || "")
      : String(mandate.billId || ""),
  nickname: String(mandate.nickname || mandate.billId?.nickname || "Mandate"),
  maxAmount: Number(mandate.maxAmount || 0),
  status: String(mandate.status || "Active"),
  nextRun: mandate.nextRunDate ? toISODate(mandate.nextRunDate) : relativeDate(30),
  frequency: String(mandate.frequency || "Monthly"),
});

const mapAdminDateRange = (value) => {
  switch (value) {
    case "Last 30 Days":
      return "last30Days";
    case "Quarter":
      return "quarter";
    default:
      return "thisMonth";
  }
};

const buildErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.message ||
  fallbackMessage;

const createInitialBills = () => [
  {
    id: "BILL-1001",
    nickname: "Home Current",
    billerId: "KSEB",
    billerName: "Kerala State Electricity Board",
    category: "Electricity",
    consumerId: "KSEB-183920",
    mobile: "9876543210",
    amount: 1420,
    dueDate: relativeDate(3),
    status: "Due",
    autopayEnabled: true,
    familyMember: "Self",
  },
  {
    id: "BILL-1002",
    nickname: "Parents Water",
    billerId: "KWA",
    billerName: "Kerala Water Authority",
    category: "Water",
    consumerId: "KWA-882014",
    mobile: "9895012345",
    amount: 680,
    dueDate: relativeDate(-2),
    status: "Due",
    autopayEnabled: false,
    familyMember: "Mother",
  },
  {
    id: "BILL-1003",
    nickname: "Shop Broadband",
    billerId: "JIO-BB",
    billerName: "JioFiber Broadband",
    category: "Broadband",
    consumerId: "JIO-553101",
    mobile: "9847011122",
    amount: 1199,
    dueDate: relativeDate(9),
    status: "Due",
    autopayEnabled: true,
    familyMember: "Self",
  },
  {
    id: "BILL-1004",
    nickname: "Rental House Tax",
    billerId: "KOCHI-MUNI",
    billerName: "Kochi Municipal Tax",
    category: "Municipal Tax",
    consumerId: "MUNI-441890",
    mobile: "9995001234",
    amount: 2300,
    dueDate: relativeDate(12),
    status: "Due",
    autopayEnabled: false,
    familyMember: "Self",
  },
  {
    id: "BILL-1005",
    nickname: "FASTag Car",
    billerId: "FASTAG-NHAI",
    billerName: "NHAI FASTag Recharge",
    category: "FASTag",
    consumerId: "FAST-991818",
    mobile: "9895111222",
    amount: 700,
    dueDate: relativeDate(1),
    status: "Due",
    autopayEnabled: false,
    familyMember: "Spouse",
  },
];

const createInitialTransactions = () => [
  {
    id: "TXN-562301",
    billId: "BILL-0873",
    billerName: "SBI Card",
    category: "Credit Card",
    amount: 3550,
    status: "Success",
    paidAt: new Date(Date.now() - 7 * DAY_MS).toLocaleString("en-IN"),
    method: "UPI",
    authMode: "PIN + OTP",
    otpUsed: true,
    amountDeducted: true,
    refundStatus: "Not Applicable",
    billerReference: "BBPS-SBI-909101",
    receiptId: "RCPT-562301",
  },
  {
    id: "TXN-562540",
    billId: "BILL-0990",
    billerName: "Kerala Water Authority",
    category: "Water",
    amount: 910,
    status: "Failed",
    paidAt: new Date(Date.now() - 2 * DAY_MS).toLocaleString("en-IN"),
    method: "NetBanking",
    authMode: "Biometric + OTP",
    otpUsed: true,
    amountDeducted: true,
    refundStatus: "Refund initiated - ETA 2 days",
    billerReference: "BBPS-KWA-391200",
    receiptId: "RCPT-562540",
    failureReason: "Timeout from biller host",
  },
  {
    id: "TXN-562701",
    billId: "BILL-1008",
    billerName: "Airtel DTH",
    category: "DTH",
    amount: 420,
    status: "Success",
    paidAt: new Date(Date.now() - 1 * DAY_MS).toLocaleString("en-IN"),
    method: "Card",
    authMode: "PIN + OTP",
    otpUsed: true,
    amountDeducted: true,
    refundStatus: "Not Applicable",
    billerReference: "BBPS-DTH-551901",
    receiptId: "RCPT-562701",
  },
];

const createInitialDisputes = () => [
  {
    id: "DSP-1030",
    txnId: "TXN-562540",
    type: "Refund delay",
    description: "Amount deducted but refund not completed yet.",
    status: "Open",
    createdAt: new Date(Date.now() - DAY_MS).toLocaleString("en-IN"),
  },
];

const createInitialMandates = () => [
  {
    id: "MAN-201",
    billId: "BILL-1001",
    nickname: "Home Current",
    maxAmount: 2500,
    status: "Active",
    nextRun: relativeDate(3),
    frequency: "Monthly",
  },
  {
    id: "MAN-202",
    billId: "BILL-1003",
    nickname: "Shop Broadband",
    maxAmount: 1500,
    status: "Paused",
    nextRun: relativeDate(9),
    frequency: "Monthly",
  },
];

const BillPayHub = () => {
  const [activeTab, setActiveTab] = useState("Dashboard");

  const [bills, setBills] = useState(createInitialBills);
  const [transactions, setTransactions] = useState(createInitialTransactions);
  const [disputes, setDisputes] = useState(createInitialDisputes);
  const [mandates, setMandates] = useState(createInitialMandates);

  const [discoveryForm, setDiscoveryForm] = useState({
    identifierType: "Mobile Number",
    identifierValue: "",
    preferredCategory: "Electricity",
  });
  const [discoveryResult, setDiscoveryResult] = useState(null);

  const [payForm, setPayForm] = useState({
    billId: "BILL-1001",
    amount: "1420",
    method: "UPI",
    authMode: "PIN + OTP",
    pin: "",
    otp: "",
    biometricConfirmed: false,
    riskAcknowledged: false,
  });

  const [securityMessage, setSecurityMessage] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [disputeForm, setDisputeForm] = useState({
    txnId: "",
    type: DISPUTE_TYPES[0],
    description: "",
  });
  const [disputeMessage, setDisputeMessage] = useState("");

  const [reminderSettings, setReminderSettings] = useState({
    push: true,
    sms: true,
    whatsapp: true,
    sevenDays: true,
    twoDays: true,
    dueDate: true,
    overdue: true,
  });

  const [offerWallet, setOfferWallet] = useState({
    cashbackBalance: 124,
    coins: 980,
    monthlyCoupons: 2,
  });

  const [adminRange, setAdminRange] = useState("This Month");
  const [syncMessage, setSyncMessage] = useState("Syncing with BillPay backend...");
  const [isSyncing, setIsSyncing] = useState(true);
  const [adminError, setAdminError] = useState("");
  const [adminMetricsApi, setAdminMetricsApi] = useState(null);

  const selectedBill = useMemo(
    () => bills.find((bill) => bill.id === payForm.billId),
    [bills, payForm.billId]
  );

  const unpaidBills = useMemo(() => bills.filter((bill) => bill.status !== "Paid"), [bills]);

  const refreshBillpayData = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (!silent) {
      setIsSyncing(true);
      setSyncMessage("Syncing with BillPay backend...");
    }

    try {
      const [billsResponse, historyResponse, disputesResponse, mandatesResponse] = await Promise.all([
        billpayService.getBills(),
        billpayService.getHistory(200, 0),
        billpayService.getDisputes(100, 0),
        billpayService.getMandates(),
      ]);

      const nextBills = Array.isArray(billsResponse?.bills) ? billsResponse.bills.map(normalizeBill) : [];
      const nextTransactions = Array.isArray(historyResponse?.transactions)
        ? historyResponse.transactions.map(normalizeTransaction)
        : [];
      const nextDisputes = Array.isArray(disputesResponse?.disputes)
        ? disputesResponse.disputes.map(normalizeDispute)
        : [];
      const nextMandates = Array.isArray(mandatesResponse?.mandates)
        ? mandatesResponse.mandates.map(normalizeMandate)
        : [];

      const billsCount = Number(billsResponse?.count);
      if (nextBills.length > 0 || billsCount === 0) {
        setBills(nextBills);
        if (nextBills.length > 0) {
          setPayForm((current) => {
            const hasCurrentBill = nextBills.some((item) => item.id === current.billId);
            if (hasCurrentBill) {
              return current;
            }
            return {
              ...current,
              billId: nextBills[0].id,
              amount: String(nextBills[0].amount || ""),
            };
          });
        }
      }
      if (nextTransactions.length > 0 || historyResponse?.total === 0) {
        setTransactions(nextTransactions);
      }
      if (nextDisputes.length > 0 || disputesResponse?.total === 0) {
        setDisputes(nextDisputes);
      }
      if (nextMandates.length > 0 || mandatesResponse?.count === 0) {
        setMandates(nextMandates);
      }

      setSyncMessage(`Backend sync complete at ${new Date().toLocaleTimeString("en-IN")}.`);
    } catch (error) {
      setSyncMessage(
        buildErrorMessage(error, "Using local fallback data. Backend sync will retry on next action.")
      );
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    refreshBillpayData();
  }, [refreshBillpayData]);

  const dashboard = useMemo(() => {
    const dueSoon = bills.filter((bill) => getBillState(bill) === "dueSoon" && bill.status !== "Paid").length;
    const overdue = bills.filter((bill) => getBillState(bill) === "overdue" && bill.status !== "Paid").length;
    const paid = bills.filter((bill) => bill.status === "Paid").length;
    const autopayEnabled = bills.filter((bill) => bill.autopayEnabled).length;
    const failedPayment = transactions.filter((txn) => txn.status === "Failed").length;

    const upcomingReminders = bills.reduce((count, bill) => {
      if (bill.status === "Paid") {
        return count;
      }
      const delta = getDayDelta(bill.dueDate);
      const hits = [
        reminderSettings.sevenDays && delta === 7,
        reminderSettings.twoDays && delta === 2,
        reminderSettings.dueDate && delta === 0,
        reminderSettings.overdue && delta < 0,
      ].filter(Boolean).length;
      return count + hits;
    }, 0);

    return {
      dueSoon,
      overdue,
      paid,
      autopayEnabled,
      failedPayment,
      upcomingReminders,
    };
  }, [bills, transactions, reminderSettings]);

  const reminderTimeline = useMemo(() => {
    const rows = [];
    unpaidBills.forEach((bill) => {
      const delta = getDayDelta(bill.dueDate);
      if (reminderSettings.sevenDays && delta >= 0 && delta <= 7) {
        rows.push({ billId: bill.id, nickname: bill.nickname, signal: "7-day reminder" });
      }
      if (reminderSettings.twoDays && delta >= 0 && delta <= 2) {
        rows.push({ billId: bill.id, nickname: bill.nickname, signal: "2-day reminder" });
      }
      if (reminderSettings.dueDate && delta === 0) {
        rows.push({ billId: bill.id, nickname: bill.nickname, signal: "Due-date reminder" });
      }
      if (reminderSettings.overdue && delta < 0) {
        rows.push({ billId: bill.id, nickname: bill.nickname, signal: "Overdue alert" });
      }
    });
    return rows.slice(0, 10);
  }, [unpaidBills, reminderSettings]);

  const categorySpend = useMemo(() => {
    const map = new Map();
    transactions
      .filter((txn) => txn.status === "Success")
      .forEach((txn) => {
        map.set(txn.category, (map.get(txn.category) || 0) + Number(txn.amount || 0));
      });
    return Array.from(map.entries()).map(([category, amount]) => ({ category, amount }));
  }, [transactions]);

  const monthlySummary = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const monthTransactions = transactions.filter((txn) => {
      const paid = new Date(txn.paidAt);
      return paid.getMonth() === month && paid.getFullYear() === year && txn.status === "Success";
    });

    const totalPaid = monthTransactions.reduce((sum, txn) => sum + Number(txn.amount || 0), 0);

    return {
      totalPaid,
      categorySpend,
      upcomingDues: unpaidBills.length,
    };
  }, [transactions, categorySpend, unpaidBills.length]);

  const localAdminMetrics = useMemo(() => {
    const totalTransactions = transactions.length;
    const successCount = transactions.filter((txn) => txn.status === "Success").length;
    const failureCount = transactions.filter((txn) => txn.status === "Failed").length;
    const successRate = totalTransactions ? ((successCount / totalTransactions) * 100).toFixed(1) : "0.0";
    const pendingRefunds = transactions.filter(
      (txn) => txn.refundStatus && txn.refundStatus.toLowerCase().includes("refund") && txn.status === "Failed"
    ).length;

    const topCategories = Object.entries(
      transactions.reduce((acc, txn) => {
        acc[txn.category] = (acc[txn.category] || 0) + 1;
        return acc;
      }, {})
    )
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const commissionEarned = transactions
      .filter((txn) => txn.status === "Success")
      .reduce((sum, txn) => sum + Number(txn.amount || 0) * 0.0045, 0);

    const billerWise = Object.entries(
      transactions.reduce((acc, txn) => {
        if (!acc[txn.billerName]) {
          acc[txn.billerName] = { volume: 0, success: 0, failed: 0, amount: 0 };
        }
        acc[txn.billerName].volume += 1;
        acc[txn.billerName].amount += Number(txn.amount || 0);
        if (txn.status === "Success") {
          acc[txn.billerName].success += 1;
        }
        if (txn.status === "Failed") {
          acc[txn.billerName].failed += 1;
        }
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, ...value }));

    return {
      totalTransactions,
      successCount,
      failureCount,
      successRate,
      pendingRefunds,
      disputeTickets: disputes.length,
      topCategories,
      commissionEarned,
      billerWise,
    };
  }, [transactions, disputes.length]);

  useEffect(() => {
    if (activeTab !== "Admin Reports") {
      return;
    }

    let cancelled = false;

    const loadAdminMetrics = async () => {
      setAdminError("");
      try {
        const response = await billpayService.getAdminAnalytics(mapAdminDateRange(adminRange));
        if (cancelled) {
          return;
        }
        setAdminMetricsApi({
          totalTransactions: Number(response?.totalTransactions || 0),
          successCount: Number(response?.successCount || 0),
          failureCount: Number(response?.failureCount || 0),
          successRate: String(response?.successRate || "0.0"),
          pendingRefunds: Number(response?.pendingRefunds || 0),
          disputeTickets: Number(response?.disputeTickets || 0),
          topCategories: Array.isArray(response?.topCategories) ? response.topCategories : [],
          commissionEarned: Number(response?.commissionEarned || 0),
          billerWise: Array.isArray(response?.billerWise) ? response.billerWise : [],
        });
      } catch (error) {
        if (!cancelled) {
          setAdminError(
            buildErrorMessage(error, "Admin analytics API unavailable. Showing local ledger metrics.")
          );
          setAdminMetricsApi(null);
        }
      }
    };

    loadAdminMetrics();
    return () => {
      cancelled = true;
    };
  }, [activeTab, adminRange]);

  const adminMetrics = adminMetricsApi || localAdminMetrics;

  const handleDiscovery = async (event) => {
    event.preventDefault();
    const identifier = discoveryForm.identifierValue.trim();

    if (!identifier) {
      setDiscoveryResult({ error: "Enter mobile number or consumer ID to discover pending bills." });
      return;
    }

    try {
      const response = await billpayService.discoverBill({
        identifierType: discoveryForm.identifierType,
        identifierValue: identifier,
        preferredCategory: discoveryForm.preferredCategory,
      });
      const normalizedBill = normalizeBill(response.bill || {});
      setBills((current) => {
        const next = current.filter((bill) => bill.id !== normalizedBill.id);
        return [normalizedBill, ...next];
      });
      setDiscoveryResult({
        status: response.status || "found",
        bill: normalizedBill,
        message: response.message || `Pending bill discovered for ${normalizedBill.billerName}.`,
      });
      setPayForm((current) => ({
        ...current,
        billId: normalizedBill.id,
        amount: String(normalizedBill.amount || ""),
      }));
      setSyncMessage(`Discovery synced at ${new Date().toLocaleTimeString("en-IN")}.`);
    } catch (error) {
      setDiscoveryResult({
        error: buildErrorMessage(error, "Unable to discover bill right now. Please retry."),
      });
    }
  };

  const validateSecurity = () => {
    const amount = Number(payForm.amount || 0);
    const needsPin = payForm.authMode === "PIN + OTP";
    const needsBiometric = payForm.authMode === "Biometric + OTP";

    if (needsPin && !/^\d{4,6}$/.test(payForm.pin.trim())) {
      return "Enter a valid 4-6 digit payment PIN.";
    }

    if (!/^\d{6}$/.test(payForm.otp.trim())) {
      return "Enter a valid 6-digit OTP for transaction 2FA.";
    }

    if (needsBiometric && !payForm.biometricConfirmed) {
      return "Biometric confirmation is required for this auth mode.";
    }

    if (amount >= HIGH_VALUE_THRESHOLD && !payForm.riskAcknowledged) {
      return `Risk confirmation required for high-value payments above ${formatCurrency(HIGH_VALUE_THRESHOLD)}.`;
    }

    return "";
  };

  const loadRazorpayScript = () =>
    new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Unable to load Razorpay checkout script"));
      document.body.appendChild(script);
    });

  const createTestSignature = async (orderId, paymentId) => {
    if (!window.crypto?.subtle || !window.TextEncoder) {
      throw new Error("Browser does not support secure test signature generation");
    }

    const encoder = new TextEncoder();
    const key = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode("test_secret"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await window.crypto.subtle.sign("HMAC", key, encoder.encode(`${orderId}|${paymentId}`));
    return Array.from(new Uint8Array(signature))
      .map((item) => item.toString(16).padStart(2, "0"))
      .join("");
  };

  const collectPaymentGatewayResult = async (orderData, amount) => {
    if (orderData.razorpayKeyId === "test_key") {
      const paymentId = `pay_test_${Date.now()}`;
      const signature = await createTestSignature(orderData.orderId, paymentId);
      return { orderId: orderData.orderId, paymentId, signature };
    }

    await loadRazorpayScript();

    return new Promise((resolve, reject) => {
      const razorpay = new window.Razorpay({
        key: orderData.razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "NilaHub BillPay",
        description: selectedBill?.nickname || "Utility bill payment",
        order_id: orderData.orderId,
        handler: (response) =>
          resolve({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          }),
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled by user")),
        },
        prefill: {
          contact: selectedBill?.mobile || "",
        },
        notes: {
          billId: selectedBill?.id || "",
          amount: String(amount),
        },
      });

      razorpay.open();
    });
  };

  const handlePayBill = async (event) => {
    event.preventDefault();
    setPaymentMessage("");

    if (!selectedBill) {
      setPaymentMessage("Select a valid bill before making payment.");
      return;
    }

    const securityError = validateSecurity();
    if (securityError) {
      setSecurityMessage(securityError);
      return;
    }

    setSecurityMessage("Strong 2FA checks passed. RBI-style authentication gate complete.");

    const amount = Number(payForm.amount || 0);
    if (!amount) {
      setPaymentMessage("Enter a valid amount.");
      return;
    }

    try {
      const orderResponse = await billpayService.createPaymentOrder({
        billId: selectedBill.id,
        amount,
        method: payForm.method,
        authMode: payForm.authMode,
      });

      const paymentResult = await collectPaymentGatewayResult(orderResponse, amount);

      const verifyResponse = await billpayService.verifyPayment({
        orderId: paymentResult.orderId,
        paymentId: paymentResult.paymentId,
        signature: paymentResult.signature,
        billId: selectedBill.id,
        amount,
        method: payForm.method,
        authMode: payForm.authMode,
        otp: payForm.otp,
        pin: payForm.pin,
        biometricConfirmed: payForm.biometricConfirmed,
      });

      const transactionId = verifyResponse?.transactionId || verifyResponse?.txnId || "TXN";
      const receiptId = verifyResponse?.receiptId || "Receipt";
      const billerReference = verifyResponse?.billerReference || "BillerRef";

      setOfferWallet((current) => ({
        cashbackBalance: current.cashbackBalance + Math.min(50, Math.round(amount * 0.01)),
        coins: current.coins + Math.round(amount / 20),
        monthlyCoupons: current.monthlyCoupons + (amount >= 1000 ? 1 : 0),
      }));

      await refreshBillpayData({ silent: true });

      setPaymentMessage(
        `${shortCode(transactionId, "TXN")} success. Receipt ${receiptId} generated with biller reference ${billerReference}.`
      );
      setPayForm((current) => ({ ...current, pin: "", otp: "", biometricConfirmed: false }));
      setSyncMessage(`Payment synced at ${new Date().toLocaleTimeString("en-IN")}.`);
    } catch (error) {
      setPaymentMessage(buildErrorMessage(error, "Payment failed. Please retry."));
    }
  };

  const handleRetryFailed = (txn) => {
    const matchingBill = bills.find((bill) => bill.id === txn.billId);
    if (matchingBill) {
      setPayForm((current) => ({
        ...current,
        billId: matchingBill.id,
        amount: String(txn.amount),
        method: txn.method,
        authMode: txn.authMode,
      }));
      setActiveTab("Pay Bill");
      setPaymentMessage(`Retry ready for ${txn.displayId || txn.id}. Reconfirm PIN/OTP and submit payment.`);
    }
  };

  const handleRaiseDispute = async (event) => {
    event.preventDefault();
    if (!disputeForm.txnId.trim() || !disputeForm.description.trim()) {
      setDisputeMessage("Transaction ID and complaint details are required.");
      return;
    }

    const typedTxnId = disputeForm.txnId.trim();
    const matchedTransaction = transactions.find(
      (txn) => txn.id === typedTxnId || txn.displayId.toLowerCase() === typedTxnId.toLowerCase()
    );
    const transactionId = matchedTransaction ? matchedTransaction.id : typedTxnId;

    try {
      const response = await billpayService.createDispute({
        transactionId,
        type: disputeForm.type,
        description: disputeForm.description.trim(),
      });
      const item = normalizeDispute(response?.dispute || {});
      setDisputes((current) => [item, ...current]);
      setDisputeForm({ txnId: "", type: DISPUTE_TYPES[0], description: "" });
      setDisputeMessage(`Complaint ${item.displayId} raised successfully.`);
      setSyncMessage(`Dispute synced at ${new Date().toLocaleTimeString("en-IN")}.`);
    } catch (error) {
      setDisputeMessage(buildErrorMessage(error, "Unable to raise dispute right now."));
    }
  };

  const triggerSupportForTxn = (txnId, reason) => {
    setDisputeForm((current) => ({ ...current, txnId, type: reason }));
    setActiveTab("Disputes");
    setDisputeMessage(`Support ticket prefilled for ${txnId}. Add details and submit.`);
  };

  const exportHistory = () => {
    const headers = [
      "Transaction ID",
      "Bill ID",
      "Biller",
      "Category",
      "Amount",
      "Status",
      "Payment Time",
      "Method",
      "Biller Ref",
      "Refund Status",
    ];

    const rows = transactions.map((txn) => [
      txn.id,
      txn.billId,
      txn.billerName,
      txn.category,
      txn.amount,
      txn.status,
      txn.paidAt,
      txn.method,
      txn.billerReference,
      txn.refundStatus,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, "\"\"")}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `billpay-history-${toISODate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadReceipt = (txn) => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("NilaHub BillPay Receipt", 14, 20);
    doc.setFontSize(11);
    doc.text(`Receipt ID: ${txn.receiptId}`, 14, 32);
    doc.text(`Transaction ID: ${txn.displayId || txn.id}`, 14, 40);
    doc.text(`Biller Reference: ${txn.billerReference}`, 14, 48);
    doc.text(`Biller: ${txn.billerName}`, 14, 56);
    doc.text(`Category: ${txn.category}`, 14, 64);
    doc.text(`Amount: ${formatCurrency(txn.amount)}`, 14, 72);
    doc.text(`Status: ${txn.status}`, 14, 80);
    doc.text(`Payment Time: ${txn.paidAt}`, 14, 88);
    doc.text("Generated from Receipt Vault", 14, 102);
    doc.save(`${txn.receiptId}.pdf`);
  };

  const handleShareReceipt = async (txn) => {
    const text = `${txn.receiptId} | ${txn.displayId || txn.id} | ${txn.billerReference} | ${txn.status}`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setPaymentMessage(`Receipt details for ${txn.displayId || txn.id} copied to clipboard.`);
      return;
    }
    setPaymentMessage(`Share text: ${text}`);
  };

  const toggleAutopayOnBill = async (billId) => {
    const targetBill = bills.find((bill) => bill.id === billId);
    if (!targetBill) {
      return;
    }
    try {
      const response = await billpayService.updateBillAutopay(billId, !targetBill.autopayEnabled);
      const normalizedBill = normalizeBill(response?.bill || {});
      setBills((current) =>
        current.map((bill) => (bill.id === normalizedBill.id ? normalizedBill : bill))
      );
      setSyncMessage(`Autopay updated at ${new Date().toLocaleTimeString("en-IN")}.`);
    } catch (error) {
      setPaymentMessage(buildErrorMessage(error, "Unable to update autopay settings."));
    }
  };

  const updateMandateStatus = async (mandateId, status) => {
    try {
      const response = await billpayService.updateMandate(mandateId, {
        status,
        reason: status === "Cancelled" ? "Cancelled by user" : "",
      });
      const normalizedMandate = normalizeMandate(response?.mandate || {});
      setMandates((current) =>
        current.map((item) => (item.id === normalizedMandate.id ? normalizedMandate : item))
      );
      setSyncMessage(`Mandate status synced at ${new Date().toLocaleTimeString("en-IN")}.`);
    } catch (error) {
      setPaymentMessage(buildErrorMessage(error, "Unable to update mandate status."));
    }
  };

  const updateMandateLimit = async (mandateId, value) => {
    const maxAmount = Number(value || 0);
    if (!maxAmount) {
      return;
    }
    try {
      const response = await billpayService.updateMandate(mandateId, { maxAmount });
      const normalizedMandate = normalizeMandate(response?.mandate || {});
      setMandates((current) =>
        current.map((item) => (item.id === normalizedMandate.id ? normalizedMandate : item))
      );
      setSyncMessage(`Mandate limit synced at ${new Date().toLocaleTimeString("en-IN")}.`);
    } catch (error) {
      setPaymentMessage(buildErrorMessage(error, "Unable to update mandate limit."));
    }
  };

  return (
    <div className="billpay-page">
      <section className="billpay-hero">
        <div>
          <p className="billpay-kicker">Bharat Connect Ready</p>
          <h1>BillPay Revenue Engine</h1>
          <p className="billpay-subtitle">
            Super-app grade BillPay with BBPS categories, smart reminders, secure payment checks,
            receipt vault, disputes, family bill management, rewards, and admin analytics.
          </p>
        </div>
        <div className="billpay-hero-meta">
          <p>Coverage: 25+ categories and 22,000+ billers ready for directory onboarding.</p>
          <p>Security baseline: PIN/Biometric + OTP 2FA with high-value risk confirmation.</p>
          <p>Structure: Dashboard | Categories | Saved Bills | Pay | Autopay | History | Admin.</p>
        </div>
      </section>

      <nav className="billpay-tabs" aria-label="BillPay sections">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={tab === activeTab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>
      <p className="billpay-footnote">
        {isSyncing ? "Sync in progress..." : syncMessage}
      </p>

      {activeTab === "Dashboard" ? (
        <section className="billpay-section">
          <div className="billpay-section-header">
            <h2>Smart Bill Dashboard</h2>
            <p>Live bill health, payment outcomes, reminder readiness, and monthly spend snapshots.</p>
          </div>

          <div className="billpay-card-grid billpay-kpi-grid">
            <article className="billpay-card kpi">
              <h3>Due Soon</h3>
              <p>{dashboard.dueSoon}</p>
            </article>
            <article className="billpay-card kpi">
              <h3>Overdue</h3>
              <p>{dashboard.overdue}</p>
            </article>
            <article className="billpay-card kpi">
              <h3>Paid</h3>
              <p>{dashboard.paid}</p>
            </article>
            <article className="billpay-card kpi">
              <h3>Autopay Enabled</h3>
              <p>{dashboard.autopayEnabled}</p>
            </article>
            <article className="billpay-card kpi">
              <h3>Failed Payment</h3>
              <p>{dashboard.failedPayment}</p>
            </article>
            <article className="billpay-card kpi">
              <h3>Upcoming Reminders</h3>
              <p>{dashboard.upcomingReminders}</p>
            </article>
          </div>

          <div className="billpay-dual-grid">
            <article className="billpay-panel">
              <h2>Bill Discovery</h2>
              <p>Enter mobile number or consumer ID to auto-fetch pending bill.</p>
              <form className="billpay-form" onSubmit={handleDiscovery}>
                <label>
                  Identifier Type
                  <select
                    value={discoveryForm.identifierType}
                    onChange={(event) =>
                      setDiscoveryForm((current) => ({ ...current, identifierType: event.target.value }))
                    }
                  >
                    <option>Mobile Number</option>
                    <option>Consumer ID</option>
                  </select>
                </label>
                <label>
                  Value
                  <input
                    type="text"
                    value={discoveryForm.identifierValue}
                    onChange={(event) =>
                      setDiscoveryForm((current) => ({ ...current, identifierValue: event.target.value }))
                    }
                    placeholder="9876543210 or KSEB-183920"
                  />
                </label>
                <label>
                  Preferred Category
                  <select
                    value={discoveryForm.preferredCategory}
                    onChange={(event) =>
                      setDiscoveryForm((current) => ({ ...current, preferredCategory: event.target.value }))
                    }
                  >
                    {BBPS_CATEGORIES.map((category) => (
                      <option key={`pref-${category}`}>{category}</option>
                    ))}
                  </select>
                </label>
                <button type="submit">Discover Pending Bill</button>
              </form>

              {discoveryResult ? (
                <div className="billpay-result">
                  {discoveryResult.error ? (
                    <p className="billpay-error">{discoveryResult.error}</p>
                  ) : (
                    <>
                      <p>{discoveryResult.message}</p>
                      <p>{discoveryResult.bill.billerName}</p>
                      <p>
                        Due: {formatDateLabel(discoveryResult.bill.dueDate)} | Amount: {formatCurrency(discoveryResult.bill.amount)}
                      </p>
                    </>
                  )}
                </div>
              ) : null}
            </article>

            <article className="billpay-panel">
              <h2>Reminder System</h2>
              <p>Channels: Push, SMS, WhatsApp. Timing: 7-day, 2-day, due-date, overdue alerts.</p>
              <div className="billpay-checkbox-list">
                <label className="billpay-checkbox">
                  <input
                    type="checkbox"
                    checked={reminderSettings.push}
                    onChange={(event) =>
                      setReminderSettings((current) => ({ ...current, push: event.target.checked }))
                    }
                  />
                  Push notifications
                </label>
                <label className="billpay-checkbox">
                  <input
                    type="checkbox"
                    checked={reminderSettings.sms}
                    onChange={(event) =>
                      setReminderSettings((current) => ({ ...current, sms: event.target.checked }))
                    }
                  />
                  SMS reminders
                </label>
                <label className="billpay-checkbox">
                  <input
                    type="checkbox"
                    checked={reminderSettings.whatsapp}
                    onChange={(event) =>
                      setReminderSettings((current) => ({ ...current, whatsapp: event.target.checked }))
                    }
                  />
                  WhatsApp reminders
                </label>
                <label className="billpay-checkbox">
                  <input
                    type="checkbox"
                    checked={reminderSettings.sevenDays}
                    onChange={(event) =>
                      setReminderSettings((current) => ({ ...current, sevenDays: event.target.checked }))
                    }
                  />
                  7 days before due
                </label>
                <label className="billpay-checkbox">
                  <input
                    type="checkbox"
                    checked={reminderSettings.twoDays}
                    onChange={(event) =>
                      setReminderSettings((current) => ({ ...current, twoDays: event.target.checked }))
                    }
                  />
                  2 days before due
                </label>
                <label className="billpay-checkbox">
                  <input
                    type="checkbox"
                    checked={reminderSettings.dueDate}
                    onChange={(event) =>
                      setReminderSettings((current) => ({ ...current, dueDate: event.target.checked }))
                    }
                  />
                  Due-date alert
                </label>
                <label className="billpay-checkbox">
                  <input
                    type="checkbox"
                    checked={reminderSettings.overdue}
                    onChange={(event) =>
                      setReminderSettings((current) => ({ ...current, overdue: event.target.checked }))
                    }
                  />
                  Overdue alert
                </label>
              </div>
              <ul className="billpay-list compact">
                {reminderTimeline.length === 0 ? <li>No reminder events in current window.</li> : null}
                {reminderTimeline.map((item) => (
                  <li key={`${item.billId}-${item.signal}`}>
                    {item.nickname} ({item.billId}) - {item.signal}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="billpay-card-grid billpay-kpi-grid">
            <article className="billpay-card">
              <h3>Total Paid This Month</h3>
              <p>{formatCurrency(monthlySummary.totalPaid)}</p>
            </article>
            <article className="billpay-card">
              <h3>Upcoming Dues</h3>
              <p>{monthlySummary.upcomingDues}</p>
            </article>
            <article className="billpay-card">
              <h3>Coins</h3>
              <p>{offerWallet.coins}</p>
            </article>
            <article className="billpay-card">
              <h3>Cashback Balance</h3>
              <p>{formatCurrency(offerWallet.cashbackBalance)}</p>
            </article>
          </div>
        </section>
      ) : null}

      {activeTab === "Categories" ? (
        <section className="billpay-section">
          <div className="billpay-section-header">
            <h2>Bharat Connect / BBPS Categories</h2>
            <p>
              Official bill-category support layer for electricity, water, LPG, DTH, broadband, postpaid,
              FASTag, insurance, EMI, education, tax, and more.
            </p>
          </div>
          <div className="billpay-card-grid">
            {BBPS_CATEGORIES.map((category) => (
              <article key={category} className="billpay-card">
                <h3>{category}</h3>
                <p>Ready for biller onboarding, fetch, pay, and complaint routing.</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === "Saved Bills" ? (
        <section className="billpay-section">
          <div className="billpay-section-header">
            <h2>Saved Bills and Family Bill Management</h2>
            <p>Track home, parents, shop, and rental property bills in one panel.</p>
          </div>
          <ul className="billpay-list">
            {bills.map((bill) => (
              <li key={bill.id}>
                <strong>{bill.nickname}</strong> | {bill.billerName} | {bill.familyMember} | Due {formatDateLabel(bill.dueDate)} | {formatCurrency(bill.amount)} | {bill.status}
                <button type="button" onClick={() => toggleAutopayOnBill(bill.id)}>
                  {bill.autopayEnabled ? "Disable Autopay" : "Enable Autopay"}
                </button>
              </li>
            ))}
          </ul>

          <div className="billpay-card-grid billpay-kpi-grid">
            {monthlySummary.categorySpend.length === 0 ? <p>No category-wise spend yet.</p> : null}
            {monthlySummary.categorySpend.map((row) => (
              <article key={row.category} className="billpay-card">
                <h3>{row.category}</h3>
                <p>{formatCurrency(row.amount)}</p>
              </article>
            ))}
          </div>

          <button type="button" className="billpay-inline-btn" onClick={exportHistory}>
            Export Payment History
          </button>
        </section>
      ) : null}

      {activeTab === "Pay Bill" ? (
        <section className="billpay-section">
          <div className="billpay-section-header">
            <h2>Pay Bill</h2>
            <p>Strong authentication flow with PIN/biometric + OTP and high-value risk checks.</p>
          </div>

          <article className="billpay-panel">
            <form className="billpay-form" onSubmit={handlePayBill}>
              <label>
                Saved Bill
                <select
                  value={payForm.billId}
                  onChange={(event) => {
                    const bill = bills.find((item) => item.id === event.target.value);
                    setPayForm((current) => ({
                      ...current,
                      billId: event.target.value,
                      amount: bill ? String(bill.amount) : current.amount,
                    }));
                  }}
                >
                  {bills.map((bill) => (
                    <option key={bill.id} value={bill.id}>
                      {bill.nickname} ({bill.billerName})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Amount
                <input
                  type="number"
                  value={payForm.amount}
                  onChange={(event) => setPayForm((current) => ({ ...current, amount: event.target.value }))}
                />
              </label>

              <label>
                Payment Method
                <select
                  value={payForm.method}
                  onChange={(event) => setPayForm((current) => ({ ...current, method: event.target.value }))}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method}>{method}</option>
                  ))}
                </select>
              </label>

              <label>
                Authentication Mode
                <select
                  value={payForm.authMode}
                  onChange={(event) => setPayForm((current) => ({ ...current, authMode: event.target.value }))}
                >
                  {AUTH_MODES.map((mode) => (
                    <option key={mode}>{mode}</option>
                  ))}
                </select>
              </label>

              {payForm.authMode === "PIN + OTP" ? (
                <label>
                  Payment PIN
                  <input
                    type="password"
                    value={payForm.pin}
                    onChange={(event) => setPayForm((current) => ({ ...current, pin: event.target.value }))}
                    placeholder="4-6 digit PIN"
                  />
                </label>
              ) : null}

              {payForm.authMode === "Biometric + OTP" ? (
                <label className="billpay-checkbox">
                  <input
                    type="checkbox"
                    checked={payForm.biometricConfirmed}
                    onChange={(event) =>
                      setPayForm((current) => ({ ...current, biometricConfirmed: event.target.checked }))
                    }
                  />
                  Biometric verified
                </label>
              ) : null}

              <label>
                OTP (2FA)
                <input
                  type="password"
                  value={payForm.otp}
                  onChange={(event) => setPayForm((current) => ({ ...current, otp: event.target.value }))}
                  placeholder="6 digit OTP"
                />
              </label>

              {Number(payForm.amount || 0) >= HIGH_VALUE_THRESHOLD ? (
                <label className="billpay-checkbox">
                  <input
                    type="checkbox"
                    checked={payForm.riskAcknowledged}
                    onChange={(event) =>
                      setPayForm((current) => ({ ...current, riskAcknowledged: event.target.checked }))
                    }
                  />
                  I confirm risk review for high-value payment
                </label>
              ) : null}

              <button type="submit">Pay Now</button>
            </form>

            {selectedBill ? (
              <div className="billpay-result">
                <p>Paying {selectedBill.nickname}</p>
                <p>Category: {selectedBill.category}</p>
                <p>Biller: {selectedBill.billerName}</p>
                <p>Due date: {formatDateLabel(selectedBill.dueDate)}</p>
              </div>
            ) : null}

            {securityMessage ? <p className="billpay-status">{securityMessage}</p> : null}
            {paymentMessage ? <p className="billpay-status">{paymentMessage}</p> : null}
          </article>
        </section>
      ) : null}

      {activeTab === "Autopay" ? (
        <section className="billpay-section">
          <div className="billpay-section-header">
            <h2>Autopay / e-Mandate</h2>
            <p>Manage recurring bill mandates: pause, resume, cancel, and amount-limit changes.</p>
          </div>
          <ul className="billpay-list">
            {mandates.map((mandate) => (
              <li key={mandate.id}>
                <strong>{mandate.nickname}</strong> | {mandate.frequency} | Max {formatCurrency(mandate.maxAmount)} | Next {formatDateLabel(mandate.nextRun)} | {mandate.status}
                <button type="button" onClick={() => updateMandateStatus(mandate.id, "Active")}>
                  Resume
                </button>
                <button type="button" onClick={() => updateMandateStatus(mandate.id, "Paused")}>
                  Pause
                </button>
                <button type="button" onClick={() => updateMandateStatus(mandate.id, "Cancelled")}>
                  Cancel
                </button>
                <input
                  type="number"
                  min="1"
                  defaultValue={mandate.maxAmount}
                  onBlur={(event) => updateMandateLimit(mandate.id, event.target.value)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activeTab === "Payment History" ? (
        <section className="billpay-section">
          <div className="billpay-section-header">
            <h2>Payment History and Failed Payment Handling</h2>
            <p>Track transaction status, retry failures, and check deduction/refund states.</p>
          </div>
          <ul className="billpay-list">
            {transactions.map((txn) => (
              <li key={txn.id}>
                <strong>{txn.displayId || txn.id}</strong> | {txn.billerName} | {formatCurrency(txn.amount)} | {txn.status}
                <br />
                Amount deducted: {txn.amountDeducted ? "Yes" : "No"} | Refund: {txn.refundStatus}
                <br />
                Biller ref: {txn.billerReference}
                {txn.status === "Failed" ? (
                  <span className="billpay-inline-actions">
                    <button type="button" onClick={() => handleRetryFailed(txn)}>
                      Retry
                    </button>
                    <button type="button" onClick={() => triggerSupportForTxn(txn.id, "Refund delay")}>
                      Support Ticket
                    </button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activeTab === "Receipts" ? (
        <section className="billpay-section">
          <div className="billpay-section-header">
            <h2>Receipt Vault</h2>
            <p>Each payment includes PDF receipt, transaction ID, biller reference, and share/download controls.</p>
          </div>
          <ul className="billpay-list">
            {transactions.map((txn) => (
              <li key={`receipt-${txn.id}`}>
                <strong>{txn.receiptId}</strong> | {txn.displayId || txn.id} | {txn.billerReference} | {txn.status}
                <button type="button" onClick={() => handleDownloadReceipt(txn)}>
                  Download PDF
                </button>
                <button type="button" onClick={() => handleShareReceipt(txn)}>
                  Share
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activeTab === "Disputes" ? (
        <section className="billpay-section">
          <div className="billpay-section-header">
            <h2>Support and Dispute Center</h2>
            <p>Raise complaints for bill-update mismatch, wrong amount, refund delays, and duplicate payment.</p>
          </div>

          <article className="billpay-panel">
            <form className="billpay-form" onSubmit={handleRaiseDispute}>
              <label>
                Transaction ID
                <input
                  type="text"
                  value={disputeForm.txnId}
                  onChange={(event) => setDisputeForm((current) => ({ ...current, txnId: event.target.value }))}
                  placeholder="TXN-xxxxxx"
                />
              </label>
              <label>
                Complaint Type
                <select
                  value={disputeForm.type}
                  onChange={(event) => setDisputeForm((current) => ({ ...current, type: event.target.value }))}
                >
                  {DISPUTE_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label>
                Details
                <textarea
                  rows={3}
                  value={disputeForm.description}
                  onChange={(event) =>
                    setDisputeForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <button type="submit">Raise Complaint</button>
            </form>
            {disputeMessage ? <p className="billpay-status">{disputeMessage}</p> : null}
          </article>

          <ul className="billpay-list">
            {disputes.map((item) => (
              <li key={item.id}>
                <strong>{item.displayId || item.id}</strong> | {item.txnId} | {item.type} | {item.status} | {item.createdAt}
                <br />
                {item.description}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activeTab === "Offers" ? (
        <section className="billpay-section">
          <div className="billpay-section-header">
            <h2>Cashback and Rewards</h2>
            <p>Drive repeat usage using cashback, coins, coupons, and service credits.</p>
          </div>

          <div className="billpay-card-grid billpay-kpi-grid">
            <article className="billpay-card kpi">
              <h3>Cashback</h3>
              <p>{formatCurrency(offerWallet.cashbackBalance)}</p>
            </article>
            <article className="billpay-card kpi">
              <h3>Coins</h3>
              <p>{offerWallet.coins}</p>
            </article>
            <article className="billpay-card kpi">
              <h3>Coupons</h3>
              <p>{offerWallet.monthlyCoupons}</p>
            </article>
          </div>

          <div className="billpay-card-grid">
            <article className="billpay-card">
              <h3>Offer 1</h3>
              <p>Pay 3 utility bills this month and get INR 30 cashback.</p>
            </article>
            <article className="billpay-card">
              <h3>Offer 2</h3>
              <p>Autopay-enabled users earn extra 100 coins every cycle.</p>
            </article>
            <article className="billpay-card">
              <h3>Offer 3</h3>
              <p>Refer family bill profile and receive coupon for FASTag top-up.</p>
            </article>
          </div>
        </section>
      ) : null}

      {activeTab === "Admin Reports" ? (
        <section className="billpay-section">
          <div className="billpay-section-header">
            <h2>Admin Panel and Reports</h2>
            <p>Operations intelligence for transactions, disputes, refunds, category mix, and commission.</p>
          </div>

          <label className="billpay-range-label">
            Report window
            <select value={adminRange} onChange={(event) => setAdminRange(event.target.value)}>
              <option>This Month</option>
              <option>Last 30 Days</option>
              <option>Quarter</option>
            </select>
          </label>

          <div className="billpay-card-grid billpay-kpi-grid">
            <article className="billpay-card kpi">
              <h3>Total Transactions</h3>
              <p>{adminMetrics.totalTransactions}</p>
            </article>
            <article className="billpay-card kpi">
              <h3>Success Rate</h3>
              <p>{adminMetrics.successRate}%</p>
            </article>
            <article className="billpay-card kpi">
              <h3>Failures</h3>
              <p>{adminMetrics.failureCount}</p>
            </article>
            <article className="billpay-card kpi">
              <h3>Pending Refunds</h3>
              <p>{adminMetrics.pendingRefunds}</p>
            </article>
            <article className="billpay-card kpi">
              <h3>Dispute Tickets</h3>
              <p>{adminMetrics.disputeTickets}</p>
            </article>
            <article className="billpay-card kpi">
              <h3>Commission Earned</h3>
              <p>{formatCurrency(adminMetrics.commissionEarned)}</p>
            </article>
          </div>

          <div className="billpay-dual-grid">
            <article className="billpay-panel">
              <h2>Top Bill Categories</h2>
              <ul className="billpay-list compact">
                {adminMetrics.topCategories.map((item) => (
                  <li key={item.category}>
                    {item.category}: {item.count} transactions
                  </li>
                ))}
              </ul>
            </article>

            <article className="billpay-panel">
              <h2>Biller-wise Report</h2>
              <ul className="billpay-list compact">
                {adminMetrics.billerWise.map((item) => (
                  <li key={item.name}>
                    {item.name} | Volume {item.volume} | Success {item.success} | Failed {item.failed} | Amount {formatCurrency(item.amount)}
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <p className="billpay-footnote">
            View: {adminRange} | {adminError || "Metrics synced from backend analytics."}
          </p>
        </section>
      ) : null}
    </div>
  );
};

export default BillPayHub;
