import React, { useMemo, useState } from "react";

const formatCurrency = (value) => `INR ${Number(value || 0).toLocaleString("en-IN")}`;

const LabBooking = ({ labTests, healthPackages, onCreateAppointment, loading }) => {
  const [activeBookingItem, setActiveBookingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [form, setForm] = useState({
    patientName: "",
    appointmentDate: "",
    appointmentTime: "",
    collectionType: "home",
    address: "",
    notes: "",
  });

  const bloodTests = useMemo(() => (labTests || []).filter((item) => item.type !== "scan"), [labTests]);
  const scanTests = useMemo(() => (labTests || []).filter((item) => item.type === "scan"), [labTests]);

  const openBookingModal = (item, itemType) => {
    setActiveBookingItem({ ...item, itemType });
    setForm({
      patientName: "",
      appointmentDate: "",
      appointmentTime: "",
      collectionType: item.homeCollection ? "home" : "lab",
      address: "",
      notes: "",
    });
  };

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

  const submitBooking = async (event) => {
    event.preventDefault();

    if (!activeBookingItem) {
      return;
    }

    if (!form.patientName || !form.appointmentDate || !form.appointmentTime) {
      setFeedbackMessage("Please complete patient name, date, and time.");
      return;
    }

    setSubmitting(true);

    try {
      await onCreateAppointment({
        category: "lab",
        doctorId: "lab-partner",
        doctorName: "NilaCare Lab Partner",
        specialty: activeBookingItem.itemType === "package" ? "Health Package" : "Lab/Scan",
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime,
        mode: form.collectionType === "home" ? "home-collection" : "lab-visit",
        reason: activeBookingItem.name,
        patientName: form.patientName,
        collectionAddress: form.address,
        notes: form.notes,
        status: "booked",
        amountDue: Number(activeBookingItem.price || 0),
      });

      setFeedbackMessage("Lab booking confirmed.");
      closeBookingModal();
    } catch (error) {
      setFeedbackMessage(error?.message || "Unable to confirm lab booking.");
      setSubmitting(false);
    }
  };

  return (
    <section className="healthcare-section">
      <div className="healthcare-section-heading">
        <h2>Lab and Scan Booking</h2>
        <p>Book blood tests, home collection slots, MRI/CT/Ultrasound/X-Ray, and health packages.</p>
      </div>

      {feedbackMessage ? (
        <div className="healthcare-inline-alert" role="status">
          {feedbackMessage}
        </div>
      ) : null}

      {loading ? <p>Loading tests and packages...</p> : null}

      <div className="healthcare-lab-grid">
        <div className="healthcare-lab-section">
          <h3>Blood Tests and Home Collection</h3>
          {bloodTests.map((test) => (
            <article key={test.id} className="healthcare-test-card">
              <div>
                <strong>{test.name}</strong>
                <span>
                  {formatCurrency(test.price)} | {test.homeCollection ? "Home Collection" : "Lab Visit"}
                </span>
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
            <article key={scan.id} className="healthcare-test-card">
              <div>
                <strong>{scan.name}</strong>
                <span>{formatCurrency(scan.price)} | Visit required</span>
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
            <article key={pkg.id} className="healthcare-package-card">
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

            <form className="healthcare-form-grid" onSubmit={submitBooking}>
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
                  disabled={!activeBookingItem.homeCollection}
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
                <span>Notes</span>
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
    </section>
  );
};

export default LabBooking;
