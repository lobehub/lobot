import { mcpService } from '@/services/mcp';
import { pluginService } from '@/services/plugin';
import { type StoreSetter } from '@/store/types';
import { type PluginInstallError } from '@/types/tool/plugin';
import { setNamespace } from '@/utils/storeDebug';

import { type ToolStore } from '../../store';
import { pluginSelectors } from '../plugin/selectors';

const n = setNamespace('customPlugin');

type Setter = StoreSetter<ToolStore>;
export const createCustomPluginSlice = (set: Setter, get: () => ToolStore, _api?: unknown) =>
  new CustomPluginActionImpl(set, get, _api);

class CustomPluginActionImpl {
  readonly #get: () => ToolStore;

  constructor(set: Setter, get: () => ToolStore, _api?: unknown) {
    void _api;
    this.#get = get;
  }

  reinstallCustomPlugin = async (id: string): Promise<void> => {
    const plugin = pluginSelectors.getCustomPluginById(id)(this.#get());
    if (!plugin) return;

    const { refreshPlugins, updateInstallError, updateInstallLoadingState } = this.#get();

    const url = plugin.customParams?.mcp?.url;
    if (!plugin.customParams?.mcp || !url) return;

    try {
      updateInstallError(id, undefined);
      updateInstallLoadingState(id, true);
      const manifest = await mcpService.getStreamableMcpServerManifest({
        auth: plugin.customParams.mcp.auth,
        headers: plugin.customParams.mcp.headers,
        identifier: plugin.identifier,
        metadata: {
          avatar: plugin.customParams.avatar,
          description: plugin.customParams.description,
        },
        url,
      });
      await pluginService.updatePluginManifest(id, manifest);
      await refreshPlugins();
    } catch (error) {
      console.error(error);
      const err = error as PluginInstallError;
      updateInstallError(id, { cause: err.cause, message: err.message });
    } finally {
      updateInstallLoadingState(id, false);
    }
  };
}

export type CustomPluginAction = Pick<CustomPluginActionImpl, keyof CustomPluginActionImpl>;
