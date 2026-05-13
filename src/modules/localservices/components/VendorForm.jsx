import React from "react";
import { InputField, SelectField } from "./FormControls";

function VendorForm({
  vendorForm,
  categories,
  cities,
  fieldErrors,
  onChange,
  onSubmit,
  submitting,
}) {
  return (
    <article className="local-services-panel">
      <h2>Vendor Onboarding</h2>
      <form className="local-services-form" onSubmit={onSubmit}>
        <InputField label="Business name" error={fieldErrors.businessName}>
          <input
            type="text"
            value={vendorForm.businessName}
            onChange={(event) => onChange("businessName", event.target.value)}
          />
        </InputField>

        <SelectField label="Category" error={fieldErrors.category}>
          <select value={vendorForm.category} onChange={(event) => onChange("category", event.target.value)}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </SelectField>

        <SelectField label="City" error={fieldErrors.city}>
          <select value={vendorForm.city} onChange={(event) => onChange("city", event.target.value)}>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </SelectField>

        <div className="local-services-row">
          <InputField label="Phone number" error={fieldErrors.phone}>
            <input type="text" value={vendorForm.phone} onChange={(event) => onChange("phone", event.target.value)} />
          </InputField>
          <InputField label="WhatsApp number" error={fieldErrors.whatsappNumber}>
            <input
              type="text"
              value={vendorForm.whatsappNumber}
              onChange={(event) => onChange("whatsappNumber", event.target.value)}
            />
          </InputField>
        </div>

        <InputField label="Service package" error={fieldErrors.packageName}>
          <input
            type="text"
            value={vendorForm.packageName}
            onChange={(event) => onChange("packageName", event.target.value)}
          />
        </InputField>

        <div className="local-services-row">
          <InputField label="Package price" error={fieldErrors.packagePrice}>
            <input
              type="number"
              value={vendorForm.packagePrice}
              onChange={(event) => onChange("packagePrice", event.target.value)}
            />
          </InputField>
          <InputField label="Portfolio count" error={fieldErrors.portfolioItems}>
            <input
              type="number"
              value={vendorForm.portfolioItems}
              onChange={(event) => onChange("portfolioItems", event.target.value)}
            />
          </InputField>
        </div>

        <label className="local-services-checkbox">
          <input
            type="checkbox"
            checked={vendorForm.verificationDone}
            onChange={(event) => onChange("verificationDone", event.target.checked)}
          />
          Profile verification completed
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Vendor Profile"}
        </button>
      </form>
    </article>
  );
}

export default VendorForm;
