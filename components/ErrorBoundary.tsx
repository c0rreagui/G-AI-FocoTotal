import React, { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // FIX: Reverted to a constructor-based state initialization. The class field
  // syntax was causing `this.props` to be incorrectly typed, making `this.props.children`
  // inaccessible. The constructor ensures `super(props)` is called, which correctly
  // sets up the component's props.
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

  // Explicitly defining the render method's return type helps the TypeScript compiler.
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