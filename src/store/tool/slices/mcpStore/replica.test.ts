import { describe, expect, it } from 'vitest';

import { MCP_PLUGIN_LIST_KEY } from './projection';

describe('mcpPluginList replica', () => {
  it('reads the list from a single scope entry', () => {
    expect(MCP_PLUGIN_LIST_KEY).toBe('all');
  });
});
