import React, { useState } from 'react';
import {
  REMINDER_TEMPLATES,
  buildQuickReminder,
  parseNaturalReminder,
} from '../reminderSmartUtils';

const QUICK_MINUTES = [10, 30, 60];

const ReminderQuickCreate = ({ submitting = false, onCreate, onApplyTemplate }) => {
  const [naturalText, setNaturalText] = useState('');
  const [errorText, setErrorText] = useState('');

  const handleNaturalCreate = async () => {
    const parsedPayload = parseNaturalReminder(naturalText);
    if (!parsedPayload) {
      setErrorText('Try: Remind me to pay electricity bill tomorrow at 10 am');
      return;
    }

    setErrorText('');
    await onCreate(parsedPayload);
    setNaturalText('');
  };

  return (
    <section className="reminderalert-quick-create" aria-label="Quick reminder creation">
      <div className="reminderalert-quick-create-header">
        <p className="reminderalert-eyebrow">Quick create</p>
        <h2>Create in one step</h2>
        <p>Use natural language, one-tap times, or ready templates.</p>
      </div>

      <div className="reminderalert-quick-create-row">
        <input
          type="text"
          value={naturalText}
          onChange={(event) => setNaturalText(event.target.value)}
          placeholder="Remind me to call doctor tomorrow at 9 am"
          disabled={submitting}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleNaturalCreate();
            }
          }}
        />
        <button type="button" className="reminderalert-add-btn" onClick={handleNaturalCreate} disabled={submitting}>
          Create
        </button>
      </div>

      {errorText && <p className="reminderalert-quick-error">{errorText}</p>}

      <div className="reminderalert-quick-time-grid">
        {QUICK_MINUTES.map((minutes) => (
          <button
            key={`quick-${minutes}`}
            type="button"
            className="reminderalert-filter-chip"
            onClick={() => onCreate(buildQuickReminder(minutes))}
            disabled={submitting}
          >
            In {minutes === 60 ? '1 hour' : `${minutes} min`}
          </button>
        ))}
      </div>

      <div className="reminderalert-template-grid">
        {REMINDER_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            className="reminderalert-template-btn"
            onClick={() => onApplyTemplate(template)}
            disabled={submitting}
          >
            {template.label}
          </button>
        ))}
      </div>
    </section>
  );
};

export default ReminderQuickCreate;
