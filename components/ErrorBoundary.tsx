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

  // FIX: Added an explicit constructor. Some build tools may fail to correctly resolve
  // inherited properties like `props` on class components that don't have one,
  // leading to incorrect "property does not exist" type errors.
  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

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
