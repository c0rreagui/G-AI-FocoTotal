import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  // FIX: Simplified state initialization using a class field.
  // The previous combination of declaring `state` and initializing it in the constructor was causing a TypeScript type inference issue, making `this.props` unavailable.
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
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
