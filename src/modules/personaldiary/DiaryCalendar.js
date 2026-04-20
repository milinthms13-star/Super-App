import React from "react";

const DiaryCalendar = ({ entries, onDateClick }) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEntriesForDate = (day) => {
    return entries.filter((entry) => {
      const entryDate = new Date(entry.createdAt);
      return (
        entryDate.getDate() === day &&
        entryDate.getMonth() === currentDate.getMonth() &&
        entryDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Days of month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthName = currentDate.toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="diary-calendar-section">
      <div className="diary-calendar-header">
        <button
          onClick={() =>
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
          }
        >
          ←
        </button>
        <h3>{monthName}</h3>
        <button
          onClick={() =>
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
          }
        >
          →
        </button>
      </div>

      <div className="diary-calendar-grid">
        <div className="diary-cal-weekday">Sun</div>
        <div className="diary-cal-weekday">Mon</div>
        <div className="diary-cal-weekday">Tue</div>
        <div className="diary-cal-weekday">Wed</div>
        <div className="diary-cal-weekday">Thu</div>
        <div className="diary-cal-weekday">Fri</div>
        <div className="diary-cal-weekday">Sat</div>

        {days.map((day, idx) => {
          const dayEntries = day ? getEntriesForDate(day) : [];
          return (
            <div
              key={idx}
              className={`diary-cal-day ${!day ? "empty" : ""} ${
                dayEntries.length > 0 ? "has-entries" : ""
              }`}
              onClick={() => day && onDateClick(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
            >
              {day && (
                <>
                  <span className="diary-cal-day-num">{day}</span>
                  {dayEntries.length > 0 && (
                    <div className="diary-cal-dots">
                      {dayEntries.slice(0, 2).map((_, i) => (
                        <div key={i} className="diary-cal-dot"></div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DiaryCalendar;
