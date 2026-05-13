import React from "react";

export function InputField({ label, error, children }) {
  return (
    <label className={`local-services-field ${error ? "has-error" : ""}`}>
      <span>{label}</span>
      {children}
      {error ? <small className="local-services-field-error">{error}</small> : null}
    </label>
  );
}

export function SelectField({ label, error, children }) {
  return (
    <label className={`local-services-field ${error ? "has-error" : ""}`}>
      <span>{label}</span>
      {children}
      {error ? <small className="local-services-field-error">{error}</small> : null}
    </label>
  );
}

export function TextareaField({ label, error, children }) {
  return (
    <label className={`local-services-field ${error ? "has-error" : ""}`}>
      <span>{label}</span>
      {children}
      {error ? <small className="local-services-field-error">{error}</small> : null}
    </label>
  );
}

export function StatusToast({ tone = "info", message = "" }) {
  if (!message) {
    return null;
  }
  return <p className={`local-services-toast local-services-toast-${tone}`}>{message}</p>;
}

