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
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

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