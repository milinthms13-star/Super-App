import React from 'react';

const ErrorAlert = ({ error, onDismiss, onRetry }) => {
  if (!error) return null;

  const getErrorIcon = (type) => {
    switch (type) {
      case 'NETWORK':
        return '📡';
      case 'AUTH':
        return '🔐';
      case 'VALIDATION':
        return '⚠️';
      case 'SERVER':
        return '⚠️';
      default:
        return '❌';
    }
  };

  return (
    <div className="error-alert" role="alert" aria-live="assertive">
      <div className="error-content">
        <span className="error-icon">{getErrorIcon(error.type)}</span>
        <div className="error-text">
          <p className="error-message">{error.message}</p>
          {error.type === 'VALIDATION' && (
            <p className="error-hint">Please check your reminder details</p>
          )}
        </div>
      </div>
      <div className="error-actions">
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-retry"
            aria-label="Retry loading reminders"
          >
            Retry
          </button>
        )}
        <button
          onClick={onDismiss}
          className="btn-close"
          aria-label="Dismiss error"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default ErrorAlert;
