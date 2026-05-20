import React, { useMemo, useState } from "react";

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

const TEST_INFO = {
  "complete blood count": {
    purpose: "CBC bloodile RBC, WBC, platelet, hemoglobin okke check cheyyan ullath aanu.",
    usedFor: "Fever, infection, anemia, weakness, general health screening.",
    preparation: "Usually fasting venda. Doctor/lab instruction follow cheyyuka.",
  },
  "diabetes test": {
    purpose: "Blood sugar level ariyan. Diabetes undo/control il ano enn nokkan.",
    usedFor: "Diabetes screening, sugar control monitoring, tiredness, frequent urination.",
    preparation: "Fasting sugar aanenkil 8-10 hours fasting venam.",
  },
  "thyroid profile": {
    purpose: "Thyroid hormone level check cheyyan. TSH/T3/T4 values nokkum.",
    usedFor: "Weight change, tiredness, hair fall, irregular periods, thyroid monitoring.",
    preparation: "Morning sample preferred. Thyroid tablet kazhikkunnavar doctor instruction follow cheyyuka.",
  },
  "pregnancy test": {
    purpose: "Pregnancy hormone hCG detect cheyyan ullath aanu.",
    usedFor: "Missed period/pregnancy confirmation.",
    preparation: "Urine/blood type anusarich lab instruction follow cheyyuka.",
  },
  "lipid profile": {
    purpose: "Cholesterol and triglyceride levels check cheyyan.",
    usedFor: "Heart risk, cholesterol monitoring, obesity, diabetes, BP patients.",
    preparation: "Some labs fasting parayum. Booking time il confirm cheyyuka.",
  },
  "liver function test": {
    purpose: "Liver enzymes and bilirubin level check cheyyan.",
    usedFor: "Jaundice, alcohol/medicine effect, liver disease monitoring.",
    preparation: "Usually fasting venda, but lab instruction follow cheyyuka.",
  },
  "mri scan": {
    purpose: "Magnetic imaging use cheyth body internal organs/brain/spine/joints detail ayi kanan.",
    usedFor: "Brain, spine, joint injury, tumor/inflammation evaluation.",
    preparation: "Metal items remove cheyyanam. Pacemaker/implants undenkil labine ariyikkuka.",
  },
  "ct scan": {
    purpose: "X-ray based cross-sectional scan aanu. Internal injury/organ detail kanan.",
    usedFor: "Head injury, chest/abdomen problems, stones, trauma.",
    preparation: "Contrast scan aanenkil fasting/allergy/kidney history labine ariyikkuka.",
  },
  ultrasound: {
    purpose: "Sound waves use cheyth organs, pregnancy, abdomen, kidney etc scan cheyyan.",
    usedFor: "Pregnancy, abdomen pain, kidney/gall bladder, uterus/ovary evaluation.",
    preparation: "Abdomen/pelvis scan aanenkil water kudich bladder full venam enn parayum.",
  },
  "x-ray": {
    purpose: "Bones/chest/lungs basic imaging check cheyyan.",
    usedFor: "Fracture, chest infection, injury, joint pain.",
    preparation: "Metal ornaments remove cheyyuka. Pregnancy possibility undenkil ariyikkuka.",
  },
  "2d echo": {
    purpose: "Heart structure and pumping function ultrasound pole check cheyyan.",
    usedFor: "Chest pain, breathlessness, BP/heart disease monitoring.",
    preparation: "Usually special preparation venda.",
  },
  mammography: {
    purpose: "Breast tissue X-ray screening aanu.",
    usedFor: "Breast lump, pain, screening, family history.",
    preparation: "Deodorant/powder avoid cheyyuka; previous reports kondu varuka.",
  },
};

