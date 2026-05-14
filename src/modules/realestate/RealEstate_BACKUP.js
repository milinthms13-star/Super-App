import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../../contexts/AppContext";
import "../../styles/RealEstate.css";
import HomeSphere from "./HomeSphere";
import SellerDashboard from "./SellerDashboard";
import AdminDashboard from "./AdminDashboard";

import {
  REAL_ESTATE_SEED_PROPERTIES,
} from "./realEstateConstants";
import {
  buildListingPayloadFromForm,
  getAllowedRoleModes,
  getPreferredRoleMode,
  getUserIdentity,
  normalizeProperty,
  resolveErrorMessage,
  validateListingForm,
} from "./realEstateUtils";

const generateToastId = () =>
  `re-toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const getDuplicateListingQueue = (properties) => {
  const signatureMap = new Map();
  properties.forEach((property) => {
    const signature = `${String(property.title || "")
      .trim()
      .toLowerCase()}::${String(property.location || "")
      .trim()
      .toLowerCase()}`;
    signatureMap.set(signature, [
      ...(signatureMap.get(signature) || []),
      property,
    ]);
  });
  return [...signatureMap.values()].filter((items) => items.length > 1).flat();
};

const RealEstate = () => {
  const {
    currentUser,
    favorites,
    addToFavorites,
    removeFavorite,
    mockData,
    apiCall = async () => ({}),
    createRealEstateListing = async () => null,
    updateRealEstateListing = async () => null,
    sendRealEstateEnquiry = async () => null,
    updateRealEstateLead = async () => null,
    scheduleRealEstateVisit = async () => null,
    updateRealEstateVisit = async () => null,
    addRealEstateReview = async () => null,
    reportRealEstateListing = async () => null,
    moderateRealEstateListing = async () => null,
    deleteRealEstateListing = async () => null,
  } = useApp();

  // ROUTING STATE
  const [view, setView] = useState("homesphere"); // homesphere | seller | admin
  const [activeRole, setActiveRole] = useState(() =>
    getPreferredRoleMode(currentUser)
  );
  const [toasts, setToasts] = useState([]);

  // SHARED STATE
  const [leadBoard, setLeadBoard] = useState([]);
  const [visitBoard, setVisitBoard] = useState([]);

  const pushToast = (message, type = "success") => {
    const toast = { id: generateToastId(), message, type };
    setToasts((current) => [toast, ...current].slice(0, 5));
    setTimeout(() => {
      setToasts((current) =>
        current.filter((item) => item.id !== toast.id)
      );
    }, 3800);
  };

  const runAsync = async (key, fn) => {
    try {
      return await fn();
    } catch (error) {
      pushToast(resolveErrorMessage(error), "error");
    }
  };

  const { ownerId: currentOwnerId } = useMemo(
    () => getUserIdentity(currentUser),
    [currentUser]
  );

  const allowedRoleModes = useMemo(
    () => getAllowedRoleModes(currentUser),
    [currentUser]
  );

  const currentUserEmail = useMemo(
    () => String(currentUser?.email || "").trim().toLowerCase(),
    [currentUser?.email]
  );

  // LOAD PROPERTIES
  const sourceProperties = useMemo(() => {
    const incomingProperties = Array.isArray(mockData?.realestateProperties)
      ? mockData.realestateProperties
      : [];
    return incomingProperties.length > 0
      ? incomingProperties
      : REAL_ESTATE_SEED_PROPERTIES;
  }, [mockData?.realestateProperties]);

  const properties = useMemo(
    () =>
      sourceProperties.map((property, index) =>
        normalizeProperty(property, index)
      ),
    [sourceProperties]
  );

  // GENERATE LEAD & VISIT BOARDS
  useEffect(() => {
    setLeadBoard(
      properties
        .filter((p) => String(p.ownerId || "") === currentOwnerId)
        .slice(0, 5)
    );
    setVisitBoard(
      properties
        .filter((p) => p.recentVisits?.length)
        .slice(0, 5)
    );
  }, [properties, currentOwnerId]);

  // ADMIN QUEUES
  const adminQueues = useMemo(() => {
    return {
      duplicates: getDuplicateListingQueue(properties),
      reports: properties.filter((p) => (p.reports?.length || 0) > 0),
      unverified: properties.filter((p) => !p.verified),
    };
  }, [properties]);

  // HANDLERS

  const handleNavigateToDashboard = (dashboard) => {
    if (dashboard === "seller" && allowedRoleModes.includes("owner")) {
      setView("seller");
      setActiveRole("owner");
    } else if (dashboard === "admin" && allowedRoleModes.includes("admin")) {
      setView("admin");
      setActiveRole("admin");
    } else {
      pushToast("You don't have access to this area", "error");
    }
  };

  const handleLeadUpdate = async (leadId, newStage) => {
    await runAsync("leadUpdate", async () => {
      await updateRealEstateLead(leadId, newStage);
      pushToast("Lead updated");
    });
  };

  const handleVisitUpdate = async (visitId, newStatus) => {
    await runAsync("visitUpdate", async () => {
      await updateRealEstateVisit(visitId, newStatus);
      pushToast("Visit status updated");
    });
  };

  const handleListingSubmit = async (payload, editListingId) => {
    await runAsync("listingSubmit", async () => {
      if (editListingId) {
        await updateRealEstateListing(editListingId, payload);
        pushToast("Listing updated successfully");
      } else {
        await createRealEstateListing(payload);
        pushToast("Listing created successfully");
      }
    });
  };

  const handleSubscriptionUpgrade = async (planId, gateway) => {
    await runAsync("payment", async () => {
      await apiCall("subscribeRealEstatePlan", {
        planId,
        gateway,
        userId: currentUserEmail,
      });
      pushToast(`Subscription initiated with ${gateway}`);
    });
  };

  const handleModerate = async (listingId, reason) => {
    await runAsync("moderation", async () => {
      await moderateRealEstateListing(listingId, {
        action: "flag",
        reason,
      });
      pushToast("Listing flagged for review");
    });
  };

  const handleVerify = async (listingId) => {
    await runAsync("verification", async () => {
      await apiCall("verifyRealEstateListing", {
        listingId,
        verified: true,
      });
      pushToast("Listing verified");
    });
  };

  // RENDER

  return (
    <div className="realestate-top-level">
      {/* NAV / ROLE SWITCHER */}
      <nav className="realestate-top-nav">
        <div className="realestate-nav-brand">
          <h2>NilaHub Real Estate</h2>
        </div>
        <div className="realestate-nav-views">
          <button
            type="button"
            className={`realestate-nav-btn ${view === "homesphere" ? "active" : ""}`}
            onClick={() => setView("homesphere")}
          >
            🏠 Search Properties
          </button>
          {allowedRoleModes.includes("owner") && (
            <button
              type="button"
              className={`realestate-nav-btn ${view === "seller" ? "active" : ""}`}
              onClick={() => setView("seller")}
            >
              📋 My Dashboard
            </button>
          )}
          {allowedRoleModes.includes("admin") && (
            <button
              type="button"
              className={`realestate-nav-btn ${view === "admin" ? "active" : ""}`}
              onClick={() => setView("admin")}
            >
              ⚙️ Moderation
            </button>
          )}
        </div>
      </nav>

      {/* MAIN CONTENT */}
      {view === "homesphere" && (
        <HomeSphere
          onNavigateToDashboard={handleNavigateToDashboard}
        />
      )}

      {view === "seller" && (
        <SellerDashboard
          currentUser={currentUser}
          activeRole={activeRole}
          setActiveRole={setActiveRole}
          allowedRoleModes={allowedRoleModes}
          leadBoard={leadBoard}
          visitBoard={visitBoard}
          properties={properties}
          onLeadUpdate={handleLeadUpdate}
          onVisitUpdate={handleVisitUpdate}
          onListingSubmit={handleListingSubmit}
          onSubscriptionUpgrade={handleSubscriptionUpgrade}
          pushToast={pushToast}
        />
      )}

      {view === "admin" && (
        <AdminDashboard
          properties={properties}
          leadBoard={leadBoard}
          adminQueues={adminQueues}
          onModerate={handleModerate}
          onVerify={handleVerify}
          pushToast={pushToast}
        />
      )}

      {/* TOAST NOTIFICATIONS (GLOBAL) */}
      <div className="realestate-toast-stack">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`realestate-toast realestate-toast-${toast.type}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RealEstate;
