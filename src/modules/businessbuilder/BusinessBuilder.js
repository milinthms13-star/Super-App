import React, { useEffect, useState } from "react";
import axios from "axios";
import "./BusinessBuilder.css";

const BUSINESS_TYPES = [
  "Retail",
  "Service",
  "Food",
  "Education",
  "Health",
  "Travel",
  "RealEstate",
  "Other",
];

const MINIAPP_CATEGORIES = [
  "Retail",
  "Service",
  "Food",
  "Education",
  "Health",
  "Travel",
  "Beauty",
  "Fitness",
  "Other",
];

const INITIAL_BUSINESS_FORM = {
  businessName: "",
  businessType: "Retail",
  phone: "",
  email: "",
  website: "",
  gstin: "",
  addressStreet: "",
  addressCity: "",
  addressState: "",
  addressPincode: "",
  primaryColor: "#0f766e",
  secondaryColor: "#10b981",
};

const INITIAL_INVOICE_FORM = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerGSTIN: "",
  customerAddress: "",
  dueDate: "",
  discountAmount: 0,
  currency: "INR",
  notes: "",
  items: [
    {
      name: "Consulting",
      description: "Business setup support",
      quantity: 1,
      unitPrice: 1000,
      taxRate: 18,
    },
  ],
};

const INITIAL_MINIAPP_FORM = {
  displayName: "",
  slug: "",
  category: "Retail",
  description: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  primaryColor: "#0f766e",
  secondaryColor: "#10b981",
};

