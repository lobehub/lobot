// Thin CC-side wrapper around the shared Linear label utilities. Kept free
// of @lobehub/ui / React / lucide imports so the workflow-summary path can
// pull `formatLinearMcpShortLabel` without dragging the inspector component
// (and its `keyframes`-using style modules) into tests transitively — same
// reason the labels file lives separately from `LinearMcp.tsx`.

import {
  isLinearMcpApiName,
  parseToolName,
  staticLabelFor,
} from '@lobechat/shared-tool-ui/inspectors/linear-labels';

// Re-exported under the historical CC-flavoured name so existing imports
// (`import { LINEAR_MCP_TOOL_NAMES } from './linearMcpLabels'`) keep working.

export const formatLinearMcpShortLabel = (apiName: string): string | null => {
  if (!isLinearMcpApiName(apiName)) return null;
  return `Linear · ${staticLabelFor(parseToolName(apiName))}`;
};
