import { type LobeTool, type ToolManifest } from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';

export class PluginService {
  getInstalledPlugins = (): Promise<LobeTool[]> => {
    return lambdaClient.plugin.getPlugins.query();
  };

  updatePluginManifest = async (id: string, manifest: ToolManifest): Promise<void> => {
    await lambdaClient.plugin.updatePlugin.mutate({ id, manifest });
  };
}

export const pluginService = new PluginService();
