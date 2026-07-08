import React, { useState } from "react";
import { ROUTINE_TIME_LABELS, ROUTINE_TIMES } from "../data/beautyaiConstants";
import "../NilaBeautyAI.css";

/**
 * BeautyRoutineCalendar Component
 * Calendar view for tracking beauty routine adherence
 */

const BeautyRoutineCalendar = ({
  plan,
  progressLogs = [],
  onDayClick,
  startDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    return { daysInMonth, startDayOfWeek, year, month };
  };

  const getProgressForDate = (date) => {
    const dateString = date.toISOString().split("T")[0];
    return progressLogs.find((log) => {
      const logDate = new Date(log.createdAt).toISOString().split("T")[0];
      return logDate === dateString;
    });
  };

  const isPlanActive = (date) => {
    if (!startDate) return false;
    const start = new Date(startDate);
    const planEndDate = new Date(start);
    planEndDate.setDate(start.getDate() + 7); // 7-day plan
    return date >= start && date <= planEndDate;
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDayClick = (date) => {
    setSelectedDay(date);
    if (onDayClick) {
      onDayClick(date);
    }
  };

  const { daysInMonth, startDayOfWeek, year, month } = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calendarDays = [];
  
  // Empty cells for days before month starts
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day));
  }

  return (
    <div className="beauty-routine-calendar">
      <div className="calendar-header">
        <h3>📅 Routine Calendar</h3>
        <p className="calendar-subtitle">Track your beauty routine adherence</p>
      </div>

      <div className="calendar-controls">
        <button
          type="button"
          className="nav-btn prev"
          onClick={handlePreviousMonth}
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="current-month">{monthName}</div>
        <button
          type="button"
          className="nav-btn next"
          onClick={handleNextMonth}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="calendar-grid">
        {/* Day headers */}
        {daysOfWeek.map((day) => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="calendar-day empty" />;
          }

          const progress = getProgressForDate(date);
          const isActive = isPlanActive(date);
          const isToday = date.getTime() === today.getTime();
          const isPast = date < today;
          const isFuture = date > today;
          const isSelected = selectedDay && date.getTime() === selectedDay.getTime();

          let dayClass = "calendar-day";
          if (isToday) dayClass += " today";
          if (isPast) dayClass += " past";
          if (isFuture) dayClass += " future";
          if (isActive) dayClass += " active";
          if (isSelected) dayClass += " selected";
          if (progress?.done) dayClass += " completed";

          return (
            <div
              key={date.toISOString()}
              className={dayClass}
              onClick={() => handleDayClick(date)}
            >
              <div className="day-number">{date.getDate()}</div>
              {progress && (
                <div className="day-status">
                  {progress.done ? (
                    <span className="status-icon completed">✓</span>
                  ) : (
                    <span className="status-icon pending">○</span>
                  )}
                </div>
              )}
              {progress?.skinScore && (
                <div className="day-score">{progress.skinScore}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Day Details */}
      {selectedDay && (
        <div className="selected-day-details">
          <h4>
            {selectedDay.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h4>
          
          {(() => {
            const progress = getProgressForDate(selectedDay);
            if (!progress) {
              return <p>No routine logged for this day.</p>;
            }

            return (
              <div className="progress-details">
                <div className="progress-status">
                  <span className="label">Status:</span>
                  <span className={`value ${progress.done ? "completed" : "pending"}`}>
                    {progress.done ? "Completed ✓" : "Pending"}
                  </span>
                </div>

                {progress.skinScore && (
                  <div className="progress-score">
                    <span className="label">Skin Score:</span>
                    <span className="value">{progress.skinScore}/100</span>
                  </div>
                )}

                {progress.note && (
                  <div className="progress-note">
                    <span className="label">Note:</span>
                    <p className="value">{progress.note}</p>
                  </div>
                )}
              </div>
            );
          })()}

          {plan && (
            <div className="day-routine">
              <h5>Today's Routine</h5>
              {Object.entries(plan.plan || {}).map(([timeKey, items]) => {
                if (!items || items.length === 0) return null;
                return (
                  <div key={timeKey} className="routine-section">
                    <h6>{ROUTINE_TIME_LABELS[timeKey] || timeKey}</h6>
                    <ul>
                      {items.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="calendar-legend">
        <h5>Legend</h5>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-icon today" />
            <span className="legend-label">Today</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon completed" />
            <span className="legend-label">Completed</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon active" />
            <span className="legend-label">Active Plan</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon past" />
            <span className="legend-label">Past</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeautyRoutineCalendar;
