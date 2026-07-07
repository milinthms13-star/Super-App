import React, { useEffect, useState } from "react";
import { healthcareApi } from "../services/healthcareApi";
import "./DoctorAvailabilityManager.css";

const DoctorAvailabilityManager = ({ doctorId }) => {
  const [loading, setLoading] = useState(true);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);
  const [recurringPattern, setRecurringPattern] = useState({
    enabled: false,
    daysOfWeek: [],
    startTime: "09:00",
    endTime: "17:00",
    slotDuration: 30,
    breakStart: "13:00",
    breakEnd: "14:00",
  });
  const [blockMode, setBlockMode] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  const daysOfWeek = [
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
    { value: "sunday", label: "Sunday" },
  ];

  const timeOptions = Array.from({ length: 24 * 2 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    return `${hour.toString().padStart(2, "0")}:${minute}`;
  });

  useEffect(() => {
    loadAvailability();
  }, [doctorId]);

  useEffect(() => {
    if (selectedDate) {
      generateTimeSlotsForDate(selectedDate);
    }
  }, [selectedDate]);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const data = await healthcareApi.getDoctorAvailability(doctorId);
      setAvailableSlots(data.slots || []);
      
      if (data.recurringPattern) {
        setRecurringPattern(data.recurringPattern);
      }
    } catch (error) {
      console.error("Failed to load availability:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlotsForDate = (date) => {
    const dayOfWeek = new Date(date).toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    
    if (recurringPattern.enabled && recurringPattern.daysOfWeek.includes(dayOfWeek)) {
      const slots = generateSlotsFromPattern(date);
      setTimeSlots(slots);
    } else {
      const existingSlot = availableSlots.find((slot) => slot.date === date);
      setTimeSlots(existingSlot?.times || []);
    }
  };

  const generateSlotsFromPattern = (date) => {
    const slots = [];
    const startHour = parseInt(recurringPattern.startTime.split(":")[0]);
    const startMinute = parseInt(recurringPattern.startTime.split(":")[1]);
    const endHour = parseInt(recurringPattern.endTime.split(":")[0]);
    const endMinute = parseInt(recurringPattern.endTime.split(":")[1]);
    const breakStartHour = parseInt(recurringPattern.breakStart.split(":")[0]);
    const breakStartMinute = parseInt(recurringPattern.breakStart.split(":")[1]);
    const breakEndHour = parseInt(recurringPattern.breakEnd.split(":")[0]);
    const breakEndMinute = parseInt(recurringPattern.breakEnd.split(":")[1]);

    let currentTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    const breakStart = breakStartHour * 60 + breakStartMinute;
    const breakEnd = breakEndHour * 60 + breakEndMinute;

    while (currentTime < endTime) {
      const hour = Math.floor(currentTime / 60);
      const minute = currentTime % 60;
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;

      // Skip break time
      if (currentTime < breakStart || currentTime >= breakEnd) {
        slots.push({
          time: timeString,
          available: true,
          booked: false,
        });
      }

      currentTime += recurringPattern.slotDuration;
    }

    return slots;
  };

  const toggleTimeSlot = (time) => {
    setTimeSlots((prev) =>
      prev.map((slot) =>
        slot.time === time
          ? { ...slot, available: !slot.available }
          : slot
      )
    );
  };

  const addTimeSlot = (time) => {
    if (!timeSlots.find((slot) => slot.time === time)) {
      setTimeSlots((prev) => [
        ...prev,
        { time, available: true, booked: false },
      ].sort((a, b) => a.time.localeCompare(b.time)));
    }
  };

  const removeTimeSlot = (time) => {
    setTimeSlots((prev) => prev.filter((slot) => slot.time !== time));
  };

  const saveAvailability = async () => {
    if (!selectedDate) {
      alert("Please select a date");
      return;
    }

    try {
      await healthcareApi.updateDoctorAvailability(doctorId, {
        date: selectedDate,
        times: timeSlots.filter((slot) => slot.available).map((slot) => slot.time),
      });

      alert("Availability saved successfully");
      await loadAvailability();
    } catch (error) {
      alert("Failed to save availability");
      console.error(error);
    }
  };

  const saveRecurringPattern = async () => {
    try {
      await healthcareApi.updateDoctorRecurringPattern(doctorId, recurringPattern);
      alert("Recurring pattern saved successfully");
      await loadAvailability();
    } catch (error) {
      alert("Failed to save recurring pattern");
      console.error(error);
    }
  };

  const blockDate = async () => {
    if (!selectedDate) {
      alert("Please select a date");
      return;
    }

    try {
      await healthcareApi.blockDoctorDate(doctorId, {
        date: selectedDate,
        reason: blockReason || "Unavailable",
      });

      alert("Date blocked successfully");
      setBlockMode(false);
      setBlockReason("");
      await loadAvailability();
    } catch (error) {
      alert("Failed to block date");
      console.error(error);
    }
  };

  const handleRecurringChange = (field, value) => {
    setRecurringPattern((prev) => ({ ...prev, [field]: value }));
  };

  const toggleDayOfWeek = (day) => {
    setRecurringPattern((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  const getNext7Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date.toISOString().split("T")[0]);
    }
    return days;
  };

  if (loading) {
    return (
      <div className="doctor-availability-manager">
        <div className="loading">Loading availability...</div>
      </div>
    );
  }

  return (
    <div className="doctor-availability-manager" data-testid="doctor-availability-manager">
      <div className="manager-header">
        <h2>Manage Your Availability</h2>
        <p>Set your consultation schedule and manage time slots</p>
      </div>

      <div className="manager-tabs">
        <button
          className={!blockMode ? "tab-active" : ""}
          onClick={() => setBlockMode(false)}
        >
          Set Availability
        </button>
        <button
          className={blockMode ? "tab-active" : ""}
          onClick={() => setBlockMode(true)}
        >
          Block Dates
        </button>
      </div>

      {!blockMode ? (
        <div className="availability-content">
          <div className="recurring-pattern-section">
            <h3>Recurring Weekly Pattern</h3>
            <p className="section-description">
              Set your regular weekly schedule. This will automatically apply to future dates.
            </p>

            <div className="pattern-form">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={recurringPattern.enabled}
                  onChange={(e) => handleRecurringChange("enabled", e.target.checked)}
                />
                <span>Enable recurring pattern</span>
              </label>

              {recurringPattern.enabled && (
                <>
                  <div className="form-group">
                    <label>Working Days</label>
                    <div className="days-selector">
                      {daysOfWeek.map((day) => (
                        <button
                          key={day.value}
                          className={`day-btn ${
                            recurringPattern.daysOfWeek.includes(day.value) ? "selected" : ""
                          }`}
                          onClick={() => toggleDayOfWeek(day.value)}
                        >
                          {day.label.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="time-range-group">
                    <div className="form-group">
                      <label>Start Time</label>
                      <select
                        value={recurringPattern.startTime}
                        onChange={(e) => handleRecurringChange("startTime", e.target.value)}
                      >
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>End Time</label>
                      <select
                        value={recurringPattern.endTime}
                        onChange={(e) => handleRecurringChange("endTime", e.target.value)}
                      >
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="time-range-group">
                    <div className="form-group">
                      <label>Break Start</label>
                      <select
                        value={recurringPattern.breakStart}
                        onChange={(e) => handleRecurringChange("breakStart", e.target.value)}
                      >
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Break End</label>
                      <select
                        value={recurringPattern.breakEnd}
                        onChange={(e) => handleRecurringChange("breakEnd", e.target.value)}
                      >
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Slot Duration (minutes)</label>
                    <select
                      value={recurringPattern.slotDuration}
                      onChange={(e) => handleRecurringChange("slotDuration", parseInt(e.target.value))}
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>60 minutes</option>
                    </select>
                  </div>

                  <button className="save-pattern-btn" onClick={saveRecurringPattern}>
                    Save Recurring Pattern
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="date-specific-section">
            <h3>Date-Specific Availability</h3>
            <p className="section-description">
              Override or customize availability for specific dates
            </p>

            <div className="date-selector">
              <label>Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            {selectedDate && (
              <>
                <div className="quick-add-slot">
                  <label>Quick Add Time Slot</label>
                  <select onChange={(e) => addTimeSlot(e.target.value)} value="">
                    <option value="">Select time to add...</option>
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="time-slots-grid">
                  {timeSlots.length === 0 ? (
                    <div className="empty-slots">
                      No time slots defined for this date. Add slots or enable recurring pattern.
                    </div>
                  ) : (
                    timeSlots.map((slot) => (
                      <div
                        key={slot.time}
                        className={`time-slot ${slot.available ? "available" : "unavailable"} ${
                          slot.booked ? "booked" : ""
                        }`}
                      >
                        <span className="slot-time">{slot.time}</span>
                        {slot.booked ? (
                          <span className="booked-badge">Booked</span>
                        ) : (
                          <>
                            <button
                              className="toggle-slot-btn"
                              onClick={() => toggleTimeSlot(slot.time)}
                            >
                              {slot.available ? "Disable" : "Enable"}
                            </button>
                            <button
                              className="remove-slot-btn"
                              onClick={() => removeTimeSlot(slot.time)}
                            >
                              ×
                            </button>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <button className="save-availability-btn" onClick={saveAvailability}>
                  Save Availability for {selectedDate}
                </button>
              </>
            )}
          </div>

          <div className="quick-view-section">
            <h3>Next 7 Days Overview</h3>
            <div className="days-overview">
              {getNext7Days().map((date) => {
                const daySlots = availableSlots.find((slot) => slot.date === date);
                const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "short" });
                return (
                  <div key={date} className="day-overview">
                    <div className="day-header">
                      <strong>{dayName}</strong>
                      <span>{date}</span>
                    </div>
                    <div className="slots-count">
                      {daySlots?.times?.length || 0} slots
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="block-date-content">
          <h3>Block Unavailable Dates</h3>
          <p className="section-description">
            Mark dates when you're not available for consultations
          </p>

          <div className="block-form">
            <div className="form-group">
              <label>Select Date to Block</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="form-group">
              <label>Reason (optional)</label>
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g., Personal leave, Conference"
              />
            </div>

            <button className="block-date-btn" onClick={blockDate}>
              Block Date
            </button>
          </div>

          <div className="blocked-dates-list">
            <h4>Blocked Dates</h4>
            {availableSlots
              .filter((slot) => slot.blocked)
              .map((slot) => (
                <div key={slot.date} className="blocked-date-item">
                  <span>{slot.date}</span>
                  <span className="block-reason">{slot.blockReason || "Unavailable"}</span>
                  <button onClick={() => {/* Unblock logic */}}>Unblock</button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAvailabilityManager;
