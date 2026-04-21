import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { AppProvider } from "./contexts/AppContext";
import ErrorBoundary from "./components/ErrorBoundary";
import AnnouncementBar from "./components/AnnouncementBar";
import Navigation from "./components/Navigation";
import LaunchPage from "./components/LaunchPage";
import Login from "./components/Login";
import Dashboard from "./modules/Dashboard";
import AdminDashboard from "./modules/admin/AdminDashboard";
import Ecommerce from "./modules/ecommerce/Ecommerce";
import CartPage from "./modules/ecommerce/CartPage";
import OrdersPage from "./modules/ecommerce/OrdersPage";
import ReturnsPage from "./modules/ecommerce/ReturnsPage";
import Messaging from "./modules/messaging/Messaging";
import Classifieds from "./modules/classifieds/Classifieds";
import RealEstate from "./modules/realestate/RealEstate";
import FoodDelivery from "./modules/fooddelivery/FoodDelivery";
import RideSharing from "./modules/ridesharing/RideSharing";
import Matrimonial from "./modules/matrimonial/Matrimonial";
import SocialMedia from "./modules/socialmedia/SocialMedia";
import ReminderAlert from "./modules/reminderalert/ReminderAlert";
import SOSAlert from "./modules/sos/SOSAlert";
import { Diary } from "./modules/personaldiary";
import {
  CUSTOM_LINKS_STORAGE_KEY,
  sanitizeCustomLinks,
} from "./utils/customLinks";
import {
  clearStoredAuthToken,
  getStoredAuthToken,
  storeAuthToken,
} from "./utils/auth";
import "./App.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const EMPTY_APP_DATA = {
  businessCategories: [],
  globeMartCategories: [],
  registrationApplications: [],
  registeredAccounts: [],
  enabledModules: [],
};

axios.defaults.withCredentials = true;

