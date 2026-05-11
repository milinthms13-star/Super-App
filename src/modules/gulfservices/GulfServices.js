import React, { useMemo, useState } from "react";
import useI18n from "../../hooks/useI18n";
import "./GulfServices.css";

const COUNTRIES = ["UAE", "Saudi Arabia", "Qatar", "Oman", "Kuwait", "Bahrain"];

const QUICK_ACTIONS = [
  { title: "Visa Assistance", subtitle: "Visit, employment, family visas and renewals." },
  { title: "Gulf Jobs", subtitle: "Verified recruiters and fraud protection." },
  { title: "Document Attestation", subtitle: "MEA, embassy, HRD and delivery tracking." },
  { title: "Travel Support", subtitle: "Flights, insurance, forex and roaming setup." },
  { title: "Medical & PCC", subtitle: "GAMCA medical and PCC guidance." },
  { title: "Returnee Help", subtitle: "Re-entry jobs, business setup and NRI services." },
];

const JOB_CATEGORIES = [
  "Hospitality",
  "Construction",
  "Healthcare",
  "IT & Engineering",
  "Logistics",
  "Sales & Retail",
];

const GulfServices = () => {
  const { t } = useI18n();
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);

  const availableJobs = useMemo(
    () =>
      JOB_CATEGORIES.map((category, idx) => ({
        id: `${selectedCountry}-${idx}`,
        title: `${category} Opportunities in ${selectedCountry}`,
        company: ["Al Nahar Group", "Gulf Connect", "Skyline Careers", "MetroWorks"][idx % 4],
        summary: `Verified recruiter jobs for ${category.toLowerCase()} candidates seeking Gulf placement.`,
      })),
    [selectedCountry]
  );

  return (
    <div className="gulf-services-page">
      <header className="gulf-services-hero">
        <div>
          <span className="gulf-services-badge">Gulf Services</span>
          <h1>{t("gulfservices.title", "Complete Gulf Support Hub")}</h1>
          <p>
            {t(
              "gulfservices.subtitle",
              "Visa, jobs, travel, attestation, NRI support and returnee services for Kerala families with Gulf connections."
            )}
          </p>
          <div className="gulf-services-hero-actions">
            <button className="btn btn-primary">Start Visa Support</button>
            <button className="btn btn-secondary">Explore Gulf Jobs</button>
          </div>
        </div>
        <div className="gulf-services-hero-summary">
          <div>
            <strong>Visa Reminders</strong>
            <p>Expiry, renewal, and embassy appointment alerts.</p>
          </div>
          <div>
            <strong>Verified Recruiters</strong>
            <p>Only trusted Gulf employers and follow-ups.</p>
          </div>
          <div>
            <strong>Attestation Tracking</strong>
            <p>Monitor MEA, embassy and domestic verification status.</p>
          </div>
        </div>
      </header>

      <section className="gulf-services-grid">
        {QUICK_ACTIONS.map((action) => (
          <article key={action.title} className="gulf-services-card">
            <h3>{action.title}</h3>
            <p>{action.subtitle}</p>
          </article>
        ))}
      </section>

      <section className="gulf-services-panel">
        <div className="gulf-services-panel-left">
          <h2>{t("gulfservices.sectionVisa", "Visa Assistance & Tracking")}</h2>
          <ul>
            <li>{t("gulfservices.visa.visit", "Visit visa processing and support.")}</li>
            <li>{t("gulfservices.visa.employment", "Employment visa guidance and document review.")}</li>
            <li>{t("gulfservices.visa.family", "Family visa assistance and sponsor coordination.")}</li>
            <li>{t("gulfservices.visa.renewal", "Renewal reminders and status updates.")}</li>
          </ul>
        </div>
        <div className="gulf-services-panel-right">
          <h2>{t("gulfservices.sectionJobs", "Gulf Jobs & Interview Support")}</h2>
          <p>
            {t(
              "gulfservices.jobs.description",
              "Country-wise jobs from verified recruiters with CV uploads, interview scheduling, and fraud warnings."
            )}
          </p>
          <div className="gulf-services-country-selector">
            {COUNTRIES.map((country) => (
              <button
                key={country}
                className={country === selectedCountry ? "active" : ""}
                onClick={() => setSelectedCountry(country)}
                type="button"
              >
                {country}
              </button>
            ))}
          </div>
          <div className="gulf-services-job-list">
            {availableJobs.map((job) => (
              <div key={job.id} className="gulf-services-job-card">
                <strong>{job.title}</strong>
                <span>{job.company}</span>
                <p>{job.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="gulf-services-features">
        <h2>{t("gulfservices.sectionSupport", "Ready for every Gulf need")}</h2>
        <div className="gulf-services-features-grid">
          <article>
            <h3>Travel Support</h3>
            <p>Flight booking help, airport pickup, travel insurance, forex, and SIM setup.</p>
          </article>
          <article>
            <h3>Document Attestation</h3>
            <p>Degree, marriage, birth certificate, embassy/MEA/HRD tracking, pickup and delivery.</p>
          </article>
          <article>
            <h3>Medical & PCC</h3>
            <p>GAMCA medical booking, police clearance guidance, and document checklist support.</p>
          </article>
          <article>
            <h3>Returnee Support</h3>
            <p>Returnee jobs, business setup advice, loan/scheme support, and skill conversion programs.</p>
          </article>
          <article>
            <h3>NRI Services</h3>
            <p>Bank account support, money transfer links, legal consultation, and property management.</p>
          </article>
          <article>
            <h3>Emergency & Alerts</h3>
            <p>Passport/visa expiry reminders, embassy alerts, document vault, and Gulf SOS support.</p>
          </article>
        </div>
      </section>
    </div>
  );
};

export default GulfServices;
