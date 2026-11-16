import path from 'path-browserify-esm';

const normalizeDriveLetter = (input: string): string =>
  input.replace(/^[A-Z]:/i, (match) => match.toLowerCase());

const toNormalizedAbsolute = (input: string): string => {
  const trimmed = input.trim();
  const withPosixSeparators = trimmed.replaceAll('\\', '/');
  const withNormalizedDrive = normalizeDriveLetter(withPosixSeparators);

  if (withNormalizedDrive === '') return '/';

  const hasDriveLetter = /^[A-Z]:/i.test(withNormalizedDrive);
  const hasLeadingSlash = withNormalizedDrive.startsWith('/');
  const absolutePath =
    hasDriveLetter || hasLeadingSlash ? withNormalizedDrive : `/${withNormalizedDrive}`;

  return path.normalize(absolutePath);
};

export const normalizePathForScope = (input: string): string => {
  const normalized = toNormalizedAbsolute(input);
  return normalized.length > 1 && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
};

const isAbsolutePath = (input: string): boolean => {
  if (path.isAbsolute(input)) return true;
  return /^[A-Z]:[/\\]/i.test(input) || input.startsWith('\\\\') || input.startsWith('\\');
};

/**
 * Resolve a path against a scope (CWD).
 * - No path provided → use scope as default
 * - Absolute path → use as-is, ignore scope
 * - Relative path → join with scope
 * - No scope → return path as-is
 */
export const resolvePathWithScope = (
  inputPath: string | undefined,
  scope: string | undefined,
): string | undefined => {
  if (!scope) return inputPath;
  if (!inputPath) return scope;
  if (isAbsolutePath(inputPath)) return inputPath;
  return path.join(scope, inputPath);
};

export const resolveArgsWithScope = <T extends { scope?: string }>(
  args: T,
  pathField: string,
  fallbackScope?: string,
): T => {
  const resolvedScope = resolvePathWithScope(args.scope, fallbackScope);
  const scope = resolvedScope ?? args.scope ?? fallbackScope;
  const currentPath = (args as Record<string, any>)[pathField] as string | undefined;
  const resolved = resolvePathWithScope(currentPath, scope);
  if (resolved === currentPath) return args;
  return { ...args, [pathField]: resolved };
};
