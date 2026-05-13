import React from "react";

function RequestHistory({ entries, loading, formatInr }) {
  return (
    <section className="local-services-section">
      <h2>Request Tracking</h2>
      {loading ? <p className="local-services-empty-card">Loading request history...</p> : null}
      {!loading && entries.length === 0 ? (
        <p className="local-services-empty-card">No requests yet.</p>
      ) : null}
      {!loading && entries.length > 0 ? (
        <ul className="local-services-list local-services-history-list">
          {entries.map((item) => (
            <li key={item.id}>
              <strong>{item.id}</strong> | {item.type} | {item.target} | {item.status} |{" "}
              {new Date(item.createdAt).toLocaleString()} | Amount {formatInr(item.amount || 0)}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default RequestHistory;
