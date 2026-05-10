import React from 'react';

/**
 * Error Boundary Component
 * Catches errors in child components and displays fallback UI
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Log error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      console.error('Error caught by boundary:', error, errorInfo);
      // Send to monitoring service (e.g., Sentry)
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      const shouldShowDetails = isDevelopment || this.state.errorCount > 2;

      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}>
          <h1 style={{ fontSize: '1.5rem', color: '#333', marginBottom: '1rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#666', marginBottom: '2rem', maxWidth: '500px' }}>
            We encountered an unexpected error. Please try refreshing the page or come back later.
          </p>

          {shouldShowDetails && (
            <details style={{
              textAlign: 'left',
              background: 'white',
              padding: '1rem',
              borderRadius: '8px',
              maxWidth: '600px',
              marginBottom: '2rem',
              border: '1px solid #ddd',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
                Error details (for development)
              </summary>
              <pre style={{
                marginTop: '1rem',
                overflow: 'auto',
                fontSize: '0.85rem',
                background: '#f9f9f9',
                padding: '1rem',
                borderRadius: '4px',
              }}>
                {this.state.error?.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <button
            onClick={this.resetError}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              background: '#FFD700',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              marginRight: '1rem',
            }}
          >
            Try Again
          </button>

          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Go Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Network Error Recovery Component
 */
export const NetworkErrorBoundary = ({ children, onRetry }) => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        marginBottom: '1rem',
      }}>
        <h2 style={{ fontSize: '1.1rem', color: '#856404', margin: 0 }}>
          📡 You're offline
        </h2>
        <p style={{ color: '#856404', margin: '0.5rem 0 0 0' }}>
          Please check your connection and try again
        </p>
      </div>
    );
  }

  return children;
};

/**
 * Timeout Error Boundary
 */
export const TimeoutBoundary = ({ children, timeout = 30000, onTimeout }) => {
  const [hasTimedOut, setHasTimedOut] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setHasTimedOut(true);
      onTimeout?.();
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout, onTimeout]);

  if (hasTimedOut) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        background: '#ffe6e6',
        border: '1px solid #ff6b6b',
        borderRadius: '8px',
        marginBottom: '1rem',
      }}>
        <h2 style={{ fontSize: '1.1rem', color: '#c92a2a', margin: 0 }}>
          ⏱️ Request timed out
        </h2>
        <p style={{ color: '#c92a2a', margin: '0.5rem 0 0 0' }}>
          The operation took too long. Please try again.
        </p>
        <button
          onClick={() => setHasTimedOut(false)}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            background: '#ff6b6b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return children;
};
