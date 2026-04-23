import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navigation from "./Navigation";
import AnnouncementBar from "./AnnouncementBar";

/**
 * Note: The `onModuleChange` prop is passed temporarily to keep Navigation.js working.
 * It can be removed once Navigation is fully refactored to use router navigation directly.
 */
const Layout = ({ loggedInUser, onLogout, language, onModuleChange, appDataError = "" }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const currentModule = location.pathname.split("/").filter(Boolean)[0] || "dashboard";

  return (
    <>
      <AnnouncementBar language={language} />
      <Navigation
        onModuleChange={onModuleChange}
        onLogout={onLogout}
        loggedInUser={loggedInUser}
        currentModule={currentModule}
        t={t}
      />
      <main className="main-content">
        {appDataError ? <div className="app-loading">{appDataError}</div> : null}
        <Outlet />
      </main>
    </>
  );
};

export default Layout;
