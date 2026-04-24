import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useLazyLoad } from '../hooks/usePerformance';
import { getAriaLabel } from '../utils/a11y';

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
  lazyLoad = true,
  onLoadData = null,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelRef = useRef(null);

  // Use lazy loading for voice call data
  const { ref: lazyRef, isVisible } = useLazyLoad({
    onVisible: () => {
      if (lazyLoad && onLoadData) {
        onLoadData(reminder._id);
      }
    },
    threshold: 0.5,
  });

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

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

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
    <div 
      ref={lazyRef}
      className="reminderalert-voice-call-panel"
      role="region"
      aria-label="Voice call status and controls"
    >
      <button
        className="reminderalert-voice-call-header"
        onClick={handleToggleExpand}
        aria-expanded={isExpanded}
        aria-controls="voice-call-details"
      >
        <div className="reminderalert-voice-call-title">
          <h4>Voice Call Status</h4>
          <span
            className="reminderalert-voice-call-status"
            style={{ color: getStatusColor(callStatus) }}
            aria-label={`Call status: ${getStatusLabel(callStatus)}`}
            role="status"
          >
            ● {getStatusLabel(callStatus)}
          </span>
        </div>
        <span className="expand-icon" aria-hidden="true">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {isExpanded && isVisible && (
        <div id="voice-call-details" className="reminderalert-voice-call-info">
          <dl>
            <dt>Phone Number</dt>
            <dd>{recipientPhoneNumber || 'Not set'}</dd>
            
            <dt>Call Attempts</dt>
            <dd>
              <progress 
                value={callAttempts} 
                max={maxCallAttempts}
                aria-label={`Call attempts: ${callAttempts} of ${maxCallAttempts}`}
              />
              <span className="progress-label">{callAttempts}/{maxCallAttempts}</span>
            </dd>
            
            {lastCallTime && (
              <>
                <dt>Last Call</dt>
                <dd>{new Date(lastCallTime).toLocaleString()}</dd>
              </>
            )}
            
            {nextCallTime && (
              <>
                <dt>Next Scheduled</dt>
                <dd>{new Date(nextCallTime).toLocaleString()}</dd>
              </>
            )}
          </dl>

          {canTriggerCall ? (
            <button
          type="button"
          type="button"
          className="reminderalert-add-btn reminderalert-voice-call-btn"
          onClick={handleTrigger}
          disabled={loading}
          aria-label={getAriaLabel('call', `voice reminder to ${recipientPhoneNumber}`)}
          title="Manually trigger the voice call for this reminder"
        >
          {loading ? '📞 Triggering...' : '📞 Trigger Call'}
        </button>
            ) : (
              <div className="reminderalert-alert reminderalert-alert-warning" role="status">
                <p>Maximum call attempts reached. No more calls will be triggered.</p>
              </div>
            )}
        </div>
      )}
    </div>
  );
});

VoiceCallPanel.displayName = 'VoiceCallPanel';

export default VoiceCallPanel;
