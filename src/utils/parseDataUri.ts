interface DataUriParseResult {
  base64: string | null;
  mimeType: string | null;
  type: 'url' | 'base64' | null;
}

/** Splits a base64 data URI into its MIME type and payload, or recognises a plain URL. */
export const parseDataUri = (dataUri: string): DataUriParseResult => {
  // indexOf instead of a regex: a regex overflows the stack on very large data URIs.
  const DATA_PREFIX = 'data:';
  const BASE64_MARKER = ';base64,';

  if (dataUri.startsWith(DATA_PREFIX)) {
    const markerIndex = dataUri.indexOf(BASE64_MARKER);
    if (markerIndex > DATA_PREFIX.length) {
      const mimeType = dataUri.slice(DATA_PREFIX.length, markerIndex);
      const base64 = dataUri.slice(markerIndex + BASE64_MARKER.length);
      if (base64.length > 0) return { base64, mimeType, type: 'base64' };
    }
  }

  try {
    new URL(dataUri);
    return { base64: null, mimeType: null, type: 'url' };
  } catch {
    return { base64: null, mimeType: null, type: null };
  }
};
