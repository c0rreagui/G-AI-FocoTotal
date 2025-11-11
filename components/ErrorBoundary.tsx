import React, { Component, ErrorInfo, ReactNode } from 'react';

// FIX: Renamed 'Props' to 'ErrorBoundaryProps' to avoid potential global namespace conflicts
// that may have caused the 'props' property to be unrecognized on the component type.
interface ErrorBoundaryProps {
  children: ReactNode;
}

// FIX: Renamed 'State' to 'ErrorBoundaryState' to avoid potential global namespace conflicts.
interface ErrorBoundaryState {
  hasError: boolean;
}

// FIX: Explicitly use React.Component to avoid potential import conflicts for the base class, ensuring 'props' is correctly inherited.
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // FIX: Replaced public class field for state initialization with a constructor.
  // This explicitly calls `super(props)` and sets the initial state, which can resolve
  // issues where TypeScript might fail to correctly infer the `props` property on the instance.
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="login-container">
            <div className="login-card">
                <h1>Ocorreu um erro</h1>
                <p>Algo deu errado. Por favor, recarregue a página e tente novamente.</p>
                <button className="btn btn-primary" onClick={() => window.location.reload()}>Recarregar</button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
