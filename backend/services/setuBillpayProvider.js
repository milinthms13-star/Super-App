const axios = require("axios");
const logger = require("../utils/logger");

const DEFAULT_TIMEOUT_MS = 20000;
const TERMINAL_SUCCESS = new Set(["success", "successful", "paid", "completed"]);
const TERMINAL_FAILURE = new Set(["failed", "failure", "rejected", "error"]);
const IN_PROGRESS = new Set(["processing", "pending", "initiated", "queued"]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

class SetuBillpayProvider {
  constructor() {
    this.enabled = String(process.env.BILLPAY_PROVIDER || "").trim().toLowerCase() === "setu";
    this.baseUrl = String(process.env.SETU_BILLPAY_BASE_URL || "https://dg.setu.co").trim();
    this.apiVersion = String(process.env.SETU_BILLPAY_API_VERSION || "v1")
      .trim()
      .toLowerCase();
    this.requestTimeoutMs = Number(process.env.SETU_BILLPAY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
    this.maxPollAttempts = Number(process.env.SETU_BILLPAY_MAX_POLL_ATTEMPTS || 5);
    this.pollIntervalMs = Number(process.env.SETU_BILLPAY_POLL_INTERVAL_MS || 1200);
    this.strictMode = ["1", "true", "yes", "on"].includes(
      String(process.env.SETU_BILLPAY_STRICT_MODE || "").toLowerCase()
    );

    this.agentId = String(process.env.SETU_BILLPAY_AGENT_ID || "").trim();
    this.agentChannel = String(process.env.SETU_BILLPAY_AGENT_CHANNEL || "INT").trim();
    this.agentApp = String(process.env.SETU_BILLPAY_AGENT_APP || "MGRAND HUB BillPay").trim();
    this.agentMobile = String(process.env.SETU_BILLPAY_AGENT_MOBILE || "").trim();
    this.agentIfsc = String(process.env.SETU_BILLPAY_AGENT_IFSC || "").trim();

    this.remitterName = String(process.env.SETU_BILLPAY_REMITTER_NAME || "MGRAND HUB USER").trim();
    this.consumerParamName = String(
      process.env.SETU_BILLPAY_CONSUMER_PARAM_NAME || "Consumer Number"
    ).trim();

    this.apiKey = String(process.env.SETU_BILLPAY_API_KEY || "").trim();
    this.bearerToken = String(process.env.SETU_BILLPAY_BEARER_TOKEN || "").trim();
    this.clientId = String(process.env.SETU_BILLPAY_CLIENT_ID || "").trim();
    this.clientSecret = String(process.env.SETU_BILLPAY_CLIENT_SECRET || "").trim();

    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: this.requestTimeoutMs,
    });
  }

  isConfigured() {
    return Boolean(this.baseUrl && this.agentId && (this.apiKey || this.bearerToken));
  }

  getMissingConfigKeys() {
    const missing = [];
    if (!this.baseUrl) {
      missing.push("SETU_BILLPAY_BASE_URL");
    }
    if (!this.agentId) {
      missing.push("SETU_BILLPAY_AGENT_ID");
    }
    if (!this.apiKey && !this.bearerToken) {
      missing.push("SETU_BILLPAY_API_KEY or SETU_BILLPAY_BEARER_TOKEN");
    }
    return missing;
  }

  getDiagnostics() {
    const provider = this.shouldUseSetu() ? "setu" : "razorpay";
    return {
      provider,
      setuEnabled: this.shouldUseSetu(),
      configured: this.isConfigured(),
      strictMode: this.strictMode,
      baseUrl: this.baseUrl,
      apiVersion: this.apiVersion,
      maxPollAttempts: this.maxPollAttempts,
      pollIntervalMs: this.pollIntervalMs,
      missingConfig: this.getMissingConfigKeys(),
    };
  }

  shouldUseSetu() {
    return this.enabled;
  }

  getHeaders() {
    const headers = {
      "Content-Type": "application/json",
      "x-client-platform": "malabarbazaar-backend",
    };

    if (this.apiKey) {
      headers["X-SETU-BILLPAY-API-KEY"] = this.apiKey;
    }
    if (this.bearerToken) {
      headers.Authorization = `Bearer ${this.bearerToken}`;
    }
    if (this.clientId) {
      headers["X-SETU-CLIENT-ID"] = this.clientId;
    }
    if (this.clientSecret) {
      headers["X-SETU-CLIENT-SECRET"] = this.clientSecret;
    }

    return headers;
  }

  getPath(suffix) {
    return `/api/${this.apiVersion}${suffix}`;
  }

  ensureReadyForSetu() {
    if (!this.shouldUseSetu()) {
      return;
    }
    if (this.isConfigured()) {
      return;
    }
    throw new Error(
      "Setu BillPay provider is enabled but not fully configured. Missing required SETU_BILLPAY_* environment values."
    );
  }

  toSetuPaymentMode(method = "") {
    const normalized = String(method || "").trim().toLowerCase();
    if (normalized === "upi") return "UPI";
    if (normalized === "card") return "DEBIT CARD";
    if (normalized === "netbanking") return "INTERNET BANKING";
    if (normalized === "wallet") return "WALLET";
    return "UPI";
  }

  buildAgentContext(ipAddress = "") {
    const payload = {
      id: this.agentId,
      channel: this.agentChannel,
      app: this.agentApp,
    };
    if (this.agentMobile) payload.mobile = this.agentMobile;
    if (this.agentIfsc) payload.ifsc = this.agentIfsc;
    if (ipAddress) payload.ip = ipAddress;
    return payload;
  }

  extractStatusEnvelope(payload = {}) {
    const data = payload?.data || {};
    const status = normalizeStatus(data?.status || payload?.status);
    return { data, status };
  }

  isPendingStatus(status) {
    return IN_PROGRESS.has(status) || !TERMINAL_SUCCESS.has(status) && !TERMINAL_FAILURE.has(status);
  }

  async pollForTerminalStatus(responsePath, refId, contextLabel) {
    for (let attempt = 1; attempt <= this.maxPollAttempts; attempt += 1) {
      const response = await this.http.post(
        this.getPath(responsePath),
        { refId },
        { headers: this.getHeaders() }
      );

      const { data, status } = this.extractStatusEnvelope(response.data);
      if (TERMINAL_SUCCESS.has(status)) {
        return { status: "success", data };
      }
      if (TERMINAL_FAILURE.has(status)) {
        return {
          status: "failed",
          data,
          reason: data?.reason || data?.error || `${contextLabel} failed at provider`,
        };
      }
      if (attempt < this.maxPollAttempts) {
        await sleep(this.pollIntervalMs);
      }
    }

    return {
      status: "pending",
      reason: `${contextLabel} is still processing at provider`,
    };
  }

  async fetchBill({ billerId, mobile, consumerId, ipAddress }) {
    this.ensureReadyForSetu();

    const customerParamKey = this.apiVersion === "v2" ? "customerParams" : "billParameters";
    const fetchPayload = {
      agent: this.buildAgentContext(ipAddress),
      biller: {
        id: billerId,
      },
      customer: {
        mobile,
        [customerParamKey]: [
          {
            name: this.consumerParamName,
            value: consumerId,
          },
        ],
      },
    };

    const requestResponse = await this.http.post(
      this.getPath("/bbps/bills/fetch/request"),
      fetchPayload,
      { headers: this.getHeaders() }
    );

    const refId = requestResponse?.data?.data?.refId || requestResponse?.data?.refId;
    if (!refId) {
      throw new Error("Setu fetch request did not return refId");
    }

    const resolved = await this.pollForTerminalStatus(
      "/bbps/bills/fetch/response",
      refId,
      "Bill fetch"
    );

    if (resolved.status !== "success") {
      const errorMessage = resolved.reason || "Unable to fetch bill from Setu";
      if (this.strictMode) {
        throw new Error(errorMessage);
      }
      logger.warn(`Setu bill fetch unresolved for refId=${refId}: ${errorMessage}`);
    }

    const responseData = resolved.data || {};
    const normalizedBill =
      Array.isArray(responseData.bills) && responseData.bills.length > 0
        ? responseData.bills[0]
        : responseData.bill || null;

    return {
      refId,
      raw: responseData,
      bill: normalizedBill,
      status: resolved.status,
    };
  }

  async createPaymentRequest({ refId, amount, method, ipAddress }) {
    this.ensureReadyForSetu();

    const nowIso = new Date().toISOString();
    const paymentRefId = `MBBP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const paymentPayload = {
      refId,
      paymentDetails: {
        amount: Math.round(Number(amount || 0) * 100),
        mode: this.toSetuPaymentMode(method),
        paymentRefId,
        timestamp: nowIso,
      },
      remitter: {
        name: this.remitterName,
      },
      agent: this.buildAgentContext(ipAddress),
    };

    const requestResponse = await this.http.post(
      this.getPath("/bbps/bills/payment/request"),
      paymentPayload,
      { headers: this.getHeaders() }
    );

    const providerRefId = requestResponse?.data?.data?.refId || requestResponse?.data?.refId || refId;
    if (!providerRefId) {
      throw new Error("Setu payment request did not return refId");
    }

    return {
      refId: providerRefId,
      paymentRefId,
    };
  }

  async verifyPayment(refId) {
    this.ensureReadyForSetu();
    const resolved = await this.pollForTerminalStatus(
      "/bbps/bills/payment/response",
      refId,
      "Bill payment"
    );

    return {
      ...resolved,
      refId,
    };
  }
}

module.exports = new SetuBillpayProvider();
