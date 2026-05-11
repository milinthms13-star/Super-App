import React, { useMemo, useState } from "react";
import "./BillPayHub.css";

const BILL_CATEGORIES = [
  "Electricity",
  "Water",
  "Gas",
  "Broadband",
  "DTH",
  "Insurance",
  "Loan EMI",
  "FASTag",
  "Education Fees",
  "Property Tax",
];

const KERALA_QUICK_BILLERS = [
  "KSEB",
  "Kerala Water Authority",
  "Kerala Property Tax",
  "Panchayat Payments",
];

const SANDBOX_PROVIDERS = [
  {
    id: "bharat-connect",
    name: "Bharat Connect Developers",
    mode: "Official docs + sandbox guidance",
    supports: ["Biller catalog", "Developer onboarding", "Testing architecture"],
  },
  {
    id: "kotak-bbps",
    name: "Kotak BBPS Sandbox",
    mode: "Sandbox API",
    supports: ["Bill fetch", "Bill validation", "Bill payment", "Complaint", "Txn status"],
  },
  {
    id: "setu-bbps",
    name: "Setu BBPS APIs",
    mode: "Modern fintech APIs",
    supports: ["EMI", "Utility bills", "Subscriptions", "Insurance"],
  },
  {
    id: "imb-bbps",
    name: "IMB Payment BBPS Sandbox",
    mode: "Sandbox testing",
    supports: ["Testing integration flow", "Transaction simulation"],
  },
];

const INITIAL_FETCH_FORM = {
  provider: "kotak-bbps",
  billerId: "KSEB",
  consumerNumber: "",
  category: "Electricity",
};

const INITIAL_PAYMENT_FORM = {
  amount: "",
  mode: "UPI",
  includeConvenienceFee: false,
};

const INITIAL_REMINDER_FORM = {
  title: "",
  category: "Electricity",
  dueDate: "",
  repeatMonthly: true,
  notifyFamily: false,
};

const INITIAL_SAVED_ACCOUNT = {
  nickname: "",
  billerId: "KSEB",
  consumerNumber: "",
  familyMember: "Self",
};

const INITIAL_AGENT_ORDER = {
  customerName: "",
  category: "Electricity",
  area: "Trivandrum",
  amount: "",
  notes: "",
};

const INITIAL_AI_INSIGHT_FORM = {
  previousAmount: "",
  currentAmount: "",
  category: "Electricity",
};

const mockBillerProfiles = {
  KSEB: { label: "Kerala State Electricity Board", avgDueWindow: "5-10 days" },
  "Kerala Water Authority": { label: "Kerala Water Authority", avgDueWindow: "7-12 days" },
  Airtel: { label: "Airtel Broadband", avgDueWindow: "3-7 days" },
  "Loan EMI": { label: "Loan EMI", avgDueWindow: "1-3 days" },
};

