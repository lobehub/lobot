/**
 * Language-specific separators for recursive text splitting.
 * Each array is ordered from most to least specific separator.
 */

export type SupportedLanguage =
  | 'cpp'
  | 'go'
  | 'java'
  | 'js'
  | 'php'
  | 'proto'
  | 'python'
  | 'rst'
  | 'ruby'
  | 'rust'
  | 'scala'
  | 'swift'
  | 'markdown'
  | 'latex'
  | 'html'
  | 'sol';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
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
