import React from "react";

const ApplyLeadTab = ({
  form,
  onChange,
  onSubmit,
  state,
  documents,
  onDocumentUpload,
  documentFields,
  categories,
  districts,
  institutions,
  onInstitutionSelect,
}) => (
  <section className="finance-section">
    <div className="finance-section-header">
      <h2>Apply for Assistance</h2>
      <p>Real document upload + consent capture + backend lead creation.</p>
    </div>

    <form className="finance-form" onSubmit={onSubmit}>
      <label>
        Full Name
        <input type="text" value={form.fullName} onChange={(event) => onChange((current) => ({ ...current, fullName: event.target.value }))} />
      </label>
      <label>
        Phone (10 digits)
        <input type="tel" value={form.phone} onChange={(event) => onChange((current) => ({ ...current, phone: event.target.value }))} />
      </label>
      <label>
        Loan Category
        <select value={form.loanCategory} onChange={(event) => onChange((current) => ({ ...current, loanCategory: event.target.value }))}>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>{item.title}</option>
          ))}
        </select>
      </label>
      <label>
        Required Amount (INR)
        <input type="number" value={form.amount} onChange={(event) => onChange((current) => ({ ...current, amount: event.target.value }))} />
      </label>
      <label>
        Preferred Interest (%)
        <input type="number" step="0.01" value={form.preferredInterestRate} onChange={(event) => onChange((current) => ({ ...current, preferredInterestRate: event.target.value }))} />
      </label>
      <label>
        Preferred Tenure (months)
        <input type="number" value={form.preferredTenureMonths} onChange={(event) => onChange((current) => ({ ...current, preferredTenureMonths: event.target.value }))} />
      </label>
      <label>
        District
        <select value={form.district} onChange={(event) => onChange((current) => ({ ...current, district: event.target.value }))}>
          {districts.map((district) => (
            <option key={district} value={district}>{district}</option>
          ))}
        </select>
      </label>
      <label>
        Preferred Institution
        <select
          value={form.institutionId}
          onChange={(event) => {
            onChange((current) => ({ ...current, institutionId: event.target.value }));
            onInstitutionSelect?.(event.target.value);
          }}
        >
          <option value="">Auto-match institution</option>
          {institutions.map((institution) => (
            <option key={institution._id} value={institution._id}>{institution.name}</option>
          ))}
        </select>
      </label>
      <label>
        Preferred Callback
        <select value={form.callbackWindow} onChange={(event) => onChange((current) => ({ ...current, callbackWindow: event.target.value }))}>
          <option value="today-evening">Today evening</option>
          <option value="tomorrow-morning">Tomorrow morning</option>
          <option value="tomorrow-evening">Tomorrow evening</option>
        </select>
      </label>
      <label>
        Document Notes
        <textarea
          rows={3}
          value={form.documentNotes}
          onChange={(event) => onChange((current) => ({ ...current, documentNotes: event.target.value }))}
          placeholder="Add context for documents or missing files."
        />
      </label>

      {documentFields.map((docField) => (
        <label key={docField.key}>
          {docField.label}
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(event) => onDocumentUpload(docField.key, Array.from(event.target.files || []))}
          />
          {(documents[docField.key] || []).length > 0 ? (
            <span className="finance-muted">{documents[docField.key].length} file(s) selected</span>
          ) : null}
        </label>
      ))}

      <label className="finance-consent">
        <input type="checkbox" checked={form.whatsappOptIn} onChange={(event) => onChange((current) => ({ ...current, whatsappOptIn: event.target.checked }))} />
        Enable WhatsApp callback integration
      </label>
      <label className="finance-consent">
        <input type="checkbox" checked={form.consentPrivacy} onChange={(event) => onChange((current) => ({ ...current, consentPrivacy: event.target.checked }))} />
        I consent to data processing as per privacy policy.
      </label>
      <label className="finance-consent">
        <input type="checkbox" checked={form.consentKyc} onChange={(event) => onChange((current) => ({ ...current, consentKyc: event.target.checked }))} />
        I consent to secure KYC document storage and verification workflow.
      </label>
      <label className="finance-consent">
        <input type="checkbox" checked={form.consentDisclaimer} onChange={(event) => onChange((current) => ({ ...current, consentDisclaimer: event.target.checked }))} />
        I understand that approval is not guaranteed and is decided by lender underwriting.
      </label>

      <button type="submit" disabled={state.loading}>{state.loading ? "Submitting..." : "Submit Loan Enquiry"}</button>
    </form>

    {state.error ? <p className="finance-error">{state.error}</p> : null}
    {state.success ? (
      <p className="finance-status">
        {state.success} {state.consentAt ? `Consent timestamp: ${state.consentAt}` : ""}
      </p>
    ) : null}

    <div className="finance-compliance-banner">
      <strong>Compliance and Trust:</strong> We operate as an assistance and facilitation platform.
      Loan approval is solely lender-dependent. <a href="/PRIVACY_POLICY.html">Privacy Policy</a> |
      RBI/NBFC/bank disclaimer applies.
    </div>
  </section>
);

export default ApplyLeadTab;