const BillPayHub = () => {
  const [fetchForm, setFetchForm] = useState(INITIAL_FETCH_FORM);
  const [fetchResult, setFetchResult] = useState(null);
  const [paymentForm, setPaymentForm] = useState(INITIAL_PAYMENT_FORM);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [statusQuery, setStatusQuery] = useState("");
  const [statusResult, setStatusResult] = useState("");
  const [reminderForm, setReminderForm] = useState(INITIAL_REMINDER_FORM);
  const [savedAccountForm, setSavedAccountForm] = useState(INITIAL_SAVED_ACCOUNT);
  const [savedAccounts, setSavedAccounts] = useState([
    {
      id: "acc-1",
      nickname: "Home Current",
      billerId: "KSEB",
      consumerNumber: "KSEB-183920",
      familyMember: "Self",
    },
  ]);
  const [reminders, setReminders] = useState([
    {
      id: "rem-1",
      title: "KSEB Monthly Bill",
      category: "Electricity",
      dueDate: "2026-05-21",
      repeatMonthly: true,
      notifyFamily: true,
    },
  ]);
  const [transactions, setTransactions] = useState([
    {
      id: "TXN-100921",
      billerId: "KSEB",
      category: "Electricity",
      amount: 1340,
      status: "Success",
      mode: "UPI",
      paidAt: "2026-05-08 11:22",
    },
  ]);
  const [agentOrderForm, setAgentOrderForm] = useState(INITIAL_AGENT_ORDER);
  const [agentTasks, setAgentTasks] = useState([
    {
      id: "AG-3011",
      customerName: "Saraswathi Amma",
      category: "Water",
      area: "Kollam",
      amount: 680,
      status: "Assigned",
    },
  ]);
  const [aiInsightForm, setAiInsightForm] = useState(INITIAL_AI_INSIGHT_FORM);
  const [aiInsight, setAiInsight] = useState("");
  const [receiptMessage, setReceiptMessage] = useState("");

  const pendingBills = useMemo(
    () =>
      reminders
        .filter((item) => item.dueDate)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 4),
    [reminders]
  );

  const totalMonthlySpend = useMemo(
    () => transactions.reduce((total, txn) => total + Number(txn.amount || 0), 0),
    [transactions]
  );

  const handleFetchBill = (event) => {
    event.preventDefault();
    if (!fetchForm.consumerNumber.trim()) {
      setFetchResult({ error: "Enter consumer number before fetch." });
      return;
    }

    const profile = mockBillerProfiles[fetchForm.billerId] || {
      label: fetchForm.billerId,
      avgDueWindow: "5-9 days",
    };
    const baseAmount = 500 + Math.floor(Math.random() * 2500);
    const dueDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    setFetchResult({
      billerLabel: profile.label,
      amount: baseAmount,
      dueDate,
      consumerNumber: fetchForm.consumerNumber.trim(),
      provider: SANDBOX_PROVIDERS.find((provider) => provider.id === fetchForm.provider)?.name,
      avgDueWindow: profile.avgDueWindow,
      status: "Bill fetched successfully in sandbox mode.",
    });
    setPaymentForm((current) => ({ ...current, amount: String(baseAmount) }));
  };

  const handlePayBill = (event) => {
    event.preventDefault();
    if (!fetchResult || fetchResult.error) {
      setPaymentStatus("Fetch a valid bill before payment.");
      return;
    }

    const amount = Number(paymentForm.amount || 0);
    if (!amount) {
      setPaymentStatus("Enter valid amount.");
      return;
    }

    const txnId = `TXN-${Date.now().toString().slice(-6)}`;
    const convenienceFee = paymentForm.includeConvenienceFee ? 8 : 0;
    const totalAmount = amount + convenienceFee;
    const record = {
      id: txnId,
      billerId: fetchForm.billerId,
      category: fetchForm.category,
      amount: totalAmount,
      status: "Success",
      mode: paymentForm.mode,
      paidAt: new Date().toLocaleString(),
    };

    setTransactions((current) => [record, ...current].slice(0, 20));
    setPaymentStatus(
      `${txnId} successful in sandbox. Amount INR ${totalAmount} paid via ${paymentForm.mode}.`
    );
    setStatusQuery(txnId);
  };

  const handleCheckStatus = (event) => {
    event.preventDefault();
    if (!statusQuery.trim()) {
      setStatusResult("Enter transaction id.");
      return;
    }
    const found = transactions.find((txn) => txn.id === statusQuery.trim());
    if (!found) {
      setStatusResult(`No transaction found for ${statusQuery.trim()}.`);
      return;
    }
    setStatusResult(`${found.id}: ${found.status} | INR ${found.amount} | ${found.paidAt}`);
  };

  const handleSaveConnection = (event) => {
    event.preventDefault();
    if (!savedAccountForm.nickname.trim() || !savedAccountForm.consumerNumber.trim()) {
      return;
    }
    setSavedAccounts((current) => [
      {
        id: `acc-${Date.now().toString().slice(-5)}`,
        ...savedAccountForm,
      },
      ...current,
    ]);
    setSavedAccountForm(INITIAL_SAVED_ACCOUNT);
  };

  const handleAddReminder = (event) => {
    event.preventDefault();
    if (!reminderForm.title.trim() || !reminderForm.dueDate) {
      return;
    }
    setReminders((current) => [
      {
        id: `rem-${Date.now().toString().slice(-5)}`,
        ...reminderForm,
      },
      ...current,
    ]);
    setReminderForm(INITIAL_REMINDER_FORM);
  };

  const handleDownloadReceipt = (txnId) => {
    setReceiptMessage(`PDF receipt generated for ${txnId} in sandbox vault.`);
  };

  const handleCreateAgentTask = (event) => {
    event.preventDefault();
    if (!agentOrderForm.customerName.trim() || !agentOrderForm.amount) {
      return;
    }
    setAgentTasks((current) => [
      {
        id: `AG-${Date.now().toString().slice(-4)}`,
        customerName: agentOrderForm.customerName.trim(),
        category: agentOrderForm.category,
        area: agentOrderForm.area,
        amount: Number(agentOrderForm.amount),
        status: "Open",
      },
      ...current,
    ]);
    setAgentOrderForm(INITIAL_AGENT_ORDER);
  };

  const handleGenerateInsight = (event) => {
    event.preventDefault();
    const previousAmount = Number(aiInsightForm.previousAmount || 0);
    const currentAmount = Number(aiInsightForm.currentAmount || 0);
    if (!previousAmount || !currentAmount) {
      setAiInsight("Enter both previous and current values.");
      return;
    }

    const change = ((currentAmount - previousAmount) / previousAmount) * 100;
    const direction = change >= 0 ? "increased" : "reduced";
    const absChange = Math.abs(change).toFixed(1);
    setAiInsight(
      `Your ${aiInsightForm.category.toLowerCase()} bill ${direction} by ${absChange}% this cycle.`
    );
  };

  return (
    <div className="billpay-page">
      <section className="billpay-hero">
        <div>
          <p className="billpay-kicker">Nila Utility Hub</p>
          <h1>Financial Utilities and Bill Payment Module</h1>
          <p className="billpay-subtitle">
            Sandbox-first BBPS architecture for bill fetch, payment, reminders, receipt vault, and
            family utility management.
          </p>
        </div>
        <div className="billpay-hero-meta">
          <p>Frontend -> Backend -> BBPS Provider -> NPCI Bharat Connect -> Billers</p>
          <p>Phase 1: Mock + sandbox APIs | Phase 2: Live reseller onboarding</p>
        </div>
      </section>

      <section className="billpay-section">
        <div className="billpay-section-header">
          <h2>Sandbox Providers</h2>
          <p>Start free now, move to live integration later.</p>
        </div>
        <div className="billpay-card-grid">
          {SANDBOX_PROVIDERS.map((provider) => (
            <article key={provider.id} className="billpay-card">
              <h3>{provider.name}</h3>
              <p>{provider.mode}</p>
              <ul>
                {provider.supports.map((feature) => (
                  <li key={`${provider.id}-${feature}`}>{feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="billpay-dual-grid">
        <article className="billpay-panel">
          <h2>Bill Fetch API</h2>
          <form className="billpay-form" onSubmit={handleFetchBill}>
            <label>
              Sandbox provider
              <select
                value={fetchForm.provider}
                onChange={(event) =>
                  setFetchForm((current) => ({ ...current, provider: event.target.value }))
                }
              >
                {SANDBOX_PROVIDERS.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Biller id
              <input
                type="text"
                value={fetchForm.billerId}
                onChange={(event) =>
                  setFetchForm((current) => ({ ...current, billerId: event.target.value }))
                }
                placeholder="KSEB"
              />
            </label>
            <label>
              Consumer number
              <input
                type="text"
                value={fetchForm.consumerNumber}
                onChange={(event) =>
                  setFetchForm((current) => ({ ...current, consumerNumber: event.target.value }))
                }
                placeholder="123456789"
              />
            </label>
            <label>
              Category
              <select
                value={fetchForm.category}
                onChange={(event) =>
                  setFetchForm((current) => ({ ...current, category: event.target.value }))
                }
              >
                {BILL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">POST /bill/fetch</button>
          </form>
          {fetchResult ? (
            <div className="billpay-result">
              {fetchResult.error ? (
                <p className="billpay-error">{fetchResult.error}</p>
              ) : (
                <>
                  <p>{fetchResult.status}</p>
                  <p>Biller: {fetchResult.billerLabel}</p>
                  <p>Consumer: {fetchResult.consumerNumber}</p>
                  <p>Amount: INR {fetchResult.amount}</p>
                  <p>Due date: {fetchResult.dueDate}</p>
                  <p>Avg due window: {fetchResult.avgDueWindow}</p>
                </>
              )}
            </div>
          ) : null}
        </article>

        <article className="billpay-panel">
          <h2>Bill Pay and Status</h2>
          <form className="billpay-form" onSubmit={handlePayBill}>
            <label>
              Amount
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(event) =>
                  setPaymentForm((current) => ({ ...current, amount: event.target.value }))
                }
              />
            </label>
            <label>
              Mode
              <select
                value={paymentForm.mode}
                onChange={(event) =>
                  setPaymentForm((current) => ({ ...current, mode: event.target.value }))
                }
              >
                <option value="UPI">UPI</option>
                <option value="Wallet">Wallet</option>
                <option value="NetBanking">NetBanking</option>
              </select>
            </label>
            <label className="billpay-checkbox">
              <input
                type="checkbox"
                checked={paymentForm.includeConvenienceFee}
                onChange={(event) =>
                  setPaymentForm((current) => ({
                    ...current,
                    includeConvenienceFee: event.target.checked,
                  }))
                }
              />
              Include sandbox convenience fee
            </label>
            <button type="submit">POST /bill/pay</button>
          </form>
          {paymentStatus ? <p className="billpay-status">{paymentStatus}</p> : null}

          <form className="billpay-form billpay-status-form" onSubmit={handleCheckStatus}>
            <label>
              Transaction id
              <input
                type="text"
                value={statusQuery}
                onChange={(event) => setStatusQuery(event.target.value)}
                placeholder="TXN-123456"
              />
            </label>
            <button type="submit">GET /bill/status/:txnId</button>
          </form>
          {statusResult ? <p className="billpay-status">{statusResult}</p> : null}
        </article>
      </section>

      <section className="billpay-section">
        <div className="billpay-section-header">
          <h2>Dashboard</h2>
          <p>Pending bills, quick pay, saved connections, rewards-style engagement.</p>
        </div>
        <div className="billpay-card-grid billpay-dashboard-grid">
          <article className="billpay-card">
            <h3>Pending Bills</h3>
            {pendingBills.length === 0 ? (
              <p>No pending reminders yet.</p>
            ) : (
              <ul>
                {pendingBills.map((bill) => (
                  <li key={bill.id}>
                    {bill.title} - {bill.dueDate}
                  </li>
                ))}
              </ul>
            )}
          </article>
          <article className="billpay-card">
            <h3>Saved Connections</h3>
            <p>{savedAccounts.length} saved billers</p>
            <p>Family linked: {savedAccounts.filter((item) => item.familyMember !== "Self").length}</p>
          </article>
          <article className="billpay-card">
            <h3>Recent Payments</h3>
            <p>{transactions.length} records</p>
            <p>Total tracked spend: INR {totalMonthlySpend}</p>
          </article>
          <article className="billpay-card">
            <h3>Kerala Quick Fetch</h3>
            <div className="billpay-chip-row">
              {KERALA_QUICK_BILLERS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setFetchForm((current) => ({ ...current, billerId: name }))}
                >
                  {name}
                </button>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="billpay-dual-grid">
        <article className="billpay-panel">
          <h2>Saved Accounts and Family Bill Management</h2>
          <form className="billpay-form" onSubmit={handleSaveConnection}>
            <label>
              Nickname
              <input
                type="text"
                value={savedAccountForm.nickname}
                onChange={(event) =>
                  setSavedAccountForm((current) => ({ ...current, nickname: event.target.value }))
                }
              />
            </label>
            <label>
              Biller id
              <input
                type="text"
                value={savedAccountForm.billerId}
                onChange={(event) =>
                  setSavedAccountForm((current) => ({ ...current, billerId: event.target.value }))
                }
              />
            </label>
            <label>
              Consumer number
              <input
                type="text"
                value={savedAccountForm.consumerNumber}
                onChange={(event) =>
                  setSavedAccountForm((current) => ({
                    ...current,
                    consumerNumber: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Linked family member
              <select
                value={savedAccountForm.familyMember}
                onChange={(event) =>
                  setSavedAccountForm((current) => ({ ...current, familyMember: event.target.value }))
                }
              >
                <option value="Self">Self</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Spouse">Spouse</option>
                <option value="Sibling">Sibling</option>
              </select>
            </label>
            <button type="submit">Save connection</button>
          </form>

          <ul className="billpay-list">
            {savedAccounts.map((account) => (
              <li key={account.id}>
                {account.nickname} | {account.billerId} | {account.consumerNumber} |{" "}
                {account.familyMember}
              </li>
            ))}
          </ul>
        </article>

        <article className="billpay-panel">
          <h2>Smart Reminders</h2>
          <form className="billpay-form" onSubmit={handleAddReminder}>
            <label>
              Reminder title
              <input
                type="text"
                value={reminderForm.title}
                onChange={(event) =>
                  setReminderForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>
            <label>
              Category
              <select
                value={reminderForm.category}
                onChange={(event) =>
                  setReminderForm((current) => ({ ...current, category: event.target.value }))
                }
              >
                {BILL_CATEGORIES.map((category) => (
                  <option key={`rem-${category}`} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due date
              <input
                type="date"
                value={reminderForm.dueDate}
                onChange={(event) =>
                  setReminderForm((current) => ({ ...current, dueDate: event.target.value }))
                }
              />
            </label>
            <label className="billpay-checkbox">
              <input
                type="checkbox"
                checked={reminderForm.repeatMonthly}
                onChange={(event) =>
                  setReminderForm((current) => ({
                    ...current,
                    repeatMonthly: event.target.checked,
                  }))
                }
              />
              Auto detect as monthly bill
            </label>
            <label className="billpay-checkbox">
              <input
                type="checkbox"
                checked={reminderForm.notifyFamily}
                onChange={(event) =>
                  setReminderForm((current) => ({
                    ...current,
                    notifyFamily: event.target.checked,
                  }))
                }
              />
              Notify family bill group
            </label>
            <button type="submit">Add reminder</button>
          </form>
        </article>
      </section>

      <section className="billpay-dual-grid">
        <article className="billpay-panel">
          <h2>Transaction History and Receipt Vault</h2>
          <ul className="billpay-list">
            {transactions.map((txn) => (
              <li key={txn.id}>
                {txn.id} | {txn.billerId} | INR {txn.amount} | {txn.mode} | {txn.status}
                <button type="button" onClick={() => handleDownloadReceipt(txn.id)}>
                  PDF receipt
                </button>
              </li>
            ))}
          </ul>
          {receiptMessage ? <p className="billpay-status">{receiptMessage}</p> : null}
        </article>

        <article className="billpay-panel">
          <h2>AI Expense Insights</h2>
          <form className="billpay-form" onSubmit={handleGenerateInsight}>
            <label>
              Previous amount
              <input
                type="number"
                value={aiInsightForm.previousAmount}
                onChange={(event) =>
                  setAiInsightForm((current) => ({
                    ...current,
                    previousAmount: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Current amount
              <input
                type="number"
                value={aiInsightForm.currentAmount}
                onChange={(event) =>
                  setAiInsightForm((current) => ({
                    ...current,
                    currentAmount: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Category
              <select
                value={aiInsightForm.category}
                onChange={(event) =>
                  setAiInsightForm((current) => ({ ...current, category: event.target.value }))
                }
              >
                {BILL_CATEGORIES.map((category) => (
                  <option key={`insight-${category}`} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">Generate AI insight</button>
          </form>
          {aiInsight ? <p className="billpay-status">{aiInsight}</p> : null}
        </article>
      </section>

      <section className="billpay-dual-grid">
        <article className="billpay-panel">
          <h2>Local Agent Mode</h2>
          <p>
            Support elderly and offline users. Agents can assist payments and earn commission after
            live onboarding.
          </p>
          <form className="billpay-form" onSubmit={handleCreateAgentTask}>
            <label>
              Customer
              <input
                type="text"
                value={agentOrderForm.customerName}
                onChange={(event) =>
                  setAgentOrderForm((current) => ({
                    ...current,
                    customerName: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Category
              <select
                value={agentOrderForm.category}
                onChange={(event) =>
                  setAgentOrderForm((current) => ({ ...current, category: event.target.value }))
                }
              >
                {BILL_CATEGORIES.map((category) => (
                  <option key={`agent-${category}`} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Area
              <select
                value={agentOrderForm.area}
                onChange={(event) =>
                  setAgentOrderForm((current) => ({ ...current, area: event.target.value }))
                }
              >
                <option value="Trivandrum">Trivandrum</option>
                <option value="Kollam">Kollam</option>
                <option value="Alappuzha">Alappuzha</option>
                <option value="Kottayam">Kottayam</option>
                <option value="Pathanamthitta">Pathanamthitta</option>
              </select>
            </label>
            <label>
              Amount
              <input
                type="number"
                value={agentOrderForm.amount}
                onChange={(event) =>
                  setAgentOrderForm((current) => ({ ...current, amount: event.target.value }))
                }
              />
            </label>
            <label>
              Notes
              <textarea
                value={agentOrderForm.notes}
                onChange={(event) =>
                  setAgentOrderForm((current) => ({ ...current, notes: event.target.value }))
                }
                rows={2}
                placeholder="Doorstep help, preferred payment slot..."
              />
            </label>
            <button type="submit">Create agent task</button>
          </form>
        </article>

        <article className="billpay-panel">
          <h2>Agent Tasks</h2>
          <ul className="billpay-list">
            {agentTasks.map((task) => (
              <li key={task.id}>
                {task.id} | {task.customerName} | {task.category} | {task.area} | INR {task.amount} |{" "}
                {task.status}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="billpay-section">
        <div className="billpay-section-header">
          <h2>Phase Plan and Commission Strategy</h2>
          <p>Build now with sandbox, switch to live after traction.</p>
        </div>
        <div className="billpay-card-grid">
          <article className="billpay-card">
            <h3>Phase 1 - Free</h3>
            <ul>
              <li>UI + backend abstraction + sandbox mock</li>
              <li>Bill organizer, reminders, receipt vault</li>
              <li>No dependency on live approvals</li>
            </ul>
          </article>
          <article className="billpay-card">
            <h3>Phase 2 - Low Cost</h3>
            <ul>
              <li>Sub-agent onboarding with reseller route</li>
              <li>Enable live bill pay and status sync</li>
              <li>Start commission and service income</li>
            </ul>
          </article>
          <article className="billpay-card">
            <h3>Retention Advantage</h3>
            <ul>
              <li>Monthly recurring bill usage</li>
              <li>Family utility collaboration</li>
              <li>Daily/weekly reminder-driven re-engagement</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
};

export default BillPayHub;
