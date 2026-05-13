import React from "react";
import { InputField, SelectField } from "./FormControls";

function PackageBuilder({
  packageForm,
  completePackageItems,
  eventTypes,
  onChange,
  onToggleItem,
  onSubmit,
  submitting,
}) {
  return (
    <article className="local-services-panel">
      <h2>Complete Event Booking Package</h2>
      <form className="local-services-form" onSubmit={onSubmit}>
        <SelectField label="Event type">
          <select value={packageForm.eventType} onChange={(event) => onChange("eventType", event.target.value)}>
            {eventTypes.map((eventType) => (
              <option key={eventType} value={eventType}>
                {eventType}
              </option>
            ))}
          </select>
        </SelectField>
        <InputField label="Event date">
          <input type="date" value={packageForm.eventDate} onChange={(event) => onChange("eventDate", event.target.value)} />
        </InputField>
        <InputField label="Budget">
          <input type="number" value={packageForm.budget} onChange={(event) => onChange("budget", event.target.value)} />
        </InputField>
        <InputField label="Contact phone">
          <input
            type="text"
            value={packageForm.customerPhone}
            onChange={(event) => onChange("customerPhone", event.target.value)}
          />
        </InputField>
        <div className="local-services-checkbox-grid">
          {completePackageItems.map((item) => (
            <label key={item} className="local-services-checkbox">
              <input
                type="checkbox"
                checked={packageForm.items[item]}
                onChange={(event) => onToggleItem(item, event.target.checked)}
              />
              {item}
            </label>
          ))}
        </div>
        <button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Request Complete Package"}
        </button>
      </form>
    </article>
  );
}

export default PackageBuilder;
