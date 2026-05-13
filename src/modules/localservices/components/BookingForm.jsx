import React from "react";
import { InputField, SelectField, TextareaField } from "./FormControls";

function BookingForm({
  bookingForm,
  providers,
  eventTypes,
  fieldErrors,
  onChange,
  onSubmit,
  formatInr,
  loading,
}) {
  const selectedProvider = providers.find((provider) => provider.id === bookingForm.providerId);
  const budgetNumber = Number(bookingForm.budget || 0);
  const advanceAmount = bookingForm.paymentOption === "advance" ? Math.max(1000, Math.round(budgetNumber * 0.2)) : 0;
  const fullAmount = bookingForm.paymentOption === "full" ? budgetNumber : 0;

  return (
    <article className="local-services-panel">
      <h2>Booking Request</h2>
      <form className="local-services-form" onSubmit={onSubmit}>
        <SelectField label="Provider" error={fieldErrors.providerId}>
          <select value={bookingForm.providerId} onChange={(event) => onChange("providerId", event.target.value)}>
            <option value="">Select provider</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </SelectField>

        <SelectField label="Event type" error={fieldErrors.eventType}>
          <select value={bookingForm.eventType} onChange={(event) => onChange("eventType", event.target.value)}>
            {eventTypes.map((eventType) => (
              <option key={eventType} value={eventType}>
                {eventType}
              </option>
            ))}
          </select>
        </SelectField>

        <InputField label="Event date" error={fieldErrors.eventDate}>
          <input type="date" value={bookingForm.eventDate} onChange={(event) => onChange("eventDate", event.target.value)} />
        </InputField>

        <div className="local-services-row">
          <InputField label="Guest count" error={fieldErrors.guests}>
            <input type="number" value={bookingForm.guests} onChange={(event) => onChange("guests", event.target.value)} />
          </InputField>
          <InputField label="Budget" error={fieldErrors.budget}>
            <input type="number" value={bookingForm.budget} onChange={(event) => onChange("budget", event.target.value)} />
          </InputField>
        </div>

        <InputField label="Customer name" error={fieldErrors.customerName}>
          <input type="text" value={bookingForm.customerName} onChange={(event) => onChange("customerName", event.target.value)} />
        </InputField>

        <div className="local-services-row">
          <InputField label="Phone number" error={fieldErrors.customerPhone}>
            <input type="text" value={bookingForm.customerPhone} onChange={(event) => onChange("customerPhone", event.target.value)} />
          </InputField>
          <InputField label="Email (optional)" error={fieldErrors.customerEmail}>
            <input type="email" value={bookingForm.customerEmail} onChange={(event) => onChange("customerEmail", event.target.value)} />
          </InputField>
        </div>

        <TextareaField label="Notes">
          <textarea
            rows={2}
            value={bookingForm.notes}
            onChange={(event) => onChange("notes", event.target.value)}
            placeholder="Custom requirements"
          />
        </TextareaField>

        <SelectField label="Payment flow">
          <select value={bookingForm.paymentOption} onChange={(event) => onChange("paymentOption", event.target.value)}>
            <option value="advance">Advance payment</option>
            <option value="full">Full payment</option>
            <option value="quoteOnly">Quote only</option>
          </select>
        </SelectField>

        {selectedProvider ? (
          <div className="local-services-payment-card">
            <p>Provider range: {formatInr(selectedProvider.priceStart)} - {formatInr(selectedProvider.priceMax)}</p>
            {bookingForm.paymentOption === "advance" ? (
              <p>Advance to pay now: {formatInr(advanceAmount)}</p>
            ) : null}
            {bookingForm.paymentOption === "full" ? (
              <p>Full amount to pay now: {formatInr(fullAmount)}</p>
            ) : null}
            {bookingForm.paymentOption === "quoteOnly" ? (
              <p>Payment on hold until quote approval.</p>
            ) : null}
          </div>
        ) : null}

        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Send Booking Request"}
        </button>
      </form>
    </article>
  );
}

export default BookingForm;
