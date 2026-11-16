const FILENAME_FALLBACK = 'document';

const sanitizeDocumentFilename = (value: string): string =>
  value
    .trim()
    // Prevent path traversal / nested paths in filenames.
    .replaceAll(/[\\/]/g, '-')
    // Remove null bytes and trim trailing dots/spaces for broad FS compatibility.
    .replaceAll('\0', '')
    .replaceAll(/[.\s]+$/g, '');

export const buildDocumentFilename = (title: string): string => {
  const sanitized = sanitizeDocumentFilename(title);
  return sanitized || FILENAME_FALLBACK;
};
