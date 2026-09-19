import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { ThemeProvider, RTLProvider } from '@manaratak/ui';
import { AppRouter } from './router';
import { I18nProvider } from './i18n/I18nProvider';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App runtime error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#FAF7F0] dark:bg-[#0E1F44] text-[#142B5F] dark:text-[#F2CD78] font-['Cairo',sans-serif] text-center">
          <div className="max-w-md p-6 bg-white dark:bg-[#142B5F] rounded-2xl shadow-lg border border-[var(--mn-border)] space-y-4">
            <h2 className="text-lg font-bold">حدث خطأ أثناء تحميل الصفحة</h2>
            <p className="text-xs text-[var(--mn-text-muted)] leading-relaxed">
              يرجى إعادة تحميل الصفحة لاستئناف التصفح بشكل سليم.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 bg-[#0E7C86] hover:bg-[#0c6b74] text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              إعادة التحميل
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <ThemeProvider defaultTheme="system">
          <RTLProvider>
            <AppRouter />
          </RTLProvider>
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

export default App;
