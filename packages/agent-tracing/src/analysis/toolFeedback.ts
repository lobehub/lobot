import { encode } from 'gpt-tokenizer';

/**
 * Objective (no-LLM) quality metrics for a single tool result — the "environment feedback"
 * an agent receives. These are the Phase-1 signals that can be computed over the whole
 * snapshot corpus to rank which tools pollute the context window.
 *
 * Semantic metrics that genuinely need a judge (feedback utility, actionability, failure
 * clarity, compressibility) are intentionally NOT here — they belong to a later phase.
 */
interface ToolResultMetrics {
  apiName: string;
  /** Character length of the (unwrapped) content. */
  chars: number;
  format: 'json' | 'xml' | 'markdown' | 'text';
  identifier: string;
  /** Failure per `classifyToolError`: explicit flag > structured containers > short-output regex. */
  isError: boolean;
  /** 0..1 — fraction of fixed-size shingles that are exact repeats (degenerate dumps). */
  selfRedundancy: number;
  stepIndex: number;
  /**
   * 0..1 — for xml/html, share of chars spent on markup ATTRIBUTES (`id="3tx0"`,
   * class/style/data-*). Semantic element tags (<title>, <result>) are treated as useful
   * structure, not noise — so clean semantic XML scores ~0, id-laden DOM dumps score high.
   */
  structuralNoiseRatio: number;
  /** gpt-tokenizer count of the unwrapped content. */
  tokens: number;
  /** `${identifier}/${apiName}` */
  tool: string;
}

const SHINGLE = 80;
const ERROR_HEAD = 2000;
const ERROR_RE = /\b(?:error|failed|failure|exception|enoent|econn|traceback|status\s+5\d\d)\b/i;
// Content that merely *mentions* errors (mixed crawl results, code files, logs quoted in a
// successful read) must not be classified as a failure — validated 2026-07: a sample of 10
// "large error" results picked by the old head-regex were ALL isSuccess=true partial
// successes. The regex is now only a fallback for short outputs with no explicit flag.
const ERROR_RE_MAX_CHARS = 2000;

/**
 * Classify a tool result as a failure.
 * Trust order: explicit `isSuccess` flag > structured error containers > head regex
 * (short outputs only — long content that mentions "error" is usually mixed content).
 */
function classifyToolError(content: string, isSuccess: boolean | undefined): boolean {
  if (isSuccess === false) return true;
  if (isSuccess === true) return false;
  // structured container: <crawlResults> with only <error> entries and no successful pages
  if (/^\s*<crawlResults[\s>]/.test(content)) {
    const errors = (content.match(/<error[\s>]/g) ?? []).length;
    const pages = (content.match(/<page[\s>]/g) ?? []).length;
    return errors > 0 && pages === 0;
  }
  return content.length <= ERROR_RE_MAX_CHARS && ERROR_RE.test(content.slice(0, ERROR_HEAD));
}

/** Tool outputs are frequently JSON-wrapped as `{"content":"..."}` — score the payload, not the envelope. */
function unwrapContent(output: string): string {
  const t = output.trimStart();
  if (t.startsWith('{')) {
    try {
      const o = JSON.parse(output);
      if (o && typeof o.content === 'string') return o.content;
    } catch {
      // not JSON — score as-is
    }
  }
  return output;
}

function detectFormat(s: string): ToolResultMetrics['format'] {
  const h = s.trimStart();
  if (h.startsWith('{') || h.startsWith('[')) return 'json';
  if (h.startsWith('<')) return 'xml';
  if (/^[#*\-|>]/.test(h)) return 'markdown';
  return 'text';
}

function selfRedundancy(s: string): number {
  if (s.length < SHINGLE * 4) return 0;
  const shingles: string[] = [];
  for (let i = 0; i + SHINGLE <= s.length; i += SHINGLE) shingles.push(s.slice(i, i + SHINGLE));
  if (shingles.length === 0) return 0;
  return 1 - new Set(shingles).size / shingles.length;
}

// Attribute NAMES that carry no signal for the model — opaque identifiers and presentational
// markup. Everything else (title=, url=, href=, name=, lang=…) labels real content and is kept.
const NOISE_ATTR_RE =
  /\b(?:id|class|style|role|rel|target|width|height|aria-[\w-]+|data-[\w-]+|on\w+)\s*=\s*(?:"[^"]*"|'[^']*')/gi;

function structuralNoiseRatio(s: string, format: ToolResultMetrics['format']): number {
  if (format !== 'xml' || s.length === 0) return 0;
  // Semantic structure is NOT noise: element tags (<item>, <result>) and signal-bearing
  // attributes (title="…", url="…") are exactly what the model reads. Only opaque/presentational
  // attributes (id="3tx0", class, style, data-*) are dead bytes the model never references.
  let attrChars = 0;
  for (const m of s.matchAll(NOISE_ATTR_RE)) attrChars += m[0].length;
  return attrChars / s.length;
}

/** Pure: score one raw tool output string. The shared core reused by CLI / DC ingestion / backfill. */
export function analyzeToolResult(
  rawOutput: string,
  isSuccess: boolean | undefined,
): Pick<
  ToolResultMetrics,
  'chars' | 'tokens' | 'format' | 'isError' | 'selfRedundancy' | 'structuralNoiseRatio'
> {
  const content = unwrapContent(rawOutput ?? '');
  const format = detectFormat(content);
  return {
    chars: content.length,
    format,
    isError: classifyToolError(content, isSuccess),
    selfRedundancy: selfRedundancy(content),
    structuralNoiseRatio: structuralNoiseRatio(content, format),
    tokens: content ? encode(content).length : 0,
  };
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------
