'use client';

import { ErrorBoundary } from '@lobehub/ui';
import { memo, type ReactNode, useCallback } from 'react';

import AlertFallback from './AlertFallback';
import SilentFallback from './SilentFallback';

type ErrorBoundaryVariant = 'alert' | 'silent';

interface FallbackRenderProps {
  error: unknown;
  resetErrorBoundary: (...args: unknown[]) => void;
}

interface SafeBoundaryProps {
  alertTitle?: string;
  children: ReactNode;
  minHeight?: number;
  onError?: (error: unknown, info: { componentStack?: string | null }) => void;
  resetKeys?: unknown[];
  variant?: ErrorBoundaryVariant;
}

const SafeBoundary = memo<SafeBoundaryProps>(
  ({ children, variant = 'silent', alertTitle, minHeight, resetKeys, onError }) => {
    const fallbackRender = useCallback(
      (props: FallbackRenderProps) => {
        const error = props.error instanceof Error ? props.error : new Error(String(props.error));
        if (variant === 'alert') {
          return (
            <AlertFallback
              error={error}
              resetErrorBoundary={props.resetErrorBoundary}
              title={alertTitle}
            />
          );
        }
        return <SilentFallback minHeight={minHeight} />;
      },
      [variant, alertTitle, minHeight],
    );

    return (
      <ErrorBoundary fallbackRender={fallbackRender} resetKeys={resetKeys} onError={onError}>
        {children}
      </ErrorBoundary>
    );
  },
);

SafeBoundary.displayName = 'SafeBoundary';

export { SafeBoundary };
export default SafeBoundary;
