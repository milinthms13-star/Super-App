import React, { useState, useEffect, useMemo } from "react";
import "./BusinessServices.css";

const SERVICE_CATEGORIES = [
  {
    id: "gst-tax",
    name: "GST & Tax Services",
    icon: "📊",
    description: "Complete GST and tax compliance solutions",
    services: [
      { id: "gst-registration", name: "GST Registration", price: "₹1,500", duration: "3-5 days" },
      { id: "gst-filing", name: "GST Filing (Monthly)", price: "₹500", duration: "2-3 days" },
      { id: "gst-quarterly", name: "GST Filing (Quarterly)", price: "₹1,200", duration: "5-7 days" },
      { id: "gst-correction", name: "GST Return Correction", price: "₹800", duration: "3-5 days" },
      { id: "income-tax", name: "Income Tax Filing", price: "₹2,500", duration: "7-10 days" },
      { id: "tds-filing", name: "TDS Filing", price: "₹1,000", duration: "3-5 days" },
      { id: "pan-tan", name: "PAN/TAN Application", price: "₹300", duration: "1-2 days" },
      { id: "accounting", name: "Accounting Support", price: "₹2,000/month", duration: "Monthly" }
    ]
  },
  {
    id: "company-registration",
    name: "Company Registration",
    icon: "🏢",
    description: "Register your business with government authorities",
    services: [
      { id: "proprietorship", name: "Proprietorship Registration", price: "₹2,500", duration: "5-7 days" },
      { id: "partnership", name: "Partnership Firm Registration", price: "₹5,000", duration: "7-10 days" },
      { id: "llp", name: "LLP Registration", price: "₹15,000", duration: "15-20 days" },
      { id: "private-limited", name: "Private Limited Company", price: "₹25,000", duration: "20-25 days" },
      { id: "msme", name: "MSME/Udyam Registration", price: "₹1,000", duration: "2-3 days" },
      { id: "fssai", name: "FSSAI License", price: "₹3,500", duration: "7-10 days" },
      { id: "trade-license", name: "Trade License", price: "₹2,000", duration: "5-7 days" },
      { id: "shops-establishment", name: "Shops & Establishment", price: "₹1,500", duration: "3-5 days" }
    ]
  },
  {
    id: "legal-consultation",
    name: "Legal Consultation",
    icon: "⚖️",
    description: "Expert legal advice and documentation services",
    services: [
      { id: "business-agreement", name: "Business Agreement Drafting", price: "₹3,000", duration: "3-5 days" },
      { id: "rental-agreement", name: "Rental Agreement", price: "₹1,500", duration: "1-2 days" },
      { id: "partnership-deed", name: "Partnership Deed", price: "₹4,000", duration: "5-7 days" },
      { id: "legal-notice", name: "Legal Notice Drafting", price: "₹2,500", duration: "2-3 days" },
      { id: "trademark", name: "Trademark Registration", price: "₹8,000", duration: "30-45 days" },
      { id: "consumer-complaint", name: "Consumer Complaint Support", price: "₹2,000", duration: "3-5 days" },
      { id: "legal-consultation", name: "Legal Consultation", price: "₹1,000/hour", duration: "1 hour" },
      { id: "advocate-booking", name: "Advocate Booking", price: "₹2,000", duration: "As scheduled" }
    ]
  },
  {
    id: "digital-marketing",
    name: "Digital Marketing",
    icon: "📱",
    description: "Boost your online presence and reach more customers",
    services: [
      { id: "logo-design", name: "Logo Design", price: "₹3,000", duration: "5-7 days" },
      { id: "social-media-design", name: "Social Media Poster Design", price: "₹500", duration: "2-3 days" },
      { id: "instagram-setup", name: "Instagram/Facebook Setup", price: "₹2,000", duration: "3-5 days" },
      { id: "google-business", name: "Google Business Profile", price: "₹1,500", duration: "2-3 days" },
      { id: "whatsapp-business", name: "WhatsApp Business Setup", price: "₹1,000", duration: "1-2 days" },
      { id: "website-creation", name: "Website/Landing Page", price: "₹8,000", duration: "10-15 days" },
      { id: "seo-service", name: "SEO Service", price: "₹5,000/month", duration: "Monthly" },
      { id: "paid-ads", name: "Paid Ads Support", price: "₹3,000", duration: "5-7 days" },
      { id: "product-photography", name: "Product Photography", price: "₹2,500", duration: "3-5 days" }
    ]
  }
];

