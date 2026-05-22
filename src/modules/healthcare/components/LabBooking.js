import React, { useEffect, useMemo, useState } from "react";
import { healthcareApi } from "../services/healthcareApi";

const formatCurrency = (value) => `INR ${Number(value || 0).toLocaleString("en-IN")}`;

const LAB_NEXT_STATUS = {
  booked: "sample_collected",
  sample_collected: "under_processing",
  under_processing: "results_ready",
  results_ready: "delivered",
};

const LAB_PARTNERS = [
  { id: "nila-labs", name: "NilaCare Diagnostics", area: "Kollam", homeCollection: true, rating: 4.8, eta: "Same day" },
  { id: "metro-labs", name: "Metro Health Lab", area: "Trivandrum", homeCollection: true, rating: 4.7, eta: "24 hours" },
  { id: "care-scan", name: "CareScan Imaging Centre", area: "Kochi", homeCollection: false, rating: 4.6, eta: "Report in 1-2 days" },
  { id: "malabar-diagnostics", name: "Malabar Diagnostics", area: "Calicut", homeCollection: true, rating: 4.5, eta: "24-48 hours" },
];

const getTestInfoFromItem = (item = {}) => {
  const fallback = {
    purpose: `${item.name || "This test"} body condition assess cheyyan doctor/lab suggest cheyyunna diagnostic test aanu.`,
    usedFor: "Symptoms, screening, follow-up, or doctor recommendation based evaluation.",
    preparation: "Booking before lab preparation/fasting instruction confirm cheyyuka.",
  };

  const nestedInfo = item.info || {};
  return {
    purpose: item.purpose || nestedInfo.purpose || fallback.purpose,
    usedFor: item.usedFor || nestedInfo.usedFor || fallback.usedFor,
    preparation: item.preparationNotes || nestedInfo.preparation || fallback.preparation,
  };
};

