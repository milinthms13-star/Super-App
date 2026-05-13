import React, { useState } from "react";
import { InputField, SelectField, TextareaField } from "./FormControls";

function AdminModerationPanel({ onSubmit, loading }) {
  const [form, setForm] = useState({
    vendorId: "",
    approvalStatus: "approved",
    featured: false,
    commissionPercent: "12",
    moderationNote: "",
  });

  return (
    <article className="local-services-panel">
      <h2>Admin Moderation</h2>
      <div className="local-services-form">
        <InputField label="Vendor ID">
          <input
            type="text"
            value={form.vendorId}
            onChange={(event) => setForm((current) => ({ ...current, vendorId: event.target.value }))}
          />
        </InputField>
        <SelectField label="Approval status">
          <select
            value={form.approvalStatus}
            onChange={(event) => setForm((current) => ({ ...current, approvalStatus: event.target.value }))}
          >
            <option value="approved">Approve</option>
            <option value="rejected">Reject</option>
            <option value="pending">Pending</option>
          </select>
        </SelectField>
        <InputField label="Commission percent">
          <input
            type="number"
            value={form.commissionPercent}
            onChange={(event) => setForm((current) => ({ ...current, commissionPercent: event.target.value }))}
          />
        </InputField>
        <label className="local-services-checkbox">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))}
          />
          Featured listing enabled
        </label>
        <TextareaField label="Moderation note">
          <textarea
            rows={2}
            value={form.moderationNote}
            onChange={(event) => setForm((current) => ({ ...current, moderationNote: event.target.value }))}
          />
        </TextareaField>
        <button
          type="button"
          onClick={() => onSubmit(form)}
          disabled={loading}
        >
          {loading ? "Saving..." : "Apply Moderation"}
        </button>
      </div>
    </article>
  );
}

export default AdminModerationPanel;
