import React, { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import i18n from "./i18n";
import axios from "axios";
import { io } from "socket.io-client";
import { AppProvider } from "./contexts/AppContext";
import ErrorBoundary from "./components/ErrorBoundary";
import AnnouncementBar from "./components/AnnouncementBar";
import Layout from "./components/Layout";
import LaunchPage from "./components/LaunchPage";
import Login from "./components/Login";
import {
  CUSTOM_LINKS_STORAGE_KEY,
  sanitizeCustomLinks,
} from "./utils/customLinks";
import {
  clearStoredAuthToken,
  getStoredAuthToken,
  storeAuthToken,
} from "./utils/auth";
import {
  getPathForModule,
  getProtectedModuleFromPathname,
  MODULE_PATHS,
  ROUTABLE_MODULES,
} from "./utils/moduleRoutes";
import { API_BASE_URL, BACKEND_BASE_URL } from "./utils/api";
import "./App.css";

const Dashboard = React.lazy(() => import("./modules/Dashboard"));
const AdminDashboard = React.lazy(() => import("./modules/admin/AdminDashboard"));
const Ecommerce = React.lazy(() => import("./modules/ecommerce/Ecommerce"));
const CartPage = React.lazy(() => import("./modules/ecommerce/CartPage"));
const OrdersPage = React.lazy(() => import("./modules/ecommerce/OrdersPage"));
const ReturnsPage = React.lazy(() => import("./modules/ecommerce/ReturnsPage"));
const Messaging = React.lazy(() => import("./modules/messaging/Messaging"));
const Classifieds = React.lazy(() => import("./modules/classifieds/Classifieds"));
const RealEstate = React.lazy(() => import("./modules/realestate/RealEstate"));
const FoodDelivery = React.lazy(() => import("./modules/fooddelivery/FoodDelivery"));
const LocalMarket = React.lazy(() => import("./modules/localmarket/LocalMarket"));
const RideSharing = React.lazy(() => import("./modules/ridesharing/RideSharing"));
const Matrimonial = React.lazy(() => import("./modules/matrimonial/Matrimonial"));
const SocialMedia = React.lazy(() => import("./modules/socialmedia/SocialMedia"));
const ReminderAlert = React.lazy(() => import("./modules/reminderalert/ReminderAlert"));
const SOSAlert = React.lazy(() => import("./modules/sos/SOSAlert"));
const AstrologyHome = React.lazy(() => import("./modules/astrology/AstrologyHome"));
const Support = React.lazy(() => import("./modules/support/Support"));
const Diary = React.lazy(() =>
  import("./modules/personaldiary").then((module) => ({ default: module.Diary }))
);

const SOCKET_BASE_URL = BACKEND_BASE_URL;

const EMPTY_APP_DATA = {
  businessCategories: [],
  globeMartCategories: [],
  registrationApplications: [],
  registeredAccounts: [],
  enabledModules: [],
};

axios.defaults.withCredentials = true;

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authToken, setAuthToken] = useState(() => getStoredAuthToken());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [pendingModule, setPendingModule] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [registrationType, setRegistrationType] = useState("");
  const [language, setLanguage] = useState("en");
  const [businessCategories, setBusinessCategories] = useState(EMPTY_APP_DATA.businessCategories);
  const [globeMartCategories, setGlobeMartCategories] = useState(
    EMPTY_APP_DATA.globeMartCategories
  );
  const [registrationApplications, setRegistrationApplications] = useState(
    EMPTY_APP_DATA.registrationApplications
  );
  const [registeredAccounts, setRegisteredAccounts] = useState(EMPTY_APP_DATA.registeredAccounts);
  const [enabledModules, setEnabledModules] = useState(EMPTY_APP_DATA.enabledModules);
  const [customLinks, setCustomLinks] = useState(() => {
    try {
      return sanitizeCustomLinks(JSON.parse(localStorage.getItem(CUSTOM_LINKS_STORAGE_KEY) || "[]"));
    } catch (error) {
      return [];
    }
  });
  const [appDataError, setAppDataError] = useState("");
  const [incomingSosAlert, setIncomingSosAlert] = useState(null);
  const [globeMartCategoryEndpointAvailable, setGlobeMartCategoryEndpointAvailable] =
    useState(true);
  const isAdminUser =
    loggedInUser?.role === "admin" || loggedInUser?.registrationType === "admin";
  const defaultAuthenticatedPath = isAdminUser
    ? MODULE_PATHS["admin-dashboard"]
    : MODULE_PATHS.dashboard;

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  const navigateToModule = useCallback(
    (moduleId, options = {}) => {
      navigate(getPathForModule(moduleId, defaultAuthenticatedPath), options);
    },
    [defaultAuthenticatedPath, navigate]
  );

  const syncAppDataFromResponse = useCallback((data = {}) => {
    setBusinessCategories(Array.isArray(data.businessCategories) ? data.businessCategories : []);
    setGlobeMartCategories(
      Array.isArray(data.globeMartCategories) ? data.globeMartCategories : []
    );
    setRegistrationApplications(
      Array.isArray(data.registrationApplications) ? data.registrationApplications : []
    );
    setRegisteredAccounts(Array.isArray(data.registeredAccounts) ? data.registeredAccounts : []);
    setEnabledModules(Array.isArray(data.enabledModules) ? data.enabledModules : []);
  }, []);

  const fetchPublicAppData = useCallback(async () => {
    const response = await axios.get(`${API_BASE_URL}/app-data/public`);
    if (!response.data?.success) {
      throw new Error("Could not load platform data.");
    }

    return response.data.data || {};
  }, []);

  const fetchAdminAppData = useCallback(async () => {
    const response = await axios.get(`${API_BASE_URL}/app-data/admin`);

    if (!response.data?.success) {
      throw new Error("Could not load admin data.");
    }

    return response.data.data || {};
  }, []);

  const loadPublicAppData = useCallback(async () => {
    try {
      const publicData = await fetchPublicAppData();
      syncAppDataFromResponse(publicData);
      setAppDataError("");
    } catch (error) {
      setAppDataError(
        error.response?.data?.message || "Backend data could not be loaded. Please start the API server."
      );
    }
  }, [fetchPublicAppData, syncAppDataFromResponse]);

  const loadAdminAppData = useCallback(async () => {
    try {
      const adminData = await fetchAdminAppData();
      syncAppDataFromResponse(adminData);
      setAppDataError("");
    } catch (error) {
      setAppDataError(
        error.response?.data?.message || "Admin data could not be loaded from the backend."
      );
    }
  }, [fetchAdminAppData, syncAppDataFromResponse]);

  useEffect(() => {
    if (authToken) {
      axios.defaults.headers.common.Authorization = `Bearer ${authToken}`;
      return;
    }

    delete axios.defaults.headers.common.Authorization;
  }, [authToken]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_LINKS_STORAGE_KEY, JSON.stringify(customLinks));
  }, [customLinks]);

  useEffect(() => {
    if (!isLoggedIn || !authToken) {
      setIncomingSosAlert(null);
      return undefined;
    }

    const socket = io(SOCKET_BASE_URL, {
      auth: {
        token: authToken,
      },
      withCredentials: true,
    });

    socket.on("sos:incoming", (payload) => {
      setIncomingSosAlert(payload || null);
    });

    socket.on("call:incoming", (payload) => {
      if (payload?.emergency) {
        setIncomingSosAlert((currentAlert) => currentAlert || {
          alertId: `sos-${payload.callId}`,
          callId: payload.callId,
          chatId: payload.chatId,
          fromUser: payload.caller,
          location: payload.sosAlert?.location || "Current Location",
          reason: payload.sosAlert?.reason || "Emergency support requested",
          timestamp: payload.sosAlert?.timestamp || new Date().toISOString(),
          online: true,
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [authToken, isLoggedIn]);

  useEffect(() => {
    let isActive = true;

    const bootstrapAuth = async () => {
      if (!authToken) {
        if (isActive) {
          setAuthChecked(true);
        }
        void loadPublicAppData();
        return;
      }

      axios.defaults.headers.common.Authorization = `Bearer ${authToken}`;
      void loadPublicAppData();

      try {
        const authResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
          validateStatus: (status) => status === 200 || status === 401,
        });

        if (!isActive) {
          return;
        }

        if (authResponse.status === 401) {
          clearStoredAuthToken();
          setAuthToken("");
          setIsLoggedIn(false);
          setLoggedInUser(null);
          setAuthChecked(true);
          return;
        }

        if (!authResponse.data?.success || !authResponse.data.user) {
          setAuthChecked(true);
          return;
        }

        const restoredRegistrationType = authResponse.data.user.registrationType || "user";
        const restoredAccount = null;

        const nextUser = {
          ...authResponse.data.user,
          registrationType: restoredRegistrationType,
          role:
            restoredRegistrationType === "admin"
              ? "admin"
              : restoredRegistrationType === "user"
                ? "user"
                : "business",
          avatar: restoredRegistrationType === "admin" ? "A" : authResponse.data.user.avatar,
        };

        setLanguage(nextUser.preferences?.language || "en");
        setLoggedInUser(nextUser);
        setIsLoggedIn(true);
        setAuthChecked(true);

        if (restoredRegistrationType === "admin") {
          void loadAdminAppData();
        }
      } catch (authError) {
        if (!isActive) {
          return;
        }

        if (authError.response?.status && authError.response.status !== 401) {
          setAppDataError(
            authError.response?.data?.message ||
              authError.message ||
              "Backend data could not be loaded. Please start the API server."
          );
        }

        setIsLoggedIn(false);
        setLoggedInUser(null);
        setAuthChecked(true);
      }
    };

    bootstrapAuth();

    return () => {
      isActive = false;
    };
  }, [authToken, loadAdminAppData, loadPublicAppData]);

  const handleLoginSuccess = useCallback(
    async (user, _token, activeRole) => {
      const resolvedRegistrationType = activeRole || registrationType || user.registrationType || "user";
      const nextAuthToken = _token || authToken;

      if (nextAuthToken) {
        storeAuthToken(nextAuthToken);
        setAuthToken(nextAuthToken);
        axios.defaults.headers.common.Authorization = `Bearer ${nextAuthToken}`;
      }

      let nextUser = {
        ...user,
        registrationType: resolvedRegistrationType,
        role:
          resolvedRegistrationType === "admin"
            ? "admin"
            : resolvedRegistrationType === "user"
              ? "user"
              : user.role || "business",
        avatar: resolvedRegistrationType === "admin" ? "A" : user.avatar,
      };

      try {
        const nextAppData =
          resolvedRegistrationType === "admin"
            ? await fetchAdminAppData()
            : await fetchPublicAppData();

        syncAppDataFromResponse(nextAppData);
        setAppDataError("");

        if (resolvedRegistrationType === "entrepreneur") {
          const matchedAccount = (nextAppData.registeredAccounts || []).find(
            (account) => account.email === nextUser.email?.trim().toLowerCase()
          );

          if (matchedAccount) {
            nextUser = {
              ...nextUser,
              ...matchedAccount,
            };
          }
        }

        const profileResponse = await axios.patch(`${API_BASE_URL}/auth/me`, {
          registrationType: resolvedRegistrationType,
          role:
            resolvedRegistrationType === "admin"
              ? "admin"
              : resolvedRegistrationType === "user"
                ? "user"
                : "business",
          phone: nextUser.phone || "",
          location: nextUser.location || "",
          businessName: nextUser.businessName || "",
          selectedBusinessCategories: nextUser.selectedBusinessCategories || [],
          selectedCategoryDetails:
            nextUser.selectedCategoryDetails || nextUser.selectedBusinessCategories || [],
        });

        if (profileResponse.data?.success && profileResponse.data.user) {
          nextUser = {
            ...nextUser,
            ...profileResponse.data.user,
          };
        }
      } catch (error) {
        setAppDataError(
          error.response?.data?.message || "Shared platform data could not be refreshed."
        );
      }

      setLanguage(nextUser.preferences?.language || "en");
      setLoggedInUser(nextUser);
      setIsLoggedIn(true);

      const currentRouteModule = getProtectedModuleFromPathname(location.pathname);
      const currentPathIsProtected = ROUTABLE_MODULES.has(currentRouteModule);
      const defaultPathForRole =
        resolvedRegistrationType === "admin"
          ? MODULE_PATHS["admin-dashboard"]
          : MODULE_PATHS.dashboard;

      const nextModule =
        resolvedRegistrationType === "admin"
          ? "admin-dashboard"
          : pendingModule && enabledModules.includes(pendingModule)
            ? pendingModule
            : currentPathIsProtected
              ? currentRouteModule
              : "dashboard";

      setPendingModule("");
      navigate(getPathForModule(nextModule, defaultPathForRole), { replace: true });
    },
    [
      enabledModules,
      fetchAdminAppData,
      fetchPublicAppData,
      authToken,
      location.pathname,
      navigate,
      pendingModule,
      registrationType,
      syncAppDataFromResponse,
    ]
  );

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/auth/logout`);
    } catch (error) {
      // Clear local app state even if the backend logout request fails.
    }
    clearStoredAuthToken();
    setAuthToken("");
    delete axios.defaults.headers.common.Authorization;
    setIsLoggedIn(false);
    setLoggedInUser(null);
    setPendingModule("");
    setRegistrationType("");
    setLanguage("en");
    navigate("/", { replace: true });
  };

  const handleOpenEmergencyModule = useCallback((nextModule) => {
    setIncomingSosAlert(null);
    navigateToModule(nextModule);
  }, [navigateToModule]);

  const handleSelectRegistrationType = (type, targetModule = "") => {
    setRegistrationType(type);
    setPendingModule(targetModule);
  };

  const handleBackToLaunch = () => {
    setRegistrationType("");
    setPendingModule("");
  };

  const handleLanguageChange = async (nextLanguage) => {
    setLanguage(nextLanguage);

    if (!isLoggedIn) {
      return;
    }

    try {
      const response = await axios.patch(`${API_BASE_URL}/auth/me`, {
        preferences: {
          language: nextLanguage,
        },
      });

      if (response.data?.success && response.data.user) {
        setLoggedInUser(response.data.user);
      }
    } catch (error) {
      setAppDataError(
        error.response?.data?.message || "Language preference could not be saved."
      );
    }
  };

  const handleProfileUpdate = useCallback((updatedUser) => {
    if (!updatedUser) {
      return;
    }

    setLoggedInUser((currentUser) => ({
      ...(currentUser || {}),
      ...updatedUser,
    }));
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const query = new URLSearchParams(location.search);
    const gateway = query.get("gateway");
    const paymentState = query.get("payment");

    if (gateway === "stripe" && (paymentState === "success" || paymentState === "cancelled")) {
      if (location.pathname !== MODULE_PATHS.orders) {
        navigate(
          {
            pathname: MODULE_PATHS.orders,
            search: location.search,
          },
          { replace: true }
        );
      }
    }
  }, [isLoggedIn, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const query = new URLSearchParams(location.search);
    const requestedModule = String(query.get("module") || "").trim();
    if (!requestedModule) {
      return;
    }

    if (!ROUTABLE_MODULES.has(requestedModule)) {
      return;
    }

    query.delete("module");
    const nextQuery = query.toString();
    navigate(
      {
        pathname: getPathForModule(requestedModule, defaultAuthenticatedPath),
        search: nextQuery ? `?${nextQuery}` : "",
      },
      { replace: true }
    );
  }, [defaultAuthenticatedPath, isLoggedIn, location.search, navigate]);

  const handleRegistrationSubmit = useCallback(
    async (application) => {
      const payload = new FormData();
      const { files = {}, ...applicationFields } = application || {};

      Object.entries(applicationFields).forEach(([key, value]) => {
        if (Array.isArray(value) || (value && typeof value === "object")) {
          payload.append(key, JSON.stringify(value));
          return;
        }

        payload.append(key, value ?? "");
      });

      Object.entries(files).forEach(([key, file]) => {
        if (file) {
          payload.append(key, file);
        }
      });

      const response = await axios.post(
        `${API_BASE_URL}/app-data/registration-applications`,
        payload
      );

      if (!response.data?.success) {
        throw new Error("Registration could not be saved.");
      }

      setRegistrationApplications(response.data.data?.registrationApplications || []);
      setRegisteredAccounts(response.data.data?.registeredAccounts || []);
    },
    []
  );

  const handleUpdateCategoryFee = useCallback(async (categoryId, nextFee) => {
    const response = await axios.put(
      `${API_BASE_URL}/app-data/business-categories/${categoryId}/fee`,
      { fee: nextFee }
    );

    if (!response.data?.success) {
      throw new Error("Fee update failed.");
    }

    setBusinessCategories(response.data.data?.businessCategories || []);
  }, []);

  const handleToggleModule = useCallback(async (moduleId) => {
    const response = await axios.patch(
      `${API_BASE_URL}/app-data/enabled-modules/${moduleId}`,
      {}
    );

    if (!response.data?.success) {
      throw new Error("Module update failed.");
    }

    setEnabledModules(response.data.data?.enabledModules || []);
  }, []);

  const handleReviewRegistration = useCallback(async (applicationId, action, reason) => {
    const response = await axios.patch(
      `${API_BASE_URL}/app-data/registration-applications/${applicationId}/review`,
      { action, reason }
    );

    if (!response.data?.success) {
      throw new Error("Registration review update failed.");
    }

    setRegistrationApplications(response.data.data?.registrationApplications || []);
    return response.data;
  }, []);

  const handleCreateGlobeMartCategory = useCallback(async (categoryInput) => {
    const normalizedCategory =
      typeof categoryInput === "string"
        ? { name: categoryInput.trim(), theme: "", accentColor: "", subcategories: [] }
        : {
            name: String(categoryInput?.name || "").trim(),
            theme: String(categoryInput?.theme || "").trim(),
            accentColor: String(categoryInput?.accentColor || "").trim(),
            subcategories: Array.isArray(categoryInput?.subcategories)
              ? categoryInput.subcategories.filter(Boolean)
              : [],
          };
    const trimmedName = normalizedCategory.name;

    const mergeLocalCategory = (currentCategories) => {
      const safeCategories = Array.isArray(currentCategories) ? currentCategories : [];
      const alreadyExists = safeCategories.some((category) => {
        const name =
          typeof category === "string"
            ? category
            : String(category?.name || category?.label || category?.id || "");

        return name.trim().toLowerCase() === trimmedName.toLowerCase();
      });

      return alreadyExists ? safeCategories : [...safeCategories, normalizedCategory];
    };

    if (!globeMartCategoryEndpointAvailable) {
      setGlobeMartCategories((currentCategories) => mergeLocalCategory(currentCategories));
      return { persisted: false };
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/app-data/globemart-categories`,
        normalizedCategory
      );

      if (!response.data?.success) {
        throw new Error("GlobeMart category creation failed.");
      }

      const nextCategories = Array.isArray(response.data.data?.globeMartCategories)
        ? response.data.data.globeMartCategories
        : mergeLocalCategory(globeMartCategories);

      setGlobeMartCategories(nextCategories);
      setGlobeMartCategoryEndpointAvailable(true);
      return { persisted: true };
    } catch (error) {
      if (error.response?.status === 404) {
        setGlobeMartCategoryEndpointAvailable(false);
        setGlobeMartCategories((currentCategories) => mergeLocalCategory(currentCategories));
        return { persisted: false };
      }

      throw error;
    }
  }, [globeMartCategories, globeMartCategoryEndpointAvailable]);

  const handleAddGlobeMartSubcategory = useCallback(
    async (categoryId, subcategoryName) => {
      const trimmedSubcategory = String(subcategoryName || "").trim();

      const mergeLocalSubcategory = (currentCategories) =>
        (Array.isArray(currentCategories) ? currentCategories : []).map((category) => {
          if (typeof category === "string") {
            const normalizedName = category.trim();
            const normalizedId = normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

            if (categoryId !== normalizedId && categoryId !== normalizedName) {
              return category;
            }

            return {
              id: normalizedId,
              name: normalizedName,
              theme: "",
              accentColor: "",
              subcategories: [trimmedSubcategory],
            };
          }

          if (category?.id !== categoryId) {
            return category;
          }

          const currentSubcategories = Array.isArray(category?.subcategories)
            ? category.subcategories
            : [];
          const alreadyExists = currentSubcategories.some(
            (item) => String(item || "").trim().toLowerCase() === trimmedSubcategory.toLowerCase()
          );

          return alreadyExists
            ? category
            : { ...category, subcategories: [...currentSubcategories, trimmedSubcategory] };
        });

      try {
        const response = await axios.post(
          `${API_BASE_URL}/app-data/globemart-categories/${categoryId}/subcategories`,
          { subcategory: trimmedSubcategory }
        );

        if (!response.data?.success) {
          throw new Error("GlobeMart subcategory creation failed.");
        }

        setGlobeMartCategories(
          Array.isArray(response.data.data?.globeMartCategories)
            ? response.data.data.globeMartCategories
            : mergeLocalSubcategory(globeMartCategories)
        );
        return { persisted: true };
      } catch (error) {
        if (error.response?.status === 404) {
          setGlobeMartCategories((currentCategories) => mergeLocalSubcategory(currentCategories));
          return { persisted: false };
        }

        throw error;
      }
    },
    [globeMartCategories]
  );

  if (!authChecked) {
    return (
      <>
        <AnnouncementBar language={language} />
        <div className="app-loading">Loading NilaHub...</div>
      </>
    );
  }

  if (!isLoggedIn) {
    if (!registrationType) {
      return (
        <>
          <AnnouncementBar language={language} />
          <LaunchPage
            language={language}
            onLanguageChange={handleLanguageChange}
            onSelectRegistrationType={handleSelectRegistrationType}
            enabledModules={enabledModules}
            customLinks={customLinks}
          />
          {appDataError && <div className="app-loading">{appDataError}</div>}
        </>
      );
    }

    return (
      <>
        <AnnouncementBar language={language} />
        <Login
          language={language}
          registrationType={registrationType}
          businessCategories={businessCategories}
          registeredAccounts={registeredAccounts}
          onBackToLaunch={handleBackToLaunch}
          onRegistrationSubmit={handleRegistrationSubmit}
          onLoginSuccess={handleLoginSuccess}
          enabledModules={enabledModules}
        />
      </>
    );
  }

  return (
    <ErrorBoundary>
      <AppProvider loggedInUser={loggedInUser} language={language} authToken={authToken}>
        <React.Suspense fallback={<div className="app-loading">Loading app modules...</div>}>
          <Routes>
            <Route
              path="/"
              element={
                <Layout
                  loggedInUser={loggedInUser}
                  onLogout={handleLogout}
                  language={language}
                  appDataError={appDataError}
                />
              }
            >
              <Route index element={<Navigate to={defaultAuthenticatedPath} replace />} />
              <Route
                path="dashboard"
                element={
                  isAdminUser ? (
                    <Navigate to={MODULE_PATHS["admin-dashboard"]} replace />
                  ) : (
                    <Dashboard
                      enabledModules={enabledModules}
                      customLinks={customLinks}
                    />
                  )
                }
              />
              <Route
                path="admin-dashboard"
                element={
                  isAdminUser ? (
                    <AdminDashboard
                      businessCategories={businessCategories}
                      globeMartCategories={globeMartCategories}
                      registrationApplications={registrationApplications}
                      onReviewRegistration={handleReviewRegistration}
                      onUpdateCategoryFee={handleUpdateCategoryFee}
                      onCreateGlobeMartCategory={handleCreateGlobeMartCategory}
                      onAddGlobeMartSubcategory={handleAddGlobeMartSubcategory}
                      enabledModules={enabledModules}
                      onToggleModule={handleToggleModule}
                    />
                  ) : (
                    <Navigate to={MODULE_PATHS.dashboard} replace />
                  )
                }
              />
              <Route
                path="ecommerce"
                element={<Ecommerce globeMartCategories={globeMartCategories} />}
              />
              <Route path="cart" element={<CartPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="returns" element={<ReturnsPage />} />
              <Route path="messaging" element={<Messaging />} />
              <Route path="classifieds" element={<Classifieds />} />
              <Route path="realestate" element={<RealEstate />} />
              <Route path="fooddelivery" element={<FoodDelivery />} />
              <Route path="localmarket" element={<LocalMarket />} />
              <Route path="ridesharing" element={<RideSharing />} />
              <Route
                path="matrimonial"
                element={<Matrimonial onProfileUpdate={handleProfileUpdate} />}
              />
              <Route path="socialmedia" element={<SocialMedia />} />
              <Route
                path="reminderalert"
                element={
                  <ReminderAlert customLinks={customLinks} onCustomLinksChange={setCustomLinks} />
                }
              />
              <Route path="diary" element={<Diary />} />
              <Route path="sosalert" element={<SOSAlert />} />
              <Route path="astrology" element={<AstrologyHome />} />
              <Route path="support" element={<Support />} />
              <Route path="*" element={<Navigate to={defaultAuthenticatedPath} replace />} />
            </Route>
          </Routes>
        </React.Suspense>
        {incomingSosAlert ? (
          <div className="emergency-call-overlay">
            <div className="emergency-call-modal">
              <span className="emergency-call-kicker">Emergency Alert</span>
              <h2>{incomingSosAlert.fromUser?.name || incomingSosAlert.fromUser?.email || "A contact"} needs help</h2>
              <p>
                {incomingSosAlert.reason} near {incomingSosAlert.location}.
              </p>
              <p className="emergency-call-meta">
                In-app SOS call requested at {new Date(incomingSosAlert.timestamp).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <div className="emergency-call-actions">
                <button
                  type="button"
                  className="emergency-call-primary"
                  onClick={() => handleOpenEmergencyModule("sosalert")}
                >
                  Open SOS Center
                </button>
                <button
                  type="button"
                  className="emergency-call-secondary"
                  onClick={() => handleOpenEmergencyModule("messaging")}
                >
                  Open Messaging
                </button>
                <button
                  type="button"
                  className="emergency-call-secondary"
                  onClick={() => setIncomingSosAlert(null)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </AppProvider>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