const LabBooking = ({
  labTests,
  healthPackages,
  onCreateAppointment,
  loading,
  labAppointments,
  onUpdateAppointmentStatus,
  onSaveResultToRecord,
}) => {
  const [activeBookingItem, setActiveBookingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [testQuery, setTestQuery] = useState("");
  const [selectedLabId, setSelectedLabId] = useState(LAB_PARTNERS[0].id);
  const [testExplanationLoading, setTestExplanationLoading] = useState(false);
  const [testExplanation, setTestExplanation] = useState({ matches: [], fallback: null });
  const [form, setForm] = useState({
    patientName: "",
    appointmentDate: "",
    appointmentTime: "",
    collectionType: "home",
    address: "",
    notes: "",
  });

  const selectedLab = useMemo(() => LAB_PARTNERS.find((lab) => lab.id === selectedLabId) || LAB_PARTNERS[0], [selectedLabId]);

  const enrichedLabTests = useMemo(() => {
    return (labTests || []).map((item) => ({ ...item, info: getTestInfoFromItem(item) }));
  }, [labTests]);

  const filteredTests = useMemo(() => {
    if (!testQuery.trim()) {
      return enrichedLabTests;
    }

    const query = testQuery.toLowerCase();
    return enrichedLabTests.filter((item) => {
      const info = item.info || getTestInfoFromItem(item);
      return (
        item.name.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        info.purpose.toLowerCase().includes(query) ||
        info.usedFor.toLowerCase().includes(query)
      );
    });
  }, [enrichedLabTests, testQuery]);

  const bloodTests = useMemo(() => filteredTests.filter((item) => item.type !== "scan"), [filteredTests]);
  const scanTests = useMemo(() => filteredTests.filter((item) => item.type === "scan"), [filteredTests]);

  const explanationRows = useMemo(() => {
    if (Array.isArray(testExplanation.matches) && testExplanation.matches.length > 0) {
      return testExplanation.matches.map((item) => ({ ...item, info: getTestInfoFromItem(item) }));
    }
    return filteredTests.slice(0, 3).map((item) => ({ ...item, info: getTestInfoFromItem(item) }));
  }, [filteredTests, testExplanation.matches]);

  useEffect(() => {
    if (!testQuery.trim()) {
      setTestExplanation({ matches: [], fallback: null });
      setTestExplanationLoading(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setTestExplanationLoading(true);
      try {
        const response = await healthcareApi.getLabTestInfo(testQuery);
        if (!active) {
          return;
        }
        setTestExplanation({
          matches: Array.isArray(response?.matches) ? response.matches : [],
          fallback: response?.fallback || null,
        });
      } catch (_error) {
        if (!active) {
          return;
        }
        setTestExplanation({ matches: [], fallback: null });
      } finally {
        if (active) {
          setTestExplanationLoading(false);
        }
      }
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [testQuery]);

  const closeBookingModal = () => {
    setActiveBookingItem(null);
    setSubmitting(false);
  };

  const handleChange = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleLabChange = (labId) => {
    setSelectedLabId(labId);
    const nextLab = LAB_PARTNERS.find((partner) => partner.id === labId) || LAB_PARTNERS[0];
    if (!nextLab.homeCollection) {
      setForm((previous) => ({
        ...previous,
        collectionType: "lab",
      }));
    }
  };

  const openBookingModal = (item, itemType) => {
    const info = getTestInfoFromItem(item);
    setActiveBookingItem({ ...item, itemType, labPartner: selectedLab, info });
    setForm({
      patientName: "",
      appointmentDate: "",
      appointmentTime: "",
      collectionType: item.homeCollection && selectedLab.homeCollection ? "home" : "lab",
      address: "",
      notes: info.preparation || "",
    });
  };

  const submitBooking = async (event) => {
    event.preventDefault();

    if (!activeBookingItem) {
      return;
    }

    if (!form.patientName || !form.appointmentDate || !form.appointmentTime) {
      setFeedbackMessage("Please complete patient name, date, and time.");
      return;
    }

    if (form.collectionType === "home" && !form.address.trim()) {
      setFeedbackMessage("Please enter collection address for home collection.");
      return;
    }

    setSubmitting(true);

    try {
      const info = getTestInfoFromItem(activeBookingItem);
      await onCreateAppointment({
        category: "lab",
        doctorId: selectedLab.id,
        doctorName: selectedLab.name,
        specialty: activeBookingItem.itemType === "package" ? "Health Package" : "Lab/Scan",
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime,
        mode: form.collectionType === "home" ? "home-collection" : "lab-visit",
        reason: activeBookingItem.name,
        patientName: form.patientName,
        collectionAddress: form.address,
        notes: `${form.notes || ""}\nLab: ${selectedLab.name}, ${selectedLab.area}`.trim(),
        status: "booked",
        amountDue: Number(activeBookingItem.price || 0),
        labPartnerId: selectedLab.id,
        labPartnerName: selectedLab.name,
        testPurpose: info.purpose,
      });

      setFeedbackMessage(`Booking confirmed with ${selectedLab.name}.`);
      closeBookingModal();
    } catch (error) {
      setFeedbackMessage(error?.message || "Unable to confirm lab booking.");
      setSubmitting(false);
    }
  };

  return (
    <section className="healthcare-section" data-testid="lab-booking">
      <div className="healthcare-section-heading">
        <h2>Lab and Scan Booking</h2>
        <p>Select lab, search test name, understand test purpose, and book blood tests/scans.</p>
      </div>

      <div className="healthcare-medical-disclaimer">
        Test explanations are general information only. Final test selection and interpretation should be done by a qualified doctor.
      </div>

      {feedbackMessage ? (
        <div className="healthcare-inline-alert" role="status">
          {feedbackMessage}
        </div>
      ) : null}

      {loading ? <p>Loading tests and packages...</p> : null}

      <div className="healthcare-selection-panel">
        <label className="healthcare-field">
          <span>Select Lab / Scan Centre</span>
          <select value={selectedLabId} onChange={(event) => handleLabChange(event.target.value)}>
            {LAB_PARTNERS.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.name} - {lab.area} - {lab.rating}*
              </option>
            ))}
          </select>
        </label>

        <label className="healthcare-field healthcare-field-full">
          <span>Enter test name</span>
          <input
            type="text"
            data-testid="lab-test-search"
            className="healthcare-search-input"
            placeholder="Eg: CBC, Thyroid, Diabetes, MRI, X-Ray"
            value={testQuery}
            onChange={(event) => setTestQuery(event.target.value)}
          />
        </label>

        <div className="healthcare-partner-summary">
          <strong>{selectedLab.name}</strong>
          <span>
            {selectedLab.area} | {selectedLab.homeCollection ? "Home collection available" : "Visit required"} | {selectedLab.eta}
          </span>
        </div>
      </div>

      {testQuery.trim() ? (
        <div className="healthcare-info-card">
          <strong>Test explanation</strong>
          {testExplanationLoading ? <p>Checking test details...</p> : null}
          {!testExplanationLoading
            ? explanationRows.map((item) => (
                <div key={item.id || item.name} className="healthcare-info-row">
                  <span>{item.name}</span>
                  <p>{item.info.purpose}</p>
                  <small>Used for: {item.info.usedFor}</small>
                </div>
              ))
            : null}
          {!testExplanationLoading && explanationRows.length === 0 && testExplanation.fallback ? (
            <div className="healthcare-info-row">
              <span>{testQuery}</span>
              <p>{testExplanation.fallback.purpose}</p>
              <small>Used for: {testExplanation.fallback.usedFor}</small>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="healthcare-lab-grid">
        <div className="healthcare-lab-section">
          <h3>Blood Tests and Home Collection</h3>
          {bloodTests.map((test) => (
            <article key={test.id} className="healthcare-test-card healthcare-info-enabled-card" data-testid="blood-test-item">
              <div>
                <strong>{test.name}</strong>
                <span>
                  {formatCurrency(test.price)} | {test.homeCollection && selectedLab.homeCollection ? "Home Collection" : "Lab Visit"}
                </span>
                <p className="healthcare-brief-info">{test.info.purpose}</p>
                <small>{test.info.preparation}</small>
              </div>
              <button type="button" className="healthcare-primary-button" onClick={() => openBookingModal(test, "test")}>
                Book Slot
              </button>
            </article>
          ))}
        </div>

        <div className="healthcare-lab-section">
          <h3>Scan Booking</h3>
          {scanTests.map((scan) => (
            <article key={scan.id} className="healthcare-test-card healthcare-info-enabled-card" data-testid="scan-test-item">
              <div>
                <strong>{scan.name}</strong>
                <span>{formatCurrency(scan.price)} | Visit required</span>
                <p className="healthcare-brief-info">{scan.info.purpose}</p>
                <small>{scan.info.preparation}</small>
              </div>
              <button type="button" className="healthcare-primary-button" onClick={() => openBookingModal(scan, "scan")}>
                Book Scan
              </button>
            </article>
          ))}
        </div>

        <div className="healthcare-lab-section">
          <h3>Health Packages</h3>
          {(healthPackages || []).map((pkg) => (
            <article key={pkg.id} className="healthcare-package-card" data-testid="health-package-item">
              <div>
                <strong>{pkg.name}</strong>
                <span>
                  {pkg.tests} tests | {formatCurrency(pkg.price)}
                </span>
                <span className="healthcare-discount">{pkg.discount}</span>
              </div>
              <button type="button" className="healthcare-primary-button" onClick={() => openBookingModal(pkg, "package")}>
                Book Package
              </button>
            </article>
          ))}
        </div>
      </div>

      {activeBookingItem ? (
        <div className="healthcare-modal-overlay" role="dialog" aria-modal="true" aria-label="Lab booking form">
          <div className="healthcare-modal">
            <div className="healthcare-modal-header">
              <h3>Book {activeBookingItem.name}</h3>
              <button type="button" className="healthcare-close-button" onClick={closeBookingModal}>
                Close
              </button>
            </div>

            <div className="healthcare-info-card compact">
              <strong>{activeBookingItem.name} - Why this test?</strong>
              <p>{activeBookingItem.info?.purpose || "General diagnostic test."}</p>
              <small>Preparation: {activeBookingItem.info?.preparation || "Lab instruction follow cheyyuka."}</small>
            </div>

            <form className="healthcare-form-grid" onSubmit={submitBooking}>
              <label className="healthcare-field">
                <span>Selected Lab</span>
                <select value={selectedLabId} onChange={(event) => handleLabChange(event.target.value)}>
                  {LAB_PARTNERS.map((lab) => (
                    <option key={lab.id} value={lab.id}>
                      {lab.name} - {lab.area}
                    </option>
                  ))}
                </select>
              </label>

              <label className="healthcare-field">
                <span>Patient Name</span>
                <input
                  type="text"
                  value={form.patientName}
                  onChange={(event) => handleChange("patientName", event.target.value)}
                  required
                />
              </label>

              <label className="healthcare-field">
                <span>Date</span>
                <input
                  type="date"
                  value={form.appointmentDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(event) => handleChange("appointmentDate", event.target.value)}
                  required
                />
              </label>

              <label className="healthcare-field">
                <span>Time Slot</span>
                <select
                  value={form.appointmentTime}
                  onChange={(event) => handleChange("appointmentTime", event.target.value)}
                  required
                >
                  <option value="">Select slot</option>
                  <option value="06:30">06:30</option>
                  <option value="07:00">07:00</option>
                  <option value="09:00">09:00</option>
                  <option value="11:00">11:00</option>
                  <option value="14:00">14:00</option>
                  <option value="16:30">16:30</option>
                  <option value="18:00">18:00</option>
                </select>
              </label>

              <label className="healthcare-field">
                <span>Collection Type</span>
                <select
                  value={form.collectionType}
                  onChange={(event) => handleChange("collectionType", event.target.value)}
                  disabled={!activeBookingItem.homeCollection || !selectedLab.homeCollection}
                >
                  <option value="home">Home Collection</option>
                  <option value="lab">Lab Visit</option>
                </select>
              </label>

              {form.collectionType === "home" ? (
                <label className="healthcare-field healthcare-field-full">
                  <span>Collection Address</span>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(event) => handleChange("address", event.target.value)}
                    placeholder="House number, locality, landmark"
                  />
                </label>
              ) : null}

              <label className="healthcare-field healthcare-field-full">
                <span>Notes / Fasting Preparation</span>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(event) => handleChange("notes", event.target.value)}
                  placeholder="Optional fasting/preparation notes"
                />
              </label>

              <div className="healthcare-modal-actions">
                <button type="button" className="healthcare-secondary-button" onClick={closeBookingModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="healthcare-primary-button" disabled={submitting}>
                  {submitting ? "Confirming..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="healthcare-record-list-card">
        <h3>Lab Booking Lifecycle</h3>
        {(labAppointments || []).length === 0 ? <p>No lab bookings yet.</p> : null}
        {(labAppointments || []).map((appointment) => {
          const status = appointment.status || "booked";
          const nextStatus = LAB_NEXT_STATUS[status];
          const canSaveResult = status === "results_ready";

          return (
            <article key={appointment.id} className="healthcare-record-item">
              <div className="healthcare-record-meta">
                <strong>{appointment.reason}</strong>
                <span>
                  {appointment.patientName || "Self"} | {appointment.appointmentDate} {appointment.appointmentTime}
                </span>
                <span>Lab: {appointment.labPartnerName || appointment.doctorName || "Lab Partner"}</span>
                <span>Collection: {appointment.mode === "home-collection" ? "Home" : "Lab Visit"}</span>
                <span className={`healthcare-status healthcare-status-${status}`}>{status.replaceAll("_", " ")}</span>
              </div>
              <div className="healthcare-record-actions">
                {nextStatus ? (
                  <button
                    type="button"
                    className="healthcare-secondary-button"
                    onClick={() => onUpdateAppointmentStatus?.(appointment.id, nextStatus)}
                  >
                    Mark {nextStatus.replaceAll("_", " ")}
                  </button>
                ) : null}
                {canSaveResult ? (
                  <button
                    type="button"
                    className="healthcare-primary-button"
                    onClick={() => onSaveResultToRecord?.(appointment)}
                  >
                    Save Result To Vault
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default LabBooking;
