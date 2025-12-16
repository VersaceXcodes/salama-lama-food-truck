import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackRoute?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    // In production, you could send this to an error reporting service
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const fallbackRoute = this.props.fallbackRoute || '/menu';
      const fallbackMessage = this.props.fallbackMessage || 
        'Something went wrong while loading this page. Please try again or return to the menu.';

      return (
        <div className="min-h-screen bg-[#F2EFE9] pb-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-[#2C1A16] mb-4">
                Oops! Something Went Wrong
              </h2>
              <p className="text-[#6B5B4F] mb-6">
                {fallbackMessage}
              </p>
              
              {/* Show error details in development only */}
              {import.meta.env.DEV && this.state.error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                  <p className="text-sm font-mono text-red-800 break-all">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={this.handleReset}
                  className="inline-flex items-center justify-center bg-[#D4831D] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#C07519] transition-colors"
                >
                  <RefreshCcw className="h-5 w-5 mr-2" />
                  Try Again
                </button>
                <Link
                  to={fallbackRoute}
                  className="inline-flex items-center justify-center bg-white border-2 border-[#D4C5B9] text-[#2C1A16] px-6 py-3 rounded-lg font-semibold hover:bg-[#F2EFE9] transition-colors"
                >
                  <Home className="h-5 w-5 mr-2" />
                  Back to Menu
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
