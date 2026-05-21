// ErrorBoundary.js - Error boundary for consistent error handling
import React from 'react';
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    // Placeholder telemetry bridge for production integrations (Sentry/Datadog/etc.).
    // eslint-disable-next-line no-console
    console.error("[freelancer][ui-error]", error, info);
  }
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}
export default ErrorBoundary;
