/**
 * Platform filtering for an agent's tool list in the display layer.
 */
import { isDesktop } from '@lobechat/const';
import { AuvIdentifier, LocalSystemIdentifier } from '@lobechat/const/builtinTools';

/** These tools call Electron IPC on the device, so a plain web client never offers them. */
const DESKTOP_ONLY_TOOLS = new Set<string>([AuvIdentifier, LocalSystemIdentifier]);

/**
 * Check if a tool should be enabled based on platform-specific constraints
 * @param toolId - The tool identifier to check
 * @returns true if the tool should be enabled, false otherwise
 */
export const shouldEnableTool = (toolId: string): boolean =>
  !DESKTOP_ONLY_TOOLS.has(toolId) || isDesktop;

/**
 * Filter tool IDs based on platform constraints
 * @param toolIds - Array of tool identifiers to filter
 * @returns Filtered array of tool identifiers
 */
export const filterToolIds = (toolIds: string[]): string[] => {
  return toolIds.filter(shouldEnableTool);
};
