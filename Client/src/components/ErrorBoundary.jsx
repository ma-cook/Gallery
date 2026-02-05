import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onCatch) {
      this.props.onCatch(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // If a fallback prop is provided, render it
      if (this.props.fallback) {
        return this.props.fallback;
      }
      // Default fallback UI
      return (
        <div style={{ color: 'red', padding: '10px', border: '1px solid red' }}>
          <p>Something went wrong while rendering this part.</p>
          {this.state.error && <p>{this.state.error.toString()}</p>}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
