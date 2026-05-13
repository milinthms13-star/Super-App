import React from "react";

const AdminPanel = ({ properties, leadBoard, queues }) => (
  <article className="realestate-operations-grid">
    <section className="realestate-surface-card">
      <div className="realestate-section-heading">
        <h2>Governance</h2>
        <p>Moderation queues with document verification and suspicious listing checks.</p>
      </div>
      <div className="realestate-plan-list">
        <div>
          <strong>Pending listings</strong>
          <span>{queues.pendingListings.length} listings pending verification</span>
        </div>
        <div>
          <strong>Reported listings</strong>
          <span>{queues.reportedListings.length} listings with open reports</span>
        </div>
        <div>
          <strong>Duplicate listings</strong>
          <span>{queues.duplicateListings.length} potential duplicates</span>
        </div>
        <div>
          <strong>Suspicious agents</strong>
          <span>{queues.suspiciousAgents.length} high-risk accounts</span>
        </div>
        <div>
          <strong>Document verification</strong>
          <span>{queues.documentVerification.length} require legal checks</span>
        </div>
        <div>
          <strong>Rejected listings</strong>
          <span>{queues.rejectedListings.length} moderation rejections</span>
        </div>
      </div>
    </section>

    <section className="realestate-surface-card">
      <div className="realestate-section-heading">
        <h2>Success metrics</h2>
        <p>Visibility into supply, lead momentum, and revenue-focused operations.</p>
      </div>
      <div className="realestate-plan-list">
        <div>
          <strong>Listings scale</strong>
          <span>{properties.length} live listings across sale, rent, and project supply</span>
        </div>
        <div>
          <strong>Lead conversion</strong>
          <span>{leadBoard.filter((lead) => lead.priority === "Hot").length} hot prospects in current pipeline</span>
        </div>
        <div>
          <strong>Recurring revenue</strong>
          <span>Premium plans from brokers, featured boosts, and project placements</span>
        </div>
      </div>
    </section>
  </article>
);

export default AdminPanel;