const getTestInfo = (name = "") => {
  const normalizedName = name.toLowerCase().trim();
  return (
    TEST_INFO[normalizedName] || {
      purpose: `${name} test body condition assess cheyyan doctor/lab suggest cheyyunna diagnostic test aanu. Exact purpose doctor advice anusarich vary cheyyum.`,
      usedFor: "Symptoms, screening, follow-up, or doctor recommendation based evaluation.",
      preparation: "Booking before lab preparation/fasting instruction confirm cheyyuka.",
    }
  );
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
    return (labTests || []).map((item) => ({ ...item, info: getTestInfo(item.name) }));
  }, [labTests]);

  const filteredTests = useMemo(() => {
    if (!testQuery.trim()) return enrichedLabTests;
    const q = testQuery.toLowerCase();
    return enrichedLabTests.filter((item) => {
      const info = item.info || getTestInfo(item.name);
      return (
        item.name.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        info.purpose.toLowerCase().includes(q) ||
        info.usedFor.toLowerCase().includes(q)
      );
    });
  }, [enrichedLabTests, testQuery]);

  const bloodTests = useMemo(() => filteredTests.filter((item) => item.type !== "scan"), [filteredTests]);
  const scanTests = useMemo(() => filteredTests.filter((item) => item.type === "scan"), [filteredTests]);

  const openBookingModal = (item, itemType) => {
    setActiveBookingItem({ ...item, itemType, labPartner: selectedLab });
    setForm({
      patientName: "",
      appointmentDate: "",
      appointmentTime: "",
      collectionType: item.homeCollection && selectedLab.homeCollection ? "home" : "lab",
      address: "",
      notes: item.info?.preparation || "",
    });
  };

  const closeBookingModal = () => {
    setActiveBookingItem(null);
    setSubmitting(false);
  };

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const submitBooking = async (event) => {
    event.preventDefault();
    if (!activeBookingItem) return;

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
        testPurpose: activeBookingItem.info?.purpose,
      });

      setFeedbackMessage(`Booking confirmed with ${selectedLab.name}.`);
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
        <p>Select lab, search test name, understand test purpose, and book blood tests/scans.</p>
      </div>

      <div className="healthcare-medical-disclaimer">
        Test explanations are general information only. Final test selection and interpretation should be done by a qualified doctor.
      </div>

      {feedbackMessage ? <div className="healthcare-inline-alert" role="status">{feedbackMessage}</div> : null}
      {loading ? <p>Loading tests and packages...</p> : null}

      <div className="healthcare-selection-panel">
        <label className="healthcare-field">
          <span>Select Lab / Scan Centre</span>
          <select value={selectedLabId} onChange={(event) => setSelectedLabId(event.target.value)}>
            {LAB_PARTNERS.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.name} - {lab.area} - {lab.rating}★
              </option>
            ))}
          </select>
        </label>

        <label className="healthcare-field healthcare-field-full">
          <span>Enter test name</span>
          <input
            type="text"
            className="healthcare-search-input"
            placeholder="Eg: CBC, Thyroid, Diabetes, MRI, X-Ray"
            value={testQuery}
            onChange={(event) => setTestQuery(event.target.value)}
          />
        </label>

        <div className="healthcare-partner-summary">
          <strong>{selectedLab.name}</strong>
          <span>{selectedLab.area} | {selectedLab.homeCollection ? "Home collection available" : "Visit required"} | {selectedLab.eta}</span>
        </div>
      </div>

      {testQuery.trim() ? (
        <div className="healthcare-info-card">
          <strong>Test explanation</strong>
          {(filteredTests.slice(0, 3)).map((item) => (
            <div key={item.id} className="healthcare-info-row">
              <span>{item.name}</span>
              <p>{item.info.purpose}</p>
              <small>Used for: {item.info.usedFor}</small>
            </div>
          ))}
          {filteredTests.length === 0 ? <p>No exact test found. You can still request this test in notes while booking.</p> : null}
        </div>
      ) : null}

      <div className="healthcare-lab-grid">
        <div className="healthcare-lab-section">
          <h3>Blood Tests and Home Collection</h3>
          {bloodTests.map((test) => (
            <article key={test.id} className="healthcare-test-card healthcare-info-enabled-card">
              <div>
                <strong>{test.name}</strong>
                <span>{formatCurrency(test.price)} | {test.homeCollection && selectedLab.homeCollection ? "Home Collection" : "Lab Visit"}</span>
                <p className="healthcare-brief-info">{test.info.purpose}</p>
                <small>{test.info.preparation}</small>
              </div>
              <button type="button" className="healthcare-primary-button" onClick={() => openBookingModal(test, "test")}>Book Slot</button>
            </article>
          ))}
        </div>

        <div className="healthcare-lab-section">
          <h3>Scan Booking</h3>
          {scanTests.map((scan) => (
            <article key={scan.id} className="healthcare-test-card healthcare-info-enabled-card">
              <div>
                <strong>{scan.name}</strong>
                <span>{formatCurrency(scan.price)} | Visit required</span>
                <p className="healthcare-brief-info">{scan.info.purpose}</p>
                <small>{scan.info.preparation}</small>
              </div>
              <button type="button" className="healthcare-primary-button" onClick={() => openBookingModal(scan, "scan")}>Book Scan</button>
            </article>
          ))}
        </div>

        <div className="healthcare-lab-section">
          <h3>Health Packages</h3>
          {(healthPackages || []).map((pkg) => (
            <article key={pkg.id} className="healthcare-package-card">
              <div>
                <strong>{pkg.name}</strong>
                <span>{pkg.tests} tests | {formatCurrency(pkg.price)}</span>
                <span className="healthcare-discount">{pkg.discount}</span>
              </div>
              <button type="button" className="healthcare-primary-button" onClick={() => openBookingModal(pkg, "package")}>Book Package</button>
            </article>
          ))}
        </div>
      </div>

      {activeBookingItem ? (
        <div className="healthcare-modal-overlay" role="dialog" aria-modal="true" aria-label="Lab booking form">
          <div className="healthcare-modal">
            <div className="healthcare-modal-header">
              <h3>Book {activeBookingItem.name}</h3>
              <button type="button" className="healthcare-close-button" onClick={closeBookingModal}>Close</button>
            </div>

            <div className="healthcare-info-card compact">
              <strong>{activeBookingItem.name} - എന്തിനു?</strong>
              <p>{activeBookingItem.info?.purpose || "General diagnostic test."}</p>
              <small>Preparation: {activeBookingItem.info?.preparation || "Lab instruction follow cheyyuka."}</small>
            </div>

            <form className="healthcare-form-grid" onSubmit={submitBooking}>
              <label className="healthcare-field">
                <span>Selected Lab</span>
                <select value={selectedLabId} onChange={(event) => setSelectedLabId(event.target.value)}>
                  {LAB_PARTNERS.map((lab) => <option key={lab.id} value={lab.id}>{lab.name} - {lab.area}</option>)}
                </select>
              </label>

              <label className="healthcare-field">
                <span>Patient Name</span>
                <input type="text" value={form.patientName} onChange={(event) => handleChange("patientName", event.target.value)} required />
              </label>

              <label className="healthcare-field">
                <span>Date</span>
                <input type="date" value={form.appointmentDate} min={new Date().toISOString().split("T")[0]} onChange={(event) => handleChange("appointmentDate", event.target.value)} required />
              </label>

              <label className="healthcare-field">
                <span>Time Slot</span>
                <select value={form.appointmentTime} onChange={(event) => handleChange("appointmentTime", event.target.value)} required>
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
                <select value={form.collectionType} onChange={(event) => handleChange("collectionType", event.target.value)} disabled={!activeBookingItem.homeCollection || !selectedLab.homeCollection}>
                  <option value="home">Home Collection</option>
                  <option value="lab">Lab Visit</option>
                </select>
              </label>

              {form.collectionType === "home" ? (
                <label className="healthcare-field healthcare-field-full">
                  <span>Collection Address</span>
                  <input type="text" value={form.address} onChange={(event) => handleChange("address", event.target.value)} placeholder="House number, locality, landmark" />
                </label>
              ) : null}

              <label className="healthcare-field healthcare-field-full">
                <span>Notes / Fasting Preparation</span>
                <input type="text" value={form.notes} onChange={(event) => handleChange("notes", event.target.value)} placeholder="Optional fasting/preparation notes" />
              </label>

              <div className="healthcare-modal-actions">
                <button type="button" className="healthcare-secondary-button" onClick={closeBookingModal} disabled={submitting}>Cancel</button>
                <button type="submit" className="healthcare-primary-button" disabled={submitting}>{submitting ? "Confirming..." : "Confirm Booking"}</button>
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
                <span>{appointment.patientName || "Self"} | {appointment.appointmentDate} {appointment.appointmentTime}</span>
                <span>Lab: {appointment.labPartnerName || appointment.doctorName || "Lab Partner"}</span>
                <span>Collection: {appointment.mode === "home-collection" ? "Home" : "Lab Visit"}</span>
                <span className={`healthcare-status healthcare-status-${status}`}>{status.replaceAll("_", " ")}</span>
              </div>
              <div className="healthcare-record-actions">
                {nextStatus ? <button type="button" className="healthcare-secondary-button" onClick={() => onUpdateAppointmentStatus?.(appointment.id, nextStatus)}>Mark {nextStatus.replaceAll("_", " ")}</button> : null}
                {canSaveResult ? <button type="button" className="healthcare-primary-button" onClick={() => onSaveResultToRecord?.(appointment)}>Save Result To Vault</button> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default LabBooking;
