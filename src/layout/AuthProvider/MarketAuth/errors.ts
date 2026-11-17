type MarketAuthErrorCode =
  | 'authorizationFailed'
  | 'browserOnly'
  | 'codeConsumed'
  | 'codeVerifierMissing'
  | 'general'
  | 'handoffFailed'
  | 'handoffTimeout'
  | 'oidcNotReady'
  | 'openBrowserFailed'
  | 'openPopupFailed'
  | 'popupClosed'
  | 'sessionExpired'
  | 'stateMissing'
  | 'stateMismatch';

interface MarketAuthErrorOptions {
  cause?: unknown;
  message?: string;
  meta?: Record<string, unknown>;
}

export class MarketAuthError extends Error {
  public readonly code: MarketAuthErrorCode;

  public readonly meta?: Record<string, unknown>;

  constructor(code: MarketAuthErrorCode, options: MarketAuthErrorOptions = {}) {
    super(options.message ?? code);
    this.name = 'MarketAuthError';
    this.code = code;
    this.meta = options.meta;

    if (options.cause) {
      this.cause = options.cause;
    }
  }
}