const BUSINESS_STARTER_PACKAGE = {
  name: "Start Your Business in 7 Days",
  price: "₹15,000",
  originalPrice: "₹25,000",
  discount: "40% OFF",
  services: [
    "GST Registration",
    "MSME/Udyam Registration",
    "Trade License",
    "Professional Logo Design",
    "Google Business Profile Setup",
    "Basic Website Creation",
    "Social Media Setup",
    "Business Consultation"
  ],
  features: [
    "Complete documentation support",
    "Expert guidance throughout",
    "Priority processing",
    "Post-registration support",
    "Digital presence setup"
  ]
};

const ORDER_STATUSES = [
  { id: "submitted", label: "Submitted", color: "#f59e0b", icon: "📝" },
  { id: "under-review", label: "Under Review", color: "#3b82f6", icon: "🔍" },
  { id: "processing", label: "Processing", color: "#8b5cf6", icon: "⚙️" },
  { id: "completed", label: "Completed", color: "#10b981", icon: "✅" }
];

const BusinessServices = () => {
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    businessType: "",
    documents: [],
    requirements: "",
    preferredDate: "",
    budget: ""
  });

  const navigationSections = [
    { id: "overview", label: "Overview", icon: "🏠" },
    { id: "services", label: "All Services", icon: "📋" },
    { id: "business-starter", label: "Business Starter", icon: "🚀" },
    { id: "orders", label: "My Orders", icon: "📦" },
    { id: "consultation", label: "Consultation", icon: "💬" }
  ];

  const handleServiceSelect = (category, service) => {
    setSelectedCategory(category);
    setSelectedService(service);
    setShowOrderForm(true);
  };

  const handleOrderSubmit = () => {
    const newOrder = {
      id: Date.now().toString(),
      service: selectedService,
      category: selectedCategory,
      status: "submitted",
      orderDate: new Date().toISOString(),
      formData: orderForm,
      estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    setServiceOrders(prev => [...prev, newOrder]);
    setCurrentOrder(newOrder);
    setShowOrderForm(false);
    setOrderForm({
      name: "",
      email: "",
      phone: "",
      businessName: "",
      businessType: "",
      documents: [],
      requirements: "",
      preferredDate: "",
      budget: ""
    });
  };

  const handleFileUpload = (files) => {
    const fileList = Array.from(files).map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file)
    }));
    setOrderForm(prev => ({ ...prev, documents: [...prev.documents, ...fileList] }));
  };

  const handleBusinessStarterOrder = () => {
    const starterOrder = {
      id: Date.now().toString(),
      service: BUSINESS_STARTER_PACKAGE,
      category: { id: "business-starter", name: "Business Starter Package" },
      status: "submitted",
      orderDate: new Date().toISOString(),
      formData: orderForm,
      estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isStarterPackage: true
    };

    setServiceOrders(prev => [...prev, starterOrder]);
    setCurrentOrder(starterOrder);
  };

  const getStatusColor = (status) => {
    const statusObj = ORDER_STATUSES.find(s => s.id === status);
    return statusObj ? statusObj.color : "#6b7280";
  };

  const getStatusIcon = (status) => {
    const statusObj = ORDER_STATUSES.find(s => s.id === status);
    return statusObj ? statusObj.icon : "❓";
  };

  return (
    <div className="business-services-shell">
      <div className="business-services-hero">
        <div className="business-services-hero-copy">
          <h1>Business Services Hub</h1>
          <p>Complete business solutions from registration to marketing. Start, manage, and grow your business with expert support.</p>
          <div className="business-services-hero-tags">
            <span>🏢 Business Registration</span>
            <span>📊 GST & Tax Services</span>
            <span>⚖️ Legal Consultation</span>
            <span>📱 Digital Marketing</span>
          </div>
        </div>
        <div className="business-services-hero-stats">
          <div className="stat-card">
            <span className="stat-number">500+</span>
            <span className="stat-label">Businesses Served</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">98%</span>
            <span className="stat-label">Success Rate</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">24/7</span>
            <span className="stat-label">Support</span>
          </div>
        </div>
      </div>

      <div className="business-services-nav">
        {navigationSections.map(section => (
          <button
            key={section.id}
            className={`business-services-nav-item ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      <div className="business-services-content">
        {activeSection === "overview" && (
          <div className="business-services-section">
            <div className="overview-grid">
              <div className="overview-card business-starter-highlight">
                <div className="card-header">
                  <h3>🚀 Start Your Business in 7 Days</h3>
                  <div className="pricing">
                    <span className="current-price">₹15,000</span>
                    <span className="original-price">₹25,000</span>
                    <span className="discount-badge">40% OFF</span>
                  </div>
                </div>
                <p>Get everything you need to start your business: GST, Udyam, Trade License, Logo, Website, and Digital Presence.</p>
                <div className="package-services">
                  {BUSINESS_STARTER_PACKAGE.services.map((service, i) => (
                    <span key={i} className="service-item">✓ {service}</span>
                  ))}
                </div>
                <button className="primary-button" onClick={handleBusinessStarterOrder}>
                  Get Started Now
                </button>
              </div>

              <div className="overview-card">
                <h3>📊 GST & Tax Services</h3>
                <p>Complete compliance solutions for GST filing, tax returns, and business accounting.</p>
                <div className="service-highlights">
                  <span>GST Registration</span>
                  <span>Monthly Filing</span>
                  <span>Tax Consultation</span>
                </div>
                <button className="secondary-button" onClick={() => setActiveSection("services")}>
                  View All Services
                </button>
              </div>

              <div className="overview-card">
                <h3>🏢 Company Registration</h3>
                <p>Register your business as proprietorship, partnership, LLP, or private limited company.</p>
                <div className="service-highlights">
                  <span>Proprietorship</span>
                  <span>LLP Registration</span>
                  <span>MSME Registration</span>
                </div>
                <button className="secondary-button" onClick={() => setActiveSection("services")}>
                  View All Services
                </button>
              </div>

              <div className="overview-card">
                <h3>⚖️ Legal Consultation</h3>
                <p>Expert legal advice, agreement drafting, and business law consultation.</p>
                <div className="service-highlights">
                  <span>Agreement Drafting</span>
                  <span>Legal Notice</span>
                  <span>Trademark</span>
                </div>
                <button className="secondary-button" onClick={() => setActiveSection("services")}>
                  View All Services
                </button>
              </div>

              <div className="overview-card">
                <h3>📱 Digital Marketing</h3>
                <p>Build your online presence with logo design, website creation, and social media marketing.</p>
                <div className="service-highlights">
                  <span>Logo Design</span>
                  <span>Website Creation</span>
                  <span>Social Media Setup</span>
                </div>
                <button className="secondary-button" onClick={() => setActiveSection("services")}>
                  View All Services
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === "services" && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>📋 All Business Services</h2>
              <p>Choose from our comprehensive range of business services</p>
            </div>

            <div className="services-categories">
              {SERVICE_CATEGORIES.map(category => (
                <div key={category.id} className="category-card">
                  <div className="category-header">
                    <span className="category-icon">{category.icon}</span>
                    <h3>{category.name}</h3>
                  </div>
                  <p>{category.description}</p>

                  <div className="category-services">
                    {category.services.slice(0, 4).map(service => (
                      <div key={service.id} className="service-item">
                        <div className="service-info">
                          <h4>{service.name}</h4>
                          <div className="service-meta">
                            <span className="price">{service.price}</span>
                            <span className="duration">{service.duration}</span>
                          </div>
                        </div>
                        <button
                          className="select-service-btn"
                          onClick={() => handleServiceSelect(category, service)}
                        >
                          Select
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    className="view-all-btn"
                    onClick={() => {
                      setSelectedCategory(category);
                      setActiveSection("category-detail");
                    }}
                  >
                    View All Services ({category.services.length})
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === "business-starter" && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>🚀 Start Your Business in 7 Days</h2>
              <p>Complete business setup package with everything you need to start your business</p>
            </div>

            <div className="business-starter-detail">
              <div className="package-overview">
                <div className="package-header">
                  <h3>{BUSINESS_STARTER_PACKAGE.name}</h3>
                  <div className="package-pricing">
                    <span className="current-price">{BUSINESS_STARTER_PACKAGE.price}</span>
                    <span className="original-price">{BUSINESS_STARTER_PACKAGE.originalPrice}</span>
                    <span className="discount">{BUSINESS_STARTER_PACKAGE.discount}</span>
                  </div>
                </div>

                <div className="package-services-grid">
                  <div className="services-included">
                    <h4>Services Included:</h4>
                    <ul>
                      {BUSINESS_STARTER_PACKAGE.services.map((service, i) => (
                        <li key={i}>{service}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="package-features">
                    <h4>Additional Benefits:</h4>
                    <ul>
                      {BUSINESS_STARTER_PACKAGE.features.map((feature, i) => (
                        <li key={i}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="package-actions">
                  <button className="primary-button" onClick={handleBusinessStarterOrder}>
                    Order Business Starter Package
                  </button>
                  <div className="package-meta">
                    <span>⚡ Processing in 7 days</span>
                    <span>🎯 Priority support</span>
                    <span>📞 Dedicated consultant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "orders" && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>📦 My Service Orders</h2>
              <p>Track your service requests and download completed documents</p>
            </div>

            {serviceOrders.length === 0 ? (
              <div className="empty-orders">
                <span className="empty-icon">📋</span>
                <h3>No orders yet</h3>
                <p>Start your business journey by ordering a service</p>
                <button className="primary-button" onClick={() => setActiveSection("services")}>
                  Browse Services
                </button>
              </div>
            ) : (
              <div className="orders-list">
                {serviceOrders.map(order => (
                  <div key={order.id} className="order-card">
                    <div className="order-header">
                      <div className="order-info">
                        <h4>{order.isStarterPackage ? order.service.name : order.service.name}</h4>
                        <p>Order #{order.id.slice(-6)}</p>
                        <p>Ordered on {new Date(order.orderDate).toLocaleDateString()}</p>
                      </div>
                      <div className="order-status">
                        <span
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(order.status) }}
                        >
                          {getStatusIcon(order.status)} {ORDER_STATUSES.find(s => s.id === order.status)?.label}
                        </span>
                      </div>
                    </div>

                    <div className="order-details">
                      <div className="order-meta">
                        <span>Estimated: {new Date(order.estimatedCompletion).toLocaleDateString()}</span>
                        <span>Price: {order.isStarterPackage ? order.service.price : order.service.price}</span>
                      </div>

                      {order.status === "completed" && (
                        <div className="order-actions">
                          <button className="download-btn">📄 Download Documents</button>
                          <button className="download-btn">🧾 Download Invoice</button>
                        </div>
                      )}

                      {order.status !== "completed" && (
                        <div className="order-actions">
                          <button className="chat-btn">💬 Chat with Consultant</button>
                          <button className="call-btn">📞 Request Call</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === "consultation" && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>💬 Business Consultation</h2>
              <p>Get expert advice for your business needs</p>
            </div>

            <div className="consultation-options">
              <div className="consultation-card">
                <h3>📞 Quick Consultation</h3>
                <p>15-minute phone consultation for immediate guidance</p>
                <div className="consultation-price">₹500</div>
                <button className="primary-button">Book Now</button>
              </div>

              <div className="consultation-card">
                <h3>💼 Business Planning</h3>
                <p>Comprehensive business plan and strategy consultation</p>
                <div className="consultation-price">₹2,500</div>
                <button className="primary-button">Book Now</button>
              </div>

              <div className="consultation-card">
                <h3>📊 Financial Consultation</h3>
                <p>GST, tax, and financial planning advice</p>
                <div className="consultation-price">₹1,500</div>
                <button className="primary-button">Book Now</button>
              </div>

              <div className="consultation-card">
                <h3>⚖️ Legal Consultation</h3>
                <p>Legal advice and documentation review</p>
                <div className="consultation-price">₹2,000</div>
                <button className="primary-button">Book Now</button>
              </div>
            </div>
          </div>
        )}

        {activeSection === "category-detail" && selectedCategory && (
          <div className="business-services-section">
            <div className="section-header">
              <h2>{selectedCategory.icon} {selectedCategory.name}</h2>
              <p>{selectedCategory.description}</p>
              <button className="back-btn" onClick={() => setActiveSection("services")}>
                ← Back to All Services
              </button>
            </div>

            <div className="services-grid">
              {selectedCategory.services.map(service => (
                <div key={service.id} className="service-detail-card">
                  <div className="service-header">
                    <h4>{service.name}</h4>
                    <div className="service-pricing">
                      <span className="price">{service.price}</span>
                      <span className="duration">{service.duration}</span>
                    </div>
                  </div>
                  <button
                    className="primary-button"
                    onClick={() => handleServiceSelect(selectedCategory, service)}
                  >
                    Order This Service
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showOrderForm && selectedService && (
        <div className="order-form-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Order {selectedService.name}</h3>
              <button className="close-btn" onClick={() => setShowOrderForm(false)}>×</button>
            </div>

            <div className="order-form">
              <div className="form-section">
                <h4>Personal Information</h4>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={orderForm.name}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, name: e.target.value }))}
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={orderForm.email}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, email: e.target.value }))}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={orderForm.phone}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="form-section">
                <h4>Business Information</h4>
                <input
                  type="text"
                  placeholder="Business Name"
                  value={orderForm.businessName}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, businessName: e.target.value }))}
                />
                <select
                  value={orderForm.businessType}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, businessType: e.target.value }))}
                >
                  <option value="">Select Business Type</option>
                  <option value="proprietorship">Proprietorship</option>
                  <option value="partnership">Partnership</option>
                  <option value="llp">LLP</option>
                  <option value="private-limited">Private Limited</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-section">
                <h4>Documents Upload</h4>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                {orderForm.documents.length > 0 && (
                  <div className="uploaded-files">
                    {orderForm.documents.map((file, i) => (
                      <div key={i} className="file-item">
                        <span>{file.name}</span>
                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-section">
                <h4>Additional Requirements</h4>
                <textarea
                  placeholder="Describe your specific requirements..."
                  value={orderForm.requirements}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, requirements: e.target.value }))}
                  rows={4}
                />
                <input
                  type="date"
                  placeholder="Preferred Completion Date"
                  value={orderForm.preferredDate}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, preferredDate: e.target.value }))}
                />
              </div>

              <div className="order-summary">
                <h4>Order Summary</h4>
                <div className="summary-item">
                  <span>Service:</span>
                  <span>{selectedService.name}</span>
                </div>
                <div className="summary-item">
                  <span>Price:</span>
                  <span>{selectedService.price}</span>
                </div>
                <div className="summary-item">
                  <span>Duration:</span>
                  <span>{selectedService.duration}</span>
                </div>
              </div>

              <div className="form-actions">
                <button className="secondary-button" onClick={() => setShowOrderForm(false)}>
                  Cancel
                </button>
                <button className="primary-button" onClick={handleOrderSubmit}>
                  Place Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentOrder && (
        <div className="order-confirmation-modal">
          <div className="modal-content">
            <div className="confirmation-header">
              <span className="success-icon">✅</span>
              <h3>Order Placed Successfully!</h3>
            </div>

            <div className="order-details">
              <p><strong>Order ID:</strong> #{currentOrder.id.slice(-6)}</p>
              <p><strong>Service:</strong> {currentOrder.isStarterPackage ? currentOrder.service.name : currentOrder.service.name}</p>
              <p><strong>Status:</strong> Submitted</p>
              <p><strong>Estimated Completion:</strong> {new Date(currentOrder.estimatedCompletion).toLocaleDateString()}</p>
            </div>

            <div className="confirmation-actions">
              <button className="primary-button" onClick={() => setCurrentOrder(null)}>
                Track Order
              </button>
              <button className="secondary-button" onClick={() => setCurrentOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessServices;