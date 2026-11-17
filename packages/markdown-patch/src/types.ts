interface MarkdownPatchReplaceHunk {
  mode?: 'replace';
  replace: string;
  replaceAll?: boolean;
  search: string;
}

interface MarkdownPatchDeleteHunk {
  mode: 'delete';
  replaceAll?: boolean;
  search: string;
}

interface MarkdownPatchDeleteLinesHunk {
  endLine: number;
  mode: 'deleteLines';
  startLine: number;
}

interface MarkdownPatchInsertAtHunk {
  content: string;
  line: number;
  mode: 'insertAt';
}

interface MarkdownPatchReplaceLinesHunk {
  content: string;
  endLine: number;
  mode: 'replaceLines';
  startLine: number;
}

export type MarkdownPatchHunk =
  | MarkdownPatchReplaceHunk
  | MarkdownPatchDeleteHunk
  | MarkdownPatchDeleteLinesHunk
  | MarkdownPatchInsertAtHunk
  | MarkdownPatchReplaceLinesHunk;
