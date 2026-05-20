import React, { useState } from 'react';
import { buildQuickReminder, parseNaturalReminder, REMINDER_TEMPLATES } from '../reminderSmartUtils';

const QUICK_MINUTES = [10, 30, 60];

const ReminderQuickCreate = ({ onCreate, onApplyToForm, submitting = false }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const submitNatural = async () => {
    const reminder = parseNaturalReminder(text);
    if (!reminder) {
      setError('Type something like: Remind me to pay bill tomorrow at 10 am');
      return;
    }
    setError('');
    await onCreate(reminder);
    setText('');
  };

  return (
    <section className="reminderalert-quick-create" aria-label="Quick reminder creation">
      <div className="reminderalert-quick-header">
        <div>
          <p className="reminderalert-eyebrow">Smart reminder</p>
          <h2>Create reminder fast</h2>
          <p>Type naturally or use one-tap templates.</p>
        </div>
      </div>

      <div className="reminderalert-natural-row">
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Eg: Remind me to pay electricity bill tomorrow at 10 am"
          disabled={submitting}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submitNatural();
          }}
        />
        <button type="button" onClick={submitNatural} disabled={submitting}>
          Create
        </button>
      </div>
      {error && <p className="reminderalert-inline-error">{error}</p>}

      <div className="reminderalert-quick-buttons">
        {QUICK_MINUTES.map((minutes) => (
          <button
            key={minutes}
            type="button"
            disabled={submitting}
            onClick={() => onCreate(buildQuickReminder(minutes))}
          >
            ⏱️ {minutes === 60 ? '1 hour' : `${minutes} min`}
          </button>
        ))}
      </div>

      <div className="reminderalert-template-grid">
        {REMINDER_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            disabled={submitting}
            onClick={() => onApplyToForm(template)}
          >
            <span>{template.icon}</span>
            <strong>{template.label}</strong>
          </button>
        ))}
      </div>
    </section>
  );
};

export default ReminderQuickCreate;
