type LLMErrorKind = 'retry' | 'stop';

export interface ClassifiedLLMError {
  code?: string;
  kind: LLMErrorKind;
  message: string;
}

// Some providers (notably bare HTTP proxies) only surface the HTTP status as a
// numeric `code` on the error object, with no `status`/`statusCode`.
