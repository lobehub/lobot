import { isChunkingUnsupported } from './isChunkingUnsupported';

export type FileLoaderType =
  | 'code'
  | 'ppt'
  | 'pdf'
  | 'markdown'
  | 'doc'
  | 'text'
  | 'latex'
  | 'csv'
  | 'excel'
  | 'epub'
  | 'ipynb';

/** Extensions the server-side code splitter has language-specific separators for. */
const CODE_LANGUAGES: string[] = [
  'cpp',
  'go',
  'java',
  'js',
  'php',
  'proto',
  'python',
  'rst',
  'ruby',
  'rust',
  'scala',
  'swift',
  'markdown',
  'latex',
  'html',
  'sol',
];

/** Extensions chunked as plain text. */
const SUPPORT_TEXT_LIST = [
  'txt',
  'markdown',
  'md',
  'mdx',
  'toml',
  'yaml',
  'yml',
  'json',

  'sh',
  'patch',
  'log',
  // js
  'js',
  'jsx',
  'mjs',
  'tsx',
  'ts',
  'less',
  'css',
  // rust
  'rs',
  // python
  'py',
  'java',
  // database
  'sql',
  'db',
];

/**
 * Resolve which built-in chunking loader handles a file, by filename.
 * This is the single source of truth `ChunkingLoader.partitionContent` dispatches on:
 * `undefined` means the chunking task is guaranteed to fail.
 */
export const getChunkingLoaderType = (filename: string): FileLoaderType | undefined => {
  const name = filename.toLowerCase();

  if (name.endsWith('pptx')) {
    return 'ppt';
  }

  if (name.endsWith('docx') || name.endsWith('doc')) {
    return 'doc';
  }

  if (name.endsWith('.xlsx')) {
    return 'excel';
  }

  if (name.endsWith('pdf')) {
    return 'pdf';
  }

  if (name.endsWith('tex')) {
    return 'latex';
  }

  if (name.endsWith('md') || name.endsWith('mdx')) {
    return 'markdown';
  }

  if (name.endsWith('csv')) {
    return 'csv';
  }

  if (name.endsWith('epub')) {
    return 'epub';
  }

  if (name.endsWith('ipynb')) {
    return 'ipynb';
  }

  const ext = name.split('.').pop();

  if (ext && CODE_LANGUAGES.includes(ext)) {
    return 'code';
  }

  if (ext && SUPPORT_TEXT_LIST.includes(ext)) return 'text';
};

/**
 * Whether a file is eligible for chunking. Uses the parser's own registry when the
 * filename is known, and only falls back to the MIME heuristic when it is not.
 */
export const isChunkingSupported = ({
  fileType,
  name,
}: {
  fileType?: string | null;
  name?: string | null;
}): boolean => {
  if (name) return !!getChunkingLoaderType(name);

  return !isChunkingUnsupported(fileType ?? '');
};
