import React, { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // FIX: Switched to class field syntax for state initialization.
  // The constructor-based approach was not being correctly interpreted by the build tool,
  // leading to errors where `this.state` and `this.props` were considered non-existent.
  // Class field syntax is the modern standard and resolves these typing issues.
  state: ErrorBoundaryState = { hasError: false };

  // FIX: An explicit constructor was added to fix an issue where `props` was not being resolved.
  // However, this approach can be problematic and is not needed when using class field syntax for state.
  // Removing it to rely on the default constructor behavior, which should resolve the type error.

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render(): ReactNode {
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
