import React, { useState } from "react";
import { useApp } from "../contexts/AppContext";
import useI18n from "../hooks/useI18n";
import { getStoredAuthToken } from "../utils/auth";
import "../styles/Navigation.css";

const Navigation = ({ onModuleChange, onLogout, loggedInUser }) => {
  const { currentUser, cart } = useApp();
  const { t } = useI18n();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);

  const displayUser = loggedInUser || currentUser;
  const isAdmin = displayUser?.role === "admin" || displayUser?.registrationType === "admin";
  const isSeller =
    displayUser?.registrationType === "entrepreneur" || displayUser?.role === "business";
  const subscribedCategoryIds = (displayUser?.selectedBusinessCategories || [])
    .map((category) => category?.id)
    .filter(Boolean);
  const cartItemCount = cart.reduce((total, item) => total + Number(item.quantity || 1), 0);

  const allBusinessModules = [
    { id: "dashboard", label: isSeller ? "Seller Dashboard" : t("modules.dashboard", "Dashboard") },
    { id: "ecommerce", label: t("modules.ecommerce", "GlobeMart") },
    { id: "messaging", label: t("modules.messaging", "LinkUp") },
    { id: "classifieds", label: t("modules.classifieds", "TradePost") },
    { id: "realestate", label: t("modules.realestate", "HomeSphere") },
    { id: "fooddelivery", label: t("modules.fooddelivery", "Feastly") },
    { id: "ridesharing", label: t("modules.ridesharing", "SwiftRide") },
    { id: "matrimonial", label: t("modules.matrimonial", "SoulMatch") },
    { id: "socialmedia", label: t("modules.socialmedia", "VibeHub") },
    { id: "diary", label: t("modules.diary", "My Diary") },
    { id: "reminderalert", label: t("modules.reminderalert", "ReminderAlert - Todo List") },
    { id: "sosalert", label: t("modules.sosalert", "SOS Safety Center") },
  ];

  const modules = isAdmin
    ? [{ id: "admin-dashboard", label: t("modules.admin", "Admin Dashboard") }]
    : allBusinessModules.filter(
        (module) =>
          !isSeller ||
          module.id === "dashboard" ||
          module.sellerVisible === true ||
          subscribedCategoryIds.includes(module.id)
      );

  const handleModuleClick = (moduleId) => {
    onModuleChange(moduleId);
    setIsSidebarOpen(false);
  };

  const handleSendSOSAlert = async () => {
    setSosLoading(true);
    try {
      const userId = displayUser?.id || displayUser?._id;
      const userName = displayUser?.name || displayUser?.email;
      const userPhone = displayUser?.phone || "Not provided";

      // Send SOS alert to backend
      const response = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000/api"}/sos/send-alert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getStoredAuthToken() ? { Authorization: `Bearer ${getStoredAuthToken()}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          userId,
          userName,
          userPhone,
          timestamp: new Date().toISOString(),
          location: "Current Location",
        }),
      });

      if (response.ok) {
        alert("🆘 SOS Alert Sent Successfully!\n\nEmergency contacts have been notified of your location and status.");
        setShowSOSModal(false);
      } else {
        alert("Failed to send SOS alert. Please try again.");
      }
    } catch (error) {
      console.error("Error sending SOS alert:", error);
      alert("Error sending SOS alert: " + error.message);
    } finally {
      setSosLoading(false);
    }
  };

  const handleSOSButtonClick = () => {
    setShowSOSModal(true);
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-top-row">
            <div
              className="nav-logo"
              onClick={() => handleModuleClick(isAdmin ? "admin-dashboard" : "dashboard")}
            >
              <img src="/logo.png" alt="MalabarBazaar Logo" className="logo-image" />
              <span>MalabarBazaar</span>
            </div>

            <div className="nav-right">
              {!isAdmin && !isSeller && (
                <button
                  type="button"
                  className="cart-icon cart-button"
                  onClick={() => handleModuleClick("cart")}
                >
                  {t("navigation.cart", "Cart")} {cartItemCount}
                </button>
              )}
              <button
                type="button"
                className="sos-alert-button"
                onClick={handleSOSButtonClick}
                title="Send SOS Alert - Emergency Help"
                disabled={sosLoading}
              >
                🆘 SOS
              </button>
              <div className="user-profile" onClick={() => setShowUserMenu(!showUserMenu)}>
                <span className="user-avatar">{displayUser.avatar}</span>
                <span className="user-name">{displayUser.name || displayUser.email}</span>
                <span className="dropdown-icon">v</span>

                {showUserMenu && (
                  <div className="user-menu">
                    <div className="user-menu-item">
                      <strong>{displayUser.email}</strong>
                    </div>
                    <div className="user-menu-item">
                      <span>
                        {isAdmin
                          ? t("navigation.adminAccess", "Admin access")
                          : isSeller
                            ? "Seller access"
                            : t("navigation.businessAccess", "Business access")}
                      </span>
                    </div>
                    <button className="logout-btn" onClick={onLogout}>
                      {t("common.logout", "Logout")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="nav-bottom-row">
            <button className="hamburger" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {t("common.menu", "Menu")}
            </button>

            <div className="nav-menu" aria-label="Primary navigation">
              {modules.map((module) => (
                <button
                  key={module.id}
                  className="nav-link"
                  onClick={() => handleModuleClick(module.id)}
                >
                  {module.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h3>MalabarBazaar</h3>
          <button className="close-btn" onClick={() => setIsSidebarOpen(false)}>
            {t("common.close", "Close")}
          </button>
        </div>
        <div className="sidebar-menu">
          {modules.map((module) => (
            <button
              key={module.id}
              className="sidebar-link"
              onClick={() => handleModuleClick(module.id)}
            >
              {module.label}
            </button>
          ))}
        </div>
      </div>

      {showSOSModal && (
        <div className="sos-modal-overlay">
          <div className="sos-modal">
            <div className="sos-modal-header">
              <h2>🆘 SEND SOS ALERT</h2>
            </div>
            <div className="sos-modal-content">
              <p className="sos-warning">You are about to send an emergency SOS alert!</p>
              <p className="sos-info">
                This will immediately notify emergency contacts and authorities of your location and status.
              </p>
              <div className="sos-details">
                <p><strong>Name:</strong> {displayUser?.name || displayUser?.email}</p>
                <p><strong>Phone:</strong> {displayUser?.phone || "Not provided"}</p>
              </div>
              <p className="sos-confirmation">
                Are you sure you want to send the SOS alert?
              </p>
            </div>
            <div className="sos-modal-actions">
              <button
                className="sos-cancel-btn"
                onClick={() => setShowSOSModal(false)}
                disabled={sosLoading}
              >
                Cancel
              </button>
              <button
                className="sos-send-btn"
                onClick={handleSendSOSAlert}
                disabled={sosLoading}
              >
                {sosLoading ? "Sending..." : "Send SOS Alert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
