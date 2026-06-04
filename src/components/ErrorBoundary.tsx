import { Component, type ErrorInfo, type ReactNode } from 'react';
import { trackOperationalEvent } from '../services/opsTelemetry';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui';
import clsx from 'clsx';

interface Props {
  children: ReactNode;
  name?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const componentName = this.props.name || 'unknown';

    trackOperationalEvent('error_encountered', {
      component: componentName,
      message: error.message?.slice(0, 300),
      stack: error.stack?.slice(0, 500),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    });

    console.error(`[ErrorBoundary:${componentName}]`, error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center text-center p-8 h-full min-h-[200px]">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-[4px] flex items-center justify-center ds-text-danger mx-auto mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-sm font-bold text-my-ink uppercase tracking-[0.15em] mb-2">
            Module Error
          </h3>
          <p className="text-[10px] text-my-muted max-w-xs mb-4 leading-relaxed">
            {this.props.name ? `"${this.props.name}" encountered an error.` : 'This section encountered an unexpected error.'}
            {' '}The rest of the app is unaffected.
          </p>
          <Button
            variant="primary"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="hover:scale-105 rounded-sm"
            icon={<RefreshCw size={12} />}
          >
            Reload Section
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