const BusinessBuilder = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [business, setBusiness] = useState(null);
  const [businessForm, setBusinessForm] = useState(INITIAL_BUSINESS_FORM);
  const [invoiceForm, setInvoiceForm] = useState(INITIAL_INVOICE_FORM);
  const [miniAppForm, setMiniAppForm] = useState(INITIAL_MINIAPP_FORM);
  const [invoices, setInvoices] = useState([]);
  const [miniApps, setMiniApps] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchBusiness(), fetchInvoices(), fetchMiniApps()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusiness = async () => {
    try {
      const response = await axios.get("/api/business-builder/businesses/me");
      if (response.data?.success) {
        setBusiness(response.data.business);
        const address = response.data.business.address || {};
        setBusinessForm({
          businessName: response.data.business.businessName || "",
          businessType: response.data.business.businessType || "Retail",
          phone: response.data.business.phone || "",
          email: response.data.business.email || "",
          website: response.data.business.website || "",
          gstin: response.data.business.gstin || "",
          addressStreet: address.street || "",
          addressCity: address.city || "",
          addressState: address.state || "",
          addressPincode: address.pincode || "",
          primaryColor: response.data.business.primaryColor || "#0f766e",
          secondaryColor: response.data.business.secondaryColor || "#10b981",
        });
      }
    } catch (error) {
      // ignore missing business until created
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await axios.get("/api/business-builder/invoices");
      if (response.data?.success) {
        setInvoices(response.data.invoices || []);
      }
    } catch (error) {
      setInvoices([]);
    }
  };

  const fetchMiniApps = async () => {
    try {
      const response = await axios.get("/api/business-builder/mini-apps");
      if (response.data?.success) {
        setMiniApps(response.data.miniApps || []);
      }
    } catch (error) {
      setMiniApps([]);
    }
  };

  const handleBusinessChange = (field, value) => {
    setBusinessForm((current) => ({ ...current, [field]: value }));
  };

  const handleInvoiceChange = (field, value) => {
    setInvoiceForm((current) => ({ ...current, [field]: value }));
  };

  const handleInvoiceItemChange = (index, field, value) => {
    setInvoiceForm((current) => {
      const items = [...current.items];
      items[index] = { ...items[index], [field]: field === "quantity" || field === "unitPrice" || field === "taxRate" ? Number(value) : value };
      return { ...current, items };
    });
  };

  const handleMiniAppChange = (field, value) => {
    setMiniAppForm((current) => ({ ...current, [field]: value }));
  };

  const handleAddInvoiceItem = () => {
    setInvoiceForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          name: "New service",
          description: "",
          quantity: 1,
          unitPrice: 0,
          taxRate: 18,
        },
      ],
    }));
  };

  const showStatus = (message) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(""), 4000);
  };

  const handleSaveBusiness = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post("/api/business-builder/businesses", {
        businessName: businessForm.businessName,
        businessType: businessForm.businessType,
        phone: businessForm.phone,
        email: businessForm.email,
        website: businessForm.website,
        gstin: businessForm.gstin,
        address: {
          street: businessForm.addressStreet,
          city: businessForm.addressCity,
          state: businessForm.addressState,
          pincode: businessForm.addressPincode,
          country: "India",
        },
        primaryColor: businessForm.primaryColor,
        secondaryColor: businessForm.secondaryColor,
      });
      if (response.data?.success) {
        setBusiness(response.data.business);
        showStatus("Business profile saved successfully.");
      }
    } catch (error) {
      showStatus("Unable to save business profile. Check fields and try again.");
    }
  };

  const handleCreateInvoice = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        customerName: invoiceForm.customerName,
        customerPhone: invoiceForm.customerPhone,
        customerEmail: invoiceForm.customerEmail,
        customerGSTIN: invoiceForm.customerGSTIN,
        customerAddress: invoiceForm.customerAddress,
        dueDate: invoiceForm.dueDate,
        discountAmount: Number(invoiceForm.discountAmount || 0),
        currency: invoiceForm.currency,
        notes: invoiceForm.notes,
        items: invoiceForm.items,
      };
      const response = await axios.post("/api/business-builder/invoices", payload);
      if (response.data?.success) {
        setInvoiceForm(INITIAL_INVOICE_FORM);
        fetchInvoices();
        showStatus("Invoice created successfully.");
      }
    } catch (error) {
      showStatus("Unable to create invoice. Please verify item details and try again.");
    }
  };

  const handleCreateMiniApp = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        displayName: miniAppForm.displayName,
        slug: miniAppForm.slug,
        category: miniAppForm.category,
        branding: {
          logo: "",
          primaryColor: miniAppForm.primaryColor,
          secondaryColor: miniAppForm.secondaryColor,
          description: miniAppForm.description,
        },
        businessProfile: {
          email: miniAppForm.email,
          phone: miniAppForm.phone,
          address: miniAppForm.address,
          website: miniAppForm.website,
        },
        configuration: {
          language: "en",
          enableChat: true,
          enableReviews: true,
          enablePayments: true,
        },
      };
      const response = await axios.post("/api/business-builder/mini-apps", payload);
      if (response.data?.success) {
        setMiniAppForm(INITIAL_MINIAPP_FORM);
        fetchMiniApps();
        showStatus("Mini app created successfully.");
      }
    } catch (error) {
      showStatus("Unable to create mini app. Try a different slug and check required fields.");
    }
  };

  const downloadPdf = async (invoiceId, invoiceNumber) => {
    try {
      const response = await axios.get(`/api/business-builder/invoices/${invoiceId}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoiceNumber || "invoice"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showStatus("Unable to download PDF. Please try again later.");
    }
  };

  const renderInvoiceItems = () => {
    return invoiceForm.items.map((item, index) => (
      <div className="invoice-item-row" key={`item-${index}`}>
        <input
          type="text"
          value={item.name}
          onChange={(event) => handleInvoiceItemChange(index, "name", event.target.value)}
          placeholder="Item name"
        />
        <input
          type="number"
          value={item.quantity}
          onChange={(event) => handleInvoiceItemChange(index, "quantity", event.target.value)}
          min="1"
          placeholder="Qty"
        />
        <input
          type="number"
          value={item.unitPrice}
          onChange={(event) => handleInvoiceItemChange(index, "unitPrice", event.target.value)}
          min="0"
          placeholder="Unit price"
        />
        <input
          type="number"
          value={item.taxRate}
          onChange={(event) => handleInvoiceItemChange(index, "taxRate", event.target.value)}
          min="0"
          placeholder="Tax %"
        />
      </div>
    ));
  };

  return (
    <div className="business-builder-page">
      <div className="page-header">
        <div>
          <p className="module-label">AI Business Builder</p>
          <h1>Mini App Platform & Invoice Studio</h1>
          <p className="page-description">
            Build a business profile, create branded mini apps, and generate customer invoices from one place.
          </p>
        </div>
      </div>

      <div className="business-builder-tabs">
        <button
          className={`tab-button ${activeTab === "overview" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab("overview")}
        >
          Business Profile
        </button>
        <button
          className={`tab-button ${activeTab === "invoices" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab("invoices")}
        >
          Invoice Studio
        </button>
        <button
          className={`tab-button ${activeTab === "miniapps" ? "active" : ""}`}
          type="button"
          onClick={() => setActiveTab("miniapps")}
        >
          Mini App Builder
        </button>
      </div>

      {statusMessage && <div className="status-banner">{statusMessage}</div>}
      {loading && <div className="status-banner info">Refreshing data...</div>}

      {activeTab === "overview" && (
        <div className="section-card">
          <h2>Business profile</h2>
          <p className="section-subtitle">
            Save your business identity so invoice, mini app, and customer communication flows stay consistent.
          </p>

          <form className="form-grid" onSubmit={handleSaveBusiness}>
            <label>
              Business name
              <input
                value={businessForm.businessName}
                onChange={(event) => handleBusinessChange("businessName", event.target.value)}
                required
              />
            </label>
            <label>
              Business type
              <select
                value={businessForm.businessType}
                onChange={(event) => handleBusinessChange("businessType", event.target.value)}
              >
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Contact phone
              <input
                value={businessForm.phone}
                onChange={(event) => handleBusinessChange("phone", event.target.value)}
                required
              />
            </label>
            <label>
              Contact email
              <input
                type="email"
                value={businessForm.email}
                onChange={(event) => handleBusinessChange("email", event.target.value)}
                required
              />
            </label>
            <label>
              Website
              <input
                value={businessForm.website}
                onChange={(event) => handleBusinessChange("website", event.target.value)}
              />
            </label>
            <label>
              GSTIN
              <input
                value={businessForm.gstin}
                onChange={(event) => handleBusinessChange("gstin", event.target.value)}
              />
            </label>
            <label>
              Street address
              <input
                value={businessForm.addressStreet}
                onChange={(event) => handleBusinessChange("addressStreet", event.target.value)}
              />
            </label>
            <label>
              City
              <input
                value={businessForm.addressCity}
                onChange={(event) => handleBusinessChange("addressCity", event.target.value)}
              />
            </label>
            <label>
              State
              <input
                value={businessForm.addressState}
                onChange={(event) => handleBusinessChange("addressState", event.target.value)}
              />
            </label>
            <label>
              PIN code
              <input
                value={businessForm.addressPincode}
                onChange={(event) => handleBusinessChange("addressPincode", event.target.value)}
              />
            </label>
            <label>
              Primary accent
              <input
                type="color"
                value={businessForm.primaryColor}
                onChange={(event) => handleBusinessChange("primaryColor", event.target.value)}
              />
            </label>
            <label>
              Secondary accent
              <input
                type="color"
                value={businessForm.secondaryColor}
                onChange={(event) => handleBusinessChange("secondaryColor", event.target.value)}
              />
            </label>
            <button type="submit" className="button-primary">
              Save business profile
            </button>
          </form>
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="section-card">
          <h2>Invoice Studio</h2>
          <p className="section-subtitle">
            Create customer invoices, preview totals, and download PDF receipts instantly.
          </p>

          <form className="form-grid" onSubmit={handleCreateInvoice}>
            <label>
              Customer name
              <input
                value={invoiceForm.customerName}
                onChange={(event) => handleInvoiceChange("customerName", event.target.value)}
                required
              />
            </label>
            <label>
              Customer phone
              <input
                value={invoiceForm.customerPhone}
                onChange={(event) => handleInvoiceChange("customerPhone", event.target.value)}
              />
            </label>
            <label>
              Customer email
              <input
                type="email"
                value={invoiceForm.customerEmail}
                onChange={(event) => handleInvoiceChange("customerEmail", event.target.value)}
              />
            </label>
            <label>
              Customer GSTIN
              <input
                value={invoiceForm.customerGSTIN}
                onChange={(event) => handleInvoiceChange("customerGSTIN", event.target.value)}
              />
            </label>
            <label className="full-width">
              Customer address
              <textarea
                value={invoiceForm.customerAddress}
                onChange={(event) => handleInvoiceChange("customerAddress", event.target.value)}
              />
            </label>
            <label>
              Due date
              <input
                type="date"
                value={invoiceForm.dueDate}
                onChange={(event) => handleInvoiceChange("dueDate", event.target.value)}
                required
              />
            </label>
            <label>
              Discount (INR)
              <input
                type="number"
                min="0"
                value={invoiceForm.discountAmount}
                onChange={(event) => handleInvoiceChange("discountAmount", event.target.value)}
              />
            </label>
            <label>
              Currency
              <input value={invoiceForm.currency} disabled />
            </label>
            <label className="full-width">
              Notes
              <textarea
                value={invoiceForm.notes}
                onChange={(event) => handleInvoiceChange("notes", event.target.value)}
              />
            </label>

            <div className="invoice-items-header">
              <span>Item</span>
              <span>Qty</span>
              <span>Unit</span>
              <span>Tax %</span>
            </div>
            {renderInvoiceItems()}
            <button type="button" className="button-secondary" onClick={handleAddInvoiceItem}>
              Add item
            </button>
            <button type="submit" className="button-primary">
              Create invoice
            </button>
          </form>

          <div className="list-section">
            <h3>Recent invoices</h3>
            {invoices.length === 0 ? (
              <p>No invoices created yet.</p>
            ) : (
              <div className="invoice-list">
                {invoices.map((invoice) => (
                  <div className="invoice-card" key={invoice._id}>
                    <div>
                      <strong>{invoice.invoiceNumber}</strong>
                      <p>{invoice.customerName}</p>
                      <p>{invoice.currency} {invoice.total?.toFixed(2)}</p>
                    </div>
                    <div className="invoice-card-actions">
                      <button type="button" onClick={() => downloadPdf(invoice._id, invoice.invoiceNumber)}>
                        Download PDF
                      </button>
                      <span className="invoice-status">{invoice.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "miniapps" && (
        <div className="section-card">
          <h2>Mini App Builder</h2>
          <p className="section-subtitle">
            Launch a lightweight mini app for your business with a custom landing page and customer touchpoints.
          </p>

          <form className="form-grid" onSubmit={handleCreateMiniApp}>
            <label>
              App display name
              <input
                value={miniAppForm.displayName}
                onChange={(event) => handleMiniAppChange("displayName", event.target.value)}
                required
              />
            </label>
            <label>
              App slug
              <input
                value={miniAppForm.slug}
                onChange={(event) => handleMiniAppChange("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                required
                placeholder="my-store"
              />
            </label>
            <label>
              Category
              <select
                value={miniAppForm.category}
                onChange={(event) => handleMiniAppChange("category", event.target.value)}
              >
                {MINIAPP_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="full-width">
              Description
              <textarea
                value={miniAppForm.description}
                onChange={(event) => handleMiniAppChange("description", event.target.value)}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={miniAppForm.email}
                onChange={(event) => handleMiniAppChange("email", event.target.value)}
              />
            </label>
            <label>
              Phone
              <input
                value={miniAppForm.phone}
                onChange={(event) => handleMiniAppChange("phone", event.target.value)}
              />
            </label>
            <label>
              Website
              <input
                value={miniAppForm.website}
                onChange={(event) => handleMiniAppChange("website", event.target.value)}
              />
            </label>
            <label className="full-width">
              Address
              <textarea
                value={miniAppForm.address}
                onChange={(event) => handleMiniAppChange("address", event.target.value)}
              />
            </label>
            <label>
              Primary color
              <input
                type="color"
                value={miniAppForm.primaryColor}
                onChange={(event) => handleMiniAppChange("primaryColor", event.target.value)}
              />
            </label>
            <label>
              Secondary color
              <input
                type="color"
                value={miniAppForm.secondaryColor}
                onChange={(event) => handleMiniAppChange("secondaryColor", event.target.value)}
              />
            </label>
            <button type="submit" className="button-primary">
              Launch mini app
            </button>
          </form>

          <div className="list-section">
            <h3>My mini apps</h3>
            {miniApps.length === 0 ? (
              <p>No mini apps created yet.</p>
            ) : (
              <div className="miniapp-grid">
                {miniApps.map((app) => (
                  <div key={app._id} className="miniapp-card">
                    <strong>{app.displayName}</strong>
                    <p>{app.category} • {app.status}</p>
                    <p>/{app.slug}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessBuilder;
