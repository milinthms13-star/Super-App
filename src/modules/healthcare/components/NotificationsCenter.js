import React from "react";

const formatDateTime = (value) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const NotificationsCenter = ({ notifications, loading, onMarkRead }) => {
  return (
    <section className="healthcare-section">
      <div className="healthcare-section-heading">
        <h2>Healthcare Notifications</h2>
        <p>Payment confirmations, booking updates, refill reminders, emergency and partner workflow alerts.</p>
      </div>

      <div className="healthcare-record-list-card">
        {loading ? <p>Loading notifications...</p> : null}
        {!loading && (notifications || []).length === 0 ? <p>No notifications available.</p> : null}

        {(notifications || []).map((notification) => (
          <article key={notification.id} className="healthcare-record-item">
            <div className="healthcare-record-meta">
              <strong>{notification.title}</strong>
              <span>{notification.message}</span>
              <span>{notification.notificationType}</span>
              <span>{formatDateTime(notification.createdAt)}</span>
              <span className={notification.readAt ? "healthcare-success-text" : "healthcare-warning-text"}>
                {notification.readAt ? `Read at ${formatDateTime(notification.readAt)}` : "Unread"}
              </span>
            </div>

            {!notification.readAt ? (
              <div className="healthcare-record-actions">
                <button type="button" className="healthcare-secondary-button" onClick={() => onMarkRead(notification.id)}>
                  Mark As Read
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
};

export default NotificationsCenter;
