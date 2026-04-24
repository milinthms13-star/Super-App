import React from 'react';

/**
 * FormField component with integrated validation feedback
 * 
 * @component
 * @param {Object} props
 * @param {string} props.label - Field label text
 * @param {string} props.name - Field name and ID
 * @param {string} props.type - Input type (text, email, textarea, etc.)
 * @param {string} props.value - Current field value
 * @param {function} props.onChange - Change handler
 * @param {string} [props.error] - Error message to display
 * @param {string} [props.placeholder] - Placeholder text
 * @param {boolean} [props.required] - Mark as required field
 * @param {boolean} [props.disabled] - Disable the field
 * @param {string} [props.description] - Helper text below field
 * @param {number} [props.rows] - For textarea only
 * 
 * @example
 * <FormField
 *   label="Reminder Title"
 *   name="title"
 *   type="text"
 *   value={formData.title}
 *   onChange={handleChange}
 *   error={errors.title}
 *   required
 *   placeholder="Enter reminder title"
 * />
 */
const FormField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  description,
  rows = 4
}) => {
  const hasError = !!error;
  const fieldId = `field-${name}`;
  const errorId = `error-${name}`;

  return (
    <div className="form-field">
      <label htmlFor={fieldId} className="form-field-label">
        {label}
        {required && <span className="field-required" aria-label="required">*</span>}
      </label>

      {type === 'textarea' ? (
        <textarea
          id={fieldId}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={`form-field-input ${hasError ? 'form-field-error' : ''}`}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : description ? `desc-${name}` : undefined}
        />
      ) : (
        <input
          id={fieldId}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`form-field-input ${hasError ? 'form-field-error' : ''}`}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : description ? `desc-${name}` : undefined}
        />
      )}

      {hasError && (
        <span id={errorId} className="form-field-error-text">
          ❌ {error}
        </span>
      )}

      {!hasError && description && (
        <span id={`desc-${name}`} className="form-field-description">
          {description}
        </span>
      )}
    </div>
  );
};

export default FormField;
