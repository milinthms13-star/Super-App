import React, { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getEntityId } from './utils';

const MODE_OPTIONS = [
  { value: 'none', label: 'No Access' },
  { value: 'temporary', label: 'Temporary (until date/time)' },
  { value: 'permanent', label: 'Permanent' },
  { value: 'time_restricted', label: 'Permanent with Time Restrictions' },
];

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDateTimeLocal = (value) => {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  const localDate = new Date(parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const normalizePermissionState = (permission = {}) => {
  const mode = permission.mode || 'none';
  const timeRestrictions = permission.timeRestrictions || {};

  return {
    mode,
    expiresAt: formatDateTimeLocal(permission.expiresAt),
    startTime: timeRestrictions.startTime || '00:00',
    endTime: timeRestrictions.endTime || '23:59',
    timezone: timeRestrictions.timezone || 'Asia/Kolkata',
    daysOfWeek: Array.isArray(timeRestrictions.daysOfWeek)
      ? timeRestrictions.daysOfWeek
      : [0, 1, 2, 3, 4, 5, 6],
    note: permission.note || '',
  };
};

const sanitizeDays = (days = []) => {
  const normalizedDays = days
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  return normalizedDays.length > 0 ? normalizedDays : [0, 1, 2, 3, 4, 5, 6];
};

const FamilyAccessManager = ({ contact, onClose, onUpdated }) => {
  const { apiCall } = useApp();
  const contactId = useMemo(() => getEntityId(contact?.contactUserId || contact), [contact]);
  const [cameraPermission, setCameraPermission] = useState(() =>
    normalizePermissionState(contact?.familyAccess?.camera)
  );
  const [locationPermission, setLocationPermission] = useState(() =>
    normalizePermissionState(contact?.familyAccess?.location)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const contactName =
    contact?.displayName || contact?.contactUserId?.name || contact?.contactUserId?.username || 'Contact';

  const toggleDay = (permissionType, dayIndex) => {
    const setPermission = permissionType === 'camera' ? setCameraPermission : setLocationPermission;
    setPermission((currentPermission) => {
      const dayExists = currentPermission.daysOfWeek.includes(dayIndex);
      const nextDays = dayExists
        ? currentPermission.daysOfWeek.filter((day) => day !== dayIndex)
        : [...currentPermission.daysOfWeek, dayIndex];

      return {
        ...currentPermission,
        daysOfWeek: sanitizeDays(nextDays),
      };
    });
  };

  const updatePermissionField = (permissionType, field, value) => {
    const setPermission = permissionType === 'camera' ? setCameraPermission : setLocationPermission;
    setPermission((currentPermission) => ({
      ...currentPermission,
      [field]: value,
    }));
  };

  const buildPermissionPayload = (permission) => {
    const payload = {
      mode: permission.mode,
      note: permission.note?.trim() || '',
    };

    if (permission.mode === 'temporary') {
      payload.expiresAt = permission.expiresAt ? new Date(permission.expiresAt).toISOString() : '';
    }

    if (permission.mode === 'time_restricted') {
      payload.timeRestrictions = {
        startTime: permission.startTime || '00:00',
        endTime: permission.endTime || '23:59',
        timezone: permission.timezone || 'Asia/Kolkata',
        daysOfWeek: sanitizeDays(permission.daysOfWeek),
      };
    }

    return payload;
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!contactId) {
      setError('Invalid contact selected.');
      return;
    }

    if (cameraPermission.mode === 'temporary' && !cameraPermission.expiresAt) {
      setError('Camera temporary mode needs an expiry date/time.');
      return;
    }

    if (locationPermission.mode === 'temporary' && !locationPermission.expiresAt) {
      setError('Location temporary mode needs an expiry date/time.');
      return;
    }

    try {
      setSaving(true);
      const response = await apiCall(`/messaging/contacts/${contactId}/family-access`, 'PUT', {
        camera: buildPermissionPayload(cameraPermission),
        location: buildPermissionPayload(locationPermission),
      });

      if (response?.contact) {
        setSuccess('Family access settings saved.');
        if (onUpdated) {
          onUpdated();
        }
      }
    } catch (requestError) {
      setError(requestError?.message || 'Could not save family access settings.');
    } finally {
      setSaving(false);
    }
  };

  const renderPermissionEditor = (permissionType, permission) => (
    <section className="family-access-section">
      <h4>{permissionType === 'camera' ? 'Camera Access' : 'Location Access'}</h4>
      <div className="family-access-grid">
        <label className="family-access-field">
          <span>Access mode</span>
          <select
            value={permission.mode}
            onChange={(event) => updatePermissionField(permissionType, 'mode', event.target.value)}
            disabled={saving}
          >
            {MODE_OPTIONS.map((modeOption) => (
              <option key={`${permissionType}-${modeOption.value}`} value={modeOption.value}>
                {modeOption.label}
              </option>
            ))}
          </select>
        </label>

        {permission.mode === 'temporary' && (
          <label className="family-access-field">
            <span>Valid until</span>
            <input
              type="datetime-local"
              value={permission.expiresAt}
              onChange={(event) => updatePermissionField(permissionType, 'expiresAt', event.target.value)}
              disabled={saving}
            />
          </label>
        )}

        {permission.mode === 'time_restricted' && (
          <>
            <label className="family-access-field">
              <span>From</span>
              <input
                type="time"
                value={permission.startTime}
                onChange={(event) => updatePermissionField(permissionType, 'startTime', event.target.value)}
                disabled={saving}
              />
            </label>
            <label className="family-access-field">
              <span>To</span>
              <input
                type="time"
                value={permission.endTime}
                onChange={(event) => updatePermissionField(permissionType, 'endTime', event.target.value)}
                disabled={saving}
              />
            </label>
            <label className="family-access-field family-access-field-full">
              <span>Timezone</span>
              <input
                type="text"
                value={permission.timezone}
                onChange={(event) => updatePermissionField(permissionType, 'timezone', event.target.value)}
                disabled={saving}
                placeholder="Asia/Kolkata"
              />
            </label>
            <div className="family-access-field family-access-field-full">
              <span>Active days</span>
              <div className="family-access-days">
                {WEEK_DAYS.map((dayLabel, dayIndex) => (
                  <button
                    key={`${permissionType}-${dayLabel}`}
                    type="button"
                    className={`family-access-day-chip ${
                      permission.daysOfWeek.includes(dayIndex) ? 'active' : ''
                    }`}
                    onClick={() => toggleDay(permissionType, dayIndex)}
                    disabled={saving}
                  >
                    {dayLabel}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <label className="family-access-field family-access-field-full">
          <span>Consent note (optional)</span>
          <input
            type="text"
            value={permission.note}
            onChange={(event) => updatePermissionField(permissionType, 'note', event.target.value)}
            disabled={saving}
            placeholder="Example: Allowed only during school commute."
            maxLength={160}
          />
        </label>
      </div>
    </section>
  );

  return (
    <div className="scheduled-block-manager family-access-manager">
      <div className="block-manager-header">
        <h3>Family Access for {contactName}</h3>
        <button className="btn-close" onClick={onClose} type="button">
          ×
        </button>
      </div>

      <form className="block-manager-content" onSubmit={handleSave}>
        {error ? <div className="error-message">{error}</div> : null}
        {success ? <div className="success-message">{success}</div> : null}

        {renderPermissionEditor('camera', cameraPermission)}
        {renderPermissionEditor('location', locationPermission)}

        <div className="family-access-actions">
          <button type="submit" className="btn-add-block" disabled={saving}>
            {saving ? 'Saving...' : 'Save Family Permissions'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FamilyAccessManager;