function App() {
  const [authToken, setAuthToken] = useState(() => getStoredAuthToken());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [currentModule, setCurrentModule] = useState("dashboard");
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
  const [globeMartCategoryEndpointAvailable, setGlobeMartCategoryEndpointAvailable] =
    useState(true);

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
    const bootstrapApp = async () => {
      try {
        const publicData = await fetchPublicAppData();
        syncAppDataFromResponse(publicData);
        setAppDataError("");

        try {
          const authResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
            validateStatus: (status) => status === 200 || status === 401,
          });

          if (authResponse.status === 401) {
            clearStoredAuthToken();
            setAuthToken("");
            setIsLoggedIn(false);
            setLoggedInUser(null);
            setCurrentModule("dashboard");
            setAuthChecked(true);
            return;
          }

          if (!authResponse.data?.success || !authResponse.data.user) {
            setAuthChecked(true);
            return;
          }

          const restoredRegistrationType = authResponse.data.user.registrationType || "user";
          let nextAppData = publicData;

          if (restoredRegistrationType === "admin") {
            try {
              nextAppData = await fetchAdminAppData();
              syncAppDataFromResponse(nextAppData);
            } catch (error) {
              setAppDataError(
                error.response?.data?.message || "Admin data could not be loaded from the backend."
              );
            }
          }

          const restoredAccount =
            restoredRegistrationType === "entrepreneur"
              ? (nextAppData.registeredAccounts || []).find(
                  (account) =>
                    account.email === authResponse.data.user.email?.trim().toLowerCase()
                )
              : null;

          const nextUser = {
            ...authResponse.data.user,
            ...(restoredAccount || {}),
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
          setCurrentModule(
            restoredRegistrationType === "admin" ? "admin-dashboard" : "dashboard"
          );
        } catch (authError) {
          if (authError.response?.status && authError.response.status !== 401) {
            setAppDataError(
              authError.response?.data?.message ||
                authError.message ||
                "Backend data could not be loaded. Please start the API server."
            );
          }
          setIsLoggedIn(false);
          setLoggedInUser(null);
          setCurrentModule("dashboard");
        }
      } catch (error) {
        setAppDataError(
          error.response?.data?.message ||
            error.message ||
            "Backend data could not be loaded. Please start the API server."
        );
      } finally {
        setAuthChecked(true);
      }
    };

    bootstrapApp();
  }, [fetchAdminAppData, fetchPublicAppData, syncAppDataFromResponse]);

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

      const nextModule =
        resolvedRegistrationType === "admin"
          ? "admin-dashboard"
          : pendingModule && enabledModules.includes(pendingModule)
            ? pendingModule
            : "dashboard";

      setCurrentModule(nextModule);
      setPendingModule("");
      setIsLoggedIn(true);
    },
    [
      enabledModules,
      fetchAdminAppData,
      fetchPublicAppData,
      authToken,
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
    setCurrentModule("dashboard");
    setPendingModule("");
    setRegistrationType("");
    setLanguage("en");
  };

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

    const query = new URLSearchParams(window.location.search);
    const gateway = query.get("gateway");
    const paymentState = query.get("payment");

    if (gateway === "stripe" && (paymentState === "success" || paymentState === "cancelled")) {
      setCurrentModule("orders");
    }
  }, [isLoggedIn]);

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
        <div className="app-loading">Loading MalabarBazaar...</div>
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

  const renderModule = () => {
    switch (currentModule) {
      case "admin-dashboard":
        return (
          <AdminDashboard
            businessCategories={businessCategories}
            globeMartCategories={globeMartCategories}
            registrationApplications={registrationApplications}
            onUpdateCategoryFee={handleUpdateCategoryFee}
            onCreateGlobeMartCategory={handleCreateGlobeMartCategory}
            onAddGlobeMartSubcategory={handleAddGlobeMartSubcategory}
            enabledModules={enabledModules}
            onToggleModule={handleToggleModule}
          />
        );
      case "dashboard":
        return (
          <Dashboard
            enabledModules={enabledModules}
            customLinks={customLinks}
            onModuleChange={setCurrentModule}
          />
        );
      case "ecommerce":
        return (
          <Ecommerce
            globeMartCategories={globeMartCategories}
            onOpenOrders={() => setCurrentModule("orders")}
            onOpenReturns={() => setCurrentModule("returns")}
          />
        );
      case "cart":
        return <CartPage onContinueShopping={() => setCurrentModule("ecommerce")} />;
      case "orders":
        return (
          <OrdersPage
            onContinueShopping={() => setCurrentModule("ecommerce")}
            onOpenReturns={() => setCurrentModule("returns")}
          />
        );
      case "returns":
        return <ReturnsPage onContinueShopping={() => setCurrentModule("ecommerce")} />;
      case "messaging":
        return <Messaging />;
      case "classifieds":
        return <Classifieds />;
      case "realestate":
        return <RealEstate />;
      case "fooddelivery":
        return <FoodDelivery />;
      case "ridesharing":
        return <RideSharing />;
      case "matrimonial":
        return <Matrimonial onProfileUpdate={handleProfileUpdate} />;
      case "socialmedia":
        return <SocialMedia />;
      case "reminderalert":
        return <ReminderAlert customLinks={customLinks} onCustomLinksChange={setCustomLinks} />;
      case "diary":
        return <Diary />;
      case "sosalert":
        return <SOSAlert />;
      default:
        return (
          <Dashboard
            enabledModules={enabledModules}
            customLinks={customLinks}
            onModuleChange={setCurrentModule}
          />
        );
    }
  };

  return (
    <ErrorBoundary>
      <AppProvider loggedInUser={loggedInUser} language={language} authToken={authToken}>
        <AnnouncementBar language={language} />
        <Navigation
          onModuleChange={setCurrentModule}
          onLogout={handleLogout}
          loggedInUser={loggedInUser}
        />
        <main className="main-content">
          {appDataError && <div className="app-loading">{appDataError}</div>}
          {renderModule()}
        </main>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
