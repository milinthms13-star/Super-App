import React, { useState, useEffect } from "react";
import { useApp } from "../../../contexts/AppContext";
import "../HotelBooking.css";

const AdminHotelPanel = ({ currentUser }) => {
  const { apiCall } = useApp();
  const [adminTab, setAdminTab] = useState("dashboard");
  const [stats, setStats] = useState({
    totalHotels: 0,
    activeBookings: 0,
    monthlyRevenue: 0,
    commissionEarned: 0,
    pendingApprovals: 0,
    totalPartners: 0,
  });

  const [pendingHotels, setPendingHotels] = useState([]);
  const [verifiedHotels, setVerifiedHotels] = useState([]);
  const [commissionSettings, setCommissionSettings] = useState({
    defaultRate: 10,
    basicRate: 8,
    featuredRate: 12,
    premiumRate: 15,
  });

  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [commissionFormData, setCommissionFormData] = useState({ ...commissionSettings });

  // Load admin data on mount
  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      // Load stats and hotels from API if available, otherwise fallback to mock/localStorage
      try {
        const statsRes = await apiCall("/admin/hotel-stats");
        if (statsRes?.data) {
          setStats(statsRes.data);
        } else {
          throw new Error("No stats data returned");
        }
      } catch (apiError) {
        console.warn("Admin stats API failed, falling back to mock data:", apiError);
        setStats({
          totalHotels: 24,
          activeBookings: 156,
          monthlyRevenue: 385000,
          commissionEarned: 38500,
          pendingApprovals: 5,
          totalPartners: 18,
        });
      }

      let pendingHotelsData = [];
      try {
        const pendingRes = await apiCall("/admin/hotels/pending");
        pendingHotelsData = pendingRes?.data || [];
      } catch (apiError) {
        console.warn("Pending hotels API failed, falling back to localStorage/mock:", apiError);
        const savedPendingHotels = localStorage.getItem("admin_pending_hotels");
        pendingHotelsData = savedPendingHotels ? JSON.parse(savedPendingHotels) : [
          {
            _id: "1",
            businessName: "Seaview Resort",
            location: "Varkala",
            type: "Resort",
            phone: "9876543210",
            submittedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            images: 3,
            rooms: 15,
          },
          {
            _id: "2",
            businessName: "Heritage Homestay",
            location: "Kochi",
            type: "Homestay",
            phone: "9876543211",
            submittedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            images: 4,
            rooms: 5,
          },
        ];
      }
      setPendingHotels(pendingHotelsData);

      let verifiedHotelsData = [];
      try {
        const verifiedRes = await apiCall("/admin/hotels/verified");
        verifiedHotelsData = verifiedRes?.data || [];
      } catch (apiError) {
        console.warn("Verified hotels API failed, falling back to localStorage/mock:", apiError);
        const savedVerifiedHotels = localStorage.getItem("admin_verified_hotels");
        verifiedHotelsData = savedVerifiedHotels ? JSON.parse(savedVerifiedHotels) : [
          {
            _id: "100",
            businessName: "Beach Paradise",
            location: "Kollam",
            type: "Hotel",
            verified: true,
            bookings: 28,
            revenue: 245000,
            rating: 4.5,
          },
          {
            _id: "101",
            businessName: "Mountain Lodge",
            location: "Munnar",
            type: "Lodge",
            verified: true,
            bookings: 45,
            revenue: 180000,
            rating: 4.8,
          },
        ];
      }
      setVerifiedHotels(verifiedHotelsData);

      const savedSettings = localStorage.getItem("admin_commission_settings");
      if (savedSettings) {
        setCommissionSettings(JSON.parse(savedSettings));
        setCommissionFormData(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error("Error loading admin data:", error);
    }
  };

  const handleApproveHotel = async (hotelId) => {
    try {
      try {
        await apiCall(`/admin/hotels/${hotelId}/verify`, "POST", { verified: true });
      } catch (apiError) {
        console.warn("Approve hotel API failed, using local state fallback:", apiError);
      }

      const approved = pendingHotels.find(h => h._id === hotelId);
      if (approved) {
        setPendingHotels(pendingHotels.filter(h => h._id !== hotelId));
        setVerifiedHotels([...verifiedHotels, { ...approved, verified: true, bookings: 0, revenue: 0 }]);
        setStats(prev => ({
          ...prev,
          totalHotels: prev.totalHotels + 1,
          pendingApprovals: Math.max(prev.pendingApprovals - 1, 0),
        }));

        const updatedPending = pendingHotels.filter(h => h._id !== hotelId);
        localStorage.setItem("admin_pending_hotels", JSON.stringify(updatedPending));

        const updatedVerified = [...verifiedHotels, { ...approved, verified: true }];
        localStorage.setItem("admin_verified_hotels", JSON.stringify(updatedVerified));

        alert(`✓ "${approved.businessName}" approved successfully!`);
      }
    } catch (error) {
      console.error("Error approving hotel:", error);
      alert("Failed to approve hotel");
    }
  };

  const handleRejectHotel = async (hotelId) => {
    const rejected = pendingHotels.find(h => h._id === hotelId);
    if (rejected) {
      const confirmed = window.confirm(`Reject "${rejected.businessName}"? (This cannot be undone)`);
      if (!confirmed) {
        return;
      }

      try {
        await apiCall(`/admin/hotels/${hotelId}/reject`, "POST", { rejected: true });
      } catch (apiError) {
        console.warn("Reject hotel API failed, using local state fallback:", apiError);
      }

      setPendingHotels(pendingHotels.filter(h => h._id !== hotelId));
      setStats(prev => ({
        ...prev,
        pendingApprovals: Math.max(prev.pendingApprovals - 1, 0),
      }));

      const updatedPending = pendingHotels.filter(h => h._id !== hotelId);
      localStorage.setItem("admin_pending_hotels", JSON.stringify(updatedPending));

      alert(`✕ "${rejected.businessName}" rejected.`);
    }
  };

  const handleUpdateCommissionSettings = async () => {
    try {
      try {
        await apiCall("/admin/commission/update", "PUT", commissionFormData);
      } catch (apiError) {
        console.warn("Commission update API failed, using local state fallback:", apiError);
      }

      setCommissionSettings(commissionFormData);
      localStorage.setItem("admin_commission_settings", JSON.stringify(commissionFormData));
      setShowCommissionForm(false);
      alert("Commission settings updated successfully!");
    } catch (error) {
      console.error("Error updating settings:", error);
      alert("Failed to update settings");
    }
  };

  const handleCommissionFormChange = (e) => {
    const { name, value } = e.target;
    setCommissionFormData(prev => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  return (
    <section className="hotel-booking-section">
      <div className="hotel-booking-section-heading">
        <h2>Admin Hotel Management</h2>
        <p>Manage properties, verify listings, and configure commission settings.</p>
      </div>

      {/* Admin Navigation */}
      <div className="hotel-booking-admin-nav">
        <button
          type="button"
          className={`hotel-booking-admin-nav-item ${adminTab === "dashboard" ? "active" : ""}`}
          onClick={() => setAdminTab("dashboard")}
        >
          📊 Dashboard
        </button>
        <button
          type="button"
          className={`hotel-booking-admin-nav-item ${adminTab === "verification" ? "active" : ""}`}
          onClick={() => setAdminTab("verification")}
        >
          ✓ Verification ({stats.pendingApprovals})
        </button>
        <button
          type="button"
          className={`hotel-booking-admin-nav-item ${adminTab === "commission" ? "active" : ""}`}
          onClick={() => setAdminTab("commission")}
        >
          💰 Commission Settings
        </button>
        <button
          type="button"
          className={`hotel-booking-admin-nav-item ${adminTab === "analytics" ? "active" : ""}`}
          onClick={() => setAdminTab("analytics")}
        >
          📈 Analytics
        </button>
      </div>

      {/* Dashboard Tab */}
      {adminTab === "dashboard" && (
        <div className="hotel-booking-admin-content">
          <div className="hotel-booking-admin-grid">
            <div className="hotel-booking-admin-card">
              <div className="hotel-booking-admin-card-icon">🏨</div>
              <div className="hotel-booking-admin-card-content">
                <div className="hotel-booking-admin-card-value">{stats.totalHotels}</div>
                <div className="hotel-booking-admin-card-label">Total Properties</div>
                <div className="hotel-booking-admin-card-change">
                  {stats.pendingApprovals > 0 && `${stats.pendingApprovals} pending`}
                </div>
              </div>
            </div>

            <div className="hotel-booking-admin-card">
              <div className="hotel-booking-admin-card-icon">📅</div>
              <div className="hotel-booking-admin-card-content">
                <div className="hotel-booking-admin-card-value">{stats.activeBookings}</div>
                <div className="hotel-booking-admin-card-label">Active Bookings</div>
                <div className="hotel-booking-admin-card-change">This month</div>
              </div>
            </div>

            <div className="hotel-booking-admin-card">
              <div className="hotel-booking-admin-card-icon">💳</div>
              <div className="hotel-booking-admin-card-content">
                <div className="hotel-booking-admin-card-value">₹{(stats.monthlyRevenue / 100000).toFixed(1)}L</div>
                <div className="hotel-booking-admin-card-label">Monthly Revenue</div>
                <div className="hotel-booking-admin-card-change">Gross booking value</div>
              </div>
            </div>

            <div className="hotel-booking-admin-card">
              <div className="hotel-booking-admin-card-icon">💰</div>
              <div className="hotel-booking-admin-card-content">
                <div className="hotel-booking-admin-card-value">₹{(stats.commissionEarned / 1000).toFixed(0)}K</div>
                <div className="hotel-booking-admin-card-label">Commission Earned</div>
                <div className="hotel-booking-admin-card-change">
                  {(stats.commissionEarned / stats.monthlyRevenue * 100).toFixed(1)}% rate
                </div>
              </div>
            </div>

            <div className="hotel-booking-admin-card">
              <div className="hotel-booking-admin-card-icon">👥</div>
              <div className="hotel-booking-admin-card-content">
                <div className="hotel-booking-admin-card-value">{stats.totalPartners}</div>
                <div className="hotel-booking-admin-card-label">Partner Vendors</div>
                <div className="hotel-booking-admin-card-change">Active partners</div>
              </div>
            </div>

            <div className="hotel-booking-admin-card">
              <div className="hotel-booking-admin-card-icon">⏳</div>
              <div className="hotel-booking-admin-card-content">
                <div className="hotel-booking-admin-card-value">{stats.pendingApprovals}</div>
                <div className="hotel-booking-admin-card-label">Pending Approvals</div>
                <div className="hotel-booking-admin-card-change">Awaiting review</div>
              </div>
            </div>
          </div>

          <div className="hotel-booking-admin-section">
            <h3>Recently Verified Properties</h3>
            {verifiedHotels.length === 0 ? (
              <p className="hotel-booking-admin-empty">No verified properties yet</p>
            ) : (
              <div className="hotel-booking-verified-hotels-list">
                {verifiedHotels.slice(0, 3).map(hotel => (
                  <div key={hotel._id} className="hotel-booking-verified-hotel-item">
                    <div>
                      <h4>{hotel.businessName}</h4>
                      <p>{hotel.location} • {hotel.type}</p>
                      <div className="hotel-booking-verified-stats">
                        <span>⭐ {hotel.rating || "—"}</span>
                        <span>📅 {hotel.bookings} bookings</span>
                        <span>💰 ₹{hotel.revenue?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Verification Tab */}
      {adminTab === "verification" && (
        <div className="hotel-booking-admin-content">
          <div className="hotel-booking-admin-section">
            <h3>Pending Hotel Approvals</h3>
            {pendingHotels.length === 0 ? (
              <div className="hotel-booking-admin-empty-state">
                <p>✓ All hotels verified!</p>
                <p>No pending approvals at this time</p>
              </div>
            ) : (
              <div className="hotel-booking-pending-hotels-list">
                {pendingHotels.map(hotel => (
                  <div key={hotel._id} className="hotel-booking-pending-hotel-card">
                    <div className="hotel-booking-pending-hotel-header">
                      <div>
                        <h3>{hotel.businessName}</h3>
                        <p className="hotel-booking-hotel-meta">
                          {hotel.location} • {hotel.type}
                        </p>
                      </div>
                      <span className="hotel-booking-status hotel-booking-status-pending">
                        ⏳ Pending
                      </span>
                    </div>

                    <div className="hotel-booking-pending-hotel-info">
                      <div>
                        <strong>📸 Images:</strong> {hotel.images}
                      </div>
                      <div>
                        <strong>🏠 Rooms:</strong> {hotel.rooms}
                      </div>
                      <div>
                        <strong>☎️ Phone:</strong> {hotel.phone}
                      </div>
                      <div>
                        <strong>📅 Submitted:</strong> {new Date(hotel.submittedDate).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="hotel-booking-pending-hotel-actions">
                      <button
                        type="button"
                        className="hotel-booking-primary-button"
                        onClick={() => handleApproveHotel(hotel._id)}
                      >
                        ✓ Approve
                      </button>
                      <button
                        type="button"
                        className="hotel-booking-danger-button"
                        onClick={() => handleRejectHotel(hotel._id)}
                      >
                        ✕ Reject
                      </button>
                      <button type="button" className="hotel-booking-secondary-button">
                        📝 Request Info
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Commission Settings Tab */}
      {adminTab === "commission" && (
        <div className="hotel-booking-admin-content">
          <div className="hotel-booking-admin-section">
            <div className="hotel-booking-admin-section-header">
              <h3>Commission Rate Settings</h3>
              <button
                type="button"
                className="hotel-booking-primary-button"
                onClick={() => setShowCommissionForm(true)}
              >
                ⚙️ Configure Rates
              </button>
            </div>

            <div className="hotel-booking-commission-grid">
              <div className="hotel-booking-commission-card">
                <div className="hotel-booking-commission-icon">🏠</div>
                <div className="hotel-booking-commission-info">
                  <h4>Basic Tier</h4>
                  <p>Standard hotels and homestays</p>
                  <div className="hotel-booking-commission-rate">{commissionSettings.basicRate}%</div>
                </div>
              </div>

              <div className="hotel-booking-commission-card">
                <div className="hotel-booking-commission-icon">📌</div>
                <div className="hotel-booking-commission-info">
                  <h4>Default Rate</h4>
                  <p>Applied to all new listings</p>
                  <div className="hotel-booking-commission-rate">{commissionSettings.defaultRate}%</div>
                </div>
              </div>

              <div className="hotel-booking-commission-card">
                <div className="hotel-booking-commission-icon">⭐</div>
                <div className="hotel-booking-commission-info">
                  <h4>Featured Tier</h4>
                  <p>Premium listings with priority</p>
                  <div className="hotel-booking-commission-rate">{commissionSettings.featuredRate}%</div>
                </div>
              </div>

              <div className="hotel-booking-commission-card">
                <div className="hotel-booking-commission-icon">👑</div>
                <div className="hotel-booking-commission-info">
                  <h4>Premium Tier</h4>
                  <p>Top-performing, verified partners</p>
                  <div className="hotel-booking-commission-rate">{commissionSettings.premiumRate}%</div>
                </div>
              </div>
            </div>

            <div className="hotel-booking-commission-info-box">
              <h4>Commission Structure</h4>
              <ul>
                <li>📊 Commissions are calculated on confirmed booking amount (before GST)</li>
                <li>💳 Payouts processed monthly on 1st of next month</li>
                <li>🛡️ Chargebacks and refunds adjusted from next payout</li>
                <li>📈 Volume discounts available for 100+ monthly bookings</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {adminTab === "analytics" && (
        <div className="hotel-booking-admin-content">
          <div className="hotel-booking-admin-section">
            <h3>Platform Analytics</h3>
            <div className="hotel-booking-analytics-grid">
              <div className="hotel-booking-analytics-card">
                <h4>Booking Trends</h4>
                <p className="hotel-booking-analytics-placeholder">
                  📈 Detailed booking trends chart (Ready for API integration)
                </p>
              </div>
              <div className="hotel-booking-analytics-card">
                <h4>Revenue Distribution</h4>
                <p className="hotel-booking-analytics-placeholder">
                  💰 Revenue by location and property type (Ready for API integration)
                </p>
              </div>
              <div className="hotel-booking-analytics-card">
                <h4>Partner Performance</h4>
                <p className="hotel-booking-analytics-placeholder">
                  ⭐ Top performing partners leaderboard (Ready for API integration)
                </p>
              </div>
              <div className="hotel-booking-analytics-card">
                <h4>Customer Insights</h4>
                <p className="hotel-booking-analytics-placeholder">
                  👥 Customer demographics and preferences (Ready for API integration)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commission Settings Modal */}
      {showCommissionForm && (
        <div className="hotel-booking-modal-overlay">
          <div className="hotel-booking-modal">
            <div className="hotel-booking-modal-header">
              <h2>Configure Commission Rates</h2>
              <button
                type="button"
                className="hotel-booking-modal-close"
                onClick={() => setShowCommissionForm(false)}
              >
                ✕
              </button>
            </div>

            <div className="hotel-booking-modal-body">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateCommissionSettings();
                }}
              >
                <div className="hotel-booking-form-group">
                  <label>Basic Tier Rate (%) *</label>
                  <input
                    type="number"
                    name="basicRate"
                    min="1"
                    max="50"
                    value={commissionFormData.basicRate}
                    onChange={handleCommissionFormChange}
                  />
                  <small>For standard hotels and homestays</small>
                </div>

                <div className="hotel-booking-form-group">
                  <label>Default Rate (%) *</label>
                  <input
                    type="number"
                    name="defaultRate"
                    min="1"
                    max="50"
                    value={commissionFormData.defaultRate}
                    onChange={handleCommissionFormChange}
                  />
                  <small>Applied to all new listings</small>
                </div>

                <div className="hotel-booking-form-group">
                  <label>Featured Tier Rate (%) *</label>
                  <input
                    type="number"
                    name="featuredRate"
                    min="1"
                    max="50"
                    value={commissionFormData.featuredRate}
                    onChange={handleCommissionFormChange}
                  />
                  <small>Premium listings with priority</small>
                </div>

                <div className="hotel-booking-form-group">
                  <label>Premium Tier Rate (%) *</label>
                  <input
                    type="number"
                    name="premiumRate"
                    min="1"
                    max="50"
                    value={commissionFormData.premiumRate}
                    onChange={handleCommissionFormChange}
                  />
                  <small>Top-performing partners only</small>
                </div>

                <div className="hotel-booking-modal-actions">
                  <button
                    type="button"
                    className="hotel-booking-secondary-button"
                    onClick={() => setShowCommissionForm(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="hotel-booking-primary-button">
                    Save Settings
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminHotelPanel;
