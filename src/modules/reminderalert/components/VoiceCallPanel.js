import React, { useCallback } from 'react';

/**
 * VoiceCallPanel component - displays voice call status and controls
 * Shows current call status and allows triggering manual calls
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.reminder - Reminder object with voice call info
 * @param {string} props.reminder.recipientPhoneNumber - Phone number for voice call
 * @param {string} props.reminder.callStatus - Current call status
 * @param {string} props.reminder.lastCallTime - Last time call was triggered
 * @param {string} props.reminder.nextCallTime - Scheduled next call time
 * @param {number} props.reminder.callAttempts - Number of call attempts
 * @param {number} props.reminder.maxCallAttempts - Max allowed call attempts
 * @param {boolean} props.loading - Loading indicator
 * @param {function} props.onTrigger - Trigger voice call handler
 * 
 * @example
 * <VoiceCallPanel
 *   reminder={reminder}
 *   loading={isLoading}
 *   onTrigger={handleTrigger}
 * />
 */
const VoiceCallPanel = React.memo(({
  reminder = {},
  loading = false,
  onTrigger = () => {},
}) => {
  const {
    recipientPhoneNumber = '',
    callStatus = 'pending',
    lastCallTime = null,
    nextCallTime = null,
    callAttempts = 0,
    maxCallAttempts = 3,
  } = reminder;

  const handleTrigger = useCallback(() => {
    onTrigger(reminder._id);
  }, [reminder._id, onTrigger]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'ringing':
        return '#3b82f6';
      case 'answered':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'ringing':
        return 'Ringing';
      case 'answered':
        return 'Answered';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const canTriggerCall = callAttempts < maxCallAttempts && !loading;

  return (
    <div className="reminderalert-voice-call-panel">
      <div className="reminderalert-voice-call-header">
        <h4>Voice Call Status</h4>
        <span
          className="reminderalert-voice-call-status"
          style={{ color: getStatusColor(callStatus) }}
          aria-label={`Call status: ${getStatusLabel(callStatus)}`}
        >
          ● {getStatusLabel(callStatus)}
        </span>
      </div>

      <div className="reminderalert-voice-call-info">
        <p>
          <strong>Phone:</strong> {recipientPhoneNumber || 'Not set'}
        </p>
        <p>
          <strong>Attempts:</strong> {callAttempts}/{maxCallAttempts}
        </p>
        {lastCallTime && (
          <p>
            <strong>Last Call:</strong> {new Date(lastCallTime).toLocaleString()}
          </p>
        )}
        {nextCallTime && (
          <p>
            <strong>Next Scheduled:</strong> {new Date(nextCallTime).toLocaleString()}
          </p>
        )}
      </div>

      {canTriggerCall ? (
        <button
          type="button"
          className="reminderalert-add-btn reminderalert-voice-call-btn"
          onClick={handleTrigger}
          disabled={loading}
          aria-label={`Trigger voice call to ${recipientPhoneNumber}`}
        >
          {loading ? '📞 Triggering...' : '📞 Trigger Call'}
        </button>
      ) : (
        <div className="reminderalert-alert reminderalert-alert-warning">
          <p>Maximum call attempts reached. No more calls will be triggered.</p>
        </div>
      )}
    </div>
  );
});

VoiceCallPanel.displayName = 'VoiceCallPanel';

export default VoiceCallPanel;
