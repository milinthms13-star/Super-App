import React, { useMemo, useState } from "react";
import { FAMILY_MEMBERS } from "../data/healthcareMockData";

const getDoctorSlotsForDate = (doctor, date) => {
  if (!doctor || !date) {
    return [];
  }

  const slot = Array.isArray(doctor.availableSlots)
    ? doctor.availableSlots.find((entry) => entry.date === date)
    : null;

  return Array.isArray(slot?.times) ? slot.times : [];
};

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const DoctorConsultation = ({
  doctors,
  appointments,
  loading,
  onCreateAppointment,
  onCancelAppointment,
  onRescheduleAppointment,
  onPayAppointment,
  onUpdateAppointmentLifecycle,
}) => {
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");
  const [activeDoctor, setActiveDoctor] = useState(null);
  const [bookingType, setBookingType] = useState("new");
  const [editingAppointmentId, setEditingAppointmentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [bookingForm, setBookingForm] = useState({
    patientName: "",
    patientPhone: "",
    familyMember: "Self",
    reason: "",
    mode: "clinic",
    appointmentDate: "",
    appointmentTime: "",
  });

  const specialties = useMemo(() => {
    const values = Array.from(new Set((doctors || []).map((doctor) => doctor.specialty).filter(Boolean)));
    return ["all", ...values];
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    if (selectedSpecialty === "all") {
      return doctors;
    }

    return (doctors || []).filter((doctor) => doctor.specialty === selectedSpecialty);
  }, [doctors, selectedSpecialty]);

  const sortedAppointments = useMemo(() => {
    return [...(appointments || [])].sort((a, b) => {
      const left = `${a.appointmentDate || ""} ${a.appointmentTime || ""}`;
      const right = `${b.appointmentDate || ""} ${b.appointmentTime || ""}`;
      return right.localeCompare(left);
    });
  }, [appointments]);

  const slotsForSelectedDate = useMemo(() => {
    return getDoctorSlotsForDate(activeDoctor, bookingForm.appointmentDate);
  }, [activeDoctor, bookingForm.appointmentDate]);

  const openBookingModal = (doctor, mode = "new", appointment = null) => {
    if (!doctor) {
      return;
    }

    const initialDate = doctor.availableSlots?.[0]?.date || "";
    const initialTime = doctor.availableSlots?.[0]?.times?.[0] || "";

    setBookingType(mode);
    setEditingAppointmentId(appointment?.id || "");
    setActiveDoctor(doctor);
    setFeedbackMessage("");
    setBookingForm({
      patientName: appointment?.patientName || "",
      patientPhone: appointment?.patientPhone || "",
      familyMember: appointment?.familyMember || "Self",
      reason: appointment?.reason || "",
      mode: appointment?.mode || doctor.availableModes?.[0] || "clinic",
      appointmentDate: appointment?.appointmentDate || initialDate,
      appointmentTime: appointment?.appointmentTime || initialTime,
    });
  };

  const closeModal = () => {
    setActiveDoctor(null);
    setEditingAppointmentId("");
    setSubmitting(false);
  };

  const updateFormField = (name, value) => {
    setBookingForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleDateChange = (value) => {
    const possibleTimes = getDoctorSlotsForDate(activeDoctor, value);
    setBookingForm((previous) => ({
      ...previous,
      appointmentDate: value,
      appointmentTime: possibleTimes[0] || "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!activeDoctor) {
      return;
    }

    if (!bookingForm.appointmentDate || !bookingForm.appointmentTime || !bookingForm.patientName) {
      setFeedbackMessage("Please complete patient name, date, and time.");
      return;
    }

    const payload = {
      doctorId: activeDoctor.id,
      doctorName: activeDoctor.name,
      specialty: activeDoctor.specialty,
      appointmentDate: bookingForm.appointmentDate,
      appointmentTime: bookingForm.appointmentTime,
      mode: bookingForm.mode,
      reason: bookingForm.reason,
      patientName: bookingForm.patientName,
      patientPhone: bookingForm.patientPhone,
      familyMember: bookingForm.familyMember,
      status: bookingType === "reschedule" ? "rescheduled" : "requested",
      category: "doctor",
      amountDue: Number(activeDoctor.consultationFee || 0),
    };

    setSubmitting(true);

    try {
      if (bookingType === "reschedule" && editingAppointmentId) {
        await onRescheduleAppointment(editingAppointmentId, payload);
        setFeedbackMessage("Appointment rescheduled successfully.");
      } else {
        await onCreateAppointment(payload);
        setFeedbackMessage("Appointment booked successfully.");
      }

      closeModal();
    } catch (error) {
      setFeedbackMessage(error?.message || "Unable to save appointment.");
      setSubmitting(false);
    }
  };

  return (
    <section className="healthcare-section">
      <div className="healthcare-section-heading">
        <h2>Doctor Consultation</h2>
        <p>Book clinic or online video consultations with profile, slot, and confirmation flow.</p>
      </div>

      {feedbackMessage ? (
        <div className="healthcare-inline-alert" role="status">
          {feedbackMessage}
        </div>
      ) : null}

      <div className="healthcare-filter-row">
        <label className="healthcare-field">
          <span>Specialty</span>
          <select
            value={selectedSpecialty}
            onChange={(event) => setSelectedSpecialty(event.target.value)}
            aria-label="Filter doctors by specialty"
          >
            {specialties.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty === "all" ? "All specialties" : specialty}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="healthcare-consultation-grid">
        <div className="healthcare-doctors-list">
          {loading ? <p>Loading doctors...</p> : null}
          {!loading && filteredDoctors.length === 0 ? <p>No doctors available for the selected specialty.</p> : null}

          {filteredDoctors.map((doctor) => (
            <article key={doctor.id} className="healthcare-doctor-card">
              <strong>{doctor.name}</strong>
              <span>
                {doctor.specialty} | {doctor.experienceYears} years | INR {doctor.consultationFee}
              </span>
              <span>
                Rating {doctor.rating} ({doctor.reviewsCount} reviews)
              </span>
              <span>{doctor.qualifications}</span>
              <span>{doctor.clinicAddress}</span>
              <span>Languages: {(doctor.languages || []).join(", ")}</span>
              <span>
                Next slots: {(doctor.availableSlots || [])
                  .slice(0, 2)
                  .map((slot) => `${formatDate(slot.date)} (${slot.times?.length || 0} slots)`)
                  .join(" | ")}
              </span>

              <div className="healthcare-doctor-actions">
                <button
                  type="button"
                  className="healthcare-secondary-button"
                  onClick={() => openBookingModal(doctor)}
                >
                  Book Clinic Visit
                </button>
                <button
                  type="button"
                  className="healthcare-primary-button"
                  onClick={() => {
                    openBookingModal(doctor);
                    updateFormField("mode", "video");
                  }}
                >
                  Book Video Consultation
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="healthcare-appointments-panel">
          <h3>Appointment History</h3>
          {sortedAppointments.length === 0 ? <p>No appointments yet.</p> : null}

          {sortedAppointments.map((appointment) => {
            const currentDoctor = doctors.find((doctor) => doctor.id === appointment.doctorId);
            const status = appointment.status || "requested";
            const isUpcoming = !["cancelled", "completed", "no_show"].includes(status);
            const canStartVisit = ["requested", "booked", "confirmed", "rescheduled"].includes(status);
            const canCompleteVisit = ["in_progress", "confirmed", "rescheduled"].includes(status);

            return (
              <div key={appointment.id} className="healthcare-appointment-item">
                <strong>{appointment.doctorName}</strong>
                <span>
                  {appointment.specialty} | {formatDate(appointment.appointmentDate)} at {appointment.appointmentTime}
                </span>
                <span>Mode: {appointment.mode}</span>
                <span>Patient: {appointment.patientName || appointment.familyMember || "Self"}</span>
                <span>Amount: INR {Number(appointment.amountDue || 0).toLocaleString("en-IN")}</span>
                <span className={`healthcare-status healthcare-status-${status}`}>
                  {status.replaceAll("_", " ")}
                </span>
                <span className={`healthcare-status healthcare-status-${appointment.paymentStatus || "pending"}`}>
                  payment: {appointment.paymentStatus || "pending"}
                </span>

                {isUpcoming ? (
                  <div className="healthcare-doctor-actions">
                    <button
                      type="button"
                      className="healthcare-secondary-button"
                      onClick={() => {
                        const confirmed = window.confirm("Cancel this appointment?");
                        if (confirmed) {
                          void onCancelAppointment(appointment.id);
                        }
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="healthcare-secondary-button"
                      onClick={() => openBookingModal(currentDoctor, "reschedule", appointment)}
                      disabled={!currentDoctor}
                    >
                      Reschedule
                    </button>
                    {appointment.paymentStatus !== "paid" && Number(appointment.amountDue || 0) > 0 ? (
                      <button
                        type="button"
                        className="healthcare-primary-button"
                        onClick={() => onPayAppointment?.(appointment)}
                      >
                        Pay Now
                      </button>
                    ) : null}
                    {status === "requested" || status === "booked" ? (
                      <button
                        type="button"
                        className="healthcare-secondary-button"
                        onClick={() => onUpdateAppointmentLifecycle?.(appointment.id, "confirmed")}
                      >
                        Confirm
                      </button>
                    ) : null}
                    {canStartVisit ? (
                      <button
                        type="button"
                        className="healthcare-secondary-button"
                        onClick={() => onUpdateAppointmentLifecycle?.(appointment.id, "in_progress")}
                      >
                        Start Visit
                      </button>
                    ) : null}
                    {canCompleteVisit ? (
                      <button
                        type="button"
                        className="healthcare-primary-button"
                        onClick={() => onUpdateAppointmentLifecycle?.(appointment.id, "completed")}
                      >
                        Mark Completed
                      </button>
                    ) : null}
                    {canStartVisit ? (
                      <button
                        type="button"
                        className="healthcare-danger-button"
                        onClick={() => onUpdateAppointmentLifecycle?.(appointment.id, "no_show")}
                      >
                        Mark No-Show
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {status === "completed" ? (
                  <div className="healthcare-doctor-actions">
                    <button
                      type="button"
                      className="healthcare-secondary-button"
                      onClick={() => openBookingModal(currentDoctor, "reschedule", appointment)}
                      disabled={!currentDoctor}
                    >
                      Schedule Follow-up
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {activeDoctor ? (
        <div className="healthcare-modal-overlay" role="dialog" aria-modal="true" aria-label="Appointment booking form">
          <div className="healthcare-modal">
            <div className="healthcare-modal-header">
              <h3>{bookingType === "reschedule" ? "Reschedule Appointment" : "Book Appointment"}</h3>
              <button type="button" className="healthcare-close-button" onClick={closeModal}>
                Close
              </button>
            </div>

            <p>
              {activeDoctor.name} | {activeDoctor.specialty}
            </p>

            <form className="healthcare-form-grid" onSubmit={handleSubmit}>
              <label className="healthcare-field">
                <span>Patient Name</span>
                <input
                  type="text"
                  value={bookingForm.patientName}
                  onChange={(event) => updateFormField("patientName", event.target.value)}
                  required
                />
              </label>

              <label className="healthcare-field">
                <span>Phone</span>
                <input
                  type="tel"
                  value={bookingForm.patientPhone}
                  onChange={(event) => updateFormField("patientPhone", event.target.value)}
                  placeholder="Optional"
                />
              </label>

              <label className="healthcare-field">
                <span>Family Member</span>
                <select
                  value={bookingForm.familyMember}
                  onChange={(event) => updateFormField("familyMember", event.target.value)}
                >
                  {FAMILY_MEMBERS.map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>
              </label>

              <label className="healthcare-field">
                <span>Consultation Type</span>
                <select value={bookingForm.mode} onChange={(event) => updateFormField("mode", event.target.value)}>
                  {(activeDoctor.availableModes || ["clinic"]).map((mode) => (
                    <option key={mode} value={mode}>
                      {mode === "video" ? "Video Consultation" : "Clinic Visit"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="healthcare-field">
                <span>Available Date</span>
                <select
                  value={bookingForm.appointmentDate}
                  onChange={(event) => handleDateChange(event.target.value)}
                  required
                >
                  {(activeDoctor.availableSlots || []).map((slot) => (
                    <option key={slot.date} value={slot.date}>
                      {formatDate(slot.date)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="healthcare-field">
                <span>Available Time Slot</span>
                <select
                  value={bookingForm.appointmentTime}
                  onChange={(event) => updateFormField("appointmentTime", event.target.value)}
                  required
                >
                  {slotsForSelectedDate.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </label>

              <label className="healthcare-field healthcare-field-full">
                <span>Reason for visit</span>
                <input
                  type="text"
                  value={bookingForm.reason}
                  onChange={(event) => updateFormField("reason", event.target.value)}
                  placeholder="Symptoms or consultation reason"
                />
              </label>

              <div className="healthcare-modal-actions">
                <button type="button" className="healthcare-secondary-button" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="healthcare-primary-button" disabled={submitting}>
                  {submitting ? "Saving..." : bookingType === "reschedule" ? "Confirm Reschedule" : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default DoctorConsultation;
