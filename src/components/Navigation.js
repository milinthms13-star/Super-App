import React, { useState } from "react";
import { useApp } from "../contexts/AppContext";
import useI18n from "../hooks/useI18n";
import "../styles/Navigation.css";

const Navigation = ({ onModuleChange, onLogout, loggedInUser, currentModule }) => {
  const { currentUser, cart } = useApp();
  const { t } = useI18n();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  const handleSOSButtonClick = () => {
    onModuleChange("sosalert");
    setIsSidebarOpen(false);

    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("malabarbazaar:sos-requested"));
    }, currentModule === "sosalert" ? 0 : 150);
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
                title="Open SOS Safety Center and trigger the emergency workflow"
              >
                SOS
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
    </>
  );
};

export default Navigation;
