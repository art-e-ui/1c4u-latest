import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            An unexpected error occurred. We've been notified and are looking into it.
          </p>
          {this.state.error && (
            <pre className="bg-muted p-4 rounded-lg text-xs text-left mb-6 max-w-full overflow-auto border border-border">
              {this.state.error.toString()}
            </pre>
          )}
          <Button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
