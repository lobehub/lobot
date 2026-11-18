import { defineReplica } from '@/libs/replica';

export type ToolPayloadMap = Record<string, { content: string; pluginState?: unknown }>;

/**
 * Full tool payloads of the projected rows an export restores, one entry per
 * id set. Memory only: payloads can be large and are needed only while the
 * export tab is open.
 */
export const exportToolPayloadsResource = defineReplica<{ ids: string[] }, ToolPayloadMap>({
  key: ({ ids }) => ids.join(','),
  name: 'shareExportToolPayloads',
  storage: 'memory',
  version: 1,
});
